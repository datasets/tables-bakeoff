import { test, expect } from "@playwright/test";
import { SNIPPETS } from "../../src/harness/snippets.js";

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
  "datatables",
  "revogrid",
];
const BUILT = ["baseline", "observable", "tabulator", "aggrid", "tanstack", "glide", "perspective", "datatables", "revogrid"]; // extend as each demo lands

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
  glide: "dvn-scroller", // Glide's real internal scroll class, marked data-scroller
  perspective: "regular-table", // the scroller two shadow roots down that build() marks
  datatables: "initComplete", // the callback build() resolves on, after Scroller's redraw
  revogrid: "revogr-data .rgCell", // the first real cell build() waits for (aftergridrender fires too early)
};

/* Grids whose edit test result is in results.js. DataTables shows the card
 * with its paid-tier result and no grid. */
const EDIT_TESTED = ["tabulator", "aggrid", "glide", "revogrid", "datatables"];

/* The page shows two dataset cards, 1,000 and 500,000 rows. `?cards=all`
 * puts all four on, which the measurement scripts use. The plain table's
 * 500,000-row card is a note on the page (it cannot render them), so the
 * tests that need its Load button open the page with all cards on. */
const allCards = (key) => (key === "baseline" ? "?cards=all" : "");

test.describe("hub", () => {
  test("links to every demo page from the measured table", async ({ page }) => {
    await page.goto("/index.html");
    for (const key of ALL_DEMO_KEYS) {
      await expect(page.locator(`#measured a[href="/demos/${key}.html"]`)).toHaveCount(1);
    }
  });

  test("embeds every demo in the gallery in bare mode and gets a render time back", async ({ page }) => {
    await page.goto("/index.html");
    for (const key of ALL_DEMO_KEYS) {
      await expect(page.locator(`#gallery iframe[src^="/demos/${key}.html?bare=1"]`)).toHaveCount(1);
    }
    // The first cell is eager; its iframe reports a measured render time.
    await expect(page.locator('#gallery .cell[data-lib="baseline"] [data-ms]')).toContainText("ms", { timeout: 30000 });
  });

  test("shows measured bundle sizes rather than hardcoded ones", async ({ page }) => {
    await page.goto("/index.html");
    // Bundle figures appear in the picks, the gallery and the table; check the table's.
    const cell = page.locator('#measured [data-bundle="aggrid"]');
    await expect(cell).not.toHaveText("—", { timeout: 10000 });
    await expect(cell).toContainText("kB");
  });

  test("shows measured line counts for every demo", async ({ page }) => {
    await page.goto("/index.html");
    for (const key of ALL_DEMO_KEYS) {
      const cell = page.locator(`#measured [data-loc="${key}"]`);
      await expect(cell).not.toHaveText("—", { timeout: 10000 });
    }
  });

  // Both tables render from results.js; an empty cell means an entry is
  // missing a field, which would otherwise ship silently.
  test("has no empty cells in the measured table or the scorecard", async ({ page }) => {
    await page.goto("/index.html");
    // Let hub.js finish filling the bundle/LOC cells before asserting.
    await expect(page.locator('#measured [data-bundle="aggrid"]')).not.toHaveText("—", { timeout: 10000 });
    const empties = page.locator("table.scores td:empty");
    await expect(empties).toHaveCount(0);
  });
});

for (const key of BUILT) {
  test.describe(key, () => {
    test("renders the 1,000-row card with no console error, and shows only it and the 500,000-row card", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(`/demos/${key}.html`);

      const badge = page.locator(`[data-card="small"] .metric b`);
      await expect(badge).not.toHaveText("—", { timeout: 30000 });
      expect(errors).toEqual([]);

      // Two dataset cards on the page: the 80-column and 50,000-row datasets
      // are still built and measured, but not shown here.
      const cards = page.locator('[data-card]:not([data-card="edit"])');
      await expect(cards).toHaveCount(2);
      await expect(cards.nth(0)).toHaveAttribute("data-card", "small");
      await expect(cards.nth(1)).toHaveAttribute("data-card", "large");
    });

    test("with ?cards=all renders all four datasets, which the measurement scripts rely on", async ({ page }) => {
      await page.goto(`/demos/${key}.html?cards=all`);
      for (const ds of ["small", "wide", "medium"]) {
        await expect(page.locator(`[data-card="${ds}"] .metric b`)).not.toHaveText("—", { timeout: 30000 });
      }
      await expect(page.locator('[data-card="large"] .load-btn')).toBeVisible();
    });

    test("opens with the verdict and the numbers from results.js", async ({ page }) => {
      await page.goto(`/demos/${key}.html`);
      await expect(page.locator(".verdict__role")).not.toBeEmpty();
      await expect(page.locator(".verdict__line")).not.toBeEmpty();
      await expect(page.locator(".verdict__case--use li").first()).not.toBeEmpty();
      await expect(page.locator(".verdict__case--skip li").first()).not.toBeEmpty();
      await expect(page.locator(".stats .stat")).toHaveCount(5);
      // The page is read from the top: nothing may scroll it on load (the
      // Tabulator edit grid used to focus a cell and jump to its own card).
      await expect(page.locator(`[data-card="small"] .metric b`)).not.toHaveText("—", { timeout: 30000 });
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => scrollY)).toBe(0);
    });

    test("shows the Get started block exactly when there is a snippet for it", async ({ page }) => {
      await page.goto(`/demos/${key}.html`);
      const block = page.locator("#get-started");
      if (!SNIPPETS[key]) return expect(block).toHaveCount(0);
      await expect(block.locator("pre")).toContainText(SNIPPETS[key].code.split("\n")[0]);
      await expect(block.locator(".copy-btn")).toHaveCount(SNIPPETS[key].install ? 2 : 1);
      await expect(page.locator('.hero__links a[href="#get-started"]')).toHaveCount(1);
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
      await page.goto(`/demos/${key}.html?cards=all`);
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

      await page.goto(`/demos/${key}.html${allCards(key)}`);
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
      await page.goto(`/demos/${key}.html${allCards(key)}`);
      const card = page.locator(`[data-card="large"]`);
      await expect(card.locator(".metric b")).toHaveText("—");
      await card.getByRole("button", { name: /load/i }).click();
      await expect(card.locator(".metric b")).not.toHaveText("—", { timeout: 120000 });
    });

    // Every demo hands the harness a sort; the button stays disabled until
    // the large table exists.
    test("offers a timed sort on the large card once it has loaded", async ({ page }) => {
      await page.goto(`/demos/${key}.html${allCards(key)}`);
      const card = page.locator(`[data-card="large"]`);
      await expect(card.locator(".sort-btn")).toBeDisabled();
      await card.getByRole("button", { name: /load/i }).click();
      await expect(card.locator(".metric b")).not.toHaveText(/—|loading/, { timeout: 300000 });
      await expect(card.locator(".sort-btn")).toBeEnabled();
    });

    test("shows the edit test card exactly for the grids that were edit-tested", async ({ page }) => {
      await page.goto(`/demos/${key}.html`);
      await expect(page.locator(`[data-card="small"] .metric b`)).not.toHaveText("—", { timeout: 30000 });
      const card = page.locator(`[data-card="edit"]`);
      if (!EDIT_TESTED.includes(key)) return expect(card).toHaveCount(0);
      await expect(card.locator(".edit-result li")).toHaveCount(2);
      // A grid is mounted wherever the demo exports an edit renderer.
      if (key !== "datatables") await expect(card.locator(".edit-readout b")).not.toHaveText("…", { timeout: 30000 });
    });
  });
}

test.describe("baseline 500,000 rows", () => {
  test("shows a note instead of running a render that hangs the page", async ({ page }) => {
    await page.goto("/demos/baseline.html");
    const card = page.locator('[data-card="large"]');
    await expect(card.locator(".skip-note")).toContainText("500,000 rows");
    await expect(card.locator(".skip-note")).toContainText("2.5 s at 50,000");
    await expect(card.locator('.skip-note a[href="/demos/aggrid.html"]')).toHaveCount(1);
    await expect(card.locator(".load-btn")).toHaveCount(0);
    await expect(card.locator(".metric b")).toHaveText("not run");
    // The source panel still shows the capped implementation.
    await expect(card.locator(".src pre")).toContainText("rowLimit");
  });

  test("still renders the capped 100,000 rows in bare mode, for the gallery and the measurements", async ({ page }) => {
    await page.goto("/demos/baseline.html?bare=1&dataset=large");
    await expect(page.locator(".bare-host .cap-note")).toContainText("100,000 of 500,000", { timeout: 120000 });
  });
});

test.describe("landing v2", () => {
  test("the front page opens with a hero: what we did, two links and a real grid", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator(".hero h1")).toContainText("table library");
    await expect(page.locator('.hero__links a[href="#picks"]')).toBeVisible();
    await expect(page.locator('.hero__links a[href="/why.html"]')).toBeVisible();
    await expect(page.locator("#picks")).toBeAttached();
    // The hero image is a real file in both themes, with alt text.
    for (const theme of ["light", "dark"]) {
      const img = page.locator(`.hero__img--${theme}`);
      await expect(img).toHaveAttribute("alt", /AG Grid/);
      const res = await page.request.get(`/hero/hero-${theme}.webp`);
      expect(res.ok(), `hero-${theme}.webp`).toBe(true);
    }
    // Only one of the two is shown, and the site's own toggle switches it.
    await expect(page.locator(".hero__img--light")).toBeVisible();
    await expect(page.locator(".hero__img--dark")).toBeHidden();
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await expect(page.locator(".hero__img--dark")).toBeVisible();
    await expect(page.locator(".hero__img--light")).toBeHidden();
  });

  test("the front page names a pick and a runner-up for each job", async ({ page }) => {
    await page.goto("/index.html");
    const rows = page.locator("table.verdict tbody tr");
    await expect(rows).toHaveCount(4);
    for (const key of ["baseline", "aggrid", "tabulator", "tanstack"]) {
      await expect(page.locator(`table.verdict td.use a[href="/demos/${key}.html"]`)).toHaveCount(1);
    }
    await expect(page.locator('table.verdict td.alt a[href="/demos/revogrid.html"]')).toHaveCount(2);
    await expect(page.locator('a[href="/compare.html"]').first()).toBeVisible();
    await expect(page.locator('a[href="/why.html"]').first()).toBeVisible();
  });

  test("the front page shows a feature summary and starter code for every pick", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator("#features tbody tr").first()).toContainText("Sort");
    await expect(page.locator("#features thead th")).toHaveCount(6);
    for (const key of ["baseline", "aggrid", "tabulator", "tanstack"]) {
      await expect(page.locator(`#snippets .snippet[data-lib="${key}"] .snippet__code code`)).not.toBeEmpty();
    }
    // The plain table has nothing to install, so no install line.
    await expect(page.locator('#snippets .snippet[data-lib="baseline"] .snippet__install')).toHaveCount(0);
    await expect(page.locator('#snippets .snippet[data-lib="aggrid"] .snippet__install')).toContainText("npm i");
  });

  test("compare.html has the full tables for all nine", async ({ page }) => {
    await page.goto("/compare.html");
    await expect(page.locator("#measured tbody tr")).toHaveCount(ALL_DEMO_KEYS.length);
    await expect(page.locator("#measured thead th")).toHaveCount(12);
    await expect(page.locator("#features thead th")).toHaveCount(ALL_DEMO_KEYS.length + 1);
    await expect(page.locator("#scorecard tbody tr")).toHaveCount(ALL_DEMO_KEYS.length);
    await expect(page.locator('#measured [data-bundle="aggrid"]')).not.toHaveText("—", { timeout: 10000 });
    await expect(page.locator("table.scores td:empty")).toHaveCount(0);
  });

  test("why.html and the demo pages link to Compare and Why", async ({ page }) => {
    await page.goto("/why.html");
    await expect(page.locator("h1")).toContainText("Why we did this");
    await expect(page.locator("#datahub")).toBeAttached();
    await page.goto("/demos/aggrid.html");
    await expect(page.locator('.nav__links a[href="/compare.html"]')).toHaveCount(1);
    await expect(page.locator('.nav__links a[href="/why.html"]')).toHaveCount(1);
  });

  test("no horizontal overflow at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const url of ["/index.html", "/compare.html", "/why.html"]) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, url).toBe(0);
    }
  });
});
