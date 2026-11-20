---
name: Tabulator
version: 6.7.1
license: MIT
docs: https://tabulator.info/docs/6.5
homepage: https://tabulator.info
github: https://github.com/olifolkerd/tabulator
stars: 7755
npm: tabulator-tables
tagline: Vanilla, batteries-included: grouping, tree data, editing, export.
---

- Its docs use `height: "100%"` to fill a container. In a parent with no resolved height that renders every row: over 60 seconds at 50,000 rows, with nothing in the console. Our host already has a height, so the option is left out and 500,000 rows take under 300 ms.
- The constructor returns before rows are drawn, so this demo waits for the `tableBuilt` event.
- The stock themes are plain CSS with no variables, so dark mode is an override stylesheet written against Tabulator's class names.
