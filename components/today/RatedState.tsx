import { Card } from "../Card";
import { DiffBadge } from "../DiffBadge";
import { Icon } from "../Icon";
import { TOKENS } from "../tokens";
import type { Problem } from "@/lib/mockData";

export function RatedState({ problem, rating }: { problem: Problem; rating: number }) {
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div style={{ height: 3, background: TOKENS.ok }} />
      <div style={{ padding: "28px 32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
            color: TOKENS.ok,
          }}
        >
          <Icon name="check" size={16} />
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Reviewed today
          </span>
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontFamily: "var(--font-serif)",
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          {problem.title}
        </h2>
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}
        >
          <DiffBadge difficulty={problem.difficulty} size="sm" />
          <span style={{ fontSize: 12, color: "var(--text-mute)" }}>·</span>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-dim)",
              fontFamily: "var(--font-mono)",
            }}
          >
            rated {rating}/5
          </span>
        </div>

        <div
          style={{
            padding: 20,
            background: "color-mix(in oklch, var(--surface-hi) 60%, transparent)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "color-mix(in oklch, var(--accent) 15%, transparent)",
              border: "1px solid color-mix(in oklch, var(--accent) 30%, transparent)",
              display: "grid",
              placeItems: "center",
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            <Icon name="bolt" size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, color: "var(--text)", marginBottom: 2 }}>
              Next review in{" "}
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                4 days
              </span>
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-mute)",
                fontFamily: "var(--font-mono)",
              }}
            >
              interval 4d · ease 2.30 · adjusted −2d for DP weakness
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 12,
            color: "var(--text-mute)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="clock" size={13} />
          Next problem unlocks tomorrow at 9:00 UTC
        </div>
      </div>
    </Card>
  );
}
