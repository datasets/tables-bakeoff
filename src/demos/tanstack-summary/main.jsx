/* Exploratory spike — not a bakeoff entry. Trials the "summary stats at top +
 * in-table filter + sort" idea on one library (TanStack) before deciding
 * whether to roll it out to others. Outside the mountDemo contract for the
 * same reason as the DuckDB spike: interactive state across re-renders, not
 * four fixed per-dataset render functions. */
import { createRoot } from "react-dom/client";
import { navbar, footer } from "../../harness/mount.js";
import { restoreTheme, installThemeToggle } from "../../harness/theme.js";
import { SummaryTable } from "./SummaryTable.jsx";

restoreTheme();

document.title = "Summary + filter table — Tables Bakeoff";

const root = document.getElementById("app");
root.innerHTML = `
  ${navbar()}
  <header class="wrap" style="padding-top:22px;padding-bottom:10px">
    <h1 style="margin:14px 0 4px;font-size:26px;letter-spacing:-0.02em">Summary + filter table</h1>
    <p style="margin:0;max-width:70ch;color:var(--text-secondary);font-size:14px">
      An exploratory spike, not a bakeoff entry — per-column summary stats (a mini
      histogram, min/max/mean, null and distinct counts) above the table, plus a
      fast client-side filter and click-to-sort, trialed on TanStack Table first.
    </p>
  </header>
  <main class="wrap" style="padding-bottom:60px">
    <div id="summary-table-root"></div>
  </main>
  ${footer()}
`;

installThemeToggle(root.querySelector(".toggle"));
createRoot(document.getElementById("summary-table-root")).render(<SummaryTable />);
