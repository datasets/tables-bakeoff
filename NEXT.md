# Next steps

Live handover note — rewritten after each task, so a fresh session can resume from
here at any moment. Last updated: Task 5 fix round 1, re-review in flight.

## How to resume

1. Read `.superpowers/sdd/2026-09-04-tables-evaluation-implementation/progress.md`
   — the SDD ledger. Tasks with a `Task N: complete` line are DONE; never redo them.
   It also holds every ruling made so far, with the cost of each being wrong.
2. `git log --oneline` on branch `build/tables-bakeoff` to confirm against reality.
3. Read `OPEN-QUESTIONS.md` for decisions taken on the user's behalf.
4. Continue with `superpowers:subagent-driven-development` against
   `docs/plans/2026-09-04-tables-evaluation-implementation.md`.

## State

Branch `build/tables-bakeoff`, off `main` at 5a46631.

| Task | State |
|---|---|
| 1 scaffold | complete, review clean |
| 2 datasets | complete, review clean |
| 3 loader | complete, review clean |
| 4 metrics | complete, review clean |
| 5 harness + baseline | fix round 1 done, scoped re-review in flight |
| 6 Observable Inputs | not started |
| 7 Tabulator | not started |
| 8 AG Grid | not started |
| 9 TanStack Table | not started |
| 10 Glide Data Grid | not started |
| 11 Perspective | not started |
| 12 bundle measurement | not started |
| 13 hub + scorecard | not started |
| 14 write-up | **deliberately left for the user** |

Working now: `npx vitest run` (25), `npx playwright test` (5), `npx vite build`.
`npm run build` fails on its second half until Task 12 creates
`scripts/measure-bundles.mjs`. That is expected, not a defect.

## Measured findings so far

- **A plain `<table>` cannot render 500,000 rows.** Uncapped it never finished
  (abandoned at 10 min, tab unresponsive). Capped at 100,000, disclosed on the card.
  Cost is table *layout*, not string building: 2.0s @ 50k, 6.2s @ 100k, 34.2s @ 200k.
- **Heap is unmeasurable by default.** Chrome pins `performance.memory.usedJSHeapSize`
  to exactly 10,000,000 without `--enable-precise-memory-info`. With the flag the
  same page reads 6/5/17/115 MB. Heap is therefore NOT a scorecard column.
- Data: 500,000 rows / 17.4 MB Parquet, sampled evenly across all 12 months of 2024.

## Standing rulings — carry into every remaining demo dispatch (Tasks 6-11)

These are NOT in the plan text. A dispatch missing them will produce broken or
dishonest demos.

- **`ctx.theme` is a token object, not a string.** `ctx.theme.dark` is the
  discriminator. The plan's AG Grid code says `ctx.theme === "dark"` — always false.
- A render function **may return a promise**; it is awaited inside the timed region.
- A demo owning its own scrolling viewport **must** mark it `data-scroller`, or the
  FPS run reports a fake flat 60fps on an element that never moved.
- **`ctx.reportRows(n)`** reports rows actually rendered, for demos that cap.
  Virtualization is NOT capping — a virtualized demo must not call it.
- Each demo joining the Playwright `BUILT` list must add its own `SOURCE_TOKEN`.
- **Perspective (Task 11)** has two live package homes as of 2026-09-04:
  `@finos/perspective@3.8.0` and `@perspective-dev/client@5.3.1` (the FINOS docs
  site now redirects to the latter). Verify before installing. If it cannot be made
  to work in reasonable time, that is a FINDING: record it in `TODO.md` and
  `EVALUATION.md`, drop it from `BUILT`, and continue — it must not block Task 12.

## Do not do Task 14 autonomously

The scorecard scores, `EVALUATION.md` and the post draft are the user's to write.
They are judgment about which table feels good to a human. Build and measure
everything through Task 13, then stop.
