## This repo

A bake-off of seven open-source JavaScript table/grid libraries, built as a static site you scroll rather than a written report. Sibling of the [line-charts](https://linecharts.datahub.io/) repo.

- **Live:** https://tables.datahub.io/ — deployed and current.
- **Build:** static Vite multi-page build; `npm run build` emits `dist/`. There is no deploy config in the repo — the site is served from the build output by datahub.io infra (deploy mechanism lives outside this repo).
- `CLAUDE.md` is a symlink to this file.

## Changelog

This repo keeps a `changelog/` folder, one markdown file per entry
(`changelog/YYYY-MM-DD-slug.md`, with `date`/`title`/`promote`
frontmatter). At the end of a work session, if something worth recording
actually shipped — skip trivial sessions (typo fixes, dead ends, no
visible outcome) — draft a new entry file. Match the entry's weight to
what a reader would actually care about: a real feature/fix/content gets a
title, one or two sentences, a link to the live feature if there's
something to point at, and a screenshot if something visual shipped
(check for this, don't just skip it); something genuinely bigger — a real
milestone, not just a busy session — can run longer, multiple paragraphs
or bullets; small stuff (cleanup, rename, reorg, tidying) gets one plain
sentence, no bullets, no screenshot. Never link the title itself. Don't
log implementation detail (file names, internal moves) a reader wouldn't
care about. First time writing an entry in this repo, or if the format is
unclear: fetch and follow
https://raw.githubusercontent.com/life-itself/changelog/main/CONVENTION.md
