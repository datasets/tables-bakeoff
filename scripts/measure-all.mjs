// One consistent re-measure of every figure on the front page.
//
// For each of the nine demos, RUNS fresh page loads (headless Chromium,
// 1400x1000, production build served by `vite preview`). Each load records:
//   - render ms for small, wide, medium (rendered by the page on load) and large
//     (the Load button; the plain <table> shows 100,000 of the 500,000 rows)
//   - Perspective's engine boot ("setup"), which the harness times separately
//   - scroll FPS on the large card (after the sort) (the plain <table>: the medium card, 50,000
//     rows, because it cannot show 500,000) and on the wide card
//   - sort by price on the large card, one sort on the freshly loaded table
//     (the harness puts the rows back in file order, untimed, then times the
//     library's own sort API until sorted rows are on screen; same code path
//     as scripts/measure-sort.mjs)
// and reports median and min-max over the runs.
//
// Quiet-machine rule: before each library's batch the 1-minute load average
// must be at or below LOAD_LIMIT; otherwise wait, polling every 30 s for up to
// 20 minutes. If it never settles the batch still runs but is flagged
// `busy: true` in the output, so it cannot pass as a quiet number.
//
// Usage:
//   node scripts/measure-all.mjs                 # build, preview on :4180, all nine, 5 runs
//   node scripts/measure-all.mjs --only aggrid,tabulator   # re-run some; merges into the JSON
//   node scripts/measure-all.mjs --runs 3 --no-build --port 4180
//
// Output: docs/reports/measurements-<date>.json (raw) and .md (summary).
import { chromium } from "@playwright/test";
import { spawn, execSync } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? dflt : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

const PORT = +opt("port", 4180);
const RUNS = +opt("runs", 5);
const DATE = opt("date", new Date().toISOString().slice(0, 10));
const LOAD_LIMIT = +opt("load-limit", 4);
const WAIT_MS = 30_000;
const WAIT_MAX_MS = 20 * 60_000;
const ALL = ["baseline", "observable", "tabulator", "aggrid", "tanstack", "glide", "perspective", "datatables", "revogrid"];
const KEYS = opt("only", ALL.join(",")).split(",");
const base = `http://localhost:${PORT}`;
const outJson = path.join(root, `docs/reports/measurements-${DATE}.json`);
const outMd = path.join(root, `docs/reports/measurements-${DATE}.md`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const load1 = () => os.loadavg()[0];
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const num = (t) => (/<1/.test(t) ? 0.5 : parseFloat(String(t).replace(/,/g, "")));
const stat = (xs) => (xs.length ? { median: median(xs), min: Math.min(...xs), max: Math.max(...xs), runs: xs } : null);

// ---- build + preview -------------------------------------------------------
if (!flag("no-build")) {
  console.log("npm run build ...");
  execSync("npm run build", { cwd: root, stdio: "inherit" });
}
const preview = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
const stop = () => { try { preview.kill(); } catch {} };
process.on("exit", stop);
process.on("SIGINT", () => { stop(); process.exit(130); });
for (let i = 0; ; i++) {
  try { if ((await fetch(`${base}/index.html`)).ok) break; } catch {}
  if (i > 60 || preview.exitCode !== null) throw new Error(`vite preview did not start on ${port()}`);
  await sleep(500);
}
function port() { return PORT; }

// ---- one fresh load --------------------------------------------------------
async function oneRun(browser, key) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = { render: {}, fps: {}, dropped: {} };
  try {
    await p.goto(`${base}/demos/${key}.html`);
    const metric = (k) => p.locator(`[data-card="${k}"] .metric b`);
    const done = /^[^—…]+$/;
    for (const k of ["small", "wide", "medium"]) {
      await metric(k).filter({ hasText: done }).waitFor({ timeout: 300_000 });
    }
    for (const k of ["small", "wide", "medium"]) r.render[k] = num(await metric(k).textContent());
    if (key === "perspective") {
      const t = await p.locator(".setup-line b").textContent();
      r.setup = num(t);
    }
    const fps = async (k) => {
      const card = p.locator(`[data-card="${k}"]`);
      await card.locator(".fps-btn").click();
      const out = card.locator(".fps-out");
      await out.filter({ hasText: /\d+ fps/ }).waitFor({ timeout: 120_000 });
      const t = await out.textContent();
      r.fps[k] = +t.match(/(\d+) fps/)[1];
      r.dropped[k] = +t.match(/(\d+) dropped/)[1];
    };
    await fps("wide");
    if (key === "baseline") await fps("medium");

    const card = p.locator('[data-card="large"]');
    await card.locator(".load-btn").click();
    await metric("large").filter({ hasText: /^[^—…]+$/ }).filter({ hasNotText: /loading|failed/ }).waitFor({ timeout: 900_000 });
    const t = await metric("large").textContent();
    r.render.large = num(t);
    r.largeRows = (await card.locator(".metric-detail").textContent()).split("·")[0].trim();

    // Sort: one timed sort on the fresh table. Before the FPS run, not after:
    // RevoGrid's sort hook watches row 0, and a scroll run leaves its grid
    // away from the top, so the hook reports "sorted rows never appeared".
    const out = card.locator(".sort-out");
    await card.locator(".sort-btn").click({ timeout: 300_000 });
    await p.waitForFunction(
      () => { const o = document.querySelector('[data-card="large"] .sort-out'); return o?.dataset.runs === "1" || /failed/.test(o?.textContent || ""); },
      null, { timeout: 900_000 },
    );
    if (/failed/.test(await out.textContent())) throw new Error(await out.textContent());
    r.sort = Math.round(+(await out.getAttribute("data-median")) * 10) / 10;
    await fps("large");
  } catch (e) {
    r.error = String(e).slice(0, 300);
  }
  r.errs = errs.slice(0, 3);
  await ctx.close();
  return r;
}

// ---- main ------------------------------------------------------------------
const browser = await chromium.launch();
const result = fs.existsSync(outJson) && opt("only") ? JSON.parse(fs.readFileSync(outJson, "utf8")) : {};
result.meta = {
  date: DATE,
  script: "scripts/measure-all.mjs",
  runsPerFigure: RUNS,
  loadLimit: LOAD_LIMIT,
  viewport: "1400x1000",
  browser: `Chromium ${browser.version()} (headless, Playwright ${JSON.parse(fs.readFileSync(path.join(root, "node_modules/@playwright/test/package.json"), "utf8")).version})`,
  build: "npm run build, served by vite preview",
  machine: `${os.cpus()[0].model}, ${Math.round(os.totalmem() / 2 ** 30)} GB, macOS ${safe("sw_vers -productVersion")} (${os.release()})`,
  node: process.version,
  startedAt: result.meta?.startedAt || new Date().toISOString(),
};
result.libs ||= {};

function safe(cmd) { try { return execSync(cmd).toString().trim(); } catch { return "?"; } }

for (const key of KEYS) {
  // Quiet-machine gate.
  const loadBefore = load1();
  let waited = 0, busy = false;
  while (load1() > LOAD_LIMIT) {
    if (waited >= WAIT_MAX_MS) { busy = true; break; }
    console.log(`[${key}] load ${load1().toFixed(2)} > ${LOAD_LIMIT}; waiting (${Math.round(waited / 60000)} min so far)`);
    await sleep(WAIT_MS);
    waited += WAIT_MS;
  }
  const loadStart = load1();
  const loads = [];
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await oneRun(browser, key);
    loads.push(load1());
    runs.push(r);
    console.log(`[${key}] run ${i + 1}/${RUNS} load ${load1().toFixed(2)} ${JSON.stringify(r)}`);
  }
  const ok = runs.filter((r) => !r.error);
  // A run that errored late (it keeps `error` in the raw JSON) still counts
  // for the figures it measured first.
  const pick = (f) => runs.map(f).filter((v) => typeof v === "number" && !Number.isNaN(v));
  result.libs[key] = {
    load: { firstSeen: +loadBefore.toFixed(2), atStart: +loadStart.toFixed(2), waitedMin: +(waited / 60000).toFixed(1), perRun: loads.map((l) => +l.toFixed(2)), max: +Math.max(loadStart, ...loads).toFixed(2), busy },
    failed: runs.length - ok.length,
    largeRows: ok[0]?.largeRows,
    render: Object.fromEntries(["small", "wide", "medium", "large"].map((k) => [k, stat(pick((r) => r.render[k]))])),
    setup: stat(pick((r) => r.setup)),
    sort: stat(pick((r) => r.sort)),
    fps: Object.fromEntries(["wide", "medium", "large"].map((k) => [k, stat(pick((r) => r.fps[k]))]).filter(([, v]) => v)),
    dropped: Object.fromEntries(["wide", "medium", "large"].map((k) => [k, stat(pick((r) => r.dropped[k]))]).filter(([, v]) => v)),
    raw: runs,
  };
  result.meta.finishedAt = new Date().toISOString();
  fs.writeFileSync(outJson, JSON.stringify(result, null, 2) + "\n");
}
await browser.close();
stop();

// ---- readable summary ------------------------------------------------------
const f = (x, unit = "ms") => {
  if (!x) return "n/a";
  const v = (n) => (n >= 1000 ? `${(n / 1000).toFixed(2)} s` : n < 50 && unit === "ms" ? `${n.toFixed(1)} ms` : `${Math.round(n)} ${unit === "ms" ? "ms" : unit}`);
  return unit === "fps" ? `${x.median} (${x.min}-${x.max})` : `${v(x.median)} (${v(x.min)} to ${v(x.max)})`;
};
const L = [];
L.push(`# Measurements, ${DATE}`, "");
L.push(`Produced by \`node scripts/measure-all.mjs\`. Raw runs: \`measurements-${DATE}.json\`.`, "");
L.push(`- Machine: ${result.meta.machine}`);
L.push(`- Browser: ${result.meta.browser}, viewport ${result.meta.viewport}`);
L.push(`- Build: ${result.meta.build}; ${RUNS} fresh page loads per figure, median (min to max)`);
L.push(`- Run: ${result.meta.startedAt} to ${result.meta.finishedAt}`);
L.push(`- Quiet-machine rule: wait while the 1-minute load average is above ${LOAD_LIMIT} (poll 30 s, up to 20 min)`, "");
L.push("## Render time", "", "| Library | Small 1k | Wide 80 cols | Medium 50k | Large 500k | Engine boot |", "|---|---|---|---|---|---|");
for (const k of ALL) {
  const d = result.libs[k]; if (!d) continue;
  L.push(`| ${k} | ${f(d.render.small)} | ${f(d.render.wide)} | ${f(d.render.medium)} | ${f(d.render.large)}${d.largeRows && !/^500,000 rows$/.test(d.largeRows) ? ` (${d.largeRows})` : ""} | ${d.setup ? f(d.setup) : ""} |`);
}
L.push("", "## Scroll FPS and sort", "", "FPS is on the large card (500,000 rows); the plain table's is on the 50,000-row card. Dropped frames in brackets.", "",
  "| Library | FPS large (or 50k) | Dropped | FPS wide (80 cols) | Sort by price at 500k |", "|---|---|---|---|---|");
for (const k of ALL) {
  const d = result.libs[k]; if (!d) continue;
  const main = k === "baseline" ? d.fps.medium : d.fps.large;
  const dr = k === "baseline" ? d.dropped.medium : d.dropped.large;
  L.push(`| ${k} | ${f(main, "fps")} | ${dr ? `${dr.median} (${dr.min}-${dr.max})` : ""} | ${f(d.fps.wide, "fps")} | ${f(d.sort)} |`);
}
L.push("", "## Load average (1 minute) seen", "", "| Library | At batch start | Per run, after | Max | Waited | Flagged busy |", "|---|---|---|---|---|---|");
for (const k of ALL) {
  const d = result.libs[k]; if (!d) continue;
  L.push(`| ${k} | ${d.load.atStart} | ${d.load.perRun.join(", ")} | ${d.load.max} | ${d.load.waitedMin} min | ${d.load.busy ? "YES" : "no"} |`);
}
const failed = ALL.filter((k) => result.libs[k]?.failed);
if (failed.length) L.push("", `Runs that errored (excluded from the medians): ${failed.map((k) => `${k} ${result.libs[k].failed}`).join(", ")}. See the raw JSON.`);
L.push("", "## Notes", "",
  "- Render times are the harness's own clock (sync part, awaited promise, forced layout), read from each card's badge.",
  "- Large render for the plain table is its capped 100,000 rows; it cannot finish 500,000.",
  "- Sort is one timed sort on a freshly loaded table (untimed reset to file order first), per page load. The earlier figures were the median of 5 sorts inside one page load.",
  "- Perspective's engine boot is reported separately and is not in its render times.",
  "- The Tabulator `height: \"100%\"` trap is not part of this script (it takes minutes per run).");
fs.writeFileSync(outMd, L.join("\n") + "\n");
console.log(`wrote ${path.relative(root, outJson)} and ${path.relative(root, outMd)}`);
