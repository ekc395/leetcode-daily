import { TOKENS } from "../tokens";
import { DiffBadge } from "../DiffBadge";
import { Icon } from "../Icon";
import type { Difficulty } from "@/lib/types";

// Shared with the header row in StatsScreen so the two can't drift apart.
export const TAG_ROW_GRID = "28px 240px 1fr 80px";

export function TagWeaknessBar({
  tag,
  failures,
  total,
  weakness,
  level,
  isMax,
  starred,
  available,
  onToggleStar,
  pending = false,
}: {
  tag: string;
  failures: number;
  total: number;
  weakness: number;
  level: Difficulty;
  isMax: boolean;
  starred: boolean;
  available: number;
  onToggleStar: (tag: string, next: boolean) => void;
  pending?: boolean;
}) {
  // No attempts in the window is absence of evidence, not a clean record — it
  // must not render as a 0% miss rate alongside genuinely strong topics.
  const unattempted = total === 0;
  // No unseeded pool problems left at any difficulty — starring cannot help.
  const exhausted = available === 0;
  const c = unattempted
    ? "var(--text-dim)"
    : weakness >= 0.4 ? TOKENS.bad : weakness >= 0.25 ? TOKENS.medium : TOKENS.ok;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: TAG_ROW_GRID,
        gap: 18,
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <button
        onClick={() => onToggleStar(tag, !starred)}
        aria-pressed={starred}
        aria-label={starred ? `Unstar ${tag}` : `Star ${tag}`}
        disabled={pending || (exhausted && !starred)}
        title={
          exhausted
            ? "No unseen problems left in this topic — starring can't surface it"
            : starred
              ? "Picked first for new problems"
              : "Pick this topic first for new problems"
        }
        style={{
          background: "none",
          border: "none",
          padding: 0,
          lineHeight: 0,
          color: starred ? "var(--accent)" : "var(--text-dim)",
          opacity: pending ? 0.4 : exhausted && !starred ? 0.25 : starred ? 1 : 0.55,
          cursor: exhausted && !starred ? "default" : "pointer",
          transition: "opacity 140ms, color 140ms",
        }}
      >
        <Icon name="star" size={14} filled={starred} />
      </button>
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
