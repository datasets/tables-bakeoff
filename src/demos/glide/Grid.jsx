/* Canvas-rendered. Glide never creates DOM per cell: it asks for a cell's
 * content by [col, row] coordinate and paints it. The row count is just a
 * number, so 500,000 rows cost the same to set up as 500 — the data never
 * passes through the grid at all.
 *
 * The bill for that arrives elsewhere: nothing on screen is in the DOM, so
 * Ctrl-F, screen readers and select-and-copy all see an empty box. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataEditor, GridCellKind } from "@glideapps/glide-data-grid";

const WIDTH_FOR = { number: 112, date: 118, string: 152 };

/** Glide sizes its canvas from explicit pixels, not from CSS: given a
 *  percentage it lays out at zero until its own observer catches up, and the
 *  first paint is an empty grid. `initial` is the harness host measured before
 *  the mount so frame one is already correct; the observer below only has to
 *  handle later resizes. */
export function GlideGrid({ data, formatCell, theme, initial }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState(initial);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setBox((b) => (b.width === width && b.height === height ? b : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = useMemo(
    () =>
      data.columns.map((c) => ({
        title: c.name,
        id: c.name,
        width: WIDTH_FOR[c.type] ?? WIDTH_FOR.string,
      })),
    [data]
  );

  /* Called for every visible cell on every paint, including mid-scroll, so it
   * must stay cheap: no allocation beyond the returned cell, no formatting
   * work that could have been hoisted. Note there is no cache here — Glide
   * re-asks rather than remembering, which is exactly why memory does not grow
   * with how far you scroll. */
  const getCellContent = useCallback(
    ([col, row]) => {
      const spec = data.columns[col];
      const text = formatCell(data.rows[row]?.[spec.name], spec);
      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        allowOverlay: false,
        contentAlign: spec.align,
      };
    },
    [data, formatCell]
  );

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
      <DataEditor
        columns={columns}
        rows={data.rows.length}
        getCellContent={getCellContent}
        theme={theme}
        rowHeight={32}
        headerHeight={34}
        rowMarkers="none"
        smoothScrollX
        smoothScrollY
        width={box.width}
        height={box.height}
      />
    </div>
  );
}

/** Glide's theme is a plain token object merged over its defaults — the one
 *  theming story of the seven that needs no CSS at all. The font and row
 *  metrics are set in both modes so this grid matches the other six demos;
 *  only the colours switch. */
export function glideTheme(t) {
  const base = {
    fontFamily: t.fontSans,
    baseFontStyle: "13px",
    headerFontStyle: "600 13px",
    markerFontStyle: "12px",
    editorFontSize: "13px",
    cellHorizontalPadding: 10,
    cellVerticalPadding: 5,
    accentColor: t.palette[0],
    linkColor: t.palette[0],
  };
  if (!t.dark) return base;
  return {
    ...base,
    accentFg: "#ffffff",
    accentLight: "rgba(57, 135, 229, 0.22)",
    textDark: t.text,
    textMedium: t.textSecondary,
    textLight: t.muted,
    textHeader: t.textSecondary,
    textHeaderSelected: t.text,
    textBubble: t.text,
    bgCell: t.surface,
    bgCellMedium: t.page,
    bgHeader: t.page,
    bgHeaderHasFocus: t.grid,
    bgHeaderHovered: t.grid,
    bgBubble: t.page,
    bgBubbleSelected: t.grid,
    bgIconHeader: t.muted,
    fgIconHeader: t.surface,
    borderColor: t.grid,
    horizontalBorderColor: t.grid,
    drilldownBorder: t.grid,
  };
}
