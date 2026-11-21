import "@glideapps/glide-data-grid/dist/index.css";
import { flushSync } from "react-dom";
import { mountDemo } from "../../harness/mount.js";
import { mountReact } from "../../harness/react-host.js";
import { GlideGrid, glideTheme } from "./Grid.jsx";
import { parseFrontmatter } from "../../harness/frontmatter.js";
import readme from "./README.md?raw";

const { meta: frontmatter, body: notes } = parseFrontmatter(readme);
export const meta = { ...frontmatter, notes };

/** One implementation for all four datasets. Two things here are not
 *  decoration: the host is measured before mounting because Glide will not
 *  size itself, and the timed region is held open until the canvas exists —
 *  Glide draws from an effect, so a React commit alone proves nothing was
 *  painted yet. */
function mount(host, data, ctx) {
  const initial = { width: host.clientWidth, height: host.clientHeight };
  // Sorting is app code: sort an index of row numbers, hand Glide the new
  // order. A new getCellContent makes Glide redraw its canvas in a layout
  // effect, so the repaint is done when flushSync returns.
  const api = {};
  ctx.provideSort((field) =>
    flushSync(() => api.setOrder(field ? sortIndex(data.rows, field) : null))
  );
  return mountReact(
    host,
    <GlideGrid
      data={data}
      api={api}
      formatCell={ctx.formatCell}
      theme={glideTheme(ctx.theme)}
      initial={initial}
    />,
    (el) => {
      const canvas = el.querySelector("canvas");
      if (!canvas || canvas.width === 0) return false;
      // The grid scrolls .dvn-scroller (verified against the installed
      // package's own stylesheet, which is where the overflow rule lives) —
      // the harness host never moves, so without this the FPS button would
      // scroll a motionless box and report a fabricated 60fps.
      el.querySelector(".dvn-scroller")?.setAttribute("data-scroller", "");
      return true;
    }
  );
}

/** Row numbers ordered by `field`, ascending. */
function sortIndex(rows, field) {
  const idx = Array.from({ length: rows.length }, (_, i) => i);
  return idx.sort((a, b) => {
    const x = rows[a][field], y = rows[b][field];
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

/** The edit test: the same grid with Price editable. */
function edit(host, data, ctx) {
  return mountReact(
    host,
    <GlideGrid
      data={data}
      editable
      formatCell={ctx.formatCell}
      theme={glideTheme(ctx.theme)}
      initial={{ width: host.clientWidth, height: host.clientHeight }}
    />
  );
}

export const tables = { small: mount, wide: mount, medium: mount, large: mount };

export const source = mount;

mountDemo({ meta, tables, source, edit });
