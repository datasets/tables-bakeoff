# Tables Bakeoff: verdict, pre-mortem and launch blockers

Sources: README/ANALYSIS/OPEN-QUESTIONS/SHARING, index.html, all nine build reports, every `src/demos/*`, the live site probed at 1400 px and 390 px in headless Chromium (2026-11-20), npm `latest` for every library, and a licence/status sweep. Numbers quoted are from the build reports unless marked *live*.

## 1. The verdict the evidence supports

**Headline:** Use a plain `<table>` until it hurts (a few thousand rows). Past that: AG Grid Community if you want it done, TanStack Table if you want it yours. Everything else is a special case.

| Use case | Pick | Why (evidence) | Thin spot and the quick test |
|---|---|---|---|
| (a) Small rich table in a data story | **Plain `<table>`** | 34 lines, 1.1 kB, ~60–107 ms at 1,000 rows, selectable, printable, accessible, dark mode is CSS. The control won its own weight class; that is the finding. Runner-up: Observable Inputs if you want sort-on-click in one call. | Observable's default look is the worst on the site (ids and dates wrap mid-token, checkboxes shown) because the demo passes no `width`/`layout`/`select:false`. One-hour fix; re-judge after. |
| (b) 500k-row grid | **AG Grid Community** (vanilla or any framework) | 248 ms at 500k, 60 fps, 39 lines, the only one that "never dropped a frame", and the one library whose wrong-height mistake fails loudly instead of silently. Tabulator (280 ms, 110 kB) is the lighter alternative once you know the trap. Glide's 24.6 ms is not a reason: at 60 fps the 220 ms gap is invisible, and Glide has had no release since Feb 2024 and no React 19 peer. | Sort/filter at 500k was observed, not timed. Add a "sort price" button to the large card and publish the ms (half a day, all seven). |
| (c) Dataset preview on a data portal (DataHub) | **TanStack Table + react-virtual**, wrapped once as a PortalJS `<DataTable>` | Real DOM (copy, Ctrl-F, screen readers, indexable), 21 kB on a page that already ships React, 141 ms at 500k, theming is our CSS tokens, and both spikes (summary-stats + filter, DuckDB-WASM query) were built on it and composed cleanly. The cost is 146 lines we own, written once. For non-React portals (CKAN): Tabulator. | Column pinning, resize and a filter row are untested in the harness (the summary spike has filter). Two hours on the spike. v9 docs vacuum is real; budget for reading `.d.ts`. |
| (d) Editable / spreadsheet-like grid | **Tabulator** (vanilla, MIT, editors + clipboard + range selection all free). If React 18 and you need the Sheets feel: Glide, accepting the maintenance risk. | Not AG Grid: range selection and clipboard are Enterprise. Not Handsontable: paid for commercial use. | **Weakest call on the page: no demo tests editing.** Add a fifth "edit" card (double-click a price, paste a column) to Tabulator, Glide, AG Grid; half a day. Say on the page that this one is from feature lists plus a spot check. |

The 500k race is a tie among the virtualizers; the differentiators are text-in-DOM, bundle, failure modes and maintenance status. Say that explicitly.

### Scorecard (1–5, subjective, from the build reports; line-charts style)

| Library | Lines | Own kB | Default look | API ergonomics | Right first try | Docs | Escape hatch |
|---|---|---|---|---|---|---|---|
| Plain `<table>` | 34 | 1.1 | 4 | 5 | 5 | 5 | 5 |
| Observable Inputs | 32 | 6.7 | 2 | 5 | 3 | 3 | 2 |
| Tabulator | 69 | 110 | 3 | 4 | 1 | 4 | 3 |
| AG Grid Community | 39 | 304 | 4 | 4 | 3 | 4 | 4 |
| TanStack Table | 146 | 21 (+60 React) | 5 | 3 | 2 | 2 | 5 |
| Glide Data Grid | 123 | 105 (+60 React) | 4 | 4 | 3 | 3 | 2 |
| Perspective | 48 | 99 (+3.9 MB WASM) | 3 | 3 | 4 | 2 | 1 |

One-line reasons. Look: plain/TanStack are our CSS (5/4); Observable wraps GUIDs and ships light-only CSS (2); Perspective is monospace, blue numbers, `7/26/24` dates and a title bar (3). Ergonomics: `Inputs.table(rows)` is the best API here (5); TanStack v9 is a redesign with opt-in features (3); Perspective needs two WASM URLs and a global table namespace (3). First try: Tabulator's documented `height:"100%"` cost 62 s at 50k with no warning (1); TanStack's spacer-row/colgroup fight and v8-only answers (2); AG Grid threw on missing `ModuleRegistry` and renamed its scroller class but failed visibly (3); Perspective "worked on the first run" (4). Docs: TanStack v9 had only `.d.ts` (2); Perspective's good docs are markdown in the repo, invisible from npm (2); Tabulator's docs are complete and contain the trap (4). Escape hatch: canvas has no DOM to reach (Glide 2); Perspective has no per-cell formatter or locale (1); TanStack is all yours (5).

## 2. Pre-mortem: ten likely top HN comments

| # | Comment | Answered today? | Fix |
|---|---|---|---|
| 1 | "You recommend Glide for large data; it has had no release since Feb 2024 and no React 19." | No; Quick picks says the opposite. | Reverse the pick (above). Add a "last release" column to the table. |
| 2 | "Where's DataTables / SlickGrid / react-data-grid / MUI X / RevoGrid / Handsontable?" | Partly; the DataTables line is now wrong (v3 dropped jQuery, Jul 2026). | Update the list; add the two in §3; one "why not" per name. |
| 3 | "The Tabulator '200× cliff' is your config bug: `height:'100%'` needs a sized parent." | Half. | Reframe: the finding is that a wrong height degrades silently to full render instead of erroring (AG Grid fails loudly on the same mistake). Verify `height: 460` works; say so. |
| 4 | "Feeding Perspective `Array<Object>` is its worst case; it isn't a grid library." | Yes (footnote d). | Run the Arrow-input variant once and print both numbers. One hour. |
| 5 | "One machine, typed-in numbers, n=1, no error bars; the live page shows different numbers than your table." | Buried in footnotes; *live* baseline-medium is 5.9 s vs the typed 2.6 s. | A "your browser just measured" line per demo, machine named in the table header, FAQ line: order of magnitude, run it yourself. |
| 6 | "AI slop." Three-hundred-word notes paragraphs on every demo page, "honest/fabricated" tics, em dashes everywhere. | No. | Cut each demo's notes to three bullets; front page in a human voice; one line on method: agents under direction, every number re-run by hand. |
| 7 | "Just use a `<table>`." | Yes, as a footnote. | Make it the headline. |
| 8 | "AG Grid Community is the funnel for a $999/dev Enterprise licence." | One clause. | Licence column lists what is paywalled per library (AG Grid: grouping, pivot, clipboard, range selection, Excel; MUI X: row virtualization is Pro). |
| 9 | "Accessibility? Keyboard navigation? Did you touch a screen reader?" | Glide only. | Five-row a11y check (Tab into grid, arrow keys, VoiceOver reads a cell) for all seven, or say plainly it was not tested. Half a day. |
| 10 | "Two React entries against five vanilla ones; no Vue/Svelte." | React cost is netted out, not explained. | FAQ line: TanStack has Vue/Svelte/Solid adapters; Glide is React-only; the other five are framework-free. |

Also expect: "LOC is meaningless" (keep, label as build-cost proxy), "setting `scrollTop` isn't real scrolling" (true; say it), "500k rows client-side is an anti-pattern" (point at the DuckDB spike), "AG Grid's own benchmark page" (we don't compete with it).

## 3. Missing libraries

Add two:

- **DataTables 3** (3.1.5, MIT core, Oct 2026). The most-deployed table library on the web, now jQuery-free, the incumbent on data portals (CKAN). HN will name it first and the current "why not" is factually stale.
- **RevoGrid** (4.31.8, MIT, releases weekly). Framework-agnostic web component, virtualized both axes, editing built in: it fills the slot that use case (d) is weakest on, and it is the one maintained vanilla alternative to Tabulator.

Why not the rest, one line each: **react-data-grid** is on beta 64 after five years and React 19-only, a one-line mention beside TanStack. **MUI X Data Grid** cannot virtualize rows in the free tier (Pro), so it fails the 500k test by licence; say that in one line. **SlickGrid** 6.0 (Nov 2026) is real and MIT but duplicates what AG Grid and Tabulator already show; a line for the old-timers. **Handsontable** is paid for commercial use. **Grid.js** has had no release since Mar 2024. **ag alternatives / commercial** (Kendo, DevExtreme, Syncfusion, Bryntum) are out by the permissive-licence rule, stated once.

## 4. Front page rewrite

**Outline (top to bottom):** 1. Headline verdict (two sentences). 2. Four use-case picks, each a card with the pick, one reason, a link to the live demo and the runner-up. 3. A visual strip: the small dataset rendered by the four picks, embedded as lazy iframes in a `?bare=1` mode (new, ~2 h; line-charts does exactly this) or, failing that, four screenshots linking to the demos. 4. Four surprising findings. 5. The measured table, plus "last release" and "what is paywalled" columns, footnotes collapsed under a `<details>`. 6. Scorecard. 7. Method, four sentences, linking to ANALYSIS. 8. Considered, not included (updated). 9. Experiments. 10. Footer.

**Cut:** the "sibling of line-charts" paragraph (footer), the "verdict is not written" callout, the separate Quick picks list (merged into 2), the "Facts only, no ratings" sermon, the contenders grid as a top-of-page element (fold into the table's first column), and half of every footnote.

**Draft, top screen:**

> # Which JavaScript table library should you use?
>
> We built the same table seven times, over the same 1,000 to 500,000 rows of real UK property sales, to pick one for DataHub. Here is what we'd tell a colleague.
>
> **Use a plain `<table>` until it hurts.** Up to a few thousand rows it is the fastest, smallest and most accessible option here, and it needs no library. Past that, every real grid scrolls 500,000 rows at 60 fps; what separates them is whether the text is in the DOM, what the bundle weighs, how they fail, and whether anyone is still shipping releases.
>
> - **Data story or report:** plain `<table>`. Want sort in one line: Observable Inputs. [demo]
> - **Big grid, any framework:** AG Grid Community, 300 kB and done in 39 lines. Lighter: Tabulator, once you know the one trap. [demo]
> - **Dataset preview on a data portal (what DataHub will use):** TanStack Table with react-virtual. Real `<table>`, your CSS, 21 kB over React. [demo]
> - **Editable, spreadsheet-like:** Tabulator. On React 18 and want the Sheets feel: Glide Data Grid, knowing its last release was 2024. [demo]
>
> **Four things that surprised us.** A hand-written `<table>` cannot render 500,000 rows at all. Tabulator's own documented sizing option turns 68 ms into 62 seconds with no warning. Glide draws 500,000 rows faster than 1,000, and Ctrl-F cannot find any of them. Headless means you write the virtualizer: TanStack is the smallest React bundle and the most lines.

## 5. Other blockers (ordered by embarrassment on launch day)

1. **Social card is broken.** `og:image` points `screenshotit.app` at `tablesbakeoff.datahub.io` (wrong host); demo pages set `og:*` from JavaScript so crawlers see empty strings; no `og:url`, `twitter:card` or canonical. Ship a static 1200×630 PNG under `public/og/` like line-charts.
2. **The verdict links go nowhere.** `/EVALUATION.md` and `/ANALYSIS.md` return the front page (SPA fallback). Render them as HTML pages or link the GitHub blob.
3. **The page contradicts itself.** Prose says TanStack 166 lines vs AG Grid 62 and "13 KB"; the live table (from `bundles.json`) reads 146 vs 39 and 21.3 kB. Tabulator is "40 ms" in one paragraph, 68 ms in another.
4. **Versions are 2.5 months stale on a page titled "a 2026 evaluation".** Perspective 5.3.1 → 5.9.4 (and the project moved to the OpenJS Foundation), Observable Inputs 0.12.0 → 1.0.0, Tabulator 6.5.2 → 6.7.1 (copyright now Beekeeper Studio), AG Grid 36.1 → 36.3, TanStack 9.2.4 → 9.3.1. Bump, re-measure, regenerate; one afternoon.
5. **Mobile is broken.** The nav's inner flex row does not wrap: 375 px of horizontal overflow on the front page and 282 px on every demo at 390 px wide, nav 160 px tall. One hour.
6. **Observable Inputs looks broken** (see 1a). It is the demo, not the library.
7. **Perspective's first card shows 2,648 ms for 1,000 rows** (*live*) because WASM boot lands in the first timed region. Charge boot to a visible "engine ready in X ms" line instead.
8. **Branding.** Footer says Datopian; the stance is "DataHub is choosing this for itself". Pick one voice.
9. `heap 16 MB` leaks through the sentinel guard in some Chromium builds (*live*, Perspective page); minor.
10. **DataTables "assumes jQuery"** is false since July 2026 (see §3).
