#!/usr/bin/env node
/*
 * Deterministic regression harness for PSO-05: longitudinal visit selection and
 * date semantics across `index.html` (form) and
 * `Cuadro_Mando_Psoriasis_Valme_v2.html` (dashboard).
 *
 * Invariants under test (issue #8):
 *   A. no eligible prior visit -> hydrate nothing, never a future visit;
 *   B. a valid prior visit is selected;
 *   C. an Excel serial and its supported text form normalize to the same local
 *      calendar day and order identically;
 *   D. blank/invalid dates stay unknown and are never selected as
 *      previous/latest by fallback;
 *   E. same-day ties are deterministic and honestly bounded (source order),
 *      never a claim of clinical ordering;
 *   F. form and dashboard V2 produce the same chronological order for the same
 *      supported date values.
 *
 * It drives the real form (real `getLatestVisitRow`/`gather`) and the real V2
 * dashboard (real `getLatestRows`/`parseCalendarDate`) in headless Chromium via
 * Playwright, already available in the Atenea environment.
 *
 * Run:  node tests/longitudinal_date_semantics.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(REPO_ROOT, "index.html");
const DASHBOARD_PATH = path.join(REPO_ROOT, "Cuadro_Mando_Psoriasis_Valme_v2.html");
const INDEX_URL = "file://" + INDEX_PATH;
const DASHBOARD_URL = "file://" + DASHBOARD_PATH;

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (_) {
    const root = execSync("npm root -g", { encoding: "utf8" }).trim();
    return require(path.join(root, "playwright"));
  }
}

/* ------------------------------------------------------------------ *
 * Synthetic fixture (test-only, no real patient data)
 * ------------------------------------------------------------------ */

const HEADERS = [
  "nusha",
  "fecha_visita",
  "tipo_visita",
  "procedencia",
  "bsa",
  "observaciones_clinicas",
  "tx_seguimiento_biologicos_farmaco_1",
  "tx_seguimiento_biologicos_posologia_1"
];

const ROWS = [
  // A — history is entirely in the future of the recorded encounter.
  ["VLMA", "2026-06-01", "seguimiento", "atencion_primaria", "6", "A-future", "FUTURE-A", "POS-FA"],
  ["VLMA", "2026-09-01", "seguimiento", "atencion_primaria", "7", "A-future2", "FUTURE-A2", "POS-FA2"],
  // B — one valid prior visit.
  ["VLMB", "2026-01-01", "seguimiento", "atencion_primaria", "3", "B-old", "OLD-B", "POS-OB"],
  ["VLMB", "2026-06-01", "seguimiento", "atencion_primaria", "4", "B-june", "JUNE-B", "POS-JB"],
  // C — Excel serial (46023 = 2026-01-01) ordered against an ISO date.
  ["VLMC", "46023", "seguimiento", "atencion_primaria", "5", "C-serial", "SERIAL-C", "POS-SC"],
  ["VLMC", "2026-06-01", "seguimiento", "atencion_primaria", "6", "C-june", "JUNE-C", "POS-JC"],
  // D — invalid row next to a valid one; and a patient with only invalid rows.
  ["VLMD", "", "seguimiento", "atencion_primaria", "1", "D-invalid", "INVALID-D", "POS-ID"],
  ["VLMD", "2026-05-01", "seguimiento", "atencion_primaria", "2", "D-may", "MAY-D", "POS-MD"],
  ["VLMD2", "not-a-date", "seguimiento", "atencion_primaria", "1", "D2-invalid", "INVALID-ONLY", "POS-IO"],
  ["VLMD2", "", "seguimiento", "atencion_primaria", "1", "D2-blank", "INVALID-ONLY2", "POS-IO2"],
  // E — two rows, same patient and same day, no explicit visit id.
  ["VLME", "2026-04-01", "seguimiento", "atencion_primaria", "1", "E-first", "TIE-FIRST", "POS-T1"],
  ["VLME", "2026-04-01", "seguimiento", "atencion_primaria", "2", "E-second", "TIE-SECOND", "POS-T2"]
];

function csvCell(value) {
  const text = String(value == null ? "" : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv() {
  const lines = [HEADERS.join(",")];
  for (const row of ROWS) lines.push(row.map(csvCell).join(","));
  return lines.join("\n") + "\n";
}

/* ------------------------------------------------------------------ *
 * Browser helpers
 * ------------------------------------------------------------------ */

async function newFormPage(browser) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(INDEX_URL);
  await page.setInputFiles("#baseFileInput", {
    name: "synthetic_longitudinal.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(buildCsv(), "utf8")
  });
  await page.waitForFunction(
    () => document.getElementById("baseStatus").textContent.includes("filas"),
    null,
    { timeout: 5000 }
  );
  await page.evaluate(() => document.querySelectorAll("details.section").forEach((d) => { d.open = true; }));
  page.__pageErrors = pageErrors;
  return page;
}

async function setEncounterDate(page, value) {
  await page.fill('[name="fecha_visita"]', value);
  await page.evaluate(() => window.autoSearchByNusha());
  await page.waitForTimeout(250);
}

async function selectPatient(page, id) {
  await page.fill("#nushaInput", id);
  await page.evaluate(() => window.autoSearchByNusha());
  await page.evaluate(() => document.getElementById("nushaInput").blur());
  await page.waitForTimeout(350);
}

async function gather(page) {
  return page.evaluate(() => window.gather());
}

async function prevContextText(page) {
  return page.$eval("#previousTxContext", (el) => el.textContent || "");
}

async function baseStatusText(page) {
  return page.$eval("#baseStatus", (el) => el.textContent || "");
}

async function newDashboardPage(browser) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(DASHBOARD_URL);
  await page.waitForFunction(() => typeof applyFilters === "function");
  page.__pageErrors = pageErrors;
  return page;
}

async function injectDashboardMatrix(page, matrix, headers) {
  await page.evaluate(({ m, hs }) => {
    const normalized = hs.map((h) => normalizeKey(h));
    const rows = m.map((raw, idx) => {
      const r = {};
      normalized.forEach((h, i) => { r[h] = normalizeText(raw[i]); });
      r.__index = idx;
      r.__date = parseDateValue(r.fecha_visita);
      return r;
    });
    sourceHeaders = normalized;
    rawRows = rows;
    buildFilterOptions();
    applyFilters();
  }, { m: matrix, hs: headers });
}

function dayKey(parts) {
  return parts ? parts.join("-") : null;
}

/* ------------------------------------------------------------------ *
 * Assertion helpers
 * ------------------------------------------------------------------ */

function check(results, label, condition, detail) {
  results.push({ label, pass: !!condition, detail: detail || "" });
}

function equalArrays(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/* ------------------------------------------------------------------ *
 * Parser-level checks (both surfaces)
 * ------------------------------------------------------------------ */

const PARSE_VALUES = [
  "2026-06-01",
  "46023",
  "01/06/2026",
  "2026-03-01",
  "",
  "bogus",
  "31/02/2026",
  "13/13/2026"
];

async function normalizedDays(page, values) {
  return page.evaluate((vals) => vals.map((v) => {
    const d = parseCalendarDate(v);
    return d ? [d.getFullYear(), d.getMonth() + 1, d.getDate()] : null;
  }), values);
}

async function caseParserParity(browser) {
  const results = [];
  const form = await newFormPage(browser);
  const dashboard = await newDashboardPage(browser);

  const formDays = await normalizedDays(form, PARSE_VALUES);
  const dashDays = await normalizedDays(dashboard, PARSE_VALUES);
  check(results, "Scenario F: form and dashboard normalize the same values identically", JSON.stringify(formDays) === JSON.stringify(dashDays), `${JSON.stringify(formDays)} vs ${JSON.stringify(dashDays)}`);

  check(results, "Scenario C: Excel serial 46023 == 2026-01-01 (form)", dayKey(formDays[1]) === "2026-1-1", JSON.stringify(formDays[1]));
  const serialEqualsIsoForm = await form.evaluate(() => parseDateToTs("46023") === parseDateToTs("2026-01-01"));
  const serialEqualsIsoDash = await dashboard.evaluate(() => parseDateValue("46023").getTime() === parseDateValue("2026-01-01").getTime());
  check(results, "Scenario C: Excel serial 46023 == ISO 2026-01-01 in both surfaces", serialEqualsIsoForm && serialEqualsIsoDash, JSON.stringify([serialEqualsIsoForm, serialEqualsIsoDash]));
  check(results, "Scenario C: dd/mm/yyyy 01/06/2026 == 2026-06-01 (form)", dayKey(formDays[2]) === "2026-6-1", JSON.stringify(formDays[2]));
  check(results, "Scenario C: dd/mm/yyyy does not fall back to US Jan 6 (dashboard)", dayKey(dashDays[2]) === "2026-6-1", JSON.stringify(dashDays[2]));

  check(results, "Scenario D: blank stays unknown (form)", formDays[4] === null, JSON.stringify(formDays[4]));
  check(results, "Scenario D: blank stays unknown (dashboard)", dashDays[4] === null, JSON.stringify(dashDays[4]));
  check(results, "Scenario D: unparseable text stays unknown (form)", formDays[5] === null, JSON.stringify(formDays[5]));
  check(results, "Scenario D: unparseable text stays unknown (dashboard)", dashDays[5] === null, JSON.stringify(dashDays[5]));
  check(results, "Scenario D: roll-over 31/02/2026 rejected (form)", formDays[6] === null, JSON.stringify(formDays[6]));
  check(results, "Scenario D: roll-over 31/02/2026 rejected (dashboard)", dashDays[6] === null, JSON.stringify(dashDays[6]));
  check(results, "Scenario D: invalid 13/13/2026 rejected (form)", formDays[7] === null, JSON.stringify(formDays[7]));
  check(results, "Scenario D: invalid 13/13/2026 rejected (dashboard)", dashDays[7] === null, JSON.stringify(dashDays[7]));

  // Scenario C ordering: serial 2026-01-01 precedes 2026-03-01 precedes 2026-06-01.
  const orderInput = ["2026-06-01", "46023", "2026-03-01"];
  const ts = await form.evaluate((vals) => vals.map((v) => parseDateToTs(v)), orderInput);
  const ordered = orderInput.map((v, i) => ({ v, t: ts[i] })).sort((a, b) => a.t - b.t).map((x) => x.v);
  check(results, "Scenario C/F: serial orders before later ISO dates", equalArrays(ordered, ["46023", "2026-03-01", "2026-06-01"]), JSON.stringify(ordered));

  check(results, "no page errors (parser)", form.__pageErrors.length === 0 && dashboard.__pageErrors.length === 0, [...form.__pageErrors, ...dashboard.__pageErrors].join(" | "));
  await form.close();
  await dashboard.close();
  return { name: "Parser parity — scenarios C/D/F", results };
}

/* ------------------------------------------------------------------ *
 * Form visit-selection cases
 * ------------------------------------------------------------------ */

async function formCase(results, browser, { id, date, expectDrug, expectStable, label }) {
  const page = await newFormPage(browser);
  await setEncounterDate(page, date);
  await selectPatient(page, id);
  const row = await gather(page);
  check(results, `${label}: follow-up therapy is ${JSON.stringify(expectDrug)}`, row.tx_seguimiento_biologicos_farmaco_1 === expectDrug, JSON.stringify(row.tx_seguimiento_biologicos_farmaco_1));
  check(results, `${label}: stable procedencia is ${JSON.stringify(expectStable)}`, row.procedencia === expectStable, JSON.stringify(row.procedencia));
  check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return row;
}

async function caseFormScenarios(browser) {
  const results = [];

  // A — recorded encounter before the whole history: no future hydration.
  {
    const page = await newFormPage(browser);
    await setEncounterDate(page, "2026-03-01");
    await selectPatient(page, "VLMA");
    const row = await gather(page);
    check(results, "Scenario A: future follow-up therapy is NOT hydrated", row.tx_seguimiento_biologicos_farmaco_1 === "", JSON.stringify(row.tx_seguimiento_biologicos_farmaco_1));
    check(results, "Scenario A: future stable data is NOT hydrated", row.procedencia === "", JSON.stringify(row.procedencia));
    check(results, "Scenario A: future BSA is NOT hydrated", row.bsa === "", JSON.stringify(row.bsa));
    const prev = await prevContextText(page);
    check(results, "Scenario A: previous context reports no prior visit", prev.includes("Sin visita previa"), prev);
    const status = await baseStatusText(page);
    check(results, "Scenario A: status distinguishes patient found without prior visit", status.includes("sin visita previa"), status);
    check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
    await page.close();
  }

  // B — valid prior visit.
  await formCase(results, browser, { id: "VLMB", date: "2026-08-01", expectDrug: "JUNE-B", expectStable: "atencion_primaria", label: "Scenario B" });
  // B — the later visit is future and must be excluded in favor of the earlier one.
  await formCase(results, browser, { id: "VLMB", date: "2026-05-01", expectDrug: "OLD-B", expectStable: "atencion_primaria", label: "Scenario B (future excluded)" });

  // C — Excel serial ordering (serial Jan 1 vs text Jun 1).
  await formCase(results, browser, { id: "VLMC", date: "2026-08-01", expectDrug: "JUNE-C", expectStable: "atencion_primaria", label: "Scenario C" });
  await formCase(results, browser, { id: "VLMC", date: "2026-04-01", expectDrug: "SERIAL-C", expectStable: "atencion_primaria", label: "Scenario C (serial prior)" });

  // D — invalid date must not be chosen while a valid prior exists.
  await formCase(results, browser, { id: "VLMD", date: "2026-08-01", expectDrug: "MAY-D", expectStable: "atencion_primaria", label: "Scenario D (mixed)" });
  // D — only invalid dates: no visit can be established.
  {
    const page = await newFormPage(browser);
    await setEncounterDate(page, "2026-08-01");
    await selectPatient(page, "VLMD2");
    const row = await gather(page);
    check(results, "Scenario D: all-invalid history hydrates nothing", row.tx_seguimiento_biologicos_farmaco_1 === "" && row.procedencia === "", JSON.stringify([row.tx_seguimiento_biologicos_farmaco_1, row.procedencia]));
    check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
    await page.close();
  }

  // E — same-day tie: deterministic source-order (last row), not a clinical claim.
  await formCase(results, browser, { id: "VLME", date: "2026-08-01", expectDrug: "TIE-SECOND", expectStable: "atencion_primaria", label: "Scenario E (tie after)" });
  // E — recording on the same day as the only visits: strictly-before excludes both.
  await formCase(results, browser, { id: "VLME", date: "2026-04-01", expectDrug: "", expectStable: "", label: "Scenario E (same day)" });

  return { name: "Form previous-visit selection — scenarios A/B/C/D/E", results };
}

/* ------------------------------------------------------------------ *
 * Dashboard visit-selection cases
 * ------------------------------------------------------------------ */

const DASH_HEADERS = ["nusha", "fecha_visita", "tipo_visita"];
const DASH_MATRIX = [
  ["P1", "2026-01-01", "seguimiento"],
  ["P1", "2026-06-01", "seguimiento"],
  ["P2", "", "seguimiento"],
  ["P2", "2026-05-01", "seguimiento"],
  ["P3", "not-a-date", "seguimiento"],
  ["P3", "", "seguimiento"],
  ["P4", "2026-04-01", "seguimiento"],
  ["P4", "2026-04-01", "seguimiento"]
];

async function caseDashboardSelection(browser) {
  const results = [];
  const page = await newDashboardPage(browser);
  await injectDashboardMatrix(page, DASH_MATRIX, DASH_HEADERS);

  const latest = await page.evaluate(() => getLatestRows(rawRows).map((r) => ({
    id: normalizeId(r.nusha),
    date: r.fecha_visita,
    index: r.__index
  })).sort((a, b) => a.id.localeCompare(b.id)));

  const byId = Object.fromEntries(latest.map((r) => [r.id, r]));
  check(results, "Dashboard: latest valid row wins (P1)", byId.P1 && byId.P1.date === "2026-06-01", JSON.stringify(byId.P1));
  check(results, "Scenario D: invalid row cannot outrank a valid one (P2)", byId.P2 && byId.P2.date === "2026-05-01", JSON.stringify(byId.P2));
  check(results, "Scenario D: all-invalid patient is not a current row by fallback (P3)", !byId.P3, JSON.stringify(byId.P3));
  check(results, "Scenario E: same-day tie resolves to the highest source index deterministically (P4)", byId.P4 && byId.P4.index === 7, JSON.stringify(byId.P4));

  check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Dashboard current-row selection — scenarios D/E", results };
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

(async () => {
  if (!fs.existsSync(INDEX_PATH) || !fs.existsSync(DASHBOARD_PATH)) {
    console.error("Required HTML artifact missing.");
    process.exit(2);
  }
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  const cases = [];
  try {
    cases.push(await caseParserParity(browser));
    cases.push(await caseFormScenarios(browser));
    cases.push(await caseDashboardSelection(browser));
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
