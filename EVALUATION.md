# Evaluation

We built the same table with eight open-source JavaScript table libraries and a plain `<table>`, over the same four datasets (1,000 rows, 1,000 rows by 80 columns, 50,000 rows, 500,000 rows of UK property sales), in the same harness, with the same cell formatter for every library except Perspective, which has no per-cell formatter hook. This is what we found. The method and its caveats are in [ANALYSIS.md](./ANALYSIS.md). What happened while building each demo is in that demo's notes (`src/demos/<key>/README.md`). Scores are 1 to 5, subjective, and come from doing the building.

Every typed-in number here is also in `src/harness/results.js`, which the front page renders from. When the numbers are re-measured, that file and this one are swept together. Bundle sizes and line counts come from `bundles.json`, which the build writes. All render, sort and FPS figures are medians of five fresh page loads from `scripts/measure-all.mjs` on 2026-11-21 (Apple M4, production build, headless Chromium); raw runs and ranges are in `docs/reports/measurements-2026-11-21.md`.

## The verdict

One pick per job:

| Job | Use | Runner-up |
|---|---|---|
| A table on a page (a report, an article, docs; up to a few thousand rows) | Plain `<table>` | Observable Inputs |
| A big grid (tens of thousands to 500,000 rows, sort and filter out of the box, any framework) | AG Grid Community | RevoGrid |
| An editable grid (edit cells, paste ranges, spreadsheet-like) | Tabulator | RevoGrid |

If you are in React and want your own markup and CSS, use TanStack Table with a virtualizer. That is what DataHub does: we already ship React and want to own the markup, and in exchange we write search, keyboard handling and virtualization ourselves.

We timed 500,000 rows first. Five grids render 500,000 rows in under a quarter of a second: Glide 17 ms, RevoGrid 62 ms, TanStack 124 ms, Tabulator 185 ms and AG Grid 233 ms. All five scrolled at 60 fps in our scripted run. Perspective takes 1.9 s, most of it moving 500,000 objects into its WebAssembly worker. DataTables takes 8.5 s because it builds its whole model before it shows a row. Sorting all 500,000 rows by price takes 0.1 to 0.46 s in every grid, median of 5 fresh page loads: Glide 98 ms (our own index sort), Observable Inputs 104 ms, RevoGrid 194 ms, Perspective 346 ms (in its worker), AG Grid 369 ms, Tabulator 415 ms, TanStack 418 ms, DataTables 459 ms. A slow first render or a slow sort is a wait people notice, and 60 fps scrolling does not hide it. The five fast grids are close on both, though, so we compared them on four other things.

1. Text. Four separate things get lumped together here. Text in the DOM: every grid except Glide, which is canvas, puts the visible cells in the DOM, so browser Ctrl-F finds the mounted rows (the plain `<table>` has every row). Browser text selection: a mouse drag selects cells in the plain table, Observable, Tabulator, TanStack and DataTables. AG Grid draws grid markup (`div role="grid"`), not a `<table>`, and blocks selection unless you set `enableCellTextSelection`, which our demo does not; Perspective and RevoGrid block it too. Grid copy, select a range and Ctrl/Cmd-C, is a library feature: Glide with `getCellsForSelection`, RevoGrid by default, Tabulator with `clipboard: true`, AG Grid only in Enterprise. Accessibility: we checked one thing, keyboard sort (below), and did not test any grid with a screen reader. For a data site, text people can find and copy is most of the job.
2. Weight. Own code, gzipped, over the shared harness: plain `<table>` 1 kB, Observable Inputs 8 kB with its stylesheet, TanStack Table 24 kB on a page that already ships React, DataTables 52 kB, Glide 105 kB plus React, RevoGrid about 118 kB once its lazy components load, Perspective 107 kB plus 4.3 MB of WebAssembly, Tabulator 112 kB, AG Grid Community 333 kB with every Community module registered (272 kB with only the modules it uses).
3. How it fails. Tabulator's documented `height: "100%"` silently renders every row when the parent has no resolved height: 88 seconds at 50,000 rows instead of 36 ms with a sized parent, and nothing logged. AG Grid, given the same mistake, draws a visibly broken 0 px viewport.
4. Is anyone still shipping it. Glide Data Grid's last stable release was February 2024 and its peer range is React 16 to 18. Our first draft recommended it for large data on the strength of a 25 ms render. We dropped it: a grid you cannot get fixes for is a bad bet, however fast.

## Per job

### A table on a page: plain `<table>`

Up to a few thousand rows. 39 lines, 1 kB, about 55 ms for 1,000 rows including layout. It prints and copies, dark mode is plain CSS, and there is nothing to go out of date. Sorting is ten more lines. The libraries exist for the point where layout cost goes superlinear, which on this machine was between 10,000 and 50,000 rows (2.5 s at 50,000, 6.3 s at 100,000, about 27 s at 200,000, the last from an earlier run).

**Runner-up: Observable Inputs.** `Inputs.table(rows)` is the best single call in the set: it infers column types, right-aligns numbers and sorts on header click. Two caveats. Load its stylesheet and pass `select: false` for a read-only table (our demo as first built missed the stylesheet, so ids and dates wrapped mid-word; our mistake, not the library's). And it appends rows as you scroll without removing them, so keep it under about ten thousand rows.

**If you want a search box: DataTables 3.** It makes a few thousand rows of HTML sortable and searchable, with a search box over every row and real `<td>`s, now without jQuery, in 52 kB. Pick it over a plain `<table>` for that search box; pick Tabulator over it for anything grid-shaped. It is not for big grids: it builds its whole internal model before showing anything (8.5 seconds for 500,000 rows here, against 0.19 to 0.23 s for Tabulator and AG Grid in the same run), has no column virtualization, and its own FAQ caps client-side data at about 50,000 rows.

### A big grid: AG Grid Community

Tens of thousands to 500,000 rows, sort and filter out of the box, any framework. 40 lines for sort, filter, row and column virtualization and 500,000 rows at 60 fps, dropping one frame per run like the other fast grids. It was the only library whose configuration mistakes failed loudly: a missing `ModuleRegistry` call throws, and a wrong host height draws an obviously empty grid. The theming API (`themeQuartz.withParams`) took our tokens cleanly.

It is 333 kB as shipped here, because the demo registers `AllCommunityModule`, which is what the quick start does. Registering only the six modules the demo uses (client-side row model, text, number and date filters, cell style, number editor) measured 272 kB against 334 kB through the same build (`scripts/measure-aggrid-lean.mjs`): about a fifth off, and still the heaviest grid here. And Community is the free tier of a company that sells Enterprise: row grouping, pivot, range selection, clipboard, Excel export and the server-side row model are paywalled. Community is MIT and does everything in this test.

**Runner-up: RevoGrid.** A framework-free web component that rendered 500,000 rows in 62 ms, the fastest DOM grid we measured, at 60 fps everywhere, with row and column virtualization, keyboard navigation and clipboard in the free core, for about 118 kB once its lazily loaded components arrive. Its community is a quarter of AG Grid's, and its licence is MIT on paper but the free core shows a "RevoGrid" link in the corner that the docs ask companies to keep or pay $199 to $499 per developer per year. If you can live with that link, it belongs on the shortlist next to AG Grid and Tabulator.

**Also: Tabulator.** A third of AG Grid's size, vanilla, MIT, with editors and clipboard free. One trap, below.

### An editable grid: Tabulator

Spreadsheet-like: edit cells, paste ranges. Cell editors, clipboard, range selection, grouping and export are in the free MIT package, vanilla, no framework. We ran the same edit test on each grid that edits: double-click a price and type a new one, then paste three lines onto a price cell, and count a value only if it reached the data.

| Library | Double-click to edit | Paste a column of three |
|---|---|---|
| Tabulator | Works out of the box (`editor: "number"` on the column) | Needs config: `selectableRange`, `clipboard: true`, `clipboardPasteParser`/`clipboardPasteAction: "range"`, from its own spreadsheet example. Free |
| AG Grid Community | Works out of the box (`editable: true`) | Needs the paid tier: clipboard and cell selection are Enterprise modules; in Community, Ctrl/Cmd-V on a cell does nothing |
| Glide Data Grid | Needs config: Glide holds no data, so you return an editable Number cell and write the value back in `onCellEdited` | Needs config: `onPaste: true` (without it only the first value lands) and `getCellsForSelection` |
| RevoGrid | Works out of the box (`readonly` off) | Works out of the box: pastes down from the focused cell |
| DataTables 3 | Needs the paid tier: the free core has no cell editing; Editor is DataTables Plus, from $219 per developer | Needs the paid tier |

Everything an editable grid needs passed, free, with options from Tabulator's own docs. RevoGrid did slightly better on this test (no extra config at all) and is the runner-up; its corner link and smaller community are why it is not the pick. Handsontable is paid for commercial use.

The trap: `height: "100%"`, the option Tabulator's own docs give for filling a container, overrides the host's CSS height with one the parent cannot resolve. Tabulator then measures a 0 px viewport and renders every row. 88 seconds at 50,000 rows, nothing in the console. Give the host a real height and the same 50,000 rows take 36 ms. The library is fine; the documented option is not, and a page of 200 rows will not show it.

**Also: Glide Data Grid**, on React 18, if you want the Sheets feel. Canvas, so 500,000 rows render in 17 ms. Grid copy works once `getCellsForSelection` is set, which the quick start does not mention: select a range, Ctrl/Cmd-C, and it arrives as tab-separated text. Browser Ctrl-F and text selection cannot see a canvas. Last release February 2024.

### Build your own: TanStack Table with a virtualizer

For when you want your own markup and CSS. Headless means TanStack computes rows, sorting and columns and you write every element. The demo is 150 lines because the row virtualizer, the column virtualizer, the spacer cells, the `<colgroup>`, the sticky header and the sort buttons are all ours. The sort control is a `<button>` inside each `<th>`, with `aria-sort` on the `<th>`, so headers sort from the keyboard; the first version had a click handler on the `<th>` and nothing else, so it was mouse only. What you get back is an ordinary `<table>` in your own markup and your own CSS, 24 kB over React, with adapters for Vue, Svelte, Solid and Angular. Dark mode is the site's variables; there is no theming API, it is your CSS.

v9 is a redesign (`getCoreRowModel()` is gone, features are opt-in through `tableFeatures`), the published docs lag it, and most of what is online describes v8. We spent part of a day in the `.d.ts` files. And the spacer-row and column-group arithmetic is yours to get wrong; we got it wrong twice.

This is what DataHub uses. Why is under [What DataHub will use](#what-datahub-will-use).

### Not a pick: Perspective

Perspective is a query engine with a grid attached. Its WebAssembly boot is timed on its own line on its page ("engine ready in N ms") and kept out of every render figure. The data lives in an Arrow store inside a Web Worker, so sorting, filtering and pivoting 500,000 rows never touches the UI thread. It is good for exploring a dataset too big for the main thread. As a table component it falls short: it has no per-cell formatter and no locale option, so it is the one demo whose dates read `7/26/24` where every other shows `2024-07-26`, and it needs 4.3 MB of WebAssembly. Feeding it an `Array<Object>` is its worst input, and every library got the same array.

## Scorecard

| Library | Lines | Own kB | Default look | API feel | Right first try | Docs | Escape hatch |
|---|---|---|---|---|---|---|---|
| Plain `<table>` | 39 | 1.0 | 4 | 5 | 5 | 5 | 5 |
| Observable Inputs | 36 | 8.3 | 3 | 5 | 3 | 3 | 2 |
| Tabulator | 70 | 112 | 3 | 4 | 1 | 4 | 3 |
| AG Grid Community | 40 | 332 (272 lean) | 4 | 4 | 3 | 4 | 4 |
| TanStack Table | 150 | 24 (+69 React) | 5 | 3 | 2 | 2 | 5 |
| Glide Data Grid | 128 | 105 (+69 React) | 4 | 4 | 3 | 3 | 2 |
| Perspective | 63 | 107 (+4.3 MB WASM) | 3 | 3 | 4 | 2 | 1 |
| DataTables 3 | 56 | 52 | 3 | 4 | 2 | 4 | 4 |
| RevoGrid | 52 | 30 (+88 lazy) | 3 | 4 | 3 | 3 | 3 |

**Default look** is how the table looks before you touch the CSS. Plain and TanStack are our CSS, so they look like the site (4 and 5). Observable is tidy once its stylesheet is loaded, but the CSS is light only with no theming hook (3). Perspective is monospace, blue numbers, locale-short dates and a title bar (3). Glide's theme object is the best of the set, one plain bag of tokens (4). DataTables themes through CSS variables but its dark mode keys on a class this site does not set, so the first try was a dark page with light stripes (3). RevoGrid's columns are a fixed 100 px with no auto-fit, and the free core puts its own link in the corner (3).

**API feel** is how much of the code reads as what you meant. `Inputs.table(rows)` is the best call here (5). AG Grid and Tabulator are a config object to a constructor (4). TanStack v9 is a redesign with opt-in features and a lot of plumbing (3). Perspective needs two WASM URLs and a global table namespace (3).

**Right first try** is how far the library fought between code that looked right and a table that was. Tabulator's documented option cost 88 seconds with no warning (1). TanStack's spacer-row and colgroup arithmetic, plus v8-only answers online (2). DataTables' dark mode was half done, its scroll height excludes its own search box and info line, and the defaults are slow at scale (2). AG Grid threw on a missing module registration and had renamed its scroller class, but both failures were visible (3). RevoGrid's `aftergridrender` event fires with zero cells in the DOM, and two elements claim to be the scroller (3). Perspective worked on the first run (4).

**Docs**: TanStack v9 had only the `.d.ts` files (2). Perspective's good docs are markdown in the repo and invisible from npm (2). Tabulator's docs are complete and contain the trap (4). AG Grid's are complete but most tutorials online predate the v33 theming and module changes (4).

**Escape hatch** is how far down you can reach when the API runs out. TanStack is all yours (5). Plain is the DOM (5). AG Grid has cell renderers, a theming API and a large option surface (4). DataTables is a real `<table>` with a plugin ecosystem (4). RevoGrid is a web component with plugins, and the richer ones are Pro (3). Canvas has no DOM to reach (Glide 2). Perspective has no per-cell formatter and no locale (1).

## What surprised us

- **A hand-written `<table>` cannot render 500,000 rows at all.** Uncapped, we gave up after ten minutes with the tab unresponsive. The cost is layout, not string building: auto table layout must measure every cell in a column before it can size the column, and that goes superlinear past about 100,000 rows.
- **The most dangerous line of code came from a library's own docs.** Tabulator's `height: "100%"`, above. The failure is the silence.
- **Glide draws 500,000 rows faster than 1,000.** Canvas paints a fixed viewport and is handed a row count and a cell callback; it never touches the data. The bill is everything the DOM would have given you.
- **Headless means you write the virtualizer.** TanStack is the smallest React bundle here and the most lines. The spread, 36 lines to 150, is the spread between "hand it rows" and "own the table".
- **The fastest DOM grid was the one nobody shortlists.** RevoGrid, 62 ms at 500,000 rows, real cells, any framework. Its community and its attribution link are what keep it off the top line.
- **Render time did not pick between the fast grids.** Five render 500,000 rows in 17 to 233 ms. Bundle size spans two and a half orders of magnitude, 1 kB to 333 kB, and that is a load-time cost every visitor pays.

## What we did not test

- **Filtering at 500,000 rows.** Observed, not timed. Sorting is timed (above and on each large card); filtering is not.
- **Editing beyond one column.** The edit test covers double-click edit and pasting a column into five grids (above). Validation, undo, multi-column paste and fill handles were not tested.
- **Accessibility, beyond keyboard sort.** We checked one thing on every demo with Playwright: Tab from the top of the 1,000-row embed until a column header has focus, press Enter, see if the rows sort. AG Grid, DataTables and TanStack sort. Observable, Tabulator, Perspective and RevoGrid sort on a click, but Tab never reaches a header. The plain table and Glide demos have no header sort. Not tested: screen readers, arrow-key navigation inside the grid, focus while scrolling. Glide's hidden `role="grid"` mirror was seen in the DOM, not tried with a screen reader. Native table markup does not settle accessibility on its own.
- **Column pinning, resize, filter rows.** Not in the harness. The summary-stats spike on TanStack has a filter row.
- **Mobile performance.** The layout works at 375 px; FPS was measured in desktop headless Chromium only.
- **Arrow or CSV input for Perspective.** Everyone got the same `Array<Object>`. An Arrow buffer would very likely cut Perspective's 500,000-row figure hard.
- **More machines and browsers.** Render numbers are one machine and one headless Chromium, the median of five fresh page loads, with min to max published in `docs/reports/measurements-2026-11-21.md`. Treat them as an order of magnitude. Every demo page measures again in your browser.

## What DataHub will use

**TanStack Table with react-virtual, wrapped once as a `<DataTable>` component in PortalJS.**

DataHub pages already ship React, so the table costs 24 kB, not 333. We want to own the markup and CSS: the dataset preview has to be text people can find with Ctrl-F and copy a postcode out of, and the theme is our own CSS variables, with no third-party theme to fight. In return we take on search, keyboard behaviour and virtualization ourselves. Ctrl-F only sees the mounted rows, so searching a whole dataset is our own search box, and the keyboard sort on the demo is ours too. Both spikes on this site, the summary-statistics-and-filter table and the DuckDB-WASM query demo, were built on it and composed without surprises. The cost is 150 lines we own, written once, and a v9 docs gap we have already paid for.

For portals that are not React (CKAN, for instance), we would say Tabulator, with a sized parent. For a quick table in a data story, we will keep writing `<table>`.

## Considered, not included

- **Handsontable**: paid for commercial use since v7.
- **MUI X Data Grid**: the MIT tier caps pages at 100 rows and keeps column pinning, tree data and aggregation in Pro and Premium; theming runs through MUI's system.
- **react-data-grid**: still a beta, React 19 only; the TanStack demo already covers a virtualized `<table>` in React.
- **SlickGrid**: 6.0 is MIT and real, and shows what AG Grid and Tabulator already show here.
- **Grid.js**: no release since March 2024.
- **Kendo, DevExtreme, Syncfusion, Bryntum**: commercial.
