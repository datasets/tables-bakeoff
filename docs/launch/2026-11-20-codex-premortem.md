I would hold the Show HN. The demos are useful; several conclusions are easier to attack than the libraries themselves.

**Ten likely top-voted criticisms, ranked**

1. **“Glide supports copying. You didn’t implement it.”** **Already answered: no.** The recommendation says to use Glide when users aren’t copying, but the [demo props](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/glide/Grid.jsx:66) omit `getCellsForSelection`. [Glide documents](https://docs.grid.glideapps.com/api/dataeditor/important-props) that this enables clipboard selection, including off-screen cells. **Fix:** enable and test grid copying; distinguish browser text selection, browser Ctrl-F, and grid search.

2. **“Your fastest grid does less work.”** **Already answered: partly.** Glide receives a row count and cell callback, without sorting/filtering controls; [AG Grid enables both](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/aggrid/main.js:38), while TanStack constructs sortable row models. **Fix:** define separate rendering-only and interactive-table workloads. Measure sorting/filtering latency before recommending a winner for large datasets.

3. **“These are development-server anecdotes presented with benchmark precision.”** **Already answered: disclosed, not resolved.** [index.html:260](/Users/rgrp/src/datasets/tables-bakeoff/index.html:260) admits headless Chromium, development builds, manually copied results. Hardware, exact browser version, uniform repetitions and raw samples are missing from the methodology. **Fix:** rerun production builds under a published protocol; generate the table from results with medians and spread.

4. **“You recommend TanStack because Ctrl-F works, but most rows aren’t in the DOM.”** **Already answered: misleadingly.** The [quick pick](/Users/rgrp/src/datasets/tables-bakeoff/index.html:328) is unqualified; [the implementation](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/tanstack/Table.jsx:138) renders virtual rows only. **Fix:** say “finds mounted cells”; test dataset-wide search separately and apply the same standard to every virtualized grid.

5. **“Where is keyboard accessibility?”** **Already answered: no.** [TanStack headers](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/tanstack/Table.jsx:120) sort through mouse clicks without a focusable button or `aria-sort`. Native table markup does not settle accessibility. **Fix:** implement keyboard sorting and test focus, navigation and announced row/column positions with an actual screen reader.

6. **“Why would I put 500,000 rows in a plain HTML table?”** **Already answered: partly.** The cap is transparent, but [the headline conclusion](/Users/rgrp/src/datasets/tables-bakeoff/index.html:340) treats full-DOM failure as the meaningful baseline. **Fix:** retain that stress control and add a paginated plain table; explain when fetching fewer rows beats client-side virtualization.

7. **“You cannot declare RevoGrid inferior without testing it.”** **Already answered: no.** [The exclusion](/Users/rgrp/src/datasets/tables-bakeoff/index.html:435) asserts “no advantage” on measured axes without measurements. **Fix:** test it or say it was outside scope. Community size is a maintenance consideration, not performance evidence.

8. **“Bytes are bytes. Why doesn’t your total include WASM?”** **Already answered: rationale given, unconvincing.** [index.html:247](/Users/rgrp/src/datasets/tables-bakeoff/index.html:247) argues that adding JS and WASM compares different things. Both consume download bandwidth. **Fix:** show total transferred bytes with JS/CSS/WASM breakdowns, plus incremental cost for an existing React app. Keep execution costs separate.

9. **“Your Tabulator horror story is an unresolved percentage height in your harness.”** **Already answered: partly.** [The demo notes](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/tabulator/README.md:13) explain precisely that mechanism. **Fix:** publish a minimal reproduction with resolved versus unresolved parent heights; frame this as a dangerous integration failure, not an unconditional library defect.

10. **“Is the verdict finished or not?”** **Already answered: contradictory.** [index.html:307](/Users/rgrp/src/datasets/tables-bakeoff/index.html:307) says it is unwritten; quick picks immediately follow. “Any size, any data” overstates one property-sales workload. **Fix:** lead with a bounded position: AG Grid Community for a ready-made sortable/filterable grid; TanStack for control over markup; Glide for viewport rendering where its interaction model fits. Explain when Tabulator’s free features change that choice.

**Missing libraries**

Expect DataTables, SlickGrid/Slickgrid-Universal, RevoGrid, MUI X, React Data Grid, Handsontable and Grid.js.

Add **DataTables first**, then **RevoGrid**. DataTables tests the mainstream pagination/search alternative; its [current official documentation](https://datatables.net/manual/core/installation) says v3 is dependency-free, contradicting [the jQuery exclusion](/Users/rgrp/src/datasets/tables-bakeoff/index.html:446). RevoGrid tests another framework-independent virtualized implementation and replaces an unsupported dismissal.

MUI merits coverage later, but its [Community pagination limit](https://github.com/mui/mui-x/blob/master/docs/data/data-grid/pagination/pagination.md) needs explicit treatment. Handsontable’s exclusion fits the permissive-license scope; correct “since v8” to [v7](https://handsontable.com/blog/handsontable-7-0-0-is-here/).

**Additional methodology flaws**

- **Render completion isn’t proven equivalent.** [Glide’s predicate](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/glide/main.jsx:27) checks canvas existence and width, not painted cells. Forced layout cannot prove canvas drawing finished. Validate a common first-usable-viewport boundary.
- **FPS establishes only a short traversal.** [metrics.js:48](/Users/rgrp/src/datasets/tables-bakeoff/src/harness/metrics.js:48) scrolls 20,000px over 120 frames—roughly 625 rows at 32px—and assumes 60Hz for dropped frames. Assert content movement; add deep jumps, prolonged scrolling and frame-time percentiles.
- **Startup costs escape the headline.** Data loading precedes [the render clock](/Users/rgrp/src/datasets/tables-bakeoff/src/harness/mount.js:119); Perspective initialization [starts globally](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/perspective/main.js:33). Report cold navigation-to-usable alongside warm mounting.
- **“Full year” means sample.** [The source report](/Users/rgrp/src/datasets/tables-bakeoff/docs/reports/task-2-report.md:7) records 930,559 source rows; the large fixture samples 500,000. Label it accurately.

**Launch-day blockers**

- **Broken destination:** [the EVALUATION link](/Users/rgrp/src/datasets/tables-bakeoff/index.html:310) currently [returns the hub](https://tables.datahub.io/EVALUATION.md), not an evaluation. Publish the verdict or remove the link.
- **Stale numbers:** [quick picks](/Users/rgrp/src/datasets/tables-bakeoff/index.html:328) claim TanStack 13KB and LOC 166 versus 62. [Live bundle data](https://tables.datahub.io/bundles.json) implies **21.3KB**, with LOC **146 versus 39**. Generate prose values too.
- **Metadata:** [the homepage image](/Users/rgrp/src/datasets/tables-bakeoff/index.html:7) targets the old `tablesbakeoff` hostname; [demo OG fields](/Users/rgrp/src/datasets/tables-bakeoff/demos/glide.html:7) start empty and depend on JavaScript. Emit valid metadata at build time.
- **Mobile:** [the navigation’s inner flex row](/Users/rgrp/src/datasets/tables-bakeoff/index.html:55) does not wrap. Likely overflow; verify at 375px and test touch scrolling. Browser execution was sandbox-blocked, so this is a code-level risk, not a reproduced failure.
- **Version freshness remains unverified:** registry checks were blocked. Publish tested versions and measurement date; don’t imply they are current releases.

---

### Summary

Fix capability claims, reconcile the verdict, and regenerate defensible measurements before posting; adding more libraries is secondary.