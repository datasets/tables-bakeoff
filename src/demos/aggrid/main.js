/* The enterprise default. Row and column virtualization, sorting, filtering
 * and resizing are all in the Community (MIT) tier. */

import { createGrid, ModuleRegistry, AllCommunityModule, themeQuartz } from "ag-grid-community";
import { mountDemo } from "../../harness/mount.js";

// Mandatory since v33 — the grid throws at construction without it.
ModuleRegistry.registerModules([AllCommunityModule]);

export const meta = {
  name: "AG Grid Community",
  version: "36.1.0",
  license: "MIT (Community tier)",
  docs: "https://www.ag-grid.com/javascript-data-grid/",
  homepage: "https://www.ag-grid.com",
  github: "https://github.com/ag-grid/ag-grid",
  stars: 15584,
  npm: "ag-grid-community",
  tagline: "The enterprise default. Vanilla core, row + column virtualization.",
  notes:
    "Open-core. Pivoting, row grouping with aggregation, server-side row " +
    "model and the integrated charts are Enterprise ($999/dev) — everything " +
    "shown here is the free MIT tier. v33 replaced the old CSS-theme-file " +
    "approach with a JS Theming API (themeQuartz.withParams(...)) and made " +
    "ModuleRegistry.registerModules([AllCommunityModule]) mandatory before " +
    "createGrid or it throws at construction — most tutorials still online " +
    "predate both changes, and so does the AG Grid tutorial this shipped " +
    "from: it also had the grid scrolling '.ag-body-viewport', a class that " +
    "does not exist anywhere in v36's actual DOM (confirmed against the live " +
    "page, not docs) — the real scrolling element is '.ag-grid-viewport'. " +
    "It is also the one demo of the three where setting height: \"100%\" on " +
    "the host directly, rather than leaving its existing CSS height alone, " +
    "does NOT quietly wreck performance the way it does for Tabulator — AG " +
    "Grid just renders with a collapsed 0px viewport instead, which is " +
    "visually broken but fast, so the failure mode is at least the kind you " +
    "notice immediately rather than the kind you have to profile for. " +
    "Heaviest bundle of the three vanilla demos by a wide margin, and the " +
    "only one that never dropped a frame scrolling 500,000 rows.",
};

function build(host, data, ctx) {
  // No explicit height here: the harness's host div already carries a real
  // CSS height. Setting host.style.height = "100%" (the pattern most AG Grid
  // tutorials show) would overwrite that with a value the host's own parent
  // can't resolve, leaving AG Grid to measure a 0px viewport — see Tabulator's
  // meta.notes in this same batch for what that does to a grid at scale.
  const api = createGrid(host, {
    // themeQuartz has no theming hook of its own for our toggle (it only
    // reacts to the OS prefers-color-scheme media query), so ctx.theme.dark —
    // the boolean, not the token object itself — drives an explicit palette
    // instead. The brief this shipped from compared ctx.theme to the string
    // "dark", which is always false and would have left the grid stuck light.
    theme: themeQuartz.withParams(
      ctx.theme.dark
        ? {
            backgroundColor: ctx.theme.surface,
            foregroundColor: ctx.theme.text,
            headerBackgroundColor: ctx.theme.surface,
            borderColor: ctx.theme.grid,
            oddRowBackgroundColor: ctx.theme.page,
          }
        : {}
    ),
    rowData: data.rows,
    columnDefs: data.columns.map((c) => ({
      field: c.name,
      type: c.type === "number" ? "rightAligned" : undefined,
      sortable: true,
      filter: true,
      resizable: true,
      valueFormatter: (p) => ctx.formatCell(p.value, c),
    })),
    defaultColDef: { minWidth: 110 },
    rowHeight: 32,
    animateRows: false,
  });

  // AG Grid scrolls .ag-grid-viewport internally (verified against the live
  // DOM — v36's structure does not use the .ag-body-viewport class older
  // docs and tutorials reference); the host div itself never moves, so the
  // FPS run must be pointed here.
  host.querySelector(".ag-grid-viewport")?.setAttribute("data-scroller", "");

  return () => api.destroy();
}

export const tables = { small: build, wide: build, medium: build, large: build };

export const source = build;

mountDemo({ meta, tables, source });
