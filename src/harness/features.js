/* What each library can do, for the feature comparison. Read from each
 * library's own docs and types for the installed version, and from our own
 * tests where we ran one: the edit test (`edit` in results.js) for editing and
 * paste, the Playwright text-selection and keyboard-sort checks (`textSelect`,
 * `kbSort`) for copy and keyboard. Sources for the cells that are not obvious
 * are in docs/reports/features-sources.md.
 *
 * Framework and licence are not here: they are `framework` and `license` on
 * each entry in results.js.
 *
 * v is one of:
 *   yes     built in and free (on by default, or one column flag)
 *   config  free, but needs an option or a few lines of code
 *   paid    only in a paid tier (the note says which)
 *   plugin  a free official extension
 *   diy     you write it (headless TanStack, the plain table)
 *   no      not available */

export const FEATURES_CHECKED =
  "21 Nov 2026, against the docs and types for Observable Inputs 1.0.0, Tabulator 6.7.1, AG Grid 36.3.0, TanStack Table 9.3.1, Glide Data Grid 6.0.3, Perspective 5.9.4, DataTables 3.1.5 and RevoGrid 4.31.8";

/** How each value reads in the table. */
export const SUPPORT_LABELS = {
  yes: "Built in",
  config: "Needs config",
  paid: "Paid tier",
  plugin: "Free plugin",
  diy: "You write it",
  no: "No",
};

export const FEATURES = [
  { key: "sort", label: "Sort", help: "Click a column header to sort the rows." },
  { key: "filter", label: "Column filters", help: "A filter per column, such as price over 200,000." },
  { key: "search", label: "Search box", help: "One box that searches every column." },
  { key: "edit", label: "Edit cells", help: "Double-click a cell and type. Matches our edit test." },
  { key: "copy", label: "Copy a range", help: "Select several cells and copy them, by browser text selection or the grid's own copy." },
  { key: "paste", label: "Paste a range", help: "Paste several lines from a spreadsheet into the grid. Matches our edit test." },
  { key: "group", label: "Group rows", help: "Group rows by a column, with totals or other aggregates." },
  { key: "pin", label: "Pin columns", help: "Keep a column fixed on the left while the rest scroll sideways." },
  { key: "resize", label: "Resize / reorder", help: "Drag a column edge to resize it, or drag a header to move it." },
  { key: "export", label: "Export", help: "Download the rows as CSV or Excel." },
  { key: "rowVirt", label: "Virtual rows", help: "Only the rows on screen are drawn, so large data stays fast." },
  { key: "colVirt", label: "Virtual columns", help: "Only the columns on screen are drawn, for very wide data." },
  { key: "keyboard", label: "Keyboard", help: "Move between cells with the arrow keys." },
];

export const SUPPORT = {
  baseline: {
    sort: { v: "diy", note: "about ten lines" },
    filter: { v: "diy" },
    search: { v: "diy", note: "browser Ctrl-F finds every row" },
    edit: { v: "diy" },
    copy: { v: "yes", note: "browser text selection" },
    paste: { v: "diy" },
    group: { v: "diy" },
    pin: { v: "diy", note: "position: sticky" },
    resize: { v: "diy" },
    export: { v: "diy" },
    rowVirt: { v: "diy", note: "without it, stops at a few thousand rows" },
    colVirt: { v: "diy" },
    keyboard: { v: "diy" },
  },
  observable: {
    sort: { v: "yes" },
    filter: { v: "no" },
    search: { v: "config", note: "Inputs.search, same package" },
    edit: { v: "no" },
    copy: { v: "yes", note: "browser text selection" },
    paste: { v: "no" },
    group: { v: "no" },
    pin: { v: "no", note: "header is sticky" },
    resize: { v: "no", note: "fixed widths via the width option" },
    export: { v: "no" },
    rowVirt: { v: "no", note: "appends rows as you scroll, never removes" },
    colVirt: { v: "no" },
    keyboard: { v: "no" },
  },
  tabulator: {
    sort: { v: "yes" },
    filter: { v: "config", note: "headerFilter on the column" },
    search: { v: "config", note: "no box; setFilter with your function" },
    edit: { v: "yes", note: "editor on the column" },
    copy: { v: "yes", note: "browser selection; ranges with clipboard: true" },
    paste: { v: "config", note: "selectableRange, clipboard, paste options" },
    group: { v: "config", note: "groupBy, with column calcs" },
    pin: { v: "config", note: "frozen: true" },
    resize: { v: "yes", note: "reorder with movableColumns: true" },
    export: { v: "config", note: "CSV built in; xlsx needs SheetJS" },
    rowVirt: { v: "yes" },
    colVirt: { v: "config", note: "renderHorizontal: \"virtual\"" },
    keyboard: { v: "config", note: "arrow keys with selectableRange" },
  },
  aggrid: {
    sort: { v: "yes" },
    filter: { v: "config", note: "filter: true on the column" },
    search: { v: "config", note: "quickFilterText, your input" },
    edit: { v: "yes", note: "editable: true" },
    copy: { v: "config", note: "enableCellTextSelection; range copy is Enterprise" },
    paste: { v: "paid", note: "Enterprise clipboard module" },
    group: { v: "paid", note: "Enterprise row grouping and pivot" },
    pin: { v: "config", note: "pinned: \"left\"" },
    resize: { v: "yes" },
    export: { v: "config", note: "CSV free; Excel is Enterprise" },
    rowVirt: { v: "yes" },
    colVirt: { v: "yes" },
    keyboard: { v: "yes", note: "headers sort with Enter" },
  },
  tanstack: {
    sort: { v: "config", note: "logic built in; you render the headers" },
    filter: { v: "config", note: "logic built in; you write the inputs" },
    search: { v: "config", note: "global filter logic; you write the box" },
    edit: { v: "diy" },
    copy: { v: "yes", note: "browser selection, rows on screen" },
    paste: { v: "diy" },
    group: { v: "config", note: "grouping and aggregation logic; your UI" },
    pin: { v: "config", note: "pinning state; your sticky CSS" },
    resize: { v: "config", note: "sizing and ordering state; your handles" },
    export: { v: "diy" },
    rowVirt: { v: "plugin", note: "TanStack Virtual" },
    colVirt: { v: "plugin", note: "TanStack Virtual" },
    keyboard: { v: "diy" },
  },
  glide: {
    sort: { v: "diy", note: "no sort; you reorder the rows" },
    filter: { v: "diy" },
    search: { v: "config", note: "Ctrl-F overlay highlights, does not filter" },
    edit: { v: "config", note: "you write the value back in onCellEdited" },
    copy: { v: "config", note: "getCellsForSelection" },
    paste: { v: "config", note: "onPaste: true" },
    group: { v: "no", note: "column groups only" },
    pin: { v: "config", note: "freezeColumns" },
    resize: { v: "config", note: "onColumnResize / onColumnMoved; you store it" },
    export: { v: "diy" },
    rowVirt: { v: "yes", note: "canvas" },
    colVirt: { v: "yes", note: "canvas" },
    keyboard: { v: "yes" },
  },
  perspective: {
    sort: { v: "yes" },
    filter: { v: "yes", note: "in the settings panel" },
    search: { v: "no" },
    edit: { v: "yes", note: "Edit mode in the grid toolbar; ungrouped" },
    copy: { v: "yes", note: "Region Select mode, then Copy" },
    paste: { v: "no" },
    group: { v: "yes", note: "group_by and split_by, with aggregates" },
    pin: { v: "no" },
    resize: { v: "yes", note: "reorder in the settings panel" },
    export: { v: "yes", note: "CSV, JSON, Arrow; no Excel" },
    rowVirt: { v: "yes" },
    colVirt: { v: "yes" },
    keyboard: { v: "config", note: "arrow keys in Edit mode only" },
  },
  datatables: {
    sort: { v: "yes" },
    filter: { v: "config", note: "column().search() and your inputs, or ColumnControl" },
    search: { v: "yes" },
    edit: { v: "paid", note: "Editor (DataTables Plus)" },
    copy: { v: "yes", note: "browser selection; Buttons copies all rows" },
    paste: { v: "paid", note: "Editor (DataTables Plus)" },
    group: { v: "plugin", note: "RowGroup" },
    pin: { v: "plugin", note: "FixedColumns" },
    resize: { v: "plugin", note: "ColReorder moves columns; no resize" },
    export: { v: "plugin", note: "Buttons: CSV, Excel (with JSZip)" },
    rowVirt: { v: "plugin", note: "Scroller; paging is the default" },
    colVirt: { v: "no" },
    keyboard: { v: "plugin", note: "KeyTable" },
  },
  revogrid: {
    sort: { v: "config", note: "sortable: true on the column" },
    filter: { v: "config", note: "filter: true; richer filters are Pro" },
    search: { v: "no" },
    edit: { v: "yes", note: "on unless readonly" },
    copy: { v: "config", note: "one cell built in; ranges need range: true" },
    paste: { v: "yes", note: "pastes down from the focused cell" },
    group: { v: "config", note: "grouping free; aggregation is Pro" },
    pin: { v: "config", note: "pin: \"colPinStart\"" },
    resize: { v: "config", note: "resize: true, canMoveColumns: true" },
    export: { v: "config", note: "exporting: true for CSV; Excel is Pro" },
    rowVirt: { v: "yes" },
    colVirt: { v: "yes" },
    keyboard: { v: "yes", note: "Tab does not reach headers" },
  },
};
