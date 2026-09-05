/* Batteries-included vanilla grid. Virtual DOM row rendering, sorting,
 * filtering, grouping and export are all in the free package. */

import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator_simple.min.css";
import { mountDemo } from "../../harness/mount.js";

export const meta = {
  name: "Tabulator",
  version: "6.5.2",
  license: "MIT",
  docs: "https://tabulator.info/docs/6.5",
  npm: "tabulator-tables",
  tagline: "Vanilla, batteries-included: grouping, tree data, editing, export.",
  notes:
    "Its stock themes (tabulator_simple.css and friends) are plain CSS with " +
    "no custom-property hooks, so dark mode here is a hand-written override " +
    "stylesheet keyed to Tabulator's own class names rather than anything the " +
    "library exposes. Construction returns before rows paint — this demo waits " +
    "on the tableBuilt event so the reported time is the real one, not the " +
    "constructor's near-instant return. The real trap was `height: \"100%\"`, " +
    "the option Tabulator's own docs use to make a table fill its container: " +
    "passing it made the 50,000-row card take over sixty seconds to build and " +
    "the 500,000-row one effectively never finish. The option overwrites the " +
    "host's own CSS height with an inline \"100%\" that the host's parent " +
    "cannot resolve, so Tabulator measures a 0px viewport, its virtual-DOM " +
    "row count estimate falls apart, and it silently walks every row instead " +
    "of just the visible ones. Deleting that one option — the host already has " +
    "a real CSS height from the harness — dropped the 500,000-row build to " +
    "under 300ms. Nothing in Tabulator surfaced this as an error either time.",
};

/** One implementation, used for all four datasets. Tabulator's constructor
 *  returns before the initial rows are in the DOM — the promise it returns
 *  here settles on `tableBuilt`, which fires after Tabulator's own initial
 *  data load and render, so the harness times the real paint rather than the
 *  microseconds it took to schedule it.
 *
 *  No `height` option is passed: the host already has a real, resolved CSS
 *  height (see meta.notes for what passing "100%" here does instead). */
function build(host, data, ctx, opts = {}) {
  ensureThemeOverride(ctx.theme);
  return new Promise((resolve) => {
    const t = new Tabulator(host, {
      data: data.rows,
      layout: "fitDataStretch",
      renderVertical: "virtual",
      rowHeight: 32,
      columns: data.columns.map((c) => ({
        title: c.name,
        field: c.name,
        hozAlign: c.align,
        headerSort: true,
        formatter: (cell) => ctx.formatCell(cell.getValue(), c),
      })),
      ...opts,
    });
    t.on("tableBuilt", () => {
      // Tabulator scrolls .tabulator-tableholder internally; the host div
      // itself never moves, so the FPS run must be pointed here.
      host.querySelector(".tabulator-tableholder")?.setAttribute("data-scroller", "");
      resolve(() => t.destroy());
    });
  });
}

/** Tabulator's shipped CSS themes are static color values with no variables
 *  to hook into, so dark mode is this hand-rolled override instead — one
 *  <style> shared by all four cards on the page, since they always share one
 *  theme. Written once, content replaced whenever a card (re)builds. */
function ensureThemeOverride(theme) {
  let style = document.getElementById("tabulator-theme-override");
  if (!style) {
    style = document.createElement("style");
    style.id = "tabulator-theme-override";
    document.head.appendChild(style);
  }
  style.textContent = !theme.dark
    ? ""
    : `
    .tabulator, .tabulator .tabulator-header, .tabulator .tabulator-row {
      background: ${theme.surface}; color: ${theme.text};
    }
    .tabulator { border-color: ${theme.grid}; }
    .tabulator .tabulator-header { border-bottom-color: ${theme.grid}; }
    /* .tabulator-col (each header cell) sets its own opaque white background
       in the stock stylesheet, at higher specificity than a plain
       .tabulator-header rule — it has to be overridden by name or every
       header reads as white-on-white in dark mode. */
    .tabulator .tabulator-header .tabulator-col {
      background: ${theme.surface}; color: ${theme.text}; border-right-color: ${theme.grid};
    }
    .tabulator .tabulator-row.tabulator-row-even {
      background: color-mix(in srgb, ${theme.text} 5%, ${theme.surface});
    }
    .tabulator .tabulator-row:hover {
      background: color-mix(in srgb, ${theme.text} 9%, ${theme.surface});
    }
    .tabulator .tabulator-cell, .tabulator .tabulator-col {
      border-color: ${theme.grid};
    }
    .tabulator .tabulator-col-resize-handle { background: ${theme.grid}; }
    .tabulator .tabulator-col.tabulator-sortable:hover { background: color-mix(in srgb, ${theme.text} 8%, ${theme.surface}); }
  `;
}

export const tables = {
  small: (host, data, ctx) => build(host, data, ctx),
  // The column-virtualization axis: 80 columns, so only the visible ones are
  // ever in the DOM.
  wide: (host, data, ctx) => build(host, data, ctx, { renderHorizontal: "virtual" }),
  medium: (host, data, ctx) => build(host, data, ctx),
  large: (host, data, ctx) => build(host, data, ctx),
};

export const source = build;

mountDemo({ meta, tables, source });
