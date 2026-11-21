**Not cleared yet.** Statuses below assess local revisions; deployment remains unverified. Paths are relative to `tables-bakeoff/`; “kit” means `../datopian/marketing/projects/tables-bakeoff-hn/`.

**Earlier review: claims**

| Point | Status and evidence |
|---|---|
| Canvas versus DOM | **PARTLY.** Correct distinctions at `index.html:304`; kit `blog-post.md:31,61` still broadly says canvas cannot provide findable/copyable text despite acknowledging Glide’s clipboard. |
| Headline “tie” | **RESOLVED.** Five fast grids are named; Perspective/DataTables excluded; FPS no longer implies imperceptible render/sort delays (`index.html:170,271`). |
| Observable stylesheet blame | **RESOLVED.** Own mistake acknowledged in kit `blog-post.md:43` and `marketing-plan.md:99`. |
| All nine over 500k | **RESOLVED.** Baseline cap explicit in kit `blog-post.md:15` and `README.md:60`. |
| Same formatter | **PARTLY.** Exception explicit at `index.html:227,346`; omitted from kit’s first comment (`README.md:60`) and LinkedIn copy (`marketing-plan.md:146`). |
| Accessibility/indexability overclaims | **RESOLVED in scope.** Keyboard-only check and untested screen readers disclosed (`index.html:304`); indexing responsibilities explained in kit `blog-post.md:63`. |
| DuckDB client-side wording | **RESOLVED.** Full browser download and worker advantage explicit (`index.html:387`). |
| Automatic versus manual measurements | **RESOLVED.** Build outputs and manually transferred timings distinguished (`ANALYSIS.md:181`). |

**Earlier review: five anticipated criticisms**

1. **RESOLVED:** keyboard buttons and `aria-sort` implemented (`src/demos/tanstack/Table.jsx:126`); no screen-reader pass claimed.
2. **PARTLY:** download accounting and exclusions explained; cold-load, peak-memory and phone measurements remain absent (kit `README.md:115`).
3. **RESOLVED as disclosure:** scripted-scroll limits and untested concurrent input acknowledged (kit `README.md:116`).
4. **RESOLVED as disclosure:** unequal feature sets and excluded glue acknowledged (kit `README.md:117`).
5. **RESOLVED as disclosure:** dataset-wide search/indexing remain application responsibilities (kit `README.md:118`).

**Earlier review: launch checks and recommendation**

- **Keyboard sorting: RESOLVED locally**, as above.
- **Deployment: NOT cleared.** The [homepage fetch](https://tables.datahub.io/) still returned old timings and wording versus `index.html:170`. Possible caching prevents a definitive deployment diagnosis.
- **Mobile condition: RESOLVED by explicitly relaxing it**, not by moving the gallery (kit `README.md:39`; `index.html:224`).
- **Metadata/mobile/dark/link verification: PARTLY.** Metadata exists (`index.html:8`); local homepage targets exist. Rendered mobile/dark behavior and remote image/report availability remain unverified. No broken link confirmed.
- **Concrete DataHub rationale: RESOLVED**, immediately below the verdict (`index.html:166`).

**Remaining blockers — factual corrections before launch**

- Fix Tabulator’s mismatched comparison: **88 s at 50k versus 185 ms at 500k** (`index.html:299`; `EVALUATION.md:58`). Matched control is **36 ms** (`docs/reports/measurements-2026-11-21.md:61`).
- Correct “no dropped frames” (`EVALUATION.md:30`): report records **one** per AG Grid run.
- Remove unsupported stable-memory claim (`EVALUATION.md:60`) and “never touches the data” (kit `blog-post.md:27`; visible cells are read).
- Synchronize stale documentation: `ANALYSIS.md:44,83,120` retains 7.7 s, 23.3 kB harness, and 166/62 LOC; current figures are 6.33 s, 31.2 kB, 150/40. `EVALUATION.md:107` incorrectly lists published repeat-run spreads as untested.
- Qualify “every number comes from a script” (`index.html:350`; kit `README.md:71`): Tabulator’s cliff was measured manually.
- Fix the two **PARTLY** claim items above and verify production.

**Nice-to-haves:** broader performance/accessibility testing and earlier mobile interaction; disclosed omissions need not block launch.

---

### Summary

The recommendation holds; remaining factual inconsistencies and deployment verification prevent clearance.