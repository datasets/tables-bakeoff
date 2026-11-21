---
name: Observable Inputs
version: 1.0.0
license: ISC
docs: https://observablehq.github.io/framework/inputs/table
homepage: https://observablehq.com/framework/lib/inputs
github: https://github.com/observablehq/inputs
npm: "@observablehq/inputs"
tagline: One function call. Strong defaults, built for data exploration.
---

- One call, `Inputs.table(rows, options)`: it infers column types, right-aligns numbers and sorts on a header click.
- It needs its stylesheet (`@observablehq/inputs/dist/index.css`, as its README shows) plus `select: false` for a read-only table. Our first build missed the stylesheet, which is why ids and dates wrapped mid-word in earlier screenshots.
- It appends rows as you scroll and never removes them, and every appended row has all its columns (80 on the wide card). Fine for thousands of rows, not for hundreds of thousands.
- No theming hook, and the stylesheet is light only with a white header. Every rule in it is wrapped in `:where()`, so a small override keyed to the table's id wins without `!important`. That override sets the shared font, 13px text, 600-weight header, cell padding and borders in both modes, and the dark colors.
