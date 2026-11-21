---
name: Plain <table>
version: —
license: n/a
docs: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table
tagline: No library. Hand-built DOM, sticky header, ~20 lines.
---

- No library: the whole table is one HTML string assigned with `innerHTML`, with a sticky header and the site's CSS.
- Every row is real DOM, so the cost is table layout, and it grows faster than the row count: 2.5 s at 50,000 rows, 6.3 s at 100,000 and about 27 s at 200,000 on our machine.
- The large card shows the first 100,000 of 500,000 rows. Uncapped, it had not finished after ten minutes.
- Because it is a plain table, select, copy, print and Ctrl-F work on every row.
