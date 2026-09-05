import { test, expect } from "@playwright/test";

/* Every demo key the site will eventually ship. BUILT is the subset that has a
 * page today — the loop only runs over BUILT so a half-finished bake-off still
 * has a green suite. Move a key across as its task lands. */
export const ALL_DEMO_KEYS = [
  "baseline",
  "observable",
  "tabulator",
  "aggrid",
  "tanstack",
  "glide",
  "perspective",
];
const BUILT = ["baseline", "observable", "tabulator", "aggrid", "tanstack"]; // extend as each demo lands

/* A token that appears only in the demo's real render implementation, never in
 * the one-line delegating stub that tables[key] usually is. Asserting on it is
 * what stops the source panel silently regressing to showing the stub. Add an
 * entry when you move a key into BUILT. */
const SOURCE_TOKEN = {
  baseline: "rowLimit", // the parameter renderTable caps the large dataset with
  observable: "data-scroller", // marks Inputs.table's inner scrolling element
  tabulator: "tableBuilt", // the event build() awaits before resolving
  aggrid: "ag-grid-viewport", // the real internal scroll class build() marks data-scroller on
  tanstack: "tr[data-row]", // the paint predicate mount() holds the clock open for
};

for (const key of BUILT) {
  test.describe(key, () => {
    test("renders the eager datasets with no console error", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(`/demos/${key}.html`);

      // Three eager cards must show a render time; the fourth is on demand.
      for (const ds of ["small", "wide", "medium"]) {
        const badge = page.locator(`[data-card="${ds}"] .metric b`);
        await expect(badge).not.toHaveText("—", { timeout: 30000 });
      }
      expect(errors).toEqual([]);
    });

    test("shows the real render implementation, not a delegating stub", async ({ page }) => {
      await page.goto(`/demos/${key}.html`);
      const src = page.locator(`[data-card="small"] .src pre`);
      await expect(src).toContainText("host");
      // The panel exists to show how the table is built. A one-line stub like
      // `(host, data, ctx) => renderTable(host, data, ctx)` satisfies "contains
      // host" while revealing nothing, so require a token from the body of the
      // implementation and enough lines to be one.
      await expect(src).toContainText(SOURCE_TOKEN[key]);
      const lineCount = await src.evaluate((el) => el.textContent.trim().split("\n").length);
      expect(lineCount).toBeGreaterThan(5);
    });

    test("reports the row count it actually rendered", async ({ page }) => {
      await page.goto(`/demos/${key}.html`);
      const detail = page.locator(`[data-card="medium"] .metric-detail`);
      await expect(detail).toContainText("rows", { timeout: 30000 });
      // 50,000 rows presented in full reads as a plain count; a capped card
      // must read "N of M rows" instead of claiming the dataset's full size.
      expect(await detail.textContent()).toMatch(/^50,000 rows ·/);
    });

    test("a dataset that fails to load stays in its own card and can be retried", async ({ page }) => {
      // Fail only the first request for the large parquet, then serve it
      // normally, so this covers both halves: the failure is contained, and
      // Retry genuinely recovers rather than replaying a cached rejection.
      let failedOnce = false;
      await page.route("**/data/large.parquet", (route) => {
        if (failedOnce) return route.continue();
        failedOnce = true;
        return route.fulfill({ status: 500, body: "nope" });
      });

      await page.goto(`/demos/${key}.html`);
      const card = page.locator(`[data-card="large"]`);
      await card.getByRole("button", { name: /load/i }).click();

      await expect(card.locator(".metric b")).toHaveText("load failed", { timeout: 60000 });
      await expect(card.locator(".err")).toContainText("/data/large.parquet");
      // The other cards are untouched by their sibling's failure.
      await expect(page.locator(`[data-card="small"] .metric b`)).not.toHaveText("—");

      const retry = card.getByRole("button", { name: /retry/i });
      await expect(retry).toBeEnabled();
      await retry.click();
      await expect(card.locator(".metric b")).not.toHaveText("load failed", { timeout: 120000 });
    });

    test("loads the large dataset only when asked", async ({ page }) => {
      await page.goto(`/demos/${key}.html`);
      const card = page.locator(`[data-card="large"]`);
      await expect(card.locator(".metric b")).toHaveText("—");
      await card.getByRole("button", { name: /load/i }).click();
      await expect(card.locator(".metric b")).not.toHaveText("—", { timeout: 120000 });
    });
  });
}
