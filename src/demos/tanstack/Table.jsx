/* Headless: TanStack computes rows, cells, header groups and sorting. Every
 * element below is ours — including both virtualizers, because "headless"
 * means windowing is the application's job too. @tanstack/react-virtual is
 * paired in for that and its cost is part of this demo's bundle figure.
 *
 * What that buys, and it is the honest other half of the trade: this is the
 * only demo of the seven that is a real <table> with <th>/<td> we chose, so
 * sticky headers, alignment, dark mode and text selection are ordinary CSS
 * rather than a library theming API we have to discover. */

import { useMemo, useRef, useState } from "react";
import {
  useTable,
  tableFeatures,
  flexRender,
  rowSortingFeature,
  createSortedRowModel,
  sortFn_alphanumeric,
  sortFn_basic,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

/* v9 features are opt-in and stitched in statically — this call belongs at
 * module scope, per table-core's own docstring for the helper. v8's
 * getCoreRowModel()/getSortedRowModel() options do not exist here at all. */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});

const ROW_H = 32;
const WIDTH_FOR = { number: 112, date: 118, string: 152 };

export function TanStackTable({ data, formatCell }) {
  const [sorting, setSorting] = useState([]);
  const scrollRef = useRef(null);

  const columns = useMemo(
    () =>
      data.columns.map((c) => ({
        accessorKey: c.name,
        header: c.name,
        meta: { align: c.align },
        cell: (info) => formatCell(info.getValue(), c),
        // Keys of the sortFns registry passed to tableFeatures above; a name
        // that is not registered there is a type error in TS and a silent
        // fallback in JS, which is the v9 way of making the feature set explicit.
        sortFn: c.type === "number" ? "basic" : "alphanumeric",
      })),
    [data, formatCell]
  );

  const table = useTable({
    features,
    data: data.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
  });

  const rows = table.getSortedRowModel().rows;
  const headers = table.getLeafHeaders();
  const widths = useMemo(
    () => data.columns.map((c) => WIDTH_FOR[c.type] ?? WIDTH_FOR.string),
    [data]
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });

  // The `wide` dataset is the column-virtualization axis, so columns are
  // windowed on the same scroll container. Nothing in TanStack does this for
  // us: a second virtualizer, spacer cells and a <colgroup> are all hand-written.
  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: headers.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => widths[i],
    overscan: 3,
  });

  const vRows = rowVirtualizer.getVirtualItems();
  const vCols = colVirtualizer.getVirtualItems();

  const totalWidth = colVirtualizer.getTotalSize();
  const padLeft = vCols[0]?.start ?? 0;
  const padRight = totalWidth - (vCols.at(-1)?.end ?? 0);
  const padTop = vRows[0]?.start ?? 0;
  const padBottom = rowVirtualizer.getTotalSize() - (vRows.at(-1)?.end ?? 0);
  const span = vCols.length + 2;

  return (
    /* This div is what actually scrolls — the harness's .demo-host never
     * moves — so it carries data-scroller, or the FPS button would measure a
     * motionless box and report a fabricated 60fps. */
    <div ref={scrollRef} data-scroller="" className="tst-scroll">
      <table className="tst" style={{ width: totalWidth }}>
        {/* table-layout: fixed + a colgroup is what lets a spacer cell with
            colSpan sit in the same table as real columns without dragging the
            column widths around. */}
        <colgroup>
          <col style={{ width: padLeft }} />
          {vCols.map((vc) => (
            <col key={vc.key} style={{ width: widths[vc.index] }} />
          ))}
          <col style={{ width: padRight }} />
        </colgroup>
        <thead>
          <tr>
            <th className="pad" />
            {vCols.map((vc) => {
              const h = headers[vc.index];
              const dir = h.column.getIsSorted();
              return (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  style={{ textAlign: h.column.columnDef.meta.align }}
                  title={h.column.id}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  <span className="sort">{dir === "asc" ? " ▲" : dir === "desc" ? " ▼" : ""}</span>
                </th>
              );
            })}
            <th className="pad" />
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: padTop }}>
            <td className="pad" colSpan={span} />
          </tr>
          {vRows.map((vr) => {
            const row = rows[vr.index];
            const cells = row.getAllCells();
            return (
              /* data-row marks a real data row: the spacer <tr>s above and
                 below are always present, so "a row exists" is not otherwise
                 a usable signal that anything was rendered. */
              <tr key={row.id} data-row="" style={{ height: ROW_H }}>
                <td className="pad" />
                {vCols.map((vc) => {
                  const cell = cells[vc.index];
                  return (
                    <td key={cell.id} style={{ textAlign: cell.column.columnDef.meta.align }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
                <td className="pad" />
              </tr>
            );
          })}
          <tr style={{ height: padBottom }}>
            <td className="pad" colSpan={span} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
