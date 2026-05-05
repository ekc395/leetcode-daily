import { Card } from "../Card";
import { Icon } from "../Icon";
import { TOKENS } from "../tokens";
import { STREAK } from "@/lib/mockData";

export function EmptyState() {
  return (
    <Card padding={48} style={{ textAlign: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          margin: "0 auto 18px",
          borderRadius: "50%",
          background: "color-mix(in oklch, var(--accent) 12%, transparent)",
          border: "1px solid color-mix(in oklch, var(--accent) 30%, transparent)",
          display: "grid",
          placeItems: "center",
          color: "var(--accent)",
        }}
      >
        <Icon name="check" size={24} />
      </div>
      <h2
        style={{
          margin: "0 0 8px",
          fontFamily: "var(--font-serif)",
          fontSize: 24,
          fontWeight: 500,
          letterSpacing: "-0.015em",
          color: "var(--text)",
        }}
      >
        Nothing due today
      </h2>
      <p
        style={{
          margin: 0,
          color: "var(--text-dim)",
          fontSize: 14,
          lineHeight: 1.5,
          maxWidth: 380,
          marginInline: "auto",
        }}
      >
        You&apos;re ahead of schedule. The next review unlocks{" "}
        <span style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>
          tomorrow at 9am
        </span>
        .
      </p>
      <div
        style={{
          marginTop: 24,
          padding: "12px 16px",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          borderRadius: 999,
          background: "var(--surface-hi)",
          border: "1px solid var(--border)",
          fontSize: 12,
          color: "var(--text-dim)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: TOKENS.ok,
            boxShadow: `0 0 6px ${TOKENS.ok}`,
          }}
        />
        Streak safe · {STREAK.current} days
      </div>
    </Card>
  );
}
