# leetcode-daily

A personal LeetCode spaced repetition tool. It resurfaces problems at the right time using a hybrid SM-2 + topic weakness algorithm, sends a daily email with the day's problem, and uses your recall ratings to drive the schedule.

One problem per day. Rate it before the next one unlocks.

## How it works

### Daily queue

`GET /api/queue` returns at most one problem per day, picked in priority order:

1. **Incomplete review** — a problem due today (or earlier) with no attempt logged today. Blocks everything else until rated.
2. **SR due** — the earliest scheduled problem with `next_review_at <= today`.
3. **New problem** — picks an unseeded problem from the [Neetcode 150](https://leetcode.com/problem-list/plakya4j/), matching your weakest tag at an adaptive difficulty, and creates a schedule row due today.
4. **Nothing** — you're ahead of schedule.

Missing a day has no penalty. The same problem reappears the next day.

### Hybrid scheduling algorithm

Each rating (`POST /api/attempt`) combines two signals:

- **SM-2 base** — interval grows when `recall_rating >= 3`, resets to 1 day on failure. Ease factor defaults to 2.5 and adjusts with rating.
- **Topic weakness modifier** — per-tag `weakness_score = failures / total_attempts`, over your all-time history rather than the recency window used elsewhere. The SM-2 interval is scaled by `(1 - avg_weakness_score)` across the problem's tags, clamped to a 1-day minimum.

Weaker topics resurface faster; stronger ones space out.

### Adaptive difficulty (new problem selection)

When the queue assigns a new problem from the Neetcode 150, difficulty comes from a
per-tag level on the `Easy → Medium → Hard` ladder, judged on **recent** attempts
only — at most the last 5 per (tag, difficulty), and nothing older than 60 days:

1. Start at the highest difficulty with ≥ 3 attempts in that window, so a stray attempt or two at a level doesn't set it
2. Promote while that level's average rating is ≥ 4, then demote while it is ≤ 2
3. A tag with no attempts in the window inherits the **global level** — the same ladder applied to your whole recent record, rather than defaulting to Easy

Old ratings dropping out of the window is what lets a tag demoted long ago be
retried at the higher level, instead of being locked out of it permanently.

### Starred topics

Star a topic in the Stats list to have it picked first for new problems. Unstarred
topics stay in the running as a fallback, so you still see them once the starred
ones have nothing left.

Because a topic resolves to a single difficulty, a starred topic with nothing left
at that difficulty would otherwise be skipped silently. For starred topics only,
the level becomes a preference rather than a filter — the queue tries the level
first, then steps down, then up. So starring a topic can serve you an off-level
problem; that is the trade for asking for the topic by name. Unstarred selection
keeps strict level matching.

### Problem pool

Two kinds of problems coexist in the `problems` table:

- **Solved** — synced from your LeetCode accepted submissions via `/api/sync`. Each gets a head-start schedule row (`interval_days = 1`, `ease_factor = 2.5`, `next_review_at = tomorrow`).
- **Unseeded** — loaded from the full LeetCode problem bank via `/api/seed`. No schedule row until the queue assigns them as a "new problem".

New-problem selection is restricted to the [Neetcode 150](https://leetcode.com/problem-list/plakya4j/): `/api/seed/neetcode150` marks those problems with an `in_neetcode150` flag (and populates their tags), and the queue only assigns flagged problems as new problems. Already-scheduled problems outside the list still come up for review — only *new* picks are restricted. Because the upstream API rate-limits at ~80 requests/hour, the route is incremental and idempotent: re-run it until it reports `totalSeeded: 150`.

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
| `/api/settings/reset` | POST | Full wipe — deletes all attempts **and** schedule rows (problems kept) |
| `/api/tags/starred` | PATCH | Star or unstar one topic (`{ tag, starred }`) |
| `/api/sync` | POST | Pull accepted submissions from alfa-leetcode-api, upsert DB |
| `/api/seed` | POST | One-time seed of the full LeetCode problem bank |
| `/api/seed/neetcode150` | POST | Flag + tag the Neetcode 150 (incremental; re-run until `totalSeeded: 150`) |
| `/api/cron/daily-reminder` | GET | Vercel cron trigger — sends the daily email if enabled |

## Database schema

| Table | Key fields |
|---|---|
| `problems` | `id`, `slug`, `title`, `difficulty`, `tags` (jsonb), `in_neetcode150` |
| `attempts` | `id`, `problem_id`, `attempted_at`, `recall_rating` (1–5), `solved` |
| `schedule` | `problem_id`, `next_review_at`, `interval_days`, `ease_factor` |
| `settings` | `id`, `notifications_enabled`, `notification_email`, `last_sync_at` |
| `starred_tags` | `tag` (PK), `created_at` — presence of a row means the topic is starred |

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
4. Hit `POST /api/seed` once to load the unseeded problem bank.
5. Hit `POST /api/seed/neetcode150` to flag + tag the Neetcode 150 (the new-problem pool). The upstream API rate-limits at ~80 requests/hour, so re-run it until it reports `totalSeeded: 150`.
6. Hit `POST /api/sync` (or use the Sync button on `/settings`) to import your accepted submissions.
7. Open the app — your earliest-synced problem will be due tomorrow, or a new problem will be assigned today from the Neetcode 150.

## Deployment

Push to a Vercel project, set the env vars in the Vercel dashboard, and `vercel.json` will register the daily cron at 17:00 UTC.
