# Feature comparison: sources

Where each non-obvious cell in `src/harness/features.js` comes from. Checked 21 Nov 2026 against the installed versions (Observable Inputs 1.0.0, Tabulator 6.7.1, AG Grid 36.3.0, TanStack Table 9.3.1, Glide Data Grid 6.0.3, Perspective 5.9.4, DataTables 3.1.5, RevoGrid 4.31.8). "Types" means the library's own `.d.ts` or source in `node_modules`. Edit, paste, copy and keyboard cells also agree with our own tests (`edit`, `textSelect`, `kbSort` in `src/harness/results.js`).

## Observable Inputs

- Search is `Inputs.search`, a separate input in the same package that you wire to the table: `node_modules/@observablehq/inputs/README.md` (Search, Table), https://observablehq.com/framework/inputs/search
- No filters, editing, grouping, export or drag resize: the full `Inputs.table` option list is in the README (columns, rows, sort, format, align, header, width, height, layout, select); https://observablehq.com/framework/inputs/table
- Rows are appended on scroll and never removed: README ("lazily rendered on scroll") and our build notes in `src/demos/observable/README.md`.

## Tabulator 6.7

- Header filters, `groupBy`, column calcs, `frozen`, `movableColumns`, CSV download, `renderHorizontal: "virtual"`: https://tabulator.info/docs/6.5 (Filter, Group, Column Calculations, Frozen Columns, Movable Columns, Download, Virtual DOM)
- Resize on by default: `registerColumnOption("resizable", true)` in `src/js/modules/ResizeColumns/ResizeColumns.js`. Vertical virtual DOM is the default and horizontal is not: `renderVertical: "virtual"`, `renderHorizontal: "basic"` in `src/js/core/defaults/options.js`.
- xlsx download needs SheetJS: `dependencyRegistry.lookup("XLSX")` in `src/js/modules/Download/defaults/downloaders/xlsx.js`; https://tabulator.info/docs/6.5/download#xlsx
- No global search box: filtering is `setFilter` with a field or your own function, https://tabulator.info/docs/6.5/filter#func
- Arrow-key navigation is wired to range selection (`keyNavigate` in `src/js/modules/SelectRange/SelectRange.js`), https://tabulator.info/docs/6.5/range

## AG Grid 36.3 Community

- Enterprise-only: row grouping, aggregation/pivot, clipboard, cell (range) selection, Excel export: https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/ . Confirmed against the module list exported by `ag-grid-community` 36.3.0, which has no `RowGroupingModule`, `ClipboardModule`, `CellSelectionModule` or `ExcelExportModule`.
- In Community: `QuickFilterModule`, `CsvExportModule`, `PinnedColumnModule`, `ColumnMoveModule`, `ColumnResizeModule`, `KeyboardNavigationModule` (same module list); https://www.ag-grid.com/javascript-data-grid/filter-quick/ , https://www.ag-grid.com/javascript-data-grid/csv-export/ , https://www.ag-grid.com/javascript-data-grid/column-pinning/
- Sort and resize on by default: `sortable` and `resizable` are `@default true` in `dist/types/src/entities/colDef.d.ts`.
- Browser text selection needs `enableCellTextSelection` (`gridOptions.d.ts`); https://www.ag-grid.com/javascript-data-grid/clipboard/

## TanStack Table 9.3

- Feature list (sorting, column and global filtering, grouping, aggregation, column pinning, sizing, resizing, ordering, cell selection): the `*Feature` exports in `@tanstack/table-core/dist/features/stockFeatures.d.ts`; https://tanstack.com/table/v9/docs
- Cell selection tracks ranges but leaves clipboard text to you: `getSelectedCellRangesData` docs in `features/cell-selection/cellSelectionFeature.types.d.ts` ("Serializing this to clipboard text is left to userland").
- Virtualization is the separate TanStack Virtual library: https://tanstack.com/virtual/latest

## Glide Data Grid 6.0.3

- No built-in sort or filter: the grid takes a row count and `getCellContent`; https://docs.grid.glideapps.com/
- Search overlay off by default (`search: false` in `dist/esm/data-editor/data-editor-keybindings.js`), `showSearch`/`searchResults` in `dist/dts/internal/data-grid-search/data-grid-search.d.ts`. It highlights matches; it does not filter rows.
- `freezeColumns`, `onColumnResize`, `onColumnMoved`, `onPaste`, `getCellsForSelection`, `onCellEdited`: `dist/dts/data-editor/data-editor.d.ts`.
- No row grouping in 6.0.3: no row-grouping prop in the types; the only groups are column header groups (`onGroupHeaderClicked`).

## Perspective 5.9

- Edit mode, region selection, copy and export: `@perspective-dev/viewer-datagrid` README ("Cell editing, row and region selection, copy and export"); `edit_mode` options READ_ONLY, EDIT, SELECT_ROW, SELECT_COLUMN, SELECT_REGION in its bundle. Editing is only allowed with no `group_by` or `split_by`.
- Copy and export formats: `viewer.copy()` / `download()` take an `ExportMethod` of csv, json, ndjson, arrow, html, with `-selected` variants (`dist/ts-rs/ExportMethod.d.ts`). No Excel.
- No paste and no column pinning: neither appears in the viewer or datagrid bundles.
- Arrow keys move between cells only in edit mode (datagrid keydown handler).
- Guide: https://perspective-dev.github.io/guide/

## DataTables 3.1

- Paid: Editor, SearchPanes, StateRestore, CardView are DataTables Plus: https://datatables.net/extensions/ , https://datatables.net/license/
- Free extensions, MIT on npm and requiring `datatables.net ^3.1`: ColumnControl 2.1 (per-column search), RowGroup 2.1, FixedColumns 6.1, ColReorder 3.1, KeyTable 3.1, Buttons 4.1 (copy, CSV, Excel with JSZip), Scroller 3.1: https://datatables.net/extensions/columncontrol/ , https://datatables.net/extensions/rowgroup/ , https://datatables.net/extensions/fixedcolumns/ , https://datatables.net/extensions/colreorder/ , https://datatables.net/extensions/keytable/ , https://datatables.net/extensions/buttons/ , https://datatables.net/extensions/scroller/
- No column resizing in core or any official extension; the resize plugins are third party.
- No column virtualization: Scroller virtualizes rows only (our build notes, `src/demos/datatables/README.md`).

## RevoGrid 4.31

- Core vs Pro: https://rv-grid.com/pro/feature-table (Core: column pinning, resizing, ordering, keyboard, themes, row and column virtualization; Pro: advanced filters, grouping aggregation, drag-and-drop grouping, Excel export/import). Prices: https://rv-grid.com/pricing/
- Core props and defaults: `filter`, `grouping`, `exporting` (CSV; `plugins/export/types.d.ts` has only `fileKind: 'csv'`), `resize` (`@default false`), `canMoveColumns` (`@default false`), `range` (`@default false`, "Required for range-based clipboard fill"), `useClipboard` (`@default true`) in `dist/types/components.d.ts`; `pin` and `sortable` on columns in `dist/types/types/interfaces.d.ts`.
- No global search in core: not in the props or the feature table.
