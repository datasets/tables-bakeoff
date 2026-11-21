import { flushSync } from "react-dom";
import { mountDemo } from "../../harness/mount.js";
import { mountReact } from "../../harness/react-host.js";
import { TanStackTable } from "./Table.jsx";
import { parseFrontmatter } from "../../harness/frontmatter.js";
import readme from "./README.md?raw";

const { meta: frontmatter, body: notes } = parseFrontmatter(readme);
export const meta = { ...frontmatter, notes };

/** One implementation for all four datasets. The paint predicate is the point:
 *  a concurrent React root would otherwise report the microseconds it took to
 *  schedule itself, so mountReact holds the clock open until a real data row
 *  exists in the DOM. */
function mount(host, data, ctx) {
  // #region sort hook for the harness (not counted in lines written)
  // Sort through the same state a header click sets. flushSync makes React
  // build the sorted row model and commit inside the clock.
  const api = {};
  ctx.provideSort((field) =>
    flushSync(() => api.setSorting(field ? [{ id: field, desc: false }] : []))
  );
  // #endregion
  return mountReact(
    host,
    <TanStackTable data={data} formatCell={ctx.formatCell} api={api} />,
    // Spacer rows are always present; only a data row proves rows rendered.
    (el) => el.querySelector(".tst tbody tr[data-row]") !== null
  );
}

export const tables = { small: mount, wide: mount, medium: mount, large: mount };

export const source = mount;

mountDemo({ meta, tables, source });
