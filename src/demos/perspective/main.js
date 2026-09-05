/* A WASM data engine with a grid attached, rather than a grid library.
 * Perspective keeps the data in an Arrow-backed columnar store inside a Web
 * Worker, so sorting, filtering and pivoting 500,000 rows never touches the
 * UI thread — the grid only ever asks for the window it is painting. */

import perspective from "@perspective-dev/client";
import perspective_viewer from "@perspective-dev/viewer";
import "@perspective-dev/viewer-datagrid";
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

export const meta = {
  name: "Perspective",
  version: "5.3.1",
  license: "Apache-2.0",
  docs: "https://perspective-dev.github.io/guide/",
  npm: "@perspective-dev/viewer",
  tagline: "WASM + Arrow columnar engine in a worker, with a grid attached.",
  notes:
    "Not comparable like-for-like with the other six. The page downloads two " +
    "WebAssembly binaries before anything renders — a 2.4 MB engine and a " +
    "1.5 MB viewer UI, both compiled Rust, neither of which is JavaScript the " +
    "bundle figure can be compared against. What it buys is that the data " +
    "never lives on the main thread: the rows are copied once into an " +
    "Arrow-backed store in a Web Worker, and sorting, filtering and pivoting " +
    "500,000 rows afterwards are worker-side operations the UI thread only " +
    "reads a viewport out of. Judge it on the large dataset — 2.1 s to move " +
    "500,000 rows into the engine and paint, then 60fps scrolling — not on " +
    "the small one, where the same fixed WASM cost is all you see. " +
    "Also the only demo whose cells do not go through the harness's shared " +
    "formatCell: formatting happens inside the plugin, configured per column " +
    "as Intl option bags (number_format / date_format), with no callback to " +
    "hand a function to. Numbers land in the same place by coincidence " +
    "(thousands separators are its default), but the ISO date strings in the " +
    "parquet are inferred as dates and re-rendered in the browser locale's " +
    "short form ('7/26/24', not '2024-07-26'), and nulls render as an empty " +
    "cell rather than the site's em dash — no locale field is exposed, so " +
    "neither is reachable from config. Packaging is the other thing to know: " +
    "as of 5.x the project has moved off @finos to @perspective-dev, and the " +
    "engine, the viewer element and the datagrid plugin are three separate " +
    "installs plus a mandatory init_server/init_client bootstrap that hands " +
    "each WASM binary's URL to the library by hand.",
};

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
