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
  return mountReact(
    host,
    <TanStackTable data={data} formatCell={ctx.formatCell} />,
    // Spacer rows are always present; only a data row proves rows rendered.
    (el) => el.querySelector(".tst tbody tr[data-row]") !== null
  );
}

export const tables = { small: mount, wide: mount, medium: mount, large: mount };

export const source = mount;

mountDemo({ meta, tables, source });
