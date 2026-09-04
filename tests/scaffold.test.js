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
