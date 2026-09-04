import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "node:fs";
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
