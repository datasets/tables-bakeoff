import { test, expect } from "@playwright/test";

/* The AG Grid showcase is one page outside the contender harness, so the
 * demo loop in demo.spec.js does not cover it. */
test.describe("showcase", () => {
  test("loads 50,000 rows with no console error and no Enterprise watermark", async ({ page }) => {
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/demos/showcase.html");
    await expect(page.locator(".sc-grid .ag-row").first()).toBeVisible({ timeout: 60000 });
    await expect(page.locator(".sc-status")).toContainText("Showing 50,000 of 50,000 rows");

    // The search box filters, and the status line follows it.
    await page.fill(".sc-search", "LEEDS");
    await expect(page.locator(".sc-status")).not.toContainText("Showing 50,000");

    await expect(page.locator(".ag-watermark")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
