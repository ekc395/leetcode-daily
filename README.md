# leetcode-daily

A personal LeetCode spaced repetition tool to build consistent study habits and practice smarter, not more.

## How it works

- **One problem per day** — the app selects the single highest-priority problem from your solved history
- **Rate your recall** — after reviewing, rate yourself 1–5. Your rating drives how soon the problem comes back
- **Hybrid scheduling** — combines SM-2 (Anki-style intervals) with topic weakness weighting, so problems in your weak areas (e.g. dynamic programming) resurface sooner
- **Daily email** — get a morning email with your problem preview so you never have to remember to check
- **Focused retry** — if you miss a day, tomorrow you see the same problem. No new problems until the current one is done

## Stack

- **Next.js** (App Router) — frontend + API routes, deployed to Vercel
- **Neon** — serverless Postgres database
- **Drizzle ORM** — TypeScript-native schema and queries
- **alfa-leetcode-api** — pulls your accepted submissions and problem metadata (no session cookie needed)
- **Nodemailer + Gmail SMTP** — daily email notifications
- **Vercel Cron** — triggers the daily email at 9 AM UTC

Everything is free on the tiers used.

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd leetcode-daily
npm install
```

### 2. Configure environment variables

Create `.env.local`:

```
DATABASE_URL=             # Neon connection string
LEETCODE_USERNAME=        # Your LeetCode username
GMAIL_USER=               # Gmail address to send from
GMAIL_APP_PASSWORD=       # Google App Password (requires 2FA — generate at myaccount.google.com/apppasswords)
NOTIFICATION_EMAIL=       # Where to receive daily emails
NEXT_PUBLIC_APP_URL=      # Your deployed URL (or http://localhost:3000 locally)
```

### 3. Run migrations

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 4. Sync your LeetCode history

```bash
curl -X POST http://localhost:3000/api/sync
```

### 5. Start the dev server

```bash
npm run dev
```

## Pages

| Page | Description |
|---|---|
| `/` | Today's problem + 1–5 recall rating widget |
| `/stats` | Topic weakness chart, upcoming review calendar |
| `/problems` | Full solve history, filterable by tag/difficulty/rating |
| `/settings` | Toggle daily email notifications on/off |

## Deployment

Push to Vercel and add the environment variables in the Vercel dashboard. The cron job (`vercel.json`) runs `/api/cron/daily-reminder` daily at 9 AM UTC automatically on Vercel's Hobby plan.
