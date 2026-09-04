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
