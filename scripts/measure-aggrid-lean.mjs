/* AG Grid Community, everything vs only what the demo needs.
 *
 * The demo registers AllCommunityModule, as AG Grid's quick start does, and
 * the site reports what that ships. AG Grid's docs also say to register only
 * the modules you use. This script builds the AG Grid demo page twice, through
 * the same Vite pipeline, once as shipped and once with the registration
 * swapped for the modules the page actually needs (LEAN below), and prints the
 * gzipped JS + CSS of each. The difference is the cost of the quick start's
 * convenience. Build-time only: the site keeps shipping the quick-start
 * version, and nothing here changes what a visitor downloads.
 *
 * Run: node scripts/measure-aggrid-lean.mjs [--keep]
 * --keep leaves both builds in .aggrid-lean/ so the lean page can be served
 * (npx vite preview --outDir .aggrid-lean/lean) and checked for AG Grid's
 * "module not registered" errors. */
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

/** What the demo uses: client-side rows, the default column filters (text,
 *  number and date, by inferred type), the cellClass that right-aligns
 *  numbers, and the number editor of the edit test card. Sorting and column
 *  resize are in AG Grid's core in v36 and need no registration. */
export const LEAN = [
  "ClientSideRowModelModule",
  "TextFilterModule",
  "NumberFilterModule",
  "DateFilterModule",
  "CellStyleModule",
  "NumberEditorModule",
];

const OUT = ".aggrid-lean";
const MAIN = resolve("src/demos/aggrid/main.js");
const ALL_IMPORT = `import { createGrid, ModuleRegistry, AllCommunityModule, themeQuartz } from "ag-grid-community";`;
const ALL_REGISTER = `ModuleRegistry.registerModules([AllCommunityModule]);`;

/** Swap the registration in the demo for LEAN, failing loudly if the demo's
 *  code has drifted from what this script expects. */
function leanPlugin() {
  return {
    name: "aggrid-lean",
    enforce: "pre",
    transform(code, id) {
      if (id !== MAIN) return null;
      if (!code.includes(ALL_IMPORT) || !code.includes(ALL_REGISTER)) {
        throw new Error("src/demos/aggrid/main.js no longer matches; update scripts/measure-aggrid-lean.mjs");
      }
      return code
        .replace(ALL_IMPORT, `import { createGrid, ModuleRegistry, themeQuartz, ${LEAN.join(", ")} } from "ag-grid-community";`)
        .replace(ALL_REGISTER, `ModuleRegistry.registerModules([${LEAN.join(", ")}]);`);
    },
  };
}

async function buildVariant(name, plugins) {
  const outDir = join(OUT, name);
  await build({
    configFile: false,
    logLevel: "warn",
    plugins: [react(), ...plugins],
    esbuild: { target: "esnext" },
    build: {
      target: "esnext",
      outDir,
      emptyOutDir: true,
      manifest: true,
      rollupOptions: { input: { aggrid: resolve("demos/aggrid.html") } },
    },
  });
  return measure(outDir);
}

/** Gzipped JS + CSS reached statically from the aggrid entry. */
function measure(outDir) {
  const manifest = JSON.parse(readFileSync(join(outDir, ".vite/manifest.json"), "utf8"));
  const entry = Object.keys(manifest).find((k) => manifest[k].isEntry);
  const seen = new Set();
  const stack = [entry];
  const files = new Set();
  while (stack.length) {
    const k = stack.pop();
    if (seen.has(k)) continue;
    seen.add(k);
    const c = manifest[k];
    if (c.file) files.add(c.file);
    for (const css of c.css ?? []) files.add(css);
    for (const imp of c.imports ?? []) stack.push(imp);
  }
  let gz = 0;
  for (const f of files) gz += gzipSync(readFileSync(join(outDir, f))).length;
  return Math.round(gz / 100) / 10;
}

const all = await buildVariant("all", []);
const lean = await buildVariant("lean", [leanPlugin()]);

// The site's "own code" figure nets out the shared harness; use the same
// harness figure so these line up with the measured table.
let harnessKB = null;
if (existsSync("public/bundles.json")) {
  harnessKB = JSON.parse(readFileSync("public/bundles.json", "utf8")).demos.aggrid.harnessKB;
}
const own = (kb) => (harnessKB == null ? null : Math.round((kb - harnessKB) * 10) / 10);

console.log(JSON.stringify({
  modules: LEAN,
  pageKB: { all, lean },
  ownKB: { all: own(all), lean: own(lean) },
  savedKB: Math.round((all - lean) * 10) / 10,
}, null, 2));

if (!process.argv.includes("--keep")) rmSync(OUT, { recursive: true, force: true });
