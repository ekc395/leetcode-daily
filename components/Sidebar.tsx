"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { StreakRing } from "./StreakRing";
import { SIDEBAR_W } from "./tokens";
import type { Streak } from "@/lib/types";

type NavItem = { href: string; label: string; icon: IconName; hasBadge?: boolean };

const items: NavItem[] = [
  { href: "/", label: "Today", icon: "today", hasBadge: true },
  { href: "/stats", label: "Stats", icon: "stats" },
  { href: "/problems", label: "Problems", icon: "list" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [streak, setStreak] = React.useState<Streak | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Stats returned ${r.status}`);
        return r.json();
      })
      .then((d: { streak: Streak }) => {
        if (!cancelled) setStreak(d.streak);
      })
      .catch(() => {
        // silent: sidebar is non-critical
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside
      style={{
        width: SIDEBAR_W,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        background: "var(--bg)",
        padding: "22px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "var(--accent)",
            display: "grid",
            placeItems: "center",
            color: "var(--bg)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 0 24px -6px var(--accent)",
          }}
        >
          L
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em" }}>leetcode</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-mute)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            daily
          </span>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const active = pathname === it.href;
          return <NavLink key={it.href} item={it} active={active} />;
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: 12,
          border: "1px solid var(--border)",
          borderRadius: 10,
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <StreakRing value={streak?.current ?? 0} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-mute)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Streak
          </span>
          <span style={{ fontSize: 13, color: "var(--text)" }}>
            {streak ? `${streak.current} days` : "—"}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-mute)" }}>
            {streak ? `best · ${streak.longest}` : ""}
          </span>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const [hover, setHover] = React.useState(false);
  return (
    <Link
      href={item.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 6,
        border: "1px solid transparent",
        background: active
          ? "var(--surface)"
          : hover
            ? "color-mix(in oklch, var(--surface) 55%, transparent)"
            : "transparent",
        color: active || hover ? "var(--text)" : "var(--text-dim)",
        fontSize: 13.5,
        fontWeight: active ? 500 : 400,
        textDecoration: "none",
        fontFamily: "var(--font-sans)",
        position: "relative",
        transition: "background 140ms, color 140ms",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Icon name={item.icon} size={15} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.hasBadge && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--accent)",
            boxShadow: "0 0 8px var(--accent)",
          }}
        />
      )}
    </Link>
  );
}
