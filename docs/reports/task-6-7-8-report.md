# Tasks 6, 7, 8 — Observable Inputs, Tabulator, AG Grid Community

Three vanilla-JS demos, one commit each on `build/tables-bakeoff`:

- `4a26b40` feat: Observable Inputs demo
- `36b7a73` feat: Tabulator demo
- `197b1fc` feat: AG Grid Community demo

All three briefs predated the hardened `mount.js` contract and were wrong in
the ways the task description flagged (`ctx.theme` as a string, missing
`data-scroller`, a wrong scroller class, no promise-awaited timing, no
`source` export). All were corrected. One additional, much bigger problem
turned up empirically in Tabulator that no brief could have anticipated —
covered in detail below.

## Observable Inputs (`src/demos/observable/main.js`)

**Render times** (small/wide/medium, real land-registry data): ~11–20 ms for
small, ~50 ms for wide (80 columns), ~6 ms for medium (50,000 rows) — the low
medium number is real but slightly misleading, see below. Large (500,000
rows) also completes near-instantly on load.

**FPS**: medium — 60 fps, 1 dropped frame. This is a genuine, non-fabricated
measurement, not a suspiciously-flat number: `data-scroller` is placed on the
`<form>` element `Inputs.table` returns, which is the element that actually
carries `overflow-y: auto` and scrolls internally (the host div never
moves).

**Did it survive 500,000 rows?** Yes, but not by virtualizing in the way the
other libraries do. `Inputs.table` lazily *appends* real DOM rows as you
scroll and never removes them. The fast "render" time only reflects the
initial ~60-row batch; scrolling all the way through 500,000 rows would
leave all 500,000 real `<tr>` elements sitting in the DOM, with memory
growing monotonically and never coming back down. This is fundamentally
different from AG Grid/Tabulator's true windowing and is the demo's core
honest caveat.

**How it felt to use**: genuinely the smallest, most pleasant API of the
seven. One function call (`Inputs.table(rows, options)`), no `destroy()`
needed, sensible defaults for alignment/formatting/sort-on-header-click.
The cost of that simplicity: zero theming hooks. Its injected stylesheet
hardcodes colors (`background:#fff` on the sticky header, `#eee`/`#ccc`
borders) with no CSS custom properties at all, so dark mode required a
hand-rolled `<style>` override scoped by the table's own generated `id`
(`#${el.id} thead th { background: ... }` etc.) — something the library
gives you no sanctioned way to do.

**meta.notes caveat**: rows are appended lazily and never pruned (memory
grows unboundedly with scroll distance); no theming hook exists at all, so
dark mode here is a scoped CSS patch keyed to the table's own id, not
anything Inputs.table exposes.

## Tabulator (`src/demos/tabulator/main.js`)

This is where almost all of the session's time went, and it produced the
most consequential finding of the batch.

**The bug**: the original brief's config (matching Tabulator's own docs
pattern for making a table fill its container) passes `height: "100%"` to
the constructor. Tabulator applies that directly to the *same* element
Tabulator was constructed on — overwriting the host's real, already-resolved
CSS height (460px/620px, set by the harness's `.demo-host` class) with an
inline `"100%"` that the host's *own parent* (`.card`, which has no defined
height) cannot resolve. The practical effect: Tabulator's internal viewport
measurement (`elementVertical.clientHeight`) reads back **0**, its
virtual-DOM row-count estimate for the first render collapses to "render
everything" instead of "render what's visible", and it silently walks every
row in the dataset — with no error, warning, or visible symptom other than
being catastrophically slow.

Measured directly (isolated repro, no harness, no formatter, generic
4-column data), holding `height: "100%"` constant while varying row count:

| rows    | time with the bug | time after removing `height: "100%"` |
|---------|-------------------:|--------------------------------------:|
| 1,000   | ~70 ms             | ~8 ms                                 |
| 5,000   | ~410 ms            | ~18 ms                                |
| 20,000  | ~5.5 s             | —                                      |
| 50,000  | **~62 s**          | ~40–70 ms                             |
| 500,000 | not willing to wait (projected: hours) | **~250–280 ms** |

The fix is one line: don't pass `height` at all, and let Tabulator read the
host's pre-existing, real CSS height. No layout-mode change, no explicit
column widths, no `rowHeight` tweak was needed once that one option was
gone — all of those were things I tried first and they made no difference,
which is itself worth noting: the wrong mental model here ("large data needs
a cheaper layout mode") wastes a lot of time before the real cause (a
height-measurement bug triggered by the *recommended* config for filling a
container) becomes obvious. I only found it by bisecting with an isolated
repro page outside the harness and literally patching console logs into
Tabulator's own source to read `fixedHeight`/`containerHeight` at runtime.

**Render times after the fix** (real land-registry data): small 41 ms, wide
145 ms (80 cols, `renderHorizontal: "virtual"`), medium 68 ms, large 280 ms.

**FPS**: medium 59 fps / 2 dropped, large 60 fps / 1 dropped — real numbers,
`data-scroller` on `.tabulator-tableholder` (the actual internal scroll
container).

**Did it survive 500,000 rows?** Yes, comfortably, once the height bug was
fixed — 280 ms to build, smooth scroll FPS.

**How it felt to use**: the batteries genuinely are all there (sort,
filter-ready columns, formatters, virtual DOM) and once past the height trap
it's fast and pleasant. The API is more verbose than Observable Inputs but
not unreasonable. Awkward points: (1) the constructor returns before rows
are actually painted, so an honest render-time measurement requires
listening for the `tableBuilt` event and wrapping the whole thing in a
promise — the original brief just timed the constructor call and called
that "a floor", which undersold how misleading it is; (2) the shipped CSS
themes (`tabulator_simple.css` and siblings) are static hex colors with zero
custom-property hooks, and some of the more specific selectors
(`.tabulator-header .tabulator-col`, which sets its own opaque white
background) sit at *higher* CSS specificity than an obvious top-level
override, so a naive dark-mode patch silently fails on just the header text
until you find and match that specific selector.

**meta.notes caveat**: the `height: "100%"` trap above, described in
technical detail so a future reader doesn't repeat it; the tableBuilt/promise
timing fix; the CSS-theme-has-no-variables dark-mode workaround.

## AG Grid Community (`src/demos/aggrid/main.js`)

**Render times**: small 42 ms, wide 11 ms (80 cols — column virtualization
means width barely matters), medium 35 ms, large 248 ms. Consistently the
fastest or tied-fastest of the three across every dataset.

**FPS**: medium 60 fps / 1 dropped, large 60 fps / 1 dropped —
`data-scroller` on `.ag-grid-viewport`, confirmed by directly setting
`scrollTop` on candidate elements and checking which one actually changed
the visible rows (`.ag-body-vertical-scroll-viewport`, which the class name
suggests, is actually just the thin custom scrollbar track, not the content
viewport).

**Did it survive 500,000 rows?** Yes, easily — the best of the three on this
dataset, both to build and to scroll.

**How it felt to use**: it's the "enterprise" experience — most polished
result, most ceremony to get there. Two things from the original brief were
simply wrong and had to be found by inspecting the real installed package
and the real rendered DOM rather than trusting either the brief or (by
implication) older AG Grid docs/tutorials: `ctx.theme === "dark"` is a type
error waiting to happen once `ctx.theme` became a token object (this would
have silently shipped a permanently-light grid — the exact bug the task
description warned about), and `.ag-body-viewport` does not exist anywhere
in v36's actual DOM; the real class is `.ag-grid-viewport`. Also
independently checked (since Tabulator's `height: "100%"` bug raised the
question): AG Grid does *not* have the same catastrophic failure mode when
given the same bad option — it just renders into a visibly collapsed 0px
box, which is wrong but fast and immediately obvious, rather than silently
correct-looking and minutes slow. Heaviest bundle of the three by a wide
margin (1.09 MB / 304 KB gzipped vs. Tabulator's 452 KB / 105 KB and
Observable Inputs' 15 KB / 6.5 KB) — the free tier is not a small download.

**meta.notes caveat**: open-core boundary (pivoting, row grouping with
aggregation, server-side row model, integrated charts are all Enterprise);
the two brief corrections above; the bundle-size cost; confirmation that the
`height: "100%"` mistake fails safely here rather than catastrophically.

## Cross-cutting observation

Two of the three libraries' *own* recommended/documented patterns for
sizing a table to its container (`height: "100%"` for both Tabulator and, in
the original AG Grid brief, `host.style.height = "100%"`) actively hurt one
of them (badly) and were pure noise for the harness in general, since the
host already carries a real CSS height. The fix for all three demos was the
same: don't touch height at all, trust the harness's own layout. This is the
kind of thing that would be very easy for a real developer to carry forward
from copy-pasted tutorial code without ever noticing, on a mid-size dataset,
that anything was wrong.

## Verification performed

- `npx vitest run` — 25/25 passing throughout, unchanged.
- `npx playwright test` — 20/20 passing (5 per demo × 4 built demos:
  baseline, observable, tabulator, aggrid), all fast (full suite ~35–40 s,
  down from Tabulator alone previously threatening to exceed the 180 s
  Playwright test timeout before the height fix).
- `npx vite build` — succeeds; only the documented, unrelated
  `scripts/measure-bundles.mjs` gap remains for Task 12.
- Manually screenshotted every card (light + dark) for all three demos and
  visually confirmed: real tabular data on screen, correct alignment,
  correct dark-mode contrast (including the header-cell specificity fix for
  Tabulator), the large card loading on demand, and FPS readouts that are
  never a suspiciously flat 60 with 0 dropped frames.
