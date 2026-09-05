import { mountDemo } from "../../harness/mount.js";
import { mountReact } from "../../harness/react-host.js";
import { TanStackTable } from "./Table.jsx";

export const meta = {
  name: "TanStack Table",
  version: "9.2.4",
  license: "MIT",
  docs: "https://tanstack.com/table/latest",
  homepage: "https://tanstack.com/table",
  github: "https://github.com/TanStack/table",
  stars: 28409,
  npm: "@tanstack/react-table",
  tagline: "Headless. It computes rows and sorting; you write every element.",
  notes:
    "v9 (2026) is a redesign, not an increment: getCoreRowModel() is gone, " +
    "features are opt-in through a module-scope tableFeatures({...}) call, and " +
    "useTable takes the options object as its first argument. Almost every " +
    "tutorial and answer online still describes v8 and none of it compiles — " +
    "the published .d.ts files were the only usable reference while building " +
    "this. Headless also means windowing is your job: the row virtualizer, the " +
    "column virtualizer, the spacer cells, the <colgroup>, the sticky header " +
    "and the sort arrows are all hand-written here, and @tanstack/react-virtual " +
    "is counted in this demo's bundle figure. What you get back is that this is " +
    "an ordinary <table> of our own <th>/<td>, so dark mode is just the site's " +
    "CSS variables (ctx.theme is unused — there is no theming API to feed), the " +
    "text is selectable and Ctrl-F finds what is on screen. The cost lands at " +
    "500,000 rows: table-core builds a Row object per source row up front, so " +
    "the render is dominated by that one-time construction rather than by the " +
    "~30 <tr>s actually in the DOM.",
};

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
