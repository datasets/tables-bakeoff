/* The front page. Renders the gallery, the measured table and the scorecard
 * from src/harness/results.js (one place for every typed-in number), then
 * fills bundle size and lines written from the real build output in
 * /bundles.json, so those cannot drift from what shipped. */
import { restoreTheme, installThemeToggle, onThemeChange } from "./theme.js";
import { ENTRIES, AXES, MEASURED, NUMBER_WORDS } from "./results.js";

restoreTheme();
const toggleBtn = document.querySelector(".toggle");
if (toggleBtn) installThemeToggle(toggleBtn);

const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtMs = (ms) => (ms < 1 ? "<1 ms" : ms < 50 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (iso) => (iso ? `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "n/a");
const demoHref = (key) => `/demos/${key}.html`;

/* A measured cell: the value, an optional smaller second line, and a
 * data-verify flag when the number is from a run being repeated. */
function cell(m, extraClass = "") {
  if (!m) return `<td class="${extraClass}">n/a</td>`;
  const verify = m.verify ? ' data-verify="true"' : "";
  const sub = m.sub ? `<span class="sub">${e(m.sub)}</span>` : "";
  return `<td class="${extraClass}"${verify}>${e(m.text)}${sub}</td>`;
}

/* ---- "nine" in the prose, from the list ------------------------------ */
for (const el of document.querySelectorAll("[data-entry-count]")) {
  el.textContent = NUMBER_WORDS[ENTRIES.length] || String(ENTRIES.length);
}
for (const el of document.querySelectorAll("[data-library-count]")) {
  el.textContent = NUMBER_WORDS[ENTRIES.length - 1] || String(ENTRIES.length - 1);
}
for (const el of document.querySelectorAll("[data-measured-machine]")) el.textContent = MEASURED.machine;
for (const el of document.querySelectorAll("[data-measured-when]")) el.textContent = MEASURED.when;

/* ---- gallery: the same 1,000 rows, one iframe per entry ----------------- */
const gallery = document.getElementById("gallery");
if (gallery) {
  gallery.innerHTML = ENTRIES.map((d, i) => `
    <article class="cell" data-lib="${e(d.key)}">
      <div class="cell__head">
        <a href="${demoHref(d.key)}">${e(d.name)}</a>
        <span class="cell__meta">
          <span data-bundle="${e(d.key)}">—</span> · <span data-loc="${e(d.key)}">—</span> lines
        </span>
      </div>
      <iframe title="${e(d.name)} rendering 1,000 property sales"
              loading="${i < 3 ? "eager" : "lazy"}" scrolling="no"
              src="${demoHref(d.key)}?bare=1&dataset=small"></iframe>
      <div class="cell__foot">rendered in <b data-ms>—</b> in your browser</div>
    </article>`).join("");

  const frames = [...gallery.querySelectorAll("iframe")];
  const cellOf = (win) => frames.find((f) => f.contentWindow === win)?.closest(".cell");
  addEventListener("message", (ev) => {
    const c = cellOf(ev.source);
    if (!c || !ev.data || typeof ev.data !== "object") return;
    if (ev.data.type === "tb:rendered") c.querySelector("[data-ms]").textContent = fmtMs(ev.data.ms);
    if (ev.data.type === "tb:failed") c.querySelector("[data-ms]").textContent = "failed";
  });

  // The embeds share localStorage with this page but only read it at load, so
  // a toggle here is forwarded to each frame.
  onThemeChange(() => {
    const value = document.documentElement.getAttribute("data-theme");
    for (const f of frames) f.contentWindow?.postMessage({ type: "tb:theme", value }, "*");
  });
}

/* ---- measured table ----------------------------------------------------- */
const measured = document.querySelector("#measured tbody");
if (measured) {
  measured.innerHTML = ENTRIES.map((d) => `
    <tr>
      <td><a href="${demoHref(d.key)}">${e(d.name)}</a>${d.note ? `<sup><a href="#note-${d.note}">${d.note}</a></sup>` : ""}
        ${d.version ? `<span class="sub">v${e(d.version)}${d.framework !== "none" ? ` · ${e(d.framework)}` : ""}</span>` : `<span class="sub">no library</span>`}</td>
      <td data-bundle="${e(d.key)}">—</td>
      <td data-wasm="${e(d.key)}">—</td>
      <td data-loc="${e(d.key)}">—</td>
      ${cell(d.render50k)}
      ${cell(d.render500k, d.render500k?.text?.startsWith("did not") ? "no" : "")}
      ${cell(d.fps)}
      <td>${month(d.released)}</td>
      <td class="lic">${e(d.license)}<span class="sub">paywalled: ${e(d.paywalled)}</span></td>
    </tr>`).join("");
}

/* ---- scorecard ------------------------------------------------------------ */
const scoreHead = document.querySelector("#scorecard thead tr");
const scoreBody = document.querySelector("#scorecard tbody");
if (scoreHead && scoreBody) {
  scoreHead.innerHTML =
    `<th>Library</th>` +
    AXES.map((a) => `<th title="${e(a.hint)}">${e(a.label)}</th>`).join("") +
    `<th class="why">In one line</th>`;
  scoreBody.innerHTML = ENTRIES.map((d) => `
    <tr>
      <td><a href="${demoHref(d.key)}">${e(d.name)}</a></td>
      ${AXES.map((a) => {
        const s = d.scores[a.key];
        return `<td class="${s === 5 ? "s5" : s === 1 ? "s1" : ""}">${s}</td>`;
      }).join("")}
      <td class="why">${e(d.line)}</td>
    </tr>`).join("");
}

/* ---- bundle size and lines written, from the build ------------------------ */
fetch("/bundles.json")
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
  .then(({ harness, demos }) => {
    const harnessSpan = document.querySelector("[data-harness]");
    if (harnessSpan) harnessSpan.textContent = `${fmt(harness.gzipKB)} kB`;

    // React is shared between the React demos; read its size off whichever
    // demo paid for it rather than hardcoding a figure that could drift.
    const reactDemo = Object.values(demos).find((d) => d.reactKB > 0);
    for (const el of document.querySelectorAll("[data-react]")) {
      if (reactDemo) el.textContent = `${fmt(reactDemo.reactKB)} kB`;
    }

    for (const [key, d] of Object.entries(demos)) {
      // "Own code" nets out the shared harness (mount + hyparquet + site.css,
      // paid by every demo) and, for the React demos, React itself.
      for (const el of document.querySelectorAll(`[data-bundle="${key}"]`)) {
        el.textContent = `${fmt(d.libKB - d.harnessKB)} kB`;
      }
      // Rounded variant for prose: "21 kB over React".
      for (const el of document.querySelectorAll(`[data-bundle-round="${key}"]`)) {
        el.textContent = `${Math.round(d.libKB - d.harnessKB)} kB`;
      }
      // Perspective's WASM is its own unit and is never summed with the kB column.
      for (const el of document.querySelectorAll(`[data-wasm="${key}"]`)) {
        el.textContent = d.wasmKB > 0 ? `${(d.wasmKB / 1000).toFixed(1)} MB` : "n/a";
      }
      for (const el of document.querySelectorAll(`[data-loc="${key}"]`)) el.textContent = String(d.loc);
    }
  })
  .catch(() => {
    // Dev server has no bundles.json until after a build. Leave the dashes
    // rather than throwing, and say why on hover.
    for (const el of document.querySelectorAll("[data-bundle],[data-bundle-round],[data-loc],[data-wasm]")) {
      el.title = "run npm run build to populate";
    }
  });
