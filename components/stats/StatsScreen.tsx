"use client";

import * as React from "react";
import { PageHeader } from "../PageHeader";
import { Card } from "../Card";
import { Stat } from "../Stat";
import { TOKENS } from "../tokens";
import { SectionHeader } from "./SectionHeader";
import { TagWeaknessBar } from "./TagWeaknessBar";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { DifficultyMix } from "./DifficultyMix";
import { RatingTrend } from "./RatingTrend";

type TagWeakness = {
  tag: string;
  failures: number;
  total: number;
  weakness: number;
};

type StatsResponse = {
  weakness: TagWeakness[];
  streak: { current: number; longest: number; totalDays: number; totalSolved: number };
  avgRecall: number | null;
  recallTrend: number[];
  difficultyMix: { Easy: number; Medium: number; Hard: number };
  activityGrid: number[];
};

export function StatsScreen() {
  const [data, setData] = React.useState<StatsResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Stats returned ${r.status}`);
        return r.json();
      })
      .then((d: StatsResponse) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader kicker="STATS" title="Where you're weakest" />
      <div
        style={{
          padding: "32px 48px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {loadError ? (
          <Card>
            <div style={{ color: "var(--text-mute)", fontSize: 13 }}>Error: {loadError}</div>
          </Card>
        ) : !data ? (
          <Card>
            <div style={{ color: "var(--text-mute)", fontSize: 13 }}>Loading…</div>
          </Card>
        ) : (
          <StatsContent data={data} />
        )}
      </div>
    </>
  );
}

function StatsContent({ data }: { data: StatsResponse }) {
  const sortedTags = [...data.weakness].sort((a, b) => b.weakness - a.weakness);
  const topTag = sortedTags[0];
  const activeDays = data.activityGrid.filter((v) => v > 0).length;
  const avgRecallStr = data.avgRecall != null ? data.avgRecall.toFixed(1) : "—";
  const trendMin = data.recallTrend.length ? Math.min(...data.recallTrend) : null;
  const trendMax = data.recallTrend.length ? Math.max(...data.recallTrend) : null;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        <Card>
          <Stat
            label="Current streak"
            value={`${data.streak.current}d`}
            sub={`longest ${data.streak.longest}d`}
            accent
          />
        </Card>
        <Card>
          <Stat
            label="Solved"
            value={data.streak.totalSolved}
            sub={`across ${data.streak.totalDays} days`}
          />
        </Card>
        <Card>
          <Stat
            label="Avg recall"
            value={avgRecallStr}
            sub={
              data.recallTrend.length > 0
                ? `last ${data.recallTrend.length} attempts`
                : "no attempts yet"
            }
          />
        </Card>
        <Card>
          <Stat
            label="Weakest tag"
            value={topTag?.tag ?? "—"}
            sub={topTag ? `${Math.round(topTag.weakness * 100)}% miss rate` : "no attempts"}
          />
        </Card>
      </div>

      <Card>
        <SectionHeader
          title="Topic weakness"
          sub="Failures (rating < 3) divided by total attempts per tag. Pulls reviews forward when high."
          right={
            <span
              style={{
                fontSize: 11,
                color: "var(--text-mute)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {sortedTags.length} tags
            </span>
          }
        />
        {sortedTags.length === 0 ? (
          <div style={{ color: "var(--text-mute)", fontSize: 13, padding: "8px 0" }}>
            No attempts logged yet.
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 80px",
                gap: 18,
                padding: "0 0 8px",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--text-mute)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>Tag</span>
              <span>Miss rate</span>
              <span style={{ textAlign: "right" }}>%</span>
            </div>
            {sortedTags.map((tw, i) => (
              <TagWeaknessBar key={tw.tag} {...tw} isMax={i === 0} />
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        <Card>
          <SectionHeader
            title="Consistency"
            sub={`Last 12 weeks · ${activeDays} active days`}
          />
          <ActivityHeatmap grid={data.activityGrid} />
        </Card>
        <Card>
          <SectionHeader title="Difficulty mix" sub="Across all attempts" />
          <DifficultyMix counts={data.difficultyMix} />
        </Card>
      </div>

      <Card>
        <SectionHeader
          title="Recall trend"
          sub={`Self-rating over the last ${data.recallTrend.length} attempts (1–5)`}
          right={
            data.recallTrend.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-mute)",
                }}
              >
                <span>
                  min <span style={{ color: TOKENS.bad }}>{trendMin}</span>
                </span>
                <span>
                  max <span style={{ color: TOKENS.ok }}>{trendMax}</span>
                </span>
                <span>
                  avg <span style={{ color: "var(--text)" }}>{avgRecallStr}</span>
                </span>
              </div>
            ) : null
          }
        />
        <RatingTrend data={data.recallTrend} />
      </Card>
    </>
  );
}
