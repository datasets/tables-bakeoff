# Tables Bakeoff — announcement blurbs

Copy to paste when announcing publicly. Three lengths; pick per channel. The dated record of the launch is `changelog/2026-09-05-tables-bakeoff.md`.

Live: https://tables.datahub.io/

---

## Short (social / one-liner)

We built the same data table seven times — plain `<table>`, Observable Inputs, Tabulator, AG Grid, TanStack Table, Glide Data Grid, Perspective — over the same datasets (up to 500k rows), same harness, same formatter. Measured bundle size, lines of code, render time, scroll FPS. No marketing copy, just the numbers → https://tables.datahub.io/

---

## Medium (newsletter / LinkedIn / post intro)

Which JavaScript table library should you actually reach for? We stopped reading feature pages and built the same table seven times instead: plain `<table>`, Observable Inputs, Tabulator, AG Grid Community, TanStack Table, Glide Data Grid, and Perspective — each rendering the same four datasets (up to 500,000 rows of UK Land Registry price-paid data) through one shared harness, one theme, and one per-cell formatter, so what you compare is the library and not someone's styling effort.

The site publishes only what was measured on one machine: gzipped bundle size, lines of code, render time at 50k and 500k rows, and scroll FPS. No 1–5 ratings — the subjective "which one feels good" verdict is left to the reader.

A few things that surprised us:

- A plain `<table>` **cannot** render 500,000 rows — uncapped it never finishes.
- Tabulator's own documented `height: "100%"` pattern silently disables virtualization: 62 seconds at 50k rows instead of 68 ms.
- Glide renders 500k rows faster than 1,000, because canvas paints a fixed viewport — but its text is invisible to find-in-page and copy-paste.
- Headless isn't free: TanStack has the smallest React bundle but needs nearly triple AG Grid's lines of code, because you write the virtualizer yourself.

Read it: https://tables.datahub.io/

---

## Long (blog post / full writeup intro)

**Comparing table libraries by building, not by reading.**

There are a lot of JavaScript table and grid libraries, and every one of them has a feature page that says it is fast and flexible. That is not much to go on. So this is a bake-off: the same table, built seven times, over the same data, measured the same way. It is a deliberate sibling of our [line-charts bake-off](https://linecharts.datahub.io/) — same structure, same idea.

**The seven entries**

- Plain `<table>` — the control, no library at all
- Observable Inputs
- Tabulator
- AG Grid Community
- TanStack Table (v9)
- Glide Data Grid
- Perspective

**The setup**

Every library renders the same four datasets — a small rich sample, a wide 80-column variant, a 50,000-row set, and a 500,000-row set (UK Land Registry price-paid data) — inside the same page shell, the same light/dark theme, and the same per-cell formatter. The intent is that what you see on screen is the library's own rendering and interaction behaviour, not seven different amounts of styling effort. Perspective is the one exception: it exposes no per-cell formatting hook, so its cells are formatted by its own plugin config — disclosed on its page.

The hub publishes only what was actually measured: gzipped "own code" bundle size (shared harness netted out), lines of code, render time, and scroll FPS. There are no subjective ratings anywhere on the site.

| Library | Bundle | LOC | 500k render | 500k FPS |
|---|---|---|---|---|
| Plain `<table>` | ~0.9 kB | 46 | **cannot** (capped at 100k) | — |
| Observable Inputs | ~6 kB | 50 | 6.7 ms | 60 fps |
| TanStack Table | 44.4 kB (+React) | 166 | 141 ms | 59 fps |
| Tabulator | ~109 kB | 89 | 280 ms | 60 fps |
| Glide Data Grid | 128.3 kB (+React) | 148 | 24.6 ms | 60 fps |
| AG Grid Community | ~304 kB | 62 | 248 ms | 60 fps |
| Perspective | ~99 kB JS + 3.9 MB WASM | 76 | 2.1–2.7 s | 60 fps |

**What came out of it**

- **A plain `<table>` cannot render 500,000 rows.** Uncapped it never finishes (abandoned at 10 minutes). The cost is table layout, not building the HTML.
- **Tabulator's own documented `height: "100%"` pattern silently destroys virtualization** — 62 seconds at 50k rows instead of 68 ms. A ~200× cliff hidden in the docs.
- **Glide renders 500k faster than 1,000 rows** because canvas paints a fixed viewport. Trade-off: text is invisible to find-in-page and selection-copy.
- **Headless is not free.** TanStack has the smallest React bundle but needs 166 lines of code (nearly triple AG Grid's 62) because you write the virtualizer yourself.
- **Perspective cannot use shared formatting.** No per-cell callback exists; its 2.1s on 500k is also not a ceiling — it is dominated by marshalling 500k JS objects to a worker.
- **Heap is unmeasurable by default.** Chrome pins `performance.memory.usedJSHeapSize` to exactly 10M without `--enable-precise-memory-info`, so there is no heap column.

**What we deliberately did not do**

Score them. Which table actually feels good to use — API ergonomics, docs quality, default look — is a judgment call, and it is left for the reader to make after spending time with the seven pages.

Method and full caveats: `ANALYSIS.md` in the repo.

**Data attribution**

Contains HM Land Registry data © Crown copyright and database right 2026, licensed under the Open Government Licence v3.0.
