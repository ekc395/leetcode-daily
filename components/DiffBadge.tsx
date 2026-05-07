import { TOKENS } from "./tokens";
import type { Difficulty } from "@/lib/types";

export function DiffBadge({
  difficulty,
  size = "md",
}: {
  difficulty: Difficulty;
  size?: "sm" | "md";
}) {
  const colors: Record<Difficulty, string> = {
    Easy: TOKENS.easy,
    Medium: TOKENS.medium,
    Hard: TOKENS.hard,
  };
  const c = colors[difficulty];
  const padding = size === "sm" ? "2px 8px" : "4px 10px";
  const fontSize = size === "sm" ? 11 : 12;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding,
        fontSize,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: c,
        background: `color-mix(in oklch, ${c} 14%, transparent)`,
        border: `1px solid color-mix(in oklch, ${c} 30%, transparent)`,
        borderRadius: 4,
        fontWeight: 500,
      }}
    >
      {difficulty}
    </span>
  );
}
