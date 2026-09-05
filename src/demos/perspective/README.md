---
name: Perspective
version: 5.3.1
license: Apache-2.0
docs: https://perspective-dev.github.io/guide/
homepage: https://perspective-dev.github.io/
github: https://github.com/finos/perspective
stars: 11167
npm: "@perspective-dev/viewer"
tagline: WASM + Arrow columnar engine in a worker, with a grid attached.
---

Not comparable like-for-like with the other six. The page downloads two WebAssembly binaries before anything renders — a 2.4 MB engine and a 1.5 MB viewer UI, both compiled Rust, neither of which is JavaScript the bundle figure can be compared against. What it buys is that the data never lives on the main thread: the rows are copied once into an Arrow-backed store in a Web Worker, and sorting, filtering and pivoting 500,000 rows afterwards are worker-side operations the UI thread only reads a viewport out of. Judge it on the large dataset — 2.1 s to move 500,000 rows into the engine and paint, then 60fps scrolling — not on the small one, where the same fixed WASM cost is all you see. Also the only demo whose cells do not go through the harness's shared formatCell: formatting happens inside the plugin, configured per column as Intl option bags (number_format / date_format), with no callback to hand a function to. Numbers land in the same place by coincidence (thousands separators are its default), but the ISO date strings in the parquet are inferred as dates and re-rendered in the browser locale's short form ('7/26/24', not '2024-07-26'), and nulls render as an empty cell rather than the site's em dash — no locale field is exposed, so neither is reachable from config. Packaging is the other thing to know: as of 5.x the project has moved off @finos to @perspective-dev, and the engine, the viewer element and the datagrid plugin are three separate installs plus a mandatory init_server/init_client bootstrap that hands each WASM binary's URL to the library by hand.
