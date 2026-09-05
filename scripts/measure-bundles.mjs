/* Measures what each library actually costs, from the real build output.
 *
 * Two headline numbers per demo, because one would mislead:
 *   totalKB — the JS + CSS a demo page downloads on first load
 *   libKB   — totalKB minus the React runtime, i.e. what the library costs on
 *             a page that already ships React
 * Reporting only totalKB penalises the React-only libraries for a runtime many
 * apps already have; reporting only libKB hides a real cost.
 *
 * Three things the naive version of this script gets wrong, all of them
 * silently:
 *
 * 1. Shared chunks. Rollup hoists React into one chunk that both React demos
 *    import. Measuring only the entry chunk understates BOTH of them by the
 *    whole React runtime and nothing fails. Vite's manifest expresses imports
 *    as manifest KEYS ("_react-abc.js"), not output paths ("assets/react-abc.js"),
 *    so a walk that mixes the two namespaces looks up a key that is not there,
 *    finds no file on disk, and adds zero bytes without complaint. This script
 *    walks in the key namespace and converts to output paths only at the end.
 *
 * 2. WebAssembly is not comparable to JavaScript. Perspective ships ~3.9 MB of
 *    compiled Rust that gzip barely touches. Summed into one "bundle" column
 *    beside six JS libraries it would dominate every average and mean nothing,
 *    so it is reported as its own labelled figure and left out of totalKB.
 *
 * 3. CSS is not free. Perspective, Tabulator and Glide all ship stylesheets a
 *    real page must download. They are counted in totalKB and reported
 *    separately, so a reader can see the split rather than a JS-only figure
 *    that flatters the libraries with heavy themes.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { gzipSync } from "node:zlib";
import { DEMOS } from "../vite.config.js";

const DIST = "dist";
const OUT = "public/bundles.json";

/** Non-blank, non-comment lines. Crude, but applied identically to every demo. */
export function countLoc(src) {
  let inBlock = false;
  let n = 0;
  for (const raw of src.split("\n")) {
    let line = raw.trim();
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      inBlock = false;
      line = line.slice(end + 2).trim();
    }
    while (line.includes("/*")) {
      const start = line.indexOf("/*");
      const end = line.indexOf("*/", start + 2);
      if (end === -1) { line = line.slice(0, start).trim(); inBlock = true; break; }
      line = (line.slice(0, start) + line.slice(end + 2)).trim();
    }
    if (!line || line.startsWith("//")) continue;
    n++;
  }
  return n;
}

/** Walk an entry chunk's transitive import graph.
 *
 * Returns keys in whatever namespace `bundle` and its `imports` arrays use, so
 * the caller decides how to resolve them to files. The Set both de-duplicates a
 * chunk reached by two paths (a diamond must not be counted twice in one demo's
 * total) and terminates the cycles Vite's manifest really contains — a lazily
 * loaded chunk lists its own parent entry among its imports.
 *
 * `dynamic` follows dynamicImports as well. Off by default: a lazily loaded
 * chunk is a real cost but not a first-load one, so it is measured apart.
 */
export function attributeChunks(bundle, entryName, { dynamic = false } = {}) {
  const entry = Object.keys(bundle).find((f) => bundle[f].isEntry && bundle[f].name === entryName);
  if (!entry) return [];
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const node = bundle[f];
    if (!node) continue;
    for (const imp of node.imports ?? []) stack.push(imp);
    if (dynamic) for (const imp of node.dynamicImports ?? []) stack.push(imp);
  }
  return [...seen];
}

/* 1 kB = 1000 bytes, and gzip at node's default level: both are what Vite's own
 * build reporter uses, so every figure here can be checked against a line of
 * the build log rather than taken on trust. Rounding happens once, at the end —
 * summing already-rounded parts drifts by a kB or two across seven demos. */
const kb = (bytes) => Math.round(bytes / 100) / 10;

function bytesOf(files) {
  let raw = 0;
  let gz = 0;
  for (const f of files) {
    const p = join(DIST, f);
    if (!existsSync(p)) throw new Error(
      `manifest names ${f} but dist has no such file — chunk attribution is ` +
      `resolving into the wrong namespace and every number below it is understated`
    );
    const buf = readFileSync(p);
    raw += buf.length;
    gz += gzipSync(buf).length;
  }
  return { raw, gz };
}

const sizes = (files) => {
  const b = bytesOf(files);
  return { rawKB: kb(b.raw), gzipKB: kb(b.gz) };
};

function locForDemo(key) {
  const dir = join("src/demos", key);
  if (!existsSync(dir)) return 0;
  let total = 0;
  // Demos are not all one file — the React ones split out a component — so
  // every source file in the directory counts, or they look cheaper than they are.
  for (const f of readdirSync(dir)) {
    if (![".js", ".jsx", ".ts", ".tsx"].includes(extname(f))) continue;
    total += countLoc(readFileSync(join(dir, f), "utf8"));
  }
  return total;
}

/** Vite manifest -> { key: {isEntry, name, file, imports, dynamicImports, css, assets} }. */
function buildGraph(manifest) {
  const graph = {};
  for (const [key, chunk] of Object.entries(manifest)) {
    graph[key] = {
      isEntry: !!chunk.isEntry,
      name: chunk.name ?? key,
      file: chunk.file,
      imports: chunk.imports ?? [],
      dynamicImports: chunk.dynamicImports ?? [],
      css: chunk.css ?? [],
      assets: chunk.assets ?? [],
    };
  }
  return graph;
}

const uniq = (xs) => [...new Set(xs)];

function main() {
  const manifestPath = join(DIST, ".vite/manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error("no manifest — set build.manifest = true in vite.config.js and rebuild");
  }
  const graph = buildGraph(JSON.parse(readFileSync(manifestPath, "utf8")));

  const measured = DEMOS.map((d) => {
    const staticKeys = attributeChunks(graph, d.key);
    if (!staticKeys.length) {
      throw new Error(`no chunks attributed to ${d.key} — is demos/${d.key}.html an entry?`);
    }
    const withLazy = attributeChunks(graph, d.key, { dynamic: true });
    const lazyKeys = withLazy.filter((k) => !staticKeys.includes(k));

    const js = uniq(staticKeys.map((k) => graph[k].file).filter(Boolean));
    const css = uniq(staticKeys.flatMap((k) => graph[k].css));
    const attached = uniq(staticKeys.flatMap((k) => graph[k].assets));
    const wasm = attached.filter((f) => f.endsWith(".wasm"));
    // Non-WASM attached assets (fonts, images) are ordinary page weight.
    const other = attached.filter((f) => !f.endsWith(".wasm"));
    const lazy = uniq(lazyKeys.map((k) => graph[k].file).filter(Boolean));

    // React is its own named chunk by construction (see manualChunks in
    // vite.config.js), so this is a lookup rather than a guess at a filename.
    const reactKeys = staticKeys.filter((k) => graph[k].name === "react");

    return { d, staticKeys, js, css, wasm, other, lazy, reactKeys };
  });

  // Every demo loads the same mount harness and site stylesheet. That fixed
  // cost is real page weight, so it stays inside totalKB — but it is not a
  // library's doing, and without it the plain <table> baseline appears to
  // "cost" 20-odd kB of nothing. Derived as the intersection of all seven
  // attributions so it stays correct if the harness changes.
  const harnessKeys = measured
    .map((m) => new Set([...m.staticKeys]))
    .reduce((a, b) => new Set([...a].filter((k) => b.has(k))));
  const harnessCss = measured
    .map((m) => new Set(m.css))
    .reduce((a, b) => new Set([...a].filter((k) => b.has(k))));
  const harnessFiles = [
    ...uniq([...harnessKeys].map((k) => graph[k].file).filter(Boolean)),
    ...harnessCss,
  ];

  const demos = {};
  for (const m of measured) {
    const js = bytesOf(m.js);
    const css = bytesOf(m.css);
    const wasm = bytesOf(m.wasm);
    const other = bytesOf(m.other);
    const lazy = bytesOf(m.lazy);
    const react = bytesOf(uniq(m.reactKeys.map((k) => graph[k].file).filter(Boolean)));
    const harness = bytesOf(harnessFiles.filter((f) => m.js.includes(f) || m.css.includes(f)));

    const totalGz = js.gz + css.gz + other.gz;

    demos[m.d.key] = {
      name: m.d.name,
      react: m.d.react,
      jsKB: kb(js.gz),
      cssKB: kb(css.gz),
      otherKB: kb(other.gz),
      totalKB: kb(totalGz),
      reactKB: kb(react.gz),
      libKB: kb(totalGz - react.gz),
      harnessKB: kb(harness.gz),
      wasmKB: kb(wasm.gz),
      lazyKB: kb(lazy.gz),
      raw: {
        jsKB: kb(js.raw),
        cssKB: kb(css.raw),
        wasmKB: kb(wasm.raw),
        totalKB: kb(js.raw + css.raw + other.raw),
      },
      loc: locForDemo(m.d.key),
      files: { js: m.js, css: m.css, wasm: m.wasm, lazy: m.lazy },
    };
  }

  const out = {
    generatedAt: new Date().toISOString(),
    method: {
      compression:
        "gzip at node:zlib's default level, 1 kB = 1000 bytes — the same " +
        "conventions as Vite's build reporter, so every figure can be checked " +
        "against a line of the build log",
      totalKB: "gzipped JS + CSS the demo page downloads on first load",
      libKB: "totalKB minus reactKB — the cost on a page that already ships React",
      reactKB: "the shared react/react-dom/scheduler chunk, named by manualChunks",
      harnessKB:
        "the mount harness and site stylesheet every demo loads. Included in " +
        "totalKB because the page really downloads it; reported separately " +
        "because it is not the library's doing.",
      wasmKB:
        "reported apart from totalKB and never summed with it. Perspective's " +
        "WebAssembly is compiled Rust that gzip barely compresses; averaged " +
        "against six JavaScript bundles it would be meaningless.",
      lazyKB: "chunks reached only through dynamic import — a real cost, but not on first load",
      loc: "non-blank, non-comment lines under src/demos/<key>/, all files",
    },
    harness: { files: harnessFiles, ...sizes(harnessFiles) },
    demos,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2));

  console.table(
    Object.fromEntries(
      Object.entries(demos).map(([k, v]) => [
        k,
        {
          js: v.jsKB, css: v.cssKB, total: v.totalKB,
          react: v.reactKB, lib: v.libKB, harness: v.harnessKB,
          wasm: v.wasmKB, lazy: v.lazyKB, loc: v.loc,
        },
      ])
    )
  );
  for (const [k, v] of Object.entries(demos)) {
    console.log(`${k}: ${[...v.files.js, ...v.files.css, ...v.files.wasm].join(", ")}`);
  }
  console.log(`\nwrote ${OUT}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
