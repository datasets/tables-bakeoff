---
name: Glide Data Grid
version: 6.0.3
license: MIT
docs: https://docs.grid.glideapps.com/
homepage: https://grid.glideapps.com
github: https://github.com/glideapps/glide-data-grid
stars: 5326
npm: "@glideapps/glide-data-grid"
tagline: Canvas-rendered, React-only. Spreadsheet feel at any row count.
---

Nothing you can see is in the DOM. Cell text is painted into a canvas: measured on this page, selecting the whole grid and copying yields an empty string, and find-in-page cannot match a value that is plainly visible on screen (window.find returns false for a cell here and true for the same value in the TanStack demo). It is fairer than the usual canvas-grid complaint, though — Glide does maintain a hidden role="grid" mirror of the currently visible window, about fifteen rows of it, so a screen reader gets the viewport rather than nothing; what no assistive tool or search gets is the other 499,985. What it buys is that row count is close to free: the grid is handed a number and a getCellContent(col, row) callback and never touches the data, so 500,000 rows set up in about the same time as 1,000 and memory does not move as you scroll. Two rough edges: it is the only library here that will not size itself from CSS — give it width/height of '100%' and it lays out at zero and paints an empty box until its own observer catches up, so this demo measures the host and passes pixels — and 6.0.3, the current release, still caps its React peer at 18.x, so installing it next to the React 19 that TanStack pulled in needs an npm override. Its theming is the best of the seven though: one plain object of tokens, no CSS overrides, no generated class names to target.
