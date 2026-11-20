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
function build(host, data, ctx) {
  const grid = document.createElement("revo-grid");
  grid.theme = ctx.theme.dark ? "darkCompact" : "compact";
  grid.readonly = true;
  grid.columns = data.columns.map((c) => ({
    prop: c.name,
    name: c.name,
    size: 130,
    sortable: true,
    // A cell template may return plain text, so the shared formatter slots
    // straight in. Sorting still compares the raw value.
    cellTemplate: (h, { value }) => ctx.formatCell(value, c),
    cellProperties: () => ({ style: { "text-align": c.align } }),
  }));
  grid.source = data.rows;
  applyTheme(grid, ctx.theme);

  return new Promise((resolve) => {
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

mountDemo({ meta, tables, source });
