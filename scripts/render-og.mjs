/* Renders public/og/tables-bakeoff.png (1200x630) from scripts/og-card.html.
 * Run: node scripts/hero-image.mjs <server> first, then node scripts/render-og.mjs */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve("src/harness/site.css"), "utf8");
// The hero image (scripts/hero-image.mjs writes it) rides along as a data URL,
// since the card is rendered from a string with no server behind it.
const hero = readFileSync(resolve("public/hero/hero-light.webp")).toString("base64");
const html = readFileSync(resolve("scripts/og-card.html"), "utf8")
  .replace("/*SITE_CSS*/", css)
  .replace("/*HERO_IMG*/", `data:image/webp;base64,${hero}`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: "public/og/tables-bakeoff.png" });
await browser.close();
