/* The enterprise default. Row and column virtualization, sorting, filtering
 * and resizing are all in the Community (MIT) tier. */

import { createGrid, ModuleRegistry, AllCommunityModule, themeQuartz } from "ag-grid-community";
import { mountDemo } from "../../harness/mount.js";
import { parseFrontmatter } from "../../harness/frontmatter.js";
import readme from "./README.md?raw";

// Mandatory since v33 — the grid throws at construction without it.
ModuleRegistry.registerModules([AllCommunityModule]);

const { meta: frontmatter, body: notes } = parseFrontmatter(readme);
export const meta = { ...frontmatter, notes };

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
