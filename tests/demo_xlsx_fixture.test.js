#!/usr/bin/env node
/*
 * Deterministic verification harness for PSO-QA-01: the reproducible XLSX demo
 * fixture derived from `Base Datos_PsO_Valme_demo.csv`.
 *
 * Invariants under test (issue #13):
 *   1. the source CSV SHA-256 matches the recorded evidence hash;
 *   2. the derived workbook's first sheet reproduces the CSV header with the
 *      same 174 columns in the same order;
 *   3. rows 2-10 reproduce the 9 CSV visit rows exactly (lossless string/blank);
 *   4. NUSHA counts are VALM0001 x3, VALM0002 x2, VALM0003 x1, VALM0004 x3;
 *   5. the real dashboard V2 loader (and the form loader) accept the workbook.
 *
 * The comparison is lossless: a blank CSV cell must be blank in the workbook
 * (no zero/absent coercion) and every non-blank value must match verbatim.
 * The workbook is parsed with the dashboard's own `parseXLSX` in headless
 * Chromium, exercising the exact loader contract hardened by #11/#12.
 *
 * Run:  node tests/demo_xlsx_fixture.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(REPO_ROOT, "Base Datos_PsO_Valme_demo.csv");
const XLSX_PATH = path.join(REPO_ROOT, "Base Datos_PsO_Valme_demo.xlsx");
const DASHBOARD_PATH = path.join(REPO_ROOT, "Cuadro_Mando_Psoriasis_Valme_v2.html");
const INDEX_PATH = path.join(REPO_ROOT, "index.html");
const DASHBOARD_URL = "file://" + DASHBOARD_PATH;
const INDEX_URL = "file://" + INDEX_PATH;
const VENDOR_JSZIP = path.join(REPO_ROOT, "vendor/jszip/3.10.1/jszip.min.js");

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/* Recorded evidence — SHA-256 of the source-of-truth CSV. */
const SOURCE_CSV_SHA256 =
  "9f1918f85b7a45bcdebc70c6994d99b1dfb74d8bcfabe6948463678ca42621c3";
const EXPECTED_HEADER_COLUMNS = 174;
const EXPECTED_VISIT_ROWS = 9;
const EXPECTED_NUSHA_COUNTS = {
  VALM0001: 3,
  VALM0002: 2,
  VALM0003: 1,
  VALM0004: 3
};

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (_) {
    const root = execSync("npm root -g", { encoding: "utf8" }).trim();
    return require(path.join(root, "playwright"));
  }
}

/* ------------------------------------------------------------------ *
 * Minimal RFC4180-ish CSV parser (quotes supported; blanks preserved).
 * ------------------------------------------------------------------ */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
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

async function waitForStatusText(page, selector, needle, timeout = 5000) {
  await page.waitForFunction(
    ({ sel, n }) => (document.querySelector(sel)?.textContent || "").includes(n),
    { sel: selector, n: needle },
    { timeout }
  );
}

/* ------------------------------------------------------------------ *
 * Source CSV baseline
 * ------------------------------------------------------------------ */

function loadCsvMatrix() {
  const buffer = fs.readFileSync(CSV_PATH);
  const sha = crypto.createHash("sha256").update(buffer).digest("hex");
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  return { sha, matrix: parseCsv(text) };
}

/* ------------------------------------------------------------------ *
 * Parse the committed workbook with the dashboard's own loader.
 * ------------------------------------------------------------------ */

async function parseWithDashboardLoader(page, xlsxBase64) {
  return page.evaluate(async ({ b64, name }) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], name, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const parsed = await parseXLSX(file);
    return parsed.map((row) =>
      Array.from({ length: row.length }, (_, i) =>
        row[i] === undefined || row[i] === null ? null : String(row[i])
      )
    );
  }, { b64: xlsxBase64, name: path.basename(XLSX_PATH) });
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

(async () => {
  for (const required of [CSV_PATH, XLSX_PATH, DASHBOARD_PATH, INDEX_PATH, VENDOR_JSZIP]) {
    if (!fs.existsSync(required)) {
      console.error("Required artifact missing:", required);
      process.exit(2);
    }
  }

  const { sha, matrix: csvMatrix } = loadCsvMatrix();
  const xlsxBase64 = fs.readFileSync(XLSX_PATH).toString("base64");

  console.log("PSO-QA-01 — reproducible XLSX demo fixture");
  console.log(`  source CSV : ${path.basename(CSV_PATH)}`);
  console.log(`  CSV SHA-256: ${sha}`);
  console.log(`  workbook   : ${path.basename(XLSX_PATH)} (${fs.statSync(XLSX_PATH).size} bytes)`);

  check("source CSV SHA-256 matches recorded evidence", sha === SOURCE_CSV_SHA256, sha);
  check(
    `source CSV has ${EXPECTED_HEADER_COLUMNS} header columns`,
    Array.isArray(csvMatrix[0]) && csvMatrix[0].length === EXPECTED_HEADER_COLUMNS,
    `header.length=${csvMatrix[0] ? csvMatrix[0].length : "n/a"}`
  );
  check(
    `source CSV has ${EXPECTED_VISIT_ROWS} visit rows`,
    csvMatrix.length - 1 === EXPECTED_VISIT_ROWS,
    `data rows=${csvMatrix.length - 1}`
  );

  const JSZip = require(VENDOR_JSZIP);
  const zip = await JSZip.loadAsync(fs.readFileSync(XLSX_PATH));
  const workbookXml = await zip.file("xl/workbook.xml").async("text");
  const sheetCount = (workbookXml.match(/<sheet\s/g) || []).length;
  check("workbook declares exactly one worksheet", sheetCount === 1, `sheets=${sheetCount}`);

  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    /* ---- Lossless header + cell equivalence via the real loader ---- */
    console.log("\nLossless CSV <-> XLSX equivalence (dashboard parseXLSX)");
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    await page.goto(DASHBOARD_URL);
    await page.waitForFunction(() => typeof parseXLSX === "function");

    const xlsxMatrix = await parseWithDashboardLoader(page, xlsxBase64);

    check(
      "workbook has header + 9 visit rows",
      xlsxMatrix.length === EXPECTED_VISIT_ROWS + 1,
      `rows=${xlsxMatrix.length}`
    );
    check(
      `first sheet header has ${EXPECTED_HEADER_COLUMNS} columns`,
      xlsxMatrix.length > 0 && xlsxMatrix[0].length === EXPECTED_HEADER_COLUMNS,
      `header.length=${xlsxMatrix[0] ? xlsxMatrix[0].length : "n/a"}`
    );

    const headerMismatches = [];
    for (let j = 0; j < EXPECTED_HEADER_COLUMNS; j += 1) {
      const source = csvMatrix[0][j] ?? "";
      const derived = (xlsxMatrix[0] && xlsxMatrix[0][j]) ?? "";
      if (String(source) !== String(derived)) headerMismatches.push(j);
    }
    check(
      "header columns match CSV order verbatim",
      headerMismatches.length === 0,
      `mismatched indexes=${JSON.stringify(headerMismatches)}`
    );

    let cellMismatches = 0;
    let firstMismatch = null;
    for (let r = 1; r <= EXPECTED_VISIT_ROWS; r += 1) {
      const sourceRow = csvMatrix[r] || [];
      const derivedRow = xlsxMatrix[r] || [];
      for (let j = 0; j < EXPECTED_HEADER_COLUMNS; j += 1) {
        const source = String(sourceRow[j] ?? "");
        const derived = String(derivedRow[j] ?? "");
        if (source !== derived) {
          cellMismatches += 1;
          if (!firstMismatch) firstMismatch = { row: r + 1, col: j + 1, source, derived };
        }
      }
    }
    check(
      "every source cell equals derived cell (lossless string/blank)",
      cellMismatches === 0,
      `mismatches=${cellMismatches}${firstMismatch ? " first=" + JSON.stringify(firstMismatch) : ""}`
    );

    /* ---- V2 dashboard smoke load ---- */
    console.log("\nCuadro_Mando_Psoriasis_Valme_v2.html smoke load");
    await page.setInputFiles("#fileInput", XLSX_PATH);
    await waitForStatusText(page, "#loadStatus", "Base cargada");
    const dashRows = await page.evaluate(() => (typeof rawRows === "undefined" ? -1 : rawRows.length));
    const dashStatus = await page.$eval("#loadStatus", (el) => el.textContent || "");
    const shellHidden = await page.$eval("#appShell", (el) => el.classList.contains("hidden"));
    check("V2 loader reports success", dashStatus.includes("Base cargada"), dashStatus);
    check("V2 loader ingests exactly 9 visitas", dashRows === EXPECTED_VISIT_ROWS, `rawRows.length=${dashRows}`);
    check("V2 loader reports 4 pacientes", dashStatus.includes("4 pacientes"), dashStatus);
    check("V2 dashboard shell is visible", shellHidden === false, "appShell still hidden");

    const dashCounts = await page.evaluate(() => {
      const counts = {};
      rawRows.forEach((row) => {
        const id = normalizeId(row.nusha);
        counts[id] = (counts[id] || 0) + 1;
      });
      return counts;
    });
    check(
      "V2 NUSHA counts match the synthetic scenario",
      JSON.stringify(dashCounts) === JSON.stringify(EXPECTED_NUSHA_COUNTS),
      JSON.stringify(dashCounts)
    );
    check("dashboard: no page errors", pageErrors.length === 0, pageErrors.join(" | "));
    await page.close();

    /* ---- index.html form loader smoke ---- */
    console.log("\nindex.html form loader smoke load");
    const indexPage = await browser.newPage();
    const indexErrors = [];
    indexPage.on("pageerror", (err) => indexErrors.push(err.message));
    await indexPage.goto(INDEX_URL);
    await indexPage.setInputFiles("#baseFileInput", XLSX_PATH);
    await waitForStatusText(indexPage, "#baseStatus", "Base cargada");
    const indexRows = await indexPage.evaluate(() =>
      typeof baseRows === "undefined" ? -1 : baseRows.length
    );
    const indexStatus = await indexPage.$eval("#baseStatus", (el) => el.textContent || "");
    check("form loader reports success", indexStatus.includes("Base cargada"), indexStatus);
    check("form loader ingests exactly 9 filas", indexRows === EXPECTED_VISIT_ROWS, `baseRows.length=${indexRows}`);
    check("index.html: no page errors", indexErrors.length === 0, indexErrors.join(" | "));
    await indexPage.close();
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
