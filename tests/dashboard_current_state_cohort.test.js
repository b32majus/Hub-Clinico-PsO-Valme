#!/usr/bin/env node
/*
 * Deterministic regression harness for PSO-04: current-state cohort
 * semantics in `Cuadro_Mando_Psoriasis_Valme_v2.html`.
 *
 * Invariant under test (issue #7): a filter that describes the patient's
 * CURRENT state must be evaluated against the latest eligible visit of that
 * patient, never against an older historical visit. The cohort pipeline must
 * be explicit:
 *
 *   1. visit scope  -> date window + genuinely visit-scoped criteria;
 *   2. current row  -> latest eligible visit per patient (deterministic);
 *   3. current-state filters -> treatment family, drug, control status,
 *      comorbidity, special zone, phenotype and course applied AFTER (2).
 *
 * Trend/longitudinal data must keep using the whole visit scope, not only the
 * current rows. Control missingness must distinguish an incomplete record from
 * a genuine `intermedia` classification.
 *
 * The harness loads the real V2 dashboard in headless Chromium (Playwright,
 * available in the Atenea environment) and injects a synthetic, test-only
 * dataset directly into the real loader/state, then drives the real
 * `applyFilters()` / `getLatestRows()` / `getControlStatus()` pipeline.
 *
 * Run:  node tests/dashboard_current_state_cohort.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const DASHBOARD_PATH = path.join(REPO_ROOT, "Cuadro_Mando_Psoriasis_Valme_v2.html");
const DASHBOARD_URL = "file://" + DASHBOARD_PATH;

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

const HEADERS = [
  "nusha",
  "fecha_visita",
  "tipo_visita",
  "procedencia",
  "fenotipo",
  "curso_evolutivo",
  "bsa",
  "pga",
  "pasi",
  "dlqi_total",
  "comorb_obesidad",
  "comorb_hta",
  "zona_esp_cuero_cabelludo",
  "zona_esp_unas",
  "loc_tronco",
  "tx_seguimiento_biologicos_farmaco_1",
  "tx_seguimiento_biologicos_posologia_1",
  "tx_seguimiento_sinteticos_convencionales_farmaco_1",
  "tx_seguimiento_sinteticos_convencionales_posologia_1",
  "tx_seguimiento_motivo_cambio"
];

function row(spec) {
  return HEADERS.map((h) => (spec[h] == null ? "" : String(spec[h])));
}

const MATRIX = [
  HEADERS,
  // PSO0001 — stopped biologic: old visit has it, latest does not (scenario A).
  row({ nusha: "PSO0001", fecha_visita: "2026-01-10", tipo_visita: "seguimiento", procedencia: "atencion_primaria", bsa: "12", pga: "3", pasi: "12", dlqi_total: "12", comorb_hta: "1", tx_seguimiento_biologicos_farmaco_1: "Adalimumab" }),
  row({ nusha: "PSO0001", fecha_visita: "2026-06-10", tipo_visita: "seguimiento", procedencia: "atencion_primaria", bsa: "2", pga: "1", pasi: "2", dlqi_total: "2" }),
  // PSO0002 — changed drug: Adalimumab then Ustekinumab (scenario B).
  row({ nusha: "PSO0002", fecha_visita: "2026-01-15", tipo_visita: "seguimiento", bsa: "2", pga: "1", pasi: "2", dlqi_total: "2", zona_esp_unas: "1", tx_seguimiento_biologicos_farmaco_1: "Adalimumab" }),
  row({ nusha: "PSO0002", fecha_visita: "2026-06-15", tipo_visita: "seguimiento", bsa: "1", pga: "0", pasi: "1", dlqi_total: "1", tx_seguimiento_biologicos_farmaco_1: "Ustekinumab" }),
  // PSO0003 — changed control state: uncontrolled then controlled (scenario C).
  row({ nusha: "PSO0003", fecha_visita: "2026-02-01", tipo_visita: "seguimiento", bsa: "20", pga: "3", pasi: "15", dlqi_total: "15" }),
  row({ nusha: "PSO0003", fecha_visita: "2026-07-01", tipo_visita: "seguimiento", bsa: "1", pga: "1", pasi: "1", dlqi_total: "1" }),
  // PSO0004 — temporal window: comorbidity inside scope, absent in outside latest (scenario D).
  row({ nusha: "PSO0004", fecha_visita: "2026-03-01", tipo_visita: "seguimiento", bsa: "1", pga: "1", pasi: "1", dlqi_total: "1", comorb_obesidad: "1" }),
  row({ nusha: "PSO0004", fecha_visita: "2026-11-01", tipo_visita: "seguimiento", bsa: "1", pga: "1", pasi: "1", dlqi_total: "1" }),
  // PSO0005 — incomplete latest: only one metric, not red (scenario E).
  row({ nusha: "PSO0005", fecha_visita: "2026-05-01", tipo_visita: "seguimiento", pasi: "5" }),
  // PSO0006 — longitudinal patient: biologic only in first visit (scenario F).
  row({ nusha: "PSO0006", fecha_visita: "2026-01-20", tipo_visita: "seguimiento", bsa: "4", pga: "2", pasi: "4", dlqi_total: "4", tx_seguimiento_biologicos_farmaco_1: "Secukinumab" }),
  row({ nusha: "PSO0006", fecha_visita: "2026-02-20", tipo_visita: "seguimiento", bsa: "3", pga: "2", pasi: "3", dlqi_total: "3" }),
  row({ nusha: "PSO0006", fecha_visita: "2026-03-20", tipo_visita: "seguimiento", bsa: "2", pga: "1", pasi: "2", dlqi_total: "2" }),
  // PSO0007 — partial but explicitly red: single metric crosses the red rule.
  row({ nusha: "PSO0007", fecha_visita: "2026-05-02", tipo_visita: "seguimiento", pasi: "15" }),
  // PSO0008 — fully evaluable genuine intermediate, with current comorbidity/zone.
  row({ nusha: "PSO0008", fecha_visita: "2026-04-01", tipo_visita: "seguimiento", bsa: "5", pga: "2", pasi: "5", dlqi_total: "5", comorb_hta: "1", zona_esp_cuero_cabelludo: "1" })
];

/* ------------------------------------------------------------------ *
 * Browser helpers
 * ------------------------------------------------------------------ */

async function newDashboardPage(browser) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(DASHBOARD_URL);
  await page.waitForFunction(() => typeof applyFilters === "function");
  await injectMatrix(page, MATRIX);
  page.__pageErrors = pageErrors;
  return page;
}

async function injectMatrix(page, matrix) {
  await page.evaluate((m) => {
    const headers = m[0].map((v) => normalizeKey(v));
    const rows = m
      .slice(1)
      .map((raw, idx) => {
        const r = {};
        headers.forEach((h, i) => { r[h] = normalizeText(raw[i]); });
        r.__index = idx;
        r.__date = parseDateValue(r.fecha_visita);
        return r;
      })
      .filter((r) => normalizeId(r.nusha) !== "");
    sourceHeaders = headers;
    rawRows = rows;
    buildFilterOptions();
    applyFilters();
  }, matrix);
}

const FILTER_ORDER = [
  "dateFrom", "dateTo", "tipoVisitaFilter", "procedenciaFilter", "fenotipoFilter",
  "cursoFilter", "comorbFilter", "specialFilter", "familyFilter", "drugFilter", "controlFilter"
];

async function applyWithFilters(page, filters) {
  return page.evaluate(({ f, order }) => {
    const map = {
      dateFrom: "dateFrom",
      dateTo: "dateTo",
      tipo: "tipoVisitaFilter",
      procedencia: "procedenciaFilter",
      fenotipo: "fenotipoFilter",
      curso: "cursoFilter",
      comorb: "comorbFilter",
      special: "specialFilter",
      family: "familyFilter",
      drug: "drugFilter",
      control: "controlFilter"
    };
    // Start from a clean filter state so each assertion is isolated.
    order.forEach((id) => { document.getElementById(id).value = ""; });
    Object.entries(f).forEach(([key, value]) => {
      const node = document.getElementById(map[key]);
      if (node) node.value = value;
    });
    applyFilters();
    return {
      latest: latestRows.map((r) => normalizeId(r.nusha)).sort(),
      scope: visitScopeRows.map((r) => normalizeId(r.nusha)).sort(),
      scopeDates: visitScopeRows.map((r) => normalizeText(r.fecha_visita)).sort(),
      scopeSize: visitScopeRows.length,
      trendRows: document.querySelectorAll("#chartTrend tbody tr").length
    };
  }, { f: filters, order: FILTER_ORDER });
}

async function resetFilters(page) {
  return page.evaluate((order) => {
    order.forEach((id) => { document.getElementById(id).value = ""; });
    applyFilters();
  }, FILTER_ORDER);
}

function equalArrays(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/* ------------------------------------------------------------------ *
 * Assertion helpers
 * ------------------------------------------------------------------ */

function check(results, label, condition, detail) {
  results.push({ label, pass: !!condition, detail: detail || "" });
}

/* ------------------------------------------------------------------ *
 * Cases
 * ------------------------------------------------------------------ */

async function caseControlMissingness(browser) {
  const results = [];
  const page = await newDashboardPage(browser);

  const status = await page.evaluate(() => ({
    empty: getControlStatus({}),
    partialNonRed: getControlStatus({ pasi: "5" }),
    partialRed: getControlStatus({ pasi: "15" }),
    allGreen: getControlStatus({ pasi: "1", bsa: "1", pga: "1", dlqi_total: "1" }),
    allIntermediate: getControlStatus({ pasi: "5", bsa: "5", pga: "2", dlqi_total: "5" }),
    redViaQol: getControlStatus({ pasi: "1", bsa: "1", pga: "1", dlqi_total: "15" })
  }));

  check(results, "no metric -> sin_datos", status.empty === "sin_datos", status.empty);
  check(results, "partial non-red -> incompleto (not intermedia)", status.partialNonRed === "incompleto", status.partialNonRed);
  check(results, "partial with red metric -> no_controlada", status.partialRed === "no_controlada", status.partialRed);
  check(results, "fully evaluable green -> controlada", status.allGreen === "controlada", status.allGreen);
  check(results, "fully evaluable intermediate -> intermedia", status.allIntermediate === "intermedia", status.allIntermediate);
  check(results, "red through DLQI alone -> no_controlada", status.redViaQol === "no_controlada", status.redViaQol);

  check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case 1 — control-state missingness vs genuine intermedia", results };
}

async function caseStoppedBiologic(browser) {
  const results = [];
  const page = await newDashboardPage(browser);

  const biologic = await applyWithFilters(page, { family: "biologicos" });
  check(results, "Scenario A: stopped biologic excluded from family=biologicos", equalArrays(biologic.latest, ["PSO0002"]), JSON.stringify(biologic.latest));

  const oldDrug = await applyWithFilters(page, { drug: "Adalimumab" });
  check(results, "Scenario A/B: Adalimumab not current for PSO0001/PSO0002", equalArrays(oldDrug.latest, []), JSON.stringify(oldDrug.latest));

  const noTx = await applyWithFilters(page, { family: "sin_tratamiento" });
  check(results, "Scenario A: stopped biologic is now sin_tratamiento", noTx.latest.includes("PSO0001"), JSON.stringify(noTx.latest));

  check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case 2 — scenario A: stopped biologic", results };
}

async function caseChangedDrug(browser) {
  const results = [];
  const page = await newDashboardPage(browser);

  const oldDrug = await applyWithFilters(page, { drug: "Adalimumab" });
  check(results, "Scenario B: old drug X excluded", !oldDrug.latest.includes("PSO0002"), JSON.stringify(oldDrug.latest));

  const newDrug = await applyWithFilters(page, { drug: "Ustekinumab" });
  check(results, "Scenario B: new drug Y includes the patient", equalArrays(newDrug.latest, ["PSO0002"]), JSON.stringify(newDrug.latest));

  check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case 3 — scenario B: changed drug", results };
}

async function caseChangedControl(browser) {
  const results = [];
  const page = await newDashboardPage(browser);

  const uncontrolled = await applyWithFilters(page, { control: "no_controlada" });
  check(results, "Scenario C: changed-to-controlled excluded from uncontrolled", !uncontrolled.latest.includes("PSO0003"), JSON.stringify(uncontrolled.latest));
  check(results, "Scenario C: explicit partial-red patient stays uncontrolled", uncontrolled.latest.includes("PSO0007"), JSON.stringify(uncontrolled.latest));

  const controlled = await applyWithFilters(page, { control: "controlada" });
  check(results, "Scenario C: changed-to-controlled included as controlled", controlled.latest.includes("PSO0003"), JSON.stringify(controlled.latest));

  const incomplete = await applyWithFilters(page, { control: "incompleto" });
  check(results, "Scenario E: incomplete patient in incompleto cohort", equalArrays(incomplete.latest, ["PSO0005"]), JSON.stringify(incomplete.latest));

  const intermediate = await applyWithFilters(page, { control: "intermedia" });
  check(results, "Scenario E: incomplete patient NOT in intermedia cohort", !intermediate.latest.includes("PSO0005"), JSON.stringify(intermediate.latest));
  check(results, "Genuine intermediate patient in intermedia cohort", intermediate.latest.includes("PSO0008"), JSON.stringify(intermediate.latest));

  check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case 4 — scenario C/E: changed control and incomplete", results };
}

async function caseTemporalWindow(browser) {
  const results = [];
  const page = await newDashboardPage(browser);

  await resetFilters(page);
  const noWindow = await applyWithFilters(page, { comorb: "comorb_obesidad" });
  check(results, "Scenario D: outside-window latest has no comorbidity -> excluded", equalArrays(noWindow.latest, []), JSON.stringify(noWindow.latest));

  const windowed = await applyWithFilters(page, { dateFrom: "2026-01-01", dateTo: "2026-06-30", comorb: "comorb_obesidad" });
  check(results, "Scenario D: inside-window latest has comorbidity -> included", equalArrays(windowed.latest, ["PSO0004"]), JSON.stringify(windowed.latest));
  check(results, "Scenario D: visit scope restricted by the date window", windowed.scopeSize === 12 && windowed.scopeDates.every((d) => d >= "2026-01-01" && d <= "2026-06-30"), JSON.stringify(windowed.scopeDates));

  check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case 5 — scenario D: temporal window scopes the current row", results };
}

async function caseComorbSpecial(browser) {
  const results = [];
  const page = await newDashboardPage(browser);

  const comorb = await applyWithFilters(page, { comorb: "comorb_hta" });
  check(results, "Comorbidity filter includes the patient whose current row has it", comorb.latest.includes("PSO0008"), JSON.stringify(comorb.latest));
  check(results, "Comorbidity filter does NOT resurrect an old-only comorbidity", !comorb.latest.includes("PSO0001"), JSON.stringify(comorb.latest));

  const specialCurrent = await applyWithFilters(page, { special: "zona_esp_cuero_cabelludo" });
  check(results, "Special-zone filter includes the patient whose current row has it", specialCurrent.latest.includes("PSO0008"), JSON.stringify(specialCurrent.latest));

  const specialOld = await applyWithFilters(page, { special: "zona_esp_unas" });
  check(results, "Special-zone filter does NOT resurrect an old-only zone", !specialOld.latest.includes("PSO0002"), JSON.stringify(specialOld.latest));

  check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case 6 — comorbidity and special-zone current-state filters", results };
}

async function caseTrendPreservation(browser) {
  const results = [];
  const page = await newDashboardPage(browser);

  await resetFilters(page);
  const baseline = await page.evaluate(() => ({
    scopeSize: visitScopeRows.length,
    latestSize: latestRows.length,
    trendRows: document.querySelectorAll("#chartTrend tbody tr").length
  }));
  check(results, "Baseline visit scope holds every eligible visit", baseline.scopeSize === MATRIX.length - 1, JSON.stringify(baseline));
  check(results, "Baseline trend emits one row per distinct month", baseline.trendRows === 8, JSON.stringify(baseline));

  const filtered = await applyWithFilters(page, { family: "biologicos" });
  check(results, "Scenario F: current-state filter narrows latestRows", filtered.latest.length === 1, JSON.stringify(filtered.latest));
  check(results, "Scenario F: visit scope is NOT collapsed by the current-state filter", filtered.scopeSize === MATRIX.length - 1, JSON.stringify(filtered));
  check(results, "Scenario F: global trend keeps all historical months", filtered.trendRows === 8, JSON.stringify(filtered));

  // Patient-level longitudinal trend is independent of cohort filters.
  const patientTrend = await page.evaluate(() => {
    document.getElementById("nushaSearch").value = "PSO0006";
    searchPatient();
    return {
      visits: currentPatientRows.length,
      historyRows: document.querySelectorAll("#patientHistoryTable tbody tr").length,
      activityHasSvg: !!document.querySelector("#activityChart svg")
    };
  });
  check(results, "Scenario F: selected patient keeps all historical visits", patientTrend.visits === 3, JSON.stringify(patientTrend));
  check(results, "Scenario F: patient history renders all visits", patientTrend.historyRows === 3, JSON.stringify(patientTrend));
  check(results, "Scenario F: patient activity chart still renders", patientTrend.activityHasSvg === true, JSON.stringify(patientTrend));

  check(results, "no page errors", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "Case 7 — scenario F: longitudinal trend preservation", results };
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

(async () => {
  if (!fs.existsSync(DASHBOARD_PATH)) {
    console.error("dashboard not found at", DASHBOARD_PATH);
    process.exit(2);
  }
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  const cases = [];
  try {
    cases.push(await caseControlMissingness(browser));
    cases.push(await caseStoppedBiologic(browser));
    cases.push(await caseChangedDrug(browser));
    cases.push(await caseChangedControl(browser));
    cases.push(await caseTemporalWindow(browser));
    cases.push(await caseComorbSpecial(browser));
    cases.push(await caseTrendPreservation(browser));
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
