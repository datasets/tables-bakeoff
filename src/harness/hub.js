/* Fills the hub's measured columns from the real build output, so the numbers
 * on the page cannot drift from the numbers in the bundle. */
import { restoreTheme, installThemeToggle } from "./theme.js";

restoreTheme();
const toggleBtn = document.querySelector(".toggle");
if (toggleBtn) installThemeToggle(toggleBtn);

const fmt = (n) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

fetch("/bundles.json")
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
  .then(({ harness, demos }) => {
    const harnessSpan = document.querySelector("[data-harness]");
    if (harnessSpan) harnessSpan.textContent = `${fmt(harness.gzipKB)} KB`;

    // React is shared between the two React demos; every demo object already
    // carries harnessKB the same way, so just read reactKB off whichever demo
    // actually paid for it rather than hardcoding a figure that could drift.
    const reactDemo = Object.values(demos).find((d) => d.reactKB > 0);
    const reactSpan = document.querySelector("[data-react]");
    if (reactSpan && reactDemo) reactSpan.textContent = `${fmt(reactDemo.reactKB)} KB`;

    for (const [key, d] of Object.entries(demos)) {
      const bundle = document.querySelector(`[data-bundle="${key}"]`);
      const wasm = document.querySelector(`[data-wasm="${key}"]`);
      const loc = document.querySelector(`[data-loc="${key}"]`);

      // "Own code" nets out both the shared harness (mount + hyparquet +
      // site.css, paid by every demo) and, for the two React demos, React
      // itself (already excluded from libKB). Without this the baseline
      // <table> would appear to cost 24 KB instead of the ~1 KB it adds.
      if (bundle) bundle.textContent = `${fmt(d.libKB - d.harnessKB)} KB`;

      // Perspective's WASM is reported in its own unit and never merged into
      // the KB column above — see the WASM note in the scorecard footnotes.
      if (wasm) wasm.textContent = d.wasmKB > 0 ? `${(d.wasmKB / 1000).toFixed(1)} MB` : "n/a";

      if (loc) loc.textContent = String(d.loc);
    }
  })
  .catch(() => {
    // Dev server has no bundles.json until after a build. Leave the dashes
    // rather than throwing, and say why on hover.
    for (const el of document.querySelectorAll("[data-bundle],[data-loc],[data-wasm]")) {
      el.title = "run npm run build to populate";
    }
  });
