# Evaluation

The verdict from building the same table with every serious open-source JavaScript table library and a plain `<table>`, over the same four datasets (1,000 rows, 1,000 rows by 80 columns, 50,000 rows, 500,000 rows of UK property sales), inside the same harness, with the same cell formatter. The method and its caveats are in [ANALYSIS.md](./ANALYSIS.md). What happened while building each demo is in that demo's notes (`src/demos/<key>/README.md`). Scores are 1 to 5, subjective, and come from doing the building.

Every typed-in number here is also in `src/harness/results.js`, which the front page renders from. When the numbers are re-measured, that file and this one are swept together. Bundle sizes and line counts come from `bundles.json`, which the build writes. <!-- VERIFY: numbers below are from the Sep 2026 run on Nov 2026 versions; sweep after the re-measure, the sort-at-500k test and the edit test land -->

## The verdict

**Use a plain `<table>` until it hurts, which is around a few thousand rows. Past that, AG Grid Community if you want it done, TanStack Table if you want it yours. Tabulator if people need to edit cells. Everything else is a special case.**

The race everyone expects, 500,000 rows, is close to a tie. Every virtualizing grid scrolls at or near 60 fps and renders in 25 to 300 ms, except Perspective at about two seconds, most of which is marshalling 500,000 objects into its WebAssembly worker. At 60 fps you cannot see the difference between 25 ms and 250 ms. Speed does not pick a winner. Four other things do:

1. **Is the text in the DOM?** A canvas grid is pixels. Find-in-page cannot see it and a screen reader gets whatever hidden mirror the library keeps. A real `<table>` gives you selection, copy and assistive tech for the rows on screen. For a data site that is most of the job.
2. **What does it weigh?** Own code, gzipped, over the shared harness: plain `<table>` 1 kB, Observable Inputs 7 kB, TanStack Table 24 kB on a page that already ships React, Glide 105 kB plus React, Perspective 107 kB plus 4.3 MB of WebAssembly, Tabulator 112 kB, AG Grid Community 333 kB with every Community module registered.
3. **How does it fail?** Tabulator's documented `height: "100%"` silently renders every row when the parent has no resolved height: 62 seconds at 50,000 rows instead of 68 ms, nothing logged. AG Grid, given the same mistake, draws a visibly broken 0 px viewport. A silent failure costs more than a missing feature.
4. **Is anyone still shipping it?** Glide Data Grid's last stable release was February 2024 and its peer range is React 16 to 18. Our first draft recommended it for large data on the strength of a 25 ms render. We reversed that. A grid you will live with for three years needs a maintainer more than it needs 200 ms.

## Per use case

### A table in a report or data story, up to a few thousand rows: plain `<table>`

34 lines, 1 kB, about 100 ms for 1,000 rows including layout. It prints, it copies, dark mode is CSS, and nothing can go out of date. Sorting is ten more lines if you want it. The control won its own weight class, and that is the finding: the libraries exist for the point where layout cost goes superlinear, which on this machine was between 10,000 and 50,000 rows (2.6 s at 50,000, 6.9 s at 100,000, about 27 s at 200,000).

**Runner-up: Observable Inputs.** `Inputs.table(rows)` is the best single call in the set: column types inferred, numbers right-aligned, sort on header click. Two caveats. Its default look needs `width` and `layout` options before it is presentable (the demo as first built passed neither, and it showed), and it appends rows as you scroll without removing them, so keep it under about ten thousand rows.

### A big grid you want done, in any framework: AG Grid Community

39 lines for sort, filter, row and column virtualization and 500,000 rows at 60 fps with no dropped frames. It was the only library whose configuration mistakes failed loudly: a missing `ModuleRegistry` call throws, and a wrong host height draws an obviously empty grid. The theming API (`themeQuartz.withParams`) took our tokens cleanly.

The costs. It is 333 kB as shipped here, because the demo registers `AllCommunityModule`, which is what the quick start does; register only what you use and it shrinks. And Community is the free tier of a company that sells Enterprise: row grouping, pivot, range selection, clipboard, Excel export and the server-side row model are paywalled. Community is MIT and does everything in this test.

**Runner-up: Tabulator.** A third of the size, vanilla, MIT, with editors and clipboard free. One trap, below.

### A big grid you want to own: TanStack Table with a virtualizer

Headless means it computes rows, sorting and columns and you write every element. The demo is 146 lines because the row virtualizer, the column virtualizer, the spacer cells, the `<colgroup>`, the sticky header and the sort arrows are all ours. What you get back is an ordinary `<table>` in your own markup and your own CSS, 24 kB over React, with adapters for Vue, Svelte, Solid and Angular. Dark mode is the site's variables; there is no theming API because there is nothing to theme.

The costs. v9 is a redesign (`getCoreRowModel()` is gone, features are opt-in through `tableFeatures`), the published docs lag it, and most of what is online describes v8. We spent part of a day in the `.d.ts` files. The spacer-row and column-group arithmetic is yours to get wrong, and we got it wrong twice.

### Editable, spreadsheet-like: Tabulator

Cell editors, clipboard, range selection, grouping and export are in the free MIT package, vanilla, no framework. AG Grid Community puts range selection and clipboard behind Enterprise. Handsontable is paid for commercial use. That leaves Tabulator as the one maintained vanilla grid where editing is free.

**This is the weakest call on the page.** No demo here tests editing yet; the pick is from the feature lists and a spot check. An edit test (double-click a price, paste a column) is in progress. <!-- VERIFY after the edit test -->

The trap, since it is the most dangerous configuration in the whole exercise: `height: "100%"`, the option Tabulator's own docs give for filling a container, overrides the host's CSS height with one the parent cannot resolve. Tabulator then measures a 0 px viewport and renders every row. 62 seconds at 50,000 rows, 500,000 effectively never, nothing in the console. Give the host a real height and it is 280 ms. Tabulator is a good library. The documented pattern is the trap, and you will not notice it on a page of 200 rows.

**Runner-up: Glide Data Grid**, on React 18, when you want the Sheets feel. Canvas, so 500,000 rows render in 25 ms and memory does not move as you scroll. Copy works once `getCellsForSelection` is set, which the quick start does not mention. Find-in-page cannot see a canvas. Last release February 2024.

### Not a pick: Perspective

Perspective is a query engine with a grid attached. The data lives in an Arrow store inside a Web Worker, so sorting, filtering and pivoting 500,000 rows never touches the UI thread. Judge it as a way to explore a dataset too big for the main thread, which it does well, and not as a table component: it has no per-cell formatter and no locale option, so it is the one demo whose dates read `7/26/24` where every other shows `2024-07-26`. The 4.3 MB of WebAssembly is the price of admission. Feeding it an `Array<Object>` is its worst input, and every library got the same array.

## Scorecard

| Library | Lines | Own kB | Default look | API feel | Right first try | Docs | Escape hatch |
|---|---|---|---|---|---|---|---|
| Plain `<table>` | 34 | 1.1 | 4 | 5 | 5 | 5 | 5 |
| Observable Inputs | 32 | 6.7 | 2 | 5 | 3 | 3 | 2 |
| Tabulator | 69 | 112 | 3 | 4 | 1 | 4 | 3 |
| AG Grid Community | 39 | 333 | 4 | 4 | 3 | 4 | 4 |
| TanStack Table | 146 | 24 (+69 React) | 5 | 3 | 2 | 2 | 5 |
| Glide Data Grid | 123 | 105 (+69 React) | 4 | 4 | 3 | 3 | 2 |
| Perspective | 48 | 107 (+4.3 MB WASM) | 3 | 3 | 4 | 2 | 1 |

**Default look** is how the table looks before you touch the CSS. Plain and TanStack are our CSS, so they look like the site (4 and 5). Observable wraps ids and dates mid-token and ships light-only CSS with no theming hook (2). Perspective is monospace, blue numbers, locale-short dates and a title bar (3). Glide's theme object is the best of the set, one plain bag of tokens (4).

**API feel** is how much of the code reads as what you meant. `Inputs.table(rows)` is the best call here (5). AG Grid and Tabulator are a config object to a constructor (4). TanStack v9 is a redesign with opt-in features and a lot of plumbing (3). Perspective needs two WASM URLs and a global table namespace (3).

**Right first try** is how far the library fought between code that looked right and a table that was. Tabulator's documented option cost 62 seconds with no warning (1). TanStack's spacer-row and colgroup arithmetic, plus v8-only answers online (2). AG Grid threw on a missing module registration and had renamed its scroller class, but both failures were visible (3). Perspective worked on the first run (4).

**Docs**: TanStack v9 had only the `.d.ts` files (2). Perspective's good docs are markdown in the repo and invisible from npm (2). Tabulator's docs are complete and contain the trap (4). AG Grid's are complete but most tutorials online predate the v33 theming and module changes (4).

**Escape hatch** is how far down you can reach when the API runs out. TanStack is all yours (5). Plain is the DOM (5). AG Grid has cell renderers, a theming API and a large option surface (4). Canvas has no DOM to reach (Glide 2). Perspective has no per-cell formatter and no locale (1).

## What surprised us

- **A hand-written `<table>` cannot render 500,000 rows at all.** Uncapped, we gave up after ten minutes with the tab unresponsive. The cost is layout, not string building: auto table layout must measure every cell in a column before it can size the column, and that goes superlinear past about 100,000 rows.
- **The most dangerous line of code came from a library's own docs.** Tabulator's `height: "100%"`, above. The failure is the silence.
- **Glide draws 500,000 rows faster than 1,000.** Canvas paints a fixed viewport and is handed a row count and a cell callback; it never touches the data. The bill is everything the DOM would have given you.
- **Headless means you write the virtualizer.** TanStack is the smallest React bundle here and the most lines. The spread, 32 lines to 146, is the spread between "hand it rows" and "own the table".
- **Render time is not the differentiator.** Between 25 ms and 300 ms at 500,000 rows, nobody can tell. Bundle size spans two and a half orders of magnitude, 1 kB to 333 kB, and that is a load-time cost every visitor pays.

## What we did not test

- **Sorting and filtering at 500,000 rows.** Observed, not timed. A timed sort is in progress. <!-- VERIFY -->
- **Editing.** No demo edits a cell yet. See the Tabulator pick. <!-- VERIFY -->
- **Accessibility.** One library (Glide) was checked for its hidden `role="grid"` mirror. Keyboard navigation and screen-reader announcements were not tested across the set. Native table markup does not settle this on its own; the TanStack demo sorts on a header click with no focusable button.
- **Column pinning, resize, filter rows.** Not in the harness. The summary-stats spike on TanStack has a filter row.
- **Mobile performance.** The layout works at 375 px; FPS was measured in desktop headless Chromium only.
- **Arrow or CSV input for Perspective.** Everyone got the same `Array<Object>`. An Arrow buffer would very likely cut Perspective's 500,000-row figure hard.
- **Repeated runs with spread.** Render numbers are one machine, a handful of runs each, typed in. Treat them as an order of magnitude. Every demo page measures again in your browser.

## What DataHub will use

**TanStack Table with react-virtual, wrapped once as a `<DataTable>` component in PortalJS.**

DataHub pages already ship React, so the table costs 24 kB, not 333. The dataset preview has to be text: people copy a postcode out of it, search it, read it with assistive tech, and search engines index it. The theme is our own CSS variables, with no third-party theme to fight. Both spikes on this site, the summary-statistics-and-filter table and the DuckDB-WASM query demo, were built on it and composed without surprises. The cost is 146 lines we own, written once, and a v9 docs gap we have already paid for.

For portals that are not React (CKAN, for instance), we would say Tabulator, with a sized parent. For a quick table in a data story, we will keep writing `<table>`.

## Considered, not included

- **DataTables 3** and **RevoGrid** are being added as entries 8 and 9. <!-- VERIFY: rewrite this line when they land -->
- **Handsontable**: paid for commercial use since v7.
- **MUI X Data Grid**: the MIT tier caps pages at 100 rows and keeps column pinning, tree data and aggregation in Pro and Premium; theming runs through MUI's system.
- **react-data-grid**: still a beta, React 19 only; the TanStack demo already covers a virtualized `<table>` in React.
- **SlickGrid**: 6.0 is MIT and real, and shows what AG Grid and Tabulator already show here.
- **Grid.js**: no release since March 2024.
- **Kendo, DevExtreme, Syncfusion, Bryntum**: commercial.
