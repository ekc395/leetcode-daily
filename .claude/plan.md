# Plan: leetcode-daily — Project Architecture

## Context

Personal LeetCode spaced repetition tool to resurface problems at the right time using a hybrid SM-2 + topic weakness algorithm. Built as a full-stack learning project, deployed to Vercel. One problem per day — must complete it before the next one unlocks. Sends a daily email with the problem preview; notifications can be toggled in the app. Entire stack is free.

---

## Stack (all free)

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js** (App Router) | Frontend + API routes in one repo, deploys natively to Vercel |
| Database | **Neon** (serverless Postgres) | Free tier (0.5 GB), Vercel integration |
| ORM | **Drizzle ORM** | Lightweight, TypeScript-native |
| Styling | **Tailwind CSS** | Fast, no separate CSS files |
| Email | **Nodemailer + Gmail SMTP** | Completely free — sends from Gmail via App Password |
| LeetCode data | **alfa-leetcode-api** | No auth needed. Base URL: `https://alfa-leetcode-api.onrender.com` |
| Hosting | **Vercel** (Hobby) | Free, supports 1 daily cron job |

**Gmail SMTP setup**: Enable 2FA on Google account → generate an App Password → use as `GMAIL_APP_PASSWORD`.

---

## Repository Structure

```
/
  app/
    page.tsx                     # Today's queue — shows the 1 current problem
    stats/page.tsx               # Stats dashboard
    problems/page.tsx            # Full problem history
    settings/page.tsx            # Toggle notifications on/off
    api/
      queue/route.ts             # GET — today's single problem
      attempt/route.ts           # POST — log recall rating, advance schedule
      sync/route.ts              # POST — pull accepted submissions from alfa-leetcode-api
      stats/route.ts             # GET — topic weakness, streaks
      settings/route.ts          # GET/PATCH — read/update notification settings
      cron/
        daily-reminder/route.ts  # POST — called by Vercel cron, sends daily email
  lib/
    db/
      schema.ts                  # Drizzle schema
      index.ts                   # Neon DB connection
    scheduler/
      algorithm.ts               # Hybrid SR engine + daily queue selection
    leetcode/
      client.ts                  # alfa-leetcode-api wrapper
      types.ts                   # API response types
    email/
      template.ts                # Plain HTML email builder for daily problem
      sender.ts                  # Nodemailer Gmail SMTP wrapper
  components/
    Queue.tsx
    RatingWidget.tsx             # 1–5 recall rating UI
    StatsChart.tsx
    NotificationToggle.tsx       # On/off switch for email notifications
  vercel.json                    # Cron job config
  .env.local
  .claude/
    CLAUDE.md                    # Architecture guidance for Claude Code
    plan.md                      # This file
```

---

## Problem Pool

Two types of problems coexist in the `problems` table:

| Type | Source | Schedule row on entry |
|---|---|---|
| **Solved** | `/api/sync` (LeetCode accepted submissions) | `interval_days = 1`, `ease_factor = 2.5`, `next_review_at = tomorrow` |
| **Unseeded** | `/api/seed` (full LeetCode problem bank) | No schedule row until assigned by queue |

---

## Daily Queue Logic

**One problem per day. No new problem until the current one is rated.**

`GET /api/queue` priority:

1. **Incomplete review** — problem with `next_review_at <= today` and no attempt logged today → surface it, blocks everything else
2. **SR due** — earliest `next_review_at <= today` from scheduled problems
3. **New problem** — pick unseeded problem (no schedule row) matching weakest tag + adaptive difficulty; create schedule row with `next_review_at = today`
4. **Nothing** — return empty (user is ahead of schedule)

Queue is always 0 or 1 problem. Missing a day means tomorrow you see the same problem — no interval penalty.

---

## Adaptive Difficulty

When step 3 picks a new problem, difficulty is derived per-tag from attempt history:
- avg rating ≥ 4 on Medium problems in that tag → assign Hard
- avg rating ≤ 2 on Medium problems in that tag → assign Easy
- Otherwise → stay at Medium
- No history for tag → default to Easy

---

## Email Notifications

**Trigger**: Vercel Cron Job calls `POST /api/cron/daily-reminder` once per day (9 AM UTC).

**Route logic**:
1. Check `settings.notifications_enabled` — exit early if false
2. Run queue selection logic — get today's problem
3. If a problem is due, send email via Gmail SMTP with title, difficulty, tags, and "Start Review" link
4. If no problem due, skip

**`vercel.json`**:
```json
{
  "crons": [{ "path": "/api/cron/daily-reminder", "schedule": "0 9 * * *" }]
}
```

---

## Database Schema

| Table | Key fields |
|---|---|
| `problems` | id, slug, title, difficulty, tags (jsonb) |
| `attempts` | id, problem_id, attempted_at, recall_rating (1–5), solved (bool) |
| `schedule` | problem_id, next_review_at, interval_days, ease_factor |
| `settings` | id, notifications_enabled (bool, default true), notification_email |

`attempts.attempted_at` determines whether today's problem has been rated. If no attempt exists with `attempted_at = today`, the problem is still pending.

---

## Hybrid SR Algorithm (`lib/scheduler/algorithm.ts`)

Called after `POST /api/attempt` to compute the next `next_review_at`.

**SM-2 base** (per problem):
- `interval` grows when recall_rating ≥ 3, resets to 1 day on failure
- `ease_factor` adjusts based on rating history (default 2.5)

**Topic weakness modifier**:
- For each tag on the problem, compute `weakness_score = failures / total_attempts` across all problems with that tag
- Final interval = `sm2_interval × (1 − avg_weakness_score)`
- Clamp to minimum 1 day

Example: DP problems with 60% failure rate → a DP problem due in 10 days gets pulled to ~4 days.

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/queue` | GET | Today's single problem (or empty if none due) |
| `/api/attempt` | POST | Log recall rating, compute + write next schedule |
| `/api/sync` | POST | Fetch new accepted submissions, upsert problems + schedule |
| `/api/seed` | POST | One-time seed of full LeetCode problem bank into DB |
| `/api/stats` | GET | Topic weakness scores, current streak, upcoming due dates |
| `/api/settings` | GET / PATCH | Read/update notification settings |
| `/api/cron/daily-reminder` | POST | Vercel cron trigger — send daily email if enabled |

---

## Pages

- **`/`** — Today's problem + 1–5 rating widget. "Done for today" state if already rated.
- **`/stats`** — Topic weakness bar chart, upcoming review calendar
- **`/problems`** — Full history, filterable by tag/difficulty/rating
- **`/settings`** — Toggle to enable/disable daily email notifications

---

## Build Order

1. Update `CLAUDE.md` and `README.md` ✅
2. Init Next.js + Drizzle + Neon + Tailwind ✅
3. Write DB schema, run first migration ✅
4. Build alfa-leetcode-api client (`lib/leetcode/client.ts`) ✅
5. Build `/api/sync` to seed DB ✅
6. Implement SR algorithm (`lib/scheduler/algorithm.ts`) ✅
6a. Build `/api/seed` to seed full LeetCode problem bank
7. Build queue + attempt + stats API routes
8. Set up Nodemailer Gmail SMTP (`lib/email/`)
9. Build `/api/cron/daily-reminder` + `vercel.json` cron config
10. Build frontend pages + components
11. Deploy to Vercel, add env vars

---

## Environment Variables

```
DATABASE_URL=             # Neon connection string
LEETCODE_USERNAME=        # Your LeetCode username
GMAIL_USER=               # Your Gmail address
GMAIL_APP_PASSWORD=       # Google App Password (not your login password)
NOTIFICATION_EMAIL=       # Where to send daily emails (probably same as GMAIL_USER)
NEXT_PUBLIC_APP_URL=      # Your Vercel deployment URL (for email links)
```

---

## Verification Plan

1. `POST /api/sync` → problems + submissions appear in DB
2. `GET /api/queue` → 1 problem returned; same problem on next call if no attempt logged
3. `POST /api/attempt` with rating → schedule advances correctly
4. Skip a day → next day still returns same problem
5. `POST /api/cron/daily-reminder` manually → email arrives with correct problem
6. Toggle notifications off in `/settings` → cron route sends nothing
7. Deploy to Vercel → cron fires at 9 AM UTC, emails arrive, all routes work
