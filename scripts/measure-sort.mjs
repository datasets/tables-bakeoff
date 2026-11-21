// Times the large card's "Sort by price" button for each demo: loads 500,000
// rows, clicks Sort N times (the harness resets to file order, untimed, before
// each run) and prints the harness's own median, the render time and the
// machine's load average, so a busy-machine run is visible as one.
//
// Run: npm run build && npx vite preview --port 4173 &
//      node scripts/measure-sort.mjs http://localhost:4173 aggrid,tabulator 5 [shotsDir]
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
const [base, keys, n = "5", shots] = process.argv.slice(2);
const b = await chromium.launch();
for (const key of keys.split(",")) {
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(`${base}/demos/${key}.html`);
  const card = p.locator('[data-card="large"]');
  await p.locator('[data-card="medium"] .metric b').filter({ hasNotText: "—" }).waitFor({ timeout: 120000 });
  await card.locator(".load-btn").click();
  await card.locator(".metric b").filter({ hasNotText: /—|loading/ }).waitFor({ timeout: 600000 });
  const render = await card.locator(".metric b").textContent();
  const runs = [];
  for (let i = 0; i < +n; i++) {
    await card.locator(".sort-btn").click({ timeout: 300000 });
    await p.waitForFunction((i) => document.querySelector('[data-card="large"] .sort-out')?.dataset.runs == String(i + 1) || /failed/.test(document.querySelector('[data-card="large"] .sort-out')?.textContent), i, { timeout: 600000 });
    runs.push(await card.locator(".sort-out").textContent());
    await p.waitForTimeout(300);
  }
  const median = await card.locator(".sort-out").getAttribute("data-median");
  if (shots) await card.locator(".demo-host").screenshot({ path: `${shots}/sort-${key}.png` });
  const load = execSync("uptime").toString().trim().replace(/.*load averages?: /, "");
  console.log(JSON.stringify({ key, render, median: median && Math.round(+median * 10) / 10, last: runs.at(-1), load, errs: errs.slice(0, 3) }));
  await p.close();
}
await b.close();
