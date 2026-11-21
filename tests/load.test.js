import { describe, it, expect } from "vitest";
import { DATASETS } from "../src/data/datasets.js";
import { inferColumns, formatCell, arrangeColumns } from "../src/data/load.js";

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

describe("arrangeColumns", () => {
  const cols = (...names) => names.map((name) => ({ name, type: "string", align: "left" }));

  it("puts the human columns first, the GUID last, and labels every column", () => {
    const out = arrangeColumns(cols("id", "price", "date", "postcode", "propertyType", "street", "town"));
    expect(out.map((c) => c.name)).toEqual(["date", "price", "propertyType", "town", "street", "postcode", "id"]);
    expect(out.map((c) => c.label)).toEqual(["Date", "Price", "Property type", "Town", "Street", "Postcode", "Transaction ID"]);
  });

  it("keeps unknown columns in their own order, after the known ones and before id", () => {
    const out = arrangeColumns(cols("id", "price", "metric_02", "metric_01"));
    expect(out.map((c) => c.name)).toEqual(["price", "metric_02", "metric_01", "id"]);
    expect(out[1].label).toBe("Metric 02");
  });

  it("keeps the inferred type and alignment", () => {
    const [c] = arrangeColumns([{ name: "price", type: "number", align: "right" }]);
    expect(c).toEqual({ name: "price", label: "Price", type: "number", align: "right" });
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
