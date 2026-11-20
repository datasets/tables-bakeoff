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

/** Display order and header label for every Land Registry column. Shared, like
 *  the formatter, so all nine tables lead with the same human columns: the
 *  address and the sale first, codes and the transaction GUID last. `id` stays
 *  in the table because it is real data; it is just not what a reader wants in
 *  the first column. */
export const COLUMN_LABELS = {
  street: "Street",
  town: "Town",
  price: "Price",
  date: "Date",
  propertyType: "Property type",
  oldNew: "New build",
  duration: "Tenure",
  postcode: "Postcode",
  paon: "House",
  saon: "Flat",
  locality: "Locality",
  district: "District",
  county: "County",
  ppdCategory: "Category",
  recordStatus: "Status",
  id: "Transaction ID",
};
const COLUMN_ORDER = Object.keys(COLUMN_LABELS);

/** Order columns as COLUMN_LABELS lists them and give each a `label`. Columns
 *  not in the list (the wide set's metric_01..metric_64) keep their own order
 *  after the known ones, and `id` always goes last. */
export function arrangeColumns(columns) {
  const rank = (c) => {
    if (c.name === "id") return Number.MAX_SAFE_INTEGER;
    const i = COLUMN_ORDER.indexOf(c.name);
    return i === -1 ? COLUMN_ORDER.length : i;
  };
  return columns
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
    .map(({ c }) => ({ ...c, label: COLUMN_LABELS[c.name] ?? humanize(c.name) }));
}

/** metric_01 -> "Metric 01". */
function humanize(name) {
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
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
      columns: arrangeColumns(inferColumns(rows)),
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
