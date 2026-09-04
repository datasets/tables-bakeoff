/* The control. No library at all — build the DOM by hand.
 *
 * This exists to give the scorecard a floor. On the small dataset it is
 * genuinely competitive, which is the point: reach for a grid when you have a
 * reason, not by default. On 500k rows it dies, which is also the point. */

import { mountDemo } from "../../harness/mount.js";

export const meta = {
  name: "Plain <table>",
  version: "—",
  license: "n/a",
  docs: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table",
  npm: null,
  tagline: "No library. Hand-built DOM, sticky header, ~20 lines.",
  notes:
    "The control in this comparison. Rendering every row as real DOM has no " +
    "virtualization, so the large dataset is expected to lock the tab — that " +
    "failure is the measurement, not a bug in the demo. CAPPED: the large card " +
    "renders the first 100,000 of 500,000 rows. Uncapped it never finished — " +
    "abandoned after 10 minutes with the tab unresponsive. Table layout, not " +
    "string building, is what collapses: 2.0s at 50,000 rows, 6.2s at 100,000, " +
    "34.2s at 200,000. Every other library on this site renders all 500,000.",
};

/** One implementation, used for all four datasets. Building the whole table as
 *  an HTML string and assigning innerHTML once is far faster than createElement
 *  per cell — this is the honest best case for the no-library approach. */
function renderTable(host, data, ctx, rowLimit = Infinity) {
  const rows = data.rows.length > rowLimit ? data.rows.slice(0, rowLimit) : data.rows;
  const cols = data.columns;

  const head = cols.map((c) => `<th>${c.name}</th>`).join("");
  const body = rows
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
  // otherwise the card reads as a fair 500,000-row render.
  const capped =
    rows.length < data.rows.length
      ? `<p class="cap-note">Showing ${rows.length.toLocaleString()} of ${data.rows.length.toLocaleString()} rows — uncapped, this never finished rendering.</p>`
      : "";

  host.innerHTML = `${capped}<table class="plain"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export const tables = {
  small: (host, data, ctx) => renderTable(host, data, ctx),
  wide: (host, data, ctx) => renderTable(host, data, ctx),
  medium: (host, data, ctx) => renderTable(host, data, ctx),
  // Capped at 100,000 of 500,000 rows. Uncapped this never completed — the
  // cost is table layout, which goes superlinear past ~100k rows (2.0s / 6.2s
  // / 34.2s at 50k / 100k / 200k). The cap is stated in meta.notes and on the
  // card, so the reader sees the baseline is being shown at its best case and
  // still loses.
  large: (host, data, ctx) => renderTable(host, data, ctx, 100000),
};

mountDemo({ meta, tables });
