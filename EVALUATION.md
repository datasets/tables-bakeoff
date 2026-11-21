# Evaluation

The verdict from building the same table with eight open-source JavaScript table libraries and a plain `<table>`, over the same four datasets (1,000 rows, 1,000 rows by 80 columns, 50,000 rows, 500,000 rows of UK property sales), inside the same harness, with the same cell formatter. The method and its caveats are in [ANALYSIS.md](./ANALYSIS.md). What happened while building each demo is in that demo's notes (`src/demos/<key>/README.md`). Scores are 1 to 5, subjective, and come from doing the building.

Every typed-in number here is also in `src/harness/results.js`, which the front page renders from. When the numbers are re-measured, that file and this one are swept together. Bundle sizes and line counts come from `bundles.json`, which the build writes. <!-- VERIFY: render and FPS numbers are from the Sep 2026 run on Nov 2026 versions; sort-at-500k is a Nov 2026 busy-machine run. Sweep after the quiet re-measure. -->

## The verdict

**Use a plain `<table>` until it hurts, which is around a few thousand rows. Past that, AG Grid Community if you want it done, TanStack Table if you want it yours. Tabulator if people need to edit cells. Everything else is a special case.**

The race everyone expects, 500,000 rows, is close to a tie. Every virtualizing grid scrolls at or near 60 fps and renders in 25 to 300 ms, except Perspective at about two seconds, most of which is marshalling 500,000 objects into its WebAssembly worker, and DataTables at ten, which builds its whole model before it shows a row. At 60 fps you cannot see the difference between 25 ms and 250 ms. Sorting all 500,000 rows by price is close too: 0.1 to 0.45 s in every grid, median of 5 on a busy machine (AG Grid 377 ms, Tabulator 397 ms, TanStack 397 ms, DataTables 440 ms, Perspective 346 ms in its worker, RevoGrid 211 ms, Glide 106 ms with our own index sort, Observable Inputs 101 ms). Speed does not pick a winner. Four other things do:

1. **Is the text in the DOM?** A canvas grid is pixels. Browser Ctrl-F and text selection cannot see it, and a screen reader gets whatever hidden mirror the library keeps; copy works only through the grid's own clipboard support. A virtualized DOM grid gives you Ctrl-F, selection, copy and assistive tech for the mounted rows, the ones on screen, and the plain `<table>` for every row. For a data site that is most of the job.
2. **What does it weigh?** Own code, gzipped, over the shared harness: plain `<table>` 1 kB, Observable Inputs 7 kB, TanStack Table 24 kB on a page that already ships React, DataTables 52 kB, Glide 105 kB plus React, RevoGrid about 112 kB once its lazy components load, Perspective 107 kB plus 4.3 MB of WebAssembly, Tabulator 112 kB, AG Grid Community 333 kB with every Community module registered.
3. **How does it fail?** Tabulator's documented `height: "100%"` silently renders every row when the parent has no resolved height: 62 seconds at 50,000 rows instead of 68 ms, nothing logged. AG Grid, given the same mistake, draws a visibly broken 0 px viewport. A silent failure costs more than a missing feature.
4. **Is anyone still shipping it?** Glide Data Grid's last stable release was February 2024 and its peer range is React 16 to 18. Our first draft recommended it for large data on the strength of a 25 ms render. We reversed that. A grid you will live with for three years needs a maintainer more than it needs 200 ms.

## Per use case

### A table in a report or data story, up to a few thousand rows: plain `<table>`

34 lines, 1 kB, about 100 ms for 1,000 rows including layout. It prints, it copies, dark mode is CSS, and nothing can go out of date. Sorting is ten more lines if you want it. The control won its own weight class, and that is the finding: the libraries exist for the point where layout cost goes superlinear, which on this machine was between 10,000 and 50,000 rows (2.6 s at 50,000, 6.9 s at 100,000, about 27 s at 200,000).

**Runner-up: Observable Inputs.** `Inputs.table(rows)` is the best single call in the set: column types inferred, numbers right-aligned, sort on header click. Two caveats. It needs its stylesheet loaded and `select: false` for a read-only table (the demo as first built missed the stylesheet, so ids and dates wrapped mid-word; that was our mistake, not the library's), and it appends rows as you scroll without removing them, so keep it under about ten thousand rows.

### A big grid you want done, in any framework: AG Grid Community

39 lines for sort, filter, row and column virtualization and 500,000 rows at 60 fps with no dropped frames. It was the only library whose configuration mistakes failed loudly: a missing `ModuleRegistry` call throws, and a wrong host height draws an obviously empty grid. The theming API (`themeQuartz.withParams`) took our tokens cleanly.

The costs. It is 333 kB as shipped here, because the demo registers `AllCommunityModule`, which is what the quick start does; register only what you use and it shrinks. And Community is the free tier of a company that sells Enterprise: row grouping, pivot, range selection, clipboard, Excel export and the server-side row model are paywalled. Community is MIT and does everything in this test.

**Runners-up: Tabulator and RevoGrid.** Tabulator is a third of the size, vanilla, MIT, with editors and clipboard free; one trap, below. RevoGrid is the surprise of the set: a framework-free web component that rendered 500,000 rows in 55 ms, the fastest DOM grid measured, at 60 fps everywhere, with row and column virtualization, keyboard navigation and clipboard in the free core, for about 112 kB once its lazily loaded components arrive. Two things keep it from being the default. Its community is a quarter of AG Grid's, and its licence is MIT on paper but the free core shows a "RevoGrid" link in the corner that the docs ask companies to keep or pay $199 to $499 per developer per year. If you can live with that link, it belongs on the shortlist next to AG Grid and Tabulator. <!-- VERIFY: RevoGrid numbers are from a busy-machine run -->

**Not for this job: DataTables 3.** DataTables builds its whole internal model before showing anything (10 seconds for 500,000 rows here, against 0.3 to 0.6 s for Tabulator and AG Grid in the same session), has no column virtualization, and its own FAQ caps client-side data at about 50,000 rows. It is still the right tool for the job it was built for: make a few thousand rows of HTML sortable and searchable, with a search box over every row and real `<td>`s, now without jQuery, in 52 kB. Pick it over a plain `<table>` when you want that search box and sort for free; pick Tabulator over it for anything grid-shaped. <!-- VERIFY: DataTables numbers are from a busy-machine run -->

### A big grid you want to own: TanStack Table with a virtualizer

Headless means it computes rows, sorting and columns and you write every element. The demo is 146 lines because the row virtualizer, the column virtualizer, the spacer cells, the `<colgroup>`, the sticky header and the sort arrows are all ours. What you get back is an ordinary `<table>` in your own markup and your own CSS, 24 kB over React, with adapters for Vue, Svelte, Solid and Angular. Dark mode is the site's variables; there is no theming API because there is nothing to theme.

The costs. v9 is a redesign (`getCoreRowModel()` is gone, features are opt-in through `tableFeatures`), the published docs lag it, and most of what is online describes v8. We spent part of a day in the `.d.ts` files. The spacer-row and column-group arithmetic is yours to get wrong, and we got it wrong twice.

### Editable, spreadsheet-like: Tabulator

Cell editors, clipboard, range selection, grouping and export are in the free MIT package, vanilla, no framework. The edit test backs the pick: on each grid's demo page we double-clicked a price and typed a new one, then pasted three lines onto a price cell, and counted a value only if it reached the data.

| Library | Double-click to edit | Paste a column of three |
|---|---|---|
| Tabulator | Works out of the box (`editor: "number"` on the column) | Needs config: `selectableRange`, `clipboard: true`, `clipboardPasteParser`/`clipboardPasteAction: "range"`, from its own spreadsheet example. Free |
| AG Grid Community | Works out of the box (`editable: true`) | Needs the paid tier: clipboard and cell selection are Enterprise modules; in Community, Ctrl/Cmd-V on a cell does nothing |
| Glide Data Grid | Needs config: Glide holds no data, so you return an editable Number cell and write the value back in `onCellEdited` | Needs config: `onPaste: true` (without it only the first value lands) and `getCellsForSelection` |
| RevoGrid | Works out of the box (`readonly` off) | Works out of the box: pastes down from the focused cell |
| DataTables 3 | Needs the paid tier: the free core has no cell editing; Editor is DataTables Plus, from $219 per developer | Needs the paid tier |

Tabulator stays the pick, now on evidence rather than feature lists: everything an editable grid needs passed, free, with options its own docs show. RevoGrid did slightly better on this test (no extra config at all) and is the runner-up; its corner link and smaller community are why it is not the pick. Handsontable is paid for commercial use.

The trap, since it is the most dangerous configuration in the whole exercise: `height: "100%"`, the option Tabulator's own docs give for filling a container, overrides the host's CSS height with one the parent cannot resolve. Tabulator then measures a 0 px viewport and renders every row. 62 seconds at 50,000 rows, 500,000 effectively never, nothing in the console. Give the host a real height and it is 280 ms. Tabulator is a good library. The documented pattern is the trap, and you will not notice it on a page of 200 rows.

**Also consider Glide Data Grid**, on React 18, when you want the Sheets feel. Canvas, so 500,000 rows render in 25 ms and memory does not move as you scroll. Grid copy works once `getCellsForSelection` is set, which the quick start does not mention: select a range, Ctrl/Cmd-C, and it arrives as tab-separated text. Browser Ctrl-F and text selection cannot see a canvas. Last release February 2024.

### Not a pick: Perspective

Perspective is a query engine with a grid attached. Its WebAssembly boot is timed on its own line on its page ("engine ready in N ms") and kept out of every render figure. The data lives in an Arrow store inside a Web Worker, so sorting, filtering and pivoting 500,000 rows never touches the UI thread. Judge it as a way to explore a dataset too big for the main thread, which it does well, and not as a table component: it has no per-cell formatter and no locale option, so it is the one demo whose dates read `7/26/24` where every other shows `2024-07-26`. The 4.3 MB of WebAssembly is the price of admission. Feeding it an `Array<Object>` is its worst input, and every library got the same array.

## Scorecard

| Library | Lines | Own kB | Default look | API feel | Right first try | Docs | Escape hatch |
|---|---|---|---|---|---|---|---|
| Plain `<table>` | 34 | 1.1 | 4 | 5 | 5 | 5 | 5 |
| Observable Inputs | 32 | 6.7 | 3 | 5 | 3 | 3 | 2 |
| Tabulator | 69 | 112 | 3 | 4 | 1 | 4 | 3 |
| AG Grid Community | 39 | 333 | 4 | 4 | 3 | 4 | 4 |
| TanStack Table | 146 | 24 (+69 React) | 5 | 3 | 2 | 2 | 5 |
| Glide Data Grid | 123 | 105 (+69 React) | 4 | 4 | 3 | 3 | 2 |
| Perspective | 48 | 107 (+4.3 MB WASM) | 3 | 3 | 4 | 2 | 1 |
| DataTables 3 | 55 | 52 | 3 | 4 | 2 | 4 | 4 |
| RevoGrid | 52 | 30 (+82 lazy) | 3 | 4 | 3 | 3 | 3 |

**Default look** is how the table looks before you touch the CSS. Plain and TanStack are our CSS, so they look like the site (4 and 5). Observable is tidy once its stylesheet is loaded, but the CSS is light only with no theming hook (3). Perspective is monospace, blue numbers, locale-short dates and a title bar (3). Glide's theme object is the best of the set, one plain bag of tokens (4). DataTables themes through CSS variables but its dark mode keys on a class this site does not set, so the first try was a dark page with light stripes (3). RevoGrid's columns are a fixed 100 px with no auto-fit, and the free core puts its own link in the corner (3).

**API feel** is how much of the code reads as what you meant. `Inputs.table(rows)` is the best call here (5). AG Grid and Tabulator are a config object to a constructor (4). TanStack v9 is a redesign with opt-in features and a lot of plumbing (3). Perspective needs two WASM URLs and a global table namespace (3).

**Right first try** is how far the library fought between code that looked right and a table that was. Tabulator's documented option cost 62 seconds with no warning (1). TanStack's spacer-row and colgroup arithmetic, plus v8-only answers online (2). DataTables' dark mode was half done, its scroll height excludes its own search box and info line, and the defaults are slow at scale (2). AG Grid threw on a missing module registration and had renamed its scroller class, but both failures were visible (3). RevoGrid's `aftergridrender` event fires with zero cells in the DOM, and two elements claim to be the scroller (3). Perspective worked on the first run (4).

**Docs**: TanStack v9 had only the `.d.ts` files (2). Perspective's good docs are markdown in the repo and invisible from npm (2). Tabulator's docs are complete and contain the trap (4). AG Grid's are complete but most tutorials online predate the v33 theming and module changes (4).

**Escape hatch** is how far down you can reach when the API runs out. TanStack is all yours (5). Plain is the DOM (5). AG Grid has cell renderers, a theming API and a large option surface (4). DataTables is a real `<table>` with a plugin ecosystem (4). RevoGrid is a web component with plugins, and the richer ones are Pro (3). Canvas has no DOM to reach (Glide 2). Perspective has no per-cell formatter and no locale (1).

## What surprised us

- **A hand-written `<table>` cannot render 500,000 rows at all.** Uncapped, we gave up after ten minutes with the tab unresponsive. The cost is layout, not string building: auto table layout must measure every cell in a column before it can size the column, and that goes superlinear past about 100,000 rows.
- **The most dangerous line of code came from a library's own docs.** Tabulator's `height: "100%"`, above. The failure is the silence.
- **Glide draws 500,000 rows faster than 1,000.** Canvas paints a fixed viewport and is handed a row count and a cell callback; it never touches the data. The bill is everything the DOM would have given you.
- **Headless means you write the virtualizer.** TanStack is the smallest React bundle here and the most lines. The spread, 32 lines to 146, is the spread between "hand it rows" and "own the table".
- **The fastest DOM grid was the one nobody shortlists.** RevoGrid, 55 ms at 500,000 rows, real cells, any framework. Its community and its attribution link are what keep it off the top line.
- **Render time is not the differentiator.** Between 25 ms and 300 ms at 500,000 rows, nobody can tell. Bundle size spans two and a half orders of magnitude, 1 kB to 333 kB, and that is a load-time cost every visitor pays.

## What we did not test

- **Filtering at 500,000 rows.** Observed, not timed. Sorting is timed (above and on each large card); filtering is not.
- **Editing beyond one column.** The edit test covers double-click edit and pasting a column into five grids (above). Validation, undo, multi-column paste and fill handles were not tested.
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

- **Handsontable**: paid for commercial use since v7.
- **MUI X Data Grid**: the MIT tier caps pages at 100 rows and keeps column pinning, tree data and aggregation in Pro and Premium; theming runs through MUI's system.
- **react-data-grid**: still a beta, React 19 only; the TanStack demo already covers a virtualized `<table>` in React.
- **SlickGrid**: 6.0 is MIT and real, and shows what AG Grid and Tabulator already show here.
- **Grid.js**: no release since March 2024.
- **Kendo, DevExtreme, Syncfusion, Bryntum**: commercial.
