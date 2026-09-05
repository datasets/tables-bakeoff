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

/* The bug most likely to silently produce wrong headline numbers. With two React
 * demos in the build, Rollup hoists React into a chunk both entries import; if
 * the walk attributes it to neither (or only one) both React demos are
 * understated by the whole React runtime and nothing in the build fails. */
describe("attributeChunks with a shared runtime chunk", () => {
  const shared = {
    "assets/tanstack-a.js": { isEntry: true, name: "tanstack", imports: ["assets/shared-r.js"] },
    "assets/glide-b.js": { isEntry: true, name: "glide", imports: ["assets/shared-r.js"] },
    "assets/shared-r.js": { isEntry: false, name: "index", imports: ["assets/deep-d.js"] },
    "assets/deep-d.js": { isEntry: false, name: "deep", imports: [] },
  };

  it("attributes the shared chunk to BOTH entries that import it", () => {
    expect(attributeChunks(shared, "tanstack")).toContain("assets/shared-r.js");
    expect(attributeChunks(shared, "glide")).toContain("assets/shared-r.js");
  });

  it("follows the shared chunk's own imports transitively", () => {
    expect(attributeChunks(shared, "tanstack").sort()).toEqual([
      "assets/deep-d.js",
      "assets/shared-r.js",
      "assets/tanstack-a.js",
    ]);
  });

  it("never lists a chunk twice within one entry's total", () => {
    const diamond = {
      "assets/e.js": { isEntry: true, name: "e", imports: ["assets/l.js", "assets/r.js"] },
      "assets/l.js": { isEntry: false, name: "l", imports: ["assets/shared.js"] },
      "assets/r.js": { isEntry: false, name: "r", imports: ["assets/shared.js"] },
      "assets/shared.js": { isEntry: false, name: "shared", imports: [] },
    };
    const files = attributeChunks(diamond, "e");
    expect(files.length).toBe(new Set(files).size);
    expect(files.sort()).toEqual(["assets/e.js", "assets/l.js", "assets/r.js", "assets/shared.js"]);
  });

  it("terminates on a cycle back to the entry", () => {
    // Vite's manifest really does this: a dynamic chunk lists its parent entry.
    const cyclic = {
      "entry": { isEntry: true, name: "glide", imports: ["lazy"] },
      "lazy": { isEntry: false, name: "lazy", imports: ["entry"] },
    };
    expect(attributeChunks(cyclic, "glide").sort()).toEqual(["entry", "lazy"]);
  });
});

describe("attributeChunks and dynamic imports", () => {
  const g = {
    "entry": { isEntry: true, name: "glide", imports: ["static"], dynamicImports: ["lazy"] },
    "static": { isEntry: false, name: "static", imports: [] },
    "lazy": { isEntry: false, name: "lazy", imports: ["deep"] },
    "deep": { isEntry: false, name: "deep", imports: [] },
  };

  it("excludes lazily imported chunks by default — they are not part of first load", () => {
    expect(attributeChunks(g, "glide").sort()).toEqual(["entry", "static"]);
  });

  it("includes them, transitively, when asked", () => {
    expect(attributeChunks(g, "glide", { dynamic: true }).sort())
      .toEqual(["deep", "entry", "lazy", "static"]);
  });
});
