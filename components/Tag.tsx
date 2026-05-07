import { TOKENS } from "./tokens";

export function Tag({
  children,
  weakness,
}: {
  children: React.ReactNode;
  weakness?: number;
}) {
  let bg = "color-mix(in oklch, var(--surface-hi) 70%, transparent)";
  let bd = "var(--border)";
  let fg = "var(--text-dim)";
  if (weakness != null && weakness >= 0.4) {
    bg = `color-mix(in oklch, ${TOKENS.bad} 12%, transparent)`;
    bd = `color-mix(in oklch, ${TOKENS.bad} 25%, transparent)`;
    fg = TOKENS.bad;
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        fontSize: 11.5,
        color: fg,
        background: bg,
        border: `1px solid ${bd}`,
        borderRadius: 999,
        fontFamily: "var(--font-sans)",
        letterSpacing: "0.005em",
      }}
    >
      {children}
    </span>
  );
}
