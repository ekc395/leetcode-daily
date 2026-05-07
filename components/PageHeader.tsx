import * as React from "react";

export function PageHeader({
  kicker,
  title,
  right,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        padding: "32px 48px 24px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        {kicker && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-mute)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {kicker}
          </div>
        )}
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            fontFamily: "var(--font-serif)",
          }}
        >
          {title}
        </h1>
      </div>
      {right}
    </header>
  );
}
