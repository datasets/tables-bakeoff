---
date: 2026-11-21
title: A verdict, nine libraries, and every number measured again
promote: true
---

The [front page](https://tables.datahub.io/) now leads with the answer. Use a plain `<table>` up to a few thousand rows. Past that, AG Grid Community if you want it done, TanStack Table if you want your own markup, and Tabulator if people need to edit cells. DataHub picked TanStack, and the page says why and what that costs us.

![The front page: the verdict, why DataHub picked TanStack, and four picks by use case](/changelog/2026-11-21-verdict-and-nine-libraries.png)

- **Nine entries, up from seven.** DataTables 3, now without jQuery, and RevoGrid joined. RevoGrid turned out to be the fastest DOM grid at 500,000 rows.
- **A live gallery.** Every library renders the same 1,000 rows side by side on the front page, embedded from its own demo, with the render time measured in your browser.
- **Measured again on the November 2026 releases.** Every render, scroll and sort figure is the median of five fresh page loads on one machine. The raw runs are in the repo.
- **A sort test and an edit test.** Sorting 500,000 rows by price is timed for every grid. The edit test double-clicks a price and pastes a column, and only counts a value that reached the data.
- **Two yes-or-no checks.** Can you select text with the mouse, and can you sort from the keyboard? Only AG Grid, DataTables and TanStack sort from the keyboard, and TanStack only after we fixed our own demo. Screen readers were not tested, and the page says so.

The reasoning, the scorecard and what was not tested are in [EVALUATION.md](https://github.com/datasets/tables-bakeoff/blob/main/EVALUATION.md).
