import { existsSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

/** The seven contenders. `react: true` means the demo mounts a React root. */
export const DEMOS = [
  { key: "baseline",   name: "Plain <table>",      react: false },
  { key: "observable", name: "Observable Inputs",  react: false },
  { key: "tabulator",  name: "Tabulator",          react: false },
  { key: "aggrid",     name: "AG Grid Community",  react: false },
  { key: "tanstack",   name: "TanStack Table",     react: true  },
  { key: "glide",      name: "Glide Data Grid",    react: true  },
  { key: "perspective",name: "Perspective",        react: false },
];

/* The demos are built one task at a time, so the pages that do not exist yet
 * would fail the whole build as unresolved rollup entries. A demo counts as
 * started once src/demos/<key>/main.js exists; from that moment its page is
 * required. Anything else lets a finished demo drop out of the site over a
 * missing HTML file with a green build — and the entry point of a static site
 * failing silently is the one failure nobody notices. */
const demoFiles = DEMOS.map((d) => ({
  key: d.key,
  page: resolve(process.cwd(), `demos/${d.key}.html`),
  // The React demos are main.jsx, the vanilla ones main.js. Checking only one
  // extension would quietly exempt half the site from the guard below.
  mains: ["main.js", "main.jsx"].map((f) => resolve(process.cwd(), `src/demos/${d.key}/${f}`)),
}));

const orphaned = demoFiles.filter((d) => d.mains.some(existsSync) && !existsSync(d.page));
if (orphaned.length) {
  throw new Error(
    `Demo(s) with a main.js but no page: ${orphaned.map((d) => d.key).join(", ")}. ` +
      `Create ${orphaned.map((d) => `demos/${d.key}.html`).join(", ")} — without it the ` +
      `demo is absent from the built site and nothing else reports it.`
  );
}

const built = demoFiles.filter((d) => existsSync(d.page)).map((d) => [d.key, d.page]);

export default {
  plugins: [react()],
  /* Playwright owns tests/e2e. Vitest's default spec glob would otherwise pick
     those files up and fail importing @playwright/test under Node. */
  test: {
    include: ["tests/**/*.test.js"],
  },
  /* Perspective's ESM build uses top-level await to bootstrap its WASM, which
     Vite's default browser target cannot emit. Its own Vite guide asks for
     esnext here; without it `vite build` fails outright on the Perspective
     entry, and the dev server pre-bundles its deps to a target that chokes on
     the same syntax. Applies to every demo, but only Perspective needs it. */
  esbuild: { target: "esnext" },
  optimizeDeps: { esbuildOptions: { target: "esnext" } },
  build: {
    target: "esnext",
    /* scripts/measure-bundles.mjs needs the real chunk graph — which entry pulls
       which shared chunk, and which CSS/WASM assets ride along — to attribute a
       shared runtime to every entry that loads it. Reading the flat file list in
       dist/assets cannot tell you that. */
    manifest: true,
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), "index.html"),
        ...Object.fromEntries(built),
        // Exploratory spike, not a bakeoff entry (see GitHub issue #6) — built
        // and measured separately from the seven DEMOS-driven library cards.
        "duckdb-query": resolve(process.cwd(), "demos/duckdb-query.html"),
      },
      output: {
        /* Rollup already hoists React into a chunk shared by the two React
           demos, but it names that chunk after whichever module happened to be
           its facade ("index"), which no honest heuristic can recognise as the
           React runtime. Naming the chunk ourselves is what lets
           scripts/measure-bundles.mjs report reactKB and libKB as separate,
           checkable numbers instead of guessing from a filename. It also keeps
           the split stable if a demo is added or removed. */
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
        },
      },
    },
  },
};
