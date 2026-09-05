# Task 3 & 4 Implementation Report

## Task 3: Parquet loader

Files created (transcribed verbatim from the brief):
- `src/data/datasets.js` — `DATASETS` record (small/wide/medium/large) and `DATASET_KEYS`.
- `src/data/load.js` — `inferColumns`, `formatCell`, `loadDataset`.
- `tests/load.test.js` — test file from the brief.

TDD sequence followed:
1. Wrote `tests/load.test.js`.
2. `npx vitest run tests/load.test.js` — failed as expected: `Cannot find module '../src/data/datasets.js'`.
3. Wrote `src/data/datasets.js`.
4. Wrote `src/data/load.js`, importing `asyncBufferFromUrl` (not `asyncBufferFromFile`) from `hyparquet`, per the browser-runtime context note — this loader runs in the browser, and hyparquet's conditional exports mean the browser entry has no file reader.
5. `npx vitest run tests/load.test.js` — **8 tests passed** (the brief's step 5 comment said "9 tests"; the test file as given actually contains 8 `it` blocks — 2 in `inferColumns`, 5 in `formatCell`, 1 in `DATASETS` — so 8 is the correct count for this file; not a bug, just a stale comment in the brief).
6. Committed as `fc40fb0`.

No deviations from the brief's code. `loadDataset` caches the in-flight `Promise`, not the resolved value, as instructed — left unchanged.

## Task 4: Metrics module

Files created (transcribed verbatim from the brief):
- `src/harness/metrics.js` — `time`, `formatMs`, `peakMemoryMB`, `measureScrollFps`.
- `tests/metrics.test.js` — test file from the brief.

TDD sequence followed:
1. Wrote `tests/metrics.test.js`.
2. `npx vitest run tests/metrics.test.js` — failed as expected: `Cannot find module '../src/harness/metrics.js'`.
3. Wrote `src/harness/metrics.js`, including `measureScrollFps` even though the test file (correctly, per the brief and the task context) does not test it — it needs `requestAnimationFrame` and a real scrolling element, not available/meaningful under Node/vitest. No fake or mocked test was added for it, per instruction; it will be exercised later by Playwright.
4. `npx vitest run tests/metrics.test.js` — **7 tests passed**, matching the brief's expected count.
5. `peakMemoryMB` returns `null` when `performance.memory` is absent (verified by the "returns null when performance.memory is unavailable" test) rather than 0 or a guess, as required.
6. Committed as `c5de8eb`.

No deviations from the brief's code.

## Full suite verification

```
npx vitest run
```

```
 ✓ tests/metrics.test.js (7 tests) 2ms
 ✓ tests/prepare-data.test.js (6 tests) 10ms
 ✓ tests/load.test.js (8 tests) 17ms
 ✓ tests/scaffold.test.js (2 tests) 2ms

 Test Files  4 passed (4)
      Tests  23 passed (23)
```

All Task 1/2 tests (scaffold: 2, prepare-data: 6 = 8 total) still pass alongside the new Task 3 (8) and Task 4 (7) tests — 23 total.

## Commits

- `fc40fb0` — feat: parquet loader with shared cell formatter
- `c5de8eb` — feat: shared measurement helpers

## Concerns

None. No new dependencies were added (only `hyparquet`, already installed, used in `src/data/load.js`). Both modules match the briefs exactly; the only note is the brief's stray "9 tests" comment for Task 3 step 5, which doesn't match the test file it itself specifies (8 `it` blocks) — flagged above for visibility, not treated as a defect to fix.
