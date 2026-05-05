import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const SM2_PASS_THRESHOLD = 3;
const HEATMAP_DAYS = 84;
const RECALL_TREND_COUNT = 14;
const UPCOMING_HORIZON_DAYS = 14;

function todayUtc(): string {
    return new Date().toISOString().split("T")[0]!;
}

function shiftDay(isoDate: string, days: number): string {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split("T")[0]!;
}

const subDay = (isoDate: string, days: number) => shiftDay(isoDate, -days);

async function getTagWeakness() {
    const result = await db.execute<{
        tag: string;
        failures: number;
        total: number;
        weakness: number;
    }>(sql`
        SELECT
            tag.value AS tag,
            COUNT(*) FILTER (WHERE a.recall_rating < ${SM2_PASS_THRESHOLD})::int AS failures,
            COUNT(*)::int AS total,
            (COUNT(*) FILTER (WHERE a.recall_rating < ${SM2_PASS_THRESHOLD}))::float
                / NULLIF(COUNT(*), 0)::float AS weakness
        FROM attempts a
        JOIN problems p ON p.id = a.problem_id
        CROSS JOIN LATERAL jsonb_array_elements_text(p.tags) AS tag(value)
        GROUP BY tag.value
        ORDER BY weakness DESC NULLS LAST, total DESC
    `);
    return result.rows.map(r => ({
        tag: r.tag,
        failures: Number(r.failures),
        total: Number(r.total),
        weakness: Number(r.weakness ?? 0),
    }));
}

async function getStreakStats(today: string) {
    const datesResult = await db.execute<{ attempted_at: string }>(sql`
        SELECT DISTINCT attempted_at::text AS attempted_at
        FROM attempts
        ORDER BY attempted_at ASC
    `);
    const dates = datesResult.rows.map(r => r.attempted_at);
    const dateSet = new Set(dates);

    let cursor = dateSet.has(today) ? today : subDay(today, 1);
    let current = 0;
    while (dateSet.has(cursor)) {
        current++;
        cursor = subDay(cursor, 1);
    }

    let longest = 0;
    let run = 0;
    for (let i = 0; i < dates.length; i++) {
        if (i === 0 || subDay(dates[i]!, 1) === dates[i - 1]) {
            run++;
        } else {
            run = 1;
        }
        if (run > longest) longest = run;
    }

    const solvedResult = await db.execute<{ total_solved: number }>(sql`
        SELECT COUNT(*)::int AS total_solved
        FROM attempts
        WHERE solved = true
    `);
    const totalSolved = Number(solvedResult.rows[0]?.total_solved ?? 0);

    return { current, longest, totalDays: dates.length, totalSolved };
}

async function getRecallTrend() {
    const result = await db.execute<{ recall_rating: number }>(sql`
        SELECT recall_rating
        FROM attempts
        ORDER BY attempted_at DESC, id DESC
        LIMIT ${RECALL_TREND_COUNT}
    `);
    const trend = result.rows.map(r => Number(r.recall_rating)).reverse();
    const avg = trend.length > 0
        ? trend.reduce((s, v) => s + v, 0) / trend.length
        : null;
    return { recallTrend: trend, avgRecall: avg };
}

async function getDifficultyMix() {
    const result = await db.execute<{ difficulty: string; count: number }>(sql`
        SELECT p.difficulty, COUNT(*)::int AS count
        FROM attempts a
        JOIN problems p ON p.id = a.problem_id
        GROUP BY p.difficulty
    `);
    const mix: Record<"Easy" | "Medium" | "Hard", number> = { Easy: 0, Medium: 0, Hard: 0 };
    for (const r of result.rows) {
        if (r.difficulty === "Easy" || r.difficulty === "Medium" || r.difficulty === "Hard") {
            mix[r.difficulty] = Number(r.count);
        }
    }
    return mix;
}

async function getActivityGrid(today: string) {
    const start = subDay(today, HEATMAP_DAYS - 1);
    const result = await db.execute<{ attempted_at: string; count: number }>(sql`
        SELECT attempted_at::text AS attempted_at, COUNT(*)::int AS count
        FROM attempts
        WHERE attempted_at >= ${start} AND attempted_at <= ${today}
        GROUP BY attempted_at
    `);
    const counts = new Map<string, number>();
    for (const r of result.rows) counts.set(r.attempted_at, Number(r.count));

    const grid: number[] = [];
    for (let i = 0; i < HEATMAP_DAYS; i++) {
        const date = shiftDay(start, i);
        const c = counts.get(date) ?? 0;
        const level = c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : 3;
        grid.push(level);
    }
    return grid;
}

async function getUpcomingDue(today: string) {
    const horizon = shiftDay(today, UPCOMING_HORIZON_DAYS);
    const result = await db.execute<{ date: string; count: number }>(sql`
        SELECT next_review_at::text AS date, COUNT(*)::int AS count
        FROM schedule
        WHERE next_review_at >= ${today} AND next_review_at <= ${horizon}
        GROUP BY next_review_at
        ORDER BY next_review_at
    `);
    return result.rows.map(r => ({ date: r.date, count: Number(r.count) }));
}

export async function GET() {
    try {
        const today = todayUtc();
        const [weakness, streak, recall, difficultyMix, activityGrid, upcoming] = await Promise.all([
            getTagWeakness(),
            getStreakStats(today),
            getRecallTrend(),
            getDifficultyMix(),
            getActivityGrid(today),
            getUpcomingDue(today),
        ]);
        return Response.json({
            weakness,
            streak,
            avgRecall: recall.avgRecall,
            recallTrend: recall.recallTrend,
            difficultyMix,
            activityGrid,
            upcoming,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[stats] failed:", error);
        return Response.json(
            { error: "Stats failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
