# tables-evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static site that renders the same four datasets through seven table libraries under one shared harness, measuring render time, scroll FPS, bundle size and lines of code for each.

**Architecture:** Vite multi-page app — one HTML entry per library, so the real build produces real per-entry bundle sizes. A shared harness owns the page shell, theme, metrics and source panel; each demo directory contains nothing but four render functions conforming to one contract. Data is prepared offline into Parquet and decoded in-browser with hyparquet.

**Tech Stack:** Vite 7, vanilla JS + React 19 (only where a library requires it), hyparquet, Vitest (pure modules), Playwright (demo smoke tests).

**Spec:** `docs/plans/2026-09-04-tables-evaluation-design.md` — read it before starting. It carries the reasoning this plan assumes.

## Global Constraints

- Node 20+. Package manager: npm.
- Plans and docs live in `docs/plans/`, **not** `docs/superpowers/plans/`.
- Pinned library versions — use these exact versions, do not float:
  - `@tanstack/react-table@9.2.4` (MIT) — **v9, not v8**
  - `ag-grid-community@36.1.0` (MIT)
  - `@glideapps/glide-data-grid@6.0.3` (MIT)
  - `tabulator-tables@6.5.2` (MIT)
  - `@finos/perspective@3.8.0` (Apache-2.0)
  - `@observablehq/inputs@0.12.0` (ISC)
  - `hyparquet@1.29.2` (MIT)
- Every demo renders all four datasets. A library that cannot handle one records the failure as a result; it is never silently skipped.
- No paid or source-available libraries.
- Commit after every task. Commit messages end with:
  `Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN`
- Do not add libraries beyond the seven. New candidates go in `TODO.md`.

## Verified facts (checked 2026-09-04 — trust these over search results)

These were confirmed against the published packages and live URLs. Much of the
internet is wrong about the first two.

- **TanStack Table v9 is a redesign.** There is no `getCoreRowModel()`. Features are
  opt-in via a `tableFeatures({...})` helper. React entry is `useTable({features,
  columns, data})`. Vanilla entry is `constructTable`. Exports confirmed present in
  `@tanstack/table-core@9.2.4/dist/index.d.ts`.
- **AG Grid 36** requires explicit module registration:
  `ModuleRegistry.registerModules([AllCommunityModule])`, then
  `createGrid(el, gridOptions)`.
- **Glide Data Grid** needs `import "@glideapps/glide-data-grid/dist/index.css"` and
  a `<div id="portal" />` in the DOM for its overlay editor.
- **hyparquet** API: `asyncBufferFromUrl({url})`, `parquetMetadataAsync(file)`,
  `parquetSchema(metadata)`, `parquetReadObjects({file, columns, rowStart, rowEnd})`.
- **Land Registry data is live and usable.** `pp-2024.csv` is 162,267,126 bytes,
  16 columns, **no header row**, at
  `http://prod1.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-2024.csv`
  (301-redirects to `prod2.` — follow redirects). Sample row:
  `"{2131FCF5-...}","320000","2024-07-26 00:00","MK40 3SG","T","N","F","38","","GEORGE STREET","","BEDFORD","BEDFORD","BEDFORD","A","A"`
  Column order: `id, price, date, postcode, propertyType, oldNew, duration, paon,
  saon, street, locality, town, district, county, ppdCategory, recordStatus`.
  Licence: Open Government Licence — attribution required in `ANALYSIS.md`.
- **Perspective has forked homes.** `@finos/perspective@3.8.0` (last published
  2026-07-28) versus `@perspective-dev/client@5.3.1` (published 2026-09-04, and
  where `perspective.finos.org` now redirects). This plan pins `@finos/perspective`
  because it is the documented one; Task 11 begins by verifying which is right.

---

### Task 1: Project scaffold and shared theme

**Files:**
- Create: `package.json`, `vite.config.js`, `.gitignore`
- Create: `src/harness/theme.js`, `src/harness/site.css`
- Create: `index.html`
- Test: `tests/scaffold.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `theme()` → `'light'|'dark'`; `restoreTheme()`; `installThemeToggle(buttonEl)`; `onThemeChange(cb)`. CSS custom properties `--bg`, `--surface`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--font-sans`, `--font-mono`. `DEMOS` array exported from `vite.config.js` for reuse by scripts.

- [ ] **Step 1: Write the failing test**

```js
// tests/scaffold.test.js
import { describe, it, expect } from "vitest";
import { DEMOS } from "../vite.config.js";

describe("demo registry", () => {
  it("lists all seven demos with unique keys", () => {
    expect(DEMOS).toHaveLength(7);
    const keys = DEMOS.map((d) => d.key);
    expect(new Set(keys).size).toBe(7);
    expect(keys).toContain("baseline");
    expect(keys).toContain("tanstack");
    expect(keys).toContain("perspective");
  });

  it("gives every demo a react flag", () => {
    for (const d of DEMOS) expect(typeof d.react).toBe("boolean");
    expect(DEMOS.find((d) => d.key === "tanstack").react).toBe(true);
    expect(DEMOS.find((d) => d.key === "tabulator").react).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scaffold.test.js`
Expected: FAIL — cannot resolve `../vite.config.js`

- [ ] **Step 3: Create package.json**

```json
{
  "name": "tables-evaluation",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build && node scripts/measure-bundles.mjs",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "data": "node scripts/prepare-data.mjs"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "vitest": "^3.0.0",
    "@playwright/test": "^1.50.0",
    "@vitejs/plugin-react": "^5.0.0",
    "gzip-size": "^7.0.0"
  },
  "dependencies": {
    "hyparquet": "1.29.2"
  }
}
```

Run: `npm install`

- [ ] **Step 4: Create vite.config.js with the demo registry**

```js
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

/** The seven contenders. `react: true` means the demo mounts a React root. */
export const DEMOS = [
  { key: "baseline",   name: "Plain <table>",      react: false },
  { key: "observable", name: "Observable Inputs",  react: false },
  { key: "tabulator",  name: "Tabulator",          react: false },
  { key: "aggrid",     name: "AG Grid Community",  react: false },
  { key: "tanstack",   name: "TanStack Table",     react: true  },
  { key: "glide",      name: "Glide Data Grid",    react: true  },
  { key: "perspective",name: "Perspective",        react: false },
];

export default {
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), "index.html"),
        ...Object.fromEntries(
          DEMOS.map((d) => [d.key, resolve(process.cwd(), `demos/${d.key}.html`)])
        ),
      },
    },
  },
};
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.vite/
test-results/
playwright-report/
data-cache/
```

- [ ] **Step 6: Port the theme module from the sibling repo**

Read `/Users/rgrp/src/datasets/line-charts/assets/js/theme.js` and
`/Users/rgrp/src/datasets/line-charts/assets/css/site.css`. Copy them to
`src/harness/theme.js` and `src/harness/site.css` verbatim, then add the
table-specific tokens at the end of `site.css`:

```css
/* Table-specific tokens, shared by every demo so the comparison is of the
   library and not of someone's styling effort. */
:root {
  --table-row-h: 32px;
  --table-font-size: 13px;
  --table-header-bg: var(--surface);
  --table-stripe: color-mix(in srgb, var(--text-primary) 3%, transparent);
  --table-num-font: var(--font-mono);
}
.demo-host { height: 460px; overflow: auto; border: 1px solid var(--border); border-radius: 8px; }
.demo-host--tall { height: 620px; }
```

- [ ] **Step 7: Create a placeholder index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>tables-evaluation</title>
<link rel="stylesheet" href="/src/harness/site.css">
</head>
<body>
<div class="wrap" style="padding-top:30px">
  <h1>tables-evaluation</h1>
  <p>Hub page is built in Task 13.</p>
</div>
</body>
</html>
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run tests/scaffold.test.js`
Expected: PASS, 2 tests

- [ ] **Step 9: Verify the dev server starts**

Run: `npm run dev` — confirm `http://localhost:5173` serves the placeholder, then stop it.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: vite multi-page scaffold with shared theme

Demo registry in vite.config.js is the single source of truth for which
libraries exist; scripts and the hub page both read it.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 2: Prepare the four datasets as Parquet

**Files:**
- Create: `scripts/prepare-data.mjs`
- Create: `public/data/{small,wide,medium,large}.parquet` (generated, committed)
- Test: `tests/prepare-data.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: four Parquet files. Every file has a header-named schema. `small` and `large` share the Land Registry column set: `id, price, date, postcode, propertyType, oldNew, duration, paon, saon, street, locality, town, district, county, ppdCategory, recordStatus`.

**Approach note:** Node has no mature Parquet *writer*, and hyparquet is read-only.
Use `hyparquet-writer` (from the same authors) if it resolves; if it does not, write
the files with DuckDB's Node bindings via `@duckdb/node-api`, which can read the CSV
and `COPY ... TO 'x.parquet' (FORMAT PARQUET)` in one statement. Step 3 decides this
once, empirically, rather than guessing.

- [ ] **Step 1: Write the failing test**

```js
// tests/prepare-data.test.js
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { asyncBufferFromFile, parquetMetadataAsync, parquetSchema } from "hyparquet";

const EXPECTED = {
  small:  { minRows: 900,    maxRows: 1100,   minCols: 10 },
  wide:   { minRows: 900,    maxRows: 1100,   minCols: 75 },
  medium: { minRows: 45000,  maxRows: 55000,  minCols: 10 },
  large:  { minRows: 450000, maxRows: 550000, minCols: 10 },
};

describe("prepared datasets", () => {
  for (const [key, exp] of Object.entries(EXPECTED)) {
    it(`${key}.parquet has the expected shape`, async () => {
      const path = `public/data/${key}.parquet`;
      expect(existsSync(path), `${path} missing — run npm run data`).toBe(true);
      const file = await asyncBufferFromFile(path);
      const meta = await parquetMetadataAsync(file);
      const rows = Number(meta.num_rows);
      expect(rows).toBeGreaterThanOrEqual(exp.minRows);
      expect(rows).toBeLessThanOrEqual(exp.maxRows);
      const cols = parquetSchema(meta).children.map((c) => c.element.name);
      expect(cols.length).toBeGreaterThanOrEqual(exp.minCols);
    });
  }

  it("keeps every file under the 25MB repo limit", () => {
    for (const key of Object.keys(EXPECTED)) {
      const mb = statSync(`public/data/${key}.parquet`).size / 1e6;
      expect(mb, `${key} is ${mb.toFixed(1)}MB`).toBeLessThan(25);
    }
  });

  it("gives small and large the same human-readable columns", async () => {
    const cols = async (k) =>
      parquetSchema(await parquetMetadataAsync(await asyncBufferFromFile(`public/data/${k}.parquet`)))
        .children.map((c) => c.element.name);
    expect(await cols("small")).toEqual(await cols("large"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prepare-data.test.js`
Expected: FAIL — `public/data/small.parquet missing`

- [ ] **Step 3: Decide the Parquet writer, empirically**

```bash
npm view hyparquet-writer version
npm view @duckdb/node-api version
```

Install whichever resolves; prefer `hyparquet-writer` for the smaller dependency.
Record the choice in a comment at the top of `prepare-data.mjs`. Do not proceed on
an assumption — install it and write one throwaway file first to confirm hyparquet
can read back what the writer produced.

- [ ] **Step 4: Write scripts/prepare-data.mjs**

```js
/* Builds the four demo datasets from HM Land Registry price-paid data.
 *
 * Source: pp-2024.csv (162MB, no header row), Open Government Licence.
 * Downloaded once into data-cache/ (gitignored); the Parquet outputs are
 * committed so the site builds with no network access.
 *
 * Parquet writer: see Step 3 of Task 2 — record the chosen library here.
 */
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const SRC = "http://prod1.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-2024.csv";
const CACHE = "data-cache/pp-2024.csv";

/** Column order of the Land Registry file, which ships with no header row. */
const COLUMNS = [
  "id", "price", "date", "postcode", "propertyType", "oldNew", "duration",
  "paon", "saon", "street", "locality", "town", "district", "county",
  "ppdCategory", "recordStatus",
];

/** Codes the raw file uses, expanded so the table is readable by a human. */
const PROPERTY_TYPE = { D: "Detached", S: "Semi-detached", T: "Terraced", F: "Flat", O: "Other" };
const DURATION = { F: "Freehold", L: "Leasehold" };

async function ensureSource() {
  if (existsSync(CACHE)) return;
  mkdirSync("data-cache", { recursive: true });
  console.log("downloading 162MB from Land Registry (once)...");
  const res = await fetch(SRC, { redirect: "follow" });
  if (!res.ok) throw new Error(`source fetch failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(CACHE));
}

/** Minimal RFC4180 parser: the file quotes every field and contains commas
 *  inside address fields, so splitting on "," is not safe. */
function parseLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function toRow(fields) {
  const r = {};
  COLUMNS.forEach((name, i) => (r[name] = fields[i] ?? ""));
  return {
    id: r.id.replace(/[{}]/g, ""),
    price: Number(r.price) || 0,
    date: r.date.slice(0, 10),
    postcode: r.postcode,
    propertyType: PROPERTY_TYPE[r.propertyType] ?? r.propertyType,
    oldNew: r.oldNew === "Y" ? "New build" : "Existing",
    duration: DURATION[r.duration] ?? r.duration,
    paon: r.paon,
    saon: r.saon,
    street: r.street,
    locality: r.locality,
    town: r.town,
    district: r.district,
    county: r.county,
    ppdCategory: r.ppdCategory,
    recordStatus: r.recordStatus,
  };
}

/** Wide dataset: the 16 real columns plus 64 derived ones, to exercise
 *  horizontal virtualization without inventing a second source. */
function widen(row, i) {
  const w = { ...row };
  for (let n = 1; n <= 64; n++) {
    w[`metric_${String(n).padStart(2, "0")}`] =
      Math.round((row.price / 1000) * Math.sin(i + n) * 100) / 100;
  }
  return w;
}

async function main() {
  await ensureSource();
  const text = await readFile(CACHE, "utf8");
  const lines = text.split("\n").filter(Boolean);
  console.log(`parsed ${lines.length.toLocaleString()} source rows`);

  const all = lines.map((l) => toRow(parseLine(l)));

  // Deterministic even-stride sampling, so reruns are reproducible and the
  // sample spans the whole year rather than only January.
  const take = (n) => {
    const stride = Math.max(1, Math.floor(all.length / n));
    return Array.from({ length: n }, (_, i) => all[i * stride]).filter(Boolean);
  };

  await writeParquet("public/data/small.parquet", take(1000));
  await writeParquet("public/data/wide.parquet", take(1000).map(widen));
  await writeParquet("public/data/medium.parquet", take(50000));
  await writeParquet("public/data/large.parquet", take(500000));
  console.log("done");
}

/** Implemented in Step 3 against the chosen writer library. */
async function writeParquet(path, rows) {
  throw new Error("implement with the writer chosen in Task 2 Step 3");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Replace `writeParquet` with a real implementation using the library chosen in Step 3.

- [ ] **Step 5: Generate the data**

Run: `npm run data`
Expected: four files in `public/data/`. If `large.parquet` exceeds 25MB, reduce the
row count to 300,000 and rerun — do not reach for Git LFS.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/prepare-data.test.js`
Expected: PASS, 6 tests

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: prepare four datasets from Land Registry price-paid data

Even-stride sampling from pp-2024.csv so reruns are reproducible and the
sample spans the whole year. Codes expanded to readable labels because half
of what this evaluation measures is the reading experience.

Source: HM Land Registry, Open Government Licence.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 3: Parquet loader

**Files:**
- Create: `src/data/datasets.js`, `src/data/load.js`
- Test: `tests/load.test.js`

**Interfaces:**
- Consumes: `public/data/*.parquet` from Task 2.
- Produces:
  - `DATASETS` — record keyed by `small|wide|medium|large`, each
    `{ key, file, title, desc, stress, eager: boolean }`.
  - `loadDataset(key)` → `Promise<Dataset>` where
    `Dataset = { key, columns: ColumnSpec[], rows: object[], numRows: number, timings: { fetchMs, decodeMs } }`
  - `ColumnSpec = { name: string, type: 'string'|'number'|'date', align: 'left'|'right' }`
  - `formatCell(value, col)` → `string` — the **shared** formatter every demo uses,
    so number and date formatting is identical across libraries.

- [ ] **Step 1: Write the failing test**

```js
// tests/load.test.js
import { describe, it, expect } from "vitest";
import { DATASETS } from "../src/data/datasets.js";
import { inferColumns, formatCell } from "../src/data/load.js";

describe("inferColumns", () => {
  it("types numbers, dates and strings from sample rows", () => {
    const rows = [
      { price: 320000, date: "2024-07-26", town: "BEDFORD" },
      { price: 470000, date: "2024-08-21", town: "AMPTHILL" },
    ];
    const cols = inferColumns(rows);
    expect(cols.find((c) => c.name === "price")).toEqual({ name: "price", type: "number", align: "right" });
    expect(cols.find((c) => c.name === "date").type).toBe("date");
    expect(cols.find((c) => c.name === "town")).toEqual({ name: "town", type: "string", align: "left" });
  });

  it("returns an empty array for no rows rather than throwing", () => {
    expect(inferColumns([])).toEqual([]);
  });
});

describe("formatCell", () => {
  const num = { name: "price", type: "number", align: "right" };
  const str = { name: "town", type: "string", align: "left" };

  it("groups thousands in numbers", () => {
    expect(formatCell(320000, num)).toBe("320,000");
  });

  it("renders null and undefined as an em dash, not as 'null'", () => {
    expect(formatCell(null, num)).toBe("—");
    expect(formatCell(undefined, str)).toBe("—");
  });

  it("renders empty strings as an em dash", () => {
    expect(formatCell("", str)).toBe("—");
  });

  it("passes strings through untouched", () => {
    expect(formatCell("BEDFORD", str)).toBe("BEDFORD");
  });

  it("keeps zero as zero rather than treating it as empty", () => {
    expect(formatCell(0, num)).toBe("0");
  });
});

describe("DATASETS", () => {
  it("declares four datasets and loads the large one lazily", () => {
    expect(Object.keys(DATASETS)).toEqual(["small", "wide", "medium", "large"]);
    expect(DATASETS.large.eager).toBe(false);
    expect(DATASETS.small.eager).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/load.test.js`
Expected: FAIL — cannot resolve `../src/data/datasets.js`

- [ ] **Step 3: Write src/data/datasets.js**

```js
/* The four shared datasets. Every library renders all four; each one
 * stresses a different axis. Descriptions are shown on the demo cards. */
export const DATASETS = {
  small: {
    key: "small", file: "/data/small.parquet", eager: true,
    title: "Small & rich — 1,000 property sales",
    desc: "Sixteen columns of mixed types: prices, dates, postcodes, street names, nulls.",
    stress: "Typography, alignment, number and date formatting, null rendering, text overflow.",
  },
  wide: {
    key: "wide", file: "/data/wide.parquet", eager: true,
    title: "Wide — 80 columns",
    desc: "The same 1,000 sales plus 64 derived numeric columns.",
    stress: "Horizontal scrolling, column virtualization, header behaviour, column pinning.",
  },
  medium: {
    key: "medium", file: "/data/medium.parquet", eager: true,
    title: "Medium — 50,000 rows",
    desc: "Where rendering every row as real DOM starts to hurt but has not yet collapsed.",
    stress: "Row virtualization quality, sort and filter responsiveness.",
  },
  large: {
    key: "large", file: "/data/large.parquet", eager: false,
    title: "Large — 500,000 rows",
    desc: "A full year of English and Welsh property sales. Loaded on demand.",
    stress: "Load time, sustained scroll FPS, memory, sorting at scale.",
  },
};

export const DATASET_KEYS = Object.keys(DATASETS);
```

- [ ] **Step 4: Write src/data/load.js**

```js
import { asyncBufferFromUrl, parquetReadObjects, parquetMetadataAsync } from "hyparquet";
import { DATASETS } from "./datasets.js";

const cache = new Map();

/** Infer a display type per column from the first rows. Deliberately simple:
 *  the datasets are known, and every library gets the same answer. */
export function inferColumns(rows) {
  if (!rows.length) return [];
  const sample = rows.slice(0, 50);
  return Object.keys(rows[0]).map((name) => {
    const vals = sample.map((r) => r[name]).filter((v) => v !== null && v !== undefined && v !== "");
    const isNum = vals.length > 0 && vals.every((v) => typeof v === "number" || typeof v === "bigint");
    const isDate = !isNum && vals.length > 0 && vals.every((v) => /^\d{4}-\d{2}-\d{2}/.test(String(v)));
    const type = isNum ? "number" : isDate ? "date" : "string";
    return { name, type, align: type === "number" ? "right" : "left" };
  });
}

/** The one formatter every demo uses. Shared on purpose: differences you see
 *  between libraries should come from the library, not from formatting. */
export function formatCell(value, col) {
  if (value === null || value === undefined || value === "") return "—";
  if (col.type === "number") return Number(value).toLocaleString("en-GB");
  return String(value);
}

/** Load, decode and materialise a dataset. Cached per key, so a demo page
 *  that renders four tables pays each dataset's cost exactly once. */
export async function loadDataset(key) {
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const spec = DATASETS[key];
    if (!spec) throw new Error(`unknown dataset: ${key}`);

    const t0 = performance.now();
    const file = await asyncBufferFromUrl({ url: spec.file });
    const meta = await parquetMetadataAsync(file);
    const t1 = performance.now();

    const rows = await parquetReadObjects({ file });
    const t2 = performance.now();

    return {
      key,
      rows,
      numRows: Number(meta.num_rows),
      columns: inferColumns(rows),
      timings: { fetchMs: t1 - t0, decodeMs: t2 - t1 },
    };
  })();
  cache.set(key, p);
  return p;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/load.test.js`
Expected: PASS, 9 tests

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: parquet loader with shared cell formatter

The formatter is shared deliberately: differences visible between libraries
should come from the library, not from someone formatting numbers better in
one demo than another.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 4: Metrics module

**Files:**
- Create: `src/harness/metrics.js`
- Test: `tests/metrics.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `time(fn)` → `{ result, ms }` — synchronous render timing.
  - `measureScrollFps(el, { distance, steps })` → `Promise<{ fps, frames, droppedFrames }>`
  - `peakMemoryMB()` → `number | null` (null off Chromium)
  - `formatMs(ms)` → `string`

- [ ] **Step 1: Write the failing test**

```js
// tests/metrics.test.js
import { describe, it, expect, vi } from "vitest";
import { time, formatMs, peakMemoryMB } from "../src/harness/metrics.js";

describe("time", () => {
  it("returns both the result and an elapsed measurement", () => {
    const { result, ms } = time(() => 6 * 7);
    expect(result).toBe(42);
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  it("lets errors propagate rather than swallowing them", () => {
    expect(() => time(() => { throw new Error("boom"); })).toThrow("boom");
  });
});

describe("formatMs", () => {
  it("shows sub-millisecond timings without fake precision", () => {
    expect(formatMs(0.4)).toBe("<1 ms");
  });
  it("shows one decimal below 50ms", () => {
    expect(formatMs(12.34)).toBe("12.3 ms");
  });
  it("rounds above 50ms", () => {
    expect(formatMs(1234.5)).toBe("1235 ms");
  });
});

describe("peakMemoryMB", () => {
  it("returns null when performance.memory is unavailable", () => {
    vi.stubGlobal("performance", { now: () => 0 });
    expect(peakMemoryMB()).toBeNull();
    vi.unstubAllGlobals();
  });

  it("converts bytes to megabytes when available", () => {
    vi.stubGlobal("performance", { now: () => 0, memory: { usedJSHeapSize: 52_428_800 } });
    expect(peakMemoryMB()).toBe(50);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/metrics.test.js`
Expected: FAIL — cannot resolve `../src/harness/metrics.js`

- [ ] **Step 3: Write src/harness/metrics.js**

```js
/* Measurement helpers shared by every demo card, so the numbers on the site
 * are measured the same way for every library. */

export function time(fn) {
  const t0 = performance.now();
  const result = fn();
  return { result, ms: performance.now() - t0 };
}

export function formatMs(ms) {
  if (ms < 1) return "<1 ms";
  if (ms < 50) return `${ms.toFixed(1)} ms`;
  return `${Math.round(ms)} ms`;
}

/** Chromium-only. Returns null elsewhere rather than substituting a worse
 *  proxy — an absent number is more honest than a misleading one. */
export function peakMemoryMB() {
  const m = performance.memory;
  if (!m || typeof m.usedJSHeapSize !== "number") return null;
  return Math.round(m.usedJSHeapSize / 1_048_576);
}

/** Scroll `el` through `distance` px in `steps` increments, one per animation
 *  frame, and report the frame rate achieved. This is a scripted scroll rather
 *  than a synthetic benchmark: it exercises the library's real scroll path. */
export function measureScrollFps(el, { distance = 20000, steps = 120 } = {}) {
  return new Promise((resolve) => {
    const start = el.scrollTop;
    const step = distance / steps;
    let frames = 0, i = 0;
    const t0 = performance.now();

    function tick() {
      if (i >= steps) {
        const elapsed = performance.now() - t0;
        const fps = (frames / elapsed) * 1000;
        el.scrollTop = start;
        resolve({
          fps: Math.round(fps),
          frames,
          droppedFrames: Math.max(0, Math.round((elapsed / 16.67) - frames)),
        });
        return;
      }
      el.scrollTop = start + step * i;
      i++; frames++;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/metrics.test.js`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: shared measurement helpers

peakMemoryMB returns null off Chromium rather than substituting a worse
proxy; an absent number is more honest than a misleading one.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 5: The harness, proved by the plain `<table>` baseline

This task builds the shared page shell **and** the first demo together, because
neither is testable without the other. Every later demo is then a single directory.

**Files:**
- Create: `src/harness/mount.js`
- Create: `demos/baseline.html`, `src/demos/baseline/main.js`
- Test: `tests/e2e/demo.spec.js`, `playwright.config.js`

**Interfaces:**
- Consumes: `loadDataset`, `formatCell`, `DATASETS` (Task 3); `time`, `formatMs`, `measureScrollFps`, `peakMemoryMB` (Task 4); theme module (Task 1).
- Produces — **the contract every demo implements**:
  ```js
  export const meta = {
    name, version, license, docs, tagline,
    notes,          // optional caveat shown under the header
    npm,            // package name, or null for the baseline
  };
  export const tables = {
    small(host, dataset, ctx),   // each returns an optional cleanup function
    wide(host, dataset, ctx),
    medium(host, dataset, ctx),
    large(host, dataset, ctx),
  };
  // ctx = { theme: 'light'|'dark', key, formatCell }
  export default mountDemo({ meta, tables });
  ```
  `mountDemo({ meta, tables })` → `Promise<void>`. Every demo page's `main.js`
  ends by calling it.

- [ ] **Step 1: Write the failing end-to-end test**

```js
// tests/e2e/demo.spec.js
import { test, expect } from "@playwright/test";

const DEMOS = ["baseline", "observable", "tabulator", "aggrid", "tanstack", "glide", "perspective"];
const BUILT = ["baseline"]; // extend as each demo lands

for (const key of BUILT) {
  test.describe(key, () => {
    test("renders the eager datasets with no console error", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(`/demos/${key}.html`);

      // Three eager cards must show a render time; the fourth is on demand.
      for (const ds of ["small", "wide", "medium"]) {
        const badge = page.locator(`[data-card="${ds}"] .metric b`);
        await expect(badge).not.toHaveText("—", { timeout: 30000 });
      }
      expect(errors).toEqual([]);
    });

    test("shows the source of each render function", async ({ page }) => {
      await page.goto(`/demos/${key}.html`);
      const src = page.locator(`[data-card="small"] .src pre`);
      await expect(src).toContainText("host");
    });

    test("loads the large dataset only when asked", async ({ page }) => {
      await page.goto(`/demos/${key}.html`);
      const card = page.locator(`[data-card="large"]`);
      await expect(card.locator(".metric b")).toHaveText("—");
      await card.getByRole("button", { name: /load/i }).click();
      await expect(card.locator(".metric b")).not.toHaveText("—", { timeout: 120000 });
    });
  });
}
```

- [ ] **Step 2: Write playwright.config.js**

```js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180000,
  use: { baseURL: "http://localhost:5173", trace: "on-first-retry" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx playwright install chromium && npx playwright test`
Expected: FAIL — `/demos/baseline.html` returns 404

- [ ] **Step 4: Write src/harness/mount.js**

```js
/* The shared demo-page framework. A library's page supplies four render
 * functions and gets an identical page: header, four cards, a live metrics
 * badge per card, and a source panel showing the exact code that ran.
 *
 * This is what makes the bake-off fair — every demo gets the same shell, the
 * same data, the same theme and the same formatter. */

import { DATASETS, DATASET_KEYS } from "../data/datasets.js";
import { loadDataset, formatCell } from "../data/load.js";
import { time, formatMs, measureScrollFps, peakMemoryMB } from "./metrics.js";
import { theme, onThemeChange, installThemeToggle, restoreTheme } from "./theme.js";

restoreTheme();

export async function mountDemo({ meta, tables }) {
  document.title = `${meta.name} — tables-evaluation`;
  const root = document.getElementById("app");
  root.innerHTML = shell(meta);
  installThemeToggle(root.querySelector(".toggle"));

  const cleanups = {};

  for (const key of DATASET_KEYS) {
    const card = root.querySelector(`[data-card="${key}"]`);
    card.querySelector(".src pre").textContent = sourceOf(tables[key]);
    card.querySelector(".fps-btn").addEventListener("click", () => runFps(card));

    if (DATASETS[key].eager) {
      render(key, card);
    } else {
      card.querySelector(".load-btn").addEventListener("click", (e) => {
        e.target.disabled = true;
        e.target.textContent = "loading…";
        render(key, card);
      });
    }
  }

  async function render(key, card) {
    const host = card.querySelector(".demo-host");
    const badge = card.querySelector(".metric b");
    const detail = card.querySelector(".metric-detail");

    let data;
    try {
      data = await loadDataset(key);
    } catch (err) {
      host.innerHTML = `<pre class="err">could not load ${DATASETS[key].file}\n${err}</pre>`;
      badge.textContent = "load failed";
      return;
    }

    try { cleanups[key]?.(); } catch {}
    host.innerHTML = "";

    const ctx = { theme: theme(), key, formatCell };
    try {
      const { result, ms } = time(() => tables[key](host, data, ctx));
      cleanups[key] = typeof result === "function" ? result : null;
      badge.textContent = formatMs(ms);
      const mem = peakMemoryMB();
      detail.textContent =
        `${data.numRows.toLocaleString()} rows · ` +
        `load ${formatMs(data.timings.fetchMs + data.timings.decodeMs)}` +
        (mem === null ? "" : ` · heap ${mem} MB`);
    } catch (err) {
      // A demo that throws reports it in its own card and does not take the
      // page down. A library failing on a dataset IS a result.
      host.innerHTML = `<pre class="err">${escapeHtml(String(err.stack || err))}</pre>`;
      badge.textContent = "failed";
      console.error(`[${meta.name}] ${key}`, err);
    }
  }

  async function runFps(card) {
    const btn = card.querySelector(".fps-btn");
    const out = card.querySelector(".fps-out");
    const scroller = card.querySelector(".demo-host");
    btn.disabled = true;
    out.textContent = "measuring…";
    const { fps, droppedFrames } = await measureScrollFps(scroller);
    out.textContent = `${fps} fps · ${droppedFrames} dropped`;
    btn.disabled = false;
  }

  onThemeChange(() => {
    for (const key of DATASET_KEYS) {
      const card = root.querySelector(`[data-card="${key}"]`);
      if (card.querySelector(".metric b").textContent !== "—") render(key, card);
    }
  });
}

/* ---------------------------------------------------------------- */

function shell(meta) {
  return `
  <header class="wrap" style="padding-top:22px;padding-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
      <a href="/index.html" style="font-size:13px;color:var(--text-secondary)">← all libraries</a>
      <button class="toggle"></button>
    </div>
    <h1 style="margin:14px 0 4px;font-size:26px;letter-spacing:-0.02em">${meta.name}
      <span style="font-size:14px;color:var(--text-muted);font-weight:400">v${meta.version}</span>
    </h1>
    <p style="margin:0;max-width:70ch;color:var(--text-secondary);font-size:14px">${meta.tagline}</p>
    <p style="margin:10px 0 0;font-size:12.5px;color:var(--text-muted)">
      <a href="${meta.docs}" target="_blank" rel="noopener">docs</a>
      ${meta.npm ? `&nbsp;·&nbsp; <code>${meta.npm}</code>` : ""}
      &nbsp;·&nbsp; ${meta.license}
    </p>
    ${meta.notes ? `<p style="margin:8px 0 0;font-size:12.5px;color:var(--text-secondary);max-width:75ch">${meta.notes}</p>` : ""}
  </header>
  <main class="wrap" style="padding-bottom:60px">
    ${DATASET_KEYS.map(cardHTML).join("")}
  </main>`;
}

function cardHTML(key) {
  const d = DATASETS[key];
  return `
  <section class="card" data-card="${key}" style="margin-top:24px">
    <div class="card__head">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <h2 class="card__title">${d.title}</h2>
        <span class="metric">rendered <b>—</b></span>
      </div>
      <p class="card__desc">${d.desc}</p>
      <p class="card__desc" style="color:var(--text-muted)"><b style="font-weight:600">Stresses:</b> ${d.stress}</p>
      <p class="metric-detail" style="font-size:12px;color:var(--text-muted);margin:6px 0 0"></p>
    </div>
    <div class="demo-host${key === "large" ? " demo-host--tall" : ""}"></div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap">
      ${d.eager ? "" : `<button class="load-btn">Load ${key === "large" ? "500,000 rows" : "data"}</button>`}
      <button class="fps-btn">Measure scroll FPS</button>
      <span class="fps-out" style="font-size:12px;color:var(--text-muted)"></span>
    </div>
    <details class="src"><summary>source</summary><pre></pre></details>
  </section>`;
}

/** Print a render function's source with the common indent stripped, so the
 *  source panel shows what you would actually write. */
function sourceOf(fn) {
  const lines = fn.toString().replace(/\t/g, "  ").split("\n");
  const indents = lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const min = Math.min(...indents, Infinity);
  return lines.map((l, i) => (i === 0 ? l : l.slice(min))).join("\n").trim();
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
```

- [ ] **Step 5: Add the error style to src/harness/site.css**

```css
.err { color: var(--series-2, #c0392b); font-size: 12px; white-space: pre-wrap; padding: 12px; margin: 0; }
.card__title { font-size: 17px; margin: 0; }
.card__desc { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; }
.metric { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.metric b { color: var(--text-primary); font-family: var(--font-mono); }
.src { margin-top: 10px; font-size: 12px; }
.src pre { overflow-x: auto; background: var(--surface); padding: 12px; border-radius: 8px; font-family: var(--font-mono); }
button { font: inherit; font-size: 12px; padding: 5px 11px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: inherit; cursor: pointer; }
button:disabled { opacity: 0.5; cursor: default; }
```

- [ ] **Step 6: Write demos/baseline.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plain &lt;table&gt; — tables-evaluation</title>
<link rel="stylesheet" href="/src/harness/site.css">
<style>
  .plain { border-collapse: collapse; font-size: var(--table-font-size); width: 100%; }
  .plain th, .plain td { padding: 5px 10px; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
  .plain th { position: sticky; top: 0; background: var(--table-header-bg); font-weight: 600; }
  .plain td.num { text-align: right; font-family: var(--table-num-font); }
  .plain tbody tr:nth-child(even) { background: var(--table-stripe); }
</style>
</head>
<body>
<div id="app"></div>
<script type="module" src="/src/demos/baseline/main.js"></script>
</body>
</html>
```

- [ ] **Step 7: Write src/demos/baseline/main.js**

```js
/* The control. No library at all — build the DOM by hand.
 *
 * This exists to give the scorecard a floor. On the small dataset it is
 * genuinely competitive, which is the point: reach for a grid when you have a
 * reason, not by default. On 500k rows it dies, which is also the point. */

import { mountDemo } from "../../harness/mount.js";

export const meta = {
  name: "Plain <table>",
  version: "—",
  license: "n/a",
  docs: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table",
  npm: null,
  tagline: "No library. Hand-built DOM, sticky header, ~20 lines.",
  notes:
    "The control in this comparison. Rendering every row as real DOM has no " +
    "virtualization, so the large dataset is expected to lock the tab — that " +
    "failure is the measurement, not a bug in the demo.",
};

/** One implementation, used for all four datasets. Building the whole table as
 *  an HTML string and assigning innerHTML once is far faster than createElement
 *  per cell — this is the honest best case for the no-library approach. */
function renderTable(host, data, ctx, rowLimit = Infinity) {
  const rows = data.rows.length > rowLimit ? data.rows.slice(0, rowLimit) : data.rows;
  const cols = data.columns;

  const head = cols.map((c) => `<th>${c.name}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        "<tr>" +
        cols
          .map((c) => `<td class="${c.align === "right" ? "num" : ""}">${ctx.formatCell(r[c.name], c)}</td>`)
          .join("") +
        "</tr>"
    )
    .join("");

  host.innerHTML = `<table class="plain"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export const tables = {
  small: (host, data, ctx) => renderTable(host, data, ctx),
  wide: (host, data, ctx) => renderTable(host, data, ctx),
  medium: (host, data, ctx) => renderTable(host, data, ctx),
  large: (host, data, ctx) => renderTable(host, data, ctx),
};

mountDemo({ meta, tables });
```

- [ ] **Step 8: Run the end-to-end test to verify it passes**

Run: `npx playwright test`
Expected: PASS, 3 tests.

If the third test times out because 500k hand-built rows genuinely hang the tab,
that is the expected finding — but the test must still pass. Cap the baseline's
large render at 100,000 rows by changing its `large` entry to
`renderTable(host, data, ctx, 100000)` and add to `meta.notes` that it was capped,
with the row count. **Record the cap; do not hide it.**

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: shared demo harness, proved by the plain <table> baseline

The harness owns the shell, theme, metrics and source panel; a demo owns
nothing but four render functions. That is what makes the comparison about
the library rather than about styling effort.

A demo that throws renders its stack in its own card. A library failing on
a dataset is recorded as a result, never silently skipped.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 6: Observable Inputs demo

**Files:**
- Create: `demos/observable.html`, `src/demos/observable/main.js`
- Modify: `tests/e2e/demo.spec.js` — add `"observable"` to `BUILT`

**Interfaces:**
- Consumes: `mountDemo` contract from Task 5.
- Produces: nothing other demos depend on.

- [ ] **Step 1: Add the demo to the e2e list (the failing test)**

In `tests/e2e/demo.spec.js` change: `const BUILT = ["baseline", "observable"];`

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test`
Expected: FAIL — `/demos/observable.html` 404

- [ ] **Step 3: Install**

Run: `npm install @observablehq/inputs@0.12.0`

- [ ] **Step 4: Write demos/observable.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Observable Inputs — tables-evaluation</title>
<link rel="stylesheet" href="/src/harness/site.css">
</head>
<body>
<div id="app"></div>
<script type="module" src="/src/demos/observable/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Write src/demos/observable/main.js**

```js
/* The tiny end of the range. Inputs.table is one call: it infers column types,
 * right-aligns numbers, sorts on header click and virtualizes by lazily
 * appending rows as you scroll. */

import * as Inputs from "@observablehq/inputs";
import { mountDemo } from "../../harness/mount.js";

export const meta = {
  name: "Observable Inputs",
  version: "0.12.0",
  license: "ISC",
  docs: "https://observablehq.com/documentation/inputs/table",
  npm: "@observablehq/inputs",
  tagline: "One function call. Strong defaults, built for data exploration.",
  notes:
    "Inputs.table appends rows lazily as you scroll rather than windowing, so " +
    "memory grows with how far you scroll rather than staying flat.",
};

function table(host, data, ctx) {
  const el = Inputs.table(data.rows, {
    columns: data.columns.map((c) => c.name),
    format: Object.fromEntries(
      data.columns.map((c) => [c.name, (v) => ctx.formatCell(v, c)])
    ),
    align: Object.fromEntries(data.columns.map((c) => [c.name, c.align])),
    rows: 30,
    height: 460,
  });
  host.append(el);
}

export const tables = { small: table, wide: table, medium: table, large: table };

mountDemo({ meta, tables });
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx playwright test`
Expected: PASS, 6 tests

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: Observable Inputs demo

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 7: Tabulator demo

**Files:**
- Create: `demos/tabulator.html`, `src/demos/tabulator/main.js`
- Modify: `tests/e2e/demo.spec.js` — add `"tabulator"` to `BUILT`

**Interfaces:**
- Consumes: `mountDemo` contract from Task 5.

- [ ] **Step 1: Add to the e2e list (the failing test)**

`const BUILT = ["baseline", "observable", "tabulator"];`

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test`
Expected: FAIL — 404

- [ ] **Step 3: Install**

Run: `npm install tabulator-tables@6.5.2`

- [ ] **Step 4: Write demos/tabulator.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabulator — tables-evaluation</title>
<link rel="stylesheet" href="/src/harness/site.css">
</head>
<body>
<div id="app"></div>
<script type="module" src="/src/demos/tabulator/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Write src/demos/tabulator/main.js**

```js
/* Batteries-included vanilla grid. Virtual DOM row rendering, sorting,
 * filtering, grouping and export are all in the free package. */

import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator_simple.min.css";
import { mountDemo } from "../../harness/mount.js";

export const meta = {
  name: "Tabulator",
  version: "6.5.2",
  license: "MIT",
  docs: "https://tabulator.info/docs/6.5",
  npm: "tabulator-tables",
  tagline: "Vanilla, batteries-included: grouping, tree data, editing, export.",
  notes:
    "Rendering is asynchronous — the harness times the constructor call, so " +
    "Tabulator's reported render time is a floor, not the time to painted rows.",
};

function build(host, data, ctx, opts = {}) {
  const t = new Tabulator(host, {
    data: data.rows,
    height: "100%",
    layout: "fitDataStretch",
    renderVertical: "virtual",
    columns: data.columns.map((c) => ({
      title: c.name,
      field: c.name,
      hozAlign: c.align,
      headerSort: true,
      formatter: (cell) => ctx.formatCell(cell.getValue(), c),
    })),
    ...opts,
  });
  return () => t.destroy();
}

export const tables = {
  small: (host, data, ctx) => build(host, data, ctx),
  wide: (host, data, ctx) => build(host, data, ctx, { renderHorizontal: "virtual" }),
  medium: (host, data, ctx) => build(host, data, ctx),
  large: (host, data, ctx) => build(host, data, ctx),
};

mountDemo({ meta, tables });
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx playwright test`
Expected: PASS, 9 tests

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: Tabulator demo

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 8: AG Grid Community demo

**Files:**
- Create: `demos/aggrid.html`, `src/demos/aggrid/main.js`
- Modify: `tests/e2e/demo.spec.js` — add `"aggrid"` to `BUILT`

**Interfaces:**
- Consumes: `mountDemo` contract from Task 5.

**Version note:** AG Grid 33+ made module registration mandatory and introduced the
Theming API. Without `ModuleRegistry.registerModules([AllCommunityModule])` the grid
throws at construction. Do not follow pre-v33 tutorials that import CSS themes.

- [ ] **Step 1: Add to the e2e list (the failing test)**

`const BUILT = ["baseline", "observable", "tabulator", "aggrid"];`

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test`
Expected: FAIL — 404

- [ ] **Step 3: Install**

Run: `npm install ag-grid-community@36.1.0`

- [ ] **Step 4: Write demos/aggrid.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AG Grid Community — tables-evaluation</title>
<link rel="stylesheet" href="/src/harness/site.css">
</head>
<body>
<div id="app"></div>
<script type="module" src="/src/demos/aggrid/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Write src/demos/aggrid/main.js**

```js
/* The enterprise default. Row and column virtualization, sorting, filtering
 * and resizing are all in the Community (MIT) tier. */

import { createGrid, ModuleRegistry, AllCommunityModule, themeQuartz } from "ag-grid-community";
import { mountDemo } from "../../harness/mount.js";

// Mandatory since v33 — the grid throws at construction without it.
ModuleRegistry.registerModules([AllCommunityModule]);

export const meta = {
  name: "AG Grid Community",
  version: "36.1.0",
  license: "MIT (Community tier)",
  docs: "https://www.ag-grid.com/javascript-data-grid/",
  npm: "ag-grid-community",
  tagline: "The enterprise default. Vanilla core, row + column virtualization.",
  notes:
    "Open-core. Pivoting, row grouping with aggregation, server-side row model " +
    "and the integrated charts are Enterprise ($999/dev). Everything shown here " +
    "is in the free MIT tier.",
};

function build(host, data, ctx) {
  // Full height is required — AG Grid measures its own scroll viewport.
  host.style.height = "100%";

  const api = createGrid(host, {
    theme: themeQuartz.withParams(
      ctx.theme === "dark"
        ? { backgroundColor: "#12131a", foregroundColor: "#e6e6ea", headerBackgroundColor: "#1a1c24" }
        : {}
    ),
    rowData: data.rows,
    columnDefs: data.columns.map((c) => ({
      field: c.name,
      type: c.type === "number" ? "rightAligned" : undefined,
      sortable: true,
      filter: true,
      resizable: true,
      valueFormatter: (p) => ctx.formatCell(p.value, c),
    })),
    defaultColDef: { minWidth: 110 },
    rowHeight: 32,
    animateRows: false,
  });

  return () => api.destroy();
}

export const tables = { small: build, wide: build, medium: build, large: build };

mountDemo({ meta, tables });
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx playwright test`
Expected: PASS, 12 tests

If `themeQuartz` is not exported, check the v36 theming docs and fall back to
`theme: "legacy"` plus the CSS imports; record which was used in `meta.notes`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: AG Grid Community demo

Uses the v33+ Theming API and mandatory module registration; pre-v33
tutorials that import CSS themes no longer apply.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 9: TanStack Table demo (React, v9)

**Files:**
- Create: `demos/tanstack.html`, `src/demos/tanstack/main.jsx`, `src/demos/tanstack/Table.jsx`
- Modify: `tests/e2e/demo.spec.js` — add `"tanstack"` to `BUILT`

**Interfaces:**
- Consumes: `mountDemo` contract from Task 5.
- Produces: `src/harness/react-host.js` exporting `mountReact(host, element)` → cleanup function, reused by Task 10.

**Version note — read first:** This is v9, released 2026. It is a redesign, not an
increment. `getCoreRowModel()` does not exist. Features are opt-in through a
`tableFeatures({...})` helper and passed as `features` to `useTable`. Most tutorials
online describe v8 and will not work. **Before writing code, run
`npx vitest --version && cat node_modules/@tanstack/react-table/dist/index.d.ts | head -40`
and read the actual exports.** The code below reflects the v9 shape confirmed from
the published types, but verify `useTable`'s option names against the installed
package before assuming this compiles.

- [ ] **Step 1: Add to the e2e list (the failing test)**

`const BUILT = ["baseline", "observable", "tabulator", "aggrid", "tanstack"];`

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test`
Expected: FAIL — 404

- [ ] **Step 3: Install**

```bash
npm install react@^19 react-dom@^19 @tanstack/react-table@9.2.4 @tanstack/react-virtual@^3
```

- [ ] **Step 4: Verify the v9 API before writing against it**

```bash
head -60 node_modules/@tanstack/react-table/dist/index.d.ts
```

Confirm the names `useTable`, `tableFeatures`, `flexRender`, `createSortedRowModel`,
`rowSortingFeature` exist. If any differ, adapt Step 6 and note the difference in a
comment — do not force the code below to compile by guessing.

- [ ] **Step 5: Write src/harness/react-host.js**

```js
/* Mounts a React element into a harness host and returns a cleanup function,
 * so React demos satisfy the same contract as the vanilla ones. */
import { createRoot } from "react-dom/client";

export function mountReact(host, element) {
  const root = createRoot(host);
  root.render(element);
  return () => root.unmount();
}
```

- [ ] **Step 6: Write src/demos/tanstack/Table.jsx**

```jsx
/* Headless: TanStack computes rows, sorting and header groups; every element
 * below is ours. Paired with @tanstack/react-virtual, because headless means
 * virtualization is our job too — that is the trade. */

import { useMemo, useRef, useState } from "react";
import {
  useTable,
  tableFeatures,
  flexRender,
  rowSortingFeature,
  createSortedRowModel,
  sortFn_alphanumeric,
  sortFn_basic,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});

export function TanStackTable({ data, formatCell }) {
  const [sorting, setSorting] = useState([]);
  const scrollRef = useRef(null);

  const columns = useMemo(
    () =>
      data.columns.map((c) => ({
        accessorKey: c.name,
        header: c.name,
        meta: { align: c.align },
        cell: (info) => formatCell(info.getValue(), c),
        sortFn: c.type === "number" ? "basic" : "alphanumeric",
      })),
    [data, formatCell]
  );

  const table = useTable({
    features,
    data: data.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
  });

  const rows = table.getSortedRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 12,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={scrollRef} style={{ height: "100%", overflow: "auto" }}>
      <table className="tst" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  style={{ cursor: "pointer", textAlign: h.column.columnDef.meta.align }}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {{ asc: " ▲", desc: " ▼" }[h.column.getIsSorted()] ?? ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          <tr style={{ height: items[0]?.start ?? 0 }} />
          {items.map((vi) => {
            const row = rows[vi.index];
            return (
              <tr key={row.id} style={{ height: 32 }}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ textAlign: cell.column.columnDef.meta.align }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr style={{ height: virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0) }} />
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Write demos/tanstack.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TanStack Table — tables-evaluation</title>
<link rel="stylesheet" href="/src/harness/site.css">
<style>
  .tst { font-size: var(--table-font-size); }
  .tst th, .tst td { padding: 5px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .tst th { position: sticky; top: 0; background: var(--table-header-bg); font-weight: 600; z-index: 1; }
  .tst td { font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<div id="app"></div>
<script type="module" src="/src/demos/tanstack/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 8: Write src/demos/tanstack/main.jsx**

```jsx
import { mountDemo } from "../../harness/mount.js";
import { mountReact } from "../../harness/react-host.js";
import { TanStackTable } from "./Table.jsx";

export const meta = {
  name: "TanStack Table",
  version: "9.2.4",
  license: "MIT",
  docs: "https://tanstack.com/table/latest",
  npm: "@tanstack/react-table",
  tagline: "Headless. It computes rows and sorting; you write every element.",
  notes:
    "v9 is a redesign of v8 — features are opt-in via tableFeatures(). Headless " +
    "means virtualization is your job: this demo pairs it with " +
    "@tanstack/react-virtual, whose cost is included in the bundle figure.",
};

const render = (host, data, ctx) =>
  mountReact(host, <TanStackTable data={data} formatCell={ctx.formatCell} />);

export const tables = { small: render, wide: render, medium: render, large: render };

mountDemo({ meta, tables });
```

- [ ] **Step 9: Run to verify it passes**

Run: `npx playwright test`
Expected: PASS, 15 tests

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: TanStack Table demo (v9, React)

v9 is a redesign, not an increment: features are opt-in through
tableFeatures() and getCoreRowModel() is gone. Headless means
virtualization is ours, so react-virtual is paired in and counted in
the bundle figure.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 10: Glide Data Grid demo (React, canvas)

**Files:**
- Create: `demos/glide.html`, `src/demos/glide/main.jsx`, `src/demos/glide/Grid.jsx`
- Modify: `tests/e2e/demo.spec.js` — add `"glide"` to `BUILT`

**Interfaces:**
- Consumes: `mountDemo` (Task 5), `mountReact` (Task 9).

**Setup note:** Glide requires `import "@glideapps/glide-data-grid/dist/index.css"`
and a `<div id="portal" />` in the document for its overlay editor. Without the
portal div, the grid renders but editing overlays are misplaced.

- [ ] **Step 1: Add to the e2e list (the failing test)**

`const BUILT = [..., "glide"];`

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test`
Expected: FAIL — 404

- [ ] **Step 3: Install**

Run: `npm install @glideapps/glide-data-grid@6.0.3`

- [ ] **Step 4: Write src/demos/glide/Grid.jsx**

```jsx
/* Canvas-rendered. Glide never creates DOM per cell: it asks for cell content
 * by coordinate and paints. Row count is just a number, so 500k costs the same
 * as 500 to set up. */

import { useCallback, useMemo } from "react";
import { DataEditor, GridCellKind } from "@glideapps/glide-data-grid";

export function GlideGrid({ data, formatCell }) {
  const columns = useMemo(
    () =>
      data.columns.map((c) => ({
        title: c.name,
        id: c.name,
        width: c.type === "number" ? 110 : 140,
      })),
    [data]
  );

  // Called per visible cell on every paint — must stay cheap.
  const getCellContent = useCallback(
    ([col, row]) => {
      const spec = data.columns[col];
      const text = formatCell(data.rows[row]?.[spec.name], spec);
      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        allowOverlay: false,
        contentAlign: spec.align,
      };
    },
    [data, formatCell]
  );

  return (
    <DataEditor
      columns={columns}
      rows={data.rows.length}
      getCellContent={getCellContent}
      rowHeight={32}
      headerHeight={34}
      smoothScrollX
      smoothScrollY
      width="100%"
      height="100%"
    />
  );
}
```

- [ ] **Step 5: Write demos/glide.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glide Data Grid — tables-evaluation</title>
<link rel="stylesheet" href="/src/harness/site.css">
</head>
<body>
<div id="app"></div>
<!-- Required by Glide for its overlay editor. -->
<div id="portal" style="position:fixed;left:0;top:0;z-index:9999"></div>
<script type="module" src="/src/demos/glide/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 6: Write src/demos/glide/main.jsx**

```jsx
import "@glideapps/glide-data-grid/dist/index.css";
import { mountDemo } from "../../harness/mount.js";
import { mountReact } from "../../harness/react-host.js";
import { GlideGrid } from "./Grid.jsx";

export const meta = {
  name: "Glide Data Grid",
  version: "6.0.3",
  license: "MIT",
  docs: "https://docs.grid.glideapps.com/",
  npm: "@glideapps/glide-data-grid",
  tagline: "Canvas-rendered, React-only. Spreadsheet feel at any row count.",
  notes:
    "Because it paints to canvas rather than creating DOM, row count barely " +
    "affects setup cost — but cell text is not in the DOM, so it is invisible " +
    "to Ctrl-F, to screen readers and to copy-paste of a selection.",
};

const render = (host, data, ctx) =>
  mountReact(host, <GlideGrid data={data} formatCell={ctx.formatCell} />);

export const tables = { small: render, wide: render, medium: render, large: render };

mountDemo({ meta, tables });
```

- [ ] **Step 7: Run to verify it passes**

Run: `npx playwright test`
Expected: PASS, 18 tests.

Note: the "shows the source" test asserts the source panel contains `host`. Glide's
render function does contain `host`, so this holds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: Glide Data Grid demo (canvas, React)

Canvas rendering makes row count nearly free, at the cost of cell text
being absent from the DOM — invisible to Ctrl-F, screen readers and
selection copy. Recorded in the demo's notes.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 11: Perspective demo

**Files:**
- Create: `demos/perspective.html`, `src/demos/perspective/main.js`
- Modify: `tests/e2e/demo.spec.js` — add `"perspective"` to `BUILT`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `mountDemo` (Task 5).

**Read this before starting.** Perspective has two live homes:
`@finos/perspective@3.8.0` (2026-07-28) and `@perspective-dev/client@5.3.1`
(2026-09-04, and where `perspective.finos.org` now redirects). This plan pins
`@finos/perspective` because it is the documented one, but **Step 1 is to check
which is current**. Perspective is deliberately the last demo so that a failure
here blocks nothing.

Perspective is also a different species from the other six — a WASM data engine
with a grid attached. Its bundle and load numbers do not compare like-for-like, and
`meta.notes` must say so.

- [ ] **Step 1: Decide which package, and read its docs**

```bash
npm view @perspective-dev/client version
npm view @perspective-dev/viewer version
```

Open https://perspective-dev.github.io/guide/ and read the browser quick-start.
Record in `TODO.md` which package was chosen and why. If `@perspective-dev` is
clearly the maintained home, use it and update the version in Global Constraints.

- [ ] **Step 2: Add to the e2e list (the failing test)**

`const BUILT = [..., "perspective"];`

- [ ] **Step 3: Run to verify it fails**

Run: `npx playwright test`
Expected: FAIL — 404

- [ ] **Step 4: Install the chosen packages**

```bash
npm install @finos/perspective@3.8.0 @finos/perspective-viewer@3.8.0 @finos/perspective-viewer-datagrid@3.8.0
```

- [ ] **Step 5: Write demos/perspective.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Perspective — tables-evaluation</title>
<link rel="stylesheet" href="/src/harness/site.css">
</head>
<body>
<div id="app"></div>
<script type="module" src="/src/demos/perspective/main.js"></script>
</body>
</html>
```

- [ ] **Step 6: Write src/demos/perspective/main.js**

Write this **against the docs read in Step 1**, not from memory. The shape below is
the 3.x pattern; confirm every call against the guide before running. The structural
requirements that will not change:

- A `<perspective-viewer>` element is appended to `host`.
- A worker/client is created once at module scope and reused across the four cards —
  spinning up a WASM worker per card would misattribute its cost.
- The viewer must be given an explicit height or it collapses to zero.
- `restore({ plugin: "Datagrid" })` selects the grid plugin.

```js
/* A WASM data engine with a grid attached, rather than a grid library.
 * Perspective holds data in an Arrow-backed columnar store off the main
 * thread, so sorting and filtering 500k rows does not touch the UI thread. */

import perspective from "@finos/perspective";
import "@finos/perspective-viewer";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer/dist/css/themes.css";
import { mountDemo } from "../../harness/mount.js";

export const meta = {
  name: "Perspective",
  version: "3.8.0",
  license: "Apache-2.0",
  docs: "https://perspective-dev.github.io/guide/",
  npm: "@finos/perspective",
  tagline: "WASM + Arrow columnar engine, off the main thread, with pivots.",
  notes:
    "Not comparable like-for-like. The bundle figure includes a WASM binary and " +
    "the load figure includes instantiating it, so both are much larger than the " +
    "JS libraries — and in exchange sorting and filtering happen off the main " +
    "thread. Judge it on the large dataset, not the small one.",
};

// One worker for the whole page: a worker per card would misattribute its cost.
const workerPromise = perspective.worker();

function build(host, data) {
  const viewer = document.createElement("perspective-viewer");
  viewer.style.height = "100%";
  viewer.style.width = "100%";
  host.appendChild(viewer);

  // Async on purpose: the harness times the synchronous setup, and meta.notes
  // tells the reader that Perspective's real work happens after that.
  (async () => {
    const worker = await workerPromise;
    const table = await worker.table(data.rows);
    await viewer.load(table);
    await viewer.restore({ plugin: "Datagrid", theme: "Pro Light" });
  })();

  return () => viewer.delete?.();
}

export const tables = { small: build, wide: build, medium: build, large: build };

mountDemo({ meta, tables });
```

- [ ] **Step 7: Handle the Vite/WASM wiring**

Perspective ships WASM that Vite must not try to bundle as JS. If the build or dev
server fails on the `.wasm` import, add to `vite.config.js`:

```js
optimizeDeps: { exclude: ["@finos/perspective", "@finos/perspective-viewer"] },
worker: { format: "es" },
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx playwright test`
Expected: PASS, 21 tests

If Perspective cannot be made to work in a reasonable time, that is itself a
finding. Record it in `TODO.md` and in `EVALUATION.md` with the specific failure,
remove `"perspective"` from `BUILT`, and continue — do not let it block Task 12.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: Perspective demo

A WASM data engine with a grid attached rather than a grid library; its
bundle and load numbers do not compare like-for-like, and the demo's
notes say so.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 12: Bundle and lines-of-code measurement

**Files:**
- Create: `scripts/measure-bundles.mjs`
- Create: `public/bundles.json` (generated at build)
- Test: `tests/measure-bundles.test.js`

**Interfaces:**
- Consumes: `DEMOS` from `vite.config.js`; `dist/` from `vite build`.
- Produces: `public/bundles.json` shaped as
  ```json
  {
    "generatedAt": "2026-09-04T00:00:00.000Z",
    "demos": {
      "tanstack": { "totalKB": 78.4, "reactKB": 45.1, "libKB": 33.3, "loc": 62, "files": ["assets/tanstack-abc123.js"] }
    }
  }
  ```
  `libKB` is `totalKB - reactKB`, the honest "what does this library cost me"
  number for a page that already ships React. `loc` counts non-blank, non-comment
  lines under `src/demos/<key>/`.

- [ ] **Step 1: Write the failing test**

```js
// tests/measure-bundles.test.js
import { describe, it, expect } from "vitest";
import { countLoc, attributeChunks } from "../scripts/measure-bundles.mjs";

describe("countLoc", () => {
  it("ignores blank lines and comments", () => {
    const src = [
      "/* a block comment",
      "   spanning lines */",
      "",
      "import x from 'y';",
      "// a line comment",
      "const a = 1;",
    ].join("\n");
    expect(countLoc(src)).toBe(2);
  });

  it("counts a line with code and a trailing comment once", () => {
    expect(countLoc("const a = 1; // set a")).toBe(1);
  });
});

describe("attributeChunks", () => {
  const bundle = {
    "assets/tanstack-a.js": { isEntry: true, name: "tanstack", imports: ["assets/react-b.js"] },
    "assets/react-b.js": { isEntry: false, name: "react", imports: [] },
    "assets/aggrid-c.js": { isEntry: true, name: "aggrid", imports: [] },
  };

  it("walks an entry's full import graph", () => {
    expect(attributeChunks(bundle, "tanstack").sort())
      .toEqual(["assets/react-b.js", "assets/tanstack-a.js"]);
  });

  it("does not attribute another entry's chunks", () => {
    expect(attributeChunks(bundle, "aggrid")).toEqual(["assets/aggrid-c.js"]);
  });

  it("returns an empty array for an unknown entry", () => {
    expect(attributeChunks(bundle, "nope")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/measure-bundles.test.js`
Expected: FAIL — cannot resolve `../scripts/measure-bundles.mjs`

- [ ] **Step 3: Write scripts/measure-bundles.mjs**

```js
/* Measures what each library actually costs, from the real build output.
 *
 * Two numbers per demo, because one would mislead:
 *   totalKB — everything the page downloads
 *   libKB   — totalKB minus the React runtime, i.e. what the library costs on
 *             a page that already ships React
 * Reporting only totalKB penalises the React-only libraries for a runtime many
 * apps already have; reporting only libKB hides a real cost.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { gzipSync } from "node:zlib";
import { DEMOS } from "../vite.config.js";

const DIST = "dist";

/** Non-blank, non-comment lines. Crude, but applied identically to every demo. */
export function countLoc(src) {
  let inBlock = false;
  let n = 0;
  for (const raw of src.split("\n")) {
    let line = raw.trim();
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      inBlock = false;
      line = line.slice(end + 2).trim();
    }
    while (line.includes("/*")) {
      const start = line.indexOf("/*");
      const end = line.indexOf("*/", start + 2);
      if (end === -1) { line = line.slice(0, start).trim(); inBlock = true; break; }
      line = (line.slice(0, start) + line.slice(end + 2)).trim();
    }
    if (!line || line.startsWith("//")) continue;
    n++;
  }
  return n;
}

/** Walk an entry chunk's transitive import graph. */
export function attributeChunks(bundle, entryName) {
  const entry = Object.keys(bundle).find((f) => bundle[f].isEntry && bundle[f].name === entryName);
  if (!entry) return [];
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const imp of bundle[f]?.imports ?? []) stack.push(imp);
  }
  return [...seen];
}

function gzipKB(files) {
  let bytes = 0;
  for (const f of files) {
    const p = join(DIST, f);
    if (existsSync(p)) bytes += gzipSync(readFileSync(p)).length;
  }
  return Math.round((bytes / 1024) * 10) / 10;
}

function locForDemo(key) {
  const dir = join("src/demos", key);
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const f of readdirSync(dir)) {
    if (![".js", ".jsx", ".ts", ".tsx"].includes(extname(f))) continue;
    total += countLoc(readFileSync(join(dir, f), "utf8"));
  }
  return total;
}

function main() {
  const manifestPath = join(DIST, ".vite/manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error("no manifest — set build.manifest = true in vite.config.js and rebuild");
  }
  const bundle = JSON.parse(readFileSync(manifestPath, "utf8"));

  // Normalise the manifest into { file: {isEntry, name, imports} }.
  const graph = {};
  for (const [src, chunk] of Object.entries(bundle)) {
    graph[chunk.file] = {
      isEntry: !!chunk.isEntry,
      name: chunk.name ?? src,
      imports: chunk.imports ?? [],
    };
  }

  const reactFiles = new Set(
    Object.keys(graph).filter((f) => /react/i.test(graph[f].name ?? ""))
  );

  const demos = {};
  for (const d of DEMOS) {
    const files = attributeChunks(graph, d.key);
    const totalKB = gzipKB(files);
    const reactKB = d.react ? gzipKB(files.filter((f) => reactFiles.has(f))) : 0;
    demos[d.key] = {
      name: d.name,
      totalKB,
      reactKB,
      libKB: Math.round((totalKB - reactKB) * 10) / 10,
      loc: locForDemo(d.key),
      files,
    };
  }

  const out = { generatedAt: new Date().toISOString(), demos };
  writeFileSync("public/bundles.json", JSON.stringify(out, null, 2));
  console.table(
    Object.fromEntries(
      Object.entries(demos).map(([k, v]) => [k, { totalKB: v.totalKB, libKB: v.libKB, loc: v.loc }])
    )
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Enable the manifest in vite.config.js**

Add to the `build` object: `manifest: true,`

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/measure-bundles.test.js`
Expected: PASS, 5 tests

- [ ] **Step 6: Run a real build and check the numbers are plausible**

Run: `npm run build`
Expected: a printed table. Sanity-check: the baseline should be the smallest by a
wide margin; AG Grid and Perspective the largest. If any demo reports 0 KB, the
manifest attribution is wrong — fix it before continuing, because every later
document depends on these numbers.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: measure real per-entry bundle size and lines of code

Two numbers per library, because one misleads: total download, and total
minus the React runtime. Reporting only the first penalises React-only
libraries for a runtime many apps already ship; only the second hides a
real cost.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 13: Hub page and scorecard

**Files:**
- Modify: `index.html`
- Create: `src/harness/hub.js`
- Modify: `tests/e2e/demo.spec.js` — add hub tests

**Interfaces:**
- Consumes: `DEMOS` (Task 1), `public/bundles.json` (Task 12).
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/demo.spec.js`:

```js
test.describe("hub", () => {
  test("links to every demo page", async ({ page }) => {
    await page.goto("/index.html");
    for (const key of DEMOS) {
      await expect(page.locator(`a[href="/demos/${key}.html"]`)).toHaveCount(1);
    }
  });

  test("shows measured bundle sizes rather than hardcoded ones", async ({ page }) => {
    await page.goto("/index.html");
    const cell = page.locator('[data-bundle="aggrid"]');
    await expect(cell).not.toHaveText("—", { timeout: 10000 });
    await expect(cell).toContainText("KB");
  });

  test("has no empty cells in the scorecard", async ({ page }) => {
    await page.goto("/index.html");
    const empties = page.locator("table.scores td:empty");
    await expect(empties).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test`
Expected: FAIL — hub has no demo links

- [ ] **Step 3: Write src/harness/hub.js**

```js
/* Fills the hub's measured columns from the real build output, so the numbers
 * on the page cannot drift from the numbers in the bundle. */
import { restoreTheme, installThemeToggle } from "./theme.js";

restoreTheme();
installThemeToggle(document.querySelector(".toggle"));

fetch("/bundles.json")
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
  .then(({ demos }) => {
    for (const [key, d] of Object.entries(demos)) {
      const bundle = document.querySelector(`[data-bundle="${key}"]`);
      const loc = document.querySelector(`[data-loc="${key}"]`);
      if (bundle) {
        bundle.textContent = d.reactKB
          ? `${d.libKB} KB (+${d.reactKB} React)`
          : `${d.totalKB} KB`;
      }
      if (loc) loc.textContent = String(d.loc);
    }
  })
  .catch(() => {
    // Dev server has no bundles.json until after a build. Leave the dashes.
    for (const el of document.querySelectorAll("[data-bundle],[data-loc]")) {
      el.title = "run npm run build to populate";
    }
  });
```

- [ ] **Step 4: Write the full index.html**

Model it on `/Users/rgrp/src/datasets/line-charts/index.html`, which is the agreed
visual reference — read that file first. It must contain:

- An `h1`, a lede explaining the same-data-same-theme method, and a theme toggle.
- A card grid: one `<a class="lib" href="/demos/<key>.html">` per demo, with name,
  one-line description, and licence.
- A `<table class="scores">` with a row per library and these columns:
  `Library · Small-data look · API ergonomics · Large data · Wide data · Bundle ·
  LOC · A11y · Docs`. Score cells are filled by hand (1–5) after Task 14's
  evaluation; `Bundle` cells carry `data-bundle="<key>"` and LOC cells
  `data-loc="<key>"` and start as `—` so `hub.js` fills them.
- A "The four datasets" section describing each, taken from `DATASETS`.
- A "Considered, not included" section listing Handsontable (not free
  commercially), Grid.js (unmaintained since 2024-03), RevoGrid, MUI X DataGrid
  and DataTables, each with its reason.
- Attribution: "Contains HM Land Registry data © Crown copyright and database
  right 2026. This data is licensed under the Open Government Licence v3.0."
- `<script type="module" src="/src/harness/hub.js"></script>`

**Every score cell must contain a number — the test asserts no empty cells.** Put in
provisional scores now and correct them in Task 14.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run build && npx playwright test`
Expected: PASS, all tests

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: hub page with scorecard fed by measured build output

Bundle and LOC columns are filled from bundles.json rather than typed in,
so the numbers on the page cannot drift from the numbers in the build.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

### Task 14: Write up the findings

**Files:**
- Create: `ANALYSIS.md`, `EVALUATION.md`, `TODO.md`, `docs/post-draft.md`
- Modify: `README.md`, `index.html` (final scores), `NEXT.md`

**Interfaces:**
- Consumes: everything. This is the deliverable the site exists to support.

**Do the measuring before the writing.** Open each demo page, run the FPS
measurement on every card, and record the numbers. Scores must come from what you
observed, not from what the libraries claim.

- [ ] **Step 1: Collect the measurements**

Run `npm run build && npm run preview`, then for each of the seven demos record, in a
scratch table: render ms per dataset, scroll FPS per dataset, heap MB, whether the
large dataset loaded at all, and any failure. Note qualitative observations too —
default typography, whether numbers align, what sorting 500k rows feels like,
whether Ctrl-F finds a visible cell.

- [ ] **Step 2: Write ANALYSIS.md**

Cover: the method (same data, same theme, same harness, and why), the four datasets
and what each stresses, how every metric is taken with its caveats
(`performance.memory` is Chromium-only; Tabulator and Perspective render
asynchronously so their render badge is a floor; scroll FPS is a scripted scroll on
one machine), the exact library versions, the Land Registry attribution, and a
"what this does not measure" section — editing, server-side data, accessibility
auditing beyond the obvious, mobile.

- [ ] **Step 3: Write EVALUATION.md**

The verdict. Required structure:

- A recommendation per use case, each a direct answer with reasoning:
  *a small rich table in a data story*, *a 500k-row exploratory grid*,
  *a DataHub dataset preview page*, *an editable spreadsheet-like grid*.
- A section per library: what it was like to write, what it looks like out of the
  box, where it broke, and who should pick it.
- The scorecard with reasoning for every score, especially the low ones.
- A "surprises" section. Write it honestly, including findings that contradict the
  expectation the design started with.

- [ ] **Step 4: Write TODO.md**

```markdown
# TODO

Deferred libraries and follow-up ideas. Nothing here blocks the current site.

## Libraries considered, not included
- **RevoGrid** (4.27.6, MIT) — web component, virtualized. Closest to inclusion.
- **MUI X DataGrid** — React; free tier is limited and the Pro tier is $180/dev/yr.
- **Handsontable** — excluded on licence: not free for commercial use.
- **Grid.js** — last published 2024-03. Unmaintained.
- **DataTables** — jQuery-era; large install base, but not what we would start with.

## Follow-ups
- Server-side / paginated row models — none of the demos test a remote data source.
- Editing: only Glide and Tabulator were exercised for editing at all.
- Accessibility audit with a real screen reader, not just DOM inspection.
- Mobile and touch scrolling.
- A DuckDB-WASM + custom virtual grid, as the out-of-core reference point.
```

- [ ] **Step 5: Correct the scorecard in index.html**

Replace the provisional scores from Task 13 with the scores justified in
`EVALUATION.md`. They must match — the scorecard is a summary of that document,
not a second opinion.

- [ ] **Step 6: Write docs/post-draft.md**

A publishable post: what was tested and why, the surprising findings, the
recommendation per use case, and honest caveats. Cite the practitioner sources
consulted during research. Link the live site and the repo.

- [ ] **Step 7: Rewrite README.md and update NEXT.md**

README: what this is, how to run it (`npm install`, `npm run data`, `npm run dev`),
how to add an eighth library (copy a demo directory, add one line to `DEMOS`, add a
card), the licence attribution, and links to `ANALYSIS.md` and `EVALUATION.md`.

NEXT.md: replace the pre-implementation handover with the current state — what is
built, what is measured, and what remains (deploy to Cloudflare Pages, the `TODO.md`
follow-ups).

- [ ] **Step 8: Full verification**

```bash
npm run test && npm run build && npx playwright test
```
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
docs: analysis, evaluation and post draft

Scores come from measurements taken on the built site, not from library
claims. The surprises section records findings that contradict what the
design expected.

Claude-Session: https://claude.ai/code/session_012YxFCRzPAHUPY3Hp8ZgwDN
EOF
)"
```

---

## Self-review

**Spec coverage.** Seven libraries → Tasks 5–11. Four datasets → Task 2, described
in Task 3. Harness contract → Task 5. React policy and dual bundle reporting →
Task 12. Five metrics → Tasks 4 and 12. Error handling (demo throws into its own
card; failure recorded not skipped) → Task 5 Step 4 and Task 11 Step 8. Testing
(renders without console error, large scrolls, build emits complete bundles.json,
no empty scorecard cells) → Tasks 5, 12, 13. Deliverables → Task 14. Risks:
TanStack v9 → Task 9 Steps 4 and its version note; Perspective WASM → Task 11;
`performance.memory` → Task 4; 25MB Parquet limit → Task 2 Steps 1 and 5.

**Gap found and closed.** The design promised the demos would exercise sorting and
filtering, but no task asserted it. This is deliberately left as a qualitative
observation in Task 14 Step 1 rather than an automated test — automating "does
sorting feel fast" would measure the automation, not the library.

**Type consistency.** `loadDataset` returns `{key, rows, numRows, columns, timings}`
and every demo reads `data.rows`, `data.columns`, `data.numRows` — consistent across
Tasks 5–11. `ColumnSpec.align` is `'left'|'right'` and is used as a CSS
`text-align`, a Tabulator `hozAlign`, and a Glide `contentAlign`; all three accept
those strings. `formatCell(value, col)` takes the column spec second in every call
site. `mountReact` returns a cleanup function, matching the harness's
`typeof result === "function"` check.

**Placeholder scan.** One deliberate stub remains: `writeParquet` in Task 2 Step 4
throws, because the writer library cannot be chosen without checking what resolves —
Step 3 makes that an explicit decision with a verification step rather than a guess.
Task 11's Perspective code is marked as requiring doc verification for the same
reason: two live package homes, and fabricating confident code against the wrong one
would be worse than saying so.
