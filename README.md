# Tables Bakeoff

**🔗 Live site: [tables.datahub.io](https://tables.datahub.io)**

A bake-off of seven open-source JavaScript table/grid libraries, run over the
same four datasets, built as a static site you open and scroll rather than a
written report. It is a deliberate sibling of the
[line-charts](https://linecharts.datahub.io/) repo: same structure, same
shared harness pattern, same idea of comparing libraries by building the same
thing seven times instead of reading seven sets of marketing copy.

The seven entries:

- Plain `<table>` — the baseline/control, no library at all
- [Observable Inputs](https://observablehq.com/framework/inputs/table)
- [Tabulator](https://tabulator.info/)
- [AG Grid Community](https://www.ag-grid.com/)
- [TanStack Table](https://tanstack.com/table) (v9)
- [Glide Data Grid](https://grid.glideapps.com/)
- [Perspective](https://perspective.finos.org/)

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

## Method

Every library renders the same four datasets (a small rich sample, a wide
80-column variant, a 50,000-row medium set, and a 500,000-row large set),
inside the same page shell, the same light/dark theme, and the same per-cell
formatter (`formatCell` in `src/data/load.js`). The intent is that what you're
comparing on screen is the library's own rendering and interaction behaviour,
not seven different amounts of styling effort. **Perspective is the one
exception**: it exposes no per-cell formatting callback, so its cells are
formatted by its own plugin config instead of the shared formatter — this is
disclosed in its demo's notes.

The hub page (`index.html`) publishes only what was actually measured on this
machine — bundle size, lines of code, render time, scroll FPS. There are no
1–5 ratings anywhere on the site; see "Not yet written" below.

## Adding an eighth library

1. Copy a directory under `src/demos/` (pick a vanilla one or a React one,
   whichever is closer) as `src/demos/<key>/`.
2. Add `demos/<key>.html` for it.
3. Add one entry to `DEMOS` in `vite.config.js`.
4. Add a `SOURCE_TOKEN` entry for it in `tests/e2e/demo.spec.js`.
5. Add a card for it to `index.html`.

## Not yet written

`docs/plans/` holds the original design and implementation plan.
`OPEN-QUESTIONS.md` records the judgment calls made while building this,
in case any should be revisited. `ANALYSIS.md` documents the measurement
method and its caveats. `EVALUATION.md` does not exist yet — the subjective
verdict (which library actually feels good to use, which one you'd reach for)
is deliberately left for the repo's owner to write, not invented here.

## Data attribution

Contains HM Land Registry data © Crown copyright and database right 2026.
This data is licensed under the Open Government Licence v3.0.
