import { describe, it, expect } from "vitest";
import { ENTRIES, VERDICTS } from "../src/harness/results.js";
import { SNIPPETS } from "../src/harness/snippets.js";
import { DEMOS } from "../vite.config.js";

const keys = DEMOS.map((d) => d.key);

describe("VERDICTS (the top of each library page)", () => {
  it("has one per entry, with a role, a line and both cases", () => {
    for (const d of ENTRIES) {
      const v = VERDICTS[d.key];
      expect(v, d.key).toBeTruthy();
      expect(v.role.length, d.key).toBeGreaterThan(0);
      expect(v.line.length, d.key).toBeGreaterThan(0);
      expect(v.use.length, d.key).toBeGreaterThan(0);
      expect(v.skip.length, d.key).toBeGreaterThan(0);
    }
    expect(Object.keys(VERDICTS).sort()).toEqual(ENTRIES.map((d) => d.key).sort());
  });

  it("is written plainly: no dashes as punctuation, no curly quotes", () => {
    for (const [key, v] of Object.entries(VERDICTS)) {
      const text = [v.role, v.line, ...v.use, ...v.skip].join("\n");
      expect(text, key).not.toMatch(/[—–]/);
      expect(text, key).not.toMatch(/[“”‘’]/);
    }
  });
});

describe("SNIPPETS (the Get started block)", () => {
  it("uses demo keys and the agreed shape", () => {
    for (const [key, s] of Object.entries(SNIPPETS)) {
      expect(keys, key).toContain(key);
      expect(s.install === null || typeof s.install === "string", key).toBe(true);
      expect(typeof s.code, key).toBe("string");
      expect(s.code.trim().length, key).toBeGreaterThan(0);
      expect(["js", "jsx", "html"], key).toContain(s.lang);
    }
  });
});
