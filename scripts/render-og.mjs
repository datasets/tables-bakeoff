/* Renders public/og/tables-bakeoff.png (1200x630) from og/card.html.
 * Run: node scripts/render-og.mjs   (needs Playwright's chromium) */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve("src/harness/site.css"), "utf8");
const html = readFileSync(resolve("scripts/og-card.html"), "utf8").replace("/*SITE_CSS*/", css);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: "public/og/tables-bakeoff.png" });
await browser.close();
