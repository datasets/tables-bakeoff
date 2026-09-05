# SDD ledger — plan: docs/plans/2026-09-04-tables-evaluation-implementation.md

Spec: docs/plans/2026-09-04-tables-evaluation-design.md (read, reachable)
Branch: build/tables-bakeoff (created from main @ 5a46631)

## Pre-flight scan

Ruling: work on branch `build/tables-bakeoff` in the primary working directory
rather than a separate git worktree — the repo has no other work in flight, and
the build produces large artifacts (node_modules, a 162MB gitignored data cache)
that a throwaway worktree would duplicate. Also keeps the dev server at the path
the user already has open. Cost if wrong: a `git checkout main` is needed to get
back to a clean tree; no work is lost.

### Cross-task interface pairs

| Producer | Consumer | Interface | Finding |
|---|---|---|---|
| T1 vite.config.js | T12, T13 | `DEMOS: {key,name,react}[]` | OK — T12 reads `.key/.name/.react` |
| T2 parquet files | T3 | `public/data/*.parquet` → served at `/data/*` | OK |
| T2 column names | T3 `inferColumns` | 16 Land Registry names | OK |
| T3 load.js | T5 mount.js | `loadDataset`, `formatCell` | OK |
| T3 datasets.js | T5 mount.js | `DATASETS`, `DATASET_KEYS` | OK |
| T4 metrics.js | T5 mount.js | `time`,`formatMs`,`measureScrollFps`,`peakMemoryMB` | OK |
| T1 theme.js | T5 mount.js | `theme`,`onThemeChange`,`installThemeToggle`,`restoreTheme` | OK — all four used by line-charts' own pages |
| T5 mount.js | T6–T11 | `mountDemo({meta,tables})` | OK — all six call it identically |
| T9 react-host.js | T10 | `mountReact(host,el) => cleanup` | OK — matches mount.js `typeof result === "function"` |
| T12 bundles.json | T13 hub.js | `{demos:{key:{totalKB,reactKB,libKB,loc}}}` | OK |
| T5 demo.spec.js | T13 | appends to same file | **CONFLICT 1** |

### Per-task self-consistency

| Task | Finding |
|---|---|
| T1 | OK — tests assert only what vite.config.js declares |
| T2 | **CONFLICT 2** — memory. Otherwise tests match the writer's outputs |
| T3 | OK — cached promise means timings are first-load; that is intended and documented |
| T4 | OK — `peakMemoryMB` test stubs `performance`, implementation reads `performance.memory` |
| T5 | OK — `large` is the only non-eager dataset, so only it renders a load button |
| T6–T8 | OK — each is one file against a fixed contract |
| T9 | OK, but see Ruling 3 |
| T10 | OK — source-panel test asserts `host` appears; the render arrow contains it |
| T11 | OK — deliberate verify-first step, sequenced last |
| T12 | OK — `main()` is guarded, so vitest importing the module does not run it |
| T13 | OK — `td:empty` does not match cells containing an em dash |

### Rulings

**Ruling 1 (CONFLICT 1 — name collision).** `DEMOS` names two different things:
an array of objects in `vite.config.js` (T1) and an array of key strings in
`tests/e2e/demo.spec.js` (T5/T13). No import connects them, so it is not a bug,
but two shapes under one name in one codebase will mislead. Decided: the e2e
file's constant is renamed `ALL_DEMO_KEYS`, and T13's hub test iterates that.
Carried into the T5 and T13 dispatches. Cost if wrong: none — pure rename.

**Ruling 2 (CONFLICT 2 — Task 2 will likely exhaust memory).** The plan's
`prepare-data.mjs` reads all 162MB as one UTF-8 string, splits it into ~900k line
strings, then maps *every* line to a 16-field object before sampling. Peak heap is
plausibly 1.5–2GB, near Node's default ceiling, and most of it is discarded
immediately. Decided: keep the lines array, but apply the stride to the *lines* and
materialise row objects only for the indices actually sampled. `take(n)` therefore
returns parsed rows, not slices of a fully-parsed array. Same output, a fraction of
the peak. Carried into the T2 dispatch. Cost if wrong: none — the outputs are
asserted by tests either way; this only changes when parsing happens.

**Ruling 3 (react-virtual not in Global Constraints).** Task 9 installs
`@tanstack/react-virtual@^3`, which the Global Constraints version list does not
pin. Decided: allowed. It is a companion to the headless library, not an eighth
contender, and the plan already counts its bytes in TanStack's bundle figure and
says so in the demo's notes. Cost if wrong: the bundle comparison slightly
overstates TanStack — which is the honest direction, since headless genuinely does
require bringing your own virtualizer.

**Ruling 4 (unverified hyparquet export).** Task 2's test uses
`asyncBufferFromFile`, which I did not verify exists (I verified
`asyncBufferFromUrl`). Decided: the T2 implementer verifies it against the
installed package and substitutes `asyncBufferFromUrl` with a `file://` URL, or
reads the file into an ArrayBuffer, if it is absent. Cost if wrong: a failing test
the implementer fixes in the same task.

**Ruling 2a (supersedes Ruling 2 — verified against the published packages).**
`hyparquet-writer@0.16.9` exists (same authors as hyparquet) and exports
`parquetWriteRows({writer, rows, columns, ...})`, which pulls from a **sync or async
iterable one row-group at a time**, so peak memory is independent of total row
count. Its node entry also exports `fileWriter(filename)`. Decided: Task 2 uses
`parquetWriteRows` with a **generator** source and `fileWriter`, so the 500k-row
file is never held in memory at all. This is strictly better than Ruling 2's
sample-then-parse workaround, which is withdrawn. `columns` is required and fixes
column name and order. Cost if wrong: none — verified from the package's own types.

**Ruling 4a (resolves Ruling 4).** `asyncBufferFromFile` IS exported, from
hyparquet's **node** entry (`src/node.js` does `export * from './index.js'` plus
`asyncBufferFromFile`). The package uses conditional exports: browser → `index.js`
(no file reader), node/default → `node.js`. Task 2's test runs under vitest in
Node, so the import resolves correctly as written. No change needed. Note for Task 3:
the **browser** loader must use `asyncBufferFromUrl`, not the file variant — which
is what the plan already specifies.

---

## Progress

Task 1: implemented (commits 5a46631..72d2f6a), review dispatched.
  - Implementer renamed CSS var `--page` → `--bg` (sibling repo used `--page`;
    the brief's interface list said `--bg`). Verified no `--page` references remain.
  - DEMOS stayed in vite.config.js — vitest imports it fine, so the fallback in the
    Task 1 dispatch was not needed. Tasks 12/13 import from vite.config.js as planned.
  - `allowScripts` block added to package.json for esbuild's postinstall.
  - Confirmed independently: sibling theme.js already exports all four required
    names (theme, onThemeChange, installThemeToggle, restoreTheme).

Task 1: complete (commits 5a46631..72d2f6a, review clean — spec ✅, quality approved, 0 findings)
  - Reviewer independently diffed theme.js against the sibling: byte-identical.
    site.css changes are exactly the --page→--bg rename (all 3 theme paths) plus
    the appended table tokens. allowScripts scoped to esbuild@0.28.2 only.
  - Resolved the reviewer's ⚠️ (dev server runtime not visible in a diff): the
    implementer reported HTTP 200 from localhost:5173. Adequate; not a gap.

Task 2: dispatched (BASE 72d2f6a, opus) — carries Rulings 2a and 4a.

Pre-verified for Task 9 (TanStack v9 — the plan's biggest documented risk), checked
against @tanstack/react-table@9.2.4's published types while Task 2 ran:
  - `useTable(tableOptions, selector?)` — options object first. Matches the plan.
  - `@tanstack/react-table` does `export * from "@tanstack/table-core"`, so
    `tableFeatures`, `createSortedRowModel`, `rowSortingFeature`, `sortFn_alphanumeric`
    and `sortFn_basic` are all importable from the react package as the plan writes
    them. No import rewrite needed.
  - table-core's own `tableFeatures` docstring uses exactly this shape, confirming
    the plan's features object is idiomatic v9 rather than invented.

Task 2: implemented (commits 72d2f6a..a1b7a4c), review dispatched (opus — most
load-bearing artifact in the project).
  Result: 4 files from 930,559 source rows. small 0.06MB/1k/16col ·
  wide 0.39MB/1k/80col · medium 1.95MB/50k · large 17.43MB/500k. Under the 25MB
  cap, so large stayed at the full 500,000 rows. Peak RSS 1.32GB, 3.4s.
  Columns: id, price, date, postcode, propertyType, oldNew, duration, paon, saon,
  street, locality, town, district, county, ppdCategory, recordStatus (+metric_01..64).

  PLAN DEFECT FOUND BY THE IMPLEMENTER (real, and mine): the plan's `take(n)` used
  `stride = Math.floor(all.length / n)`. At n=500,000 over 930,559 rows that is
  stride=1 — so `large` would have been the FIRST 500k rows (roughly Jan–Jul), not
  the year-spanning sample the plan's own comment promised. Silent, and it would
  have biased every large-dataset finding. Fixed to `Math.round(i * total / n)`;
  implementer verified all 12 months present, 30.5k–51.3k rows each.
  Ruling: accepted as written — the fix is correct at both n=1000 and n=500,000 and
  preserves determinism. Cost if wrong: the reviewer is independently checking the
  math; a bad stride means re-running one script.

  Also noted by implementer: `hyparquet-writer` exposes no `./node` subpath (its
  exports map has only "."), so `fileWriter` comes from the bare specifier — my
  Ruling A's parenthetical was wrong on that detail; no impact.

Task 2: complete (commits 72d2f6a..a1b7a4c, review clean — spec ✅, quality approved,
  0 Critical/Important, 3 Minor deferred)
  Reviewer independently re-derived the stride against all 930,559 rows and
  confirmed the plan's bug: floor() gives stride=1 at n=500,000 → Jan–May only.
  New formula proven duplicate-free and in-range for all n <= total. Verified on the
  shipped file: 12 months present, 500,000 distinct ids.

Task 2: minor (deferred): `price` relies on schema inference from the first 1,000
  values of the first row group only; pinning `{name:"price",type:"INT32"}` in the
  columns array would remove a silent-overflow path. Verified safe for THIS source
  (max 180,000,000 = 12x headroom in INT32), so not urgent — but a future rerun
  against a different year re-opens it.
Task 2: minor (deferred): CSV parse loop has no `fields.length === 16` guard; a
  malformed future source would yield short rows silently filled with "".
Task 2: minor (deferred): task-2-report.md claims both stride formulas "yield
  indices 0, 930, 1860" at n=1000. They differ (new one gives 0, 931, 1861).
  Immaterial to the data; the report's wording is just wrong.

Tasks 3+4: dispatched as ONE batch (BASE a1b7a4c, sonnet) — both are pure modules
  with complete code in their briefs, touching disjoint files (src/data/* vs
  src/harness/metrics.js). Batched per the skill's same-shape rule.

Tasks 3+4: implemented (commits a1b7a4c..c5de8eb — fc40fb0 loader, c5de8eb metrics),
  review dispatched (sonnet). Full suite 23/23 (8 pre-existing + 8 load + 7 metrics).
  No deviations, no new deps.
  Note: the plan's Task 3 Step 5 says "PASS, 9 tests" but its own test file has 8
  `it` blocks. Plan arithmetic error, not an implementation gap — implementer
  flagged it rather than inventing a 9th test. Correct call.

Tasks 3+4: complete (commits a1b7a4c..c5de8eb, review clean — spec ✅, quality
  approved, 0 Critical/Important, 1 Minor deferred)
  Reviewer confirmed `date` round-trips as a STRING (prepare-data.mjs writes
  r.date.slice(0,10), not a native Parquet DATE), so inferColumns' regex detection
  works and does not receive a Date object. `price` fits INT32 so it decodes as a
  plain number, not BigInt. formatCell's zero handling verified non-naive.
  Resolved the reviewer's ⚠️ (loadDataset's real-parquet runtime path is not unit
  tested): Task 5's Playwright test cannot pass unless loadDataset works end-to-end
  against the real files, so Task 5 is that verification. Not a gap.

Tasks 3+4: minor (deferred): a column whose first 50 sampled values are all empty
  (e.g. `saon`, often blank) infers as type "string". Safe default — string is the
  passthrough formatting path — but it is inference by absence, not by evidence.

Task 5: dispatched (BASE c5de8eb, opus) — the harness contract six later demos
  implement. Carries Ruling 1 (ALL_DEMO_KEYS rename).

Task 5: implemented (commits c5de8eb..119cee1 — 0b7433e harness+baseline,
  119cee1 fixes to earlier tasks), review dispatched (opus).
  vitest 24/24, playwright 3/3, `npx vite build` succeeds.

  FINDING (goes straight into the write-up): the plain <table> baseline CANNOT
  render 500,000 rows. Uncapped it never finished — abandoned at 10 minutes, tab
  unresponsive. Capped at 100,000, disclosed in meta.notes, in a code comment, and
  in red on the card itself. Cost is table LAYOUT, not string building:
  2.0s @ 50k / 6.2s @ 100k / 34.2s @ 200k — superlinear, which is the real story.

  FINDING (metric was lying): peakMemoryMB reported a fabricated constant. Chrome
  quantizes performance.memory to exactly 10,000,000 bytes unless launched with
  --enable-precise-memory-info, so every card printed "heap 10 MB". Now returns null.
  Ruling: DROP heap from Task 13's scorecard entirely. It cannot be a column when
  the number is a placeholder. Keep it as an optional measurement documented in
  ANALYSIS.md with the flag required to obtain it. Carried into Tasks 13 and 14.
  Cost if wrong: the scorecard loses a column it could not have honestly filled.

  CONTRACT DELTAS — must be carried into every one of Tasks 6-11:
  (a) `ctx.theme` is theme.js's TOKEN OBJECT, not the string 'light'|'dark'.
      `ctx.theme.dark` is the discriminator. The plan's Task 8 AG Grid code uses
      `ctx.theme === "dark"`, which would ALWAYS be false — silent, and would have
      shipped a permanently-light grid. Must be corrected in the Task 8 dispatch.
  (b) A render function may return a promise; it is awaited INSIDE the timed
      region, so async mounts (React roots, Perspective's viewer.load) report
      their true cost instead of a fake sub-millisecond time.
  (c) A demo that owns its own scrolling viewport must mark it `data-scroller`
      so the FPS run drives the right element. Applies to AG Grid, Tabulator,
      Glide and Perspective.
  (d) The timed region forces layout via offsetHeight — 81% of the baseline's
      cost at 100k rows was otherwise invisible.

  Known, not a defect: `npm run build` still fails at its second half because
  scripts/measure-bundles.mjs is Task 12's deliverable. Self-resolves at Task 12,
  which precedes Task 13 (the first task that needs a full build).

Task 5: review returned SPEC ✅ but QUALITY **Not approved** — 1 Critical, 4 Important.
  The reviewer verified in a real browser rather than trusting the unit tests, and
  that is exactly what caught the Critical: the heap fix DOES NOT FIRE. The guard
  requires used AND total === 10,000,000, but measured reality is
  {used: 10000000, total: 14300000} — only `used` is the placeholder. "heap 10 MB"
  is still on the live page, and the passing unit test stubs a state that never
  occurs. A green test proving nothing.
  Other Important: capped card prints data.numRows (500,000) beside a 100k render
  time; `data-scroller` documented only in a private jsdoc where six implementers
  will miss it (omitting it yields a fake flat 60fps); a demo can silently vanish
  from the build (the "fails loudly" claim is false — it is a swallowed
  console.info); the source panel shows a delegation stub, and its e2e assertion
  `toContainText("host")` passes on that stub — test theatre that all six later
  demos would inherit.

  Ruling (mine, added to the fix round — not a reviewer finding): the three eager
  cards are rendered in a loop without awaiting, so one card's decode can interleave
  with another card's TIMED region on the same thread. This site exists to publish
  those timings. Render eager cards sequentially. Cost if wrong: slightly slower
  path to all three cards visible, in exchange for numbers that mean what they say.

Task 5: fix round 1/5 dispatched (resumed original implementer, 6 items).

Task 5: fix round 1/5 (6 findings fixed, commits 119cee1..e607652). Scoped
  re-review dispatched (sonnet). vitest 25/25, playwright 5/5, vite build OK.
  - Critical CONFIRMED by implementer's own reproduction: holding 177MB of live
    strings gives {used: 10,000,000, total: 14,300,000}. Only `used` is pinned, so
    the old guard died exactly under memory pressure — the one condition it existed
    for. Sentinel is now `used` alone. Browser-verified both ways: default Chromium
    prints "heap n/a (needs --enable-precise-memory-info)"; the same page WITH the
    flag prints 6/5/17/115 MB, proving the guard does not suppress real readings.
  - Implementer's earlier report was wrong and said so. Good.
  - BONUS BUG (outside the findings, found while fixing): src/data/load.js cached
    REJECTED promises, so the Retry button could never have worked. Three-line
    eviction fix. Task 3 owned that file and it passed review — this was only
    visible once a UI existed to retry from.

  NEW CONTRACT ELEMENTS for Tasks 6-11 (add to every remaining demo dispatch):
  (e) `ctx.reportRows(n)` — a demo that caps or windows reports rows actually
      rendered. Doc is explicit that VIRTUALIZATION IS NOT CAPPING: a virtualized
      demo must NOT call it, or it will under-report and look like the baseline.
  (f) Each later task must add its own SOURCE_TOKEN entry when it joins the
      Playwright BUILT list — the source-panel test now asserts a per-demo token
      plus >5 lines, so a stub cannot satisfy it.

  Known remaining gap (accepted): the render-*throw* path has no e2e fixture,
  because covering it needs a fixture page that would then appear in the built
  site. Ruling: leave uncovered. The behaviour was verified manually by the Task 5
  reviewer (injected a throwing demo: badge "failed", escaped stack, siblings fine,
  zero uncaught pageerrors). Cost if wrong: a regression in error isolation would
  not be caught automatically.

Task 5: complete (commits c5de8eb..e607652, 7/7 findings addressed, no regressions)
  Re-reviewer independently ran a live-browser check (not the unit test): default
  Chromium shows "heap n/a" on all 4 cards; with --enable-precise-memory-info the
  same page shows 5/4/15/115 MB. Also reproduced the orphaned-main.js throw and
  confirmed the load.js eviction has no duplicate-fetch race.

Ruling (token conservation — user flagged risk of exhausting usage before
completion): batch the remaining same-shape work to cut 8 dispatch cycles to 5.
  - Tasks 6+7+8 (Observable, Tabulator, AG Grid): ONE sonnet dispatch. All vanilla,
    all one-file-plus-HTML against a now-fixed contract.
  - Tasks 9+10 (TanStack, Glide): ONE opus dispatch. Both React, share react-host.js.
  - Tasks 11, 12, 13 stay solo (Perspective is risky; 12 and 13 are load-bearing).
  Cost if wrong: a batch failure is harder to attribute than a single-task failure,
  and one bad demo forces a re-review of three. Judged worth it — the contract is
  now well-specified and browser-verified, which is what makes batching safe here.

Tasks 6+7+8: dispatched (BASE e607652, sonnet).

Tasks 6+7+8: DISPATCH FAILED — session rate limit (429), agent terminated early.
  No commits landed; working tree clean at ec92a06. Nothing to unwind.
  Resumed 2026-09-05 01:53 via the scheduled cron. Re-dispatching the same batch
  from BASE ec92a06. Batching ruling stands — fewer cycles matters more, not less,
  under a usage constraint.

Tasks 6+7+8: implemented (commits ec92a06..197b1fc — 4a26b40 Observable,
  36b7a73 Tabulator, 197b1fc AG Grid). vitest 25/25, playwright 20/20, vite build OK.
  Review dispatched (sonnet).
  500k survival: Observable survives (lazy-appends real rows, never prunes — memory
  grows unboundedly with scroll); Tabulator survives at 280ms/60fps but only after
  the fix below; AG Grid survives easily, fastest of the three, 248ms/60fps.

  HEADLINE FINDING (goes in the write-up): Tabulator's OWN DOCUMENTED
  `height: "100%"` pattern silently breaks its virtual-DOM row estimate — the
  viewport measures as 0px, so it renders EVERY row instead of the visible ones.
  62s at 50k rows; projected hours at 500k. Removing that single option (the harness
  host already has a real CSS height) took the 500k build to ~280ms. A ~200x
  difference hidden behind a documented example. Implementer verified AG Grid does
  not share the failure mode — it fails visibly and fast rather than silently slow.

Tasks 6+7+8: complete (commits ec92a06..197b1fc, spec ✅, quality approved,
  0 Critical, 1 Important folded forward, 1 Minor deferred)
  Reviewer verified all three data-scroller targets against the INSTALLED library
  internals rather than the diff — none fabricated. Notably it confirmed
  `.ag-body-vertical-scroll-viewport` (which the plan's brief suggested) is only the
  thin scrollbar track; the real content viewport is `.ag-grid-viewport`. Using the
  brief's selector would have produced a fake FPS number.
  Tabulator height:"100%" finding independently verified as accurate AND fairly
  framed — mechanism stated precisely, attributed to the library's documented
  pattern rather than editorialised. Playwright tabulator test completes in 496ms,
  confirming the 62s bug is genuinely fixed rather than merely claimed.

Task 6: Important (folded into the Tasks 9+10 dispatch rather than its own cycle):
  Observable Inputs CANNOT virtualize columns — reviewer checked
  node_modules/@observablehq/inputs/src/table.js; there is no column-windowing
  option and every column always renders. meta.notes discloses row-memory growth
  and missing theming but not this, despite `wide` being a named comparison axis.
  Ruling: fix is a single sentence in one meta.notes string with essentially zero
  regression surface. Folding it into the next dispatch gets it done and reviewed
  in that batch's diff, instead of spending a full implementer+re-review cycle on
  one sentence under a usage constraint. Cost if wrong: slightly muddied attribution
  between Task 6 and Tasks 9+10 in the git history.

Tasks 6+7+8: minor (deferred): AG Grid's createGrid was not independently verified
  to paint synchronously the way Tabulator's async tableBuilt path was interrogated.
  No evidence of a problem; would need runtime profiling of AG Grid's internal
  render scheduling to rule out deferred initial render inflating its 248ms result.

Tasks 9+10: dispatched (BASE 197b1fc, opus) — the two React demos, plus the folded
  Observable disclosure fix.

Tasks 9+10: implemented (commits 197b1fc..7baf4e6 — eaae7fe TanStack, 11503d0 Glide,
  7baf4e6 the folded Observable disclosure fix). vitest 25, playwright 30, build OK.
  Review dispatched (sonnet).
  500k: TanStack 141ms render, 59fps/1 dropped — cost is table-core building a Row
  object per SOURCE row, not the ~30 <tr>s in the DOM. Glide 24.6ms, 60fps, heap flat
  at 13MB; its large card is indistinguishable from its 1,000-row card.
  v9 API: every name in the brief checked out against the installed .d.ts — the
  pre-verification held. Only adaptation was using table.getLeafHeaders() /
  row.getAllCells() for column enumeration, since getVisibleLeafColumns belongs to a
  feature this demo does not opt into.

  CARRY INTO TASK 12 (implementer flagged): with two React demos present, Rollup
  hoists React into a SHARED chunk — tanstack was 259kB alone, now 65.8kB entry +
  193kB shared. Measuring only the entry chunk would understate both React demos by
  ~190kB. The plan's measure-bundles.mjs already walks the import graph via
  attributeChunks(), which is exactly the right shape — but Task 12 must verify the
  shared chunk is actually attributed to BOTH React demos and not double-counted or
  dropped.

  CORRECTION TO MY OWN PLAN (would have published something untrue): the plan's
  Glide meta.notes claimed its cell text is "invisible to Ctrl-F, screen readers and
  copy-paste of a selection". The implementer verified with window.find, using
  TanStack as a control: find-in-page and selection-copy ARE genuinely broken, but
  Glide DOES expose a hidden role="grid" mirror of the visible window, so the
  screen-reader half of the claim is false and has been removed from the notes.

  Note: Glide 6.0.3 caps its React peer at 18.x; a TARGETED `overrides` block was
  added to package.json rather than project-wide legacy-peer-deps. It also pulls 42
  packages (lodash, marked, react-responsive-carousel are required peers) — relevant
  to Task 12's bundle figure and worth a line in the evaluation.

Tasks 9+10: complete (commits 197b1fc..7baf4e6, spec ✅, quality approved,
  0 Critical/Important, 1 Minor deferred)
  Reviewer verified against installed sources: Glide's `.dvn-scroller` is a real
  overflow:auto scroller (not a track); its role="grid" mirror exists at
  data-grid.js:1054 and is provably viewport-bounded, confirming the narrowed
  accessibility claim (~15 visible rows exposed, not screen-reader-blind).
  Judged the timing methodology FAIR rather than React-flattering: flushSync forces
  a real commit inside the clock, the paint predicate is checked synchronously first
  so it costs nothing when already true, and not waiting for the compositor is
  applied uniformly (vanilla demos also stop at DOM-built + forced layout).
  TanStack legitimately leaves ctx.theme unused — it renders a real <table> styled
  by site CSS vars that already flip with data-theme. Honest asymmetry, disclosed.
  `overrides` confirmed targeted ($react inside Glide's own resolution only), single
  React 19.2.8 installed, no duplicate nested copy.

Tasks 9+10: minor (deferred): the absolute figures (Glide 24.6ms at 500k vs 33.2ms
  at 1k) are architecturally plausible but not reproducible from static review.
  Task 14's measurement pass re-collects all numbers on one machine anyway, which
  is where they should be pinned.

Task 11: dispatched (BASE 7baf4e6, opus) — Perspective. Highest-risk task: two live
  package homes and a WASM build. Explicit authority to record failure as a finding
  and move on rather than sink time.

Task 11: implemented (commits 7baf4e6..ade921f — 950d513 demo, ade921f docs).
  vitest 25, playwright 35, vite build clean. Review dispatched (sonnet).
  ALL SEVEN DEMOS NOW EXIST.

  Package ruling: chose @perspective-dev/{client,viewer,viewer-datagrid}@5.3.1 over
  @finos/perspective@3.8.0. finos.org redirects there, same maintainers/repo, whole
  family republished 2026-09-04, and all current docs are written against it.
  Caveat: 5.3.1 was ONE DAY OLD when used. Revert cost recorded in OPEN-QUESTIONS.md.

  Effort: LOW — worked on the first run. No peer conflicts, no COOP/COEP headers.
  Needed build.target "esnext"; the plan's optimizeDeps.exclude / worker.format
  advice was 3.x-era and unnecessary. Unusual step is a mandatory two-binary
  bootstrap (init_server/init_client with ?url wasm imports, one from a transitive
  package). Usable docs live in the repo at docs/md/how_to/javascript/importing.md,
  not on npm — worth saying in the evaluation.
  Numbers: small 77ms, wide 34.8ms, medium 274ms, large 2.1-2.7s; 60fps/1 dropped on
  EVERY dataset including 500k. Bundle 259kB JS + 184kB CSS + 3.9MB WASM.

  HARNESS CHANGE TO SCRUTINISE IN REVIEW: scrollerOf() in src/harness/mount.js was
  modified to descend into OPEN shadow roots — Perspective's real scroller is
  <regular-table> two shadow roots down, unreachable by the light-DOM query. Other
  demos hit the light-DOM query first, all 30 prior tests pass. Implementer rejected
  `.rt-scroll-table-clip` (19px of overflow — exactly the scrollbar-track trap the
  Tasks 6-8 review caught) and verified the scroll is real by watching row text change.

  FINDING: ctx.formatCell CANNOT be applied — Perspective exposes no per-cell hook,
  only Intl option bags. Dates render 7/26/24 not 2024-07-26 (no locale field
  exposed), nulls render blank not em-dash, numerics are tinted blue. So its columns
  do NOT look identical to the other six. Disclosed in meta.notes. This is a real
  limitation for a data-publishing audience and belongs in the evaluation.

  CARRY INTO TASK 12: do NOT sum Perspective's bundle into a column beside six JS
  libraries — 3.9MB is compiled Rust and gzip barely touches it. Report separately.
  CARRY INTO TASK 14: the 2.1s large figure is dominated by marshalling 500k JS
  objects into the worker; our shared Array<Object> is Perspective's WORST input
  format. It is not a ceiling, and saying so is necessary for a fair write-up.

Task 11: complete (commits 7baf4e6..ade921f, spec ✅, quality approved,
  0 Critical/Important, 3 Minor deferred)
  Shared-harness change CLEARED: `host.querySelector("[data-scroller]") ||
  findInShadow(host) || host` short-circuits, and the reviewer grepped all six other
  demos to confirm each sets data-scroller on a plain light-DOM element — so
  findInShadow is provably dead code for them, not merely unaffected in practice.
  Closed shadow roots return null per spec, so no throw; recursion walks a finite
  tree. 35/35 playwright including all 30 pre-existing.
  Scroller choice independently corroborated by reading regular-table's OWN shipped
  CSS: `:host{...overflow:scroll}` — the element itself is the scroll container by
  the library's stylesheet, while `.rt-scroll-table-clip` has no overflow rule.
  formatCell limitation verified real from the installed package's own type
  definitions (format_cell.d.ts, formatter_cache.d.ts, column-format.d.ts): Intl
  option bags only, no callback parameter anywhere, no locale field.
  Bundle figures reproduced by the reviewer's own build: JS 259.11kB, CSS 184.37kB,
  wasm 1,513kB + 2,463kB.

Task 11: minor (deferred): the "numeric cells tinted blue" observation is in the
  report but not in the on-page meta.notes where a site visitor would see it.
Task 11: minor (deferred): @perspective-dev/server wasm is imported directly though
  `server` is only a transitive dependency, not declared in package.json. Disclosed
  candidly by the implementer as an upstream quirk rather than hidden.
Task 11: minor (deferred, PRE-EXISTING and project-wide): no automated test clicks
  "Measure scroll FPS" and asserts the element actually moved, for ANY demo. FPS
  correctness has been established per-demo by manual verification plus reviewers
  reading library CSS. Worth an e2e fixture if the FPS column is to carry weight in
  the final scorecard.

NEXT.md refreshed (it had gone stale at "Task 11: not started" — the reviewer caught
  it; it is the crash-recovery doc so staleness there is the expensive kind).

Task 12: dispatched (BASE ade921f, opus) — bundle + LOC measurement. Carries the
  React shared-chunk attribution problem and the Perspective WASM separation.

Task 12: implemented (commit f298767). vitest 36/36 (25 + 11 new).
  `npm run build` SUCCEEDS END TO END for the first time since Task 1. Review
  dispatched (sonnet).

  MEASURED (gzip, 1kB = 1000B, matching Vite's reporter) — totalKB / loc:
    baseline    24.2 / 46      observable  29.9 / 50
    tabulator  132.7 / 89      aggrid     327.6 / 62
    tanstack   104.7 / 166     glide      188.6 / 148
    perspective 122.5 / 76  (+ 3935.1 kB WASM, reported separately, never summed)
  libKB (minus React runtime): tanstack 44.4, glide 128.3; shared react chunk 60.3.

  TWO NEAR-MISSES, each of which would have shipped confidently wrong headline
  numbers with a GREEN BUILD:
  (a) Vite's manifest keys imports as MANIFEST KEYS, not output paths. The plan's
      attributeChunks() mixed the two namespaces, found no file on disk, and would
      have added ZERO bytes for React to both React demos. The walk now stays in key
      space and bytesOf() THROWS on a manifest file missing from dist/ — failing
      loudly instead of silently zeroing.
  (b) Rollup named the shared React chunk `index`, so the plan's /react/i heuristic
      would have reported reactKB: 0. Fixed with an explicit manualChunks rule
      naming it `react`.
  Verified three ways: a two-entry shared-chunk unit fixture, printed per-demo file
  lists, and arithmetic against the build log.

  CARRY INTO TASK 13 (presentation problem, not a measurement bug): a 23.3 kB
  HARNESS FLOOR (shared mount + hyparquet + site.css) sits inside every totalKB and
  therefore every libKB. The baseline's own code is ~0.9 kB. Presented naively the
  scorecard implies a plain <table> costs 24 kB, which is false and would undercut
  the baseline's whole purpose as the floor of the comparison. bundles.json emits
  `harnessKB` alongside — Task 13 MUST either subtract it or state it explicitly.
  Also: AG Grid's cssKB is 1.6 (site chrome only) because AG Grid 36 themes from JS
  — not a saving, those bytes are inside its 326 kB. Glide has 8.1 kB of lazy chunks
  excluded from totalKB, reported as lazyKB.

Task 12: complete (commit f298767, spec ✅, quality approved, 0 Critical/Important,
  2 Minor deferred)
  Reviewer ran its OWN build and reproduced the table exactly. Confirmed the shared
  React chunk assets/react-Bk1giA63.js appears under BOTH tanstack and glide and no
  other demo. Confirmed bytesOf() throws on a missing file rather than contributing
  0. Confirmed manualChunks captures react-dom's `scheduler` dependency too.
  Endorsed emitting harnessKB rather than subtracting it — changing libKB's formula
  unilaterally would violate the interface Task 13 was written against.

Task 12: minor (deferred): the string "react" is coupled between manualChunks' return
  value and the graph[k].name === "react" filter. Same file, low risk.
Task 12: minor (deferred): a stale gzip-size copy remains in local node_modules; the
  lockfile is clean and `npm ci` would not install it.

RULING (Task 13 scorecard — the plan is now wrong and must be overridden):
  The plan's Task 13 says to put PROVISIONAL 1-5 subjective scores in the scorecard
  and correct them in Task 14. But Task 14 is deliberately reserved for the user, so
  provisional scores would ship looking final — I would be publishing invented
  ratings under their name on their site. Decided: the hub scorecard carries ONLY
  MEASURED columns (bundle kB, LOC, render ms, scroll FPS, 500k survival, licence),
  which are facts this project established. The subjective axes (default look, API
  ergonomics, docs) are omitted from the hub and left to EVALUATION.md, which the
  hub links to as "not yet written". The plan's e2e test asserting "no empty cells in
  the scorecard" must be adapted to the measured-only table rather than satisfied by
  filling cells with numbers I made up.
  Cost if wrong: the hub is less opinionated than the sibling line-charts repo's
  until the user writes EVALUATION.md. That is the correct direction of error — a
  measured table with an honest gap beats a confident table with fabricated taste.

Task 13: dispatched (BASE f298767, opus) — hub page. Last build task.

Task 13: complete (commit 2ee5d7b). vitest 36/36, playwright 39/39 (35 + 4 hub).
  Harness floor handled well: bundle column labelled "own code", hub.js computes
  libKB - harnessKB at runtime so the baseline reads 0.9 KB rather than 24 KB, with
  a footnote explaining the netting and raw totalKB still available in bundles.json.
  The Opus agent killed by the spend limit had already written a correct index.html
  (measured-only scorecard, WASM in its own column, no heap column, gap note
  deferring to EVALUATION.md); only src/harness/hub.js and the hub tests were
  missing. Recovering that uncommitted work was cheaper than a rewrite.

ALL 13 BUILD TASKS COMPLETE.

Ruling (spend limits have interrupted this project three times): MERGE the Task 13
  task-review into the final whole-branch review as a single dispatch, on sonnet
  rather than opus. Task 13 is the last task, so its diff is inside the branch diff
  anyway; a reviewer holding the whole branch can judge it in context better than in
  isolation; and opus is spend-limited. Cost if wrong: Task 13 receives less focused
  scrutiny than tasks 1-12 each got individually.

Final whole-branch review: dispatched (5a46631..2ee5d7b, sonnet).

FINAL WHOLE-BRANCH REVIEW (5a46631..2ee5d7b, 18 commits): structurally sound.
  Verified clean, no fabrication found: the timing boundary is identical for sync and
  async demos (awaits inside the clock, forces layout via offsetHeight for every
  demo); all seven data-scroller targets correct (baseline correctly has none — the
  host itself scrolls); bundles.json/hub.js net out the harness floor so the baseline
  reads ~0.9 KB own code; Perspective's 3.9MB WASM never summed with JS; the
  formatCell limitation disclosed at length rather than papered over; Land Registry
  OGL attribution present; no secrets, no absolute local paths, no placeholders.
  Reviewer also LIVE-CHECKED AG Grid's paint (69 rows present at 300ms, unchanged at
  1800ms after createGrid returns), resolving the Tasks 6-8 deferred concern about
  deferred initial render as a genuine non-issue.

  1 IMPORTANT: the baseline's own meta.notes (2.0s@50k, 6.2s@100k, 34.2s@200k)
  contradicts the hub scorecard (2,658ms@50k, 7.1s@100k) — the same measurement
  reported 33% and 15% apart, on a page whose footnote promises numbers "stable to
  within a few per cent across runs". Self-contradiction a reader could catch.
  Ruling: fix by RE-MEASURING and writing one consistent set into both places, and if
  the true spread is wider than "a few per cent", soften the footnote's stability
  claim rather than leave a promise the numbers cannot keep.

  Deferred minors triaged: ALL of them stay deferred. The reviewer judged every one
  cosmetic or a pre-existing project-wide gap with no effect on published numbers.

Fix wave: dispatched (BASE 2ee5d7b, sonnet) — 3 items: reconcile the baseline
  numbers by re-measuring, rewrite the README stub, pin @perspective-dev/server as a
  direct dependency. NEXT.md excluded — the coordinator owns it.
