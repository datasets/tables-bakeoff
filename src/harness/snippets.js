/* Copy-paste starters: the shortest code that renders an array of row objects
 * as a sortable table with each library, in its idiomatic form for the version
 * we installed. Each one was loaded in headless Chromium on 21 Nov 2026 (rows
 * drawn, a header click sorted them, nothing in the console). The first line
 * of each says what HTML element it expects. `install` is empty for the plain
 * table, which needs nothing. */

export const SNIPPETS = {
  baseline: {
    install: "",
    lang: "js",
    code: `// HTML: <table id="table"></table>
const rows = [
  { date: "2024-07-26", town: "LEEDS", price: 245000 },
  { date: "2024-03-02", town: "BRISTOL", price: 410000 },
  { date: "2024-11-15", town: "YORK", price: 180000 },
];
const cols = Object.keys(rows[0]);
const table = document.querySelector("#table");
const el = (tag, ...kids) => { const e = document.createElement(tag); e.append(...kids); return e; };
const byCol = (c) => (a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0);

function draw(data) {
  const headers = cols.map((c) => {
    const button = el("button", c); // a real button, so headers sort from the keyboard
    button.onclick = () => draw([...rows].sort(byCol(c)));
    return el("th", button);
  });
  const body = data.map((r) => el("tr", ...cols.map((c) => el("td", String(r[c])))));
  table.replaceChildren(el("thead", el("tr", ...headers)), el("tbody", ...body));
}
draw(rows);`,
  },
  observable: {
    install: "npm i @observablehq/inputs",
    lang: "js",
    code: `// HTML: <div id="table"></div>
import * as Inputs from "@observablehq/inputs";
import "@observablehq/inputs/dist/index.css"; // without it, cells wrap and checkboxes show

const rows = [
  { date: "2024-07-26", town: "LEEDS", price: 245000 },
  { date: "2024-03-02", town: "BRISTOL", price: 410000 },
  { date: "2024-11-15", town: "YORK", price: 180000 },
];

// Click a header to sort. select: false drops the row checkboxes.
document.querySelector("#table").append(Inputs.table(rows, { select: false }));`,
  },
  tabulator: {
    install: "npm i tabulator-tables",
    lang: "js",
    code: `// HTML: <div id="table"></div>
import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";

const rows = [
  { date: "2024-07-26", town: "LEEDS", price: 245000 },
  { date: "2024-03-02", town: "BRISTOL", price: 410000 },
  { date: "2024-11-15", town: "YORK", price: 180000 },
];

new Tabulator("#table", {
  data: rows,
  autoColumns: true, // one sortable column per key
  // Give it a fixed height. height: "100%" in a parent with no set height
  // silently renders every row: fine at 200 rows, minutes at 50,000.
  height: 400,
});`,
  },
  aggrid: {
    install: "npm i ag-grid-community",
    lang: "js",
    code: `// HTML: <div id="grid" style="height: 400px"></div>  (it needs a height)
import { createGrid, ModuleRegistry, AllCommunityModule } from "ag-grid-community";

// Since v33 the grid throws without this. The default theme is applied in JS.
ModuleRegistry.registerModules([AllCommunityModule]);

const rows = [
  { date: "2024-07-26", town: "LEEDS", price: 245000 },
  { date: "2024-03-02", town: "BRISTOL", price: 410000 },
  { date: "2024-11-15", town: "YORK", price: 180000 },
];

// Every column sorts on a header click by default.
createGrid(document.querySelector("#grid"), {
  rowData: rows,
  columnDefs: [{ field: "date" }, { field: "town" }, { field: "price" }],
});`,
  },
  tanstack: {
    install: "npm i @tanstack/react-table react react-dom",
    lang: "jsx",
    code: `// HTML: <div id="table"></div>
import { createRoot } from "react-dom/client";
import { useTable, tableFeatures, flexRender, rowSortingFeature, createSortedRowModel, sortFns } from "@tanstack/react-table";
// v9: features are opted into once, at module scope.
const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns });
const rows = [
  { date: "2024-07-26", town: "LEEDS", price: 245000 },
  { date: "2024-03-02", town: "BRISTOL", price: 410000 },
  { date: "2024-11-15", town: "YORK", price: 180000 },
];
const columns = Object.keys(rows[0]).map((key) => ({ accessorKey: key, header: key }));
function Table({ data }) {
  const table = useTable({ features, data, columns });
  // Headless: every element below is yours, including the sort button and arrow.
  return <table>
    <thead><tr>{table.getLeafHeaders().map((h) => <th key={h.id}>
      <button onClick={h.column.getToggleSortingHandler()}>
        {h.column.id}{{ asc: " ▲", desc: " ▼" }[h.column.getIsSorted()]}
      </button></th>)}</tr></thead>
    <tbody>{table.getSortedRowModel().rows.map((row) => <tr key={row.id}>
      {row.getAllCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
    </tr>)}</tbody>
  </table>;
}
createRoot(document.querySelector("#table")).render(<Table data={rows} />);`,
  },
  glide: {
    install: "npm i @glideapps/glide-data-grid react@18 react-dom@18",
    lang: "jsx",
    code: `// HTML: <div id="grid"></div>, plus <div id="portal"></div> for Glide's editors
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { DataEditor, GridCellKind } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
const rows = [
  { date: "2024-07-26", town: "LEEDS", price: 245000 },
  { date: "2024-03-02", town: "BRISTOL", price: 410000 },
  { date: "2024-11-15", town: "YORK", price: 180000 },
];
const columns = ["date", "town", "price"].map((id) => ({ id, title: id, width: 140 }));

function Grid({ data }) {
  // Glide has no sort of its own: the app orders the rows.
  const [sortBy, setSortBy] = useState(null);
  const sorted = useMemo(() => sortBy === null ? data :
    [...data].sort((a, b) => (a[sortBy] < b[sortBy] ? -1 : a[sortBy] > b[sortBy] ? 1 : 0)), [data, sortBy]);
  const getCellContent = ([col, row]) => {
    const text = String(sorted[row][columns[col].id]);
    return { kind: GridCellKind.Text, data: text, displayData: text, allowOverlay: false };
  };
  return <DataEditor columns={columns} rows={sorted.length} getCellContent={getCellContent}
    onHeaderClicked={(col) => setSortBy(columns[col].id)} width={600} height={400} />;
}
createRoot(document.querySelector("#grid")).render(<Grid data={rows} />);`,
  },
  perspective: {
    install: "npm i @perspective-dev/client @perspective-dev/server @perspective-dev/viewer @perspective-dev/viewer-datagrid",
    lang: "js",
    code: `// HTML: <perspective-viewer style="height: 400px"></perspective-viewer>
// Vite: set build.target and optimizeDeps target to "esnext" (top-level await).
import perspective from "@perspective-dev/client";
import perspective_viewer from "@perspective-dev/viewer";
import "@perspective-dev/viewer-datagrid";
import "@perspective-dev/viewer/dist/css/themes.css";
import SERVER_WASM from "@perspective-dev/server/dist/wasm/perspective-server.wasm?url";
import CLIENT_WASM from "@perspective-dev/viewer/dist/wasm/perspective-viewer.wasm?url";

const rows = [
  { date: "2024-07-26", town: "LEEDS", price: 245000 },
  { date: "2024-03-02", town: "BRISTOL", price: 410000 },
  { date: "2024-11-15", town: "YORK", price: 180000 },
];

// Two WebAssembly engines, wired up by hand: the store (in a worker) and the viewer.
await Promise.all([
  perspective.init_server(fetch(SERVER_WASM)),
  perspective_viewer.init_client(fetch(CLIENT_WASM)),
]);
const worker = await perspective.worker();
await worker.table(rows, { name: "sales" });
const viewer = document.querySelector("perspective-viewer");
await viewer.load(worker);
await viewer.restore({ table: "sales", plugin: "Datagrid" }); // click a header to sort`,
  },
  datatables: {
    install: "npm i datatables.net-dt",
    lang: "js",
    code: `// HTML: <table id="table" class="display"></table>
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css";

const rows = [
  { date: "2024-07-26", town: "LEEDS", price: 245000 },
  { date: "2024-03-02", town: "BRISTOL", price: 410000 },
  { date: "2024-11-15", town: "YORK", price: 180000 },
];

// Sort on a header click, plus a search box and paging, out of the box.
new DataTable("#table", {
  data: rows,
  columns: [
    { data: "date", title: "Date" },
    { data: "town", title: "Town" },
    { data: "price", title: "Price" },
  ],
});`,
  },
  revogrid: {
    install: "npm i @revolist/revogrid",
    lang: "js",
    code: `// HTML: <div id="table"></div>
import { defineCustomElements } from "@revolist/revogrid/loader";

defineCustomElements(); // registers <revo-grid>, once

const rows = [
  { date: "2024-07-26", town: "LEEDS", price: 245000 },
  { date: "2024-03-02", town: "BRISTOL", price: 410000 },
  { date: "2024-11-15", town: "YORK", price: 180000 },
];

const grid = document.createElement("revo-grid");
grid.style.height = "400px";
grid.columns = ["date", "town", "price"].map((prop) => ({ prop, name: prop, sortable: true }));
grid.source = rows;
document.querySelector("#table").append(grid);`,
  },
};
