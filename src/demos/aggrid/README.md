---
name: AG Grid Community
version: 36.3.0
license: MIT (Community tier)
docs: https://www.ag-grid.com/javascript-data-grid/
homepage: https://www.ag-grid.com
github: https://github.com/ag-grid/ag-grid
npm: ag-grid-community
tagline: The enterprise default. Vanilla core, row + column virtualization.
---

- Since v33 you register modules before `createGrid` or it throws. This demo registers `AllCommunityModule`, as the quick start does, which is most of its size.
- Theming is a JavaScript API (`themeQuartz.withParams`) that took the site's colours. Most tutorials online predate it and predate the module change.
- It draws grid markup (`div role="grid"`), not a `<table>`. Browser text selection is off unless you set `enableCellTextSelection`, which this demo does not. Headers sort from the keyboard: Tab to one, press Enter.
- Mistakes fail visibly: a host with no height draws an empty grid instead of slowly rendering every row.
- Row grouping, pivot, range selection, clipboard and Excel export are Enterprise ($999 per developer). Everything on this page is the free MIT tier.
