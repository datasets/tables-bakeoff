# DataTables 3 and RevoGrid: entries eight and nine

Both libraries are on the site as vanilla demos: `src/demos/datatables/` and `src/demos/revogrid/`, with pages at `/demos/datatables.html` and `/demos/revogrid.html`, cards and scorecard rows on the hub, and e2e coverage. They were added by following README "Adding an eighth library": same harness, same theme tokens, same `formatCell`.

## Verdict

**DataTables 3** is still the library you reach for when the job is "make this HTML table sortable and searchable" on a few thousand rows, and dropping jQuery makes it a clean install for that. It is not a data grid in the AG Grid, Tabulator or Glide sense. It builds its whole internal model before showing anything (10 s for 500,000 rows here, against 0.3 to 0.6 s for Tabulator and AG Grid in the same session), it has no column virtualization (the 80-column card is its worst FPS), and its own FAQ caps client-side data at about 50,000 rows. Its real edge over the grids is that cells are real `<td>`s with a built-in search box over every row, and it is light (52 kB own code). Pick it over Tabulator only for small, document-like tables where progressive enhancement of markup matters; for anything grid-shaped, Tabulator does the same job faster with more in the free tier.

**RevoGrid** is the surprise. It was the fastest DOM-based grid measured on 500,000 rows (55 ms, flat across all sizes) and held 60 fps everywhere, with row and column virtualization, keyboard navigation and clipboard in the free core, and it works in any framework because it is a web component. Against AG Grid it trades ecosystem, documentation depth and polish for a third of the bytes; against Tabulator it is faster at scale but thinner in free features (no free export, richer filters are Pro); against TanStack it is the opposite philosophy (a finished grid, not headless). Two things hold it back from being a default: a much smaller community (3.5k stars against AG Grid's 15.6k), and a licence that is MIT on paper but asks companies to keep a corner "RevoGrid" link or pay $199 to $499 per developer per year. If you want a vanilla grid that is fast at any size and you can live with that attribution, it deserves a place next to AG Grid and Tabulator on the shortlist.

## Numbers

Machine: Apple M4 (10 cores, 16 GB), macOS 15.6. Browser: Playwright headless Chromium 151.0.7922.34 (headless shell), 1400×1000, light theme, Vite 7.3.6 dev server. Date: 2026-11-20. Method as in ANALYSIS.md and the task 11/12 reports: the harness render clock (`timeRender` in `src/harness/mount.js`) and `measureScrollFps` (120 frames over 20,000 px on the element marked `data-scroller`), one fresh page per run, the large card loaded with its button, five runs per library, medians with [min–max]. Script: a Playwright driver that clicks the same buttons a reader would.

**Caveat on load:** other agents were benchmarking on this machine at the same time. Load average was about 4 when the run started and 29 at the end. DataTables and RevoGrid ran first (lowest load); the reference libraries ran later, under heavier load, and their FPS in particular came out well below their published figures (TanStack 32 fps against 59 published). Treat the reference rows as same-session context only. They are not replacements for the numbers the other worker is re-measuring.

### Render time (ms, median of 5)

| Library | Small 1k×16 | Wide 1k×80 | Medium 50k | Large 500k |
|---|---:|---:|---:|---:|
| **DataTables 3.1.5** | 48.9 [47–90] | 494 [469–719] | 957 [898–1,448] | 10,106 [9,255–13,990] |
| **RevoGrid 4.31.8** | 84 [82–105] | 52 [51–70] | 59 [52–59] | 55 [53–63] |
| AG Grid 36.3.0 (reference) | 63 | 19.1 | 67 | 602 |
| Tabulator 6.7.1 (reference) | 77 | 244 | 112 | 333 |
| TanStack 9 (reference) | 63 | 34.2 | 58 | 246 |

RevoGrid's small card is slower than its large one because it is the first grid on the page: its code arrives on demand when the first `<revo-grid>` connects (see Bundle).

An earlier single trial at higher load had DataTables' 500,000 rows at 20.0 s, so its large figure swings by about 2×. With `autoWidth: false` (not the default) medium dropped to about 0.7 s and large to about 8.5 s in a three-run check under heavy load; an earlier lighter-load trial showed medium falling from about 1.5 s to 0.76 s.

### Scroll FPS (median of 5, dropped frames in brackets)

| Library | Small | Wide | Medium | Large |
|---|---:|---:|---:|---:|
| **DataTables** | 60 (0) | 48 (30) | 60 (1) | 52 (19) |
| **RevoGrid** | 60 (1) | 60 (1) | 60 (1) | 60 (1) |
| AG Grid (reference) | 60 | 60 | 60 | 60 |
| Tabulator (reference) | 54 | 44 | 55 | 38 |
| TanStack (reference) | 37 | 40 | 39 | 32 |

Both scrollers were checked by hand: setting `scrollTop` on the marked element changed the first visible row (DataTables `div.dt-scroll-body`; RevoGrid `revogr-scroll-virtual.vertical`). Neither is a fabricated 60.

### Bundle and lines of code (`npm run build` → `public/bundles.json`, gzip)

| Library | totalKB | harness | own code on load | fetched on first render | own code, real | LOC |
|---|---:|---:|---:|---:|---:|---:|
| **DataTables** (core + Scroller + CSS) | 77.9 | 25.7 | 52.2 | 0 | **52.2** | 55 |
| **RevoGrid** | 55.3 | 25.7 | 29.6 | 82.0 | **111.6** | 52 |
| Tabulator (same build) | 137.9 | 25.7 | 112.2 | 0 | 112.2 | 69 |
| AG Grid (same build) | 358.3 | 25.7 | 332.6 | 0 | 332.6 | 39 |
| TanStack (same build, React netted out) | 118.6 | 25.7 | 23.9 | 0 | 23.9 + React 69 | 146 |

The harness floor is now 25.7 kB (it was 23.3 in task 12): the dependency upgrade moved it, and the demo pages now import the small Markdown renderer for their notes.

RevoGrid's `lazyKB` is 88.1, of which everything except the 6.1 kB filter panel was fetched on first render (checked against the network log of the production build). The hub's bundle cell would show 29.6 kB, so the RevoGrid row carries footnote f saying the real figure is about 111 kB.

## Out-of-the-box behaviour

| | DataTables | RevoGrid |
|---|---|---|
| Ctrl-F, visible value | Found | Found |
| Ctrl-F, off-screen row | Not found (Scroller keeps ~80 rows in the DOM) | Not found (virtual) |
| Search over all rows | Yes: built-in search box filtered 1,000 rows to 2 | No search box in core |
| Copy | Native drag-select copies tab-separated rows | Native text selection is off; click a cell and Cmd/Ctrl-C copies that cell. Multi-cell range copy needs `range: true` |
| Keyboard | Headers are focusable and sort with Enter; no cell navigation without the free KeyTable extension | Arrow keys move a focused cell out of the box |
| Accessibility markup | Real `<table>`, `aria-label` "Activate to sort" on headers | `role="treegrid"`, rows and gridcells |
| Paid features | Editor, SearchPanes, StateRestore and CardView are DataTables Plus: $219 for one developer, then $88 a year for updates. Editor 3 now needs a licence key at runtime. Core, Scroller, KeyTable, Select and Buttons are MIT | Pro Lite $199 and Pro Advanced $499 per developer per year. Pivot, Gantt, Kanban, scheduler, Excel import/export, master-detail, merge cells, formulas and the richer filters are listed under Pro. The free core shows a "RevoGrid" link in the corner, and the docs ask organisations to keep it or buy Pro. `hideAttribution` exists but is documented as "only if you are subscribed to Pro" |

## Friction, in the order it happened

### DataTables

1. **Install was easy.** `datatables.net-dt` and `datatables.net-scroller-dt` have no dependencies now. The manual's npm section shows the JS import but not the CSS; the packages do export `./css`, so `import "datatables.net-dt/css"` works but you find it by reading `package.json`.
2. **Dark mode was half-done.** DataTables 3 themes through CSS variables, which is the right hook. But the stylesheet only switches rows and borders to dark on `:root.dark`; the sort arrows also accept `[data-theme=dark]`, which is what this site sets. Result on first try: dark page, light stripes. Setting the `--dt-*` variables on the host fixed most of it, and then the rows were white text on white. Scroller paints its scrolling table from a second set of variables in its own stylesheet (`--dts-table_background`, which falls back to `--dt-html_background: white`). Both sets now come from the theme tokens.
3. **Sizing is by hand.** `scrollY` is the height of the scrolling body alone. The search box above and the info line below sit outside it, so on the first try the info line was clipped off the bottom of the card. The demo uses `host.clientHeight - 160`.
4. **Slow at scale with defaults.** Medium took 1.4 to 1.7 s and large 10 to 20 s. Turning off the default first-column sort made no difference; turning off `autoWidth` (which scans the data for each column's widest value) cut roughly a third to a half. The remainder is building its row model and type detection for every row before Scroller windows anything. The demo keeps the defaults, since that is what a reader of the docs would ship, and the notes say what `autoWidth` costs.
5. **No column virtualization.** The wide card puts all 80 columns of every buffered row in the DOM (6,480 cells), which is its slowest-scrolling card.

### RevoGrid

1. **Install was easy.** `@revolist/revogrid` has no dependencies and no CSS to import; `defineCustomElements()` from `/loader` is the documented entry point. Theme names and CSS variables are on the Theme page, and setting a handful of `--revo-grid-*` variables on the element matched the site's tokens in light and dark on the first try.
2. **The render event lies.** The obvious finish line, `aftergridrender` ("emitted after the grid is rendered"), fires with zero cells in the DOM. Timing on it reported about 5 ms for every dataset. The demo waits for the first real `revogr-data .rgCell` with a MutationObserver; at that moment all visible cells are present (checked: 176).
3. **Which element scrolls?** There are two candidates: the body (`.vertical-inner`) and a custom scrollbar element (`revogr-scroll-virtual.vertical`), kept in sync. Setting `scrollTop` on the body was sometimes ignored on first touch (twice in four tries); the scrollbar never was, so that is the one marked `data-scroller`.
4. **Lazy loading hides its weight.** The Stencil loader fetches about 82 kB of component code when the first grid connects, so the build's page-load figure understates it by nearly four times. The `standalone` build would avoid this, but the docs present the loader as the standard path.
5. **Sizes are fixed.** Columns default to 100 px with no auto-fit; the demo sets 130 px. Auto-sizing is a plugin that measures data, which was not tried at 500,000 rows.

## Other things found along the way

- **The hub test "links to every demo page" was already failing on HEAD.** The navbar, card and scorecard row each link a demo, so it found three links where it expected exactly one. It now asks for at least one.
- **Perspective throws when the navbar wraps.** Adding two links pushed the demo-page navbar onto a second line at 1280 px, moving every card down 44 px. With that layout, Perspective's worker raised "View not found" on most page loads and failed its no-console-error test. The links now fit on one line (gap tightened), and the error is gone. The underlying fragility is Perspective's and is worth a bead.
- **Demo notes now render as Markdown.** `meta.notes` goes through the changelog's small Markdown renderer (it escapes HTML first), so the two new demos can use a short bullet list. The existing seven are single paragraphs and render the same as before, except that backticked names now show as code.
- **Flaky under load:** the baseline's "loads the large dataset only when asked" test timed out once at 120 s while the machine was busy, and passed on rerun.
- `public/bundles.json` is regenerated by every build and is committed here, so it will conflict with the other worker's copy on merge; take whichever build ran last.

## Checks

- `npm test`: 36 passed.
- `npm run build`: exit 0.
- `npm run test:e2e`: 49 tests, run against a dev server on port 5183 (5173 was in use by another worker) via a config that only changes the port. All passed; the baseline large-dataset test needed one rerun under load, as noted above.
