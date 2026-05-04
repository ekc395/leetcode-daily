"use client";

import * as React from "react";
import { Card } from "../Card";
import { DiffBadge } from "../DiffBadge";
import { Tag } from "../Tag";
import { Icon } from "../Icon";
import { TOKENS } from "../tokens";
import {
  TODAY,
  TAG_WEAKNESS,
  lastAttemptFor,
  type Problem,
} from "@/lib/mockData";

const daysAgo = (dateStr: string) => {
  const a = new Date(TODAY);
  const b = new Date(dateStr);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
};

function TagWeaknessRow({
  tag,
  weakness,
}: {
  tag: string;
  weakness: number;
}) {
  const c = weakness >= 0.4 ? TOKENS.bad : weakness >= 0.25 ? TOKENS.medium : TOKENS.textDim;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
      <span style={{ flex: "0 0 130px", color: "var(--text-dim)" }}>{tag}</span>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "var(--surface-hi)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${weakness * 100}%`,
            height: "100%",
            background: c,
            borderRadius: 999,
          }}
        />
      </div>
      <span
        style={{
          flex: "0 0 36px",
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: c,
        }}
      >
        {Math.round(weakness * 100)}%
      </span>
    </div>
  );
}

export function ProblemCard({ problem }: { problem: Problem }) {
  const [ctaHover, setCtaHover] = React.useState(false);
  const tagWeak = problem.tags
    .map((t) => TAG_WEAKNESS.find((w) => w.tag === t))
    .filter((w): w is NonNullable<typeof w> => Boolean(w))
    .sort((a, b) => b.weakness - a.weakness);

  const lastAttempt = lastAttemptFor(problem.id);

  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, var(--accent), color-mix(in oklch, var(--accent) 0%, transparent))`,
        }}
      />

      <div style={{ padding: "28px 32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <DiffBadge difficulty={problem.difficulty} />
          <span
            style={{
              fontSize: 11,
              color: "var(--text-mute)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
            }}
          >
            #{String(problem.id).padStart(4, "0")}
          </span>
          <span style={{ flex: 1 }} />
          {lastAttempt && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-mute)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Last seen {daysAgo(lastAttempt.attemptedAt)}d ago · rated{" "}
              {lastAttempt.recallRating}/5
            </span>
          )}
        </div>

        <h2
          style={{
            margin: "0 0 16px",
            fontFamily: "var(--font-serif)",
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: "var(--text)",
          }}
        >
          {problem.title}
        </h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
          {problem.tags.map((t) => {
            const w = TAG_WEAKNESS.find((x) => x.tag === t)?.weakness;
            return (
              <Tag key={t} weakness={w}>
                {t}
              </Tag>
            );
          })}
        </div>

        <a
          href={`https://leetcode.com/problems/${problem.slug}/`}
          target="_blank"
          rel="noreferrer"
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 22px",
            background: "var(--accent)",
            color: "var(--bg)",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            letterSpacing: "-0.005em",
            boxShadow:
              "0 0 0 1px color-mix(in oklch, var(--accent) 60%, transparent), 0 8px 30px -10px var(--accent)",
            transition: "transform 160ms",
            transform: ctaHover ? "translateY(-1px)" : "translateY(0)",
          }}
        >
          Open on LeetCode
          <Icon name="arrowUpRight" size={16} />
        </a>

        {tagWeak.length > 0 && (
          <div
            style={{
              marginTop: 28,
              paddingTop: 22,
              borderTop: "1px dashed var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--text-mute)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Why this one
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-mute)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                tag weakness
              </span>
            </div>
            {tagWeak.slice(0, 3).map((tw) => (
              <TagWeaknessRow key={tw.tag} tag={tw.tag} weakness={tw.weakness} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
