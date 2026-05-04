import { Card } from "../Card";
import { Icon } from "../Icon";
import { TODAY, STREAK } from "@/lib/mockData";
import type { TodayState } from "./types";

export function TodayProgress({ state }: { state: TodayState }) {
  const ringSize = 120;
  const r = (ringSize - 8) / 2;
  const c = 2 * Math.PI * r;
  const progress = state === "rated" ? 1 : 0;

  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 13,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-mute)",
              fontWeight: 500,
            }}
          >
            Today
          </h3>
          <span
            style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}
          >
            {TODAY}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ position: "relative", width: ringSize, height: ringSize, flexShrink: 0 }}>
            <svg width={ringSize} height={ringSize} style={{ transform: "rotate(-90deg)" }}>
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={r}
                stroke="var(--border)"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={r}
                stroke="var(--accent)"
                strokeWidth="3"
                fill="none"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - progress)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.2,.8,.2,1)" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              {progress >= 1 ? (
                <Icon name="check" size={28} />
              ) : (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 28,
                    fontWeight: 500,
                    color: "var(--text)",
                  }}
                >
                  0/1
                </span>
              )}
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-mute)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {progress >= 1 ? "Done" : "Pending"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-mute)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Streak
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "var(--accent)" }}>{STREAK.current}</span>
                <span style={{ fontSize: 12, color: "var(--text-mute)" }}>days</span>
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-mute)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Solved
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text)",
                }}
              >
                {STREAK.totalSolved}
                <span style={{ fontSize: 12, color: "var(--text-mute)" }}>
                  {" "}
                  / {STREAK.totalDays}d
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
