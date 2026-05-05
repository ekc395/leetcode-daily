import { Card } from "../Card";
import { DiffBadge } from "../DiffBadge";
import { TODAY, SCHEDULE, problemById } from "@/lib/mockData";

export function SchedulePeek() {
  const upcoming = SCHEDULE.filter((s) => s.nextReviewAt > TODAY)
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
    .slice(0, 5);

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
          {upcoming.length} queued
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {upcoming.map((s, i) => {
          const p = problemById(s.problemId);
          if (!p) return null;
          const days = Math.round(
            (new Date(s.nextReviewAt).getTime() - new Date(TODAY).getTime()) / 86400000,
          );
          return (
            <div
              key={s.problemId}
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
                  flex: "0 0 32px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-mute)",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                <div style={{ color: "var(--text-dim)", fontSize: 12 }}>+{days}</div>
                <div>day{days === 1 ? "" : "s"}</div>
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
    </Card>
  );
}
