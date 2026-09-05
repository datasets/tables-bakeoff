# Task 11 report: Perspective

Status: **DONE**. Perspective works, on the site, all four datasets, both themes,
no console errors. `npx playwright test` is 35 passed (30 existing + 5 new).

---

## 1. Which package family, and why

Both are live. Checked on 2026-09-05:

| package | version | last published |
|---|---|---|
| `@finos/perspective` | 3.8.0 | 2026-07-28 |
| `@perspective-dev/client` | 5.3.1 | 2026-09-04 |
| `@perspective-dev/viewer` | 5.3.1 | 2026-09-04 |
| `@perspective-dev/viewer-datagrid` | 5.3.1 | 2026-09-04 |

**Chose `@perspective-dev` 5.3.1.** The evidence is not ambiguous:

- `perspective.finos.org` redirects to `perspective-dev.github.io`.
- The repository behind the new scope is the same project with the same
  maintainers publishing it (`texodus`, `timkpaine`).
- The whole `@perspective-dev` family — client, viewer, viewer-datagrid,
  viewer-charts, react, server, cli, jupyterlab — was published together on
  2026-09-04, which is a scope migration, not a fork.
- Every install command, bootstrap snippet and bundler recipe in the current
  documentation is written against `@perspective-dev`. Demoing `@finos` would
  have measured a version nobody starting today would install and would have put
  the demo's code at odds with the only docs a reader can follow.

The one thing you are buying against: 5.3.1 was **one day old** when it was
measured. Recorded in `OPEN-QUESTIONS.md` as question 3, with the cost of
reverting.

The plan's snippet was written for 3.x and does not survive contact with 5.x —
different package names, a different theme import path, and a mandatory
bootstrap step that 3.x did not have. Nothing was written from memory of either.

## 2. Where the real documentation is

`https://perspective-dev.github.io/guide/` is a shell whose sub-pages I could not
enumerate, and the npm READMEs for both packages are two-line Rust-crate stubs.
What is actually usable is the markdown the guide is built from, in the repo:

```
docs/md/how_to/javascript/{installation,importing,worker,loading_data,viewer,theming,save_restore}.md
```

`importing.md` contains a **verbatim, correct Vite recipe**. That file is the
single most valuable artefact in this integration and it is not discoverable from
npm. Worth saying plainly in the write-up: the docs are good, the path to them is
not.

## 3. Integration, blow by blow

This is the part that matters for a data-publishing audience, so here is
everything, including how little went wrong.

**Install (2 min).** Three packages, one command, clean install, no peer
conflicts, no `--legacy-peer-deps`. Notably better than Glide, which needed a
`package.json` override to coexist with React 19.

**Bootstrap (the one genuinely unusual step).** Unlike every other library here,
importing the package is not enough. Perspective ships its engine as WebAssembly
and refuses to guess where the binary is; you hand it two URLs yourself:

```js
import SERVER_WASM from "@perspective-dev/server/dist/wasm/perspective-server.wasm?url";
import CLIENT_WASM from "@perspective-dev/viewer/dist/wasm/perspective-viewer.wasm?url";
await Promise.all([
  perspective.init_server(fetch(SERVER_WASM)),
  perspective_viewer.init_client(fetch(CLIENT_WASM)),
]);
```

Two separate binaries, from two different packages, doing two different jobs
(the columnar engine that runs in the worker; the viewer's own Rust UI). The
`@perspective-dev/server` one is a *transitive* dependency — you import a wasm
file out of a package you never installed directly. That is the kind of detail
that is obvious once written down and unguessable beforehand, and it is exactly
what `importing.md` gives you.

**Vite config (one line, documented).** `build.target: "esnext"`, because the
ESM builds use top-level await. I also set `esbuild.target` and
`optimizeDeps.esbuildOptions.target` so the dev server's dep pre-bundling agrees
with the production build. The brief's suggested `optimizeDeps.exclude` and
`worker.format: "es"` were **not** needed — that advice is for 3.x. Vite 7
handled the worker and the `?url` wasm assets with no help.

**It worked on the first run.** Three cards rendering, no console errors, no
CORS/COOP/COEP headers needed (it uses a plain dedicated worker, not
SharedArrayBuffer). For the riskiest demo in the bake-off, that is the headline.

**Two real problems, both mine, both quick:**

1. *`Table "psp_small" already exists`.* Tables live in a flat namespace on the
   client keyed by name, and `client.table()` throws on a collision. The harness
   re-renders a card on a theme change and its cleanup is fire-and-forget, so a
   name derived from the dataset key races its own teardown. Fixed with a serial
   number per created table, which sidesteps the ordering question rather than
   trying to win it. Worth knowing: Perspective's engine has process-global
   state, so a component that mounts and unmounts needs a disposal story that
   the other six libraries do not.

2. *The scroller is two shadow roots down.* Found by walking the live DOM, not by
   reading docs. See below — it is the finding I would most expect someone else
   to get wrong.

Total: well under a day, most of it spent reading rather than debugging.

## 4. The scroller (contract point 2)

The real structure, verified against the live page:

```
<perspective-viewer>                       (light DOM child of .demo-host)
  └─ <perspective-viewer-datagrid>         (light DOM child of the viewer)
       └─ #shadow-root (open)
            └─ <regular-table>             ← scrollHeight 1,150,023 at 50k rows
                 └─ div.rt-scroll-table-clip   ← 418/437: the header clip
```

`<regular-table>` is the element that moves. `div.rt-scroll-table-clip` is
*also* technically overflowing — by **19 pixels** — and is precisely the kind of
element the earlier review caught in this repo: pointing the FPS run at it would
have scrolled nothing and published a flat 60fps as a measurement. I verified the
choice by setting `scrollTop = 5000` and confirming the first visible row's text
changed (`2131FCF5…` → `25E9DA80…`).

The shadow root is **open**, so it is reachable — but not by
`host.querySelector("[data-scroller]")`, which is what the harness did. I
extended `scrollerOf()` in `src/harness/mount.js` to descend into open shadow
roots *after* the light-DOM query fails. Every other demo marks a light-DOM
element and is found by the first query, so nothing else changes behaviour; all
30 pre-existing e2e tests still pass.

If it had been a *closed* shadow root the honest answer would have been to skip
the FPS number for this demo. It is not, so the number is real.

## 5. Measurements

Headless Chromium, dev server, light theme, one page load, `Measure scroll FPS`
run once per card.

| dataset | rendered | scroll FPS | parquet load |
|---|---|---|---|
| small — 1,000 × 16 | 77 ms | 60 fps · 1 dropped | 64 ms |
| wide — 1,000 × 80 | 34.8 ms | 59 fps · 2 dropped | 20 ms |
| medium — 50,000 | 274 ms | 60 fps · 1 dropped | 84 ms |
| **large — 500,000** | **2,149–2,690 ms** | **60 fps · 1 dropped** | 830 ms |

The large figure varied across five runs between 2.1 s and 2.7 s. It is
dominated by one thing: moving 500,000 JavaScript objects across the worker
boundary and rebuilding them as Arrow columns. Handing Perspective an Arrow
buffer or a CSV instead of `Array<Object>` would very likely cut it hard — the
loader gives every library the same `data.rows`, which is the right call for
fairness but is Perspective's worst input format. **Flag this in the write-up:
the 2.1 s is the cost of our chosen interchange format, not a ceiling.**

`restore()` genuinely resolves after paint. Verified with a MutationObserver on
the metric badge that synchronously counted rows at the instant the timed region
closed: 25 `<tr>` present. The number on the card is not a scheduling artefact.

**Bundle** (`npx vite build`):

```
perspective-DFW9cnSf.js              259 kB │ gzip:  68.8 kB
perspective-Bvvqywk8.css             184 kB │ gzip:  30.4 kB
perspective-viewer-*.wasm          1,513 kB │ gzip: 1,504 kB
perspective-server-*.wasm          2,463 kB │ gzip: 2,431 kB
```

The JavaScript alone (259 kB) is *lighter* than AG Grid's 1,093 kB. The
comparison is meaningless without the 3.9 MB of WebAssembly beside it, which
gzip barely touches because it is already compressed. Task 12 must not silently
sum these into a "bundle size" column next to six JS libraries.

One CSS note that surprised me: `themes.css` (all 18 themes, 184 kB) is
*smaller* than importing the two themes I use, because `pro.css` and
`pro-dark.css` are 108 kB each — every standalone theme file inlines the whole
icon set as data URIs and nothing dedupes them across two imports.

## 6. The shared formatter (contract point 6)

**It could not be applied.** This is the one demo whose cells do not pass through
`ctx.formatCell`.

Formatting happens inside the plugin. `viewer-datagrid` has an internal
`FormatterCache` driven by per-column `number_format` / `date_format` config in
`restore({ columns_config })` — Intl option bags written straight into
`Intl.NumberFormat` / `Intl.DateTimeFormat` constructors. There is no callback
parameter anywhere in the plugin's public surface to hand a function to. I
checked `format_cell.d.ts`, `formatter_cache.d.ts`, `column-format.d.ts` and the
plugin element's own type declarations before concluding this.

What that costs, concretely, against the other six:

- **Numbers agree by luck.** Thousands separators are Perspective's default, so
  `320,000` matches `formatCell`. I removed my `columns_config` grouping override
  once I confirmed it was redundant.
- **Dates disagree and cannot be fixed.** The parquet holds ISO strings;
  Perspective's own type inference sees dates and re-renders them in the
  browser's short locale form — `7/26/24`, where every other demo shows
  `2024-07-26`. `date_format` exposes `dateStyle`/`timeStyle` presets and
  per-part overrides, but **no locale field**, so ISO output is not reachable
  from config at all. I could have forced the column to a string type to defeat
  the inference, but that would have hidden real library behaviour to flatter a
  screenshot.
- **Nulls render as an empty cell**, not the site's em dash.
- **Numeric cells are tinted blue** by the Pro themes.

All four are in `meta.notes` on the page. Anyone comparing screenshots needs to
know Perspective's columns are formatted by Perspective, not by us.

## 7. Other things worth reporting

- **Panel chrome.** The viewer draws its own title bar and settings toggle above
  the grid — about 30 px of library UI no other demo has. Left visible on
  purpose (it is what you get), but given a title, because the default
  "untitled" reads as a bug rather than a feature.
- **Sorting is free.** Clicking a header sorts 500,000 rows in the worker; the
  UI thread only re-reads a viewport. This is the actual product and the site's
  render-time column does not show it at all.
- **`reportRows` is not called**, correctly: Perspective virtualizes but presents
  every row.
- **The engine holds process-global state** (the flat table namespace, the
  worker). A per-card worker would have misattributed the WASM cost; one
  module-scope client is shared across all four cards, as the brief required.

## 8. What a reader should conclude

Perspective is not a grid library and should not be picked as one. If your table
is a table — a few thousand rows, formatted the way your house style says — you
are paying 3.9 MB of WebAssembly and a bootstrap step for a widget that is
harder to make look like your site than any of the other six, and you will lose
the argument about the date format.

If your table is a *query interface* over data too large to sit on the main
thread, the trade inverts completely. 500,000 rows sort and filter without the
UI thread noticing, scrolling never dropped below 60fps, pivots and expressions
come free, and the cost is a fixed one-time download that a returning visitor
gets from cache. Nothing else in this bake-off does that; the others make the
main thread faster, Perspective takes the work off it.

The integration risk that the plan flagged did not materialise. The genuine
frictions are the scope migration (`@finos` → `@perspective-dev`, with the older
name still installable and still ranking in search), the fact that the good
documentation lives in the repo rather than on npm, and the loss of control over
cell formatting.
