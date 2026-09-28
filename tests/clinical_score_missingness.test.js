#!/usr/bin/env node
/*
 * Deterministic regression harness for PSO-03: missingness semantics for the
 * clinical scores in `index.html`.
 *
 * Invariant under test: missing != 0. PASI, DLQI and PURE-4 only produce an
 * authoritative total when all components of the implemented instrument are
 * answered; untouched or partial input stays empty/pending/incomplete. A
 * completed instrument whose score is legitimately 0 must still serialize as
 * a real 0. A PURE-4 positive screen may raise an alert but must never write
 * `derivacion_derma_reuma = 1`; a clinician's manual referral is preserved.
 *
 * It drives the real form in headless Chromium (Playwright, available in the
 * Atenea environment) and reads the exported row through the real `gather()`.
 *
 * Run:  node tests/clinical_score_missingness.test.js
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
 * Instrument fixtures (test-only, deterministic, synthetic)
 * ------------------------------------------------------------------ */

const PASI_REGIONS = [
  { key: "cabeza", weight: 0.10 },
  { key: "tronco", weight: 0.30 },
  { key: "brazos", weight: 0.20 },
  { key: "piernas", weight: 0.40 }
];
const PASI_METRICS = ["eritema", "induracion", "escamas", "area"];

const PASI_ZERO_FIXTURE = Object.fromEntries(
  PASI_REGIONS.map((region) => [region.key, { eritema: 0, induracion: 0, escamas: 0, area: 0 }])
);

const PASI_NON_ZERO_FIXTURE = {
  cabeza: { eritema: 2, induracion: 1, escamas: 1, area: 2 },
  tronco: { eritema: 1, induracion: 1, escamas: 1, area: 1 },
  brazos: { eritema: 0, induracion: 0, escamas: 0, area: 0 },
  piernas: { eritema: 3, induracion: 2, escamas: 1, area: 2 }
};

const DLQI_MAIN_ITEMS = [
  "dlqi_q1", "dlqi_q2", "dlqi_q3", "dlqi_q4", "dlqi_q5",
  "dlqi_q6", "dlqi_q8", "dlqi_q9", "dlqi_q10"
];

const PURE4_ITEMS = ["pure4_q1", "pure4_q2", "pure4_q3", "pure4_q4"];

function expectedPasi(fixture) {
  return PASI_REGIONS.reduce((total, region) => {
    const v = fixture[region.key];
    return total + (v.eritema + v.induracion + v.escamas) * v.area * region.weight;
  }, 0).toFixed(1);
}

/* ------------------------------------------------------------------ *
 * Browser helpers
 * ------------------------------------------------------------------ */

async function openSections(page) {
  await page.evaluate(() => document.querySelectorAll("details.section").forEach((d) => { d.open = true; }));
}

async function newLoadedPage(browser) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.goto(INDEX_URL);
  await openSections(page);
  page.__pageErrors = pageErrors;
  return page;
}

async function newPatient(page) {
  // Explicit patient boundary re-uses the real reset path from PSO-02 and must
  // return every instrument to pending, not to a false zero.
  await page.click("#newBtn");
  await page.waitForTimeout(50);
  await openSections(page);
}

async function gather(page) {
  return page.evaluate(() => window.gather());
}

function scoreView(page) {
  return page.evaluate(() => ({
    pasi: document.getElementById("pasiTotalView").textContent,
    dlqi: document.getElementById("dlqiTotal").textContent,
    pure: document.getElementById("pureTotal").textContent,
    pureAlert: document.getElementById("pureAlert").textContent
  }));
}

async function setPasi(page, fixture) {
  for (const region of PASI_REGIONS) {
    for (const metric of PASI_METRICS) {
      await page.selectOption(`select[data-pasi="pasi_${region.key}_${metric}"]`, String(fixture[region.key][metric]));
    }
  }
}

async function clearPasiComponent(page, regionKey, metric) {
  await page.selectOption(`select[data-pasi="pasi_${regionKey}_${metric}"]`, "");
}

async function answerDlqi(page, id, value) {
  await page.click(`[data-dlqi-group="${id}"] button[data-value="${value}"]`);
}

async function answerDlqiQ7(page, main, followup) {
  await page.click(`[data-dlqi-main="dlqi_q7"] button[data-value="${main}"]`);
  if (followup !== undefined) {
    await page.click(`[data-dlqi-followup="dlqi_q7"] button[data-value="${followup}"]`);
  }
}

async function answerPure(page, id, value) {
  await page.click(`.toggle.one[data-name="${id}"] button[data-v="${value}"]`);
}

async function referralToggleActive(page) {
  return page.evaluate(() => {
    const button = document.querySelector('[data-name="derivacion_derma_reuma"] button[data-v="1"]');
    return !!button && button.classList.contains("active");
  });
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

async function casePasi(browser) {
  const results = [];
  const page = await newLoadedPage(browser);

  // 1. untouched calculator -> empty/pending, not 0.
  let row = await gather(page);
  let view = await scoreView(page);
  check(results, "PASI untouched export is empty", row.pasi === "", JSON.stringify(row.pasi));
  check(results, "PASI untouched component field is empty", row.pasi_cabeza_eritema === "", JSON.stringify(row.pasi_cabeza_eritema));
  check(results, "PASI untouched view is pending", view.pasi === "Pendiente", view.pasi);

  // 2. completed all-zero components -> numeric 0.
  await setPasi(page, PASI_ZERO_FIXTURE);
  row = await gather(page);
  view = await scoreView(page);
  check(results, "PASI all-zero export is numeric 0", row.pasi === "0.0", JSON.stringify(row.pasi));
  check(results, "PASI all-zero view is numeric 0", view.pasi === "0.0", view.pasi);
  check(results, "PASI all-zero component is explicit 0", row.pasi_cabeza_eritema === "0", JSON.stringify(row.pasi_cabeza_eritema));

  // 3. completed non-zero example -> expected calculated value.
  await setPasi(page, PASI_NON_ZERO_FIXTURE);
  row = await gather(page);
  view = await scoreView(page);
  const expected = expectedPasi(PASI_NON_ZERO_FIXTURE);
  check(results, `PASI non-zero export is ${expected}`, row.pasi === expected, JSON.stringify(row.pasi));
  check(results, "PASI non-zero view matches export", view.pasi === row.pasi, JSON.stringify([view.pasi, row.pasi]));

  // 4. partial input -> incomplete/empty (no partial-calculation authority).
  await clearPasiComponent(page, "tronco", "area");
  row = await gather(page);
  view = await scoreView(page);
  check(results, "PASI partial export is empty", row.pasi === "", JSON.stringify(row.pasi));
  check(results, "PASI partial component field is empty", row.pasi_tronco_area === "", JSON.stringify(row.pasi_tronco_area));
  check(results, "PASI partial view says incomplete", view.pasi.includes("Incompleto"), view.pasi);

  // 5. explicit reset returns to pending, not zero.
  await newPatient(page);
  row = await gather(page);
  view = await scoreView(page);
  check(results, "PASI reset export is empty", row.pasi === "", JSON.stringify(row.pasi));
  check(results, "PASI reset view is pending", view.pasi === "Pendiente", view.pasi);

  check(results, "no page errors in PASI case", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "PASI missingness", results };
}

async function caseDlqi(browser) {
  const results = [];
  const page = await newLoadedPage(browser);

  // 1. no answers -> empty/pending.
  let row = await gather(page);
  let view = await scoreView(page);
  check(results, "DLQI untouched export is empty", row.dlqi_total === "", JSON.stringify(row.dlqi_total));
  check(results, "DLQI untouched view is pending", view.dlqi === "Pendiente", view.dlqi);

  // 2. partial answers -> incomplete/empty.
  await answerDlqi(page, "dlqi_q1", "1");
  await answerDlqi(page, "dlqi_q2", "2");
  await answerDlqi(page, "dlqi_q3", "1");
  row = await gather(page);
  view = await scoreView(page);
  check(results, "DLQI partial export is empty", row.dlqi_total === "", JSON.stringify(row.dlqi_total));
  check(results, "DLQI partial view says incomplete", view.dlqi.includes("Incompleto"), view.dlqi);

  // 3. all ten explicit zero answers -> valid 0.
  await newPatient(page);
  for (const id of DLQI_MAIN_ITEMS) await answerDlqi(page, id, "0");
  await answerDlqiQ7(page, "no", "0");
  row = await gather(page);
  view = await scoreView(page);
  check(results, "DLQI ten zeros export is 0", row.dlqi_total === "0", JSON.stringify(row.dlqi_total));
  check(results, "DLQI ten zeros view is 0", view.dlqi === "0", view.dlqi);
  check(results, "DLQI q7 answered through follow-up", row.dlqi_q7 === "0", JSON.stringify(row.dlqi_q7));

  // 4. known non-zero fixture -> expected total (9 x 1 + q7 "yes" 3 = 12).
  await newPatient(page);
  for (const id of DLQI_MAIN_ITEMS) await answerDlqi(page, id, "1");
  await answerDlqiQ7(page, "yes");
  row = await gather(page);
  view = await scoreView(page);
  check(results, "DLQI non-zero export is 12", row.dlqi_total === "12", JSON.stringify(row.dlqi_total));
  check(results, "DLQI non-zero view matches export", view.dlqi === row.dlqi_total, JSON.stringify([view.dlqi, row.dlqi_total]));

  check(results, "no page errors in DLQI case", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "DLQI missingness", results };
}

async function casePure4(browser) {
  const results = [];
  const page = await newLoadedPage(browser);

  // 1. no answers -> empty/pending.
  let row = await gather(page);
  let view = await scoreView(page);
  check(results, "PURE-4 untouched export is empty", row.pure4_total_positivas === "", JSON.stringify(row.pure4_total_positivas));
  check(results, "PURE-4 untouched view is pending", view.pure === "Pendiente", view.pure);

  // 2. partial answers -> incomplete/empty.
  await answerPure(page, "pure4_q1", "1");
  await answerPure(page, "pure4_q2", "0");
  row = await gather(page);
  view = await scoreView(page);
  check(results, "PURE-4 partial export is empty", row.pure4_total_positivas === "", JSON.stringify(row.pure4_total_positivas));
  check(results, "PURE-4 partial view says incomplete", view.pure.includes("Incompleto"), view.pure);

  // 3. four explicit negatives -> valid 0.
  await newPatient(page);
  for (const id of PURE4_ITEMS) await answerPure(page, id, "0");
  row = await gather(page);
  view = await scoreView(page);
  check(results, "PURE-4 four negatives export is 0", row.pure4_total_positivas === "0", JSON.stringify(row.pure4_total_positivas));
  check(results, "PURE-4 four negatives view is 0", view.pure === "0", view.pure);
  check(results, "PURE-4 four negatives raise no alert", view.pureAlert === "", view.pureAlert);

  // 4. >=2 positives -> total/status, but no automatic referral action.
  await newPatient(page);
  await answerPure(page, "pure4_q1", "1");
  await answerPure(page, "pure4_q2", "1");
  await answerPure(page, "pure4_q3", "0");
  await answerPure(page, "pure4_q4", "0");
  row = await gather(page);
  view = await scoreView(page);
  check(results, "PURE-4 two positives export is 2", row.pure4_total_positivas === "2", JSON.stringify(row.pure4_total_positivas));
  check(results, "PURE-4 two positives view is 2", view.pure === "2", view.pure);
  check(results, "PURE-4 positive shows recommendation alert", view.pureAlert.includes("PURE-4 positivo"), view.pureAlert);
  check(results, "PURE-4 positive does not auto-record referral", row.derivacion_derma_reuma !== "1", JSON.stringify(row.derivacion_derma_reuma));
  check(results, "PURE-4 positive leaves referral toggle inactive", (await referralToggleActive(page)) === false);

  // 5. correcting positive -> negative updates state without stale referral.
  await answerPure(page, "pure4_q2", "0");
  row = await gather(page);
  view = await scoreView(page);
  check(results, "PURE-4 corrected total is 1", row.pure4_total_positivas === "1", JSON.stringify(row.pure4_total_positivas));
  check(results, "PURE-4 corrected alert is cleared", view.pureAlert === "", view.pureAlert);
  check(results, "PURE-4 correction left no scoring referral", row.derivacion_derma_reuma !== "1", JSON.stringify(row.derivacion_derma_reuma));

  // 6. a clinician's manual referral is preserved and never touched by scoring.
  await newPatient(page);
  await page.click('[data-name="derivacion_derma_reuma"] button[data-v="1"]');
  await answerPure(page, "pure4_q1", "1");
  await answerPure(page, "pure4_q2", "1");
  row = await gather(page);
  check(results, "manual referral preserved while PURE-4 positive", row.derivacion_derma_reuma === "1", JSON.stringify(row.derivacion_derma_reuma));
  await answerPure(page, "pure4_q2", "0");
  row = await gather(page);
  check(results, "manual referral preserved after PURE-4 correction", row.derivacion_derma_reuma === "1", JSON.stringify(row.derivacion_derma_reuma));

  check(results, "no page errors in PURE-4 case", page.__pageErrors.length === 0, page.__pageErrors.join(" | "));
  await page.close();
  return { name: "PURE-4 missingness and referral separation", results };
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
    cases.push(await casePasi(browser));
    cases.push(await caseDlqi(browser));
    cases.push(await casePure4(browser));
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
