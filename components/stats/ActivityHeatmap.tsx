const WEEKS = 12;
const CELL = 12;
const GAP = 3;

const COLORS = [
  "var(--surface-hi)",
  "oklch(0.36 0.08 145)",
  "oklch(0.55 0.14 145)",
  "oklch(0.74 0.18 145)",
];

const DAY_LABELS = ["", "M", "", "W", "", "F", ""];

export function ActivityHeatmap({ grid }: { grid: number[] }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: GAP, paddingTop: 22 }}>
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            style={{
              height: CELL,
              fontSize: 9.5,
              color: "var(--text-mute)",
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div style={{ display: "flex", gap: GAP, justifyContent: "space-between" }}>
          {Array.from({ length: WEEKS }).map((_, i) => (
            <span
              key={i}
              style={{
                fontSize: 9.5,
                color: "var(--text-mute)",
                fontFamily: "var(--font-mono)",
                width: CELL,
                textAlign: "center",
              }}
            >
              {i % 3 === 0 ? `w${WEEKS - i}` : ""}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: GAP, justifyContent: "space-between" }}>
          {Array.from({ length: WEEKS }).map((_, w) => (
            <div key={w} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
              {Array.from({ length: 7 }).map((_, d) => {
                const idx = w * 7 + d;
                const v = grid[idx] ?? 0;
                return (
                  <div
                    key={d}
                    style={{
                      width: CELL,
                      height: CELL,
                      background: COLORS[v],
                      borderRadius: 2,
                      border:
                        idx === grid.length - 1
                          ? "1px solid var(--accent)"
                          : "none",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
            fontSize: 10.5,
            color: "var(--text-mute)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>less</span>
          {COLORS.map((c, i) => (
            <div
              key={i}
              style={{ width: CELL, height: CELL, background: c, borderRadius: 2 }}
            />
          ))}
          <span>more</span>
        </div>
      </div>
    </div>
  );
}
