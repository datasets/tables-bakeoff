/* The tiny end of the range. Inputs.table is one call: it infers column types,
 * right-aligns numbers, sorts on header click and "virtualizes" by lazily
 * appending rows as you scroll — not real windowing, see meta.notes. */

import * as Inputs from "@observablehq/inputs";
// The stylesheet its README loads next to the script. Without it cells wrap
// mid-token and every row shows its selection checkbox.
import "@observablehq/inputs/dist/index.css";
import { mountDemo } from "../../harness/mount.js";
import { parseFrontmatter } from "../../harness/frontmatter.js";
import readme from "./README.md?raw";

const { meta: frontmatter, body: notes } = parseFrontmatter(readme);
export const meta = { ...frontmatter, notes };

/** One implementation, used for all four datasets. `el` — the <form> that
 *  Inputs.table returns — is the element that actually scrolls (it carries
 *  its own height/overflow-y, not the host), so it is the data-scroller. */
function table(host, data, ctx) {
  const el = Inputs.table(data.rows, {
    columns: data.columns.map((c) => c.name),
    header: Object.fromEntries(data.columns.map((c) => [c.name, c.label])),
    format: Object.fromEntries(
      data.columns.map((c) => [c.name, (v) => ctx.formatCell(v, c)])
    ),
    align: Object.fromEntries(data.columns.map((c) => [c.name, c.align])),
    // A read-only table: no selection checkboxes in the first column.
    select: false,
    // Auto layout sizes columns from their content (the default from 12
    // columns up, stated here so the small and wide cards match).
    layout: "auto",
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

  // #region sort hook for the harness (not counted in lines written)
  // Inputs.table has no sort API after construction; its documented way to
  // sort is a header click, so that is what this does. A Cmd/Meta-click on
  // the sorted header is its own "back to input order".
  let sortedBy = null;
  const th = (name) => el.querySelector(`thead th[title="${name}"]`);
  ctx.provideSort((field) => {
    if (!field) {
      if (sortedBy) th(sortedBy).dispatchEvent(new MouseEvent("click", { metaKey: true }));
      sortedBy = null;
      return;
    }
    th(field).click();
    sortedBy = field;
  });
  // #endregion
}

export const tables = { small: table, wide: table, medium: table, large: table };

export const source = table;

mountDemo({ meta, tables, source });
