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

function build(host, data, ctx, editable = false) {
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
      headerName: c.label,
      // Right-align the numbers, not the header. The built-in "rightAligned"
      // column type mirrors the header too, which puts the filter icon on the
      // left of the label: beside a left-aligned neighbour that read as an
      // extra, blank-headed column. The cell class is the half of it we want.
      cellClass: c.type === "number" ? "ag-right-aligned-cell" : undefined,
      sortable: true,
      filter: true,
      resizable: true,
      valueFormatter: (p) => ctx.formatCell(p.value, c),
      // #region edit test (not counted in lines written)
      ...(editable && c.name === "price" ? { editable: true, cellEditor: "agNumberCellEditor" } : {}),
      // #endregion
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

  // #region sort hook for the harness (not counted in lines written)
  // Sorting is column state. defaultState clears every other column's sort.
  ctx.provideSort((field) =>
    api.applyColumnState({
      state: field ? [{ colId: field, sort: "asc" }] : [],
      defaultState: { sort: null },
    })
  );
  // #endregion

  return () => api.destroy();
}

export const tables = { small: build, wide: build, medium: build, large: build };

export const source = build;

// #region edit test (not counted in lines written)
/** The edit test: Price editable with the Community number editor, which
 *  opens on a double-click. Pasting a column needs the clipboard and cell
 *  selection modules, which are Enterprise only; in Community, Ctrl/Cmd-V on
 *  a cell does nothing. */
export const edit = (host, data, ctx) => build(host, data, ctx, true);
// #endregion

mountDemo({ meta, tables, source, edit });
