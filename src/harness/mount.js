/* The shared demo-page framework. A library's page supplies four render
 * functions and gets an identical page: header, four cards, a live metrics
 * badge per card, and a source panel showing the exact code that ran.
 *
 * This is what makes the bake-off fair — every demo gets the same shell, the
 * same data, the same theme and the same formatter.
 *
 * THE CONTRACT every demo module implements:
 *
 *   export const meta   = { name, version, license, docs, tagline, notes?, npm };
 *   export const tables = { small, wide, medium, large };
 *   export const source = renderFn;   // optional, see (3) — usually wanted
 *   mountDemo({ meta, tables, source });
 *
 * Each render function is called as `fn(host, dataset, ctx)` where
 *   host    — an empty scrolling <div class="demo-host">, already sized.
 *   dataset — Task 3's { key, rows, numRows, columns, timings }; `columns` are
 *             { name, type: 'string'|'number'|'date', align: 'left'|'right' }.
 *   ctx     — { theme, key, formatCell, reportRows }:
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
 *     panel shows the stub followed by that implementation. */

import { DATASETS, DATASET_KEYS } from "../data/datasets.js";
import { loadDataset, formatCell } from "../data/load.js";
import { time, formatMs, measureScrollFps, peakMemoryMB } from "./metrics.js";
import { theme, onThemeChange, installThemeToggle, restoreTheme } from "./theme.js";

restoreTheme();

export async function mountDemo({ meta, tables, source }) {
  document.title = `${meta.name} — Tables Bakeoff`;
  const pageUrl = window.location.href.split('?')[0];
  const screenshotUrl = `https://screenshotit.app/${pageUrl}@social`;
  document.querySelector('meta[property="og:image"]')?.setAttribute('content', screenshotUrl);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${meta.name} — Tables Bakeoff`);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', meta.tagline);
  const root = document.getElementById("app");
  root.innerHTML = shell(meta);
  installThemeToggle(root.querySelector(".toggle"));

  const cleanups = {};

  // Wire every card before rendering any of them, so the large card's Load
  // button is live while the eager cards are still working.
  for (const key of DATASET_KEYS) {
    const card = root.querySelector(`[data-card="${key}"]`);
    card.querySelector(".src pre").textContent = sourceOf(tables[key], sourceFor(source, key));

    const fpsBtn = card.querySelector(".fps-btn");
    // Nothing to scroll until a table exists; an FPS number for an empty box
    // would be a meaningless 60.
    fpsBtn.disabled = true;
    fpsBtn.addEventListener("click", () => runFps(card));

    if (!DATASETS[key].eager) {
      card.querySelector(".load-btn").addEventListener("click", (e) => {
        e.target.disabled = true;
        e.target.textContent = "loading…";
        render(key, card);
      });
    }
  }

  // Sequentially, not concurrently. These timings are the product; one card's
  // parquet decode interleaving with another card's timed render on the same
  // thread would inflate whichever card lost the race, and the site would
  // publish the result as if it were the library's cost.
  for (const key of DATASET_KEYS) {
    if (!DATASETS[key].eager) continue;
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
    host.innerHTML = "";

    // A demo that presents the whole dataset says nothing; one that caps or
    // windows it must say so, or the metric line claims rows it never showed.
    let renderedRows = data.rows.length;
    const ctx = {
      theme: theme(),
      key,
      formatCell,
      reportRows: (n) => { renderedRows = n; },
    };
    try {
      const { result, ms } = await timeRender(() => tables[key](host, data, ctx), host);
      cleanups[key] = typeof result === "function" ? result : null;
      badge.textContent = formatMs(ms);
      card.querySelector(".fps-btn").disabled = false;
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

  async function runFps(card) {
    const btn = card.querySelector(".fps-btn");
    const out = card.querySelector(".fps-out");
    btn.disabled = true;
    out.textContent = "measuring…";
    const { fps, droppedFrames } = await measureScrollFps(scrollerOf(card));
    out.textContent = `${fps} fps · ${droppedFrames} dropped`;
    btn.disabled = false;
  }

  onThemeChange(() => {
    for (const key of DATASET_KEYS) {
      const card = root.querySelector(`[data-card="${key}"]`);
      if (card.querySelector(".metric b").textContent !== "—") render(key, card);
    }
  });
}

/* ---------------------------------------------------------------- */

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
];

export function navbar() {
  return `
  <nav style="border-bottom:1px solid var(--border);padding:12px 0">
    <div class="wrap" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
      <a href="/index.html" style="font-size:16px;font-weight:600;color:var(--text-primary);text-decoration:none">Tables Bakeoff</a>
      <div style="display:flex;gap:12px;align-items:center;font-size:13px">
        <a href="/demos/baseline.html" style="color:var(--text-secondary);text-decoration:none;padding:4px 8px">Plain &lt;table&gt;</a>
        <a href="/demos/observable.html" style="color:var(--text-secondary);text-decoration:none;padding:4px 8px">Observable</a>
        <a href="/demos/tabulator.html" style="color:var(--text-secondary);text-decoration:none;padding:4px 8px">Tabulator</a>
        <a href="/demos/aggrid.html" style="color:var(--text-secondary);text-decoration:none;padding:4px 8px">AG Grid</a>
        <a href="/demos/tanstack.html" style="color:var(--text-secondary);text-decoration:none;padding:4px 8px">TanStack</a>
        <a href="/demos/glide.html" style="color:var(--text-secondary);text-decoration:none;padding:4px 8px">Glide</a>
        <a href="/demos/perspective.html" style="color:var(--text-secondary);text-decoration:none;padding:4px 8px">Perspective</a>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <a href="https://github.com/datasets/tables-bakeoff" target="_blank" rel="noopener" title="GitHub repository" style="display:flex;align-items:center;color:var(--text-primary);text-decoration:none">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <button class="toggle"></button>
      </div>
    </div>
  </nav>`;
}

export function footer() {
  return `
  <footer style="border-top:1px solid var(--border);margin-top:60px;padding:40px 0;color:var(--text-muted);font-size:12px">
    <div class="wrap" style="text-align:center">
      Built with care by <a href="https://datopian.com" target="_blank" rel="noopener" style="color:var(--text-secondary);text-decoration:none;font-weight:500">Datopian</a>
    </div>
  </footer>`;
}

function shell(meta) {
  // meta values are escaped: the baseline's own name is literally "Plain
  // <table>", which would otherwise open a real element in the header.
  const e = escapeHtml;
  const links = [
    meta.homepage ? `<a href="${e(meta.homepage)}" target="_blank" rel="noopener">home</a>` : null,
    meta.github ? `<a href="${e(meta.github)}" target="_blank" rel="noopener">github${meta.stars ? ` · ${meta.stars.toLocaleString()} ★` : ""}</a>` : null,
    `<a href="${e(meta.docs)}" target="_blank" rel="noopener">docs</a>`,
    meta.npm ? `<code>${e(meta.npm)}</code>` : null,
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");

  return `
  ${navbar()}
  <header class="wrap" style="padding-top:22px;padding-bottom:10px">
    <h1 style="margin:14px 0 4px;font-size:26px;letter-spacing:-0.02em">${e(meta.name)}
      <span style="font-size:14px;color:var(--text-muted);font-weight:400">v${e(meta.version)}</span>
    </h1>
    <p style="margin:0;max-width:70ch;color:var(--text-secondary);font-size:14px">${e(meta.tagline)}</p>
    <p style="margin:10px 0 0;font-size:12.5px;color:var(--text-muted)">
      ${links} &nbsp;·&nbsp; ${e(meta.license)}
    </p>
    ${meta.notes ? `<p style="margin:8px 0 0;font-size:12.5px;color:var(--text-secondary);max-width:75ch">${e(meta.notes)}</p>` : ""}
  </header>
  <main class="wrap" style="padding-bottom:60px">
    ${DATASET_KEYS.map(cardHTML).join("")}
  </main>
  ${footer()}`;
}

function cardHTML(key) {
  const d = DATASETS[key];
  return `
  <section class="card" id="${key}" data-card="${key}" style="margin-top:24px;scroll-margin-top:16px">
    <div class="card__head">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <h2 class="card__title">${d.title}</h2>
        <span class="metric">rendered <b>—</b></span>
      </div>
      <p class="card__desc">${d.desc}</p>
      <p class="card__desc" style="color:var(--text-muted)"><b style="font-weight:600">Stresses:</b> ${d.stress}</p>
      <p class="metric-detail" style="font-size:12px;color:var(--text-muted);margin:6px 0 0"></p>
    </div>
    <div class="demo-host${key === "large" ? " demo-host--tall" : ""}"></div>
    <div class="card__actions">
      ${d.eager ? "" : `<button class="load-btn">Load ${key === "large" ? "500,000 rows" : "data"}</button>`}
      <button class="fps-btn">Measure scroll FPS</button>
      <span class="fps-out"></span>
    </div>
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
