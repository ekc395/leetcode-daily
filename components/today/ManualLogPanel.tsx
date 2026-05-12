"use client";

import * as React from "react";
import { Card } from "../Card";
import { DiffBadge } from "../DiffBadge";
import { Icon } from "../Icon";
import { RatingPills } from "./RatingPills";
import { TOKENS } from "../tokens";
import type { Difficulty, Problem } from "@/lib/types";

const SEARCH_DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

type SearchResult = Problem;

type SearchResponse = {
  problems: SearchResult[];
};

export function ManualLogPanel() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<SearchResult | null>(null);
  const [rating, setRating] = React.useState<number | null>(null);
  const [logging, setLogging] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/problems/search?q=${encodeURIComponent(q)}`,
        );
        if (!res.ok) throw new Error(`Search returned ${res.status}`);
        const body = (await res.json()) as SearchResponse;
        if (cancelled) return;
        setResults(body.problems);
        setSearchError(null);
      } catch (e: unknown) {
        if (cancelled) return;
        setSearchError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  const handleSelect = (p: SearchResult) => {
    setSelected(p);
    setRating(null);
    setSubmitError(null);
    setConfirmation(null);
  };

  const handleReset = () => {
    setSelected(null);
    setRating(null);
    setSubmitError(null);
  };

  const handleLog = async () => {
    if (!selected || !rating) return;
    setSubmitError(null);
    setLogging(true);
    try {
      const res = await fetch("/api/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: selected.id, recallRating: rating }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Attempt returned ${res.status}`);
      }
      setConfirmation(`Logged ${selected.title}`);
      setSelected(null);
      setRating(null);
      setQuery("");
      setResults([]);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Log attempt failed");
    } finally {
      setLogging(false);
    }
  };

  const buttonActive = !!rating && !logging;

  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Icon name="bolt" size={14} />
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
          }}
        >
          Log another problem
        </span>
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: "var(--text-mute)",
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        Solved something on your own? Search for it and log a rating so the
        algorithm sees it.
      </div>

      {selected ? (
        <SelectedProblem
          problem={selected}
          rating={rating}
          onChangeRating={setRating}
          onReset={handleReset}
          onLog={handleLog}
          logging={logging}
          buttonActive={buttonActive}
          submitError={submitError}
        />
      ) : (
        <SearchPane
          query={query}
          onChangeQuery={setQuery}
          results={results}
          searching={searching}
          searchError={searchError}
          onSelect={handleSelect}
        />
      )}

      {confirmation && !selected && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 6,
            background: `color-mix(in oklch, ${TOKENS.ok} 12%, transparent)`,
            border: `1px solid color-mix(in oklch, ${TOKENS.ok} 30%, transparent)`,
            color: TOKENS.ok,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="check" size={13} />
          {confirmation}
        </div>
      )}
    </Card>
  );
}

function SearchPane({
  query,
  onChangeQuery,
  results,
  searching,
  searchError,
  onSelect,
}: {
  query: string;
  onChangeQuery: (q: string) => void;
  results: SearchResult[];
  searching: boolean;
  searchError: string | null;
  onSelect: (p: SearchResult) => void;
}) {
  const trimmed = query.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH;
  const noResults =
    !searching && !searchError && trimmed.length >= MIN_QUERY_LENGTH && results.length === 0;

  return (
    <>
      <input
        value={query}
        onChange={(e) => onChangeQuery(e.target.value)}
        placeholder="Search by title or slug…"
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "var(--surface-hi)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--text)",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
        }}
      />

      <div
        style={{
          marginTop: 12,
          minHeight: 4,
          fontSize: 11.5,
          color: "var(--text-mute)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {searching && "Searching…"}
        {tooShort && "Type at least 2 characters"}
        {noResults && "No matches"}
        {searchError && `Error: ${searchError}`}
      </div>

      {results.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                background: "var(--surface-hi)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "border-color 120ms",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--border-hi)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            >
              <DiffBadge difficulty={p.difficulty as Difficulty} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-mute)",
                    fontFamily: "var(--font-mono)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.slug}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function SelectedProblem({
  problem,
  rating,
  onChangeRating,
  onReset,
  onLog,
  logging,
  buttonActive,
  submitError,
}: {
  problem: SearchResult;
  rating: number | null;
  onChangeRating: (n: number) => void;
  onReset: () => void;
  onLog: () => void;
  logging: boolean;
  buttonActive: boolean;
  submitError: string | null;
}) {
  return (
    <>
      <div
        style={{
          padding: "12px 14px",
          marginBottom: 16,
          background: "var(--surface-hi)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <DiffBadge difficulty={problem.difficulty as Difficulty} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {problem.title}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-mute)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {problem.slug}
          </div>
        </div>
        <button
          onClick={onReset}
          style={{
            padding: "6px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--text-dim)",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
          }}
        >
          change
        </button>
      </div>

      <RatingPills value={rating} onChange={onChangeRating} />

      <div
        style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <button
          disabled={!buttonActive}
          onClick={onLog}
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
    </>
  );
}
