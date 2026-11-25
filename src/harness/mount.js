/* The shared demo-page framework. A library's page supplies four render
 * functions and gets an identical page: a verdict at the top, a card for
 * 1,000 rows and one for 500,000, a live metrics badge per card, a "Get
 * started" block, and a source panel showing the exact code that ran.
 *
 * This is what makes the bake-off fair — every demo gets the same shell, the
 * same data, the same theme and the same formatter.
 *
 * All four datasets still exist and still render: the front page gallery and
 * scripts/measure-all.mjs use them. `?cards=all` puts all four cards on the
 * page (the measurement scripts pass it); `?bare=1&dataset=<key>` renders one
 * dataset with no chrome (the gallery embeds).
 *
 * THE CONTRACT every demo module implements:
 *
 *   export const meta   = { name, version, license, docs, tagline, notes?, npm };
 *   export const tables = { small, wide, medium, large };
 *   export const source = renderFn;   // optional, see (3) — usually wanted
 *   export const setup  = asyncFn;   // optional, see (4)
 *   export const edit   = renderFn;  // optional, see (6)
 *   mountDemo({ meta, tables, source, setup, edit });
 *
 * Each render function is called as `fn(host, dataset, ctx)` where
 *   host    — an empty scrolling <div class="demo-host">, already sized.
 *   dataset — Task 3's { key, rows, numRows, columns, timings }; `columns` are
 *             { name, label, type: 'string'|'number'|'date', align: 'left'|'right' },
 *             already in the shared display order (src/data/load.js). Use
 *             `label` for the header and `name` as the field.
 *   ctx     — { theme, key, formatCell, reportRows, provideSort }:
 *               theme      a snapshot of theme.js's tokens taken just before
 *                          this render — `theme.dark` is the light/dark
 *                          discriminator, plus palette, surface, page, text,
 *                          grid, fontSans, fontMono. It does not update by
 *                          itself; the harness re-renders the card on a theme
 *                          change and passes a fresh snapshot.
 *               key        the dataset key, for demos that share one function.
 *               formatCell the single shared formatter; use it for every cell
 *                          so differences on screen come from the library.
 *               reportRows see (2).
 *               provideSort see (5).
 * It may return nothing, or a cleanup function, or a promise of either. The
 * promise is awaited inside the timed region, so async mounts (a React root,
 * Perspective's viewer.load) report their true cost. Cleanup runs before the
 * card re-renders on a theme change.
 *
 * THREE THINGS A DEMO MUST OPT INTO. Each is invisible if you skip it, and
 * each produces a number on the page that is wrong rather than missing.
 *
 * (1) data-scroller — REQUIRED if the library owns its own viewport.
 *     "Measure scroll FPS" scrolls the .demo-host. AG Grid, Tabulator, Glide
 *     and Perspective all size themselves to 100% of the host and scroll an
 *     element *inside* it, so the host itself never moves. Omit this and the
 *     card reports a flat 60fps for an element that never scrolled — a
 *     fabricated number, not an absent one. Inside your render function:
 *         host.querySelector(".ag-body-viewport").setAttribute("data-scroller", "");
 *     The harness scrolls the first [data-scroller] descendant if there is one.
 *
 * (2) ctx.reportRows(n) — REQUIRED if you did not present the whole dataset.
 *     The metric line otherwise claims the dataset's full row count. Call this
 *     when you cap or window the data, as the baseline does at 100,000 of
 *     500,000 rows; the card then reads "100,000 of 500,000 rows".
 *     Virtualization is NOT capping: a grid that keeps 30 rows in the DOM but
 *     lets the user scroll all 500,000 has presented all 500,000 and must not
 *     call this.
 *
 * (3) export const source — the source panel's subject.
 *     The panel prints tables[key] verbatim. Nearly every demo shares one
 *     implementation across the four datasets, so tables[key] is a one-line
 *     delegating stub and the panel shows nothing worth reading. Export the
 *     function that does the work — one function, or a per-key map — and the
 *     panel shows the stub followed by that implementation.
 *
 * (4) export const setup — a one-off, per-page cost that is not a render.
 *     Perspective boots two WebAssembly engines before it can draw anything.
 *     Left inside the first render it made 1,000 rows read as three seconds;
 *     left out silently it would vanish. A demo with such a cost exports it
 *     as `setup`: the harness awaits it once, before any card renders, times
 *     it with the same clock, and prints it on its own line ("engine ready in
 *     N ms") above the cards and in the gallery embed.
 *
 * (5) ctx.provideSort(fn) — the large card's "Sort by price" action.
 *     Hand the harness a function `fn(field)` that sorts the table ascending
 *     by `field` through the library's own API, or, given null, puts the rows
 *     back in file order. The harness clears (untimed), then times
 *     fn("price") with the same clock as a render: it awaits a returned
 *     promise, then forces layout. Resolve the promise only once the sorted
 *     rows are on screen, as the render predicates do.
 *
 * (6) export const edit — the edit test card, for libraries that edit.
 *     `edit(host, data, ctx)` renders the small dataset with the price column
 *     editable, configured as the library's docs say, so that a user can
 *     double-click a price to change it and paste a column of three values.
 *     `data.rows` is a copy, so edits never reach the other cards. The card
 *     shows the first three prices read back from that copy, which is what
 *     proves an edit reached the data and not only the screen. What each
 *     library needed is recorded in results.js (`edit`) and printed on the
 *     card; an entry with a result but no `edit` export (DataTables, whose
 *     editing is the paid Editor) gets the card with the result only.
 *
 * (7) SKIP_CARDS in results.js — a card the page should not run.
 *     The plain <table> cannot render 500,000 rows: the page hangs. Its page
 *     shows a note in the large card instead of a Load button. SKIP_CARDS maps
 *     a library and dataset key to that note, in Markdown. The card keeps its title and
 *     source panel. Bare mode and `?cards=all` ignore it, so the measurement
 *     scripts still get the capped render they time. */

import "./analytics.js";
import "./demo.css";
import { DATASETS, DATASET_KEYS } from "../data/datasets.js";
import { loadDataset, formatCell } from "../data/load.js";
import { time, formatMs, measureScrollFps, peakMemoryMB } from "./metrics.js";
import { theme, onThemeChange, installThemeToggle, restoreTheme } from "./theme.js";
import { renderMarkdown } from "./markdown.js";
import { ENTRIES, EDIT_STATUS, VERDICTS, SKIP_CARDS, STARS_CHECKED } from "./results.js";
import { SNIPPETS } from "./snippets.js";

restoreTheme();

/** The two cards a page shows: the small dataset and the large one. The 80
 *  column and 50,000 row datasets are still built, embedded and measured, but
 *  on the page they told the reader nothing the other two did not. */
const PAGE_KEYS = ["small", "large"];

export async function mountDemo({ meta, tables, source, setup, edit }) {
  document.title = `${meta.name} — Tables Bakeoff`;
  const root = document.getElementById("app");

  // ?bare=1: the front page embeds each demo as an iframe showing only the
  // small dataset, no page chrome. Same loader, same formatter, same clock.
  const params = new URLSearchParams(location.search);
  if (params.get("bare") === "1") return mountBare({ meta, tables, setup, root, dataset: params.get("dataset") || "small" });

  // ?cards=all: every dataset, and no skipped cards. For the measurement
  // scripts, which time all four and the plain table's capped 100,000 rows.
  const allCards = params.get("cards") === "all";
  const keys = allCards ? DATASET_KEYS : PAGE_KEYS;
  const key = demoKey();
  const skipped = allCards ? {} : SKIP_CARDS[key] || {};
  const entry = ENTRIES.find((d) => d.key === key);
  root.innerHTML = shell({ meta, entry, hasEdit: !!edit, keys, skipped, verdict: VERDICTS[key], snippet: SNIPPETS[key] });
  installThemeToggle(root.querySelector(".toggle"));
  fillBundleSize(root, key);
  wireCopyButtons(root);

  const cleanups = {};
  const sorters = {};
  const sortRuns = {};

  // Wire every card before rendering any of them, so the large card's Load
  // button is live while the eager cards are still working.
  for (const key of keys) {
    const card = root.querySelector(`[data-card="${key}"]`);
    card.querySelector(".src pre").textContent = sourceOf(tables[key], sourceFor(source, key));
    if (skipped[key]) continue;

    const fpsBtn = card.querySelector(".fps-btn");
    // Nothing to scroll until a table exists; an FPS number for an empty box
    // would be a meaningless 60.
    fpsBtn.disabled = true;
    fpsBtn.addEventListener("click", () => runFps(card));

    const sortBtn = card.querySelector(".sort-btn");
    if (sortBtn) {
      sortBtn.disabled = true;
      sortBtn.addEventListener("click", () => runSort(key, card));
    }

    if (!DATASETS[key].eager) {
      card.querySelector(".load-btn").addEventListener("click", (e) => {
        e.target.disabled = true;
        e.target.textContent = "loading…";
        render(key, card);
      });
    }
  }

  // A one-off engine boot, timed on its own and shown on its own line, so it is
  // neither hidden nor charged to whichever card happens to render first.
  if (setup) {
    const line = root.querySelector(".setup-line");
    line.hidden = false;
    try {
      const ms = await timeSetup(setup);
      line.querySelector("b").textContent = formatMs(ms);
    } catch (err) {
      line.querySelector("b").textContent = "failed";
      line.insertAdjacentHTML("beforeend", `<pre class="err">${escapeHtml(String(err.stack || err))}</pre>`);
      console.error(`[${meta.name}] setup`, err);
      return;
    }
  }

  // Sequentially, not concurrently. These timings are the product; one card's
  // parquet decode interleaving with another card's timed render on the same
  // thread would inflate whichever card lost the race, and the site would
  // publish the result as if it were the library's cost.
  for (const key of keys) {
    if (!DATASETS[key].eager || skipped[key]) continue;
    await render(key, root.querySelector(`[data-card="${key}"]`));
  }

  async function render(key, card) {
    const host = card.querySelector(".demo-host");
    const badge = card.querySelector(".metric b");
    const detail = card.querySelector(".metric-detail");

    let data;
    try {
      data = await loadDataset(key);
    } catch (err) {
      host.innerHTML = `<pre class="err">could not load ${DATASETS[key].file}\n${escapeHtml(String(err))}</pre>`;
      badge.textContent = "load failed";
      // An on-demand card would otherwise be left with a disabled button
      // reading "loading…" for ever, with no way back.
      const loadBtn = card.querySelector(".load-btn");
      if (loadBtn) {
        loadBtn.disabled = false;
        loadBtn.textContent = "Retry";
      }
      return;
    }

    try { cleanups[key]?.(); } catch {}
    cleanups[key] = null;
    sorters[key] = null;
    host.innerHTML = "";

    // A demo that presents the whole dataset says nothing; one that caps or
    // windows it must say so, or the metric line claims rows it never showed.
    let renderedRows = data.rows.length;
    const ctx = {
      theme: theme(),
      key,
      formatCell,
      reportRows: (n) => { renderedRows = n; },
      provideSort: (fn) => { sorters[key] = fn; },
    };
    try {
      const { result, ms } = await timeRender(() => tables[key](host, data, ctx), host);
      cleanups[key] = typeof result === "function" ? result : null;
      badge.textContent = formatMs(ms);
      card.querySelector(".fps-btn").disabled = false;
      resetSort(key, card);
      detail.textContent =
        `${rowsLabel(renderedRows, data.numRows)} · ` +
        `load ${formatMs(data.timings.fetchMs + data.timings.decodeMs)} · ` +
        `${heapLabel()}`;
    } catch (err) {
      // A demo that throws reports it in its own card and does not take the
      // page down. A library failing on a dataset IS a result.
      host.innerHTML = `<pre class="err">${escapeHtml(String(err.stack || err))}</pre>`;
      badge.textContent = "failed";
      console.error(`[${meta.name}] ${key}`, err);
    }
  }

  /* Sort by price, timed. Each click puts the rows back in file order first,
   * untimed, so every run sorts the same input: a second ascending sort of
   * already-sorted rows would be a much cheaper, different job. The card keeps
   * every run and shows the median. */
  function resetSort(key, card) {
    sortRuns[key] = [];
    const btn = card.querySelector(".sort-btn");
    if (!btn) return;
    const out = card.querySelector(".sort-out");
    btn.disabled = !sorters[key];
    out.textContent = sorters[key] ? "" : "no sort in this demo";
  }

  async function runSort(key, card) {
    const sorter = sorters[key];
    if (!sorter) return;
    const btn = card.querySelector(".sort-btn");
    const out = card.querySelector(".sort-out");
    const host = card.querySelector(".demo-host");
    btn.disabled = true;
    out.textContent = "sorting…";
    try {
      await sorter(null);
      await nextFrame();
      const { ms } = await timeRender(() => sorter("price"), host);
      const runs = sortRuns[key];
      runs.push(ms);
      out.dataset.median = String(median(runs));
      out.dataset.runs = String(runs.length);
      out.textContent = runs.length === 1
        ? `sorted in ${formatMs(ms)}`
        : `sorted in ${formatMs(ms)} · median of ${runs.length}: ${formatMs(median(runs))}`;
    } catch (err) {
      out.textContent = `sort failed: ${err.message || err}`;
      console.error(`[${meta.name}] sort`, err);
    }
    btn.disabled = false;
  }

  async function runFps(card) {
    const btn = card.querySelector(".fps-btn");
    const out = card.querySelector(".fps-out");
    btn.disabled = true;
    out.textContent = "measuring…";
    const { fps, droppedFrames } = await measureScrollFps(scrollerOf(card));
    out.textContent = `${fps} fps · ${droppedFrames} dropped`;
    btn.disabled = false;
  }

  if (entry?.edit) await renderEdit(root.querySelector('[data-card="edit"]'), edit, meta);

  onThemeChange(() => {
    for (const key of keys) {
      if (skipped[key]) continue;
      const card = root.querySelector(`[data-card="${key}"]`);
      if (card.querySelector(".metric b").textContent !== "—") render(key, card);
    }
  });
}

/** The hero's size figure comes from /bundles.json, which the build writes,
 *  the same source as the front page. The dev server has no file until after
 *  a build, so the cell keeps its dash. */
function fillBundleSize(root, key) {
  const cells = root.querySelectorAll("[data-bundle]");
  if (!cells.length) return;
  fetch("/bundles.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((b) => {
      const d = b?.demos?.[key];
      if (!d) return;
      // Same qualifiers as the comparison table: what else the page must load
      // for the grid to draw is named, not left out.
      const extra = [
        d.lazyKB > 0 && `+ ${Math.round(d.lazyKB)} kB lazy`,
        d.reactKB > 0 && `+ React ${Math.round(d.reactKB)} kB`,
        d.wasmKB > 0 && `+ ${(d.wasmKB / 1000).toFixed(1)} MB WASM`,
      ].filter(Boolean);
      const kb = Math.round(d.libKB - d.harnessKB);
      for (const el of cells) el.textContent = [`${kb} kB`, ...extra].join(" ");
    })
    .catch(() => {});
}

/** Each copy button copies the text of the element its data-copy-target
 *  selector names, inside the same block. */
function wireCopyButtons(root) {
  for (const btn of root.querySelectorAll(".copy-btn")) {
    btn.addEventListener("click", async () => {
      const text = btn.closest("[data-copy-block]")?.querySelector(btn.dataset.copyTarget)?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied";
      } catch {
        btn.textContent = "Select and copy";
      }
      setTimeout(() => { btn.textContent = "Copy"; }, 1500);
    });
  }
}

/* ---------------------------------------------------------------- */

/** The page's demo key, from /demos/<key>.html. */
function demoKey() {
  return location.pathname.split("/").pop().replace(/\.html$/, "");
}

/** The edit test card (see (6) in the contract). Not timed: the result is
 *  what a user can do, not how fast. */
async function renderEdit(card, edit, meta) {
  if (!card || !edit) return;
  const host = card.querySelector(".demo-host");
  const readout = card.querySelector(".edit-readout b");
  let data;
  try {
    data = await loadDataset("small");
  } catch (err) {
    host.innerHTML = `<pre class="err">${escapeHtml(String(err))}</pre>`;
    return;
  }
  const rows = data.rows.map((r) => ({ ...r }));
  const copy = { ...data, rows };
  const price = data.columns.find((c) => c.name === "price");
  const show = () => {
    readout.textContent = rows.slice(0, 3).map((r) => formatCell(r.price, price)).join(" · ");
  };
  let cleanup = null;
  const draw = async () => {
    try { cleanup?.(); } catch {}
    host.innerHTML = "";
    // Tabulator's range selection focuses its first cell as it builds, which
    // scrolls the page to the edit card on load. Put the page back where the
    // reader had it, now and once more after the library's next frame.
    const y = scrollY;
    const restore = () => { if (scrollY !== y) scrollTo(0, y); };
    try {
      const result = await edit(host, copy, { theme: theme(), key: "small", formatCell, reportRows: () => {}, provideSort: () => {} });
      cleanup = typeof result === "function" ? result : null;
    } catch (err) {
      host.innerHTML = `<pre class="err">${escapeHtml(String(err.stack || err))}</pre>`;
      console.error(`[${meta.name}] edit`, err);
    }
    restore();
    requestAnimationFrame(() => requestAnimationFrame(restore));
  };
  await draw();
  show();
  // Libraries write edits into the row objects on their own schedule, so
  // the readout polls rather than hooking each library's change event.
  setInterval(show, 400);
  onThemeChange(draw);
}

/** The embed used by the front page gallery: one dataset, one host filling
 *  the iframe, nothing else. Reports the render time to the parent window
 *  (`{ type: "tb:rendered", key, ms }`) and follows the parent's theme
 *  (`{ type: "tb:theme", value: "light" | "dark" | null }`). */
async function mountBare({ meta, tables, setup, root, dataset }) {
  const key = DATASETS[dataset] ? dataset : "small";
  document.documentElement.classList.add("bare");
  root.innerHTML = `<div class="demo-host bare-host"></div>`;
  const host = root.querySelector(".demo-host");
  let cleanup = null;

  const post = (msg) => { if (parent !== window) parent.postMessage({ demo: meta.name, key, ...msg }, "*"); };

  let setupMs = null;
  async function render() {
    if (setup && setupMs === null) {
      try { setupMs = await timeSetup(setup); } catch (err) {
        host.innerHTML = `<pre class="err">${escapeHtml(String(err))}</pre>`;
        post({ type: "tb:failed" });
        return;
      }
    }
    let data;
    try {
      data = await loadDataset(key);
    } catch (err) {
      host.innerHTML = `<pre class="err">${escapeHtml(String(err))}</pre>`;
      post({ type: "tb:failed" });
      return;
    }
    try { cleanup?.(); } catch {}
    cleanup = null;
    host.innerHTML = "";
    const ctx = { theme: theme(), key, formatCell, reportRows: () => {}, provideSort: () => {} };
    try {
      const { result, ms } = await timeRender(() => tables[key](host, data, ctx), host);
      cleanup = typeof result === "function" ? result : null;
      post({ type: "tb:rendered", ms, setupMs });
    } catch (err) {
      host.innerHTML = `<pre class="err">${escapeHtml(String(err.stack || err))}</pre>`;
      post({ type: "tb:failed" });
    }
  }

  addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "tb:theme") return;
    if (e.data.value === "light" || e.data.value === "dark") {
      document.documentElement.setAttribute("data-theme", e.data.value);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  });
  onThemeChange(() => render());
  await render();
}

/** What the badge should report is the wait a user actually experiences, so the
 *  measured span covers two things time() alone would miss:
 *
 *  1. A render that returns a promise — a React root, Perspective's
 *     viewer.load — would otherwise report the microseconds it took to
 *     schedule its own work.
 *  2. innerHTML and appendChild return before the browser has laid anything
 *     out. Reading offsetHeight forces that layout inside the clock. It is the
 *     dominant cost for a plain <table> (6s of the baseline's 7.7s at 100k
 *     rows) and near zero for a virtualizing grid — which is exactly the
 *     difference this site exists to show. Deferring it would have flattered
 *     every library equally but hidden the whole effect. */
async function timeRender(fn, host) {
  const { result: raw, ms: syncMs } = time(fn);
  const t0 = performance.now();
  const result = raw && typeof raw.then === "function" ? await raw : raw;
  void host.offsetHeight;
  return { result, ms: syncMs + (performance.now() - t0) };
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** A demo's one-off setup (see (4) in the contract). Same clock as a render,
 *  without the layout flush, since nothing is on screen yet. */
async function timeSetup(setup) {
  const t0 = performance.now();
  await setup();
  return performance.now() - t0;
}

/** Libraries that own their own viewport (AG Grid, Glide) scroll an element
 *  inside the host, not the host itself. Such a demo marks that element with
 *  `data-scroller` — see (1) in the contract at the top of this file.
 *
 *  Perspective's scroller is two open shadow roots down inside a web
 *  component, where an ordinary querySelector cannot see it, so the search
 *  descends into any shadow root it meets. Every other demo marks an element
 *  in the light DOM and is found by the first query. */
function scrollerOf(card) {
  const host = card.querySelector(".demo-host");
  return host.querySelector("[data-scroller]") || findInShadow(host) || host;
}

function findInShadow(root) {
  for (const el of root.querySelectorAll("*")) {
    if (!el.shadowRoot) continue;
    const hit = el.shadowRoot.querySelector("[data-scroller]") || findInShadow(el.shadowRoot);
    if (hit) return hit;
  }
  return null;
}

/** Say what was actually put on screen. A demo that showed everything gets the
 *  plain count; one that capped gets both numbers, because "500,000 rows" next
 *  to a render time is a claim about work that was not done. */
function rowsLabel(rendered, total) {
  return rendered < total
    ? `${rendered.toLocaleString()} of ${total.toLocaleString()} rows`
    : `${total.toLocaleString()} rows`;
}

/** Chrome serves a fixed placeholder heap unless it is started with
 *  --enable-precise-memory-info, so on an ordinary browser there is no number
 *  to show. Say that, rather than dropping the clause: a missing figure with no
 *  explanation reads as an oversight, and the next task along needs to know the
 *  measurement is unavailable rather than zero. */
function heapLabel() {
  const mb = peakMemoryMB();
  return mb === null
    ? "heap n/a (needs Chrome --enable-precise-memory-info)"
    : `heap ${mb} MB`;
}

/** Resolve the optional `source` export — one shared function, or a per-key
 *  map — to the implementation behind this dataset's entry point. */
function sourceFor(source, key) {
  if (!source) return null;
  return typeof source === "function" ? source : source[key] || null;
}

const DEMOS = [
  { key: "baseline", name: "Plain &lt;table&gt;" },
  { key: "observable", name: "Observable" },
  { key: "tabulator", name: "Tabulator" },
  { key: "aggrid", name: "AG Grid" },
  { key: "tanstack", name: "TanStack" },
  { key: "glide", name: "Glide" },
  { key: "perspective", name: "Perspective" },
  { key: "datatables", name: "DataTables" },
  { key: "revogrid", name: "RevoGrid" },
];

export function navbar() {
  return `
<nav class="nav">
  <div class="wrap nav__inner">
    <a class="nav__brand" href="/index.html">Tables Bakeoff</a>
    <div class="nav__links">
      <a href="/compare.html">Compare</a>
      <a href="/why.html">Why</a>
      <a class="nav__sep" href="/demos/baseline.html">Plain &lt;table&gt;</a>
      <a href="/demos/observable.html">Observable</a>
      <a href="/demos/tabulator.html">Tabulator</a>
      <a href="/demos/aggrid.html">AG Grid</a>
      <a href="/demos/tanstack.html">TanStack</a>
      <a href="/demos/glide.html">Glide</a>
      <a href="/demos/perspective.html">Perspective</a>
      <a href="/demos/datatables.html">DataTables</a>
      <a href="/demos/revogrid.html">RevoGrid</a>
      <a class="nav__sep" href="/changelog.html">Changelog</a>
    </div>
    <div class="nav__tools">
      <a href="https://github.com/datasets/tables-bakeoff" target="_blank" rel="noopener" title="GitHub repository">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>
      <button class="toggle" type="button" aria-label="Theme"></button>
    </div>
  </div>
</nav>`;
}

export function footer() {
  return `
  <footer style="border-top:1px solid var(--border);margin-top:60px;padding:40px 0;color:var(--text-muted);font-size:12px">
    <div class="wrap" style="text-align:center">
      Built by <a href="https://datahub.io" target="_blank" rel="noopener" style="color:var(--text-secondary);text-decoration:none;font-weight:500">DataHub</a>, which needed a table and picked one.
      The picks are on the <a href="/index.html" style="color:var(--text-secondary);font-weight:500">front page</a>, every number on <a href="/compare.html" style="color:var(--text-secondary);font-weight:500">Compare</a>.
    </div>
  </footer>`;
}

function shell({ meta, entry, hasEdit, keys, skipped, verdict, snippet }) {
  // meta values are escaped: the baseline's own name is literally "Plain
  // <table>", which would otherwise open a real element in the header. Notes
  // go through the changelog's small Markdown renderer, which escapes HTML
  // first, so a demo can write its notes as a short bullet list.
  const e = escapeHtml;
  // Short on purpose: the nav already has the library list, and the package
  // name is in the Get started block's install line.
  const links = [
    snippet ? `<a href="#get-started">get started</a>` : null,
    `<a href="${e(meta.docs)}" target="_blank" rel="noopener">docs</a>`,
    // Stars come from results.js, the same figure the front page prints.
    meta.github ? `<a href="${e(meta.github)}" target="_blank" rel="noopener"${entry?.stars ? ` title="GitHub stars, ${e(STARS_CHECKED)}"` : ""}>github${entry?.stars ? ` · ${entry.stars.toLocaleString("en-US")} ★` : ""}</a>` : null,
    meta.homepage ? `<a href="${e(meta.homepage)}" target="_blank" rel="noopener">home</a>` : null,
    meta.notes ? `<a href="#notes">notes from the build</a>` : null,
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");

  return `
  ${navbar()}
  <header class="wrap hero">
    <h1 class="hero__title">${e(meta.name)}
      ${meta.version && meta.version !== "—" ? `<span class="hero__version">v${e(meta.version)}</span>` : ""}
    </h1>
    <p class="hero__tagline">${e(meta.tagline)}</p>
    <p class="hero__links">${links}${meta.license && meta.license !== "n/a" ? ` &nbsp;·&nbsp; ${e(meta.license)}` : ""}</p>
    ${verdict && entry ? verdictHTML(verdict, entry) : ""}
    <p class="setup-line" hidden>${e(meta.setupLabel || "setup")} in <b>…</b>
      <span>${e(meta.setupNote || "once per page, before any table; not included in the render times below")}</span></p>
  </header>
  <main class="wrap" style="padding-bottom:60px">
    ${keys.map((k) => cardHTML(k, skipped[k])).join("")}
    ${entry?.edit ? editCardHTML(entry.edit, hasEdit) : ""}
    ${snippet ? startHTML(snippet, meta) : ""}
    ${meta.notes ? `<section class="demo-notes-section" id="notes"><h2>Notes from the build</h2><div class="demo-notes">${renderMarkdown(meta.notes)}</div></section>` : ""}
  </main>
  ${footer()}`;
}

/** The verdict at the top of the page: where this library landed in the
 *  picks, one sentence on why, the five numbers that matter, the reasons
 *  for and against, and the trap to know about. */
function verdictHTML(v, entry) {
  const e = escapeHtml;
  const list = (items) => `<ul>${items.map((s) => `<li>${e(s)}</li>`).join("")}</ul>`;
  return `
    <section class="verdict" aria-label="Verdict">
      <p class="verdict__role">${e(v.role)}</p>
      <p class="verdict__line">${e(v.line)}</p>
      ${statsHTML(entry)}
      <div class="verdict__cases">
        <div class="verdict__case verdict__case--use"><h2>Use it if</h2>${list(v.use)}</div>
        <div class="verdict__case verdict__case--skip"><h2>Skip it if</h2>${list(v.skip)}</div>
      </div>
      ${v.watch ? `<p class="verdict__watch"><b>Watch out:</b> ${e(v.watch)}</p>` : ""}
    </section>`;
}

/** The figures a reader asks about first, from results.js and bundles.json.
 *  A `sub` is the caveat under the number (the plain table's "100,000 rows"). */
function statsHTML(entry) {
  const e = escapeHtml;
  const cell = (label, v) => `<div class="stat"><dt>${label}</dt><dd>${e(v.text)}${v.sub ? `<small>${e(v.sub)}</small>` : ""}</dd></div>`;
  return `
      <dl class="stats">
        ${cell("Render 500,000 rows", entry.render500k)}
        ${cell("Sort 500,000 rows", entry.sort500k)}
        ${cell("Scroll", entry.fps)}
        <div class="stat"><dt>Size, gzip</dt><dd data-bundle>—</dd></div>
        ${cell("Framework", { text: frameworkLabel(entry.framework) })}
      </dl>`;
}

/** results.js says "none" for a library that needs no framework, which on
 *  its own reads as "works with none". It works with any, which is the point. */
function frameworkLabel(f) {
  if (f === "none") return "any";
  if (f === "none (web component)") return "any (web component)";
  return f;
}

/** The "Get started" block: the install line and the smallest complete
 *  starter, each with a copy button. The code the demo on this page took is
 *  still under "source" on each card. */
function startHTML(snippet, meta) {
  const e = escapeHtml;
  return `
  <section class="card start" id="get-started" data-copy-block>
    <div class="card__head">
      <h2 class="card__title">Get started with ${e(meta.name)}</h2>
      <p class="card__desc">${snippet.install ? "Install, then the" : "The"} smallest table from an array of row objects. The code this page's demo took is under "source" on each card above.</p>
    </div>
    ${snippet.install ? `<div class="start__install" data-copy-block>
      <code class="start__cmd">${e(snippet.install)}</code>
      <button class="copy-btn" type="button" data-copy-target=".start__cmd">Copy</button>
    </div>` : ""}
    <div class="start__code" data-copy-block>
      <div class="start__bar"><span class="start__lang">${e(snippet.lang)}</span><button class="copy-btn" type="button" data-copy-target="pre">Copy</button></div>
      <pre>${e(snippet.code)}</pre>
    </div>
  </section>`;
}

function editCardHTML(result, hasEdit) {
  const line = (label, r) =>
    `<li><b>${label}:</b> ${escapeHtml(EDIT_STATUS[r.status])}${
      !r.text ? "" : r.status === "yes" ? ` (${escapeHtml(r.text)})` : `: ${escapeHtml(r.text)}`
    }</li>`;
  return `
  <section class="card" id="edit" data-card="edit" style="margin-top:24px;scroll-margin-top:16px">
    <div class="card__head">
      <h2 class="card__title">Edit test: change a price, paste a column</h2>
      <p class="card__desc">${hasEdit
        ? "The small dataset with Price editable. Double-click a price, type a number, press Enter. Then copy the three numbers below, click a price cell and paste (Ctrl/Cmd-V): they should fill that cell and the two below it."
        : "No editable grid here: see the result below."}</p>
      <ul class="edit-result">
        ${line("Double-click to edit", result.dblclick)}
        ${line("Paste a column of three values", result.paste)}
      </ul>
    </div>
    ${hasEdit ? `<div class="demo-host"></div>
    <div class="card__actions edit-actions">
      <label>Copy these: <textarea readonly rows="3" cols="8" class="edit-paste">111111
222222
333333</textarea></label>
      <span class="edit-readout">First three prices in the data now: <b>…</b></span>
    </div>` : `<div style="height:14px"></div>`}
  </section>`;
}

/** One dataset card. `skipNote` (Markdown) replaces the table and its
 *  buttons with a note; see (7) in the contract. */
function cardHTML(key, skipNote) {
  const d = DATASETS[key];
  const body = skipNote
    ? `<div class="skip-note">${renderMarkdown(skipNote)}</div>`
    : `<div class="demo-host${key === "large" ? " demo-host--tall" : ""}"></div>
    <div class="card__actions">
      ${d.eager ? "" : `<button class="load-btn">Load ${key === "large" ? "500,000 rows" : "data"}</button>`}
      <button class="fps-btn">Measure scroll FPS</button>
      <span class="fps-out"></span>
      ${key === "large" ? `<button class="sort-btn">Sort by price</button><span class="sort-out"></span>` : ""}
    </div>`;
  return `
  <section class="card" id="${key}" data-card="${key}" style="margin-top:24px;scroll-margin-top:16px">
    <div class="card__head">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <h2 class="card__title">${d.title}</h2>
        <span class="metric">rendered <b>${skipNote ? "not run" : "—"}</b></span>
      </div>
      <p class="card__desc">${d.desc}</p>
      <p class="card__desc" style="color:var(--text-muted)"><b style="font-weight:600">Stresses:</b> ${d.stress}</p>
      <p class="metric-detail" style="font-size:12px;color:var(--text-muted);margin:6px 0 0"></p>
    </div>
    ${body}
    <details class="src"><summary>source</summary><pre></pre></details>
  </section>`;
}

/** Build the source panel. `entry` is tables[key]; `impl` is the optional
 *  `source` export. Nearly every demo shares one implementation across the four
 *  datasets, which makes `entry` a one-line delegating stub — on its own it
 *  shows the reader nothing about how the table is built. Printing both keeps
 *  the per-dataset arguments visible (the baseline's 100,000-row cap is only in
 *  the stub) while the body below it is the code that actually runs. */
function sourceOf(entry, impl) {
  const head = printFn(entry);
  if (!impl || impl === entry) return head;
  return `${head}\n\n${printFn(impl)}`;
}

/** Print a function's source with the common indent stripped, so the panel
 *  shows what you would actually write. */
function printFn(fn) {
  const lines = fn.toString().replace(/\t/g, "  ").split("\n");
  const indents = lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const min = Math.min(...indents, Infinity);
  return lines.map((l, i) => (i === 0 ? l : l.slice(min))).join("\n").trim();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
