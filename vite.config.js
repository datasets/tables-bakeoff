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
  main: resolve(process.cwd(), `src/demos/${d.key}/main.js`),
}));

const orphaned = demoFiles.filter((d) => existsSync(d.main) && !existsSync(d.page));
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
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), "index.html"),
        ...Object.fromEntries(built),
      },
    },
  },
};
