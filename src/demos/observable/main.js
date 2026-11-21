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

  // The stylesheet is hardcoded light and has no theming hook, but every rule
  // in it is wrapped in :where(), so any plain selector overrides it. Scoped
  // by the table's own id, in both modes: the shared look (font, 13px text,
  // 600-weight header, 5px 10px cells, hairline row borders) plus the dark
  // colors the stylesheet lacks.
  const t = ctx.theme;
  const style = document.createElement("style");
  style.textContent = `
    #${el.id} { color: ${t.text}; font-family: ${t.fontSans}; font-size: 13px; }
    #${el.id} table { font-family: inherit; }
    #${el.id} td, #${el.id} th { padding: 5px 10px; }
    #${el.id} tr > :first-of-type { width: auto; }
    #${el.id} thead th {
      background: ${t.surface}; color: ${t.text}; font-weight: 600; cursor: pointer;
    }
    #${el.id} tr:not(:last-child) td, #${el.id} tr:not(:last-child) th,
    #${el.id} thead tr td, #${el.id} thead tr th { border-bottom: 1px solid ${t.grid}; }
    #${el.id} tbody tr:first-child td { padding-top: 5px; }
    #${el.id} tbody tr:hover td { background: color-mix(in srgb, ${t.text} 5%, transparent); }
  `;
  el.prepend(style);

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
