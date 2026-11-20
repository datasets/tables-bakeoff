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

- Canvas: cells are painted, not DOM. The grid's own selection and copy work once `getCellsForSelection` is set (Ctrl/Cmd-C copies a range as tab-separated text, off-screen rows included). Browser Ctrl-F and native text selection find nothing; a hidden `role="grid"` mirror of the visible rows serves screen readers.
- The grid gets a row count and a `getCellContent(col, row)` callback and never touches the data, so 500,000 rows cost about the same as 1,000.
- It will not size itself from CSS: at `100%` it paints an empty box until its own observer catches up, so this demo passes pixel sizes.
- The best theming here, one plain object of tokens. But 6.0.3 (Feb 2024) is still the latest release and its React peer stops at 18, so it needs an npm override next to React 19.
