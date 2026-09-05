# Next steps

The site is built, measured and reviewed. **The verdict is not written — that part is
yours.** This note says what exists, what it measured, and what I decided on your
behalf while you were away.

## What to do next

Write **Task 14** — the part deliberately left undone:

1. **`ANALYSIS.md`** — the method. Same four datasets, same theme, same shared cell
   formatter, same harness, so what is compared is the library rather than styling
   effort. Document how each metric is taken and its caveats: heap is unmeasurable by
   default (see below), Perspective's numbers are not like-for-like, scroll FPS is a
   scripted scroll on one machine, and render variance grows with render size.
2. **`EVALUATION.md`** — the verdict, with a recommendation per use case: a small rich
   table in a data story; a 500k-row exploratory grid; a DataHub dataset preview; an
   editable spreadsheet-like grid.
3. **The subjective scorecard.** The hub deliberately ships measured columns only.
   Add the taste axes (default look, API ergonomics, docs quality) once you have
   formed your own view.
4. **The post draft**, incorporating the practitioner research.

**The raw material is in `docs/reports/`** — one report per task, written by the agent
that built each demo, with per-library observations, timings, API friction and honest
caveats. `docs/reports/build-ledger.md` holds every decision made during the build.

Run `npm run dev` and look at the seven pages before you score anything.

## What exists

Branch `build/tables-bakeoff`, 22 commits off `main`. All 13 build tasks complete and
individually reviewed; final whole-branch review clean.

`npm install && npm run dev` · `npm test` (36) · `npm run test:e2e` (39) ·
`npm run build` (green end to end)

Seven demos over four shared datasets: plain `<table>` baseline, Observable Inputs,
Tabulator, AG Grid Community, TanStack Table v9, Glide Data Grid, Perspective.

## What it measured

Bundle is gzip, "own code" — the 23.3 kB shared-harness floor netted out. LOC counts
non-blank non-comment lines in the demo's own implementation.

| Library | Own code | LOC | 500k rows |
|---|---|---|---|
| Plain `<table>` | ~0.9 kB | 46 | **cannot** — capped at 100k |
| Observable Inputs | ~6 kB | 50 | survives; memory grows unboundedly while scrolling |
| TanStack Table v9 | 44.4 kB (+60.3 React) | 166 | 141 ms, 59 fps |
| Tabulator | ~109 kB | 89 | 280 ms, 60 fps |
| Glide Data Grid | 128.3 kB (+60.3 React) | 148 | 24.6 ms, 60 fps |
| AG Grid Community | ~304 kB | 62 | fastest; 248 ms, 60 fps |
| Perspective | ~99 kB JS + 3.9 MB WASM | 76 | 2.1–2.7 s, 60 fps |

### Findings worth building the write-up around

- **A plain `<table>` cannot do 500k rows.** Uncapped it never finished (abandoned at
  10 minutes). Capped at 100k. Re-measured: 2.6 s @ 50k, 6.9 s @ 100k, ~27 s @ 200k —
  sharply superlinear, and the cost is table *layout*, not building the HTML string.
- **Tabulator's own documented `height: "100%"` pattern silently destroys its
  virtualization.** The viewport measures 0 px, so it renders every row: 62 s at 50k,
  projected hours at 500k. Removing that one option took 500k to ~280 ms. A ~200×
  cliff hidden behind a documentation example.
- **Glide renders 500k faster than its own 1,000-row card** (24.6 ms) because canvas
  paints a fixed viewport. The cost: its text is invisible to find-in-page and
  selection-copy. It does expose a viewport-bounded `role="grid"` mirror, so it is not
  screen-reader-blind — an earlier draft of this project claimed otherwise and was wrong.
- **Headless is not free.** TanStack has the smallest React bundle but needs 166 lines
  — nearly triple AG Grid's 62 — because you write the virtualization yourself.
- **Perspective cannot use the shared formatter at all.** No per-cell hook exists, only
  Intl option bags. Its dates render `7/26/24`, nulls render blank, numerics are tinted
  blue. It is the one library whose columns genuinely do not match the other six.
  Its 2.1 s on 500k is also *not* a ceiling — it is dominated by marshalling 500k JS
  objects into the worker, and our shared `Array<Object>` is its worst input format.
- **Heap is unmeasurable by default.** Chrome pins `performance.memory.usedJSHeapSize`
  to exactly 10,000,000 without `--enable-precise-memory-info`; with the flag the same
  page reads 5/4/15/115 MB. There is no heap column anywhere, deliberately.

## Decisions I made for you

Full reasoning and reversal cost for each is in `OPEN-QUESTIONS.md`; the complete list
of build-time rulings is in `docs/reports/build-ledger.md`.

- **No subjective scores on the hub.** The plan said to ship provisional 1–5 ratings
  and fix them later; that would have published invented taste under your name.
  Measured columns only, with the gap stated and linked to `EVALUATION.md`.
- **Perspective is demoed from `@perspective-dev` 5.3.1, not `@finos` 3.8.0.** The
  FINOS docs site redirects there, same maintainers and repo, and it was one day old
  when measured.
- **Large dataset is UK Land Registry price-paid**, 500k rows sampled evenly across all
  12 months of 2024. NYC taxi is the recorded alternative.
- **The baseline stays in, capped and disclosed.** A scorecard needs a floor.

## Known gaps, none blocking

- `ANALYSIS.md` and `EVALUATION.md` do not exist — that is Task 14, above.
- No automated test clicks "Measure scroll FPS" and asserts the element moved. FPS
  correctness was established per-demo by manual checks and by reviewers reading each
  library's own CSS. Worth an e2e fixture if FPS is to carry weight in your scorecard.
- Deployment is local only. Cloudflare Pages later; the build is a static `dist/`.
- Remaining minor findings are triaged in `docs/reports/build-ledger.md` — the final
  review judged all of them cosmetic.
