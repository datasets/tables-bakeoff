/* A framework-agnostic web component (built with Stencil). Row and column
 * virtualization, sorting, range selection and clipboard are in the free
 * MIT core; filters beyond the basics, pivot and more are Pro. */

import { defineCustomElements } from "@revolist/revogrid/loader";
import { mountDemo } from "../../harness/mount.js";
import { parseFrontmatter } from "../../harness/frontmatter.js";
import readme from "./README.md?raw";

// The documented entry point: registers <revo-grid> and its children once.
defineCustomElements();

const { meta: frontmatter, body: notes } = parseFrontmatter(readme);
export const meta = { ...frontmatter, notes };

/** One implementation, used for all four datasets. Columns and rows are
 *  plain properties on the element, and the grid renders asynchronously once
 *  it is in the DOM. Its `aftergridrender` event looks like the finish line
 *  but fires before a single cell exists (checked on this page: zero cells at
 *  that moment), so the promise settles on the first data cell instead. */
function build(host, data, ctx, editable = false) {
  const grid = document.createElement("revo-grid");
  grid.theme = ctx.theme.dark ? "darkCompact" : "compact";
  grid.readonly = !editable;
  grid.columns = data.columns.map((c) => ({
    prop: c.name,
    name: c.label,
    size: 130,
    sortable: true,
    // A cell template may return plain text, so the shared formatter slots
    // straight in. Sorting still compares the raw value.
    cellTemplate: (h, { value }) => ctx.formatCell(value, c),
    cellProperties: () => ({ style: { "text-align": c.align } }),
    // #region edit test (not counted in lines written)
    // In the edit test only Price is editable.
    readonly: editable && c.name !== "price",
    // #endregion
  }));
  grid.source = data.rows;
  applyTheme(grid, ctx.theme);

  return new Promise((resolve) => {
    // #region sort hook for the harness (not counted in lines written)
    // Sorting is the grid's own method. Its promise settles before the new
    // rows are drawn, so wait for the first price cell to change as well.
    // Clearing waits the same way, so the next timed sort starts from rows
    // that are really back in file order on screen.
    let sorted = false;
    const redrawn = async (change) => {
      const before = firstCellText(grid, data, "price");
      await change();
      await untilFrame(() => firstCellText(grid, data, "price") !== before);
    };
    ctx.provideSort(async (field) => {
      if (!field) {
        if (sorted) await redrawn(() => grid.clearSorting());
        sorted = false;
        return;
      }
      await redrawn(() => grid.updateColumnSorting({ prop: field }, "asc", false));
      sorted = true;
    });
    // #endregion
    const done = () => {
      // RevoGrid draws its own vertical scrollbar element and keeps the
      // body in step with it. Setting scrollTop on the body div directly
      // was sometimes ignored on first touch; the scrollbar never was.
      grid.querySelector("revogr-scroll-virtual.vertical")?.setAttribute("data-scroller", "");
      resolve(() => grid.remove());
    };
    const painted = new MutationObserver(() => {
      if (!grid.querySelector("revogr-data .rgCell")) return;
      painted.disconnect();
      done();
    });
    painted.observe(grid, { childList: true, subtree: true });
    host.append(grid);
  });
}

// #region sort hook for the harness (not counted in lines written)
/** Text of the first visible row's cell in column `name`. */
function firstCellText(grid, data, name) {
  const i = data.columns.findIndex((c) => c.name === name);
  return grid.querySelector(`revogr-data .rgCell[data-rgrow="0"][data-rgcol="${i}"]`)?.textContent ?? null;
}

/** Resolve on the first animation frame where check() is true. Rejects after
 *  ~5 s rather than resolving, so a sort that never shows cannot pass as one
 *  that did. */
function untilFrame(check) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      if (check()) return resolve();
      if (++n > 300) return reject(new Error("sorted rows never appeared"));
      requestAnimationFrame(tick);
    };
    tick();
  });
}
// #endregion

/** The built-in compact and darkCompact themes read CSS custom properties,
 *  so the site's tokens go straight onto the element. */
function applyTheme(grid, theme) {
  const vars = {
    "--revo-grid-background": theme.surface,
    "--revo-grid-text": theme.text,
    "--revo-grid-header-bg": theme.surface,
    "--revo-grid-header-color": theme.text,
    "--revo-grid-header-border": theme.baseline,
    "--revo-grid-cell-border": theme.grid,
    "--revo-grid-border": theme.grid,
  };
  for (const [k, v] of Object.entries(vars)) grid.style.setProperty(k, v);
  grid.style.height = "100%";
  grid.style.fontFamily = theme.fontSans;
}

export const tables = { small: build, wide: build, medium: build, large: build };

export const source = build;

// #region edit test (not counted in lines written)
/** The edit test: the grid with readonly off, Price the only editable column.
 *  That is all it takes: double-click edits, and Ctrl/Cmd-V pastes a column
 *  of values down from the focused cell. (`range: true` is only needed to
 *  drag-select a range.) */
export const edit = (host, data, ctx) => build(host, data, ctx, true);
// #endregion

mountDemo({ meta, tables, source, edit });
