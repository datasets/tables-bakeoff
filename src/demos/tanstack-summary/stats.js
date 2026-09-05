/** Per-column summary stats computed from a full row set — min/max/mean and a
 *  coarse histogram for numeric columns, distinct/null counts for the rest.
 *  Deliberately simple: this is a spike showing the shape of the idea
 *  (summary-at-top + fast client-side filter), not a statistics library. */
export function summarize(columns, rows) {
  return columns.map((col) => {
    const values = rows.map((r) => r[col.name]);
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
    const nullCount = values.length - nonNull.length;

    if (col.type === "number") {
      const nums = nonNull.map(Number);
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const mean = nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
      const buckets = histogram(nums, min, max, 12);
      return { ...col, nullCount, min, max, mean, buckets };
    }

    return { ...col, nullCount, distinct: new Set(nonNull).size };
  });
}

function histogram(nums, min, max, buckets) {
  const counts = new Array(buckets).fill(0);
  const span = max - min || 1;
  for (const n of nums) {
    const idx = Math.min(buckets - 1, Math.floor(((n - min) / span) * buckets));
    counts[idx]++;
  }
  const peak = Math.max(...counts, 1);
  return counts.map((c) => c / peak); // normalised 0-1 for bar heights
}

/** Global filter: a row matches if any cell's string form contains the query,
 *  case-insensitively. Simple on purpose — this is the "querying within the
 *  table" half of the spike, not a query language. */
export function filterRows(rows, columns, query) {
  if (!query.trim()) return rows;
  const q = query.trim().toLowerCase();
  return rows.filter((row) =>
    columns.some((col) => String(row[col.name] ?? "").toLowerCase().includes(q))
  );
}
