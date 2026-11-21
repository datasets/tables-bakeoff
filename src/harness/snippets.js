/* PLACEHOLDER. The copy-paste starter for each library page's "Get started"
 * block (src/harness/mount.js). Another task writes the real file; this one
 * fixes the shape so the page can render it:
 *
 *   SNIPPETS = { [libKey]: { install, code, lang } }
 *
 *   install  the one-line install command ("npm install ag-grid-community"),
 *            or null when there is nothing to install (the plain <table>)
 *   code     the smallest complete starter: a table from an array of row
 *            objects, nothing from the harness
 *   lang     "js" | "jsx" | "html", for the label on the block
 *
 * A key with no entry renders no block at all. Keys are the demo keys in
 * vite.config.js DEMOS. */
export const SNIPPETS = {
  aggrid: {
    install: "npm install ag-grid-community",
    lang: "js",
    code: `import { createGrid, ModuleRegistry, AllCommunityModule } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

const rows = [{ price: 250000, date: "2024-03-01", postcode: "SW1A 1AA" }];

createGrid(document.getElementById("grid"), {
  rowData: rows,
  columnDefs: Object.keys(rows[0]).map((field) => ({ field, sortable: true, filter: true })),
});`,
  },
  tabulator: {
    install: "npm install tabulator-tables",
    lang: "js",
    code: `import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";

const rows = [{ price: 250000, date: "2024-03-01", postcode: "SW1A 1AA" }];

new Tabulator("#grid", {
  data: rows,
  autoColumns: true,
  height: 400, // a real height, not "100%"
});`,
  },
  baseline: {
    install: null,
    lang: "js",
    code: `const rows = [{ price: 250000, date: "2024-03-01", postcode: "SW1A 1AA" }];
const cols = Object.keys(rows[0]);

document.getElementById("table").innerHTML =
  \`<table><thead><tr>\${cols.map((c) => \`<th>\${c}</th>\`).join("")}</tr></thead>
  <tbody>\${rows.map((r) => \`<tr>\${cols.map((c) => \`<td>\${r[c]}</td>\`).join("")}</tr>\`).join("")}</tbody></table>\`;`,
  },
};
