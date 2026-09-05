---
name: Observable Inputs
version: 0.12.0
license: ISC
docs: https://observablehq.github.io/framework/inputs/table
homepage: https://observablehq.com/framework/lib/inputs
github: https://github.com/observablehq/inputs
stars: 171
npm: "@observablehq/inputs"
tagline: One function call. Strong defaults, built for data exploration.
---

Inputs.table appends rows lazily as you scroll rather than windowing — nothing already in the DOM is ever removed, so memory grows with how far you scroll and never comes back down; on the 500,000-row card that means a full scroll to the bottom leaves every row live in the page. Its stylesheet is fixed light-mode with no theming hook at all, so dark mode here is a scoped CSS override keyed by the table's own generated id — Inputs.table exposes nothing for this itself. There is no column windowing either — @observablehq/inputs has no option for it and builds a <td> for every column of every row it appends (src/table.js line 100), so on the 80-column `wide` card all 80 columns are live in each row where the grids here render only the dozen on screen. That said it is the smallest API of the seven: one function call, no destroy method needed, and sort-on-header-click, alignment and formatting all come free.
