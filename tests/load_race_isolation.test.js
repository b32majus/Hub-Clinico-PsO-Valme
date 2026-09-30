#!/usr/bin/env node
/*
 * Comprehensive deterministic browser regression for PSO-QA-03 (issue #18):
 * latest-request-wins isolation of concurrent/out-of-order async dataset loads
 * on both supported surfaces (`index.html` form and
 * `Cuadro_Mando_Psoriasis_Valme_v2.html`).
 *
 * Origin: issue #17 (PSO-06C) added a bounded helper with scenarios A-E. This
 * suite reconciles/consolidates/extends that exact helper (same file, same
 * harness, no second framework) so all PSO-QA-03 coverage is explicit and
 * non-redundant, including `index.html`'s CSV input contract and the ordinary
 * single-load / demo paths.
 *
 * Race scenarios (issue #18), per surface:
 *   A. A starts, B starts, B succeeds, A fails late  -> B stays authoritative;
 *      no late clear/error from A.
 *   B. A starts, B starts, A succeeds late while B is still pending -> A cannot
 *      activate dataset/status.
 *   C. A starts, B starts, B fails authoritatively -> fail-closed applies for
 *      B; A's later success cannot revive state.
 * Ordinary single-load paths (D):
 *   - a valid supported file loads normally (CSV and XLSX on `index.html`;
 *     XLSX on the dashboard);
 *   - an incompatible XLSX fails closed with an explicit reason on both;
 *   - the real demo XLSX yields the 4-patient baseline and the PSO-04
 *     Acitretina current-state / date-window scenarios stay green.
 *
 * Method: real headless Chromium drives the real pages and the real
 * `<input type="file">` entries (Playwright `setInputFiles`); real synthetic
 * CSV/XLSX inputs are parsed by the real file-processing path. The ONLY test
 * seams are deterministic gates installed around `JSZip.loadAsync` (XLSX) and
 * `Blob.prototype.text` (CSV), which hold a chosen parse's resolved result
 * until the test releases it. No application/DOM state is ever fabricated:
 * every assertion reads the surfaces' own observable status, dataset and KPI
 * values.
 *
 * Run:  node tests/load_race_isolation.test.js
 */
"use strict";

const fs = require("fs");
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
  // XLSX gate: hold a chosen JSZip.loadAsync result until released.
  window.__gate = { ready: false, seq: 0, holdFrom: 0, holdCount: 0, holds: {}, events: [] };
  window.__installJsZipGate = () => {
    if (window.__gate.ready) return true;
    if (typeof window.JSZip === "undefined" || typeof window.JSZip.loadAsync !== "function") return false;
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
    return true;
  };
  const jszipPoller = setInterval(() => {
    if (window.__installJsZipGate()) clearInterval(jszipPoller);
  }, 5);
  if (window.__installJsZipGate()) clearInterval(jszipPoller);

  // CSV gate: delay a chosen Blob/File.text() resolution until released. The
  // real text is still read and handed to the real parseCSV path.
  window.__csvGate = { seq: 0, holdFrom: 0, holdCount: 0, holds: {}, events: [] };
  const origBlobText = Blob.prototype.text;
  Blob.prototype.text = function (...args) {
    const g = window.__csvGate;
    const id = ++g.seq;
    g.events.push({ type: "start", id });
    const textPromise = origBlobText.apply(this, args);
    if (g.holdFrom && id >= g.holdFrom && id < g.holdFrom + g.holdCount) {
      return textPromise.then(async (text) => {
        g.events.push({ type: "held", id });
        await new Promise((resolve) => { g.holds[id] = resolve; });
        g.events.push({ type: "released", id });
        return text;
      });
    }
    return textPromise;
  };
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
  // Confirm the held continuation actually resumed, so a scenario cannot pass
  // vacuously by never releasing the stale request.
  await page.waitForFunction(
    (id) => window.__gate.events.some((e) => e.type === "released" && e.id === id),
    id,
    { timeout: 5000 }
  );
}

async function armCsvGate(page, count) {
  return page.evaluate((count) => {
    const g = window.__csvGate;
    g.holdFrom = g.seq + 1;
    g.holdCount = count;
    return g.seq;
  }, count);
}

async function waitCsvHeld(page, base, slot) {
  const id = base + slot;
  await page.waitForFunction(
    (id) => window.__csvGate.events.some((e) => e.type === "held" && e.id === id),
    id,
    { timeout: 5000 }
  );
}

async function releaseCsv(page, id) {
  await page.evaluate((id) => {
    const resolve = window.__csvGate.holds[id];
    if (resolve) resolve();
  }, id);
  await page.waitForFunction(
    (id) => window.__csvGate.events.some((e) => e.type === "released" && e.id === id),
    id,
    { timeout: 5000 }
  );
}

async function setXlsx(page, selector, name, buffer) {
  await page.setInputFiles(selector, { name, mimeType: XLSX_MIME, buffer });
}

async function setCsv(page, selector, name, text) {
  await page.setInputFiles(selector, {
    name,
    mimeType: "text/csv",
    buffer: Buffer.from(text, "utf8")
  });
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
  // index.html also supports CSV; the race coordination must cover it too.
  const csvA = "nusha,fecha_visita,tipo_visita\nVLMRACE1,2026-01-01,primera\n";
  const csvEmpty = "";

  // D. Normal single valid load (XLSX).
  await setXlsx(page, "#baseFileInput", "race_a.xlsx", validA);
  await waitForStatus(page, "#baseStatus", "Base cargada: race_a.xlsx (1 filas)");
  check("D: normal single valid XLSX load commits dataset and success status",
    (await rowCount()) === 1, await status());

  // D. Normal single valid load (CSV, index.html's other supported input).
  await setCsv(page, "#baseFileInput", "race_a.csv", csvA);
  await waitForStatus(page, "#baseStatus", "Base cargada: race_a.csv (1 filas)");
  check("D: normal single valid CSV load commits dataset and success status",
    (await rowCount()) === 1 && (await status()).includes("race_a.csv"), await status());

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
  await release(page, baseA + 1); // stale A (request 1) finally completes
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
  await release(page, baseC + 1); // stale A success finally arrives after B's failure
  await page.waitForTimeout(100);
  check("C: stale A success cannot revive state after B's failure",
    (await rowCount()) === 0 && (await status()).includes("XLSX incompatible"),
    `rows=${await rowCount()} status=${await status()}`);

  // CSV contract — stale failure after newer XLSX success (A-like).
  await setXlsx(page, "#baseFileInput", "race_b.xlsx", validB);
  await waitForStatus(page, "#baseStatus", "Base cargada: race_b.xlsx (2 filas)");
  const csvBaseA = await armCsvGate(page, 1);
  await setCsv(page, "#baseFileInput", "empty.csv", csvEmpty); // request 1, held
  await waitCsvHeld(page, csvBaseA, 1);
  await setXlsx(page, "#baseFileInput", "race_b.xlsx", validB); // request 2, authoritative
  await waitForStatus(page, "#baseStatus", "Base cargada: race_b.xlsx (2 filas)");
  await releaseCsv(page, csvBaseA + 1);
  await page.waitForTimeout(100);
  check("A(csv): stale CSV failure cannot clear or relabel newer XLSX state",
    (await rowCount()) === 2 && !(await status()).includes("vacía"), await status());

  // CSV contract — stale success after newer XLSX request (B-like).
  const csvBaseB = await armCsvGate(page, 1);
  await setCsv(page, "#baseFileInput", "race_a.csv", csvA); // request 1, held
  await waitCsvHeld(page, csvBaseB, 1);
  await setXlsx(page, "#baseFileInput", "race_b.xlsx", validB); // request 2, authoritative
  await waitForStatus(page, "#baseStatus", "Base cargada: race_b.xlsx (2 filas)");
  await releaseCsv(page, csvBaseB + 1);
  await page.waitForTimeout(100);
  check("B(csv): stale CSV success cannot activate over newer XLSX state",
    (await rowCount()) === 2 && (await status()).includes("race_b.xlsx"), await status());

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
  await release(page, baseA + 1); // stale A (request 1) finally completes
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
  await release(page, baseC + 1); // stale A success finally arrives after B's failure
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
 * Ordinary single-load paths on the dashboard (D): the real demo XLSX and
 * the existing PSO-04 Acitretina scenarios must stay green.
 * ------------------------------------------------------------------ */

const DEMO_XLSX_PATH = path.join(REPO_ROOT, "Base Datos_PsO_Valme_demo.xlsx");

async function runDashboardOrdinaryPaths(browser) {
  console.log("\nCuadro_Mando_Psoriasis_Valme_v2.html (ordinary single-load / demo XLSX)");
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(DASHBOARD_URL);
  await page.waitForFunction(() => typeof processMatrix === "function");

  // D. Normal single valid load of the committed demo fixture.
  const demoName = path.basename(DEMO_XLSX_PATH);
  await setXlsx(page, "#fileInput", demoName, fs.readFileSync(DEMO_XLSX_PATH));
  await waitForStatus(page, "#loadStatus", "Base cargada: " + demoName + " (9 visitas, 4 pacientes)");
  const demoVisits = await page.evaluate(() => rawRows.length);
  const demoPatients = await page.evaluate(
    () => new Set(rawRows.map((r) => normalizeId(r.nusha))).size
  );
  check("D: demo XLSX loads normally (9 visitas / 4 pacientes)",
    demoVisits === 9 && demoPatients === 4,
    `visitas=${demoVisits} pacientes=${demoPatients}`);

  await page.click("#btnGestion");
  await page.locator("#drugFilter").waitFor({ state: "visible" });
  const baseline = (await page.textContent("#kpiPatients")).trim();
  check("D: demo XLSX baseline Pacientes Únicos = 4", baseline === "4", baseline);

  const hasAcitretina = (await page.locator('#drugFilter option[value="Acitretina"]').count()) === 1;
  check("D: Acitretina option is offered by the UI", hasAcitretina, "option missing");
  await page.selectOption("#drugFilter", "Acitretina");
  await page.waitForFunction(() => document.getElementById("kpiPatients").textContent.trim() === "0");
  check("D: PSO-04 scenario A (no window, Acitretina) = 0",
    (await page.textContent("#kpiPatients")).trim() === "0",
    (await page.textContent("#kpiPatients")).trim());

  await page.click("#clearFiltersBtn");
  await page.locator("#dateTo").fill("2024-12-31");
  await page.selectOption("#drugFilter", "Acitretina");
  await page.waitForFunction(() => document.getElementById("kpiPatients").textContent.trim() === "1");
  const scenarioB = (await page.textContent("#kpiPatients")).trim();
  const scenarioBIds = await page.evaluate(
    () => latestRows.map((r) => normalizeId(r.nusha)).sort()
  );
  check("D: PSO-04 scenario B (window 2024-12-31, Acitretina) = 1 / VALM0004",
    scenarioB === "1" && JSON.stringify(scenarioBIds) === JSON.stringify(["VALM0004"]),
    `kpi=${scenarioB} ids=${JSON.stringify(scenarioBIds)}`);

  check("dashboard demo: no page errors", pageErrors.length === 0, pageErrors.join(" | "));
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
    await runDashboardOrdinaryPaths(browser);
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
