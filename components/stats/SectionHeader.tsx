import * as React from "react";

export function SectionHeader({
  title,
  sub,
  right,
}: {
  title: string;
  sub: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 18,
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--text)",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 12,
            color: "var(--text-mute)",
          }}
        >
          {sub}
        </p>
      </div>
      {right}
    </div>
  );
}
