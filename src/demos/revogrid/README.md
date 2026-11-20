---
name: RevoGrid
version: 4.31.8
license: MIT; Pro is paid
docs: https://rv-grid.com/guide/
homepage: https://rv-grid.com
github: https://github.com/revolist/revogrid
stars: 3465
npm: "@revolist/revogrid"
tagline: A web component. Virtual rows and columns, spreadsheet-style editing.
---

- Its `aftergridrender` event fires before a single cell exists, so timing on it reports about 5 ms whatever the row count. This demo waits for the first real cell instead.
- Fast at any size: about 55 ms for 500,000 rows and a steady 60 fps. The catch is how the code arrives: about 29 kB on page load, then about 82 kB more fetched when the first grid renders.
- Spreadsheet-style input: click a cell, move with the arrow keys, Cmd/Ctrl-C copies it. Multi-cell ranges need `range: true`, and native text selection is off. Ctrl-F finds only the rows currently on screen.
- The free core puts a small "RevoGrid" link in the corner, and its docs ask companies to keep it or pay for Pro ($199 to $499 per developer per year), which is also where pivot, Excel export and the richer filters live.
