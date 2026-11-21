/* The front page and the compare page. Renders the gallery, the measured
 * table (trimmed on the front page, full on compare.html), the feature table,
 * the edit test, the scorecard and the "get started" code from
 * src/harness/results.js, features.js and snippets.js (one place for every
 * typed-in number), then fills bundle size and lines written from the real
 * build output in /bundles.json, so those cannot drift from what shipped.
 * Every block is optional: a page renders whichever of the ids it has. */
import "./analytics.js";
import { restoreTheme, installThemeToggle, onThemeChange } from "./theme.js";
import { ENTRIES, AXES, MEASURED, NUMBER_WORDS, EDIT_STATUS, CHECKED } from "./results.js";
import { FEATURES, SUPPORT, FEATURES_CHECKED } from "./features.js";
import { SNIPPETS } from "./snippets.js";

restoreTheme();
const toggleBtn = document.querySelector(".toggle");
if (toggleBtn) installThemeToggle(toggleBtn);

const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtMs = (ms) => (ms < 1 ? "<1 ms" : ms < 50 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (iso) => (iso ? `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "n/a");
const demoHref = (key) => `/demos/${key}.html`;
const entry = (key) => ENTRIES.find((d) => d.key === key);

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
for (const el of document.querySelectorAll("[data-library-count-digit]")) el.textContent = String(ENTRIES.length - 1);
for (const el of document.querySelectorAll("[data-measured-machine]")) el.textContent = MEASURED.machine;
for (const el of document.querySelectorAll("[data-measured-when]")) el.textContent = MEASURED.when;
for (const el of document.querySelectorAll("[data-measured-sort]")) el.textContent = MEASURED.sort;
for (const el of document.querySelectorAll("[data-checked]")) el.textContent = CHECKED;
for (const el of document.querySelectorAll("[data-features-checked]")) el.textContent = FEATURES_CHECKED;

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
      <div class="cell__foot">rendered in <b data-ms>—</b> in your browser<span data-setup></span></div>
    </article>`).join("");

  const frames = [...gallery.querySelectorAll("iframe")];
  const cellOf = (win) => frames.find((f) => f.contentWindow === win)?.closest(".cell");
  addEventListener("message", (ev) => {
    const c = cellOf(ev.source);
    if (!c || !ev.data || typeof ev.data !== "object") return;
    if (ev.data.type === "tb:rendered") {
      c.querySelector("[data-ms]").textContent = fmtMs(ev.data.ms);
      // A one-off engine boot (Perspective's WASM) is reported beside the
      // render, not inside it and not left out.
      const boot = c.querySelector("[data-setup]");
      if (boot && ev.data.setupMs != null) boot.textContent = ` · engine boot ${fmtMs(ev.data.setupMs)} first`;
    }
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
/* The front page's table carries data-trim and shows the columns that decide
 * a pick: weight, lines, render and sort at 500,000 rows, last release. The
 * compare page shows everything. Both render every entry. */
const measuredTable = document.getElementById("measured");
const measured = measuredTable?.querySelector("tbody");
if (measuredTable && measured) {
  const trim = measuredTable.hasAttribute("data-trim");
  const name = (d) => `<td><a href="${demoHref(d.key)}">${e(d.name)}</a>${!trim && d.note ? `<sup><a href="#note-${d.note}">${d.note}</a></sup>` : ""}
        ${d.version ? `<span class="sub">v${e(d.version)}${d.framework !== "none" ? ` · ${e(d.framework)}` : ""}</span>` : `<span class="sub">no library</span>`}</td>`;
  const failed = (d) => (d.render500k?.text?.startsWith("did not") ? "no" : "");
  measured.innerHTML = ENTRIES.map((d) => trim ? `
    <tr>
      ${name(d)}
      <td data-bundle="${e(d.key)}">—</td>
      <td data-loc="${e(d.key)}">—</td>
      ${cell(d.render500k, failed(d))}
      ${cell(d.sort500k)}
      <td>${month(d.released)}</td>
    </tr>` : `
    <tr>
      ${name(d)}
      <td data-bundle="${e(d.key)}">—</td>
      <td data-wasm="${e(d.key)}">—</td>
      <td data-loc="${e(d.key)}">—</td>
      ${cell(d.render50k)}
      ${cell(d.render500k, failed(d))}
      ${cell(d.sort500k)}
      ${cell(d.fps)}
      ${cell(d.textSelect)}
      ${cell(d.kbSort)}
      <td>${month(d.released)}</td>
      <td class="lic">${e(d.license)}<span class="sub">paywalled: ${e(d.paywalled)}</span></td>
    </tr>`).join("");
}

/* ---- feature table ----------------------------------------------------------- */
/* Rows are features, columns are libraries. data-libs="a,b,c" limits the
 * columns (the front page shows the picks); without it every entry is a
 * column. data-notes prints each cell's note under its verdict. */
const SUPPORT_LABEL = { yes: "yes", config: "config", paid: "paid", no: "no", diy: "yours to write" };
const features = document.getElementById("features");
if (features) {
  const libs = (features.dataset.libs ? features.dataset.libs.split(",") : ENTRIES.map((d) => d.key))
    .map((k) => entry(k.trim())).filter(Boolean);
  const notes = features.hasAttribute("data-notes");
  const head = features.querySelector("thead tr");
  const body = features.querySelector("tbody");
  head.innerHTML = `<th>Feature</th>` + libs.map((d) => `<th><a href="${demoHref(d.key)}">${e(d.name)}</a></th>`).join("");
  body.innerHTML = FEATURES.map((f) => `
    <tr>
      <td class="feat"${f.help ? ` title="${e(f.help)}"` : ""}>${e(f.label)}${notes && f.help ? `<span class="sub">${e(f.help)}</span>` : ""}</td>
      ${libs.map((d) => {
        const s = SUPPORT[d.key]?.[f.key];
        if (!s) return `<td class="f-unknown">—</td>`;
        const note = s.note ? (notes ? `<span class="sub">${e(s.note)}</span>` : "") : "";
        const title = s.note && !notes ? ` title="${e(s.note)}"` : "";
        return `<td class="f-${e(s.v)}"${title}><b>${e(SUPPORT_LABEL[s.v] || s.v)}</b>${note}</td>`;
      }).join("")}
    </tr>`).join("");
}

/* ---- get started: copy-and-paste code per pick ----------------------------- */
/* data-picks="key:label,key:label" names the blocks in order. A pick with no
 * snippet yet says so rather than vanishing. */
const snippets = document.getElementById("snippets");
if (snippets) {
  const picks = (snippets.dataset.picks || "").split(",").map((p) => {
    const [key, ...label] = p.split(":");
    return { key: key.trim(), label: label.join(":").trim() };
  }).filter((p) => entry(p.key));
  snippets.innerHTML = picks.map(({ key, label }) => {
    const d = entry(key);
    const s = SNIPPETS[key];
    return `
    <article class="snippet" data-lib="${e(key)}">
      <div class="snippet__head">
        <span class="snippet__use">${e(label)}</span>
        <h3><a href="${demoHref(key)}">${e(d.name)}</a></h3>
      </div>
      ${s ? `
      ${s.install ? `<pre class="snippet__install"><code>${e(s.install)}</code></pre>` : ""}
      <pre class="snippet__code" data-lang="${e(s.lang || "")}"><code>${e(s.code)}</code></pre>
      <div class="snippet__foot">
        <button type="button" class="copy" data-copy>Copy</button>
        <a href="${demoHref(key)}">The demo and its full code</a>
      </div>` : `
      <p class="snippet__missing">Starter code for ${e(d.name)} is on its <a href="${demoHref(key)}">demo page</a>.</p>`}
    </article>`;
  }).join("");

  snippets.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-copy]");
    if (!btn) return;
    const code = btn.closest(".snippet").querySelector(".snippet__code code")?.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Select and copy";
    }
    setTimeout(() => { btn.textContent = "Copy"; }, 1600);
  });
}

/* ---- edit test -------------------------------------------------------------- */
const edits = document.querySelector("#edits tbody");
if (edits) {
  const verdict = (r) =>
    `<b class="${r.status === "paid" ? "paid" : ""}">${e(EDIT_STATUS[r.status])}</b><span class="sub">${e(r.text)}</span>`;
  edits.innerHTML = ENTRIES.filter((d) => d.edit).map((d) => `
    <tr>
      <td><a href="${demoHref(d.key)}#edit">${e(d.name)}</a></td>
      <td>${verdict(d.edit.dblclick)}</td>
      <td>${verdict(d.edit.paste)}</td>
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
      <td><a href="${demoHref(d.key)}">${e(d.name)}</a><span class="sub why-inline">${e(d.line)}</span></td>
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

    // An entry in results.js whose demo is not in this build is said so,
    // in place, rather than shown with dashes or dropped.
    for (const d of ENTRIES) {
      if (demos[d.key]) continue;
      const c = document.querySelector(`#gallery .cell[data-lib="${d.key}"]`);
      if (c) c.querySelector("iframe").replaceWith(Object.assign(document.createElement("p"), { className: "cell__missing", textContent: "Demo not in this build yet." }));
      for (const el of document.querySelectorAll(`[data-bundle="${d.key}"],[data-loc="${d.key}"],[data-wasm="${d.key}"]`)) el.textContent = "not built";
    }

    const fullTable = measuredTable && !measuredTable.hasAttribute("data-trim");
    for (const [key, d] of Object.entries(demos)) {
      // "Own code" nets out the shared harness (mount + hyparquet + site.css,
      // paid by every demo) and, for the React demos, React itself. Code
      // fetched on demand after load is shown beside it, not summed: for
      // RevoGrid most of it arrives on first render, for Glide it is editors.
      for (const el of document.querySelectorAll(`[data-bundle="${key}"]`)) {
        el.textContent = `${fmt(d.libKB - d.harnessKB)} kB`;
        if (d.lazyKB > 0 && el.closest("#measured")) el.insertAdjacentHTML("beforeend", `<span class="sub">+ ${fmt(d.lazyKB)} kB lazy</span>`);
        const sub = entry(key)?.bundleSub;
        if (sub && el.closest("#measured")) el.insertAdjacentHTML("beforeend", `<span class="sub">${e(sub)}${fullTable ? `<sup><a href="#note-g">g</a></sup>` : ""}</span>`);
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
