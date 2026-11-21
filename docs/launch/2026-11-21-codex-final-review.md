The verdict is clear. The evidence is not yet clean enough to launch without handing HN several easy corrections.

**1. Claims to fix**

- **Canvas versus DOM is misrepresented.** [blog-post.md:27](/Users/rgrp/src/datopian/marketing/projects/tables-bakeoff-hn/blog-post.md:27) says canvas cannot select/copy values and calls AG Grid a real `<table>`. Glide’s demo explicitly enables range copy ([Grid.jsx:114](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/glide/Grid.jsx:114)). AG Grid uses grid markup; browser text selection requires [explicit options](https://www.ag-grid.com/javascript-data-grid/cell-text-selection/) absent from [its demo configuration](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/aggrid/main.js:21). DOM presence, browser selection, grid clipboard and accessibility are different capabilities.

- **The headline “tie” contradicts your own results.** [index.html:166](/Users/rgrp/src/datasets/tables-bakeoff/index.html:166) and [index.html:233](/Users/rgrp/src/datasets/tables-bakeoff/index.html:233) say every virtualizer falls within the fast render range. Perspective and DataTables do not, according to [results.js:175](/Users/rgrp/src/datasets/tables-bakeoff/src/harness/results.js:175) and [results.js:193](/Users/rgrp/src/datasets/tables-bakeoff/src/harness/results.js:193). More fundamentally, “60 fps” does not make initial-render or sorting delays imperceptible. Delete that inference, irrespective of the remeasurement.

- **Observable is blamed for your missing stylesheet.** [blog-post.md:39](/Users/rgrp/src/datopian/marketing/projects/tables-bakeoff-hn/blog-post.md:39) says its defaults need width/layout options to become presentable; [marketing-plan.md:96](/Users/rgrp/src/datopian/marketing/projects/tables-bakeoff-hn/marketing-plan.md:96) repeats this in maintainer outreach. Your [demo notes:14](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/observable/README.md:14) explicitly admit the actual mistake. Synchronize the correction.

- **“All nine grids … over the same 500,000 rows” overpromises.** [blog-post.md:13](/Users/rgrp/src/datopian/marketing/projects/tables-bakeoff-hn/blog-post.md:13) conflicts with the baseline’s [100,000-row cap](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/baseline/main.js:72). Say “same datasets, with the plain-table demo capped.”

- **“Same cell formatter” needs its exception upfront.** [index.html:335](/Users/rgrp/src/datasets/tables-bakeoff/index.html:335) and [blog-post.md:19](/Users/rgrp/src/datopian/marketing/projects/tables-bakeoff-hn/blog-post.md:19) claim uniform formatting, while [EVALUATION.md:62](/Users/rgrp/src/datasets/tables-bakeoff/EVALUATION.md:62) explains why Perspective cannot use it. This matters when readers judge screenshots.

- **Accessibility and indexability are asserted beyond the evidence.** [blog-post.md:57](/Users/rgrp/src/datopian/marketing/projects/tables-bakeoff-hn/blog-post.md:57) uses both to justify TanStack. Its [sorting headers:124](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/tanstack/Table.jsx:124) have mouse handlers but no buttons, keyboard handlers or `aria-sort`. Virtualized DOM also does not establish dataset-wide search-engine indexing. The promised per-library accessibility check remains unsupported by a corresponding report.

- **DuckDB-WASM is still client-side.** [index.html:377](/Users/rgrp/src/datasets/tables-bakeoff/index.html:377) pitches it for when client-side rows are the wrong idea, but [duckdb-client.js:35](/Users/rgrp/src/datasets/tables-bakeoff/src/demos/duckdb-query/duckdb-client.js:35) downloads the full fixture into the browser. Describe its worker/query advantage, not an escape from client-side data.

- **The method contradicts itself.** [ANALYSIS.md:179](/Users/rgrp/src/datasets/tables-bakeoff/ANALYSIS.md:179) says builds regenerate render numbers, then says they are manually entered. Fix this; reproducibility claims invite inspection.

**2. Five likely top-voted criticisms still unanswered**

1. “You recommend this for accessibility, but I cannot keyboard-sort your recommended demo. What actually passed with a screen reader?”
2. “Where are cold-load time, total download, peak memory and phone results? You benchmark after much of the expensive work.”
3. “A short scripted scroll hitting the refresh ceiling doesn’t establish equal responsiveness. What happens during sorting, rapid scrolling or concurrent input?”
4. “Your effort score compares different feature sets. TanStack lacks the finished grids’ filtering/editing/navigation, while some implementation code is excluded from LOC.”
5. “Your portal needs dataset-wide search and indexability. Where does the recommended implementation provide either, beyond mounted rows?”

**3. Launch-day blockers and limits**

- **Fix keyboard sorting before selling accessibility.** This affects the actual demo embedded on the front page.
- **Verify the deployed revision.** The [live page fetched during review](https://tables.datahub.io/) still described editing as provisional and incorrectly grouped Community cell editors with Enterprise features; local [index.html:210](/Users/rgrp/src/datasets/tables-bakeoff/index.html:210) corrects this. The fetch may be cached, so this is a deployment check, not proof of stale production.
- **The kit’s mobile launch condition is unmet structurally:** it requires interaction on the first screen ([README.md:34](/Users/rgrp/src/datopian/marketing/projects/tables-bakeoff-hn/README.md:34)), but four stacked recommendation cards precede the gallery. That is your condition, not an HN rule.
- Social metadata and the OG image exist locally; responsive and dark-mode code exists. I could not verify rendered mobile/dark behavior or conclusively validate the remote image/report links. **No broken link is confirmed.**

**4. Verdict**

Yes, it is clear enough to forward. The single best improvement: put **“DataHub chose TanStack because we already ship React and need owned markup/CSS; we accept responsibility for search, keyboard behavior and virtualization”** immediately below the opening verdict. That makes the recommendation concrete without weakening it into “it depends.”

---

### Summary

Keep the opinionated picks; correct the capability claims and make the recommended demo earn the accessibility argument.