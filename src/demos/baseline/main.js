/* The control. No library at all — build the DOM by hand.
 *
 * This exists to give the scorecard a floor. On the small dataset it is
 * genuinely competitive, which is the point: reach for a grid when you have a
 * reason, not by default. On 500k rows it dies, which is also the point. */

import { mountDemo } from "../../harness/mount.js";
import { parseFrontmatter } from "../../harness/frontmatter.js";
import readme from "./README.md?raw";

const { meta: frontmatter, body: notes } = parseFrontmatter(readme);
export const meta = { ...frontmatter, npm: null, notes };

/** One implementation, used for all four datasets. Building the whole table as
 *  an HTML string and assigning innerHTML once is far faster than createElement
 *  per cell — this is the honest best case for the no-library approach. */
function renderTable(host, data, ctx, rowLimit = Infinity) {
  const rows = data.rows.length > rowLimit ? data.rows.slice(0, rowLimit) : data.rows;
  const cols = data.columns;

  const head = cols.map((c) => `<th class="${c.align === "right" ? "num" : ""}">${c.label}</th>`).join("");
  const bodyOf = (list) =>
    list
      .map(
        (r) =>
          "<tr>" +
          cols
            .map((c) => `<td class="${c.align === "right" ? "num" : ""}">${ctx.formatCell(r[c.name], c)}</td>`)
            .join("") +
          "</tr>"
      )
      .join("");

  // A cap has to be visible where the table is, not only in the page notes —
  // otherwise the card reads as a fair 500,000-row render. reportRows tells the
  // harness too, so the metric line above cannot claim rows we never built.
  ctx.reportRows(rows.length);
  const capped =
    rows.length < data.rows.length
      ? `<p class="cap-note">Showing ${rows.length.toLocaleString()} of ${data.rows.length.toLocaleString()} rows — uncapped, this never finished rendering.</p>`
      : "";

  const draw = (list) => {
    host.innerHTML = `${capped}<table class="plain"><thead><tr>${head}</tr></thead><tbody>${bodyOf(list)}</tbody></table>`;
  };
  draw(rows);

  // #region sort hook for the harness (not counted in lines written)
  // No library, so sorting is ours: sort a copy of the rows and rebuild the
  // table. On the large card that is the 100,000 rows shown, re-laid out.
  // Clearing (file order) is left as a no-op: the next sort starts from the
  // unsorted array either way, and re-rendering 100,000 rows just to undo
  // would add seconds to the wait between runs for nothing.
  ctx.provideSort((field) => {
    if (field) draw(rows.slice().sort((a, b) => compare(a[field], b[field])));
  });
  // #endregion
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const tables = {
  small: (host, data, ctx) => renderTable(host, data, ctx),
  wide: (host, data, ctx) => renderTable(host, data, ctx),
  medium: (host, data, ctx) => renderTable(host, data, ctx),
  // Capped at 100,000 of 500,000 rows. Uncapped this never completed — the
  // cost is table layout, which goes superlinear past ~100k rows (measured on
  // this machine: 2.5s / 6.3s / ~27s at 50k / 100k / 200k, see meta.notes for
  // the run-to-run spread). The cap is stated in meta.notes and on the card,
  // so the reader sees the baseline is being shown at its best case and still
  // loses.
  large: (host, data, ctx) => renderTable(host, data, ctx, 100000),
};

/* All four entries above are one-line delegations, so without this the source
 * panel would show only the delegation. */
export const source = renderTable;

mountDemo({ meta, tables, source });
