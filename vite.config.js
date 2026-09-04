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

/* The demos are built one task at a time, so the six pages that do not exist
 * yet would fail the whole build as unresolved rollup entries. Build the pages
 * that are on disk and say out loud which ones were skipped — a silent omission
 * would let a demo ship with its main.js but no HTML and still go green. */
const demoPages = DEMOS.map((d) => [d.key, resolve(process.cwd(), `demos/${d.key}.html`)]);
const built = demoPages.filter(([, path]) => existsSync(path));
const missing = demoPages.filter(([, path]) => !existsSync(path)).map(([key]) => key);
if (missing.length) console.info(`[vite.config] demo pages not built yet: ${missing.join(", ")}`);

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
