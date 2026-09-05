# Task 1 report: Vite multi-page scaffold and shared theme

## What was built

Followed the brief's steps in order (TDD: wrote the failing test first, confirmed
it failed for the right reason, then built the scaffold until it passed).

Files created:
- `package.json` — scripts (`dev`, `build`, `preview`, `test`, `test:e2e`, `data`)
  and devDependencies/dependencies exactly as specified in the brief. `npm install`
  added `package-lock.json` (101 packages, 0 vulnerabilities).
- `vite.config.js` — exports `DEMOS` (7 entries, unique keys, `react` boolean flag
  on each) and a default Vite config with `@vitejs/plugin-react` and a
  `rollupOptions.input` map built from `DEMOS` (index.html + one `demos/<key>.html`
  per demo — those demo HTML files don't exist yet; they're created by later tasks).
- `.gitignore` — `node_modules/`, `dist/`, `.vite/`, `test-results/`,
  `playwright-report/`, `data-cache/`.
- `src/harness/theme.js` — ported verbatim from
  `/Users/rgrp/src/datasets/line-charts/assets/js/theme.js`. It already exported
  exactly the four required names (`theme`, `onThemeChange`, `installThemeToggle`,
  `restoreTheme`), plus `PALETTE_LIGHT`, `PALETTE_DARK`, `FONT_SANS`, `FONT_MONO`,
  `isDark` as extras. No renaming was needed here.
- `src/harness/site.css` — ported from
  `/Users/rgrp/src/datasets/line-charts/assets/css/site.css`, with the
  table-specific tokens block from Step 6 appended verbatim (`--table-row-h`,
  `--table-font-size`, `--table-header-bg`, `--table-stripe`, `--table-num-font`,
  `.demo-host`, `.demo-host--tall`).
- `index.html` — placeholder hub page exactly as given in Step 7.
- `tests/scaffold.test.js` — exactly as given in Step 1.

## Deviation from the brief: `--page` renamed to `--bg`

The sibling `site.css` defines `--page` (light `#f9f9f7` / dark `#0d0d0d`), not
`--bg`. But the brief's own Interfaces line, and the task context given to me,
both name `--bg` explicitly as a produced custom property that later tasks
depend on. Since `--bg` doesn't exist anywhere else in either repo, I treated
the brief's Interfaces list as authoritative and renamed `--page` → `--bg`
throughout the copied file (all three theme blocks: `:root`, the
`prefers-color-scheme: dark` media block, and `:root[data-theme="dark"]`), and
updated the one usage site (`body { background: var(--bg); }`).

Everything else in `site.css` — `--surface`, `--border`, `--text-primary`,
`--text-secondary`, `--text-muted`, `--accent`, `--font-sans`, `--font-mono`,
`.wrap`, `.card` — was already present under those exact names and was not
renamed.

## DEMOS did not need to move

Context note 3 flagged a risk that importing `vite.config.js` under Vitest
might fail because of `@vitejs/plugin-react` behaving badly outside a real
Vite process, with a fallback of extracting `DEMOS` into
`src/demos.config.js`. I tested this directly: `npx vitest run
tests/scaffold.test.js` imports `../vite.config.js` and passes cleanly with no
errors. **No workaround was needed** — `DEMOS` stays in `vite.config.js` exactly
as the brief specifies. Later tasks (12, 13) should import `DEMOS` from
`vite.config.js`, not from a separate config module.

## Test command and output

```
$ npx vitest run tests/scaffold.test.js

 RUN  v3.2.7 /Users/rgrp/src/datasets/tables-evaluation

 ✓ tests/scaffold.test.js (2 tests) 2ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

Also ran the full suite (`npx vitest run`) — same 1 file / 2 tests, all passing,
confirming no other test files exist yet to conflict.

Before the scaffold existed, the same command failed as expected:
`Error: Cannot find module '../vite.config.js' imported from
tests/scaffold.test.js`.

## Dev server verification (Step 9)

Started `npm run dev -- --port 5173 --strictPort` in the background, then
`curl -s -o - -w "HTTP %{http_code}" http://localhost:5173/` returned `HTTP 200`
with the placeholder `index.html` body (title, `<h1>tables-evaluation</h1>`,
"Hub page is built in Task 13."). Also fetched
`http://localhost:5173/src/harness/site.css` directly (`HTTP 200`) and confirmed
the served content contains the three `--bg:` definitions and the appended
`--table-row-h` / `.demo-host` block. Stopped the server afterward (verified no
`vite` process remains running).

The dev server printed non-fatal warnings during its dependency-scan phase:
`Failed to resolve dependency: react, react-dom, ...` and `Failed to run
dependency scan ... failed to resolve rollupOptions.input value:
".../demos/baseline.html"`. Both are expected at this stage: `react`/`react-dom`
aren't installed yet (per the brief, Task 1 installs only build tooling — later
per-library tasks add their own dependencies), and `demos/*.html` files don't
exist yet (created by later tasks). Neither warning is fatal; the server started
and served the page correctly.

## npm install side effect: esbuild postinstall approval

`npm install` produced an `npm warn allow-scripts` notice for `esbuild@0.28.2`'s
postinstall script (this npm version gates package install scripts). Ran
`npm approve-scripts esbuild` to allow it — Vite depends on esbuild's native
binary being installed to function at all. This added an `allowScripts` block
to `package.json`:
```json
"allowScripts": {
  "esbuild@0.28.2": true
}
```
This wasn't in the brief's `package.json` listing but is a necessary,
environment-specific side effect of running `npm install` here, not a content
change I chose to make.

## What later tasks need to know

- Import `DEMOS` from `vite.config.js` (unchanged path — no `src/demos.config.js`
  was created).
- `src/harness/theme.js` exports exactly `theme`, `onThemeChange`,
  `installThemeToggle`, `restoreTheme` (plus incidental palette/font constants
  carried over from the sibling repo, unused by the four required exports).
- `src/harness/site.css` custom properties are `--bg` (not `--page`), `--surface`,
  `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`,
  `--font-sans`, `--font-mono`, plus the table-specific tokens `--table-row-h`,
  `--table-font-size`, `--table-header-bg`, `--table-stripe`, `--table-num-font`,
  and classes `.wrap`, `.card`, `.demo-host`, `.demo-host--tall`.
- `demos/` and `scripts/` directories were created locally as empty placeholders
  for later tasks but contain nothing yet, so git does not track them — later
  tasks creating files there is expected and normal.
- `react` and `react-dom` are not yet installed as dependencies; the two
  React-mounting demos (tanstack, glide) will need to add them.

## Commit

```
72d2f6a feat: vite multi-page scaffold with shared theme
```
On branch `build/tables-bakeoff`, 8 files changed, 2709 insertions(+).
