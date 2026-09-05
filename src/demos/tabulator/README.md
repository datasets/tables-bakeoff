---
name: Tabulator
version: 6.5.2
license: MIT
docs: https://tabulator.info/docs/6.5
homepage: https://tabulator.info
github: https://github.com/olifolkerd/tabulator
stars: 7755
npm: tabulator-tables
tagline: Vanilla, batteries-included: grouping, tree data, editing, export.
---

Its stock themes (tabulator_simple.css and friends) are plain CSS with no custom-property hooks, so dark mode here is a hand-written override stylesheet keyed to Tabulator's own class names rather than anything the library exposes. Construction returns before rows paint — this demo waits on the tableBuilt event so the reported time is the real one, not the constructor's near-instant return. The real trap was `height: "100%"`, the option Tabulator's own docs use to make a table fill its container: passing it made the 50,000-row card take over sixty seconds to build and the 500,000-row one effectively never finish. The option overwrites the host's own CSS height with an inline "100%" that the host's parent cannot resolve, so Tabulator measures a 0px viewport, its virtual-DOM row count estimate falls apart, and it silently walks every row instead of just the visible ones. Deleting that one option — the host already has a real CSS height from the harness — dropped the 500,000-row build to under 300ms. Nothing in Tabulator surfaced this as an error either time.
