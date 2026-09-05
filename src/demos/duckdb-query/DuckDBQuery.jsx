import { useCallback, useEffect, useRef, useState } from "react";
import { TanStackTable } from "../tanstack/Table.jsx";
import { formatCell } from "../../data/load.js";
import { registerDataset, runQuery } from "./duckdb-client.js";

const EXAMPLES = [
  {
    label: "Top districts by average price",
    sql:
      "SELECT district, COUNT(*) AS sales, ROUND(AVG(price)) AS avg_price\n" +
      "FROM small\nGROUP BY district\nORDER BY avg_price DESC\nLIMIT 20",
  },
  {
    label: "Price distribution buckets",
    sql:
      "SELECT\n" +
      "  CASE\n" +
      "    WHEN price < 100000 THEN '< £100k'\n" +
      "    WHEN price < 250000 THEN '£100k-250k'\n" +
      "    WHEN price < 500000 THEN '£250k-500k'\n" +
      "    ELSE '£500k+'\n" +
      "  END AS price_band,\n" +
      "  COUNT(*) AS sales\n" +
      "FROM small\nGROUP BY price_band\nORDER BY sales DESC",
  },
  {
    label: "Raw rows (first 50)",
    sql: "SELECT * FROM small LIMIT 50",
  },
];

export function DuckDBQuery() {
  const [status, setStatus] = useState("loading DuckDB…");
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const ready = useRef(false);

  useEffect(() => {
    let cancelled = false;
    registerDataset("small")
      .then(() => {
        if (cancelled) return;
        ready.current = true;
        setStatus("ready");
        run(EXAMPLES[0].sql);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("failed");
        setError(String(err));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback((query) => {
    setRunning(true);
    setError(null);
    runQuery(query)
      .then((result) => setData(result))
      .catch((err) => setError(String(err)))
      .finally(() => setRunning(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            className="load-btn"
            onClick={() => { setSql(ex.sql); run(ex.sql); }}
            disabled={status !== "ready" || running}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        rows={6}
        style={{
          width: "100%", fontFamily: "var(--font-mono)", fontSize: 13,
          padding: 10, borderRadius: 8, border: "1px solid var(--border)",
          background: "var(--surface)", color: "var(--text-primary)",
          boxSizing: "border-box", resize: "vertical",
        }}
      />

      <div style={{ margin: "10px 0", display: "flex", gap: 10, alignItems: "center" }}>
        <button className="load-btn" onClick={() => run(sql)} disabled={status !== "ready" || running}>
          {running ? "running…" : "Run query"}
        </button>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          {status === "loading DuckDB…" ? "Loading DuckDB-WASM and the small dataset…" : null}
          {data && !running ? `${data.rows.length.toLocaleString()} rows returned` : null}
        </span>
      </div>

      {error && (
        <pre style={{
          color: "var(--series-2)", background: "var(--surface)", padding: 10,
          borderRadius: 8, fontSize: 12.5, overflowX: "auto",
        }}>{error}</pre>
      )}

      {data && !error && (
        <div className="demo-host" style={{ height: 420 }}>
          <TanStackTable data={data} formatCell={formatCell} />
        </div>
      )}
    </div>
  );
}
