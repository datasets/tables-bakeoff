---
date: 2026-09-05
title: Tables bakeoff — seven JS grid libraries, measured
promote: true
---

Built a scroll-through evaluation of seven open-source JavaScript table/grid libraries — plain `<table>`, Observable Inputs, Tabulator, AG Grid Community, TanStack Table, Glide Data Grid, and Perspective — each rendering the same four datasets (up to 500,000 rows of UK Land Registry price-paid data) through one shared harness, theme, and per-cell formatter, so what's compared is the library and not someone's styling effort.

See it live: [tables.datahub.io](https://tables.datahub.io). The hub publishes measured columns only — gzipped bundle size, lines of code, render time on 50k and 500k rows, scroll FPS — with no subjective scores.

Some findings that came out of it:

- A plain `<table>` cannot render 500,000 rows — uncapped it never finishes. The cost is table layout, not building the HTML.
- Tabulator's own documented `height: "100%"` pattern silently disables virtualization: 62 seconds at 50k rows instead of 68 ms, a ~200× cliff hidden in the docs.
- Glide renders 500k rows faster than 1,000 because canvas paints a fixed viewport — but its text is invisible to find-in-page and copy-paste.
- Headless isn't free: TanStack has the smallest React bundle but needs nearly triple AG Grid's lines of code because you write the virtualizer yourself.

Method and caveats are written up in `ANALYSIS.md`; the verdict is deliberately left for the repo owner rather than invented here.
