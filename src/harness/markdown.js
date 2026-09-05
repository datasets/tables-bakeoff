/** Tiny Markdown renderer for changelog entry bodies. Same reasoning as
 *  frontmatter.js: a full markdown library is more than this page needs and
 *  more than the repo wants to carry. Changelog entries are authored to a
 *  known convention — paragraphs, unordered lists, links, bold, inline code,
 *  the occasional image or subheading — so that is all this handles.
 *
 *  HTML in the source is escaped first, so an entry cannot inject markup. */

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(text) {
  let s = escapeHtml(text);
  // images before links — ![alt](src) would otherwise match the link rule
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${src}" alt="${alt}">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href);
    const rel = external ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${href}"${rel}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

export function renderMarkdown(src) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let para = [];
  let list = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list.length) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      flushPara();
      flushList();
      continue;
    }
    const heading = t.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      const level = Math.min(heading[1].length + 1, 6); // shift down: page owns <h1>/<h2>
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (t === "---" || t === "***") {
      flushPara();
      flushList();
      out.push("<hr>");
      continue;
    }
    const bullet = t.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      list.push(bullet[1]);
      continue;
    }
    flushList();
    para.push(t);
  }
  flushPara();
  flushList();
  return out.join("\n");
}
