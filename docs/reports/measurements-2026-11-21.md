# Measurements, 2026-11-21

Produced by `node scripts/measure-all.mjs`. Raw runs: `measurements-2026-11-21.json`.

- Machine: Apple M4, 16 GB, macOS 15.6 (24.6.0)
- Browser: Chromium 151.0.7922.34 (headless, Playwright 1.62.1), viewport 1400x1000
- Build: npm run build, served by vite preview; 5 fresh page loads per figure, median (min to max)
- Run: 2026-11-21T01:00:24.486Z to 2026-11-21T01:15:23.026Z
- Quiet-machine rule: wait while the 1-minute load average is above 4 (poll 30 s, up to 20 min)

## Render time

| Library | Small 1k | Wide 80 cols | Medium 50k | Large 500k | Engine boot |
|---|---|---|---|---|---|
| baseline | 55 ms (55 ms to 59 ms) | 546 ms (525 ms to 552 ms) | 2.47 s (2.44 s to 2.88 s) | 6.33 s (6.27 s to 7.18 s) (100,000 of 500,000 rows) |  |
| observable | 6.4 ms (6.2 ms to 6.5 ms) | 51 ms (50 ms to 51 ms) | 5.4 ms (5.2 ms to 5.6 ms) | 10.8 ms (10.8 ms to 11.2 ms) |  |
| tabulator | 32.8 ms (32.3 ms to 33.0 ms) | 149 ms (148 ms to 151 ms) | 48.4 ms (48.0 ms to 49.2 ms) | 185 ms (125 ms to 199 ms) |  |
| aggrid | 30.1 ms (30.0 ms to 31.4 ms) | 10.0 ms (9.8 ms to 10.2 ms) | 33.4 ms (32.4 ms to 33.7 ms) | 233 ms (229 ms to 237 ms) |  |
| tanstack | 10.3 ms (10.1 ms to 11.3 ms) | 4.4 ms (4.4 ms to 4.8 ms) | 12.3 ms (11.7 ms to 12.7 ms) | 124 ms (77 ms to 137 ms) |  |
| glide | 19.1 ms (15.3 ms to 26.4 ms) | 22.7 ms (21.4 ms to 30.6 ms) | 9.6 ms (4.9 ms to 11.4 ms) | 16.8 ms (14.7 ms to 52 ms) |  |
| perspective | 58 ms (57 ms to 61 ms) | 36.9 ms (35.7 ms to 37.6 ms) | 191 ms (190 ms to 195 ms) | 1.91 s (1.88 s to 1.92 s) | 87 ms (86 ms to 91 ms) |
| datatables | 43.7 ms (42.9 ms to 45.6 ms) | 448 ms (444 ms to 455 ms) | 810 ms (802 ms to 819 ms) | 8.45 s (8.02 s to 8.47 s) |  |
| revogrid | 89 ms (81 ms to 93 ms) | 71 ms (52 ms to 72 ms) | 55 ms (48.7 ms to 64 ms) | 62 ms (52 ms to 72 ms) |  |

## Scroll FPS and sort

FPS is on the large card (500,000 rows); the plain table's is on the 50,000-row card. Dropped frames in brackets.

| Library | FPS large (or 50k) | Dropped | FPS wide (80 cols) | Sort by price at 500k |
|---|---|---|---|---|
| baseline | 13 (12-17) | 413 (309-470) | 30 (27-31) | 21.18 s (19.87 s to 21.80 s) |
| observable | 53 (52-53) | 16 (15-17) | 44 (43-44) | 104 ms (101 ms to 107 ms) |
| tabulator | 60 (60-60) | 1 (1-1) | 56 (56-57) | 415 ms (401 ms to 419 ms) |
| aggrid | 60 (60-60) | 1 (1-1) | 60 (60-60) | 369 ms (366 ms to 374 ms) |
| tanstack | 60 (59-60) | 1 (1-1) | 60 (59-60) | 418 ms (409 ms to 443 ms) |
| glide | 60 (60-60) | 1 (1-1) | 60 (60-60) | 98 ms (97 ms to 98 ms) |
| perspective | 60 (60-60) | 1 (1-1) | 60 (60-60) | 346 ms (343 ms to 354 ms) |
| datatables | 47 (46-52) | 33 (18-36) | 48 (48-48) | 459 ms (400 ms to 475 ms) |
| revogrid | 60 (60-60) | 1 (1-1) | 60 (60-60) | 194 ms (193 ms to 202 ms) |

## Load average (1 minute) seen

| Library | At batch start | Per run, after | Max | Waited | Flagged busy |
|---|---|---|---|---|---|
| baseline | 2.33 | 5.61, 5.82, 5.75, 7.35, 5.47 | 7.35 | 0 min | no |
| observable | 3.86 | 3.5, 3.38, 3.19, 2.93, 2.78 | 3.86 | 1 min | no |
| tabulator | 2.78 | 2.64, 2.54, 2.57, 2.85, 2.86 | 2.86 | 0 min | no |
| aggrid | 2.86 | 2.79, 2.65, 2.55, 2.75, 3.25 | 3.25 | 0 min | no |
| tanstack | 3.25 | 3.23, 3.44, 3.24, 3.14, 3.21 | 3.44 | 0 min | no |
| glide | 3.21 | 2.87, 2.72, 2.74, 2.68, 2.55 | 3.21 | 0 min | no |
| perspective | 2.55 | 2.46, 2.69, 2.63, 2.54, 2.62 | 2.69 | 0 min | no |
| datatables | 2.62 | 2.95, 2.83, 2.63, 2.8, 3.13 | 3.13 | 0 min | no |
| revogrid | 3.13 | 3.12, 3.19, 3.18, 2.92, 2.84 | 3.19 | 0 min | no |

## Notes

- Render times are the harness's own clock (sync part, awaited promise, forced layout), read from each card's badge.
- Large render for the plain table is its capped 100,000 rows; it cannot finish 500,000.
- Sort is one timed sort on a freshly loaded table (untimed reset to file order first), per page load. The earlier figures were the median of 5 sorts inside one page load.
- Perspective's engine boot is reported separately and is not in its render times.
- The Tabulator `height: "100%"` trap was measured by hand on 2026-11-21: a bare Tabulator page (the 50,000-row file, plain columns, an unsized parent, Vite dev server), 3 runs: 89.2, 87.5 and 88.0 s (median 88 s), against 36 ms with a sized host in the same page. It is not in `measure-all.mjs` because each run takes minutes.
