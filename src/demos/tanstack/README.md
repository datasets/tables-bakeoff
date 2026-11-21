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
- Headless means windowing is yours. The row and column virtualizers, spacer cells, `<colgroup>`, sticky header and sort arrows are all hand-written here.
- What you get is an ordinary `<table>` in your own markup: dark mode is the site's CSS, and select, copy and Ctrl-F work on the rows currently on screen.
- At 500,000 rows most of the render is TanStack building one row object per source row up front.
