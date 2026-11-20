---
date: 2026-11-21
title: The front page now says what to use
promote: true
---

The front page leads with the answer: use a plain `<table>` until it hurts, then AG Grid Community if you want it done, TanStack Table if you want it yours, Tabulator if people need to edit cells. Four picks by use case, each linked to its live demo, then every library rendering the same 1,000 rows side by side, embedded live, with its render time measured in your browser. The measured table gained last-release and paywalled columns, and a 1 to 5 scorecard with a one-line reason per library sits under it. The reasoning, what was not tested, and what DataHub will use are in [EVALUATION.md](https://github.com/datasets/tables-bakeoff/blob/main/EVALUATION.md).

![The new front page: the verdict, four picks and the live gallery](/changelog/2026-11-21-front-page.png)

Also: every demo page has a `?bare=1` mode that renders one dataset with no chrome, which is what the gallery embeds, and the build now writes `bundles.json` into `dist/` too, so a deploy no longer serves the previous build's bundle sizes.
