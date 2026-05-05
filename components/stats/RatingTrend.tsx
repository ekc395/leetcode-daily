import { TOKENS } from "../tokens";

export function RatingTrend({ data }: { data: number[] }) {
  const w = 480;
  const h = 120;
  const pad = 12;
  const max = 5;

  if (data.length === 0) {
    return (
      <div
        style={{
          height: h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-mute)",
          fontSize: 12,
        }}
      >
        No attempts yet
      </div>
    );
  }

  const stepX = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const yFor = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const points = data.map((v, i) => `${pad + i * stepX},${yFor(v)}`).join(" ");
  const lastX = pad + (data.length - 1) * stepX;
  const area = `M${pad},${h - pad} L${points.split(" ").join(" L")} L${lastX},${h - pad} Z`;
  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  const avgStr = avg.toFixed(1);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id="trendG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[1, 2, 3, 4, 5].map((v) => (
        <line
          key={v}
          x1={pad}
          x2={w - pad}
          y1={yFor(v)}
          y2={yFor(v)}
          stroke="var(--border)"
          strokeWidth="0.5"
          strokeDasharray={v === 3 ? "" : "2 4"}
        />
      ))}
      <line
        x1={pad}
        x2={w - pad}
        y1={yFor(avg)}
        y2={yFor(avg)}
        stroke={TOKENS.medium}
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />
      <path d={area} fill="url(#trendG)" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={pad + i * stepX}
          cy={yFor(v)}
          r={i === data.length - 1 ? 3.5 : 2}
          fill={i === data.length - 1 ? "var(--accent)" : "var(--bg)"}
          stroke="var(--accent)"
          strokeWidth="1.2"
        />
      ))}
      <text
        x={w - pad}
        y={yFor(avg) - 4}
        fontSize="9"
        fontFamily="var(--font-mono)"
        fill={TOKENS.medium}
        textAnchor="end"
      >
        avg {avgStr}
      </text>
    </svg>
  );
}
