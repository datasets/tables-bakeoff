// Screenshots the built front page at 1400 and 375 px, light and dark.
// Run: npm run build && npx vite preview --port 4173 && node scripts/screenshot-front.mjs http://localhost:4173 <outDir>
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [base = "http://localhost:4173", out = "."] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function shoot(width, scheme) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}/index.html`, { waitUntil: "load" });
  // Let the eager gallery cells render and report.
  await page.waitForFunction(
    () => [...document.querySelectorAll("#gallery [data-ms]")].filter((b) => /ms|failed/.test(b.textContent)).length >= 3,
    null, { timeout: 60000 }
  ).catch(() => console.log("gallery did not report 3 cells in time"));
  await page.waitForFunction(() => document.querySelector('[data-bundle="aggrid"]')?.textContent.includes("kB"), null, { timeout: 10000 }).catch(() => {});
  // Scroll through so lazy iframes load, then back to top.
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 700) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(150); }
  await page.waitForFunction(
    () => [...document.querySelectorAll("#gallery [data-ms]")].filter((b) => /ms|failed/.test(b.textContent)).length >= document.querySelectorAll("#gallery iframe").length,
    null, { timeout: 90000 }
  ).catch(() => console.log("not all gallery cells reported"));
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const ms = await page.evaluate(() => [...document.querySelectorAll("#gallery .cell")].map((c) => `${c.dataset.lib}=${c.querySelector("iframe") ? c.querySelector("[data-ms]").textContent : "not built"}`).join(" "));
  const tag = `${width}-${scheme}`;
  await page.screenshot({ path: `${out}/front-${tag}-fold.png` });
  await page.screenshot({ path: `${out}/front-${tag}-full.png`, fullPage: true });
  console.log(`${tag}: overflow=${overflow}px gallery: ${ms}${errors.length ? `\n  errors: ${errors.slice(0, 5).join(" | ")}` : ""}`);
  await ctx.close();
}

for (const w of [1400, 375]) for (const s of ["light", "dark"]) await shoot(w, s);
await browser.close();
