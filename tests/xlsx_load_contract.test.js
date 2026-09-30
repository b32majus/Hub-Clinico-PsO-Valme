#!/usr/bin/env node
/*
 * Deterministic regression harness for PSO-06B: the XLSX load contract across
 * `index.html` (form) and `Cuadro_Mando_Psoriasis_Valme_v2.html` (dashboard).
 *
 * Invariants under test (issue #12):
 *   1. a compatible XLSX (nusha, fecha_visita, tipo_visita) loads and reports a
 *      clear success status;
 *   2. a workbook missing `nusha` fails closed with an explicit reason;
 *   3. a workbook missing `fecha_visita` fails closed with an explicit reason;
 *   4. a workbook missing `tipo_visita` fails closed with an explicit reason;
 *   5. the known incompatible longitudinal workbook (id_paciente/nhc, no nusha)
 *      fails closed AND does not retain a previously loaded stale dataset;
 *   6. a missing local JSZip runtime surfaces an explicit technical error with
 *      no partial state.
 *
 * It drives the real HTML surfaces and the real file inputs in headless Chromium
 * via Playwright (already available in the Atenea environment). Synthetic
 * workbooks are generated in-memory; the longitudinal workbook is the real
 * repository fixture, read-only.
 *
 * Run:  node tests/xlsx_load_contract.test.js
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
const LONGITUDINAL_XLSX = path.join(REPO_ROOT, "psoriasis_valme_base_longitudinal.xlsx");
const COMPATIBLE_XLSX = path.join(REPO_ROOT, "Base Datos_PsO_Valme.xlsx");
const VENDOR_JSZIP = path.join(REPO_ROOT, "vendor/jszip/3.10.1/jszip.min.js");

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
 * Minimal synthetic XLSX builder (inline strings; no sharedStrings).
 * ------------------------------------------------------------------ */

const JSZip = require(VENDOR_JSZIP);

function colRef(index) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sheetXml(headers, rows) {
  const all = [headers, ...rows];
  const body = all
    .map((cells, r) => {
      const cs = cells
        .map((v, c) => {
          const ref = colRef(c) + (r + 1);
          if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cs}</row>`;
    })
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${body}</sheetData></worksheet>`
  );
}

async function buildXlsx(headers, rows) {
  const zip = new JSZip();
  zip.file(
    "xl/workbook.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Base_PsO" sheetId="1" r:id="rId1"/></sheets></workbook>'
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" ' +
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
      'Target="worksheets/sheet1.xml"/></Relationships>'
  );
  zip.file("xl/worksheets/sheet1.xml", sheetXml(headers, rows));
  return zip.generateAsync({ type: "nodebuffer" });
}

/* ------------------------------------------------------------------ *
 * Synthetic workbook shapes
 * ------------------------------------------------------------------ */

const VALID_HEADERS = [
  "nusha",
  "fecha_visita",
  "tipo_visita",
  "procedencia",
  "tx_seguimiento_biologicos_farmaco_1"
];
const VALID_ROWS = [
  ["VLMTEST1", "2026-01-01", "seguimiento", "atencion_primaria", "Adalimumab"],
  ["VLMTEST2", "2026-02-01", "primera", "dermatologia_general", ""]
];

// Missing nusha, but with `nhc`/`id_paciente` present: must NOT be coerced.
const MISSING_NUSHA = {
  headers: ["nhc", "id_paciente", "fecha_visita", "tipo_visita", "procedencia"],
  rows: [["NHC-1", "IDP-1", "2026-01-01", "seguimiento", "atencion_primaria"]]
};
const MISSING_FECHA = {
  headers: ["nusha", "tipo_visita", "procedencia"],
  rows: [["VLMTEST1", "seguimiento", "atencion_primaria"]]
};
const MISSING_TIPO = {
  headers: ["nusha", "fecha_visita", "procedencia"],
  rows: [["VLMTEST1", "2026-01-01", "atencion_primaria"]]
};

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

/* ------------------------------------------------------------------ *
 * Browser helpers
 * ------------------------------------------------------------------ */

async function waitForStatusText(page, selector, needle, timeout = 5000) {
  await page.waitForFunction(
    ({ sel, n }) => (document.querySelector(sel)?.textContent || "").includes(n),
    { sel: selector, n: needle },
    { timeout }
  );
}

async function setFileInput(page, selector, name, buffer) {
  await page.setInputFiles(selector, { name, mimeType: XLSX_MIME, buffer });
}

async function indexStatus(page) {
  return page.$eval("#baseStatus", (el) => el.textContent || "");
}

async function indexRows(page) {
  return page.evaluate(() => (typeof baseRows === "undefined" ? -1 : baseRows.length));
}

async function dashStatus(page) {
  return page.$eval("#loadStatus", (el) => el.textContent || "");
}

async function dashRows(page) {
  return page.evaluate(() => (typeof rawRows === "undefined" ? -1 : rawRows.length));
}

async function dashShellHidden(page) {
  return page.$eval("#appShell", (el) => el.classList.contains("hidden"));
}

/* ------------------------------------------------------------------ *
 * index.html cases
 * ------------------------------------------------------------------ */

async function runIndexCases(browser) {
  console.log("\nindex.html (form)");
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(INDEX_URL);

  // 1. Compatible XLSX -> load.
  await setFileInput(page, "#baseFileInput", "valid.xlsx", await buildXlsx(VALID_HEADERS, VALID_ROWS));
  await waitForStatusText(page, "#baseStatus", "Base cargada");
  const rows = await indexRows(page);
  const status = await indexStatus(page);
  check("compatible XLSX loads (2 filas)", rows === 2, `baseRows.length=${rows} status=${status}`);
  check("compatible XLSX reports a clear success status", status.includes("Base cargada") && status.includes("2 filas"), status);
  const identity = await page.evaluate(() => baseRows.map((r) => r.__id));
  check(
    "compatible XLSX identity comes from nusha",
    identity.length === 2 && identity[0] === "VLMTEST1" && identity[1] === "VLMTEST2",
    JSON.stringify(identity)
  );

  // 1b. Real compatible donor fixture also loads deterministically.
  await setFileInput(page, "#baseFileInput", "Base Datos_PsO_Valme.xlsx", fs.readFileSync(COMPATIBLE_XLSX));
  await waitForStatusText(page, "#baseStatus", "Base cargada");
  const realRows = await indexRows(page);
  check("real compatible donor workbook loads", realRows > 0, `baseRows.length=${realRows}`);

  // 5. Known incompatible longitudinal workbook -> fail closed, no stale retained.
  const longitudinal = fs.readFileSync(LONGITUDINAL_XLSX);
  await setFileInput(page, "#baseFileInput", "psoriasis_valme_base_longitudinal.xlsx", longitudinal);
  await waitForStatusText(page, "#baseStatus", "XLSX incompatible");
  const staleRows = await indexRows(page);
  const longStatus = await indexStatus(page);
  check("longitudinal workbook fails closed", longStatus.includes("XLSX incompatible"), longStatus);
  check("longitudinal failure cites missing nusha", /faltan columnas requeridas \(nusha\)/.test(longStatus), longStatus);
  check("longitudinal failure does not retain stale dataset", staleRows === 0, `baseRows.length=${staleRows}`);
  check(
    "longitudinal identity (nhc) is not coerced into nusha",
    await page.evaluate(() => baseRows.every((r) => r.__id === "")),
    "stale rows remained"
  );

  // 2. Missing nusha -> fail closed.
  await setFileInput(page, "#baseFileInput", "missing_nusha.xlsx", await buildXlsx(MISSING_NUSHA.headers, MISSING_NUSHA.rows));
  await waitForStatusText(page, "#baseStatus", "XLSX incompatible");
  const s2 = await indexStatus(page);
  check("missing nusha fails closed", s2.includes("XLSX incompatible") && /faltan columnas requeridas \(nusha\)/.test(s2), s2);
  check("missing nusha leaves no dataset", (await indexRows(page)) === 0, "baseRows not cleared");

  // 3. Missing fecha_visita -> fail closed.
  await setFileInput(page, "#baseFileInput", "missing_fecha.xlsx", await buildXlsx(MISSING_FECHA.headers, MISSING_FECHA.rows));
  await waitForStatusText(page, "#baseStatus", "XLSX incompatible");
  const s3 = await indexStatus(page);
  check("missing fecha_visita fails closed", s3.includes("XLSX incompatible") && /faltan columnas requeridas \(fecha_visita\)/.test(s3), s3);
  check("missing fecha_visita leaves no dataset", (await indexRows(page)) === 0, "baseRows not cleared");

  // 4. Missing tipo_visita -> fail closed.
  await setFileInput(page, "#baseFileInput", "missing_tipo.xlsx", await buildXlsx(MISSING_TIPO.headers, MISSING_TIPO.rows));
  await waitForStatusText(page, "#baseStatus", "XLSX incompatible");
  const s4 = await indexStatus(page);
  check("missing tipo_visita fails closed", s4.includes("XLSX incompatible") && /faltan columnas requeridas \(tipo_visita\)/.test(s4), s4);
  check("missing tipo_visita leaves no dataset", (await indexRows(page)) === 0, "baseRows not cleared");

  // 6. Missing local JSZip runtime -> explicit technical error, no partial state.
  await page.evaluate(() => { window.JSZip = undefined; });
  await setFileInput(page, "#baseFileInput", "valid_no_runtime.xlsx", await buildXlsx(VALID_HEADERS, VALID_ROWS));
  await waitForStatusText(page, "#baseStatus", "JSZip");
  const s6 = await indexStatus(page);
  check("missing JSZip runtime surfaces explicit technical error", /JSZip/i.test(s6), s6);
  check("missing JSZip runtime leaves no partial state", (await indexRows(page)) === 0, "baseRows not cleared");

  check("index.html: no page errors", pageErrors.length === 0, pageErrors.join(" | "));
  await page.close();
}

/* ------------------------------------------------------------------ *
 * Dashboard V2 cases
 * ------------------------------------------------------------------ */

async function runDashboardCases(browser) {
  console.log("\nCuadro_Mando_Psoriasis_Valme_v2.html (dashboard)");
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(DASHBOARD_URL);
  await page.waitForFunction(() => typeof processMatrix === "function");

  // 1. Compatible XLSX -> load.
  await setFileInput(page, "#fileInput", "valid.xlsx", await buildXlsx(VALID_HEADERS, VALID_ROWS));
  await waitForStatusText(page, "#loadStatus", "Base cargada");
  const rows = await dashRows(page);
  const status = await dashStatus(page);
  check("compatible XLSX loads (2 visitas)", rows === 2, `rawRows.length=${rows} status=${status}`);
  check("compatible XLSX reports a clear success status", status.includes("Base cargada") && status.includes("2 visitas"), status);
  check("compatible XLSX shows the dashboard shell", (await dashShellHidden(page)) === false, "appShell still hidden");

  // 1b. Real compatible donor fixture also loads deterministically.
  await setFileInput(page, "#fileInput", "Base Datos_PsO_Valme.xlsx", fs.readFileSync(COMPATIBLE_XLSX));
  await waitForStatusText(page, "#loadStatus", "Base cargada");
  const realRows = await dashRows(page);
  check("real compatible donor workbook loads", realRows > 0, `rawRows.length=${realRows}`);

  // 5. Known incompatible longitudinal workbook -> fail closed, no stale retained.
  const longitudinal = fs.readFileSync(LONGITUDINAL_XLSX);
  await setFileInput(page, "#fileInput", "psoriasis_valme_base_longitudinal.xlsx", longitudinal);
  await waitForStatusText(page, "#loadStatus", "XLSX incompatible");
  const s5 = await dashStatus(page);
  check("longitudinal workbook fails closed", s5.includes("XLSX incompatible"), s5);
  check("longitudinal failure cites missing nusha", /faltan columnas requeridas \(nusha\)/.test(s5), s5);
  check("longitudinal failure clears rawRows (no stale)", (await dashRows(page)) === 0, "rawRows not cleared");
  check("longitudinal failure hides the dashboard shell", (await dashShellHidden(page)) === true, "appShell still visible");

  // 2. Missing nusha -> fail closed.
  await setFileInput(page, "#fileInput", "missing_nusha.xlsx", await buildXlsx(MISSING_NUSHA.headers, MISSING_NUSHA.rows));
  await waitForStatusText(page, "#loadStatus", "XLSX incompatible");
  const d2 = await dashStatus(page);
  check("missing nusha fails closed", d2.includes("XLSX incompatible") && /faltan columnas requeridas \(nusha\)/.test(d2), d2);
  check("missing nusha leaves no dataset", (await dashRows(page)) === 0, "rawRows not cleared");

  // 3. Missing fecha_visita -> fail closed.
  await setFileInput(page, "#fileInput", "missing_fecha.xlsx", await buildXlsx(MISSING_FECHA.headers, MISSING_FECHA.rows));
  await waitForStatusText(page, "#loadStatus", "XLSX incompatible");
  const d3 = await dashStatus(page);
  check("missing fecha_visita fails closed", d3.includes("XLSX incompatible") && /faltan columnas requeridas \(fecha_visita\)/.test(d3), d3);
  check("missing fecha_visita leaves no dataset", (await dashRows(page)) === 0, "rawRows not cleared");

  // 4. Missing tipo_visita -> fail closed.
  await setFileInput(page, "#fileInput", "missing_tipo.xlsx", await buildXlsx(MISSING_TIPO.headers, MISSING_TIPO.rows));
  await waitForStatusText(page, "#loadStatus", "XLSX incompatible");
  const d4 = await dashStatus(page);
  check("missing tipo_visita fails closed", d4.includes("XLSX incompatible") && /faltan columnas requeridas \(tipo_visita\)/.test(d4), d4);
  check("missing tipo_visita leaves no dataset", (await dashRows(page)) === 0, "rawRows not cleared");

  // 6. Missing local JSZip runtime -> explicit technical error, no partial state.
  await page.evaluate(() => { window.JSZip = undefined; });
  await setFileInput(page, "#fileInput", "valid_no_runtime.xlsx", await buildXlsx(VALID_HEADERS, VALID_ROWS));
  await waitForStatusText(page, "#loadStatus", "JSZip");
  const d6 = await dashStatus(page);
  check("missing JSZip runtime surfaces explicit technical error", /JSZip/i.test(d6), d6);
  check("missing JSZip runtime leaves no partial state", (await dashRows(page)) === 0, "rawRows not cleared");

  check("dashboard: no page errors", pageErrors.length === 0, pageErrors.join(" | "));
  await page.close();
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

(async () => {
  for (const required of [INDEX_PATH, DASHBOARD_PATH, LONGITUDINAL_XLSX, COMPATIBLE_XLSX, VENDOR_JSZIP]) {
    if (!fs.existsSync(required)) {
      console.error("Required artifact missing:", required);
      process.exit(2);
    }
  }

  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    await runIndexCases(browser);
    await runDashboardCases(browser);
  } finally {
    await browser.close();
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
