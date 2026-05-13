# leetcode-daily

A personal LeetCode spaced repetition tool. It resurfaces problems at the right time using a hybrid SM-2 + topic weakness algorithm, sends a daily email with the day's problem, and uses your recall ratings to drive the schedule.

One problem per day. Rate it before the next one unlocks.

## How it works

### Daily queue

`GET /api/queue` returns at most one problem per day, picked in priority order:

1. **Incomplete review** — a problem due today (or earlier) with no attempt logged today. Blocks everything else until rated.
2. **SR due** — the earliest scheduled problem with `next_review_at <= today`.
3. **New problem** — picks from the unseeded LeetCode bank, matching your weakest tag at an adaptive difficulty, and creates a schedule row due today.
4. **Nothing** — you're ahead of schedule.

Missing a day has no penalty. The same problem reappears the next day.

### Hybrid scheduling algorithm

Each rating (`POST /api/attempt`) combines two signals:

- **SM-2 base** — interval grows when `recall_rating >= 3`, resets to 1 day on failure. Ease factor defaults to 2.5 and adjusts with rating.
- **Topic weakness modifier** — per-tag `weakness_score = failures / total_attempts`. The SM-2 interval is scaled by `(1 - avg_weakness_score)` across the problem's tags, clamped to a 1-day minimum.

Weaker topics resurface faster; stronger ones space out.

### Adaptive difficulty (new problem selection)

When the queue assigns a new problem from the unseeded bank, difficulty is derived per-tag from your attempt history on Medium problems in that tag:

| Avg rating on Medium | Assigned difficulty |
|---|---|
| ≥ 4 | Hard |
| ≤ 2 | Easy |
| Otherwise | Medium |
| No history | Easy |

### Problem pool

Two kinds of problems coexist in the `problems` table:

- **Solved** — synced from your LeetCode accepted submissions via `/api/sync`. Each gets a head-start schedule row (`interval_days = 1`, `ease_factor = 2.5`, `next_review_at = tomorrow`).
- **Unseeded** — loaded from the full LeetCode problem bank via `/api/seed`. No schedule row until the queue assigns them as a "new problem".

### Daily email

A Vercel cron job fires daily at 17:00 UTC (9 AM PST) → `GET /api/cron/daily-reminder` → checks `settings.notifications_enabled` → sends a Gmail SMTP email with the day's problem title, difficulty, tags, and a link back to the app. Toggle notifications at `/settings`.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Neon (serverless Postgres) via Drizzle ORM |
| Styling | Tailwind CSS v4 |
| Email | Nodemailer + Gmail SMTP |
| LeetCode data | [alfa-leetcode-api](https://alfa-leetcode-api.onrender.com) |
| Hosting | Vercel |

## Pages

| Route | Purpose |
|---|---|
| `/` | Today's problem, recall rating, manual log panel |
| `/problems` | Browse and search the problem pool |
| `/stats` | Streak, activity heatmap, tag weakness, difficulty mix, rating trend |
| `/settings` | Notifications, sync, reset |

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/queue` | GET | Today's single problem |
| `/api/attempt` | POST | Log recall rating, advance schedule |
| `/api/problems` | GET | List the problem pool |
| `/api/problems/search` | GET | Search problems by title/slug |
| `/api/upcoming` | GET | Upcoming review dates |
| `/api/stats` | GET | Topic weakness scores, streak, upcoming due dates |
| `/api/settings` | GET / PATCH | Read or update notification settings |
| `/api/settings/sync` | POST | Trigger a LeetCode sync from the settings page |
| `/api/settings/reset` | POST | Reset local schedule/attempt data |
| `/api/sync` | POST | Pull accepted submissions from alfa-leetcode-api, upsert DB |
| `/api/seed` | POST | One-time seed of the full LeetCode problem bank |
| `/api/cron/daily-reminder` | GET | Vercel cron trigger — sends the daily email if enabled |

## Database schema

| Table | Key fields |
|---|---|
| `problems` | `id`, `slug`, `title`, `difficulty`, `tags` (jsonb) |
| `attempts` | `id`, `problem_id`, `attempted_at`, `recall_rating` (1–5), `solved` |
| `schedule` | `problem_id`, `next_review_at`, `interval_days`, `ease_factor` |
| `settings` | `id`, `notifications_enabled`, `notification_email`, `last_sync_at` |

## Environment variables

```
DATABASE_URL=             # Neon connection string
LEETCODE_API_URL=         # alfa-leetcode-api base URL
LEETCODE_USERNAME=        # LeetCode username (no session cookie needed)
CRON_SECRET=              # Random secret — validated on /api/sync, /api/seed, /api/cron/*
GMAIL_USER=               # Gmail address for sending
GMAIL_APP_PASSWORD=       # Google App Password (requires 2FA enabled)
NOTIFICATION_EMAIL=       # Recipient email for daily reminders
NEXT_PUBLIC_APP_URL=      # Deployment URL (used in email links)
```

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database migrations

```bash
npx drizzle-kit generate   # produce a new migration from schema.ts
npx drizzle-kit migrate    # apply migrations to DATABASE_URL
```

## First-time setup

1. Create a Neon database and set `DATABASE_URL`.
2. Apply migrations: `npx drizzle-kit migrate`.
3. Set `LEETCODE_USERNAME` and the Gmail / notification env vars.
4. Hit `POST /api/seed` once to load the unseeded problem bank (required for the queue's new-problem path).
5. Hit `POST /api/sync` (or use the Sync button on `/settings`) to import your accepted submissions.
6. Open the app — your earliest-synced problem will be due tomorrow, or a new problem will be assigned today from the unseeded bank.

## Deployment

Push to a Vercel project, set the env vars in the Vercel dashboard, and `vercel.json` will register the daily cron at 17:00 UTC.
