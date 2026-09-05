/* Renders changelog/*.md into the changelog page. The entry files are the
 * single source of truth — this page is a view of the folder, nothing more.
 * See AGENTS.md for the entry convention. */
import { restoreTheme, installThemeToggle } from "./theme.js";
import { parseFrontmatter } from "./frontmatter.js";
import { renderMarkdown } from "./markdown.js";

restoreTheme();
const toggleBtn = document.querySelector(".toggle");
if (toggleBtn) installThemeToggle(toggleBtn);

// Eager + raw so the entries are inlined at build time; the folder is at the
// repo root, a sibling of src/, hence the leading-slash (project-root) glob.
const files = import.meta.glob("/changelog/*.md", { query: "?raw", import: "default", eager: true });

const entries = Object.entries(files)
  .map(([path, raw]) => {
    const { meta, body } = parseFrontmatter(raw);
    const slug = path.split("/").pop().replace(/\.md$/, "");
    return {
      slug,
      date: String(meta.date ?? slug.slice(0, 10)),
      title: meta.title ?? slug,
      bodyHtml: renderMarkdown(body),
    };
  })
  // newest first; same-day entries fall back to filename order, also reversed
  .sort((a, b) => (a.date === b.date ? b.slug.localeCompare(a.slug) : b.date.localeCompare(a.date)));

const fmtDate = (iso) => {
  const d = new Date(iso + "T00:00:00Z");
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

const root = document.getElementById("entries");
if (!entries.length) {
  root.innerHTML = `<p class="lede">No entries yet.</p>`;
} else {
  root.innerHTML = entries
    .map(
      (e) => `
    <article class="entry" id="${e.slug}">
      <time datetime="${e.date}">${fmtDate(e.date)}</time>
      <h2><a href="#${e.slug}">${e.title}</a></h2>
      ${e.bodyHtml}
    </article>`
    )
    .join("\n");
}
