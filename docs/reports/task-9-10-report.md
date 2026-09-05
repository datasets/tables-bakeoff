# Tasks 9 & 10 — TanStack Table (v9) and Glide Data Grid

Three commits on `build/tables-bakeoff`:

- `eaae7fe` feat: TanStack Table demo (v9, React)
- `11503d0` feat: Glide Data Grid demo (canvas, React)
- `7baf4e6` fix: disclose that Observable Inputs cannot virtualize columns

Verification: `npx vitest run` 25 passed · `npx playwright test` 30 passed
(20 pre-existing + 5 tanstack + 5 glide) · `npx vite build` succeeds.
`npm run build` still fails on the missing `scripts/measure-bundles.mjs`, which
is Task 12's file.

---

## What v9 actually required versus what the brief assumed

The brief's warning was right and its code was right. I checked every name
against `node_modules/@tanstack/react-table/dist/index.d.ts` and
`table-core/dist/**` before writing anything, and found **no discrepancies**:

- `@tanstack/react-table`'s index does `export * from "@tanstack/table-core"`,
  so `tableFeatures`, `flexRender`, `rowSortingFeature`, `createSortedRowModel`,
  `sortFn_alphanumeric` and `sortFn_basic` all import from the react package.
- `useTable(tableOptions, selector?)` — options first, optional state selector
  second. Confirmed in `dist/useTable.d.ts`.
- `tableFeatures({...})` at module scope is not an invention: table-core's own
  docstring for the helper demonstrates exactly that shape, including the
  `sortFns` registry whose keys become the legal values of `columnDef.sortFn`.
  It says in as many words that it is "recommended to use this utility
  statically outside of a component".
- Controlled sorting is `state: { sorting }` + `onSortingChange`, both present
  on `TableOptions_RowSorting`. `getSortedRowModel()` survives from v8 and is
  contributed by `sortedRowModel: createSortedRowModel()` in the feature set.
- `getCoreRowModel()` genuinely does not exist. Neither does any core row model
  option: the core row model is implicit and features are additive on top.

Two things I had to work out that the brief did not cover, because it did not
attempt column virtualization:

- **Leaf columns.** `getVisibleLeafColumns()` belongs to the column-visibility
  feature, which this demo does not opt into. The core equivalents are
  `table.getLeafHeaders()` and `row.getAllCells()` (both in
  `core/headers` / `core/rows`), and those are what the column virtualizer
  indexes into. Opting into a feature purely to enumerate columns would have
  been the wrong fix.
- **Sort direction defaults.** First click on a numeric column sorts descending
  (v9 keeps v8's `sortDescFirst` inference). Not a bug; noting it because it
  looks like one in a screenshot.

The real cost of v9 is not the API, it is the search space: every blog post,
every StackOverflow answer and every LLM-remembered snippet describes v8, and
none of it compiles. The `.d.ts` files were the only usable documentation.

---

## TanStack Table 9.2.4 — measurements

Chromium, dev server, 1400×1000 viewport.

| dataset | render | notes |
|---|---|---|
| small (1,000 × 16) | 26.5 ms | 30 `<tr>` in the DOM |
| wide (1,000 × 80) | 11.5 ms | 13 of 80 columns in the DOM, table 9,526 px wide |
| medium (50,000) | 20.0 ms | scrollHeight 1,600,031 px |
| large (500,000) | 141 ms | scrollHeight 16,000,031 px, 35 `<tr>` |

FPS: medium **60 fps / 1 dropped**; large **59 fps / 1 dropped**. Both measured
on `div.tst-scroll`, which is the element that actually moves (verified:
`scrollTop = 800` sticks).

Column virtualization verified on `wide`: 13 header cells and 13 cells per row
out of 80; scrolling to `scrollLeft = 4000` swaps the visible headers to
`metric_12` onward. Sorting verified on medium: first click on `price` gives
138,900,000 at the top, second gives 100.

**500k survival and how it felt.** Fine, and undramatic. 141 ms is the honest
number and almost all of it is table-core constructing a `Row` object per
source row up front — the ~30 `<tr>`s in the DOM are free by comparison. The
scroll is smooth and memory does not grow as you travel, because the window
genuinely windows. The one thing worth knowing is the 16,000,031 px spacer:
Chrome's element height ceiling is around 33.5 M px, so this approach has
roughly 1 M rows of headroom at a 32 px row height and would need a scaled
"virtual" scroll space beyond that. It is not a problem at 500k; it would be at
5 M.

**How much I wrote versus got for free.** Free: row objects, cell objects,
header groups, the sorting state machine, sort functions, the toggle handler,
`flexRender`. Mine: the scroll container, the `<table>`, `<colgroup>`, sticky
`<thead>`, both virtualizers, the spacer rows and spacer columns, the sort
arrows, every style rule, and the sizing model that makes `table-layout: fixed`
and a `colSpan` spacer coexist. Roughly 150 lines of component for what AG Grid
does in a 20-line options object.

**What was awkward.** Combining row and column virtualization inside a real
`<table>`. The brief's empty spacer `<tr style={{height}}/>` does not work — a
row with no cells has no height — so spacers need a `<td colSpan>`, which then
fights `table-layout: fixed` for column widths, which is why there is a
`<colgroup>`. None of this is TanStack's fault; it is the bill for headless,
and it is the part a "headless is more flexible" summary leaves out.

**meta.notes caveats recorded:** v9-is-a-redesign and the resulting
documentation vacuum; virtualization (and its bundle cost) being the
application's job; the one-time `Row` construction dominating at 500k; and the
compensation — it is an ordinary `<table>` of our own elements, so dark mode is
just the site's CSS variables (`ctx.theme` is genuinely unused, there is no
theming API to feed), text is selectable, and find-in-page works.

---

## Glide Data Grid 6.0.3 — measurements

| dataset | render | notes |
|---|---|---|
| small (1,000 × 16) | 33.2 ms | 2 canvases, 0 DOM rows |
| wide (1,000 × 80) | 15.7 ms | identical cost; canvas does not care about column count |
| medium (50,000) | 17.4 ms | — |
| large (500,000) | **24.6 ms** | — |

FPS: medium **60 fps / 1 dropped**; large **60 fps / 1 dropped**, measured on
`div.dvn-scroller`.

`data-scroller` target was verified against the installed package rather than
docs: `src/internal/scrolling-data-grid/infinite-scroller.tsx` styles
`.dvn-scroller` with `overflow: auto` (`scroll` on Safari), and the live DOM
confirms it is the element whose `scrollTop` sticks and whose `scrollHeight` is
16,000,034 px on the large card. The other `dvn-*` classes (`dvn-underlay`,
`dvn-stack`, `dvn-spacer`) are layout scaffolding, not scrollers.

**500k survival and how it felt.** It is the only demo where the large card is
indistinguishable from the small one. 24.6 ms — *less* than its own 1,000-row
card, because that first card also pays React and font warm-up. Nothing about
the interaction changes at scale: scrolling stays pinned at 60 fps and heap
stayed at 13 MB across all four cards. This is the expected result for an
architecture that never sees the data, but it is still striking to watch.

**How much I wrote versus got for free.** Almost all free: virtualization on
both axes, smooth scrolling, header rendering, resizing, selection, theming.
Mine: a column list, a `getCellContent` callback, a theme token object, and the
sizing workaround below. Under 100 lines including the theme map.

**What was awkward — three things, in order of how much they cost me.**

1. **It will not size itself.** The brief's `width="100%" height="100%"` type
   checks and renders an empty box: Glide lays out at zero until its internal
   observer fires. The demo measures `host.clientWidth/clientHeight` before
   mounting and passes pixels, plus a `ResizeObserver` in the component so
   later resizes still work. Every other library in this bake-off takes its
   size from CSS.
2. **React 19 is not supported.** 6.0.3 is the current release and its peer
   range is `^16.12.0 || 17.x || 18.x`; `npm install` fails outright next to the
   React 19 that Task 9 introduced. I added a targeted `overrides` block
   (`"@glideapps/glide-data-grid": { "react": "$react", "react-dom": "$react-dom" }`)
   rather than an `.npmrc` `legacy-peer-deps=true` that would relax resolution
   for the whole project. It works, but the library is a major version behind
   the React it is asked to run in, and the only newer publishes are
   `6.0.4-alphaN`. It also drags in five required peers (`lodash`, `marked`,
   `react-responsive-carousel` among them) — 42 packages for one grid.
3. **Timing it honestly.** A React commit does not mean Glide painted; it draws
   from an effect. The mount holds the timed region open until a `<canvas>`
   with non-zero width exists, which is also where `data-scroller` gets set.

**The accessibility claim, corrected.** The brief (and my first draft of the
notes) said cell text is invisible to Ctrl-F, screen readers and selection. Two
of those three are true and I verified them; the screen-reader half is not, so I
did not ship it:

- Selecting the whole host and reading `window.getSelection().toString()`
  returns `""`.
- `window.find("2131FCF5")` returns **false** on the Glide page for a value
  plainly visible on screen, and **true** for the same value on the TanStack
  page. The page heading is found on both, so the check itself is sound.
- But Glide *does* render a hidden `role="grid"` table mirroring the currently
  visible window — 16 rows on the small card, with real `textContent`. A screen
  reader gets the viewport, not nothing. What no assistive tool and no search
  gets is the other 499,985 rows.

The shipped `meta.notes` says exactly that, including the numbers. This is the
kind of caveat that is worth getting right rather than repeating.

---

## Shared infrastructure: `src/harness/react-host.js`

`mountReact(host, element, isPainted?)` returns a **promise** of a cleanup
function (the contract permits it; `mount.js` awaits it inside the timed
region). Two deliberate choices, both about not publishing a fake number:

- **`flushSync(() => root.render(el))`.** A concurrent root's `render()` returns
  almost immediately. Timed as-is, TanStack would have reported "500,000 rows in
  0.2 ms", which measures a scheduling call. `flushSync` puts the whole render
  and commit inside the clock.
- **An optional `isPainted(host)` predicate**, re-checked each animation frame,
  because a canvas grid draws from an effect after commit. It is checked
  synchronously first, so it costs nothing when the commit already produced
  rows — which is the TanStack case; only Glide ever waits a frame. After 600
  frames it rejects, and `mount.js` prints that in the card, because "nothing
  ever appeared" is a result worth showing rather than hanging.

What it deliberately does *not* do is wait for the compositor. The vanilla demos
are timed to "DOM built + layout forced" (`mount.js` reads `offsetHeight` inside
the clock). Adding a paint wait to the React demos only would have tacked a
variable frame of idling onto two of the seven contenders and turned a 4 ms card
into a 20 ms one that is mostly waiting. Same finish line for everyone.

---

## Also changed

- `vite.config.js`: the orphaned-demo guard looked only for
  `src/demos/<key>/main.js`. The two React demos are `main.jsx`, so they were
  silently exempt from the very check that stops a finished demo dropping out of
  the built site. It now accepts either extension.
- `tests/e2e/demo.spec.js`: `tanstack` and `glide` added to `BUILT`, with
  `SOURCE_TOKEN` entries `tr[data-row]` and `dvn-scroller`.
- `src/demos/observable/main.js`: one added disclosure — `@observablehq/inputs`
  has no column-windowing option and builds a `<td>` for every column of every
  row it appends (`src/table.js` line 100), so all 80 columns are live on the
  `wide` card. Verified in the installed source, committed separately.

## Concerns for later tasks

- **Bundle attribution (Task 12).** With both React demos present, Rollup hoists
  React into a shared chunk: `tanstack` measured 259 kB standalone before Glide
  landed, and 65.8 kB + a 193 kB shared `index-*.js` afterwards. A per-demo
  bundle figure that reads only the entry chunk will now understate both React
  demos by ~190 kB and will change depending on which demos exist. The measure
  script needs to walk the import graph, not stat one file.
- **`reportRows` correctly untouched by both.** Both present all 500,000 rows;
  neither caps.
- Chrome's ~33.5 M px element-height ceiling puts a real ceiling on TanStack's
  spacer approach at roughly 1 M rows (32 px each). Not an issue for this
  bake-off; worth a sentence in the final evaluation if it discusses scale
  beyond the datasets tested.
