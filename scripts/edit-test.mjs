// The edit test, scripted: on each demo's "Edit test" card, double-click the
// first price, type 123456, press Enter; then click that cell and paste three
// lines from the clipboard. Prints the card's readout of the first three
// prices in the data after each step, so a value that only changed on screen
// does not count.
//
// Run: npx vite --port 5191 & node scripts/edit-test.mjs http://localhost:5191 tabulator,aggrid,revogrid,glide [shotsDir]
import { chromium } from "@playwright/test";
const [base, keys, shots] = process.argv.slice(2);
const b = await chromium.launch();
const CELL = {
  tabulator: (c) => c.locator(".tabulator-row").first().locator('.tabulator-cell[tabulator-field="price"]'),
  aggrid: (c) => c.locator('.ag-row-first [col-id="price"][role="gridcell"]'),
  revogrid: (c) => c.locator('revogr-data .rgCell[data-rgrow="0"][data-rgcol="2"]'),
};
for (const key of keys.split(",")) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(`${base}/demos/${key}.html`);
  const card = p.locator('[data-card="edit"]');
  await card.locator(".edit-readout b").filter({ hasNotText: "…" }).waitFor({ timeout: 60000 });
  await card.scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  const readout = () => card.locator(".edit-readout b").textContent();
  let click, dbl;
  if (key === "glide") {
    const box = await card.locator("canvas").first().boundingBox();
    const at = { x: box.x + 360, y: box.y + 34 + 16 };
    click = () => p.mouse.click(at.x, at.y);
    dbl = () => p.mouse.dblclick(at.x, at.y);
  } else {
    const cell = CELL[key](card);
    click = () => cell.click();
    dbl = () => cell.dblclick();
  }
  const before = await readout();
  await dbl();
  await p.waitForTimeout(1500);
  const overlay = await p.evaluate(() => document.activeElement?.outerHTML?.slice(0, 160));
  for (let i = 0; i < 10; i++) await p.keyboard.press("Backspace");
  await p.keyboard.type("123456", { delay: 30 });
  const typed = await p.evaluate(() => document.activeElement?.value);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(800);
  const afterEdit = await readout();
  if (shots) await card.locator(".demo-host").screenshot({ path: `${shots}/edit-${key}-1.png` });
  await click();
  await p.waitForTimeout(300);
  await p.evaluate(() => navigator.clipboard.writeText("111111\n222222\n333333"));
  await p.keyboard.press("ControlOrMeta+V");
  await p.waitForTimeout(1000);
  const afterPaste = await readout();
  if (shots) await card.locator(".demo-host").screenshot({ path: `${shots}/edit-${key}-2.png` });
  console.log(JSON.stringify({ key, overlay, typed, before, afterEdit, afterPaste, errs: errs.slice(0, 3) }));
  await ctx.close();
}
await b.close();
