"use client";

import * as React from "react";
import { Card } from "../Card";
import { DiffBadge } from "../DiffBadge";
import { TOKENS } from "../tokens";
import type { Difficulty } from "@/lib/types";

type UpcomingItem = {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  nextReviewAt: string;
};

type UpcomingResponse = {
  today: string;
  upcoming: UpcomingItem[];
};

type Props = {
  excludeId?: number | null;
};

export function SchedulePeek({ excludeId }: Props = {}) {
  const [data, setData] = React.useState<UpcomingResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: "5" });
    if (excludeId != null) params.set("excludeId", String(excludeId));
    fetch(`/api/upcoming?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Upcoming returned ${r.status}`);
        return r.json();
      })
      .then((d: UpcomingResponse) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [excludeId]);

  const upcoming = data?.upcoming ?? [];
  const today = data?.today;

  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-mute)",
            fontWeight: 500,
          }}
        >
          Upcoming
        </h3>
        <span
          style={{ fontSize: 11, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}
        >
          {data ? `${upcoming.length} queued` : ""}
        </span>
      </div>
      {loadError ? (
        <div style={{ color: "var(--text-mute)", fontSize: 12 }}>Error: {loadError}</div>
      ) : !data ? (
        <div style={{ color: "var(--text-mute)", fontSize: 12 }}>Loading…</div>
      ) : upcoming.length === 0 ? (
        <div style={{ color: "var(--text-mute)", fontSize: 12 }}>Nothing queued.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {upcoming.map((p, i) => {
            const days = today
              ? Math.round(
                  (new Date(p.nextReviewAt).getTime() - new Date(today).getTime()) / 86400000,
                )
              : 0;
            const isOverdue = days < 0;
            const isDueToday = days === 0;
            const labelColor = isOverdue ? TOKENS.bad : "var(--text-dim)";
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    flex: "0 0 48px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-mute)",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {isOverdue ? (
                    <>
                      <div style={{ color: labelColor, fontSize: 12 }}>{days}</div>
                      <div style={{ color: labelColor }}>overdue</div>
                    </>
                  ) : isDueToday ? (
                    <>
                      <div style={{ color: labelColor, fontSize: 12 }}>·</div>
                      <div>due today</div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: labelColor, fontSize: 12 }}>+{days}</div>
                      <div>day{days === 1 ? "" : "s"}</div>
                    </>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                    {p.tags.slice(0, 2).join(" · ")}
                  </div>
                </div>
                <DiffBadge difficulty={p.difficulty} size="sm" />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
