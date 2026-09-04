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

export default {
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), "index.html"),
        ...Object.fromEntries(
          DEMOS.map((d) => [d.key, resolve(process.cwd(), `demos/${d.key}.html`)])
        ),
      },
    },
  },
};
