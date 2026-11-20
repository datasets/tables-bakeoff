/* Every number and judgement on the front page that is not read from
 * bundles.json lives here, so one sweep updates the whole page.
 *
 * Bundle size and lines written are NOT here: hub.js reads them from
 * /bundles.json, which `npm run build` writes.
 *
 * `verify: true` marks a value typed in from a measurement run that is being
 * repeated (Nov 2026 versions, sort at 500k, edit test). hub.js renders those
 * cells with a data-verify attribute. Clear the flag when the number has been
 * re-measured on the version shown.
 *
 * To add an entry: one object below, plus demos/<key>.html and
 * src/demos/<key>/. The gallery, the measured table and the scorecard all
 * render from this list. Keep `key` equal to the demo key in vite.config.js. */

/** Where the typed-in render and FPS numbers come from. */
export const MEASURED = {
  machine: "one laptop, headless Chromium, 1400×1000", // VERIFY after the re-measure
  when: "Sep 2026 run; the Nov 2026 re-measure is in progress", // VERIFY after the re-measure
};

/** Scorecard axes, 1 (worst) to 5 (best). Subjective, from doing the build. */
export const AXES = [
  { key: "look", label: "Default look", hint: "How the table looks before you touch the CSS" },
  { key: "api", label: "API feel", hint: "How much of the code reads as what you meant" },
  { key: "firstTry", label: "Right first try", hint: "How far the library fought between code that looked right and a table that was" },
  { key: "docs", label: "Docs", hint: "Could the published docs answer the questions the build raised" },
  { key: "escape", label: "Escape hatch", hint: "When the API runs out, how far down can you reach" },
];

export const ENTRIES = [
  {
    key: "baseline",
    name: "Plain <table>",
    version: "",
    license: "n/a",
    released: "",
    paywalled: "n/a",
    framework: "none",
    render50k: { text: "2,625 ms", verify: true },
    render500k: { text: "did not finish", sub: "100,000 rows: 6.9 s", verify: true },
    fps: { text: "n/a", sub: "15 fps at 50,000", verify: true },
    scores: { look: 4, api: 5, firstTry: 5, docs: 5, escape: 5 },
    line: "Our CSS, no API to learn, nothing to fight. It cannot virtualize, so it stops at a few thousand rows.",
  },
  {
    key: "observable",
    name: "Observable Inputs",
    version: "1.0.0",
    license: "ISC",
    released: "2026-11-04",
    paywalled: "nothing",
    framework: "none",
    note: "a",
    render50k: { text: "5.8 ms", verify: true },
    render500k: { text: "6.7 ms", sub: "first 60 rows only", verify: true },
    fps: { text: "60 fps", verify: true },
    scores: { look: 3, api: 5, firstTry: 3, docs: 3, escape: 2 },
    line: "Inputs.table(rows) is the best call in the set. Load its stylesheet and pass select: false and it looks tidy; the CSS is light only and there is no theming hook.",
  },
  {
    key: "tabulator",
    name: "Tabulator",
    version: "6.7.1",
    license: "MIT",
    released: "2026-10-22",
    paywalled: "nothing. Editors, clipboard and range selection are free",
    framework: "none",
    note: "b",
    render50k: { text: "68 ms", verify: true },
    render500k: { text: "280 ms", verify: true },
    fps: { text: "60 fps", verify: true },
    scores: { look: 3, api: 4, firstTry: 1, docs: 4, escape: 3 },
    line: "Complete docs, and they contain the trap: height: \"100%\" in an unsized parent cost 62 seconds at 50,000 rows with nothing logged.",
  },
  {
    key: "aggrid",
    name: "AG Grid Community",
    version: "36.3.0",
    license: "MIT",
    released: "2026-11-04",
    paywalled: "Enterprise: grouping, pivot, range selection, clipboard, Excel export",
    framework: "none",
    render50k: { text: "35 ms", verify: true },
    render500k: { text: "248 ms", verify: true },
    fps: { text: "60 fps", sub: "0 dropped", verify: true },
    scores: { look: 4, api: 4, firstTry: 3, docs: 4, escape: 4 },
    line: "Threw on a missing ModuleRegistry and had renamed its scroller class, but both failures were visible. The theming API is good.",
  },
  {
    key: "tanstack",
    name: "TanStack Table",
    version: "9.3.1",
    license: "MIT",
    released: "2026-10-12",
    paywalled: "nothing",
    framework: "React (adapters for Vue, Svelte, Solid, Angular)",
    render50k: { text: "20.0 ms", verify: true },
    render500k: { text: "141 ms", verify: true },
    fps: { text: "59 fps", verify: true },
    scores: { look: 5, api: 3, firstTry: 2, docs: 2, escape: 5 },
    line: "It is your table, so it looks like your site. v9 docs were the .d.ts files, and the virtualizer and spacer rows are yours to get wrong.",
  },
  {
    key: "glide",
    name: "Glide Data Grid",
    version: "6.0.3",
    license: "MIT",
    released: "2024-02-03",
    paywalled: "nothing",
    framework: "React 16 to 18 only",
    note: "c",
    render50k: { text: "17.4 ms", verify: true },
    render500k: { text: "24.6 ms", verify: true },
    fps: { text: "60 fps", verify: true },
    scores: { look: 4, api: 4, firstTry: 3, docs: 3, escape: 2 },
    line: "The best theming object here, one plain token bag. Grid copy works once getCellsForSelection is set, but canvas means browser Ctrl-F and text selection see nothing.",
  },
  {
    key: "perspective",
    name: "Perspective",
    version: "5.9.4",
    license: "Apache-2.0",
    released: "2026-11-20",
    paywalled: "nothing",
    framework: "none",
    note: "d",
    render50k: { text: "274 ms", verify: true },
    render500k: { text: "2.1 to 2.7 s", verify: true },
    fps: { text: "60 fps", verify: true },
    scores: { look: 3, api: 3, firstTry: 4, docs: 2, escape: 1 },
    line: "Worked on the first run. No per-cell formatter, no locale option, and two WASM URLs to wire up by hand.",
  },
  // Entries 8 and 9. Numbers are from docs/reports/datatables-revogrid-report.md,
  // measured on a busy machine; all of them are being re-measured.
  {
    key: "datatables",
    name: "DataTables",
    version: "3.1.5",
    license: "MIT (core)",
    released: "2026-10-30",
    paywalled: "Editor, SearchPanes, StateRestore (DataTables Plus, $219 per developer)",
    framework: "none",
    note: "e",
    render50k: { text: "957 ms", verify: true },
    render500k: { text: "10.1 s", verify: true },
    fps: { text: "52 fps", sub: "48 fps on 80 columns", verify: true },
    scores: { look: 3, api: 4, firstTry: 2, docs: 4, escape: 4 },
    line: "The right tool for making a few thousand rows of HTML sortable and searchable, now without jQuery. It builds its whole model before showing anything, so 500,000 rows is ten seconds.",
  },
  {
    key: "revogrid",
    name: "RevoGrid",
    version: "4.31.8",
    license: "MIT (core)",
    released: "2026-11-19",
    paywalled: "Pro ($199 to $499 per developer per year): pivot, Excel, master-detail, richer filters. The free core shows a RevoGrid link",
    framework: "none (web component)",
    note: "f",
    render50k: { text: "59 ms", verify: true },
    render500k: { text: "55 ms", verify: true },
    fps: { text: "60 fps", sub: "1 dropped", verify: true },
    scores: { look: 3, api: 4, firstTry: 3, docs: 3, escape: 3 },
    line: "The fastest DOM grid at 500,000 rows, in any framework. Its render event fires before any cell exists, its columns do not auto-size, and its community is a quarter of AG Grid's.",
  },
];

/* Things to confirm before launch that are not numbers in ENTRIES:
 * - index.html Method: "the numbers were checked against the build and the
 *   live pages" must be literally true of whoever did it.
 * - "Considered, not included": MUI X 100-row page cap, react-data-grid beta
 *   status, SlickGrid 6.0 date.
 * - The editable-grid pick is provisional until the edit test lands. */
export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
