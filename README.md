# Tables Bakeoff

**🔗 Live site: [tables.datahub.io](https://tables.datahub.io)**

A bake-off of open-source JavaScript table/grid libraries (eight libraries and
a plain `<table>`), run over
the same four datasets, built as a static site you open and scroll rather than
a written report. The front page leads with the verdict and embeds every
demo live; the reasoning is in [EVALUATION.md](./EVALUATION.md). It is a deliberate sibling of the
[line-charts](https://linecharts.datahub.io/) repo: same structure, same
shared harness pattern, same idea of comparing libraries by building the same
thing many times instead of reading many sets of marketing copy.

The nine entries:

- Plain `<table>` — the baseline/control, no library at all
- [Observable Inputs](https://observablehq.com/framework/inputs/table)
- [Tabulator](https://tabulator.info/)
- [AG Grid Community](https://www.ag-grid.com/)
- [TanStack Table](https://tanstack.com/table) (v9)
- [Glide Data Grid](https://grid.glideapps.com/)
- [Perspective](https://perspective.finos.org/)
- [DataTables](https://datatables.net/) (v3, jQuery-free)
- [RevoGrid](https://rv-grid.com/)

## Running it

```
npm install
npm run data      # regenerates the Parquet fixtures — only needed if you
                   # want to rebuild them; the files are already committed
npm run dev        # dev server
npm run build      # production build + bundle-size measurement
npm run preview    # serve the production build locally
npm test           # vitest
npm run test:e2e   # playwright
```

Measurement scripts (each says how to run it at the top):
`scripts/measure-all.mjs` re-measures every render, FPS and sort figure on the
front page (about 15 minutes; `--only aggrid,tabulator` for some),
`scripts/measure-sort.mjs` times "Sort by price" on every large card,
`scripts/edit-test.mjs` runs the edit test, and
`scripts/measure-aggrid-lean.mjs` sizes AG Grid with all Community modules
against only the ones its demo uses.

## Method

Every library renders the same four datasets (a small rich sample, a wide
80-column variant, a 50,000-row medium set, and a 500,000-row large set),
inside the same page shell, the same light/dark theme, and the same per-cell
formatter (`formatCell` in `src/data/load.js`). The intent is that what you're
comparing on screen is the library's own rendering and interaction behaviour,
not different amounts of styling effort. **Perspective is the one
exception**: it exposes no per-cell formatting callback, so its cells are
formatted by its own plugin config instead of the shared formatter — this is
disclosed in its demo's notes.

The front page (`index.html`) renders from two sources: `bundles.json`, which
the build writes (bundle size, lines of code), and `src/harness/results.js`
(render time, scroll FPS, release dates, licence notes, and the 1 to 5
scorecard with its reasons). Every typed-in number lives in `results.js` so one
sweep updates the page. The numbers come from `node scripts/measure-all.mjs`
(builds, serves the production build, five fresh page loads per figure, waits
for a quiet machine; output in `docs/reports/measurements-<date>.{json,md}`).
A value from a run you do not yet trust can carry `verify: true` and renders
with a `data-verify` attribute.

Each demo page also has a `?bare=1` mode (optionally `&dataset=small|wide|medium|large`)
that renders one dataset with no page chrome and posts its render time to the
parent window. The front page gallery is one of those iframes per entry.

## Adding a library

1. Copy a directory under `src/demos/` (pick a vanilla one or a React one,
   whichever is closer) as `src/demos/<key>/`.
2. Add `demos/<key>.html` for it.
3. Add one entry to `DEMOS` in `vite.config.js`.
4. Add a `SOURCE_TOKEN` entry for it in `tests/e2e/demo.spec.js`.
5. Add one entry to `ENTRIES` in `src/harness/results.js`. The gallery, the
   measured table and the scorecard render from it.

## Documents

`EVALUATION.md` is the verdict: per-use-case picks with reasoning, the
scorecard with reasons, what was not tested, and what DataHub will use.
`ANALYSIS.md` documents the measurement method and its caveats.
`OPEN-QUESTIONS.md` records the judgment calls made while building this, in
case any should be revisited. `docs/plans/` holds the original design and
implementation plan; `docs/launch/` the pre-mortems for the launch.

## Data attribution

Contains HM Land Registry data © Crown copyright and database right 2026.
This data is licensed under the Open Government Licence v3.0.
