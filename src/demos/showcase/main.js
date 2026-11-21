/* AG Grid Community, doing more: our big-grid pick with the features people
 * ask for switched on. Not a contender page: no timings, no mountDemo
 * contract, just one grid over the 50,000-row dataset.
 *
 * Everything here is in the free ag-grid-community package (MIT). The set
 * filter, column tool panel, row grouping, pivoting, range selection,
 * clipboard and Excel export are Enterprise modules and are not used. */

import { createGrid, ModuleRegistry, AllCommunityModule, themeQuartz } from "ag-grid-community";
import { navbar, footer } from "../../harness/mount.js";
import { theme, onThemeChange, installThemeToggle } from "../../harness/theme.js";
import { loadDataset, COLUMN_LABELS } from "../../data/load.js";
import ownSource from "./main.js?raw";
import "./showcase.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const GITHUB_SOURCE = "https://github.com/datasets/tables-bakeoff/blob/main/src/demos/showcase/main.js";
const BAR_FULL_AT = 1_000_000; // a price bar is full width at £1m

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const count = (n) => n.toLocaleString("en-GB");

/* ---- columns ------------------------------------------------------------ */

/** A price cell: the number, then a bar scaled to it. Plain DOM, no framework. */
function priceBar(params) {
  const cell = document.createElement("span");
  cell.className = "sc-bar";
  const width = Math.min(Number(params.value) / BAR_FULL_AT, 1) * 100;
  cell.innerHTML = `<span class="sc-bar__text"></span><span class="sc-bar__track"><span style="width:${width}%"></span></span>`;
  cell.firstChild.textContent = params.value == null ? "" : money.format(params.value);
  return cell;
}

// On a phone the pinned columns would fill the screen, so pin only on wider ones.
const PIN = matchMedia("(min-width: 640px)").matches ? "left" : null;

const col = (field, extra = {}) => ({ field, headerName: COLUMN_LABELS[field], ...extra });

const columnDefs = [
  // Pinned left, so it stays put when you scroll sideways.
  col("date", { pinned: PIN, cellDataType: "dateString", filter: "agDateColumnFilter", width: 200 }),
  {
    headerName: "Sale",
    children: [
      col("price", {
        cellDataType: "number",
        filter: "agNumberColumnFilter",
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 0 },
        cellRenderer: priceBar,
        width: 230,
      }),
      col("propertyType", { width: 140 }),
      col("oldNew"),
      col("duration"),
    ],
  },
  {
    headerName: "Address",
    children: ["paon", "saon", "street", "locality", "town", "district", "county", "postcode"].map((f) => col(f)),
  },
  {
    headerName: "Record",
    children: [col("ppdCategory"), col("recordStatus"), col("id", { width: 300 })],
  },
];

/* ---- page --------------------------------------------------------------- */

const root = document.getElementById("app");
root.innerHTML = `
  ${navbar()}
  <header class="wrap" style="padding-top:22px;padding-bottom:10px">
    <h1 style="margin:14px 0 4px;font-size:26px;letter-spacing:-0.02em">AG Grid Community, doing more</h1>
    <p class="sc-intro">AG Grid is our pick for a big grid. Speed is only part of it, so here are 50,000 UK property sales with the features people ask for turned on.</p>
    <p class="sc-intro">Everything on this page is in the free, MIT-licensed <code>ag-grid-community</code> package. No licence key, no watermark.</p>
    <p class="sc-paid">Row grouping, pivot tables, range selection, clipboard copy and paste, and Excel export need the paid Enterprise edition, so they are not here.</p>
  </header>
  <main class="wrap" style="padding-bottom:60px">
    <ul class="sc-features">
      <li><b>Search.</b> Filters all 50,000 rows, every column, as you type.</li>
      <li><b>Column filters.</b> Text, number and date, under the headers. The pick-from-a-list filter is paid.</li>
      <li><b>Column groups.</b> Sale, Address and Record.</li>
      <li><b>Pinned column.</b> Date stays put when you scroll sideways.</li>
      <li><b>Columns.</b> Drag an edge to resize, a header to reorder. Hide them from the Columns menu.</li>
      <li><b>Editing.</b> Double-click a price, type a number, press Enter.</li>
      <li><b>Selection.</b> Tick rows. The status line adds up their prices.</li>
      <li><b>CSV export.</b> The rows that pass your search and filters, sorted as shown.</li>
      <li><b>Price bars.</b> A custom cell renderer. The bar is full at £1m.</li>
    </ul>

    <section class="card">
      <div class="sc-toolbar">
        <input class="sc-search" type="search" placeholder="Search all rows…" aria-label="Search all rows">
        <details class="sc-cols">
          <summary>Columns</summary>
          <div class="sc-cols__list"></div>
        </details>
        <button class="sc-reset" type="button">Reset</button>
        <button class="sc-csv" type="button">Download CSV</button>
      </div>
      <div class="sc-grid"></div>
      <p class="sc-status" aria-live="polite">Loading 50,000 rows…</p>
      <details class="src">
        <summary>source</summary>
        <p class="sc-src-link">The whole page, below and <a href="${GITHUB_SOURCE}" target="_blank" rel="noopener">on GitHub</a>.</p>
        <pre></pre>
      </details>
    </section>
  </main>
  ${footer()}`;

installThemeToggle(root.querySelector(".toggle"));
root.querySelector(".src pre").textContent = ownSource;

const $ = (sel) => root.querySelector(sel);

/* ---- grid --------------------------------------------------------------- */

/** Quartz, fed the site's palette so the grid follows the light/dark toggle. */
function gridTheme() {
  const t = theme();
  return themeQuartz.withParams({
    accentColor: t.palette[0],
    fontFamily: t.fontSans,
    ...(t.dark && {
      backgroundColor: t.surface,
      foregroundColor: t.text,
      headerBackgroundColor: t.surface,
      borderColor: t.grid,
      oddRowBackgroundColor: t.page,
    }),
  });
}

let data = null; // set once the parquet has loaded

const api = createGrid($(".sc-grid"), {
  theme: gridTheme(),
  columnDefs,
  defaultColDef: { filter: "agTextColumnFilter", floatingFilter: true, minWidth: 90, width: 130 },
  rowSelection: { mode: "multiRow", checkboxes: true, headerCheckbox: true, selectAll: "filtered" },
  selectionColumnDef: { pinned: PIN }, // the checkbox column stays put too
  getRowId: (p) => p.data.id,
  cacheQuickFilter: true,
  rowHeight: 32,
  onModelUpdated: updateStatus,
  onSelectionChanged: updateStatus,
  onCellValueChanged: updateStatus,
  onColumnVisible: syncColumnMenu,
});

onThemeChange(() => api.setGridOption("theme", gridTheme()));

try {
  data = await loadDataset("medium");
  api.setGridOption("rowData", data.rows);
} catch (err) {
  $(".sc-status").textContent = `Could not load the data: ${err.message || err}`;
  throw err;
}

/* ---- toolbar ------------------------------------------------------------ */

$(".sc-search").addEventListener("input", (e) => api.setGridOption("quickFilterText", e.target.value));

$(".sc-csv").addEventListener("click", () =>
  // By default the export is the filtered rows, sorted as shown, visible columns only.
  api.exportDataAsCsv({ fileName: "uk-property-sales.csv", skipColumnGroupHeaders: true })
);

$(".sc-reset").addEventListener("click", () => {
  $(".sc-search").value = "";
  api.setGridOption("quickFilterText", "");
  api.setFilterModel(null);
  api.deselectAll();
  api.resetColumnState(); // widths, order, visibility, pinning and sort, back to columnDefs
});

// A home-made column chooser: the built-in tool panel is Enterprise, but
// showing and hiding columns through the API is Community.
const list = $(".sc-cols__list");
for (const c of api.getColumns()) {
  if (!c.getColDef().field) continue; // the selection checkbox column
  list.insertAdjacentHTML(
    "beforeend",
    `<label><input type="checkbox" data-col="${c.getColId()}" checked> ${c.getColDef().headerName}</label>`
  );
}
list.addEventListener("change", (e) => api.setColumnsVisible([e.target.dataset.col], e.target.checked));
// Close the menu on a click anywhere else, as a menu should.
document.addEventListener("click", (e) => {
  if (!e.target.closest(".sc-cols")) $(".sc-cols").open = false;
});

function syncColumnMenu() {
  for (const box of list.querySelectorAll("input")) box.checked = api.getColumn(box.dataset.col).isVisible();
}

/* ---- status line -------------------------------------------------------- */

function updateStatus() {
  if (!data) return;
  const selected = api.getSelectedRows();
  const total = selected.reduce((sum, row) => sum + (Number(row.price) || 0), 0);
  $(".sc-status").innerHTML =
    `Showing <b>${count(api.getDisplayedRowCount())}</b> of ${count(data.rows.length)} rows` +
    ` · <b>${count(selected.length)}</b> selected, total <b>${money.format(total)}</b>`;
}
