/* The tiny end of the range. Inputs.table is one call: it infers column types,
 * right-aligns numbers, sorts on header click and "virtualizes" by lazily
 * appending rows as you scroll — not real windowing, see meta.notes. */

import * as Inputs from "@observablehq/inputs";
import { mountDemo } from "../../harness/mount.js";

export const meta = {
  name: "Observable Inputs",
  version: "0.12.0",
  license: "ISC",
  docs: "https://observablehq.com/documentation/inputs/table",
  npm: "@observablehq/inputs",
  tagline: "One function call. Strong defaults, built for data exploration.",
  notes:
    "Inputs.table appends rows lazily as you scroll rather than windowing — " +
    "nothing already in the DOM is ever removed, so memory grows with how far " +
    "you scroll and never comes back down; on the 500,000-row card that means " +
    "a full scroll to the bottom leaves every row live in the page. Its " +
    "stylesheet is fixed light-mode with no theming hook at all, so dark mode " +
    "here is a scoped CSS override keyed by the table's own generated id — " +
    "Inputs.table exposes nothing for this itself. That said it is the " +
    "smallest API of the seven: one function call, no destroy method needed, " +
    "and sort-on-header-click, alignment and formatting all come free.",
};

/** One implementation, used for all four datasets. `el` — the <form> that
 *  Inputs.table returns — is the element that actually scrolls (it carries
 *  its own height/overflow-y, not the host), so it is the data-scroller. */
function table(host, data, ctx) {
  const el = Inputs.table(data.rows, {
    columns: data.columns.map((c) => c.name),
    format: Object.fromEntries(
      data.columns.map((c) => [c.name, (v) => ctx.formatCell(v, c)])
    ),
    align: Object.fromEntries(data.columns.map((c) => [c.name, c.align])),
    rows: 30,
    height: 460,
  });
  el.setAttribute("data-scroller", "");

  // No theming hook exists, so patch the handful of hardcoded colors
  // (header background, borders, text) by the table's own id rather than
  // leaving a permanently-light table sitting in a dark page.
  if (ctx.theme.dark) {
    const style = document.createElement("style");
    style.textContent = `
      #${el.id} { color: ${ctx.theme.text}; }
      #${el.id} thead th { background: ${ctx.theme.surface}; }
      #${el.id} tr:not(:last-child) td, #${el.id} tr:not(:last-child) th,
      #${el.id} thead tr td, #${el.id} thead tr th { border-bottom-color: ${ctx.theme.grid}; }
    `;
    el.prepend(style);
  }

  host.append(el);
}

export const tables = { small: table, wide: table, medium: table, large: table };

export const source = table;

mountDemo({ meta, tables, source });
