import { TOKENS } from "../tokens";
import { DiffBadge } from "../DiffBadge";
import type { Difficulty } from "@/lib/types";

export function TagWeaknessBar({
  tag,
  failures,
  total,
  weakness,
  level,
  isMax,
}: {
  tag: string;
  failures: number;
  total: number;
  weakness: number;
  level: Difficulty;
  isMax: boolean;
}) {
  // No attempts in the window is absence of evidence, not a clean record — it
  // must not render as a 0% miss rate alongside genuinely strong topics.
  const unattempted = total === 0;
  const c = unattempted
    ? "var(--text-dim)"
    : weakness >= 0.4 ? TOKENS.bad : weakness >= 0.25 ? TOKENS.medium : TOKENS.ok;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr 80px",
        gap: 18,
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {isMax && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: TOKENS.bad,
              boxShadow: `0 0 6px ${TOKENS.bad}`,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontSize: 13,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {tag}
        </span>
        <span style={{ flexShrink: 0 }}>
          <DiffBadge difficulty={level} size="sm" />
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 22,
          background: "var(--surface-hi)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${weakness * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, color-mix(in oklch, ${c} 70%, transparent), ${c})`,
            borderRadius: 4,
            transition: "width 800ms cubic-bezier(.2,.8,.2,1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            paddingLeft: 10,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: weakness > 0.5 ? "var(--bg)" : "var(--text-dim)",
            fontStyle: unattempted ? "italic" : "normal",
            opacity: unattempted ? 0.65 : 1,
          }}
        >
          {unattempted ? "not attempted" : `${failures} of ${total}`}
        </div>
      </div>
      <div
        style={{
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          color: c,
        }}
      >
        {unattempted ? "—" : `${Math.round(weakness * 100)}%`}
      </div>
    </div>
  );
}
