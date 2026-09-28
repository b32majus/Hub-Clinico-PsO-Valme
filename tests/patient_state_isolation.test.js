#!/usr/bin/env node
/*
 * Deterministic regression harness for PSO-02: patient-state isolation on
 * patient switch in `index.html`.
 *
 * It drives the real form in headless Chromium (Playwright, already available
 * in the Atenea environment) against a synthetic CSV base, then reads the
 * exported row through the real `gather()` function. It fails on the pre-fix
 * implementation and passes on the fixed one.
 *
 * Run:  node tests/patient_state_isolation.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(REPO_ROOT, "index.html");
const INDEX_URL = "file://" + INDEX_PATH;

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (_) {
    // Fall back to the globally installed Playwright (present in Atenea).
    const root = execSync("npm root -g", { encoding: "utf8" }).trim();
    return require(path.join(root, "playwright"));
  }
}

/* ------------------------------------------------------------------ *
 * Synthetic fixture (test-only, no real patient data)
 * ------------------------------------------------------------------ */

const FIXTURE_HEADERS = [
  "nusha",
  "fecha_visita",
  "tipo_visita",
  "procedencia",
  "bsa",
  "observaciones_clinicas",
  "derivacion_derma_reuma",
  "impresion_clinica",
  "objetivo_terapeutico",
  "otras_derivaciones",
  "proxima_revision",
  "comentarios_finales",
  "tx_seguimiento_topicos_farmaco_1",
  "tx_seguimiento_topicos_posologia_1",
  "tx_seguimiento_biologicos_farmaco_1",
  "tx_seguimiento_biologicos_posologia_1",
  "tx_primera_topicos_farmaco_1",
  "tx_primera_topicos_posologia_1"
];

const FIXTURE_ROWS = [
  // Patient A: distinct stable value + distinct follow-up therapy.
  ["VALM0001", "2026-01-10", "seguimiento", "atencion_primaria", "12.5", "A obs", "1", "A impresion", "A objetivo", "A otras", "2026-03-01", "A comentarios", "", "", "Adalimumab", "cada 2 semanas", "", ""],
  // Patient B: empty stable value + its own follow-up therapy.
  ["VALM0002", "2026-02-10", "seguimiento", "", "3.0", "B obs", "0", "", "", "", "", "", "Calcipotriol/Betametasona", "1 al dia", "", "", "", ""]
];

function buildCsv() {
  const lines = [FIXTURE_HEADERS.join(",")];
  for (const row of FIXTURE_ROWS) {
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\n") + "\n";
}

function csvCell(value) {
  const text = String(value == null ? "" : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/* ------------------------------------------------------------------ *
 * Browser helpers
 * ------------------------------------------------------------------ */

async function newLoadedPage(browser) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(INDEX_URL);
  await page.setInputFiles("#baseFileInput", {
    name: "synthetic_base.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(buildCsv(), "utf8")
  });
  await page.waitForFunction(
    () => document.getElementById("baseStatus").textContent.includes("filas"),
    null,
    { timeout: 5000 }
  );
  // Open every collapsible section so the harness can reach its controls.
  await page.evaluate(() => document.querySelectorAll("details.section").forEach((d) => { d.open = true; }));
  page.__pageErrors = pageErrors;
  return page;
}

async function selectPatient(page, id) {
  await page.fill("#nushaInput", id);
  await page.evaluate(() => window.autoSearchByNusha());
  // Release focus so the NUSHA blur handler (which re-runs the search) is not
  // triggered by the next control interaction; then let the debounce settle.
  await page.evaluate(() => document.getElementById("nushaInput").blur());
  await page.waitForTimeout(350);
}

async function gather(page) {
  return page.evaluate(() => window.gather());
}

async function fillField(page, name, value) {
  await page.fill(`[name="${name}"]`, value);
}

async function clickToggle(page, name, value) {
  await page.click(`[data-name="${name}"] button[data-v="${value}"]`);
}

async function setTherapy(page, mode, group, drug, posology) {
  const prefix = mode === "primary" ? "therapy" : "follow-therapy";
  const container = `#${prefix}-${group}`;
  await page.selectOption(`${container} select`, { label: drug });
  await page.fill(`${container} input[type="text"]`, posology);
}

async function controlValue(page, name) {
  return page.$eval(`[name="${name}"]`, (el) => el.value);
}

async function toggleActive(page, name, value) {
  return page.evaluate(
    ({ n, v }) => {
      const button = document.querySelector(`[data-name="${n}"] button[data-v="${v}"]`);
      return !!button && button.classList.contains("active");
    },
    { n: name, v: value }
  );
}

/* ------------------------------------------------------------------ *
 * Assertion helpers
 * ------------------------------------------------------------------ */

function check(results, label, condition, detail) {
  results.push({ label, pass: !!condition, detail: detail || "" });
}

async function allTherapyFields(page) {
  return page.evaluate(() => [
    ...window.listTherapyColumns("tx_primera"),
    ...window.listTherapyColumns("tx_seguimiento")
  ]);
}

const PLAN_FIELDS = [
  "impresion_clinica",
  "objetivo_terapeutico",
  "otras_derivaciones",
  "proxima_revision",
  "comentarios_finales"
];

/* ------------------------------------------------------------------ *
 * Cases
 * ------------------------------------------------------------------ */

async function caseA(browser) {
  const results = [];
  const page = await newLoadedPage(browser);

  await selectPatient(page, "VALM0001");
  check(results, "A hydrated stable procedencia", (await controlValue(page, "procedencia")) === "atencion_primaria");
  check(results, "A hydrated follow-up therapy (Adalimumab)", (await gather(page)).tx_seguimiento_biologicos_farmaco_1 === "Adalimumab");

  // Populate A with visit-only values.
  await clickToggle(page, "derivacion_derma_reuma", "1");
  for (const field of PLAN_FIELDS) await fillField(page, field, `A-${field}`);
  await fillField(page, "bsa", "12.5");
  await fillField(page, "observaciones_clinicas", "A-observaciones");
  await setTherapy(page, "follow", "sinteticos_convencionales", "Metotrexato", "A-POS");

  // Switch directly to existing B.
  await selectPatient(page, "VALM0002");
  const rowB = await gather(page);

  check(results, "B keeps its own follow-up therapy", rowB.tx_seguimiento_topicos_farmaco_1 === "Calcipotriol/Betametasona", JSON.stringify(rowB.tx_seguimiento_topicos_farmaco_1));
  check(results, "A follow-up therapy did not leak", rowB.tx_seguimiento_sinteticos_convencionales_farmaco_1 === "" && rowB.tx_seguimiento_sinteticos_convencionales_posologia_1 === "", JSON.stringify([rowB.tx_seguimiento_sinteticos_convencionales_farmaco_1, rowB.tx_seguimiento_sinteticos_convencionales_posologia_1]));
  check(results, "A derivacion did not leak", rowB.derivacion_derma_reuma !== "1", JSON.stringify(rowB.derivacion_derma_reuma));
  for (const field of PLAN_FIELDS) {
    check(results, `A plan field ${field} did not leak`, rowB[field] === "", JSON.stringify(rowB[field]));
  }
  check(results, "A bsa did not leak (and B historical bsa not injected)", rowB.bsa === "", JSON.stringify(rowB.bsa));
  check(results, "A observaciones did not leak", rowB.observaciones_clinicas === "", JSON.stringify(rowB.observaciones_clinicas));
  check(results, "A stable procedencia did not leak into B", rowB.procedencia === "", JSON.stringify(rowB.procedencia));

  check(results, "no page errors in case A", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case A — A -> existing B", results };
}

async function caseB(browser) {
  const results = [];
  const page = await newLoadedPage(browser);

  await selectPatient(page, "VALM0001");
  await clickToggle(page, "derivacion_derma_reuma", "1");
  for (const field of PLAN_FIELDS) await fillField(page, field, `A-${field}`);
  await fillField(page, "bsa", "12.5");
  await setTherapy(page, "follow", "sinteticos_convencionales", "Metotrexato", "A-POS");

  // Switch to an unknown identity.
  await selectPatient(page, "VALM9999");
  const row = await gather(page);

  check(results, "unknown NUSHA preserved in the input", (await controlValue(page, "nusha")) === "VALM9999");
  check(results, "unknown patient has no A follow-up therapy", row.tx_seguimiento_sinteticos_convencionales_farmaco_1 === "" && row.tx_seguimiento_sinteticos_convencionales_posologia_1 === "", JSON.stringify([row.tx_seguimiento_sinteticos_convencionales_farmaco_1, row.tx_seguimiento_sinteticos_convencionales_posologia_1]));
  check(results, "unknown patient has no A derivacion", row.derivacion_derma_reuma !== "1", JSON.stringify(row.derivacion_derma_reuma));
  for (const field of PLAN_FIELDS) {
    check(results, `unknown patient has no A ${field}`, row[field] === "", JSON.stringify(row[field]));
  }
  check(results, "unknown patient has no A bsa", row.bsa === "", JSON.stringify(row.bsa));
  check(results, "unknown patient has no A stable procedencia", row.procedencia === "", JSON.stringify(row.procedencia));
  check(results, "unknown patient has no A stable observaciones", row.observaciones_clinicas === "", JSON.stringify(row.observaciones_clinicas));

  check(results, "no page errors in case B", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case B — A -> new/unknown B", results };
}

async function caseC(browser) {
  const results = [];
  const page = await newLoadedPage(browser);

  await selectPatient(page, "VALM0001");
  await clickToggle(page, "derivacion_derma_reuma", "1");
  await fillField(page, "impresion_clinica", "A impresion");
  await setTherapy(page, "follow", "sinteticos_convencionales", "Metotrexato", "A-POS");

  await selectPatient(page, "VALM0002");
  const row = await gather(page);

  // Section is hidden but its serialized state must be empty.
  const firstHidden = await page.$eval("#firstSec", (el) => el.classList.contains("hidden"));
  check(results, "first-visit section hidden for follow-up B", firstHidden);
  const primaryFields = await page.evaluate(() => window.listTherapyColumns("tx_primera"));
  const primaryLeaks = primaryFields.filter((k) => String(row[k] || "") !== "");
  check(results, "hidden first-visit therapy has no exportable state", primaryLeaks.length === 0, primaryLeaks.join(","));

  // UI control and serialized state must agree after reset/hydration.
  const impresionControl = await controlValue(page, "impresion_clinica");
  check(results, "impresion UI matches serialized state", impresionControl === String(row.impresion_clinica || ""), JSON.stringify([impresionControl, row.impresion_clinica]));
  const derivacionActive = await toggleActive(page, "derivacion_derma_reuma", "1");
  const derivacionSerialized = String(row.derivacion_derma_reuma || "") === "1";
  check(results, "derivacion UI matches serialized state", derivacionActive === derivacionSerialized, JSON.stringify([derivacionActive, row.derivacion_derma_reuma]));

  check(results, "no page errors in case C", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case C — UI/state consistency", results };
}

async function caseE(browser) {
  const results = [];
  const page = await newLoadedPage(browser);

  await selectPatient(page, "VALM0001");
  await clickToggle(page, "derivacion_derma_reuma", "1");
  for (const field of PLAN_FIELDS) await fillField(page, field, `A-${field}`);
  await setTherapy(page, "follow", "sinteticos_convencionales", "Metotrexato", "A-POS");

  // Explicit "Nuevo Paciente" boundary.
  await page.click("#newBtn");
  await page.waitForTimeout(100);
  const row = await gather(page);

  check(results, "new-patient button clears NUSHA", (await controlValue(page, "nusha")) === "");
  check(results, "new-patient button clears stable procedencia", String(row.procedencia || "") === "", JSON.stringify(row.procedencia));
  check(results, "new-patient button clears derivacion", row.derivacion_derma_reuma !== "1", JSON.stringify(row.derivacion_derma_reuma));
  for (const field of PLAN_FIELDS) {
    check(results, `new-patient button clears ${field}`, String(row[field] || "") === "", JSON.stringify(row[field]));
  }
  const therapyFields = await allTherapyFields(page);
  const therapyLeaks = therapyFields.filter((k) => String(row[k] || "") !== "");
  check(results, "new-patient button clears all therapy state", therapyLeaks.length === 0, therapyLeaks.join(","));
  check(results, "new-patient button returns to first-visit mode", (await page.$eval("#firstSec", (el) => !el.classList.contains("hidden"))) === true);

  check(results, "no page errors in case E", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case E - explicit Nuevo Paciente reset", results };
}

async function caseD(browser) {
  const results = [];
  const page = await newLoadedPage(browser);

  // Unknown A registered as first visit with first-visit therapy.
  await selectPatient(page, "VALMNEW1");
  await setTherapy(page, "primary", "biologicos", "Secukinumab", "NEW-POS");
  const rowNew = await gather(page);
  check(results, "new patient primary therapy captured", rowNew.tx_primera_biologicos_farmaco_1 === "Secukinumab" && rowNew.tx_primera_biologicos_posologia_1 === "NEW-POS", JSON.stringify([rowNew.tx_primera_biologicos_farmaco_1, rowNew.tx_primera_biologicos_posologia_1]));

  // Switch to existing B.
  await selectPatient(page, "VALM0002");
  const rowB = await gather(page);
  const primaryFields = await page.evaluate(() => window.listTherapyColumns("tx_primera"));
  const primaryLeaks = primaryFields.filter((k) => String(rowB[k] || "") !== "");
  check(results, "first-visit therapy of previous patient does not leak", primaryLeaks.length === 0, primaryLeaks.join(","));
  check(results, "target patient follow-up therapy still hydrated", rowB.tx_seguimiento_topicos_farmaco_1 === "Calcipotriol/Betametasona", JSON.stringify(rowB.tx_seguimiento_topicos_farmaco_1));

  check(results, "no page errors in case D", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case D — therapy isolation", results };
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

(async () => {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error("index.html not found at", INDEX_PATH);
    process.exit(2);
  }
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  const cases = [];
  try {
    cases.push(await caseA(browser));
    cases.push(await caseB(browser));
    cases.push(await caseC(browser));
    cases.push(await caseD(browser));
    cases.push(await caseE(browser));
  } finally {
    await browser.close();
  }

  let failures = 0;
  let total = 0;
  for (const testCase of cases) {
    console.log(`\n${testCase.name}`);
    for (const r of testCase.results) {
      total += 1;
      if (!r.pass) failures += 1;
      console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.label}${r.pass ? "" : " -> " + r.detail}`);
    }
  }
  console.log(`\n${total - failures}/${total} checks passed`);
  if (failures) {
    console.log("RESULT: FAIL");
    process.exit(1);
  }
  console.log("RESULT: PASS");
})().catch((err) => {
  console.error("Harness error:", err);
  process.exit(2);
});
