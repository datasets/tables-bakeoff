---
name: Plain <table>
version: —
license: n/a
docs: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table
tagline: No library. Hand-built DOM, sticky header, ~20 lines.
---

The control in this comparison. Rendering every row as real DOM has no virtualization, so the large dataset is expected to lock the tab — that failure is the measurement, not a bug in the demo. CAPPED: the large card renders the first 100,000 of 500,000 rows. Uncapped it never finished — abandoned after 10 minutes with the tab unresponsive. Table layout, not string building, is what collapses: measured on this machine at 2.6s at 50,000 rows (eight runs, 2.60–2.65s), 6.9s at 100,000 (eight runs, 6.6–7.5s), and roughly 27s at 200,000 (four runs, 23–28s) — the bigger the render, the more the wall-clock swings run to run. Every other library on this site renders all 500,000.
