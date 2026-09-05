---
name: AG Grid Community
version: 36.1.0
license: MIT (Community tier)
docs: https://www.ag-grid.com/javascript-data-grid/
homepage: https://www.ag-grid.com
github: https://github.com/ag-grid/ag-grid
stars: 15584
npm: ag-grid-community
tagline: The enterprise default. Vanilla core, row + column virtualization.
---

Open-core. Pivoting, row grouping with aggregation, server-side row model and the integrated charts are Enterprise ($999/dev) — everything shown here is the free MIT tier. v33 replaced the old CSS-theme-file approach with a JS Theming API (themeQuartz.withParams(...)) and made ModuleRegistry.registerModules([AllCommunityModule]) mandatory before createGrid or it throws at construction — most tutorials still online predate both changes, and so does the AG Grid tutorial this shipped from: it also had the grid scrolling '.ag-body-viewport', a class that does not exist anywhere in v36's actual DOM (confirmed against the live page, not docs) — the real scrolling element is '.ag-grid-viewport'. It is also the one demo of the three where setting height: "100%" on the host directly, rather than leaving its existing CSS height alone, does NOT quietly wreck performance the way it does for Tabulator — AG Grid just renders with a collapsed 0px viewport instead, which is visually broken but fast, so the failure mode is at least the kind you notice immediately rather than the kind you have to profile for. Heaviest bundle of the three vanilla demos by a wide margin, and the only one that never dropped a frame scrolling 500,000 rows.
