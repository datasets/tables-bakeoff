---
name: TanStack Table
version: 9.3.1
license: MIT
docs: https://tanstack.com/table/latest
homepage: https://tanstack.com/table
github: https://github.com/TanStack/table
stars: 28409
npm: "@tanstack/react-table"
tagline: Headless. It computes rows and sorting; you write every element.
---

- v9 is a rewrite of v8: `getCoreRowModel()` is gone and features are opted into with `tableFeatures()`. Most examples online are v8 and do not compile; the `.d.ts` files were our docs.
- Headless means you write the windowing. The row and column virtualizers, spacer cells, `<colgroup>`, sticky header and sort arrows are all hand-written here.
- What you get is an ordinary `<table>` in your own markup: dark mode is the site's CSS, and browser text selection, copy and Ctrl-F work on the rows currently on screen.
- You write keyboard sort too. Each header is a `<button>` inside the `<th>`, with `aria-sort` on the `<th>`, so Tab and Enter sort. Our first version put a click handler on the `<th>` and was mouse only.
- At 500,000 rows most of the render is TanStack building one row object per source row up front.
