/* The veteran. DataTables 3 dropped jQuery; it still enhances a real <table>
 * element, so every visible cell is ordinary DOM. Scroller (a free MIT
 * extension) swaps paging for virtual rows. */

import DataTable from "datatables.net-dt";
import "datatables.net-scroller-dt";
import "datatables.net-dt/css";
import "datatables.net-scroller-dt/css";
import { mountDemo } from "../../harness/mount.js";
import { parseFrontmatter } from "../../harness/frontmatter.js";
import readme from "./README.md?raw";

const { meta: frontmatter, body: notes } = parseFrontmatter(readme);
export const meta = { ...frontmatter, notes };

/** One implementation, used for all four datasets. DataTables' default is
 *  paging (ten rows a page); `scroller: true` is the documented switch to
 *  one scrolling body that only keeps the visible rows in the DOM.
 *  `deferRender` is already on by default since v2, so rows that never
 *  scroll into view are never built.
 *
 *  The constructor draws synchronously, but Scroller measures its row height
 *  and redraws after that, so the promise settles on `initComplete`. */
function build(host, data, ctx) {
  applyTheme(host, ctx.theme);
  const table = document.createElement("table");
  table.className = "display compact";
  host.append(table);

  return new Promise((resolve) => {
    const dt = new DataTable(table, {
      data: data.rows,
      columns: data.columns.map((c) => ({
        data: c.name,
        title: c.label,
        className: c.align === "right" ? "dt-right" : "dt-left",
        // DataTables asks the renderer for a value per purpose. Only the
        // on-screen copy goes through the shared formatter; sorting and
        // search keep the raw value, so 1,000 still sorts after 999.
        render: (v, type) => (type === "display" ? ctx.formatCell(v, c) : v),
      })),
      // scrollY is the body height only. The search box above and the info
      // line below sit outside it, so it is the host minus those two rows.
      // DataTables sorts by the first column on load unless told otherwise.
      // Every other table here shows the rows in file order, so this one does
      // too, and it skips a sort the others never do.
      order: [],
      scrollY: host.clientHeight - 160,
      scrollX: true,
      scroller: true,
      initComplete: () => {
        // DataTables scrolls div.dt-scroll-body; the host div never moves.
        host.querySelector(".dt-scroll-body")?.setAttribute("data-scroller", "");
        resolve(() => dt.destroy());
      },
    });
  });
}

/** DataTables 3 styles through CSS custom properties, which is the right
 *  hook. But its dark values switch on `:root.dark` for stripes and borders
 *  and on `[data-theme=dark]` only for the sort arrows, so this site's toggle
 *  gets half a dark theme. Setting the variables on the host from our tokens
 *  covers both modes and the "system" setting too. */
function applyTheme(host, theme) {
  const ink = theme.dark ? "255, 255, 255" : "0, 0, 0";
  const vars = {
    "--dt-row_background-stripe": ink,
    "--dt-row_background-hover": ink,
    "--dt-column-ordering_background": ink,
    "--dt-header_border": `1px solid ${theme.baseline}`,
    "--dt-body_border": `1px solid ${theme.grid}`,
    "--dt-order-arrow_color": theme.text,
    "--dt-order-arrow_color-current": theme.text,
    "--dt-input_border": `1px solid ${theme.baseline}`,
    "--dt-input_background": theme.surface,
    // Scroller paints the scrolling table its own opaque white, from a
    // second set of variables in its own stylesheet.
    "--dt-html_background": theme.surface,
    "--dts-table_background": theme.surface,
  };
  for (const [k, v] of Object.entries(vars)) host.style.setProperty(k, v);
  host.style.color = theme.text;
  host.style.padding = "8px";
}

export const tables = { small: build, wide: build, medium: build, large: build };

export const source = build;

mountDemo({ meta, tables, source });
