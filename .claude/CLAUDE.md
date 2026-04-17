# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`leetcode-daily` is a personal LeetCode spaced repetition tool. It resurfaces problems at the right time using a hybrid SM-2 + topic weakness algorithm, sends a daily email with the problem, and lets the user rate their recall to drive the schedule. One problem per day — must be rated before the next one unlocks.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Database | Neon (serverless Postgres) via Drizzle ORM |
| Styling | Tailwind CSS |
| Email | Nodemailer + Gmail SMTP |
| LeetCode data | alfa-leetcode-api (`https://alfa-leetcode-api.onrender.com`) |
| Hosting | Vercel (Hobby — free) |

## Key Architecture Concepts

### Problem Pool
Two types of problems coexist in the `problems` table:
- **Solved problems** — synced from LeetCode accepted submissions via `/api/sync`. Get a head-start schedule row on entry (`interval_days = 1`, `ease_factor = 2.5`, `next_review_at = tomorrow`).
- **Unseeded problems** — seeded from the full LeetCode problem bank via `/api/seed`. No schedule row until the queue assigns them.

### Daily Queue Logic
`GET /api/queue` returns at most 1 problem per day, in priority order:
1. **Incomplete review** — problem with `next_review_at <= today` and no attempt logged today → surface it, blocks everything else
2. **SR due** — earliest `next_review_at <= today` from scheduled problems
3. **New problem** — pick an unseeded problem (no schedule row) matching the user's weakest tag + adaptive difficulty; create a schedule row with `next_review_at = today`
4. **Nothing** — return empty (user is ahead of schedule)

Missing a day has no penalty — the same problem reappears the next day.

### Hybrid SR Algorithm (`lib/scheduler/algorithm.ts`)
Two components combined after each `POST /api/attempt`:
- **SM-2 base**: interval grows when recall_rating ≥ 3, resets to 1 day on failure; ease_factor defaults to 2.5
- **Topic weakness modifier**: `weakness_score = failures / total_attempts` per tag; `final_interval = sm2_interval × (1 − avg_weakness_score)`, clamped to minimum 1 day

### Adaptive Difficulty (for new problem selection)
When assigning an unseeded problem, difficulty is derived per-tag from the user's attempt history:
- avg rating ≥ 4 on Medium problems in that tag → assign Hard
- avg rating ≤ 2 on Medium problems in that tag → assign Easy
- Otherwise → stay at Medium
- No history for a tag → default to Easy

### Email Notifications
Vercel Cron Job fires daily at 9 AM UTC → `POST /api/cron/daily-reminder` → checks `settings.notifications_enabled` → sends Gmail SMTP email with problem title, difficulty, tags, and link to app. Notifications toggled via `/settings` page.

## Database Schema

| Table | Key fields |
|---|---|
| `problems` | id, slug, title, difficulty, tags (jsonb) |
| `attempts` | id, problem_id, attempted_at, recall_rating (1–5), solved (bool) |
| `schedule` | problem_id, next_review_at, interval_days, ease_factor |
| `settings` | id, notifications_enabled (bool), notification_email |

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/queue` | GET | Today's single problem |
| `/api/attempt` | POST | Log recall rating, advance schedule |
| `/api/sync` | POST | Pull accepted submissions from alfa-leetcode-api, upsert DB |
| `/api/seed` | POST | One-time seed of full LeetCode problem bank into DB |
| `/api/stats` | GET | Topic weakness scores, streak, upcoming due dates |
| `/api/settings` | GET/PATCH | Read/update notification settings |
| `/api/cron/daily-reminder` | POST | Vercel cron trigger — send daily email if enabled |

## Environment Variables

```
DATABASE_URL=             # Neon connection string
LEETCODE_USERNAME=        # LeetCode username (no session cookie needed)
GMAIL_USER=               # Gmail address for sending
GMAIL_APP_PASSWORD=       # Google App Password (requires 2FA enabled)
NOTIFICATION_EMAIL=       # Recipient email for daily reminders
NEXT_PUBLIC_APP_URL=      # Vercel deployment URL (used in email links)
```

## Commands

```bash
# Development
npm run dev

# DB migrations (Drizzle)
npx drizzle-kit generate
npx drizzle-kit migrate

# Build
npm run build
```

## LeetCode Client (`lib/leetcode/client.ts`)

Wraps alfa-leetcode-api. Key endpoints used:
- `/:username/acSubmission?limit=50` — accepted submissions for sync
- `/select?titleSlug=<slug>` — problem metadata (title, difficulty, tags)
- `/problems?limit=100&skip=0` — full problem list seeding

`/api/sync` deduplicates by slug so it's safe to call repeatedly.
