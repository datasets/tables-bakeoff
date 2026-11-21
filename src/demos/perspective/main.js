/* A WASM data engine with a grid attached, rather than a grid library.
 * Perspective keeps the data in an Arrow-backed columnar store inside a Web
 * Worker, so sorting, filtering and pivoting 500,000 rows never touches the
 * UI thread — the grid only ever asks for the window it is painting. */

import perspective from "@perspective-dev/client";
import perspective_viewer from "@perspective-dev/viewer";
import "@perspective-dev/viewer-datagrid";
import { parseFrontmatter } from "../../harness/frontmatter.js";
import readme from "./README.md?raw";
/* All eighteen bundled themes, 184 kB, because the two this demo actually
 * uses cost more: pro.css and pro-dark.css are 108 kB each, since every
 * standalone theme file inlines the whole icon set as data URIs and nothing
 * dedupes them across two imports. */
import "@perspective-dev/viewer/dist/css/themes.css";

// Vite hands back a URL for each binary and Perspective fetches it itself.
// Two separate engines: the "server" wasm is the columnar store that runs in
// the worker, the "client" wasm is the viewer's own Rust UI.
import SERVER_WASM from "@perspective-dev/server/dist/wasm/perspective-server.wasm?url";
import CLIENT_WASM from "@perspective-dev/viewer/dist/wasm/perspective-viewer.wasm?url";

import { mountDemo } from "../../harness/mount.js";
import { DATASETS } from "../../data/datasets.js";

const { meta: frontmatter, body: notes } = parseFrontmatter(readme);
export const meta = { ...frontmatter, notes, setupLabel: "engine ready", setupNote: "two WebAssembly binaries fetched and compiled, once per page, before any table; not included in the render times below" };

/* One engine for the whole page, booted once in `setup` below. `worker()`
 * instantiates the WASM store in a Web Worker; doing that per card would charge
 * each card for a cost the user pays once. The harness times setup on its own
 * and prints it as "engine ready in N ms" above the cards, so the boot is
 * disclosed rather than landing inside the first card's render time (where it
 * made 1,000 rows read as about three seconds). */
let client = null;

export async function setup() {
  await Promise.all([
    perspective.init_server(fetch(SERVER_WASM)),
    perspective_viewer.init_client(fetch(CLIENT_WASM)),
  ]);
  client = await perspective.worker();
  // The worker finishes compiling on its first request, so make one: a
  // one-row table, created and dropped, before the clock starts on any card.
  const warm = await client.table([{ x: 1 }], { name: "warmup" });
  await warm.delete();
}

/* Tables in a client live in a flat, engine-wide namespace keyed by name, and
 * `client.table()` throws `Table "x" already exists` on a collision. The
 * harness's cleanup is fire-and-forget, so a name derived from the dataset key
 * alone races its own teardown on every theme flip. A serial number sidesteps
 * the ordering question entirely. */
let tableSeq = 0;

async function build(host, data, ctx) {
  const viewer = document.createElement("perspective-viewer");
  // Without an explicit height the element collapses to zero: it is a web
  // component with no intrinsic size, and the host's 460px does not inherit.
  viewer.style.height = "100%";
  viewer.style.width = "100%";
  host.appendChild(viewer);

  const name = `${ctx.key}_${++tableSeq}`;
  // The one place the 500,000 rows cross into the engine: an array of JS
  // objects is transferred to the worker and rebuilt as Arrow columns there.
  const table = await client.table(data.rows, { name });

  // load() binds the viewer to the client and restore() picks the table out of
  // it — the documented pair, which renders exactly once instead of drawing an
  // empty grid first. restore() resolves after the plugin has drawn, so the
  // harness's clock covers real cells on screen, not a scheduled render.
  await viewer.load(client);

  await viewer.restore({
    table: name,
    plugin: "Datagrid",
    // The shared display order. Without it the grid follows the object keys.
    columns: data.columns.map((c) => c.name),
    // The viewer draws its own panel-title bar above the grid — the one piece
    // of library chrome no other demo has. Left visible on purpose, but named,
    // because the default "untitled" reads as a bug rather than a feature.
    title: DATASETS[ctx.key].title,
    // The bundled themes.css carries every theme; the viewer picks one by
    // name. Nothing here reads the harness tokens, so Perspective's grid is
    // the one demo whose exact greys come from the library, not the site.
    theme: ctx.theme.dark ? "Pro Dark" : "Pro Light",
    settings: false,
  });

  // Header labels. Perspective names a column after its key in the data and has
  // no option to display anything else, so the shared labels go in through
  // regular-table's style listener, the datagrid's documented hook for
  // restyling after each draw. Applied once now, since the first draw is done,
  // and again on every redraw. Sorting and settings still use the key.
  const labels = Object.fromEntries(data.columns.map((c) => [c.name, c.label]));
  const rt = viewer.querySelector("perspective-viewer-datagrid")?.regular_table;
  const relabel = () => {
    for (const span of rt.querySelectorAll("thead th.psp-header-leaf > span:first-child")) {
      const label = labels[span.textContent];
      if (label) span.textContent = label;
    }
  };
  if (rt) {
    rt.addStyleListener(relabel);
    relabel();
  }

  // The element that really scrolls is regular-table, two shadow roots down:
  // <perspective-viewer> ▸ <perspective-viewer-datagrid> #shadow ▸
  // <regular-table>. Verified against the live DOM — the only other element
  // with overflow inside the plugin is `.rt-scroll-table-clip`, whose 19px of
  // scrollHeight is the header clip, and pointing the FPS run at that would
  // have reported a flat 60fps for something that never moves.
  const grid = viewer
    .querySelector("perspective-viewer-datagrid")
    ?.shadowRoot?.querySelector("regular-table");
  grid?.setAttribute("data-scroller", "");

  // #region sort hook for the harness (not counted in lines written)
  // Sorting runs in the worker; restore() resolves once the grid has redrawn.
  ctx.provideSort((field) => viewer.restore({ sort: field ? [[field, "asc"]] : [] }));
  // #endregion

  return async () => {
    try { await viewer.delete(); } catch {}
    try { await table.delete(); } catch {}
  };
}

export const tables = { small: build, wide: build, medium: build, large: build };

export const source = build;

mountDemo({ meta, tables, source, setup });
