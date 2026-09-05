/* Exploratory spike — not a bakeoff entry. See GitHub issue #6. Renders
 * DuckDB-WASM query results into the reused TanStackTable component, over
 * the site's own `small` Parquet fixture. Deliberately outside the mountDemo
 * contract: this page has interactive state (query text, results) that
 * persists across re-renders, not four fixed per-dataset render functions. */
import { createRoot } from "react-dom/client";
import { navbar, footer } from "../../harness/mount.js";
import { restoreTheme, installThemeToggle } from "../../harness/theme.js";
import { DuckDBQuery } from "./DuckDBQuery.jsx";

restoreTheme();

document.title = "DuckDB query demo — Tables Bakeoff";

const root = document.getElementById("app");
root.innerHTML = `
  ${navbar()}
  <header class="wrap" style="padding-top:22px;padding-bottom:10px">
    <h1 style="margin:14px 0 4px;font-size:26px;letter-spacing:-0.02em">DuckDB query demo</h1>
    <p style="margin:0;max-width:70ch;color:var(--text-secondary);font-size:14px">
      An exploratory spike, not a bakeoff entry — run arbitrary SQL against the
      site's own <code>small</code> dataset with DuckDB-WASM, rendered into the
      reused TanStack table. See
      <a href="https://github.com/datasets/tables-bakeoff/issues/6" target="_blank" rel="noopener">issue #6</a>
      for scope and why this isn't an eighth library card.
    </p>
  </header>
  <main class="wrap" style="padding-bottom:60px">
    <div id="duckdb-query-root"></div>
  </main>
  ${footer()}
`;

installThemeToggle(root.querySelector(".toggle"));
createRoot(document.getElementById("duckdb-query-root")).render(<DuckDBQuery />);
