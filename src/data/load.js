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
  // Cache the promise, but only while it can still succeed. Keeping a rejected
  // one would make a transient network failure permanent for the life of the
  // page, so the demo card's Retry button could never work.
  p.catch(() => { if (cache.get(key) === p) cache.delete(key); });
  cache.set(key, p);
  return p;
}
