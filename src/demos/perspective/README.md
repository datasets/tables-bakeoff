---
name: Perspective
version: 5.9.4
license: Apache-2.0
docs: https://perspective-dev.github.io/guide/
homepage: https://perspective-dev.github.io/
github: https://github.com/finos/perspective
npm: "@perspective-dev/viewer"
tagline: WASM + Arrow columnar engine in a worker, with a grid attached.
---

- A data engine with a grid attached. Rows are copied once into an Arrow store in a Web Worker; sorting and filtering then run there, off the main thread.
- Two WebAssembly binaries (a 2.4 MB engine and a 1.5 MB viewer) load before anything draws. That boot is shown on its own "engine ready" line above the cards, not inside the render times.
- No per-cell formatter, locale or header-label option. Dates show in the browser's short form (7/26/24), nulls as blank cells, and the column labels go in through the datagrid's style listener.
- Three packages to install, and a bootstrap that hands each WASM file's URL to the library by hand.
