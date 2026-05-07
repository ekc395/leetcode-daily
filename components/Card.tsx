import * as React from "react";

export function Card({
  children,
  style,
  padding = 24,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: number;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
