# Next steps

Short handover note. If you are picking this up in a fresh session, read this first,
then `docs/plans/2026-09-04-tables-evaluation-design.md`.

## Where things stand

Design is written, reviewed and approved. **No implementation has started** — the
repo is documentation only.

## What to do next

1. Write the implementation plan with the `superpowers:writing-plans` skill, into
   `docs/plans/` alongside the design. Do not start coding before that plan exists.
2. Then build, in roughly this order:
   - `scripts/prepare-data.mjs` and the four datasets in `public/data/`
   - `src/data/` Parquet loader (`hyparquet`), and the `src/harness/` shell
   - the seven demos, easiest first: plain `<table>` baseline → Observable Inputs →
     Tabulator → AG Grid → TanStack → Glide → Perspective
   - `scripts/measure-bundles.mjs`, then the hub `index.html` and its scorecard
   - `ANALYSIS.md`, `EVALUATION.md`, `TODO.md`, and the draft post

## Decisions already made — do not relitigate

- **Vite multi-page build**, one entry per library. Not zero-build, despite the
  sibling `line-charts` repo being zero-build; we need real per-entry bundle numbers.
- **Seven libraries**, listed in the design. Deferred candidates go in `TODO.md`.
- **Large dataset is UK Land Registry price-paid.** NYC taxi is the recorded
  alternative.
- **Plain `<table>` baseline stays in.**
- **Local only for now.** Cloudflare Pages later; the build is a static `dist/`.

The design's "Decisions and recorded alternatives" section has the reasoning and the
cost of reversing each.

## Known risks to check early

- TanStack Table is **v9**; most tutorials online describe v8. Verify against v9 docs.
- Perspective is WASM — its bundle and load numbers do not compare like-for-like.
- Keep the prepared Parquet under ~25 MB; cut rows rather than reach for Git LFS.
