import "@glideapps/glide-data-grid/dist/index.css";
import { mountDemo } from "../../harness/mount.js";
import { mountReact } from "../../harness/react-host.js";
import { GlideGrid, glideTheme } from "./Grid.jsx";

export const meta = {
  name: "Glide Data Grid",
  version: "6.0.3",
  license: "MIT",
  docs: "https://docs.grid.glideapps.com/",
  npm: "@glideapps/glide-data-grid",
  tagline: "Canvas-rendered, React-only. Spreadsheet feel at any row count.",
  notes:
    "Nothing you can see is in the DOM. Cell text is painted into a canvas: " +
    "measured on this page, selecting the whole grid and copying yields an " +
    "empty string, and find-in-page cannot match a value that is plainly " +
    "visible on screen (window.find returns false for a cell here and true for " +
    "the same value in the TanStack demo). It is fairer than the usual " +
    "canvas-grid complaint, though — Glide does maintain a hidden " +
    "role=\"grid\" mirror of the currently visible window, about fifteen rows " +
    "of it, so a screen reader gets the viewport rather than nothing; what no " +
    "assistive tool or search gets is the other 499,985. " +
    "What it buys is that row count is close to free: the grid is handed a " +
    "number and a getCellContent(col, row) callback and never touches the " +
    "data, so 500,000 rows set up in about the same time as 1,000 and memory " +
    "does not move as you scroll. Two rough edges: it is the only library here " +
    "that will not size itself from CSS — give it width/height of '100%' and " +
    "it lays out at zero and paints an empty box until its own observer " +
    "catches up, so this demo measures the host and passes pixels — and 6.0.3, " +
    "the current release, still caps its React peer at 18.x, so installing it " +
    "next to the React 19 that TanStack pulled in needs an npm override. Its " +
    "theming is the best of the seven though: one plain object of tokens, no " +
    "CSS overrides, no generated class names to target.",
};

/** One implementation for all four datasets. Two things here are not
 *  decoration: the host is measured before mounting because Glide will not
 *  size itself, and the timed region is held open until the canvas exists —
 *  Glide draws from an effect, so a React commit alone proves nothing was
 *  painted yet. */
function mount(host, data, ctx) {
  const initial = { width: host.clientWidth, height: host.clientHeight };
  return mountReact(
    host,
    <GlideGrid
      data={data}
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

export const tables = { small: mount, wide: mount, medium: mount, large: mount };

export const source = mount;

mountDemo({ meta, tables, source });
