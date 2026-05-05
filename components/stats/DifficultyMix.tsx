import { TOKENS } from "../tokens";

type Difficulty = "Easy" | "Medium" | "Hard";

export function DifficultyMix({
  counts,
}: {
  counts: Record<Difficulty, number>;
}) {
  const total = counts.Easy + counts.Medium + counts.Hard;
  const items = [
    { label: "Easy", n: counts.Easy, c: TOKENS.easy },
    { label: "Medium", n: counts.Medium, c: TOKENS.medium },
    { label: "Hard", n: counts.Hard, c: TOKENS.hard },
  ];
  const r = 38;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={100} height={100} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
        <circle cx={50} cy={50} r={r} stroke="var(--border)" strokeWidth="10" fill="none" />
        {total > 0 && items.map((it, i) => {
          const len = (it.n / total) * circ;
          const el = (
            <circle
              key={i}
              cx={50}
              cy={50}
              r={r}
              stroke={it.c}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${len} ${circ}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {items.map((it) => (
          <div
            key={it.label}
            style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}
          >
            <span
              style={{ width: 8, height: 8, borderRadius: 2, background: it.c }}
            />
            <span style={{ flex: 1, color: "var(--text-dim)" }}>{it.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>
              {it.n}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--text-mute)",
                fontSize: 11,
                width: 36,
                textAlign: "right",
              }}
            >
              {total > 0 ? `${Math.round((it.n / total) * 100)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
