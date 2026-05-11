"use client";

import * as React from "react";
import { PageHeader } from "../PageHeader";
import { Card } from "../Card";
import { TOKENS } from "../tokens";

type Status = "ok" | "warn" | "bad";

type SettingsResponse = {
  notificationsEnabled: boolean;
  notificationEmail: string | null;
  lastSyncAt: string | null;
  system: {
    leetcodeUsername: string | null;
    leetcodeApiHost: string | null;
    cronSchedule: string | null;
    sendTimeUtc: string | null;
    databaseConfigured: boolean;
    smtpConfigured: boolean;
  };
};

const formatLastSync = (iso: string | null): string => {
  if (!iso) return "Never";
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
};

export function SettingsScreen() {
  const [data, setData] = React.useState<SettingsResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [emailDraft, setEmailDraft] = React.useState("");
  const [savingEmail, setSavingEmail] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Settings returned ${r.status}`);
        return (await r.json()) as SettingsResponse;
      })
      .then((s) => {
        if (cancelled) return;
        setData(s);
        setEmailDraft(s.notificationEmail ?? "");
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patchSettings = async (body: Partial<Pick<SettingsResponse, "notificationsEnabled" | "notificationEmail">>) => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Save returned ${res.status}`);
    return (await res.json()) as Pick<SettingsResponse, "notificationsEnabled" | "notificationEmail">;
  };

  const toggleNotifs = async (next: boolean) => {
    if (!data) return;
    const prev = data.notificationsEnabled;
    setData({ ...data, notificationsEnabled: next });
    setSaveError(null);
    try {
      await patchSettings({ notificationsEnabled: next });
    } catch (e) {
      setData({ ...data, notificationsEnabled: prev });
      setSaveError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const commitEmail = async () => {
    if (!data) return;
    const value = emailDraft.trim();
    if (value === (data.notificationEmail ?? "")) return;
    setSaveError(null);
    setSavingEmail(true);
    try {
      const updated = await patchSettings({ notificationEmail: value === "" ? null : value });
      setData({ ...data, notificationEmail: updated.notificationEmail });
    } catch (e) {
      setEmailDraft(data.notificationEmail ?? "");
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingEmail(false);
    }
  };

  const runSyncNow = async () => {
    setSaveError(null);
    setSyncing(true);
    try {
      const res = await fetch("/api/settings/sync", { method: "POST" });
      if (!res.ok) throw new Error(`Sync returned ${res.status}`);
      const body = (await res.json()) as { lastSyncAt: string };
      setData((d) => (d ? { ...d, lastSyncAt: body.lastSyncAt } : d));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const resetSchedule = async () => {
    if (!confirm("Clear all schedule rows? Attempts and problems will be kept.")) return;
    setSaveError(null);
    setResetting(true);
    try {
      const res = await fetch("/api/settings/reset", { method: "POST" });
      if (!res.ok) throw new Error(`Reset returned ${res.status}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <PageHeader kicker="SETTINGS" title="Preferences" />
      <div
        style={{
          padding: "32px 48px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 760,
        }}
      >
        {loadError && (
          <div style={{ color: TOKENS.bad, fontSize: 13 }}>Failed to load settings: {loadError}</div>
        )}
        {saveError && (
          <div style={{ color: TOKENS.bad, fontSize: 13 }}>{saveError}</div>
        )}

        <Card padding={0}>
          <div style={{ padding: "20px 28px 0" }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Notifications
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "var(--text-mute)",
              }}
            >
              Daily email reminder via Gmail SMTP
            </p>
          </div>
          <div style={{ padding: "0 28px" }}>
            <SettingRow
              label="Daily reminder email"
              desc="Sent each morning at the time below if a problem is due."
              control={
                <Switch
                  value={data?.notificationsEnabled ?? false}
                  disabled={!data}
                  onChange={toggleNotifs}
                />
              }
            />
            <SettingRow
              label="Recipient"
              desc="Where the daily email is delivered."
              control={
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onBlur={commitEmail}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  disabled={!data || !data.notificationsEnabled || savingEmail}
                  placeholder="you@example.com"
                  style={{
                    background: "var(--surface-hi)",
                    border: "1px solid var(--border)",
                    color: data?.notificationsEnabled ? "var(--text)" : "var(--text-mute)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                    width: 240,
                  }}
                />
              }
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "20px 0",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: "var(--text)", marginBottom: 4 }}>
                  Send time (UTC)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-mute)" }}>
                  Vercel cron fires once per day. Adjust via vercel.json.
                </div>
              </div>
              <input
                type="time"
                value={data?.system.sendTimeUtc ?? ""}
                readOnly
                disabled={!data?.notificationsEnabled}
                style={{
                  background: "var(--surface-hi)",
                  border: "1px solid var(--border)",
                  color: data?.notificationsEnabled ? "var(--text)" : "var(--text-mute)",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ padding: "20px 28px 0" }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              LeetCode sync
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "var(--text-mute)",
              }}
            >
              Pull accepted submissions from alfa-leetcode-api.
            </p>
          </div>
          <div style={{ padding: "0 28px" }}>
            <SettingRow
              label="Username"
              desc="Your public LeetCode handle (set via LEETCODE_USERNAME)."
              control={
                <input
                  value={data?.system.leetcodeUsername ?? ""}
                  readOnly
                  style={{
                    background: "var(--surface-hi)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                    width: 240,
                  }}
                />
              }
            />
            <SettingRow
              label="Last sync"
              desc="Most recent successful pull from alfa-leetcode-api."
              control={
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12.5,
                      color: "var(--text-dim)",
                    }}
                  >
                    {formatLastSync(data?.lastSyncAt ?? null)}
                  </span>
                  <button
                    onClick={runSyncNow}
                    disabled={!data || syncing}
                    style={{
                      padding: "8px 14px",
                      background: "var(--surface-hi)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      borderRadius: 6,
                      fontSize: 12.5,
                      cursor: syncing ? "default" : "pointer",
                      opacity: syncing ? 0.6 : 1,
                    }}
                  >
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                </div>
              }
            />
          </div>
        </Card>

        <Card>
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: 16,
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            System
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
            }}
          >
            <StatusRow
              label="Cron"
              value={data?.system.cronSchedule ?? "—"}
              status={data?.system.cronSchedule ? "ok" : "bad"}
              desc="Configured in vercel.json"
            />
            <StatusRow
              label="Database"
              value={data?.system.databaseConfigured ? "Configured" : "Not configured"}
              status={data?.system.databaseConfigured ? "ok" : "bad"}
              desc={data?.system.databaseConfigured ? "DATABASE_URL set" : "DATABASE_URL not set"}
            />
            <StatusRow
              label="Email (SMTP)"
              value={data?.system.smtpConfigured ? "Configured" : "Not configured"}
              status={data?.system.smtpConfigured ? "ok" : "bad"}
              desc={data?.system.smtpConfigured ? "GMAIL_USER + app password set" : "GMAIL_USER or GMAIL_APP_PASSWORD missing"}
            />
            <StatusRow
              label="LeetCode API"
              value={data?.system.leetcodeApiHost ?? "—"}
              status={data?.system.leetcodeApiHost ? "ok" : "bad"}
              desc={data?.system.leetcodeApiHost ? "LEETCODE_API_URL set" : "LEETCODE_API_URL not set"}
            />
          </div>
        </Card>

        <div
          style={{
            padding: "18px 22px",
            border: `1px solid color-mix(in oklch, ${TOKENS.bad} 25%, var(--border))`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: `color-mix(in oklch, ${TOKENS.bad} 5%, transparent)`,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 2 }}>
              Reset schedule
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>
              Clears all schedule rows. Attempts and problems are kept.
            </div>
          </div>
          <button
            onClick={resetSchedule}
            disabled={resetting}
            style={{
              padding: "8px 14px",
              background: "transparent",
              border: `1px solid color-mix(in oklch, ${TOKENS.bad} 40%, transparent)`,
              color: TOKENS.bad,
              borderRadius: 6,
              fontSize: 12.5,
              cursor: resetting ? "default" : "pointer",
              opacity: resetting ? 0.6 : 1,
            }}
          >
            {resetting ? "Resetting…" : "Reset"}
          </button>
        </div>
      </div>
    </>
  );
}

function Switch({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      disabled={disabled}
      style={{
        width: 38,
        height: 22,
        background: value ? "var(--accent)" : "var(--surface-hi)",
        border: `1px solid ${value ? "color-mix(in oklch, var(--accent) 50%, transparent)" : "var(--border)"}`,
        borderRadius: 999,
        position: "relative",
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        transition: "background 180ms",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: value ? 18 : 2,
          width: 16,
          height: 16,
          background: value ? "var(--bg)" : "var(--text-dim)",
          borderRadius: 999,
          transition: "left 180ms cubic-bezier(.2,.8,.2,1)",
        }}
      />
    </button>
  );
}

function SettingRow({
  label,
  desc,
  control,
}: {
  label: string;
  desc: string;
  control: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "20px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13.5,
            color: "var(--text)",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.5 }}>
          {desc}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  status,
  desc,
}: {
  label: string;
  value: string;
  status: Status;
  desc: string;
}) {
  const c = status === "ok" ? TOKENS.ok : status === "warn" ? TOKENS.medium : TOKENS.bad;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 0",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: c,
          marginTop: 6,
          flexShrink: 0,
          boxShadow: `0 0 6px ${c}`,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</span>
          <span
            style={{
              fontSize: 11.5,
              color: "var(--text)",
              fontFamily: "var(--font-mono)",
              textAlign: "right",
            }}
          >
            {value}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 3 }}>
          {desc}
        </div>
      </div>
    </div>
  );
}
