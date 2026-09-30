#!/usr/bin/env node
/*
 * Deterministic browser regression for PSO-QA-02 (issue #14): the V2 dashboard
 * must load the derived synthetic workbook `Base Datos_PsO_Valme_demo.xlsx`
 * through the real file input and demonstrate, through supported UI
 * interaction only, that current-state filters never resurrect historical
 * treatment.
 *
 * Canonical scenario from the synthetic source:
 *   - VALM0004 has visits 2024-11-20, 2025-03-12 and 2025-12-05.
 *   - Acitretina appears ONLY in the 2024-11-20 `tx_primera_*` therapy.
 *   - The current 2025-12-05 state carries Guselkumab + Metotrexato.
 *
 * Scenario A — no date window, Fármaco Activo = Acitretina:
 *   Pacientes Únicos = 0. The historical Acitretina visit must not be promoted
 *   to the patient's current state.
 *
 * Scenario B — clear filters, upper date bound 2024-12-31 (through the real
 * date control), Fármaco Activo = Acitretina:
 *   Pacientes Únicos = 1 and VALM0004 is the legitimate current row inside that
 *   bounded historical visit scope.
 *
 * Additional guards:
 *   - the XLSX loader succeeds with no `JSZip no está disponible` error and the
 *     dashboard shell becomes visible through supported interaction;
 *   - trend/longitudinal data still comes from the whole visit scope and is not
 *     collapsed by a current-state filter;
 *   - the known incompatible longitudinal workbook (#12) stays fail-closed.
 *
 * The dashboard is served over HTTP by a tiny in-process static server (no
 * external dependency) to exercise a real browser-supported path. Files are
 * uploaded with Playwright's real file-input API; filters are driven with
 * selectOption/fill/click, never by DOM state mutation. No fixture, product
 * code, readonly override or clinical rule is modified.
 *
 * Run:  node tests/dashboard_xlsx_current_state.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const DASHBOARD_REL = "Cuadro_Mando_Psoriasis_Valme_v2.html";
const FIXTURE_PATH = path.join(REPO_ROOT, "Base Datos_PsO_Valme_demo.xlsx");
const FIXTURE_NAME = path.basename(FIXTURE_PATH);
const INCOMPATIBLE_XLSX = path.join(REPO_ROOT, "psoriasis_valme_base_longitudinal.xlsx");
const VENDOR_JSZIP = path.join(REPO_ROOT, "vendor/jszip/3.10.1/jszip.min.js");

/* Recorded shape of the #13 synthetic fixture. */
const EXPECTED_BASELINE_PATIENTS = "4";
const EXPECTED_VISITS = 9;
const EXPECTED_TREND_MONTHS = 9;
const EXPECTED_HISTORICAL_PATIENT = "VALM0004";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (_) {
    const root = execSync("npm root -g", { encoding: "utf8" }).trim();
    return require(path.join(root, "playwright"));
  }
}

/* ------------------------------------------------------------------ *
 * Minimal static file server (repo-local, read-only).
 * ------------------------------------------------------------------ */

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xlsx": XLSX_MIME
};

function startStaticServer(root) {
  const server = http.createServer((req, res) => {
    const rawPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const relPath = rawPath === "/" ? DASHBOARD_REL : rawPath.replace(/^\/+/, "");
    const filePath = path.join(root, relPath);
    const rel = path.relative(root, filePath);
    if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream"
      });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

/* ------------------------------------------------------------------ *
 * Assertion bookkeeping
 * ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? " :: " + detail : ""}`);
  }
}

async function waitForStatusText(page, selector, needle, timeout = 10000) {
  await page.waitForFunction(
    ({ sel, n }) => (document.querySelector(sel)?.textContent || "").includes(n),
    { sel: selector, n: needle },
    { timeout }
  );
}

/* ------------------------------------------------------------------ *
 * Browser helpers (supported interaction only)
 * ------------------------------------------------------------------ */

async function kpiPatients(page) {
  return (await page.textContent("#kpiPatients"))?.trim() || "";
}

async function latestPatientIds(page) {
  return page.evaluate(() => latestRows.map((row) => normalizeId(row.nusha)).sort());
}

async function visitScopeSize(page) {
  return page.evaluate(() => visitScopeRows.length);
}

async function trendMonthRows(page) {
  return page.evaluate(() => document.querySelectorAll("#chartTrend tbody tr").length);
}

async function shellHidden(page) {
  return page.evaluate(() => document.getElementById("appShell").classList.contains("hidden"));
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

(async () => {
  for (const required of [path.join(REPO_ROOT, DASHBOARD_REL), FIXTURE_PATH, INCOMPATIBLE_XLSX, VENDOR_JSZIP]) {
    if (!fs.existsSync(required)) {
      console.error("Required artifact missing:", required);
      process.exit(2);
    }
  }

  const playwright = loadPlaywright();
  const { server, baseUrl } = await startStaticServer(REPO_ROOT);
  const dashboardUrl = `${baseUrl}/${DASHBOARD_REL}`;
  console.log("PSO-QA-02 — dashboard XLSX current-state filtering");
  console.log(`  route   : ${dashboardUrl}`);
  console.log(`  fixture : ${FIXTURE_NAME}`);

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    /* ---- Load through HTTP-served real UI ---- */
    console.log("\nBootstrap — HTTP-served V2 shell + real file input");
    await page.goto(dashboardUrl, { waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(() => typeof processMatrix === "function");
    check("dashboard reached over HTTP", await page.evaluate(() => location.protocol === "http:"), await page.evaluate(() => location.href));
    check("local JSZip runtime is available", (await page.evaluate(() => typeof window.JSZip)) === "function", await page.evaluate(() => typeof window.JSZip));

    await page.setInputFiles("#fileInput", {
      name: FIXTURE_NAME,
      mimeType: XLSX_MIME,
      buffer: fs.readFileSync(FIXTURE_PATH)
    });
    await waitForStatusText(page, "#loadStatus", "Base cargada");
    const loadStatus = (await page.textContent("#loadStatus"))?.trim() || "";
    const rawCount = await page.evaluate(() => rawRows.length);
    check("XLSX loads without the JSZip unavailable error", !/JSZip no está disponible/i.test(loadStatus), loadStatus);
    check("loader reports the fixture as cargada", loadStatus.includes("Base cargada"), loadStatus);
    check(`loader ingests ${EXPECTED_VISITS} visitas`, rawCount === EXPECTED_VISITS, `rawRows.length=${rawCount}`);
    check("dashboard shell becomes visible through supported interaction", (await shellHidden(page)) === false, "appShell still hidden");

    // The loader opens the Paciente module; the cohort filters live in Gestión.
    await page.click("#btnGestion");
    await page.locator("#drugFilter").waitFor({ state: "visible" });

    const baseline = await kpiPatients(page);
    check(`baseline Pacientes Únicos = ${EXPECTED_BASELINE_PATIENTS}`, baseline === EXPECTED_BASELINE_PATIENTS, `got ${baseline}`);

    /* ---- Scenario A — no date window, Acitretina ---- */
    console.log("\nScenario A — current state, no date window, Fármaco Activo = Acitretina");
    const hasAcitretinaOption = (await page.locator('#drugFilter option[value="Acitretina"]').count()) === 1;
    check("drug option Acitretina is offered by the UI", hasAcitretinaOption, "option missing");
    await page.selectOption("#drugFilter", "Acitretina");
    await page.waitForFunction(() => document.getElementById("kpiPatients").textContent.trim() === "0");
    const scenarioAKpi = await kpiPatients(page);
    check("Scenario A: Pacientes Únicos = 0 (no historical resurrection)", scenarioAKpi === "0", `got ${scenarioAKpi}`);
    check("Scenario A: no current patient carries Acitretina", (await latestPatientIds(page)).length === 0, JSON.stringify(await latestPatientIds(page)));

    // A current-state filter must not collapse the longitudinal/trend scope.
    const scenarioAScope = await visitScopeSize(page);
    const scenarioATrend = await trendMonthRows(page);
    check(`Scenario A: visit scope keeps all ${EXPECTED_VISITS} visits`, scenarioAScope === EXPECTED_VISITS, `visitScopeRows.length=${scenarioAScope}`);
    check(`Scenario A: trend keeps all ${EXPECTED_TREND_MONTHS} historical months`, scenarioATrend === EXPECTED_TREND_MONTHS, `trend rows=${scenarioATrend}`);

    /* ---- Scenario B — bounded historical window ---- */
    console.log("\nScenario B — clear filters, Fecha Hasta = 2024-12-31, Acitretina");
    await page.click("#clearFiltersBtn");
    await page.locator("#dateTo").fill("2024-12-31");
    await page.selectOption("#drugFilter", "Acitretina");
    await page.waitForFunction(() => document.getElementById("kpiPatients").textContent.trim() === "1");
    const scenarioBKpi = await kpiPatients(page);
    check("Scenario B: Pacientes Únicos = 1", scenarioBKpi === "1", `got ${scenarioBKpi}`);
    check(
      `Scenario B: the one current row is ${EXPECTED_HISTORICAL_PATIENT}`,
      JSON.stringify(await latestPatientIds(page)) === JSON.stringify([EXPECTED_HISTORICAL_PATIENT]),
      JSON.stringify(await latestPatientIds(page))
    );
    const scenarioBScope = await visitScopeSize(page);
    const scenarioBTrend = await trendMonthRows(page);
    check("Scenario B: date window restricts the visit scope to the 2024 visit", scenarioBScope === 1, `visitScopeRows.length=${scenarioBScope}`);
    check("Scenario B: trend reflects the bounded visit scope", scenarioBTrend === 1, `trend rows=${scenarioBTrend}`);

    /* ---- Longitudinal availability from visit scope ---- */
    console.log("\nLongitudinal availability — patient history stays reachable");
    await page.click("#clearFiltersBtn");
    await page.click("#btnPaciente");
    await page.locator("#nushaSearch").waitFor({ state: "visible" });
    await page.locator("#nushaSearch").fill(EXPECTED_HISTORICAL_PATIENT);
    await page.click("#searchPatientBtn");
    await page.waitForFunction(() => currentPatientRows.length === 3);
    const patientVisits = await page.evaluate(() => currentPatientRows.map((row) => formatDate(row.__date)));
    check(
      `longitudinal history for ${EXPECTED_HISTORICAL_PATIENT} keeps its 3 visits`,
      patientVisits.length === 3,
      JSON.stringify(patientVisits)
    );

    /* ---- #12 incompatible path stays fail-closed ---- */
    console.log("\nFail-closed — incompatible longitudinal workbook (#12)");
    await page.setInputFiles("#fileInput", {
      name: path.basename(INCOMPATIBLE_XLSX),
      mimeType: XLSX_MIME,
      buffer: fs.readFileSync(INCOMPATIBLE_XLSX)
    });
    await waitForStatusText(page, "#loadStatus", "XLSX incompatible");
    const incompatibleStatus = (await page.textContent("#loadStatus"))?.trim() || "";
    const incompatibleRows = await page.evaluate(() => rawRows.length);
    check("incompatible XLSX fails closed with an explicit reason", /XLSX incompatible/.test(incompatibleStatus), incompatibleStatus);
    check("incompatible XLSX drops the dataset (no stale cohort)", incompatibleRows === 0, `rawRows.length=${incompatibleRows}`);
    check("incompatible XLSX hides the dashboard shell", (await shellHidden(page)) === true, "appShell still visible");

    check("dashboard: no page errors", pageErrors.length === 0, pageErrors.join(" | "));
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("RESULT: FAIL");
    process.exit(1);
  }
  console.log("RESULT: PASS");
})().catch((err) => {
  console.error("Harness error:", err);
  process.exit(2);
});
