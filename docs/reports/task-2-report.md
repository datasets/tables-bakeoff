# Task 2 report: prepare the four datasets as Parquet

Status: **DONE**

## Outputs

Source: HM Land Registry `pp-2024.csv`, 162,267,126 bytes, **930,559** rows, no header,
every field quoted. Cached at `data-cache/pp-2024.csv` (gitignored).

| File | Rows | Cols | Size on disk |
| --- | ---: | ---: | ---: |
| `public/data/small.parquet` | 1,000 | 16 | 60,311 B (0.06 MB) |
| `public/data/wide.parquet` | 1,000 | 80 | 392,325 B (0.39 MB) |
| `public/data/medium.parquet` | 50,000 | 16 | 1,947,412 B (1.95 MB) |
| `public/data/large.parquet` | 500,000 | 16 | 17,426,537 B (17.43 MB) |

`large.parquet` is 17.4 MB, comfortably under the 25 MB repo limit, so **the large row
count stayed at 500,000** — no reduction to 300,000 was needed. Later documentation
should quote **500,000**.

## Exact column names written

Task 3 infers types from these, so here is the exact list, in file order.

`small`, `medium`, `large` (16 columns):

```
id, price, date, postcode, propertyType, oldNew, duration, paon, saon,
street, locality, town, district, county, ppdCategory, recordStatus
```

`wide` (80 columns): the same 16 above, in the same order, followed by 64 derived
columns named `metric_01` through `metric_64` (two-digit zero-padded).

### Physical types, verified by reading the files back

| Column(s) | Parquet type |
| --- | --- |
| `price` | `INT32` (REQUIRED) |
| `metric_01` … `metric_64` | `DOUBLE` (REQUIRED) |
| all 14 other columns | `BYTE_ARRAY` / converted `UTF8` (REQUIRED) |

Verified: the 16 shared columns have **identical names and identical physical types in
all four files**, so Task 3 can infer one type map and apply it everywhere.

Sample first row of `small.parquet`, which matches the first source line exactly:

```json
{"id":"2131FCF5-B031-86E8-E063-4804A8C0372B","price":320000,"date":"2024-07-26",
 "postcode":"MK40 3SG","propertyType":"Terraced","oldNew":"Existing",
 "duration":"Freehold","paon":"38","saon":"","street":"GEORGE STREET","locality":"",
 "town":"BEDFORD","district":"BEDFORD","county":"BEDFORD","ppdCategory":"A",
 "recordStatus":"A"}
```

Code expansion works as specified: `T` → `Terraced`, `N` → `Existing`, `F` → `Freehold`,
GUID braces stripped, timestamp truncated to `YYYY-MM-DD`.

## Test command and output

```
$ npx vitest run tests/prepare-data.test.js

 RUN  v3.2.7 /Users/rgrp/src/datasets/tables-evaluation

 ✓ tests/prepare-data.test.js (6 tests) 6ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  21:06:11
   Duration  169ms (transform 11ms, setup 0ms, collect 12ms, tests 6ms, environment 0ms, prepare 36ms)
```

Before the data existed the same command failed 6/6 with
`public/data/small.parquet missing — run npm run data`, as Step 2 required.

`asyncBufferFromFile` resolved from `hyparquet` under vitest with no shim, exactly as
Ruling C said it would.

## Peak memory observed

Measured with `/usr/bin/time -l npm run data` on a warm cache.

```
parsed 930,559 source rows
wrote public/data/small.parquet  (rss  572MB)
wrote public/data/wide.parquet   (rss  575MB)
wrote public/data/medium.parquet (rss  505MB)
wrote public/data/large.parquet  (rss 1320MB)
        3.37 real   3.70 user   0.73 sys
  1320173568  maximum resident set size
```

Peak RSS **1.32 GB**, whole run **3.4 s** (excluding the one-off download, which took
well under a minute).

Reading of that: the ~930k-element lines array plus its strings is the ~500 MB floor
that persists for the whole run. The extra ~750 MB during the `large` write is one
buffered row group (the writer's default `rowGroupSize` is `[1000, 100000]`, so 100,000
row objects plus their transposed column copies) and GC lag behind it — **not** the
500,000-row output, which is never held. That ratio is the evidence for Ruling B: at
~750 MB per 100k materialised rows, the brief's `lines.map(toRow)` over all 930,559
source rows would have wanted roughly 7 GB and hard-crashed Node before any file was
written. The generator keeps peak memory a function of the row group, so the 500k file
costs no more than the 50k one.

## Deviations from the brief and from the rulings

1. **Writer choice (Ruling A, followed).** Installed `hyparquet-writer@0.16.9`, no
   empirical bake-off. Note for the record: the package publishes **no `./node`
   subpath**; its `exports` map has only `"."` with `browser` and `default`
   conditions, and the `default` condition resolves to `src/node.js`. So
   `fileWriter` and `parquetWriteFile` are imported from the **bare specifier**
   `"hyparquet-writer"` in Node, not from `"hyparquet-writer/node"` — the latter
   throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. Everything else in the ruling held.
   Its only dependency is `hyparquet@1.29.2`, the exact version already installed,
   so no duplicate reader landed in the tree.

2. **Step 3's throwaway round-trip was done** before writing the real script: 2,500
   rows from a generator, over three row groups, written with `fileWriter` and read
   back with `parquetMetadataAsync` / `parquetReadObjects`. Names, order, row count
   and values all survived.

3. **`take(n)` became a generator, per Ruling B.** `sample(lines, n, transform)` is a
   generator function that parses one line at a time from the strided line indices and
   yields one row. `parquetWriteRows` pulls it a row group at a time. No dataset is ever
   fully materialised. The `node:readline` two-pass fallback was not needed — the lines
   array alone was affordable.

4. **The stride is fractional, not floored — a deliberate fix to a real bug in the
   brief.** The brief computes `stride = Math.floor(all.length / n)` and takes
   `all[i * stride]`. For `large`, `n = 500,000` against 930,559 source rows gives
   `stride = 1`, so the brief's sample would have been *the first 500,000 rows of the
   file* — the opposite of its own stated intent that "the sample spans the whole
   year". I use `lines[Math.round(i * total / n)]` instead. This is identical to the
   brief wherever the brief works (for `n = 1000`, both yield indices `0, 930, 1860, …`)
   and correct where it does not. Still fully deterministic, so reruns reproduce
   byte-for-byte. Verified on the output: `large.parquet` covers **all twelve months of
   2024**, 30,530–51,331 rows per month.

5. **Types are inferred, per Ruling A — but I verified the inference is safe first.**
   `schemaFromColumnData` auto-detects from only the **first 1,000 values**, and that
   schema is then applied to every later row group. For a 500,000-row file that is a
   silent-corruption risk: an integer column inferred `INT32` from the first group would
   overflow on a later large value. So before relying on it I scanned the whole source
   for the maximum `price`: **180,000,000**, an order of magnitude inside `INT32`'s
   2,147,483,647. Every other column is a string. Inference is therefore safe here, and
   the reason is recorded in the file header comment rather than left implicit.

6. **`METRIC_COLUMNS` is now a named constant** shared between `widen()` and the column
   list handed to the writer, because `parquetWriteRows` requires an explicit `columns`
   array and the two lists must not be able to drift. The generated values are
   unchanged from the brief's formula (`metric_NN = round(price/1000 * sin(i+n) * 100)/100`
   for n = 1…64).

7. **Minor:** added `mkdirSync(OUT_DIR, { recursive: true })`, dropped the unused
   `readFileSync` import from the test, and had `writeParquet` log RSS after each file
   so the memory claim above is reproducible rather than asserted.

Nothing else in the brief changed. No table libraries were added; `hyparquet-writer` is
the only new dependency.

## Files touched

- `scripts/prepare-data.mjs` (new)
- `tests/prepare-data.test.js` (new)
- `public/data/{small,wide,medium,large}.parquet` (new, generated, committed)
- `package.json` / `package-lock.json` (`hyparquet-writer@0.16.9`)
