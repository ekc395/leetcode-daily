"use client";

import * as React from "react";
import { TOKENS } from "../tokens";

const labels = ["Forgot", "Hard", "OK", "Good", "Easy"];

const ratingColor = (n: number) => {
  if (n <= 2) return TOKENS.bad;
  if (n === 3) return TOKENS.medium;
  return TOKENS.ok;
};

export function RatingPills({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10.5,
          color: "var(--text-mute)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        <span>Rate recall</span>
        <span>{value ? labels[value - 1] : "—"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pill key={n} n={n} active={value === n} onClick={() => onChange(n)} />
        ))}
      </div>
    </div>
  );
}

function Pill({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  const [hover, setHover] = React.useState(false);
  const c = ratingColor(n);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        padding: "18px 0 14px",
        borderRadius: 8,
        background: active ? `color-mix(in oklch, ${c} 18%, var(--surface))` : "var(--surface-hi)",
        border: `1px solid ${
          active
            ? `color-mix(in oklch, ${c} 50%, transparent)`
            : hover
              ? "var(--border-hi)"
              : "var(--border)"
        }`,
        color: active ? c : "var(--text)",
        fontFamily: "var(--font-mono)",
        fontSize: 22,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 160ms cubic-bezier(.2,.8,.2,1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        lineHeight: 1,
      }}
    >
      {n}
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--font-sans)",
          color: active ? c : "var(--text-mute)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {labels[n - 1]}
      </span>
    </button>
  );
}
