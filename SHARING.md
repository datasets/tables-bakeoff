# Tables Bakeoff — sharing & announcement

A bake-off of seven open-source JavaScript table/grid libraries, run over the same four datasets and measured in a rigorous, reproducible way. The site itself is a scroll-through evaluation, not a written report.

## What exists

All seven demos complete and measured:
- Plain `<table>` — baseline, no library
- Observable Inputs
- Tabulator
- AG Grid Community
- TanStack Table (v9)
- Glide Data Grid
- Perspective

Four shared datasets: small (1,000 rows, 16 columns), wide (1,000 rows, 80 columns), medium (50,000 rows), large (500,000 rows).

Branch `build/tables-bakeoff`, 22 commits off main. All build tasks complete and reviewed. `npm install && npm run dev` works end-to-end; `npm run build` is green.

## What it measured

Bundle size (gzipped "own code", shared harness netted out), lines of code, render time on 50k and 500k rows, scroll FPS at 500k rows.

| Library | Bundle | LOC | 500k render | 500k FPS |
|---|---|---|---|---|
| Plain `<table>` | ~0.9 kB | 46 | **cannot** (capped at 100k) | — |
| Observable Inputs | ~6 kB | 50 | 6.7 ms | 60 fps |
| TanStack Table | 44.4 kB (+React) | 166 | 141 ms | 59 fps |
| Tabulator | ~109 kB | 89 | 280 ms | 60 fps |
| Glide Data Grid | 128.3 kB (+React) | 148 | 24.6 ms | 60 fps |
| AG Grid Community | ~304 kB | 62 | 248 ms | 60 fps |
| Perspective | ~99 kB JS + 3.9 MB WASM | 76 | 2.1–2.7 s | 60 fps |

## Key findings

- **A plain `<table>` cannot render 500,000 rows.** Uncapped it never finishes (abandoned at 10 minutes). The cost is table layout, not HTML building.
- **Tabulator's own documented `height: "100%"` pattern silently destroys virtualization** — 62 seconds at 50k rows instead of 68 ms. A ~200× performance cliff hidden in the docs.
- **Glide renders 500k faster than 1,000 rows** (24.6 ms vs. slower single-card render) because canvas paints a fixed viewport. Trade-off: text is invisible to find-in-page and selection-copy.
- **Headless is not free.** TanStack has the smallest React bundle but needs 166 lines of code (nearly triple AG Grid's 62) because you write the virtualizer yourself.
- **Perspective cannot use shared formatting.** No per-cell callback exists; it formats through Intl option bags only. Its 2.1s on 500k is also not a ceiling — it's dominated by marshalling 500k JS objects to a worker.
- **Heap is unmeasurable by default.** Chrome pins `performance.memory.usedJSHeapSize` to exactly 10M without `--enable-precise-memory-info`, so no heap column appears.

## Method

Every library renders the same four datasets through the same harness, same theme tokens, same per-cell formatter. This ensures what you're comparing is the library's rendering and interaction, not someone's styling effort.

**Exception:** Perspective has no per-cell formatting hook, so its cells are formatted by its own plugin config — disclosed on its page.

The hub publishes measured columns only (bundle, LOC, render, FPS). No subjective 1–5 ratings; the verdict is deliberately left for evaluation by the repo owner, not invented here.

## Decisions made

Full reasoning in `OPEN-QUESTIONS.md`; build-time rulings in `docs/reports/build-ledger.md`.

- No subjective scores on the hub (measured columns only; gap is stated and linked to future `EVALUATION.md`).
- Perspective demoed from `@perspective-dev` 5.3.1 (FINOS redirects there; same maintainers).
- Large dataset is UK Land Registry price-paid data, 500k rows sampled across 2024.
- Baseline stays in the scorecard, capped and disclosed, as a floor.

## Known gaps

- `ANALYSIS.md` and `EVALUATION.md` don't exist — that's Task 14.
- No automated test for scroll FPS correctness; established per-library by manual review.
- Deployment is local only (Cloudflare Pages pending).
- Minor findings triaged in `docs/reports/build-ledger.md`.

## Data attribution

Contains HM Land Registry data © Crown copyright and database right 2026, licensed under the Open Government Licence v3.0.
