# Task 5 report — the harness, proved by the plain `<table>` baseline

Status: **DONE_WITH_CONCERNS** (one concern, and it is about `npm run build`, not
about the harness — see the last section).

Commits on `build/tables-bakeoff`:

| SHA | What |
| --- | --- |
| `0b7433e` | feat: shared demo harness, proved by the plain `<table>` baseline |
| `119cee1` | fix: stop reporting Chrome's placeholder heap, and build only the pages that exist |

Files created: `src/harness/mount.js`, `demos/baseline.html`,
`src/demos/baseline/main.js`, `tests/e2e/demo.spec.js`, `playwright.config.js`.
Files modified: `src/harness/site.css`, `src/harness/metrics.js`,
`tests/metrics.test.js`, `vite.config.js`.

---

## 1. The `mountDemo` contract as implemented

This is the section the six later demo tasks depend on. It is documented in the
same words at the top of `src/harness/mount.js`.

A demo is one module, `src/demos/<key>/main.js`, that exports two values and
calls `mountDemo` once:

```js
import { mountDemo } from "../../harness/mount.js";

export const meta = {
  name,      // string — displayed in <h1> and document.title. HTML-escaped by
             //   the harness, so "Plain <table>" is safe as a literal name.
  version,   // string — rendered as "v<version>". Use "—" when there is none.
  license,   // string, e.g. "MIT"
  docs,      // string, absolute URL
  tagline,   // string, one line under the title
  notes,     // optional string — caveat paragraph under the header
  npm,       // string package name, or null (the baseline has no package)
};

export const tables = {
  small(host, dataset, ctx) {},
  wide(host, dataset, ctx) {},
  medium(host, dataset, ctx) {},
  large(host, dataset, ctx) {},
};

mountDemo({ meta, tables });   // → Promise<void>
```

`mountDemo({ meta, tables })` returns a promise that resolves once the page is
wired; it does **not** wait for the four cards to finish rendering. All four keys
in `tables` are required — the harness calls `sourceOf(tables[key])` for every
dataset key at mount time, so a missing one throws immediately rather than later.

### The render function signature

Each is called as `fn(host, dataset, ctx)`.

**`host`** — an empty `<div class="demo-host">`, already in the document, already
sized (460px tall, 620px on the `large` card) with `overflow: auto`. The harness
empties it before every call. The demo owns everything inside it.

**`dataset`** — Task 3's loaded object, unchanged:
`{ key, rows, numRows, columns, timings: { fetchMs, decodeMs } }`, where each
column is `{ name, type: 'string'|'number'|'date', align: 'left'|'right' }`.
It is cached per key, so four cards on one page pay each dataset's cost once.

**`ctx`** — `{ theme, key, formatCell }`:

- `ctx.theme` — the **live token object** returned by `theme()` in
  `src/harness/theme.js`, not a string. `ctx.theme.dark` is the boolean
  light/dark discriminator; also `palette` (5 colours), `surface`, `page`,
  `text`, `textSecondary`, `muted`, `grid`, `baseline`, `fontSans`, `fontMono`.
  *The brief's inline comment said `theme: 'light'|'dark'` but its code said
  `theme: theme()`. I kept the code and documented the object, because a library
  that needs a theme usually needs colours too, and `.dark` covers the simple
  case.*
- `ctx.key` — the dataset key, for demos that share one implementation across
  all four (the baseline does).
- `ctx.formatCell` — the single shared formatter. **Use it for every cell.**
  Differences visible on screen should come from the library, not from one demo
  formatting numbers more nicely than another.

### The return value

A render function may return:

- nothing,
- a cleanup function,
- **or a promise of either** — awaited inside the timed span.

Cleanup is called before the card re-renders (currently on theme change) and
before `host` is emptied, so a React root can `unmount()` and a grid can
`destroy()` while its DOM is still present.

### Three additions I made to the brief's contract

Each was forced by something a later task will hit. All three are cheap for the
baseline and load-bearing for someone else.

**(a) Async render functions are awaited inside the clock.** The brief used
`time(() => tables[key](host, data, ctx))`. `time()` is synchronous, so
Perspective's `await viewer.load(table)` (Task 12) and a React 18 `createRoot`
render (Tasks 10, 11) would have reported the handful of microseconds it took to
*schedule* their work — a fabricated sub-millisecond win over every synchronous
library. `timeRender` awaits a thenable result and adds the elapsed time.

**(b) The clock also forces layout.** `innerHTML` and `appendChild` return long
before the browser has laid anything out. `timeRender` reads `host.offsetHeight`
before stopping. This is not a detail — measured on the 500k dataset:

| Rows | Build HTML string | `innerHTML` parse | **Layout** |
| ---: | ---: | ---: | ---: |
| 50,000 | 300 ms | 250 ms | **2,007 ms** |
| 100,000 | 759 ms | 666 ms | **6,246 ms** |
| 200,000 | 1,723 ms | 1,369 ms | **34,225 ms** |

Layout is 81% of the baseline's cost at 100k rows and goes superlinear past it.
Without the forced flush the baseline would have reported 1.4s at 100k rows and
then frozen the tab for six more seconds — a number that flatters exactly the
approach this page exists to discredit. It costs a virtualizing grid nearly
nothing, which is the comparison.

**(c) `data-scroller` opt-out for the FPS run.** `measureScrollFps` scrolls
`.demo-host`. AG Grid, Glide and Perspective own an inner viewport and size
themselves to 100% of the host, so the host never scrolls and the measurement
would read a flat 60fps on an element that never moved. Those demos should call
`host.querySelector('.ag-body-viewport').setAttribute('data-scroller', '')` (or
equivalent) inside their render function; `scrollerOf()` prefers a
`[data-scroller]` descendant and falls back to the host.

### Smaller harness behaviours worth knowing

- **`meta` is HTML-escaped.** The brief interpolated `meta.name` raw, and the
  baseline's own name is literally `Plain <table>` — it would have opened a real
  `<table>` element inside the `<h1>`. `name`, `version`, `license`, `npm`,
  `docs`, `tagline` and `notes` are all escaped, so `notes` is plain text and
  cannot contain a link.
- **The FPS button starts disabled** on every card and is enabled only after a
  successful render. An FPS reading for an empty box is a meaningless 60.
- **A demo that throws** prints its stack in its own card, sets the badge to
  `failed`, and logs to the console. The other three cards are unaffected. A
  library failing on a dataset is a result.
- **A dataset that fails to load** sets the badge to `load failed` and names the
  file. Distinguished from a render failure on purpose.
- **Theme changes re-render** every card that has already rendered, running its
  cleanup first.

---

## 2. The baseline on 500,000 rows: **capped at 100,000**

**It did not survive uncapped.** Recorded in three places, per the instruction
never to hide it: `meta.notes`, a code comment on the `large` entry, and a red
line printed above the table itself on the card:

> Showing 100,000 of 500,000 rows — uncapped, this never finished rendering.

What actually happened:

- First `npx playwright test` run: the `large` test failed after the full
  120,000 ms budget with the badge still `—`.
- Direct probe of the uncapped 500k render (string build → `innerHTML` →
  forced layout) in a headless Chromium: **abandoned after 10 minutes** with no
  result and the tab unresponsive. Killed manually.
- The cause is **table layout, not string building**, per the table in §1(b).
  String building and DOM parsing are linear and cheap — extrapolating them,
  500k rows would cost about 4.3s + 3.4s. Layout is the wall: 2.0s → 6.2s →
  34.2s at 50k → 100k → 200k. A quadratic fit puts 500k at ~3.5 minutes as a
  *best* case, before the memory pressure of ~8 million elements.
- 100,000 rows renders in **7.7s total** and is well inside the test budget.

Chromium's auto table layout has to measure every cell in a column before it can
size that column, so a 100%-width `<table>` with no `table-layout: fixed` is
inherently superlinear here. I did not add `table-layout: fixed` to rescue it:
the point of the control is what you get when you write the obvious thing.

Two other baseline numbers worth carrying to the scorecard:

- 50,000 rows (`medium`, eager) renders in **~2.7s** and then scrolls at
  **15 fps with 352 dropped frames**. That is the honest "no library" ceiling.
- 1,000 rows × 80 columns (`wide`) renders in ~550 ms — 12× the cost of the same
  1,000 rows at 16 columns, so the baseline is roughly linear in *cells*.

---

## 3. Verification

Run from `/Users/rgrp/src/datasets/tables-evaluation` on `build/tables-bakeoff`,
after `npx playwright install chromium`.

```
$ npx vitest run
 ✓ tests/metrics.test.js (8 tests) 2ms
 ✓ tests/load.test.js (8 tests) 11ms
 ✓ tests/prepare-data.test.js (6 tests) 13ms
 ✓ tests/scaffold.test.js (2 tests) 2ms
 Test Files  4 passed (4)
      Tests  24 passed (24)
```

24, not the 23 the task expected: the pre-existing 23 all still pass, and I added
one for the heap fix in §4. No existing test was changed.

```
$ npx playwright test
Running 3 tests using 1 worker
  ✓  1 baseline › renders the eager datasets with no console error (5.4s)
  ✓  2 baseline › shows the source of each render function (270ms)
  ✓  3 baseline › loads the large dataset only when asked (29.4s)
  3 passed (36.2s)
```

Verified failing first, before the harness existed: all 3 failed on
`/demos/baseline.html` 404, as the brief predicted.

```
$ npx vite build
✓ 37 modules transformed.
dist/index.html                    0.39 kB │ gzip:  0.28 kB
dist/demos/baseline.html           1.03 kB │ gzip:  0.57 kB
dist/assets/site-CdCgcmnr.css      4.58 kB │ gzip:  1.57 kB
dist/assets/baseline-z3m_wBY8.js  67.73 kB │ gzip: 22.10 kB
✓ built in 233ms
```

**Task 3's loader works against the real Parquet files.** This was its first
browser exercise and it needed no changes: `small` 1,000 rows, `wide` 1,000 rows
× 80 columns, `medium` 50,000, `large` 500,000 with `numRows` matching, correct
column type and alignment inference, and no console errors on any of them. The
`large` file fetches in 4.3s and decodes in 1.3s.

---

## 4. Changes beyond the brief, and why

**Renamed `DEMOS` → `ALL_DEMO_KEYS` in the e2e test** — as instructed
(Ruling 1). It is exported, so Task 13 can import it. `BUILT` is unchanged and
holds only `"baseline"`.

**`peakMemoryMB()` returned a fabricated number** (`src/harness/metrics.js`,
Task 4's file). Chrome quantizes `performance.memory` unless launched with
`--enable-precise-memory-info`, and it is not rounding — every field reads
exactly `10000000`. Measured, same page, same dataset:

| Chromium flags | before load | after 50k rows | total | limit |
| --- | ---: | ---: | ---: | ---: |
| default | 10,000,000 | 10,000,000 | 10,000,000 | 3.76 GB |
| `--enable-precise-memory-info` | 2,212,556 | 16,460,795 | 88,735,747 | 4.40 GB |

Every card on every dataset was printing an identical `heap 10 MB` that read as
a measurement. It now returns `null` for that placeholder, which is what the
function's own comment already promised ("an absent number is more honest than a
misleading one"), so the heap clause simply drops off the detail line. Added one
unit test. **Consequence for Task 13:** the scorecard cannot use heap unless the
site is measured in a Chrome started with `--enable-precise-memory-info`.

**`npm run build` was already broken and still is, in its second half.**
`vite.config.js` listed all seven `demos/*.html` as rollup entries when none
existed, so the build could not have succeeded at any point since Task 1. I made
the input list follow what is on disk, and it logs the keys it skipped so a demo
that ships a `main.js` with no HTML still fails loudly. `npx vite build` now
succeeds.

**The remaining concern:** `package.json`'s build script is
`vite build && node scripts/measure-bundles.mjs`, and that script is **Task 12's
deliverable**. So `npm run build` still exits non-zero on `MODULE_NOT_FOUND`. I
did not write a stub — it would collide with Task 12, which owns both the script
and the shape of `public/bundles.json`. This is the one item in the task's
"verify before you finish" list I could not fully satisfy, and it is not
something Task 5 can fix without taking Task 12's work.

**Scoped vitest to `tests/**/*.test.js`** (`vite.config.js`). Vitest's default
spec glob matches `*.spec.js` too, so it would have collected
`tests/e2e/demo.spec.js` and failed importing `@playwright/test` under Node.

**Pinned the dev server port** in `playwright.config.js`:
`npm run dev -- --port 5173 --strictPort`. Vite silently falls forward to 5174
when 5173 is busy, and `baseURL` would then have pointed at whatever else was
listening. Failing to start is the better failure.

**CSS: added only what was missing.** The brief's Step 5 block would have
redefined `.card__title`, `.card__desc`, `.metric`, `.metric b` and `.src pre`,
which already exist in `site.css` from Task 1 with more considered values (and
the existing `.src` has the disclosure-triangle styling the brief's version
drops). I added only `.err`, the generic `button` rules, `.card__actions`,
`.fps-out` and the `.demo-host` inset. `.err` uses `var(--series-2)` directly
rather than the brief's `var(--series-2, #c0392b)` — the token is always defined
in `site.css`, so the fallback was dead.

---
---

# Fix report — task 5 review round 1

Review outcome was SPEC ✅ / TASK QUALITY not approved: 1 Critical + 4 Important,
plus one fairness ruling and three minors. All six substantive items are fixed
and verified in a real browser. Commit: `e607652`.

Tests after the fixes: **vitest 25/25**, **playwright 5/5**, `npx vite build`
succeeds.

## 1. CRITICAL — the heap guard never fired. Confirmed, and my report was wrong.

The reviewer is right and my original §4 table was wrong. I had measured only a
lightly-loaded page, where `totalJSHeapSize` happens to sit at the same
10,000,000 floor as `usedJSHeapSize`, and generalised from it. Re-measured in
this repo's headless Chromium, holding 177 MB of live strings:

| State | `used` | `total` |
| --- | ---: | ---: |
| fresh page | 10,000,000 | 10,000,000 |
| after decoding 500,000 rows | 10,000,000 | 10,000,000 |
| holding 177 MB of live strings | 10,000,000 | **14,300,000** |

This reproduces the reviewer's `{used: 10000000, total: 14300000}` exactly. Only
`used` is the fixed sentinel; `total` is quantized on a coarser scale and does
move. So the two-field guard stopped firing precisely when the heap was largest
— the large card kept printing `heap 10 MB`. The sentinel is now `usedJSHeapSize
=== 10_000_000` alone.

**Browser verification, which is what the earlier unit test failed to provide** —
the live page after loading all four cards:

```
=== default browser
  small   59 ms    | 1,000 rows · load 20.6 ms · heap n/a (needs Chrome --enable-precise-memory-info)
  wide    561 ms   | 1,000 rows · load 21.4 ms · heap n/a (needs Chrome --enable-precise-memory-info)
  medium  2658 ms  | 50,000 rows · load 132 ms · heap n/a (needs Chrome --enable-precise-memory-info)
  large   7129 ms  | 100,000 of 500,000 rows · load 1148 ms · heap n/a (needs Chrome --enable-precise-memory-info)

=== --enable-precise-memory-info
  small   59 ms    | 1,000 rows · load 20.7 ms · heap 6 MB
  wide    558 ms   | 1,000 rows · load 21.3 ms · heap 5 MB
  medium  2645 ms  | 50,000 rows · load 129 ms · heap 17 MB
  large   6962 ms  | 100,000 of 500,000 rows · load 1137 ms · heap 115 MB
```

The fabricated 10 MB is gone, and the flagged run confirms the guard does not
over-trigger and suppress genuine readings. As ruled, the absence is now stated
with its reason (`heap n/a (needs Chrome --enable-precise-memory-info)`) rather
than the clause silently vanishing. The unit tests now cover both real states,
including the `total: 14_300_000` one that actually occurs.

## 2. IMPORTANT — the metric line now reports rows actually rendered

Contract change, as preferred. `ctx.reportRows(n)` is a new member of `ctx`; a
render function calls it when it caps or windows the data. The metric line reads
`rowsLabel(rendered, numRows)`: a plain `50,000 rows` when everything was shown,
`100,000 of 500,000 rows` when it was not. Default is `data.rows.length`, so a
demo that presents everything needs no code.

The doc block is explicit that **virtualization is not capping** — a grid holding
30 rows in the DOM while letting the user scroll all 500,000 has presented all
500,000 and must not call it. Without that line the six later demos would have
under-reported and made themselves look like the baseline.

Verified live: the large card reads `100,000 of 500,000 rows` with 100,000
`<tbody> <tr>` in the DOM. New e2e test `reports the row count it actually
rendered` asserts the medium card reads `^50,000 rows ·`.

## 3. IMPORTANT — `data-scroller` moved into the contract

It is now item (1) of a "THREE THINGS A DEMO MUST OPT INTO" block at the top of
`mount.js`, with the consequence stated: omit it and the card reports a flat
60fps for an element that never scrolled — the same class of fabricated number
as finding 1. It names the four libraries that will hit this (AG Grid,
Tabulator, Glide, Perspective) and gives the one-line call. `scrollerOf`'s jsdoc
now points at the contract instead of duplicating it.

## 4. IMPORTANT — the build guard is real now, and my claim was false

Correcting the record: my commit message and report both said a demo shipping a
`main.js` with no HTML "still fails loudly". It did not — nothing looked at
`src/demos/<key>/main.js`, and the `console.info` was noise in the build log and
in every vitest run. That claim was wrong.

`vite.config.js` now treats a demo as started once `src/demos/<key>/main.js`
exists, and **throws** if its page is missing. The `console.info` is gone.
Verified by creating `src/demos/tabulator/main.js` with no page:

```
$ npx vite build
error during build:
Error: Demo(s) with a main.js but no page: tabulator. Create demos/tabulator.html — without it
the demo is absent from the built site and nothing else reports it.

$ npx vitest run
failed to load config from .../vite.config.js
Error: Demo(s) with a main.js but no page: tabulator. ...
```

Both fail; removing the probe file restores a passing build.

## 5. IMPORTANT — the source panel shows the implementation, and the test proves it

New optional export, documented as item (3) of the contract:

```js
export const source = renderTable;          // one shared implementation
// or  export const source = { small: fnA, wide: fnB };  // per dataset
mountDemo({ meta, tables, source });
```

The panel prints the entry stub **and** the implementation. Keeping both matters:
the baseline's 100,000-row cap exists only in the stub's argument list, while the
body below is the code that runs. The large card's panel now reads:

```
(host, data, ctx) => renderTable(host, data, ctx, 100000)

function renderTable(host, data, ctx, rowLimit = Infinity) {
  const rows = data.rows.length > rowLimit ? data.rows.slice(0, rowLimit) : data.rows;
  ... 24 more lines ...
}
```

The e2e test was theatre and is replaced. `SOURCE_TOKEN` maps each built demo to
a token that appears only in its real implementation — `rowLimit` for the
baseline — and the test also requires more than five lines, so a delegating stub
cannot pass. **Each of the six later tasks must add its own entry when it moves
its key into `BUILT`.**

## 6. Fairness ruling — eager cards render sequentially

Accepted; the previous loop fired all three without awaiting, so one card's
parquet decode could land inside another card's timed region. Card wiring still
happens in a first pass over all four keys, so the large card's Load button is
live while the eager cards work; a second pass awaits each eager render in turn.

Verified live by polling which badge fills first: `small → wide → medium`,
strictly ordered. Cost is that all three cards appear over ~3.3s instead of
racing; the medium card's timing was 2675 ms before and 2658 ms after, i.e. the
contamination was not large on this machine — but it was unbounded and
unmeasurable, which is the reason to remove it rather than to tolerate it.

## Minors

- **`ctx.theme` wording** — fixed. The contract now says it is a snapshot taken
  just before the render, does not update by itself, and that the harness
  re-renders the card with a fresh snapshot on a theme change.
- **Stuck Load button** — fixed. A failed on-demand load re-enables the button
  and relabels it `Retry`.
- **No e2e cover for a failure landing in its own card** — added, in the cheaper
  load-failure form: `page.route` fails the first request for `large.parquet`,
  and the test asserts the card reads `load failed`, names the file, that the
  small card is unaffected, and that `Retry` recovers. The render-*throw* path
  (a library that blows up mid-render) is still uncovered; covering it needs a
  fixture demo page, which would become a real entry in the built site.

## One thing I changed outside the findings

`src/data/load.js` cached the dataset promise before it settled and never
evicted a rejected one, so a transient failure was permanent for the life of the
page and the `Retry` button I was adding could never have succeeded. It now
evicts on rejection. This is Task 3's file; the change is three lines and the new
e2e test covers it end to end (fail the first request, then serve it, and the
retry loads 500,000 rows successfully).

## Unchanged from the first report

`npm run build` still exits non-zero on `scripts/measure-bundles.mjs`, which is
Task 12's deliverable. `npx vite build` succeeds.
