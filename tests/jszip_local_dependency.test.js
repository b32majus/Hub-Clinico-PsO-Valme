#!/usr/bin/env node
/*
 * Deterministic portability oracle for PSO-06A: JSZip must resolve entirely
 * from repository-local files for the supported HTML surfaces.
 *
 * Invariants under test (issue #11):
 *   A. every supported HTML (`index.html`, `Cuadro_Mando_Psoriasis_Valme_v2.html`)
 *      references a JSZip runtime with a repo-relative <script src>;
 *   B. no supported HTML references JSZip through an out-of-repo path,
 *      `materials_hs_valme`, `node_modules`, an absolute path or a CDN/protocol
 *      URL;
 *   C. the referenced local artifact exists, is readable, non-empty and is the
 *      expected vendored file `vendor/jszip/3.10.1/jszip.min.js`;
 *   D. the artifact is a real JSZip browser runtime: evaluating it exposes a
 *      global `JSZip` with `loadAsync`;
 *   E. browser smoke (Playwright, available in the Atenea environment): each
 *      supported page loads with `typeof JSZip !== "undefined"`.
 *
 * The static oracle always runs. The browser smoke can be skipped with
 * `JSZIP_SKIP_BROWSER=1` when no browser is available; that is reported, never
 * silently treated as a pass of the browser check.
 *
 * Run:  node tests/jszip_local_dependency.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");

const SUPPORTED_SURFACES = [
  { name: "index.html", file: path.join(REPO_ROOT, "index.html") },
  {
    name: "Cuadro_Mando_Psoriasis_Valme_v2.html",
    file: path.join(REPO_ROOT, "Cuadro_Mando_Psoriasis_Valme_v2.html"),
  },
];

const EXPECTED_ARTIFACT_REL = "vendor/jszip/3.10.1/jszip.min.js";
const EXPECTED_ARTIFACT = path.join(REPO_ROOT, EXPECTED_ARTIFACT_REL);
const EXPECTED_SHA256 =
  "acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e";

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? " :: " + detail : ""}`);
  }
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (_) {
    const root = execSync("npm root -g", { encoding: "utf8" }).trim();
    return require(path.join(root, "playwright"));
  }
}

/** Extract every <script src="..."> value from an HTML string. */
function extractScriptSrcs(html) {
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const srcs = [];
  let m;
  while ((m = re.exec(html)) !== null) srcs.push(m[1]);
  return srcs;
}

function isRepoRelative(src) {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(src)) return false; // protocol / data: / http:
  if (src.startsWith("//")) return false; // protocol-relative CDN
  if (path.isAbsolute(src)) return false;
  const resolved = path.resolve(REPO_ROOT, src);
  const rel = path.relative(REPO_ROOT, resolved);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return false;
  return true;
}

function runStaticOracle() {
  console.log("Static dependency oracle");
  const referencedArtifacts = new Set();

  for (const surface of SUPPORTED_SURFACES) {
    const html = fs.readFileSync(surface.file, "utf8");

    check(
      `${surface.name}: no materials_hs_valme/node_modules reference`,
      !/materials_hs_valme|node_modules/i.test(html),
      "found forbidden external reference"
    );

    const srcs = extractScriptSrcs(html);
    const jszipSrcs = srcs.filter((s) => /jszip/i.test(s));

    check(
      `${surface.name}: references a JSZip runtime`,
      jszipSrcs.length >= 1,
      `no <script src> matching /jszip/i found`
    );

    for (const src of jszipSrcs) {
      check(
        `${surface.name}: JSZip src is repo-relative (${src})`,
        isRepoRelative(src),
        "src escapes the repository or uses a URL/protocol"
      );
      if (!isRepoRelative(src)) continue;

      const resolved = path.resolve(REPO_ROOT, src);
      check(
        `${surface.name}: JSZip src resolves to the vendored artifact`,
        resolved === EXPECTED_ARTIFACT,
        `resolved ${resolved}, expected ${EXPECTED_ARTIFACT}`
      );
      referencedArtifacts.add(resolved);
    }
  }

  check(
    "supported HTMLs agree on a single vendored artifact",
    referencedArtifacts.size === 1 &&
      referencedArtifacts.has(EXPECTED_ARTIFACT),
    `referenced: ${[...referencedArtifacts].join(", ") || "(none)"}`
  );

  // Artifact presence / readability.
  check(
    "vendored artifact exists",
    fs.existsSync(EXPECTED_ARTIFACT),
    EXPECTED_ARTIFACT
  );
  if (fs.existsSync(EXPECTED_ARTIFACT)) {
    const stat = fs.statSync(EXPECTED_ARTIFACT);
    check("vendored artifact is a readable regular file", stat.isFile() && stat.size > 0, `${stat.size} bytes`);
    const bytes = fs.readFileSync(EXPECTED_ARTIFACT);
    const sha = crypto.createHash("sha256").update(bytes).digest("hex");
    check(
      "vendored artifact matches expected SHA-256",
      sha === EXPECTED_SHA256,
      `got ${sha}`
    );

    // Artifact is a real JSZip runtime.
    try {
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(bytes.toString("utf8"), sandbox, {
        filename: EXPECTED_ARTIFACT_REL,
      });
      check(
        "vendored artifact exposes global JSZip (UMD)",
        typeof sandbox.JSZip === "function",
        `typeof JSZip === ${typeof sandbox.JSZip}`
      );
      check(
        "vendored artifact exposes JSZip.loadAsync",
        !!(sandbox.JSZip && typeof sandbox.JSZip.loadAsync === "function"),
        "JSZip.loadAsync missing"
      );
    } catch (err) {
      check("vendored artifact evaluates without error", false, err.message);
    }
  }

  // The license/attribution shipped with the vendored dependency must be present.
  const licensePath = path.join(path.dirname(EXPECTED_ARTIFACT), "LICENSE.markdown");
  check("vendored license/attribution present", fs.existsSync(licensePath), licensePath);
}

async function runBrowserSmoke() {
  if (process.env.JSZIP_SKIP_BROWSER === "1") {
    console.log("Browser smoke: SKIPPED (JSZIP_SKIP_BROWSER=1)");
    return;
  }
  console.log("Browser smoke (Playwright headless Chromium)");
  let chromium;
  try {
    ({ chromium } = loadPlaywright());
  } catch (err) {
    check("Playwright available for browser smoke", false, err.message);
    return;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const surface of SUPPORTED_SURFACES) {
      const page = await browser.newPage();
      const url = "file://" + surface.file;
      let navError = null;
      try {
        await page.goto(url, { waitUntil: "load", timeout: 30000 });
      } catch (err) {
        navError = err;
      }
      check(`${surface.name}: page loads`, !navError, navError && navError.message);
      let type = "undefined";
      let hasLoadAsync = false;
      try {
        type = await page.evaluate(() => typeof window.JSZip);
        hasLoadAsync = await page.evaluate(
          () => typeof window.JSZip !== "undefined" && typeof window.JSZip.loadAsync === "function"
        );
      } catch (err) {
        type = "evaluate-error: " + err.message;
      }
      check(
        `${surface.name}: typeof JSZip !== "undefined"`,
        type === "function",
        `got ${type}`
      );
      check(`${surface.name}: JSZip.loadAsync is available`, hasLoadAsync);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

(async function main() {
  runStaticOracle();
  await runBrowserSmoke();

  console.log("");
  console.log(`Total: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exit(1);
});
