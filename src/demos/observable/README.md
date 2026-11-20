---
name: Observable Inputs
version: 1.0.0
license: ISC
docs: https://observablehq.github.io/framework/inputs/table
homepage: https://observablehq.com/framework/lib/inputs
github: https://github.com/observablehq/inputs
stars: 171
npm: "@observablehq/inputs"
tagline: One function call. Strong defaults, built for data exploration.
---

- One call, `Inputs.table(rows, options)`: it infers column types, right-aligns numbers and sorts on a header click.
- It needs its stylesheet (`@observablehq/inputs/dist/index.css`, as its README shows) plus `select: false` for a read-only table. Our first build missed the stylesheet, which is why ids and dates wrapped mid-word in earlier screenshots.
- It appends rows as you scroll and never removes them, and every appended row has all its columns (80 on the wide card). Fine for thousands of rows, not for hundreds of thousands.
- No theming hook, and the stylesheet is light only, so dark mode here is a small CSS override keyed to the table's id.
