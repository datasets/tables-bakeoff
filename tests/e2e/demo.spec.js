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
const BUILT = ["baseline"]; // extend as each demo lands

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

    test("shows the source of each render function", async ({ page }) => {
      await page.goto(`/demos/${key}.html`);
      const src = page.locator(`[data-card="small"] .src pre`);
      await expect(src).toContainText("host");
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
