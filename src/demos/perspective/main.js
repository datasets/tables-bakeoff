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
export const meta = { ...frontmatter, notes };

/* One engine for the whole page. `worker()` instantiates the WASM store in a
 * Web Worker; doing that per card would charge each card for a cost the user
 * pays once. The four tables are named and share this one client, which is
 * also what lets viewer.load(client) + restore({table}) render exactly once. */
const clientPromise = (async () => {
  await Promise.all([
    perspective.init_server(fetch(SERVER_WASM)),
    perspective_viewer.init_client(fetch(CLIENT_WASM)),
  ]);
  return perspective.worker();
})();

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

  const client = await clientPromise;
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

  return async () => {
    try { await viewer.delete(); } catch {}
    try { await table.delete(); } catch {}
  };
}

export const tables = { small: build, wide: build, medium: build, large: build };

export const source = build;

mountDemo({ meta, tables, source });
