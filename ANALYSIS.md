# Analysis: method and caveats

This documents how every number on the site was actually produced, and where each
one can mislead if quoted without its caveat. It is the factual companion to
`EVALUATION.md` (the subjective verdict) — nothing here is a judgment call about
which library is "better."

## The datasets

Real HM Land Registry Price Paid data, converted to Parquet and served as static
files, loaded identically by all seven demos through `src/data/load.js`.

| Dataset | Rows | Columns | Stresses |
|---|---|---|---|
| Small | 1,000 | 16 | typography, alignment, formatting, nulls, text overflow |
| Wide | 1,000 | 80 (64 derived numeric) | horizontal scroll, column virtualization, pinning |
| Medium | 50,000 | 16 | the point where real-DOM rendering starts to hurt |
| Large | 500,000 | 16 | load time, sustained scroll FPS, memory, sort at scale |

Every library gets the same `Array<Object>` of row data from the same loader —
deliberately the least favorable input shape for a columnar engine like
Perspective, and the most favorable for a plain `<table>`. See "What the input
format hides," below.

## Render time

```js
async function timeRender(fn, host) {
  const { result: raw, ms: syncMs } = time(fn);
  const t0 = performance.now();
  const result = raw?.then ? await raw : raw;
  void host.offsetHeight;   // forces layout inside the clock
  return { result, ms: syncMs + (performance.now() - t0) };
}
```
(`src/harness/mount.js`)

The clock covers three things: the synchronous portion of the render function,
any returned promise (so an async mount — a React root, `viewer.load()` — reports
its true cost), and a forced layout via reading `host.offsetHeight`. That third
part matters more than it looks: browsers can defer layout until something reads
a geometry property, so a render function can return having only *queued* work.
Forcing the read makes the clock honest — for the plain `<table>` baseline,
forced layout is 6 of the 7.7 seconds at 100,000 rows; for a virtualizing grid,
it's close to zero. That gap is the actual thing this site exists to show, and
deferring the layout read would have hidden it.

**What this means for reading render numbers:** a library that appears fast may
simply not have triggered layout yet in its own use, not in this harness — this
harness always forces it, so all seven numbers are on equal footing with each
other, even though a page that never reads a geometry property could see a
render "finish" faster than the number shown here.

## Scroll FPS

```js
export function measureScrollFps(el, { distance = 20000, steps = 120 } = {}) {
  // one step per requestAnimationFrame, scrollTop set directly
  // fps = (frames / elapsedMs) * 1000
}
```
(`src/harness/metrics.js`)

This is a scripted scroll, not a synthetic benchmark: it sets `el.scrollTop`
directly once per animation frame for 120 frames (≈20,000px), on whichever
element the demo marks with `data-scroller` — the element that actually owns the
scroll. Libraries that virtualize scroll internally (AG Grid, Tabulator, Glide,
Perspective) mark an inner element; libraries that use the page's own scroll
(TanStack, Observable, the baseline) are scrolled at the host.

**Caveat:** a demo that omits `data-scroller` gets scrolled at an element that
never moves, and reports a fabricated flat 60fps. This was checked manually for
each of the seven demos, not by an automated assertion — see "Known gaps" below.
Perspective's scroller sits two open shadow roots inside a web component; the
lookup descends into shadow roots to find it.

## Bundle size

Sizes are gzip, 1 kB = 1000 bytes, read from Vite's build manifest by
`scripts/measure-bundles.mjs` — not estimated, not quoted from a library's own
marketing.

**The harness floor.** Every demo loads roughly 23.3 kB of shared code before any
library-specific bytes: the mount harness (which pulls in `hyparquet` to decode
the Parquet fixtures) plus `site.css`. This is why the plain `<table>` baseline
— genuinely about 0.9 kB of its own code — reports 24.2 kB total. `bundles.json`
reports this floor (`harnessKB`) as its own column precisely so it can be
subtracted rather than misread as the baseline's actual cost.

**React is netted out separately.** TanStack and Glide both mount a React root;
their `libKB` figure is `totalKB - reactKB`, where `reactKB` is pinned to a named
Rollup chunk (see the note on silent misattribution below) rather than guessed
from a filename pattern. This is what makes `libKB` a fair number for "what does
this library cost on a page that already ships React" rather than double-charging
every React demo for React itself.

**WASM is never summed into a bundle total.** Perspective downloads roughly
3.9 MB of compiled Rust (an engine and a viewer) before anything renders. Gzip
buys about 1% on that binary — this is not JavaScript, and averaging or stacking
it against six JS bundle sizes would compare different kinds of thing. It is
reported as its own column, always separate.

**A silent-failure class this measurement had to guard against:** Rollup hoists
React into a chunk shared by the two React demos, but names that chunk after
whichever module happened to be its facade — not recognizably "React." An
earlier draft of the measurement script used a filename heuristic
(`/react/i.test(name)`) to find it, which matched nothing and would have quietly
reported `reactKB: 0` for both React demos with a green build — no error, just a
wrong number. The fix was to name the chunk explicitly in `vite.config.js`
(`manualChunks`) so `reactKB` is a lookup, not a guess, and to make the
byte-attribution walker throw if the build manifest ever names a file that isn't
actually on disk.

## Lines of code

`loc` counts non-blank, non-comment lines under `src/demos/<key>/`. This is a
build-cost proxy, not a quality measure, and it's a crude one: it counts JSX
markup the same as logic, so a React demo's own component file is structurally
penalized against a vanilla demo that hands a config object to a constructor.
TanStack's 166 lines (nearly triple AG Grid's 62) is a real number about what
"headless" costs in code — the row virtualizer, column virtualizer, spacer
cells, `<colgroup>`, sticky header and sort arrows are all hand-written — but
reading it as "TanStack's code is worse" rather than "TanStack's code is yours
to write" would be the wrong takeaway.

## Heap: deliberately absent

Chrome pins `performance.memory.usedJSHeapSize` to exactly 10,000,000 bytes
unless the browser is launched with `--enable-precise-memory-info`. Every
library would otherwise report an identical fabricated "10 MB," which looks like
a measurement and isn't one. `peakMemoryMB()` in `src/harness/metrics.js`
returns `null` in the unflagged case rather than printing the sentinel, and the
demo pages say "heap n/a" rather than omitting the field silently — an absent
number is honest; a silently missing one reads as an oversight.

For reference, one measurement pass under `--enable-precise-memory-info` on this
machine: a fresh page used 2.2 MB; holding all 500,000 rows of the large dataset
in one library's own structures used 16.5 MB. That flag changes GC behavior, so
those numbers are not directly comparable to what a normal visitor's browser
would report, and are not on the scorecard for that reason.

## What the shared cell formatter does and doesn't cover

Every library is handed the same `formatCell` function (`src/data/load.js`) so
that what differs on screen is the library's rendering, not seven different
amounts of styling effort applied by whoever built each demo.

**Perspective is the one exception**, and it's a finding about the library, not
a flaw in the method: Perspective exposes no per-cell formatting callback at
all — only `Intl` option bags configured per column (`number_format`,
`date_format`). Its dates render in the browser locale's short form
(`7/26/24`) rather than the site's `2024-07-26`, and its nulls render as an
empty cell rather than the shared em dash, because neither a callback nor a
locale field is reachable from its config. This is disclosed on Perspective's
own page. Any screenshot comparing Perspective's columns to the other six is
comparing formatting choices as much as rendering.

## Variance and confidence

Render numbers are one machine's observations, in headless Chromium at
1400×1000, typed into the site from repeated manual runs rather than generated
automatically on every build. Small renders are stable to within a few percent
run to run. Large renders are not: the plain `<table>`'s capped 100,000-row
render varied by over 10% across eight runs on this machine, and by closer to
20% at 200,000 sampled separately. **Variance grows with render cost, not just
with measurement noise** — treat every large-dataset figure as an order of
magnitude, not a benchmark result with error bars.

## Known gaps

- **No automated test asserts a scroll-FPS run actually moved the element it
  measured.** Each demo's `data-scroller` placement was checked manually and by
  a second reviewer reading the library's own layout CSS during build. A fixture
  that scripts a click on "Measure scroll FPS" and asserts the scrolled
  element's `scrollTop` actually changed would close this gap; it does not
  exist yet.
- **Bundle and render numbers are regenerated on every `npm run build`,** but
  the FPS and render-time numbers baked into `index.html`'s scorecard are typed
  in from a specific run, not live-generated. A dependency bump could move the
  real numbers without moving the page.
- Full reasoning behind every build-time judgment call — which Perspective
  package family, why the baseline stays in capped rather than excluded, why
  heap isn't a column — is in `OPEN-QUESTIONS.md`. The complete decision log is
  `docs/reports/build-ledger.md`.
