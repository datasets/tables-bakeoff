import { useEffect, useMemo, useState } from "react";
import { TanStackTable } from "../tanstack/Table.jsx";
import { SummaryBar } from "./SummaryBar.jsx";
import { loadDataset, formatCell } from "../../data/load.js";
import { summarize, filterRows } from "./stats.js";

export function SummaryTable() {
  const [status, setStatus] = useState("loading");
  const [dataset, setDataset] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadDataset("small")
      .then((d) => { if (!cancelled) { setDataset(d); setStatus("ready"); } })
      .catch((err) => { if (!cancelled) setStatus(`error: ${err}`); });
    return () => { cancelled = true; };
  }, []);

  // Stats are computed on the full dataset, not the filtered view — the point
  // is to see the distribution of the whole column while filtering rows, not
  // to have the summary chase whatever's currently visible.
  const stats = useMemo(
    () => (dataset ? summarize(dataset.columns, dataset.rows) : []),
    [dataset]
  );

  const filteredRows = useMemo(
    () => (dataset ? filterRows(dataset.rows, dataset.columns, query) : []),
    [dataset, query]
  );

  if (status === "loading") {
    return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading dataset…</p>;
  }
  if (status.startsWith("error")) {
    return <pre style={{ color: "var(--series-2)", fontSize: 12.5 }}>{status}</pre>;
  }

  return (
    <div>
      <SummaryBar stats={stats} />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter rows — matches any column…"
        style={{
          width: "100%", padding: "8px 10px", marginBottom: 10, boxSizing: "border-box",
          border: "1px solid var(--border)", borderRadius: 8, fontSize: 13,
          background: "var(--surface)", color: "var(--text-primary)",
        }}
      />

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
        {filteredRows.length.toLocaleString()} of {dataset.rows.length.toLocaleString()} rows
        {query ? ` match "${query}"` : ""} — click a column header to sort.
      </div>

      <div className="demo-host" style={{ height: 420 }}>
        <TanStackTable data={{ ...dataset, rows: filteredRows }} formatCell={formatCell} />
      </div>
    </div>
  );
}
