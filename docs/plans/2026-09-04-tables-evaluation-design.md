# tables-evaluation — design

Date: 2026-09-04
Status: approved, pre-implementation

## Purpose

A bake-off of the leading open-source JavaScript table/grid libraries, built as a
site you can open and scroll. Every library renders the **same four datasets** with
the **same theme** through the **same harness**, so what you compare is the library —
its defaults, its API, how it behaves at scale — and not someone's styling effort.

It answers three questions for DataHub.io, data stories, and datapressr:

1. Which library gives the best **human experience** viewing a small, rich table?
2. Which library survives **several hundred thousand rows**?
3. What does each one **cost** — bundle size, lines of code, API friction?

This is a sibling to the `line-charts` repo and deliberately inherits its structure:
a hub page with cards and a scorecard, one page per library, a view-source panel,
and a live metrics badge.

## Non-goals

- Not a general "best grid" ranking for enterprise CRUD apps. The lens is data
  publishing and data exploration.
- Not a benchmark suite. Measurements are indicative and reproducible, not rigorous
  microbenchmarks.
- No paid or source-available libraries. Everything here is permissively licensed,
  on the same principle that excluded Highcharts from `line-charts`.

## The libraries (7)

| # | Library | Version | License | Role in the comparison |
|---|---------|---------|---------|------------------------|
| 1 | TanStack Table | 9.2.4 | MIT | Headless. You write every `<td>`. The bespoke-design ceiling. React adapter. |
| 2 | AG Grid Community | 36.1.0 | MIT | The enterprise default. Vanilla core, row virtualization, open-core. |
| 3 | Glide Data Grid | 6.0.3 | MIT | Canvas-rendered, React-only. Spreadsheet scroll feel at large row counts. |
| 4 | Tabulator | 6.5.2 | MIT | Vanilla, batteries-included: grouping, tree data, editing, export. |
| 5 | Perspective (FINOS) | 3.8.0 | Apache-2.0 | WASM + Apache Arrow, out-of-core, pivots. Eats Parquet/Arrow natively. |
| 6 | Observable Inputs `table` | 0.12.0 | ISC | The tiny end. ~5 lines, strong defaults, exploration ethos. |
| 7 | Plain `<table>` baseline | — | — | The control. ~20 hand-written lines. Shows what is free, and where it dies. |

`Perspective` is a different species from the rest — a data engine with a grid
attached. It will look unfair on "write a simple table" and unbeatable at 500k rows.
That contrast is the most decision-relevant finding for DataHub, which is why it is in.

### Excluded, with reasons

- **Handsontable** — not free for commercial use.
- **Grid.js** — last published 2024-03; unmaintained.
- **RevoGrid, MUI X DataGrid, DataTables** — reasonable, but do not beat the seven
  above on any axis this evaluation cares about. Logged in `TODO.md` as possible
  later additions.

## The four datasets

Each dataset stresses a different axis. Every library renders all four.

1. **Small & rich (~1,000 rows)** — mixed types: dates, floats, categorical strings,
   long free text, URLs, and nulls. Stresses typography, alignment, number and date
   formatting, null rendering, text overflow. This is the "great human experience"
   axis, which is about defaults rather than speed.
2. **Wide (~80 columns)** — column virtualization is a distinct problem from row
   virtualization and most published benchmarks ignore it. Stresses horizontal
   scroll, column pinning, header behaviour.
3. **Medium (~50,000 rows)** — the point where naive full-DOM rendering starts to
   fall over but has not yet collapsed. Separates "has virtualization" from
   "has good virtualization".
4. **Large (~500,000 rows, real data)** — UK Land Registry price-paid, served as
   **Parquet** (roughly 5–15 MB, versus 40–80 MB as CSV). Stresses load time, scroll
   performance, memory, and sorting/filtering at scale. See "Decisions and recorded
   alternatives" for why this source and what the alternative is.

Data is prepared by `scripts/prepare-data.mjs`, which fetches upstream sources and
writes the four files into `public/data/`. Prepared files are committed so the site
builds without network access to upstream.

Loading: `hyparquet` decodes Parquet to columnar arrays in the shared loader.
Perspective receives Arrow directly, since forcing it through the row-array path
would misrepresent it.

## Architecture

```
index.html                 hub: cards, scorecard, method summary
vite.config.js             multi-page build, one entry per demo
scripts/prepare-data.mjs   upstream sources -> public/data/*.parquet
scripts/measure-bundles.mjs post-build: per-entry min+gzip -> public/bundles.json
public/data/*.parquet      the four prepared datasets
src/harness/               shared page shell, theme, metrics, source panel
src/data/                  parquet -> columnar loader, shared by all demos
src/demos/<lib>/           the only code that differs between libraries
ANALYSIS.md                method
EVALUATION.md              verdict
TODO.md                    deferred libraries and follow-ups
```

### Harness contract

Each demo module exports the same shape, mirroring `line-charts`' `mountDemo`:

```js
export const meta = { name, version, license, docs, tagline, notes };
export const tables = { small, wide, medium, large };  // (host, data, ctx) => cleanup?
```

The harness owns the page shell, the theme, the metrics badges, and the source
panel. A demo owns nothing but its four render functions. This is what makes the
comparison fair, and it is why adding an eighth library later is a single directory.

### React policy

React is used **only** where the library requires it — TanStack Table and Glide Data
Grid. AG Grid, Tabulator, Perspective, Observable Inputs and the baseline are
vanilla. Vite handles both in one build.

Bundle size is therefore reported **two ways**: library alone, and library plus the
React runtime it drags in. Reporting only the second would unfairly penalise
TanStack and Glide; reporting only the first would hide a real cost.

## Measurements

Captured automatically and displayed in-page, so the numbers on the site are the
numbers from your machine, not claims from a blog post.

| Metric | How |
|--------|-----|
| Time to first painted row | `performance.now()` from load start to first row visible |
| Sustained scroll FPS | Scripted scroll over a fixed distance, frame timing via rAF |
| Peak memory | `performance.memory` where available (Chromium only; omitted elsewhere) |
| Bundle, min+gzip | `scripts/measure-bundles.mjs` walks each entry's real chunk graph post-build |
| Lines of implementation | Counted from the demo source at build time |

Lines of implementation is the proxy for **build cost** — how much code you write to
get a good table. It is crude but honest, and it is reported alongside the source so
readers can judge it themselves.

## Error handling

- A demo that throws renders its stack into its own card and does not take the page
  down. Inherited from `line-charts`' `page.js`.
- A library that cannot handle a dataset at all (the plain `<table>` baseline at
  500k rows is the expected case) records that as a result, with the failure mode
  described, rather than being quietly skipped. The failure *is* the finding.
- Data load failures show a message in the card with the URL that failed.

## Testing

There is no unit-test surface worth building here — the deliverable is a site you
look at. Verification is:

- Every demo page renders all four tables without a console error, in Chromium and
  in Firefox.
- The large dataset scrolls without the tab locking up, for every library that
  claims to support it.
- `npm run build` succeeds and `scripts/measure-bundles.mjs` emits a complete
  `bundles.json` covering all seven entries.
- The hub scorecard has no empty cells.

## Deployment

Local (`npm run dev`, `npm run preview`) for now. Cloudflare Pages later — the build
is a static `dist/`, so this is a configuration step, not a design constraint.

## Deliverables

1. The site: hub plus seven demo pages.
2. `ANALYSIS.md` — method, datasets, how each measurement is taken, caveats.
3. `EVALUATION.md` — the verdict: scorecard with reasoning, and a recommendation per
   use case (small rich table / large data / embedded in a data story).
4. A draft post, incorporating research into what practitioners in the data
   visualization and data publishing community actually recommend.
5. `TODO.md` — deferred libraries and follow-up ideas.

## Decisions and recorded alternatives

Two calls were left open at design review. Both are settled below, with the road not
taken recorded so it can be picked up cheaply later.

### Large dataset source — decided: UK Land Registry price-paid

Chosen because it is a table a human would actually *read*: addresses, place names,
dates, prices. That matters here, because half of what this evaluation measures is
the reading experience — text overflow, column width behaviour, date and currency
formatting. A table of anonymous trip IDs and float durations exercises none of it.

**Alternative, if we want it later: NYC taxi trips.** Its advantage is recognition —
it is the dataset nearly every published grid benchmark uses, so our numbers would be
directly comparable to theirs. Switching is cheap by construction: `prepare-data.mjs`
is the only file that knows where the large dataset comes from, and the harness sees
nothing but columnar arrays. If we ever want to argue with someone else's benchmark
numbers, switch to taxi; until then, Land Registry makes a better demo.

### Plain `<table>` baseline — decided: keep it

Kept because a scorecard without a floor is unreadable. "AG Grid scores 5 on large
data" means nothing until you can see what 1 looks like, and the honest answer is
that a plain table is genuinely fine — often *better* — for the small rich dataset,
which is a real finding and not a joke entry. Cost is about twenty lines.

**Alternative, if it reads as clutter later:** drop entry 7 and let Observable Inputs
serve as the low end. This costs nothing to reverse — the baseline is one directory
under `src/demos/` and one card on the hub, with no other module depending on it.

## Risks

- **TanStack Table is v9**, released recently; most tutorials and blog posts describe
  v8. Expect API drift from documentation found by search. Verify against the v9 docs.
- **Perspective is WASM** — bundle accounting and load timing work differently from
  the JS libraries. Report it explicitly rather than forcing it into the same number.
- **`performance.memory` is Chromium-only.** Omit the metric elsewhere rather than
  substituting a worse proxy.
- **500k rows of real data** is a large repo file. If Parquet lands over ~25 MB,
  reduce the row count rather than switching to Git LFS.
