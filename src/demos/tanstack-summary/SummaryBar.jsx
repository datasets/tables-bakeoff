export function SummaryBar({ stats }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {stats.map((s) => (
        <div
          key={s.name}
          style={{
            border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px",
            minWidth: 130, background: "var(--surface)", fontSize: 11.5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{s.name}</div>
          {s.type === "number" ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 24, marginBottom: 4 }}>
                {s.buckets.map((h, i) => (
                  <div
                    key={i}
                    style={{ flex: 1, height: `${Math.max(h * 100, 4)}%`, background: "var(--accent)", borderRadius: 1 }}
                  />
                ))}
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                {s.min.toLocaleString()} – {s.max.toLocaleString()}
              </div>
              <div style={{ color: "var(--text-muted)" }}>mean {Math.round(s.mean).toLocaleString()}</div>
            </>
          ) : (
            <div style={{ color: "var(--text-muted)" }}>{s.distinct.toLocaleString()} distinct</div>
          )}
          {s.nullCount > 0 && (
            <div style={{ color: "var(--text-muted)" }}>{s.nullCount.toLocaleString()} null</div>
          )}
        </div>
      ))}
    </div>
  );
}
