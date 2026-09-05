# Task 13 report: hub page and scorecard

## State found

`index.html` (411 lines, uncommitted) was essentially complete and already
correct against the overriding rulings — the prior agent had clearly read
them before being killed. It contained:

- No subjective 1-5 scorecard columns anywhere. The `table.scores` carries
  only measured columns: Library, Bundle (gzip, own code), WASM, Lines
  written, Render 50,000, Render 500,000, Scroll FPS at 500,000, Survived
  500,000?, Licence.
- A `.gap` callout stating plainly that the verdict isn't written yet and
  linking to `/EVALUATION.md` (which doesn't exist), rather than inventing
  ratings.
- The harness floor handled via a footnote (`<span data-harness>`) plus a
  `<span data-react>` for the shared React chunk, with the bundle column
  header itself labelled "own code" — i.e. designed to be netted, not raw
  `libKB`.
- Perspective's WASM already broken into its own `data-wasm="perspective"`
  column, kept out of the KB bundle column.
- No heap/memory column; an explicit footnote says why.
- Full "considered, not included" and "four datasets" sections, attribution
  line, and `<script type="module" src="/src/harness/hub.js">`.

It only needed `src/harness/hub.js`, which did not exist, and hub tests in
`tests/e2e/demo.spec.js`. No changes to `index.html` were needed.

## What I built

`src/harness/hub.js`: fetches `/bundles.json`, wires the theme toggle via
`restoreTheme`/`installThemeToggle`, and fills `[data-bundle]`, `[data-wasm]`,
`[data-loc]`, `[data-harness]`, `[data-react]`. Bundle cells show
`libKB - harnessKB` ("own code"), so the baseline `<table>` reads ~0.9 KB
instead of inheriting the ~23.3 KB shared floor. WASM cells show
`wasmKB/1000` in MB for Perspective and `"n/a"` (never 0 KB) elsewhere. On
fetch failure (dev server, no build yet) it leaves the `—` placeholders and
sets a `title` explaining a build is needed, without throwing.

Added a `hub` describe block to `tests/e2e/demo.spec.js`: links to every
demo, bundle/LOC cells populate from the real build (not hardcoded), and no
empty `td` in `table.scores` — satisfied entirely by real measured data since
there are no rating columns to fake.

## Verification

- `npx vitest run`: 36/36 passed.
- `npm run build`: succeeds; build's own reporter table matches
  `bundles.json` (e.g. aggrid 327.8 total / 304.3 own after harness netted,
  perspective wasm 3935.1 KB).
- `npx playwright test`: 39/39 passed (35 pre-existing + 4 new hub tests).
- Manual check via a preview server + Playwright script: no horizontal
  overflow at 1400px, `data-bundle="aggrid"` → "304.3 KB", `data-bundle="baseline"`
  → "0.9 KB", `data-wasm="perspective"` → "3.9 MB", `data-wasm="baseline"` →
  "n/a", `data-harness` → "23.3 KB", `data-react` → "60.3 KB", theme toggle
  cycles system → light → dark correctly.

## Harness floor presentation

Two mechanisms, both live: (1) the bundle column is header-labelled "own
code" and hub.js computes it as `libKB - harnessKB` rather than printing raw
`libKB`, so the baseline never appears to cost 24 KB; (2) a footnote spells
out the exact shared harness size via `data-harness`/`data-react` spans and
explains why it's netted, with the untouched full page weight (`totalKB`)
still available via a link to `/bundles.json` for anyone who wants it.

## Remaining for EVALUATION.md

Nothing structural — the hub page explicitly defers all subjective judgement
(default look, API ergonomics, docs quality, accessibility-in-practice) to
`EVALUATION.md`, which does not exist yet. Whoever writes it should link back
from the hub's `.gap` callout (already pointing at `/EVALUATION.md`) and can
lean on the per-demo notes already embedded in `index.html`'s "What the
measurements showed" section and each demo page's own build notes.
