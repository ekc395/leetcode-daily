"use client";

import * as React from "react";
import { PageHeader } from "../PageHeader";
import { Card } from "../Card";
import { Icon } from "../Icon";
import { ProblemCard } from "./ProblemCard";
import { RatingPills } from "./RatingPills";
import { SchedulePeek } from "./SchedulePeek";
import { TodayProgress } from "./TodayProgress";
import { EmptyState } from "./EmptyState";
import { RatedState } from "./RatedState";
import { STREAK, type Problem } from "@/lib/mockData";

const formatLong = (d: Date) =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

type QueueResponse = { problem: Problem | null };

export function TodayScreen() {
  const [data, setData] = React.useState<QueueResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [rating, setRating] = React.useState<number | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [logging, setLogging] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/queue")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Queue returned ${r.status}`);
        return r.json();
      })
      .then((d: QueueResponse) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date();

  const handleLog = async () => {
    if (!data?.problem || !rating) return;
    setSubmitError(null);
    setLogging(true);
    try {
      const res = await fetch("/api/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: data.problem.id, recallRating: rating }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Attempt returned ${res.status}`);
      }
      setSubmitted(true);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Log attempt failed");
    } finally {
      setLogging(false);
    }
  };

  const buttonActive = !!rating && !logging;

  const renderMain = () => {
    if (loadError) {
      return (
        <Card>
          <div style={{ color: "var(--text-mute)", fontSize: 13 }}>Error: {loadError}</div>
        </Card>
      );
    }
    if (!data) {
      return (
        <Card>
          <div style={{ color: "var(--text-mute)", fontSize: 13 }}>Loading…</div>
        </Card>
      );
    }
    if (!data.problem) return <EmptyState />;
    if (submitted && rating) {
      return <RatedState problem={data.problem} rating={rating} />;
    }
    return (
      <>
        <ProblemCard problem={data.problem} />
        <Card>
          <RatingPills value={rating} onChange={setRating} />
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-mute)",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.5,
              }}
            >
              1–2 resets the interval · 3–5 advances it
            </div>
            <button
              disabled={!buttonActive}
              onClick={handleLog}
              style={{
                padding: "10px 18px",
                borderRadius: 6,
                background: buttonActive ? "var(--text)" : "var(--surface-hi)",
                color: buttonActive ? "var(--bg)" : "var(--text-mute)",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: buttonActive ? "pointer" : "not-allowed",
                fontFamily: "var(--font-sans)",
                transition: "all 140ms",
              }}
            >
              {logging ? "Logging…" : "Log attempt"}
            </button>
          </div>
          {submitError && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--text-mute)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Error: {submitError}
            </div>
          )}
        </Card>
      </>
    );
  };

  const headerKicker = submitted ? `Done · ${formatLong(today)}` : formatLong(today);

  const headerTitle = submitted ? "You're done for today" : "Today's problem";

  return (
    <>
      <PageHeader
        kicker={headerKicker}
        title={headerTitle}
        right={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 12,
              color: "var(--text-mute)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="flame" size={14} />
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {STREAK.current}d streak
              </span>
            </span>
            <span style={{ width: 1, height: 12, background: "var(--border)" }} />
            <span style={{ fontFamily: "var(--font-mono)" }}>9:00 UTC reset</span>
          </div>
        }
      />

      <div
        style={{
          padding: "32px 48px 64px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 32,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {renderMain()}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            position: "sticky",
            top: 24,
          }}
        >
          <TodayProgress state={submitted ? "rated" : "due"} />
          <SchedulePeek />
        </div>
      </div>
    </>
  );
}
