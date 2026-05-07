export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 10.5,
          color: "var(--text-mute)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 28,
          fontFamily: "var(--font-mono)",
          color: accent ? "var(--accent)" : "var(--text)",
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
      {sub && <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{sub}</span>}
    </div>
  );
}
