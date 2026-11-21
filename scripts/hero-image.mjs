/* Renders the front-page hero image: a cropped capture of the AG Grid
 * showcase (demos/showcase.html) at 2x, in light and dark, as WebP.
 *
 * Run with a dev server or preview up:
 *   node scripts/hero-image.mjs http://localhost:5173 [outDir] [--stack]
 * Writes <outDir>/hero-light.webp and hero-dark.webp (default public/hero).
 * --stack renders the other candidate, a fanned stack of three demos, to
 * hero-stack-{light,dark}.webp, for comparison.
 *
 * Chromium encodes the WebP itself (canvas.toDataURL), so this needs no image
 * library. The site's data-theme attribute drives light and dark, the same
 * way the toggle does. */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const [base = "http://localhost:5173", out = "public/hero", ...flags] = process.argv.slice(2);
const stack = flags.includes("--stack");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

// A PNG buffer to WebP at the given quality, via a throwaway page.
async function toWebp(png, quality = 0.84) {
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(async ([b64, q]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", q);
  }, [png.toString("base64"), quality]);
  await page.close();
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function newPage(theme, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem("lc-theme", t), theme);
  return page;
}

/* The showcase grid at a narrow viewport (so it shows rows rather than
 * columns), cropped to the toolbar and the first rows. */
async function showcase(theme) {
  const page = await newPage(theme, 740, 900);
  await page.goto(`${base}/demos/showcase.html`, { waitUntil: "load" });
  await page.waitForSelector(".ag-row", { timeout: 60000 });
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  await page.waitForTimeout(800);
  const card = page.locator(".card").first();
  const box = await card.boundingBox();
  // Toolbar plus about 420 css px of grid: enough rows to read as a table,
  // few enough that the type stays legible at hero size. 700 by 500 css px,
  // 1400 by 1000 in the file; index.html's width and height match.
  const png = await page.screenshot({ fullPage: true, clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 500) } });
  await page.context().close();
  return png;
}

/* Candidate B: three real demos (bare embeds) fanned in a stack. */
async function fanned(theme) {
  const page = await newPage(theme, 1000, 700);
  const frames = ["aggrid", "tabulator", "baseline"].map((k) => `${base}/demos/${k}.html?bare=1&dataset=small`);
  await page.setContent(`<!doctype html><html data-theme="${theme}"><head>
    <link rel="stylesheet" href="${base}/src/harness/site.css">
    <style>
      body { background: transparent; margin: 0; }
      .stage { position: relative; width: 1000px; height: 700px; }
      .shot { position: absolute; width: 760px; height: 480px; border: 1px solid var(--border); border-radius: 12px;
              overflow: hidden; background: var(--surface); box-shadow: 0 18px 50px rgba(0,0,0,.18); }
      .shot iframe { width: 100%; height: 100%; border: 0; }
      .s1 { left: 0; top: 160px; transform: rotate(-4deg); }
      .s2 { left: 120px; top: 90px; transform: rotate(-1deg); }
      .s3 { left: 240px; top: 20px; transform: rotate(2deg); }
    </style></head><body><div class="stage">
      ${frames.map((src, i) => `<div class="shot s${i + 1}"><iframe src="${src}"></iframe></div>`).join("")}
    </div></body></html>`, { waitUntil: "load" });
  await page.waitForTimeout(4000);
  const png = await page.locator(".stage").screenshot({ omitBackground: true });
  await page.context().close();
  return png;
}

for (const theme of ["light", "dark"]) {
  const png = stack ? await fanned(theme) : await showcase(theme);
  const webp = await toWebp(png);
  const file = `${out}/hero-${stack ? "stack-" : ""}${theme}.webp`;
  writeFileSync(file, webp);
  console.log(`${file}: ${(webp.length / 1024).toFixed(0)} kB`);
}
await browser.close();
