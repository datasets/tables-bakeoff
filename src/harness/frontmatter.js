/** Minimal frontmatter parser for demo README.md files. Deliberately not a
 *  markdown/YAML library: those would land in the shared harness bundle that
 *  every demo's own bundle size is measured net of, so this parses the flat
 *  key: value shape the READMEs actually use and nothing more.
 *
 *  Splitting on the first ": " (colon-space) keeps URLs intact — an "https://"
 *  value has no space right after its colon, so it never gets cut early. */
export function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw.trim() };

  const [, fm, body] = match;
  const meta = {};
  for (const line of fm.split("\n")) {
    if (!line.trim()) continue;
    const idx = line.indexOf(": ");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 2).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (/^\d+$/.test(value)) value = Number(value);
    meta[key] = value;
  }
  return { meta, body: body.trim() };
}
