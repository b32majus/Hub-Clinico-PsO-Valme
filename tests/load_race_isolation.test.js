#!/usr/bin/env node
/*
 * Bounded deterministic regression for PSO-06C (issue #17): latest-request-wins
 * isolation of concurrent/out-of-order async dataset loads on both supported
 * surfaces (`index.html` form and `Cuadro_Mando_Psoriasis_Valme_v2.html`).
 *
 * Scenarios (issue #17):
 *   A. A starts, B starts, B succeeds, A fails late  -> B stays authoritative;
 *      no late clear/error from A.
 *   B. A starts, B starts, A succeeds late while B is still pending -> A cannot
 *      activate dataset/status.
 *   C. A starts, B starts, B fails authoritatively -> fail-closed applies for
 *      B; A's later success cannot revive state.
 *   D. Normal single valid load still works on both surfaces.
 *   E. Normal single incompatible XLSX still fails closed.
 *
 * Method: real headless Chromium drives the real pages and the real
 * `<input type="file">` entries (Playwright `setInputFiles`); real synthetic
 * XLSX workbooks are parsed by the real JSZip path. The ONLY test seam is a
 * deterministic gate installed around `JSZip.loadAsync` in the page, which can
 * hold a specific load's parsed result until the test releases it. No
 * application state is ever fabricated: all assertions read the surfaces' own
 * observable DOM status and their real dataset variables.
 *
 * The full browser race suite belongs to QA ticket #18; this file is the
 * bounded helper strictly needed to verify #17.
 *
 * Run:  node tests/load_race_isolation.test.js
 */
"use strict";

const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const INDEX_URL = "file://" + path.join(REPO_ROOT, "index.html");
const DASHBOARD_URL = "file://" + path.join(REPO_ROOT, "Cuadro_Mando_Psoriasis_Valme_v2.html");
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

const VALID_HEADERS = ["nusha", "fecha_visita", "tipo_visita", "procedencia"];
// Single-visit dataset ("A") and two-visit dataset ("B") so the committed
// dataset is identifiable from each surface's own success status.
const ROWS_A = [["VLMRACE1", "2026-01-01", "primera", "atencion_primaria"]];
const ROWS_B = [
  ["VLMRACE1", "2026-01-01", "primera", "atencion_primaria"],
  ["VLMRACE2", "2026-02-01", "seguimiento", "dermatologia_general"]
];
// Incompatible workbook (nhc/id_paciente, no nusha): must fail closed when it
// is the authoritative request, and be ignored when stale.
const HEADERS_INCOMPATIBLE = ["nhc", "id_paciente", "fecha_visita", "tipo_visita"];
const ROWS_INCOMPATIBLE = [["NHC-1", "IDP-1", "2026-01-01", "seguimiento"]];

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
 * Deterministic race gate (the only test seam inside the pages)
 * ------------------------------------------------------------------ */

const GATE_INIT = `
  window.__gate = { ready: false, seq: 0, holdFrom: 0, holdCount: 0, holds: {}, events: [] };
  const install = () => {
    if (window.__gate.ready) return;
    if (typeof window.JSZip === "undefined" || typeof window.JSZip.loadAsync !== "function") return;
    const orig = window.JSZip.loadAsync.bind(window.JSZip);
    window.JSZip.loadAsync = async (...args) => {
      const g = window.__gate;
      const id = ++g.seq;
      g.events.push({ type: "start", id });
      try {
        const result = await orig(...args);
        if (g.holdFrom && id >= g.holdFrom && id < g.holdFrom + g.holdCount) {
          g.events.push({ type: "held", id });
          await new Promise((resolve) => { g.holds[id] = resolve; });
          g.events.push({ type: "released", id });
        }
        return result;
      } catch (err) {
        g.events.push({ type: "error", id });
        throw err;
      }
    };
    window.__gate.ready = true;
    clearInterval(poller);
  };
  install();
  const poller = setInterval(install, 5);
`;

async function waitGateReady(page) {
  await page.waitForFunction(
    () => window.__gate && window.__gate.ready === true,
    null,
    { timeout: 5000 }
  );
}

async function armGate(page, count) {
  // Hold the next `count` load completions; returns the seq base so slots can
  // be addressed as base + 1, base + 2, ... regardless of earlier scenarios.
  return page.evaluate((count) => {
    const g = window.__gate;
    g.holdFrom = g.seq + 1;
    g.holdCount = count;
    return g.seq;
  }, count);
}

async function waitHeld(page, base, slot) {
  const id = base + slot;
  await page.waitForFunction(
    (id) => window.__gate.events.some((e) => e.type === "held" && e.id === id),
    id,
    { timeout: 5000 }
  );
}

async function release(page, id) {
  await page.evaluate((id) => {
    const resolve = window.__gate.holds[id];
    if (resolve) resolve();
  }, id);
}

async function setXlsx(page, selector, name, buffer) {
  await page.setInputFiles(selector, { name, mimeType: XLSX_MIME, buffer });
}

async function waitForStatus(page, selector, needle, timeout = 5000) {
  await page.waitForFunction(
    ({ sel, n }) => (document.querySelector(sel)?.textContent || "").includes(n),
    { sel: selector, n: needle },
    { timeout }
  );
}

/* ------------------------------------------------------------------ *
 * index.html (form) scenarios
 * ------------------------------------------------------------------ */

async function runIndexScenarios(browser) {
  console.log("\nindex.html (form)");
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.addInitScript(GATE_INIT);
  await page.goto(INDEX_URL);
  await waitGateReady(page);

  const status = () => page.$eval("#baseStatus", (el) => el.textContent || "");
  const rowCount = () => page.evaluate(() => baseRows.length);

  const validA = await buildXlsx(VALID_HEADERS, ROWS_A);
  const validB = await buildXlsx(VALID_HEADERS, ROWS_B);
  const incompatible = await buildXlsx(HEADERS_INCOMPATIBLE, ROWS_INCOMPATIBLE);

  // D. Normal single valid load.
  await setXlsx(page, "#baseFileInput", "race_a.xlsx", validA);
  await waitForStatus(page, "#baseStatus", "Base cargada: race_a.xlsx (1 filas)");
  check("D: normal single valid load commits dataset and success status",
    (await rowCount()) === 1, await status());

  // E. Normal single incompatible XLSX fails closed.
  await setXlsx(page, "#baseFileInput", "incompatible.xlsx", incompatible);
  await waitForStatus(page, "#baseStatus", "XLSX incompatible");
  check("E: single incompatible XLSX fails closed with explicit error",
    /XLSX incompatible: faltan columnas requeridas \(nusha\)/.test(await status()),
    await status());
  check("E: fail-closed clears the previous dataset",
    (await rowCount()) === 0, "baseRows not cleared");

  // A. A starts, B starts, B succeeds, A fails late.
  const baseA = await armGate(page, 1);
  await setXlsx(page, "#baseFileInput", "race_a_bad.xlsx", incompatible); // request 1
  await waitHeld(page, baseA, 1);
  await setXlsx(page, "#baseFileInput", "race_b.xlsx", validB); // request 2, not held
  await waitForStatus(page, "#baseStatus", "Base cargada: race_b.xlsx (2 filas)");
  await release(page, 1);
  await page.waitForTimeout(100);
  check("A: B remains authoritative after A fails late",
    (await status()).includes("Base cargada: race_b.xlsx (2 filas)"), await status());
  check("A: stale A failure produced no late clear (dataset intact)",
    (await rowCount()) === 2, `baseRows.length=${await rowCount()}`);
  check("A: stale A failure produced no late error label",
    !(await status()).includes("XLSX incompatible"), await status());

  // B. A starts, B starts, A succeeds late while B is still pending.
  // Start from a known cleared state via an authoritative incompatible load.
  await setXlsx(page, "#baseFileInput", "clear.xlsx", incompatible);
  await waitForStatus(page, "#baseStatus", "XLSX incompatible");
  const baseB = await armGate(page, 2);
  await setXlsx(page, "#baseFileInput", "race_a.xlsx", validA); // request 1, held
  await waitHeld(page, baseB, 1);
  await setXlsx(page, "#baseFileInput", "race_b.xlsx", validB); // request 2, held (pending)
  await waitHeld(page, baseB, 2);
  await release(page, baseB + 1); // A completes late; B still pending
  await page.waitForTimeout(100);
  check("B: late A success cannot activate dataset/status",
    (await rowCount()) === 0 && !(await status()).includes("Base cargada"),
    `rows=${await rowCount()} status=${await status()}`);
  await release(page, baseB + 2); // authoritative B now commits
  await waitForStatus(page, "#baseStatus", "Base cargada: race_b.xlsx (2 filas)");
  check("B: pending B still becomes authoritative after stale A ignored",
    (await rowCount()) === 2, `baseRows.length=${await rowCount()}`);

  // C. A starts, B starts, B fails authoritatively.
  const baseC = await armGate(page, 1);
  await setXlsx(page, "#baseFileInput", "race_a.xlsx", validA); // request 1, held
  await waitHeld(page, baseC, 1);
  await setXlsx(page, "#baseFileInput", "race_b_bad.xlsx", incompatible); // request 2
  await waitForStatus(page, "#baseStatus", "XLSX incompatible");
  check("C: authoritative B failure is fail-closed (explicit error, cleared state)",
    (await rowCount()) === 0 && /XLSX incompatible/.test(await status()), await status());
  await release(page, 1); // stale A success arrives after B's failure
  await page.waitForTimeout(100);
  check("C: stale A success cannot revive state after B's failure",
    (await rowCount()) === 0 && (await status()).includes("XLSX incompatible"),
    `rows=${await rowCount()} status=${await status()}`);

  check("index.html: no page errors during all scenarios",
    pageErrors.length === 0, pageErrors.join(" | "));
  await page.close();
}

/* ------------------------------------------------------------------ *
 * Dashboard V2 scenarios (XLSX only)
 * ------------------------------------------------------------------ */

async function runDashboardScenarios(browser) {
  console.log("\nCuadro_Mando_Psoriasis_Valme_v2.html (dashboard)");
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.addInitScript(GATE_INIT);
  await page.goto(DASHBOARD_URL);
  await waitGateReady(page);

  const status = () => page.$eval("#loadStatus", (el) => el.textContent || "");
  const rowCount = () => page.evaluate(() => rawRows.length);
  const shellHidden = () => page.$eval("#appShell", (el) => el.classList.contains("hidden"));

  const validA = await buildXlsx(VALID_HEADERS, ROWS_A);
  const validB = await buildXlsx(VALID_HEADERS, ROWS_B);
  const incompatible = await buildXlsx(HEADERS_INCOMPATIBLE, ROWS_INCOMPATIBLE);

  // D. Normal single valid load.
  await setXlsx(page, "#fileInput", "race_a.xlsx", validA);
  await waitForStatus(page, "#loadStatus", "Base cargada: race_a.xlsx (1 visitas, 1 pacientes)");
  check("D: normal single valid load commits dataset, status and shell",
    (await rowCount()) === 1 && (await shellHidden()) === false, await status());

  // E. Normal single incompatible XLSX fails closed.
  await setXlsx(page, "#fileInput", "incompatible.xlsx", incompatible);
  await waitForStatus(page, "#loadStatus", "XLSX incompatible");
  check("E: single incompatible XLSX fails closed with explicit error",
    /XLSX incompatible: faltan columnas requeridas \(nusha\)/.test(await status()),
    await status());
  check("E: fail-closed clears the dataset and hides the shell",
    (await rowCount()) === 0 && (await shellHidden()) === true,
    `rows=${await rowCount()} shellHidden=${await shellHidden()}`);

  // A. A starts, B starts, B succeeds, A fails late.
  const baseA = await armGate(page, 1);
  await setXlsx(page, "#fileInput", "race_a_bad.xlsx", incompatible); // request 1
  await waitHeld(page, baseA, 1);
  await setXlsx(page, "#fileInput", "race_b.xlsx", validB); // request 2, not held
  await waitForStatus(page, "#loadStatus", "Base cargada: race_b.xlsx (2 visitas, 2 pacientes)");
  await release(page, 1);
  await page.waitForTimeout(100);
  check("A: B remains authoritative after A fails late",
    (await status()).includes("Base cargada: race_b.xlsx (2 visitas, 2 pacientes)"), await status());
  check("A: stale A failure produced no late clear (dataset intact, shell visible)",
    (await rowCount()) === 2 && (await shellHidden()) === false,
    `rows=${await rowCount()} shellHidden=${await shellHidden()}`);
  check("A: stale A failure produced no late error label",
    !(await status()).includes("XLSX incompatible"), await status());

  // B. A starts, B starts, A succeeds late while B is still pending.
  // Start from a known cleared state via an authoritative incompatible load.
  await setXlsx(page, "#fileInput", "clear.xlsx", incompatible);
  await waitForStatus(page, "#loadStatus", "XLSX incompatible");
  const baseB = await armGate(page, 2);
  await setXlsx(page, "#fileInput", "race_a.xlsx", validA); // request 1, held
  await waitHeld(page, baseB, 1);
  await setXlsx(page, "#fileInput", "race_b.xlsx", validB); // request 2, held (pending)
  await waitHeld(page, baseB, 2);
  await release(page, baseB + 1); // A completes late; B still pending
  await page.waitForTimeout(100);
  check("B: late A success cannot activate dataset/status/shell",
    (await rowCount()) === 0 && (await shellHidden()) === true &&
      (await status()).includes("Procesando archivo"),
    `rows=${await rowCount()} shellHidden=${await shellHidden()} status=${await status()}`);
  await release(page, baseB + 2); // authoritative B now commits
  await waitForStatus(page, "#loadStatus", "Base cargada: race_b.xlsx (2 visitas, 2 pacientes)");
  check("B: pending B still becomes authoritative after stale A ignored",
    (await rowCount()) === 2 && (await shellHidden()) === false,
    `rows=${await rowCount()} shellHidden=${await shellHidden()}`);

  // C. A starts, B starts, B fails authoritatively.
  const baseC = await armGate(page, 1);
  await setXlsx(page, "#fileInput", "race_a.xlsx", validA); // request 1, held
  await waitHeld(page, baseC, 1);
  await setXlsx(page, "#fileInput", "race_b_bad.xlsx", incompatible); // request 2
  await waitForStatus(page, "#loadStatus", "XLSX incompatible");
  check("C: authoritative B failure is fail-closed (explicit error, cleared state, hidden shell)",
    (await rowCount()) === 0 && (await shellHidden()) === true,
    `rows=${await rowCount()} shellHidden=${await shellHidden()}`);
  await release(page, 1); // stale A success arrives after B's failure
  await page.waitForTimeout(100);
  check("C: stale A success cannot revive state after B's failure",
    (await rowCount()) === 0 && (await shellHidden()) === true &&
      (await status()).includes("XLSX incompatible"),
    `rows=${await rowCount()} shellHidden=${await shellHidden()} status=${await status()}`);

  check("dashboard: no page errors during all scenarios",
    pageErrors.length === 0, pageErrors.join(" | "));
  await page.close();
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

(async () => {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    await runIndexScenarios(browser);
    await runDashboardScenarios(browser);
  } finally {
    await browser.close();
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed) {
    console.log("Failures:\n  - " + failures.join("\n  - "));
    process.exit(1);
  }
})().catch((err) => {
  console.error("Harness error:", err);
  process.exit(1);
});
