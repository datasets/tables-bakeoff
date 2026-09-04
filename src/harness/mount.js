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
 *   mountDemo({ meta, tables });
 *
 * Each render function is called as `fn(host, dataset, ctx)` where
 *   host    — an empty scrolling <div class="demo-host">, already sized.
 *   dataset — Task 3's { key, rows, numRows, columns, timings }; `columns` are
 *             { name, type: 'string'|'number'|'date', align: 'left'|'right' }.
 *   ctx     — { theme, key, formatCell }:
 *               theme      the live token object from theme.js — `theme.dark`
 *                          is the light/dark discriminator, plus palette,
 *                          surface, page, text, grid, fontSans, fontMono.
 *               key        the dataset key, for demos that share one function.
 *               formatCell the single shared formatter; use it for every cell
 *                          so differences on screen come from the library.
 * It may return nothing, or a cleanup function, or a promise of either. The
 * promise is awaited inside the timed region, so async mounts (a React root,
 * Perspective's viewer.load) report their true cost. Cleanup runs before the
 * card re-renders on a theme change. */

import { DATASETS, DATASET_KEYS } from "../data/datasets.js";
import { loadDataset, formatCell } from "../data/load.js";
import { time, formatMs, measureScrollFps, peakMemoryMB } from "./metrics.js";
import { theme, onThemeChange, installThemeToggle, restoreTheme } from "./theme.js";

restoreTheme();

export async function mountDemo({ meta, tables }) {
  document.title = `${meta.name} — tables-evaluation`;
  const root = document.getElementById("app");
  root.innerHTML = shell(meta);
  installThemeToggle(root.querySelector(".toggle"));

  const cleanups = {};

  for (const key of DATASET_KEYS) {
    const card = root.querySelector(`[data-card="${key}"]`);
    card.querySelector(".src pre").textContent = sourceOf(tables[key]);

    const fpsBtn = card.querySelector(".fps-btn");
    // Nothing to scroll until a table exists; an FPS number for an empty box
    // would be a meaningless 60.
    fpsBtn.disabled = true;
    fpsBtn.addEventListener("click", () => runFps(card));

    if (DATASETS[key].eager) {
      render(key, card);
    } else {
      card.querySelector(".load-btn").addEventListener("click", (e) => {
        e.target.disabled = true;
        e.target.textContent = "loading…";
        render(key, card);
      });
    }
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
      return;
    }

    try { cleanups[key]?.(); } catch {}
    cleanups[key] = null;
    host.innerHTML = "";

    const ctx = { theme: theme(), key, formatCell };
    try {
      const { result, ms } = await timeRender(() => tables[key](host, data, ctx), host);
      cleanups[key] = typeof result === "function" ? result : null;
      badge.textContent = formatMs(ms);
      card.querySelector(".fps-btn").disabled = false;
      const mem = peakMemoryMB();
      detail.textContent =
        `${data.numRows.toLocaleString()} rows · ` +
        `load ${formatMs(data.timings.fetchMs + data.timings.decodeMs)}` +
        (mem === null ? "" : ` · heap ${mem} MB`);
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
 *  `data-scroller` and the FPS run drives the right thing. */
function scrollerOf(card) {
  const host = card.querySelector(".demo-host");
  return host.querySelector("[data-scroller]") || host;
}

function shell(meta) {
  // meta values are escaped: the baseline's own name is literally "Plain
  // <table>", which would otherwise open a real element in the header.
  const e = escapeHtml;
  return `
  <header class="wrap" style="padding-top:22px;padding-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
      <a href="/index.html" style="font-size:13px;color:var(--text-secondary)">← all libraries</a>
      <button class="toggle"></button>
    </div>
    <h1 style="margin:14px 0 4px;font-size:26px;letter-spacing:-0.02em">${e(meta.name)}
      <span style="font-size:14px;color:var(--text-muted);font-weight:400">v${e(meta.version)}</span>
    </h1>
    <p style="margin:0;max-width:70ch;color:var(--text-secondary);font-size:14px">${e(meta.tagline)}</p>
    <p style="margin:10px 0 0;font-size:12.5px;color:var(--text-muted)">
      <a href="${e(meta.docs)}" target="_blank" rel="noopener">docs</a>
      ${meta.npm ? `&nbsp;·&nbsp; <code>${e(meta.npm)}</code>` : ""}
      &nbsp;·&nbsp; ${e(meta.license)}
    </p>
    ${meta.notes ? `<p style="margin:8px 0 0;font-size:12.5px;color:var(--text-secondary);max-width:75ch">${e(meta.notes)}</p>` : ""}
  </header>
  <main class="wrap" style="padding-bottom:60px">
    ${DATASET_KEYS.map(cardHTML).join("")}
  </main>`;
}

function cardHTML(key) {
  const d = DATASETS[key];
  return `
  <section class="card" data-card="${key}" style="margin-top:24px">
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

/** Print a render function's source with the common indent stripped, so the
 *  source panel shows what you would actually write. */
function sourceOf(fn) {
  const lines = fn.toString().replace(/\t/g, "  ").split("\n");
  const indents = lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const min = Math.min(...indents, Infinity);
  return lines.map((l, i) => (i === 0 ? l : l.slice(min))).join("\n").trim();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
