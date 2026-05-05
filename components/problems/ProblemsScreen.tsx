"use client";

import * as React from "react";
import { PageHeader } from "../PageHeader";
import { Card } from "../Card";
import { DiffBadge } from "../DiffBadge";
import { Tag } from "../Tag";
import { TOKENS } from "../tokens";
import type { Difficulty } from "@/lib/mockData";

type SortKey = "recent" | "rating" | "next";

type LastAttempt = {
  attemptedAt: string;
  recallRating: number;
  solved: boolean;
};

type ScheduleInfo = { nextReviewAt: string };

type ProblemRow = {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  lastAttempt: LastAttempt;
  schedule: ScheduleInfo | null;
  attemptCount: number;
};

type ProblemsResponse = {
  problems: ProblemRow[];
  tagWeakness: { tag: string; failures: number; total: number; weakness: number }[];
};

const todayUtc = () => new Date().toISOString().split("T")[0]!;

const ratingColor = (n: number) => {
  if (n <= 2) return TOKENS.bad;
  if (n === 3) return TOKENS.medium;
  return TOKENS.ok;
};

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);

const formatNext = (sched: ScheduleInfo | null, today: string) => {
  if (!sched) return "—";
  const days = daysBetween(today, sched.nextReviewAt);
  if (days < 0) return `${-days}d ago`;
  if (days === 0) return "today";
  return `+${days}d`;
};

export function ProblemsScreen() {
  const [data, setData] = React.useState<ProblemsResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [diffFilter, setDiffFilter] = React.useState<"All" | Difficulty>("All");
  const [tagFilter, setTagFilter] = React.useState<string>("All");
  const [sortBy, setSortBy] = React.useState<SortKey>("recent");

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/problems")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Problems returned ${r.status}`);
        return r.json();
      })
      .then((d: ProblemsResponse) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayUtc();
  const problems = data?.problems ?? [];
  const tagWeaknessMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const t of data?.tagWeakness ?? []) map.set(t.tag, t.weakness);
    return map;
  }, [data]);

  const allTags = React.useMemo(
    () => ["All", ...Array.from(new Set(problems.flatMap((p) => p.tags))).sort()],
    [problems],
  );

  const filtered = problems
    .filter((p) => diffFilter === "All" || p.difficulty === diffFilter)
    .filter((p) => tagFilter === "All" || p.tags.includes(tagFilter))
    .sort((a, b) => {
      if (sortBy === "recent") {
        return b.lastAttempt.attemptedAt.localeCompare(a.lastAttempt.attemptedAt);
      }
      if (sortBy === "rating") {
        return a.lastAttempt.recallRating - b.lastAttempt.recallRating;
      }
      if (sortBy === "next") {
        return (a.schedule?.nextReviewAt ?? "z").localeCompare(
          b.schedule?.nextReviewAt ?? "z",
        );
      }
      return 0;
    });

  const headerRight = data ? (
    <span
      style={{
        fontSize: 12,
        color: "var(--text-mute)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {filtered.length} of {problems.length}
    </span>
  ) : null;

  return (
    <>
      <PageHeader kicker="HISTORY" title="All problems" right={headerRight} />
      <div
        style={{
          padding: "32px 48px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
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
        ) : problems.length === 0 ? (
          <Card>
            <div style={{ color: "var(--text-mute)", fontSize: 13 }}>
              No attempts logged yet.
            </div>
          </Card>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <FilterGroup
                label="Difficulty"
                options={[
                  { v: "All", l: "All" },
                  { v: "Easy", l: "Easy" },
                  { v: "Medium", l: "Medium" },
                  { v: "Hard", l: "Hard" },
                ]}
                value={diffFilter}
                onChange={(v) => setDiffFilter(v as "All" | Difficulty)}
              />
              <div style={{ width: 1, height: 18, background: "var(--border)" }} />
              <FilterSelect
                label="Tag"
                value={tagFilter}
                onChange={setTagFilter}
                options={allTags}
              />
              <div style={{ width: 1, height: 18, background: "var(--border)" }} />
              <FilterGroup
                label="Sort"
                options={[
                  { v: "recent", l: "Recent" },
                  { v: "rating", l: "Lowest rating" },
                  { v: "next", l: "Next review" },
                ]}
                value={sortBy}
                onChange={(v) => setSortBy(v as SortKey)}
              />
            </div>

            <Card padding={0}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 110px 90px 110px 100px 80px",
                  padding: "12px 24px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-mute)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                <span>Problem</span>
                <span>Difficulty</span>
                <span>Last rating</span>
                <span>Last seen</span>
                <span>Next review</span>
                <span style={{ textAlign: "right" }}>Tries</span>
              </div>
              {filtered.map((p, i) => (
                <ProblemRow
                  key={p.id}
                  row={p}
                  odd={i % 2 === 1}
                  today={today}
                  tagWeakness={tagWeaknessMap}
                />
              ))}
            </Card>
          </>
        )}
      </div>
    </>
  );
}

function ProblemRow({
  row,
  odd,
  today,
  tagWeakness,
}: {
  row: ProblemRow;
  odd: boolean;
  today: string;
  tagWeakness: Map<string, number>;
}) {
  const [hover, setHover] = React.useState(false);
  const days = daysBetween(row.lastAttempt.attemptedAt, today);
  const baseBg = odd
    ? "color-mix(in oklch, var(--surface-hi) 30%, transparent)"
    : "transparent";
  const isOverdue =
    row.schedule != null && row.schedule.nextReviewAt <= today;
  return (
    <a
      href={`https://leetcode.com/problems/${row.slug}/`}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 110px 90px 110px 100px 80px",
        alignItems: "center",
        padding: "14px 24px",
        borderBottom: "1px solid var(--border)",
        background: hover ? "var(--surface-hi)" : baseBg,
        textDecoration: "none",
        color: "inherit",
        transition: "background 120ms",
        cursor: "pointer",
      }}
    >
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 13.5,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.title}
        </span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {row.tags.slice(0, 3).map((t) => (
            <Tag key={t} weakness={tagWeakness.get(t)}>
              {t}
            </Tag>
          ))}
          {row.tags.length > 3 && (
            <span
              style={{ fontSize: 11, color: "var(--text-mute)", alignSelf: "center" }}
            >
              +{row.tags.length - 3}
            </span>
          )}
        </div>
      </div>
      <div>
        <DiffBadge difficulty={row.difficulty} size="sm" />
      </div>
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: `color-mix(in oklch, ${ratingColor(row.lastAttempt.recallRating)} 16%, transparent)`,
              border: `1px solid color-mix(in oklch, ${ratingColor(row.lastAttempt.recallRating)} 35%, transparent)`,
              color: ratingColor(row.lastAttempt.recallRating),
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            {row.lastAttempt.recallRating}
          </span>
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text-dim)",
        }}
      >
        {days === 0 ? "today" : `${days}d ago`}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: isOverdue ? TOKENS.bad : "var(--text-dim)",
        }}
      >
        {formatNext(row.schedule, today)}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text-mute)",
          textAlign: "right",
        }}
      >
        ×{row.attemptCount}
      </div>
    </a>
  );
}

interface OptionItem {
  v: string;
  l: string;
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: OptionItem[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          fontSize: 10.5,
          color: "var(--text-mute)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "flex",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: 2,
        }}
      >
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              padding: "4px 10px",
              background: value === o.v ? "var(--surface-hi)" : "transparent",
              border: "none",
              color: value === o.v ? "var(--text)" : "var(--text-mute)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          fontSize: 10.5,
          color: "var(--text-mute)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontSize: 12,
          fontFamily: "var(--font-sans)",
          padding: "5px 10px",
          borderRadius: 6,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
