/* Every number and judgement on the front page that is not read from
 * bundles.json lives here, so one sweep updates the whole page.
 *
 * Bundle size and lines written are NOT here: hub.js reads them from
 * /bundles.json, which `npm run build` writes.
 *
 * Every render, sort and FPS figure below is the median of 5 fresh page loads
 * from `node scripts/measure-all.mjs` (raw runs and ranges in
 * docs/reports/measurements-2026-11-21.{json,md}). Re-run it, then sweep this
 * file, index.html, EVALUATION.md and ANALYSIS.md together.
 *
 * `verify: true` on a value makes hub.js render the cell with a data-verify
 * attribute (a dotted underline): use it for a figure typed in from a run you
 * do not yet trust. None are set now.
 *
 * `sort500k` is the large card's "Sort by price" button: rows put back in file
 * order (untimed), then the library's own sort API timed to sorted rows on
 * screen. scripts/measure-sort.mjs times it on one library at a time.
 *
 * To add an entry: one object below, plus demos/<key>.html and
 * src/demos/<key>/. The gallery, the measured table and the scorecard all
 * render from this list. Keep `key` equal to the demo key in vite.config.js. */

/** The edit test's verdicts, as printed on the demo card and the front page. */
export const EDIT_STATUS = {
  yes: "Works out of the box",
  config: "Needs config",
  paid: "Needs the paid tier",
  no: "Not available",
};

/** `textSelect` and `kbSort` were checked with Playwright on 2026-11-21 on
 *  each demo's 1,000-row embed (`?bare=1&dataset=small`), dev server:
 *  textSelect drags the mouse across the first data cell and reads
 *  getSelection(); kbSort presses Tab from the top of the page until a column
 *  header has focus, presses Enter, and checks the rows changed order (a second
 *  Enter if the first sort left them as they were). "click only" means the
 *  header sorts on a click but Tab never reaches it. No screen reader was used. */
export const CHECKED = "21 Nov 2026, Playwright, the 1,000-row embed of each demo";

/** Where the typed-in render and FPS numbers come from. */
export const MEASURED = {
  machine: "Apple M4, 16 GB, macOS 15.6, headless Chromium 151, 1400×1000",
  when: "21 Nov 2026, production build, median of 5 fresh page loads, load average 2.3 to 3.9 before each library",
  // Same run: one sort per fresh page load at 500,000 rows. Source:
  // scripts/measure-all.mjs, docs/reports/measurements-2026-11-21.md.
  sort: "21 Nov 2026, 5 fresh page loads",
};

/** AG Grid Community, everything vs only the modules the demo uses, from
 *  scripts/measure-aggrid-lean.mjs (2026-11-21, AG Grid 36.3.0): the demo page
 *  built twice through the same pipeline, own code net of the shared harness,
 *  gzip. The site ships the quick-start version (`all`). */
export const AGGRID_LEAN = {
  allKB: 334,
  leanKB: 272,
  modules: ["ClientSideRowModelModule", "TextFilterModule", "NumberFilterModule", "DateFilterModule", "CellStyleModule", "NumberEditorModule"],
};

/** When `stars` on each entry was read from GitHub (gh api repos/<owner>/<repo>
 *  --jq .stargazers_count). The library pages and both tables print it. */
export const STARS_CHECKED = "21 Nov 2026";

/** Where each library landed in the picks, for the badge in the front page's
 *  overview table. The overview lists these first, in this order, then the
 *  rest in ENTRIES order. */
export const BADGES = {
  baseline: { kind: "pick", job: "a table on a page" },
  aggrid: { kind: "pick", job: "a big grid" },
  tabulator: { kind: "pick", job: "an editable grid" },
  tanstack: { kind: "pick", job: "build your own" },
  observable: { kind: "runner-up", job: "a table on a page" },
  revogrid: { kind: "runner-up", job: "big grid, editable grid" },
};

/** Scorecard axes, 1 (worst) to 5 (best). Subjective, from doing the build. */
export const AXES = [
  { key: "look", label: "Default look", hint: "How the table looks before you touch the CSS" },
  { key: "api", label: "API feel", hint: "How much of the code reads as what you meant" },
  { key: "firstTry", label: "Right first try", hint: "How much work it took to get from code that looked right to a table that was" },
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
    stars: null,
    glance: "No library; stops at a few thousand rows.",
    render50k: { text: "2,470 ms" },
    render500k: { text: "did not finish", sub: "100,000 rows: 6.3 s" },
    sort500k: { text: "20 to 22 s", sub: "100,000 rows; rebuilds the table" },
    fps: { text: "n/a", sub: "13 fps at 50,000" },
    textSelect: { text: "yes" },
    kbSort: { text: "n/a", sub: "no header sort" },
    scores: { look: 4, api: 5, firstTry: 5, docs: 5, escape: 5 },
    line: "Our CSS and no API to learn. It cannot virtualize, so it stops at a few thousand rows.",
  },
  {
    key: "observable",
    name: "Observable Inputs",
    version: "1.0.0",
    license: "ISC",
    released: "2026-11-04",
    paywalled: "nothing",
    framework: "none",
    stars: 175,
    glance: "One call, sort built in, no virtual rows.",
    note: "a",
    render50k: { text: "5.4 ms" },
    render500k: { text: "10.8 ms", sub: "first 60 rows only" },
    sort500k: { text: "104 ms", sub: "redraws the first 60 rows" },
    fps: { text: "53 fps" },
    textSelect: { text: "yes" },
    kbSort: { text: "no", sub: "click only" },
    scores: { look: 3, api: 5, firstTry: 3, docs: 3, escape: 2 },
    line: "Inputs.table(rows) is the best call in the set. Load its stylesheet and pass select: false and it looks tidy. There is no theming API; dark mode is your own CSS.",
  },
  {
    key: "tabulator",
    name: "Tabulator",
    version: "6.7.1",
    license: "MIT",
    released: "2026-10-22",
    paywalled: "nothing. Editors, clipboard and range selection are free",
    framework: "none",
    stars: 7825,
    glance: "Edit, paste, group, export, all free.",
    note: "b",
    render50k: { text: "48.4 ms" },
    render500k: { text: "185 ms" },
    sort500k: { text: "415 ms" },
    edit: {
      dblclick: { status: "yes", text: "editor: \"number\" on the column" },
      paste: { status: "config", text: "selectableRange, clipboard: true and clipboardPasteParser/Action: \"range\", from its spreadsheet example. Free" },
    },
    fps: { text: "60 fps" },
    textSelect: { text: "yes" },
    kbSort: { text: "no", sub: "click only" },
    scores: { look: 3, api: 4, firstTry: 1, docs: 4, escape: 3 },
    line: "Complete docs, and one option in them, height: \"100%\" in an unsized parent, cost 88 seconds at 50,000 rows with nothing logged.",
  },
  {
    key: "aggrid",
    name: "AG Grid Community",
    version: "36.3.0",
    license: "MIT",
    released: "2026-11-04",
    paywalled: "Enterprise: grouping, pivot, range selection, clipboard, Excel export",
    bundleSub: "lean: 272 kB",
    framework: "none",
    stars: 15690,
    glance: "Everything, but grouping and clipboard are Enterprise.",
    render50k: { text: "33.4 ms" },
    render500k: { text: "233 ms" },
    sort500k: { text: "369 ms" },
    edit: {
      dblclick: { status: "yes", text: "editable: true with the Community number editor" },
      paste: { status: "paid", text: "clipboard and cell selection are Enterprise modules; in Community, Ctrl/Cmd-V on a cell does nothing" },
    },
    fps: { text: "60 fps" },
    textSelect: { text: "no", sub: "needs an option" },
    kbSort: { text: "yes" },
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
    stars: 28596,
    glance: "Headless: you write the markup and virtualizer.",
    render50k: { text: "12.3 ms" },
    render500k: { text: "124 ms" },
    sort500k: { text: "418 ms" },
    fps: { text: "60 fps" },
    textSelect: { text: "yes" },
    kbSort: { text: "yes", sub: "header is a <button>" },
    scores: { look: 5, api: 3, firstTry: 2, docs: 2, escape: 5 },
    line: "You write the table, so it looks like your site. v9 docs were the .d.ts files, and you write and debug the virtualizer and spacer rows yourself.",
  },
  {
    key: "glide",
    name: "Glide Data Grid",
    version: "6.0.3",
    license: "MIT",
    released: "2024-02-03",
    paywalled: "nothing",
    framework: "React 16 to 18 only",
    stars: 5448,
    glance: "Canvas and fast. React only; last release 2024.",
    note: "c",
    render50k: { text: "9.6 ms" },
    render500k: { text: "16.8 ms" },
    sort500k: { text: "98 ms", sub: "app code: no built-in sort" },
    edit: {
      dblclick: { status: "config", text: "Glide holds no data: return an editable Number cell and write the value back in onCellEdited" },
      paste: { status: "config", text: "onPaste: true (without it only the first value lands) and getCellsForSelection" },
    },
    fps: { text: "60 fps" },
    textSelect: { text: "no", sub: "canvas" },
    kbSort: { text: "n/a", sub: "no header sort" },
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
    stars: 11662,
    glance: "Analytics engine with a grid; 4.3 MB WASM.",
    note: "d",
    render50k: { text: "191 ms" },
    render500k: { text: "1.9 s" },
    sort500k: { text: "346 ms", sub: "in the worker" },
    fps: { text: "60 fps" },
    textSelect: { text: "no" },
    kbSort: { text: "no", sub: "click only" },
    scores: { look: 3, api: 3, firstTry: 4, docs: 2, escape: 1 },
    line: "Worked on the first run. No per-cell formatter, no locale option, and two WASM URLs to wire up by hand.",
  },
  // Entries 8 and 9: same run as the rest (the older report in
  // docs/reports/datatables-revogrid-report.md has the busy-machine figures).
  {
    key: "datatables",
    name: "DataTables",
    version: "3.1.5",
    license: "MIT (core)",
    released: "2026-10-30",
    paywalled: "Editor, SearchPanes, StateRestore (DataTables Plus, $219 per developer)",
    framework: "none",
    stars: 7390,
    glance: "Sort and search over HTML rows; editing paid.",
    note: "e",
    render50k: { text: "810 ms" },
    render500k: { text: "8.5 s" },
    sort500k: { text: "459 ms" },
    edit: {
      dblclick: { status: "paid", text: "the free core has no cell editing; Editor is part of DataTables Plus, from $219 per developer" },
      paste: { status: "paid", text: "Editor again" },
    },
    fps: { text: "47 fps", sub: "48 fps on 80 columns" },
    textSelect: { text: "yes" },
    kbSort: { text: "yes" },
    scores: { look: 3, api: 4, firstTry: 2, docs: 4, escape: 4 },
    line: "The right tool for making a few thousand rows of HTML sortable and searchable, now without jQuery. It builds its whole model before showing anything, so 500,000 rows took 8.5 seconds.",
  },
  {
    key: "revogrid",
    name: "RevoGrid",
    version: "4.31.8",
    license: "MIT (core)",
    released: "2026-11-19",
    paywalled: "Pro ($199 to $499 per developer per year): pivot, Excel, master-detail, richer filters. The free core shows a RevoGrid link",
    framework: "none (web component)",
    stars: 3465,
    glance: "Fastest DOM grid; the free core shows a link.",
    note: "f",
    render50k: { text: "55 ms" },
    render500k: { text: "62 ms" },
    sort500k: { text: "194 ms" },
    edit: {
      dblclick: { status: "yes", text: "readonly off" },
      paste: { status: "yes", text: "pastes down from the focused cell; range: true is only for drag-selecting" },
    },
    fps: { text: "60 fps" },
    textSelect: { text: "no", sub: "off by default" },
    kbSort: { text: "no", sub: "click only" },
    scores: { look: 3, api: 4, firstTry: 3, docs: 3, escape: 3 },
    line: "The fastest DOM grid at 500,000 rows, in any framework. Its render event fires before any cell exists, its columns do not auto-size by default, and its community is a quarter of AG Grid's.",
  },
];

/** The top of each library page (src/harness/mount.js) renders from this.
 *  `role` is where the library landed in the picks on the front page; `line`
 *  is the one-sentence verdict, cost included; `use` and `skip` are the
 *  reasons to choose it or not, two each, short; `watch` is the trap or the
 *  setup step that is not a reason to skip but will cost you an afternoon.
 *  Every fact here is also in EVALUATION.md or the entry above. */
export const VERDICTS = {
  baseline: {
    role: "Our pick for a table on a page",
    line: "Use a plain <table> up to a few thousand rows. No library, no API to learn, your own CSS.",
    use: [
      "A report, article or docs page with up to a few thousand rows.",
      "Print, copy, Ctrl-F and dark mode with no extra code. Sort on click is ten more lines.",
    ],
    skip: [
      "More than about 10,000 rows: 2.5 s at 50,000, and it gets worse faster than the row count.",
      "You need a search box or filters.",
    ],
  },
  observable: {
    role: "Runner-up for a table on a page",
    line: "Inputs.table(rows) is the best single call in the set: types inferred, numbers right-aligned, sort on click. Free, ISC.",
    use: [
      "A few thousand rows with sort on click, in one call.",
      "You already use Observable Plot or Inputs on the page.",
    ],
    skip: [
      "More than about ten thousand rows: it appends rows as you scroll and never removes them.",
    ],
    watch: "Load its stylesheet, or ids and dates wrap mid-word.",
  },
  tabulator: {
    role: "Our pick for an editable grid",
    line: "Edit cells, paste ranges, group, export: all in the free MIT package, vanilla, no framework.",
    use: [
      "People edit cells and paste ranges, like a spreadsheet.",
      "You want a grid done without React, at a third of AG Grid's size.",
    ],
    skip: [
      "Headers must sort from the keyboard. Here they sort on click only.",
    ],
    watch: "height: \"100%\" in a parent with no height renders every row: 88 seconds at 50,000 rows, nothing logged. Give the host a real height.",
  },
  aggrid: {
    role: "Our pick for a big grid",
    line: "Renders 500,000 rows in 233 ms, sorts them in 369 ms and scrolls at 60 fps, with sort and filter built in, in any framework. Free, MIT; grouping, pivot and Excel export are Enterprise.",
    use: [
      "Tens of thousands to 500,000 rows and you want it done.",
      "Loud failures: a missing module throws, a wrong host height draws a visibly empty grid.",
    ],
    skip: [
      "Bundle size matters: 333 kB as the quick start ships it, 272 kB lean, the heaviest grid here.",
      "You need grouping, pivot, range selection, clipboard or Excel export without paying.",
    ],
    watch: "Register modules before createGrid or it throws. Browser text selection is off until you set enableCellTextSelection.",
  },
  tanstack: {
    role: "DataHub's pick: build your own",
    line: "Headless: it computes rows, sorting and columns, you write every element. You get a table in your own markup for 24 kB over React.",
    use: [
      "You ship React and want your own markup and CSS.",
      "Browser Ctrl-F, text selection and copy must work on the rows on screen.",
    ],
    skip: [
      "You want a grid done. You write the virtualizer, spacer rows and sticky header: 150 lines here.",
      "You need docs. When we built this, v9's were the .d.ts files.",
    ],
    watch: "The spacer-row and column-group arithmetic is easy to get wrong. We got it wrong twice.",
  },
  glide: {
    role: "Also consider, for an editable grid",
    line: "Canvas, so 500,000 rows draw in 17 ms and it feels like Sheets. React 16 to 18 only; last release February 2024.",
    use: [
      "React 18 and you want the spreadsheet feel.",
      "Range copy and paste, with two props.",
    ],
    skip: [
      "Browser Ctrl-F and text selection must work. A canvas has no text to find.",
      "You want a maintained library. Last stable release February 2024.",
    ],
    watch: "Set getCellsForSelection or copy returns nothing, and onPaste: true or only the first pasted value lands. The quick start mentions neither.",
  },
  perspective: {
    role: "A special case",
    line: "A WebAssembly analytics engine with a grid on top. Worked on the first run; 1.9 s to load 500,000 rows into its worker. Apache-2.0.",
    use: [
      "Pivot, aggregation and filtering computed off the main thread.",
      "You can carry 4.3 MB of WebAssembly.",
    ],
    skip: [
      "You need per-cell formatting or a locale option. There is none.",
      "You want a light page.",
    ],
    watch: "Two WASM URLs to wire up by hand.",
  },
  datatables: {
    role: "A special case: a search box over a few thousand rows",
    line: "The right tool for making a few thousand rows of HTML sortable and searchable, now without jQuery. 53 kB, MIT.",
    use: [
      "A few thousand rows of HTML with a search box and sort for free.",
      "Real <td>s the browser can find, select and copy.",
    ],
    skip: [
      "Anything grid shaped or large: 8.5 s at 500,000 rows, and its own FAQ caps client-side data at about 50,000.",
      "You need editing. That is the paid Editor, from $219 per developer.",
    ],
  },
  revogrid: {
    role: "Runner-up for a big grid and for an editable grid",
    line: "The fastest DOM grid at 500,000 rows, a web component for any framework, and paste worked with no config. It shows a link in the corner.",
    use: [
      "A fast grid in any framework, with clipboard and keyboard navigation in the free core.",
      "Editing and pasting ranges with no extra config.",
    ],
    skip: [
      "You cannot show its corner link. A hideAttribution option exists, but its docs ask companies to keep the link or pay for Pro ($199 to $499 per developer per year).",
      "You want a large community. Its is about a quarter of AG Grid's.",
    ],
    watch: "Its render event fires before any cell exists, and columns do not auto-size by default.",
  },
};

/* Things to confirm before launch that are not numbers in ENTRIES:
 * - index.html Method: "the numbers were checked against the build and the
 *   live pages" must be literally true of whoever did it.
 * - "Considered, not included": MUI X 100-row page cap, react-data-grid beta
 *   status, SlickGrid 6.0 date.
 * - The edit test (`edit` above) was run by scripts/edit-test.mjs on
 *   2026-11-21: double-click a price and type, then paste three lines onto a
 *   price cell, reading the values back from the data. */
export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/* Cards a library page does not run, keyed by library then dataset, as a
 * Markdown note shown in place of the table. The plain <table> cannot render
 * 500,000 rows without hanging the page. The note lives here rather than in
 * the demo so it does not count toward the demo's lines. Bare mode and
 * ?cards=all ignore it, so the measurement scripts still time the capped
 * 100,000-row render. */
export const SKIP_CARDS = {
  baseline: {
    large: `We do not render 500,000 rows here. A plain \`<table>\` puts every row in the DOM, and at this size the page hangs. Uncapped, it had not finished after ten minutes.

What we measured on our machine: 2.5 s at 50,000 rows, 6.3 s at 100,000, about 27 s at 200,000. The cost is table layout, and it grows faster than the row count.

For a grid this size use [AG Grid Community](/demos/aggrid.html), our pick for a big grid. Those numbers come from this page with every card on: [run it yourself](/demos/baseline.html?cards=all#large), and expect a wait.`,
  },
};
