import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const SM2_PASS_THRESHOLD = 3;
const UPCOMING_HORIZON_DAYS = 14;

function todayUtc(): string {
    return new Date().toISOString().split("T")[0]!;
}

function subDay(isoDate: string, days: number): string {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().split("T")[0]!;
}

async function getTagWeakness(): Promise<{ tag: string; weakness: number; attempts: number }[]> {
    const result = await db.execute<{ tag: string; weakness: number; attempts: number }>(sql`
        SELECT
            tag.value AS tag,
            (COUNT(*) FILTER (WHERE a.recall_rating < ${SM2_PASS_THRESHOLD}))::float
                / NULLIF(COUNT(*), 0)::float AS weakness,
            COUNT(*)::int AS attempts
        FROM attempts a
        JOIN problems p ON p.id = a.problem_id
        CROSS JOIN LATERAL jsonb_array_elements_text(p.tags) AS tag(value)
        GROUP BY tag.value
        ORDER BY weakness DESC NULLS LAST, attempts DESC
    `);
    return result.rows.map(r => ({
        tag: r.tag,
        weakness: Number(r.weakness ?? 0),
        attempts: Number(r.attempts),
    }));
}

async function getCurrentStreak(today: string): Promise<number> {
    const result = await db.execute<{ attempted_at: string }>(sql`
        SELECT DISTINCT attempted_at::text AS attempted_at
        FROM attempts
        WHERE attempted_at <= ${today}
        ORDER BY attempted_at DESC
    `);
    const dates = new Set(result.rows.map(r => r.attempted_at));
    let cursor = dates.has(today) ? today : subDay(today, 1);
    let streak = 0;
    while (dates.has(cursor)) {
        streak++;
        cursor = subDay(cursor, 1);
    }
    return streak;
}

async function getUpcomingDue(today: string): Promise<{ date: string; count: number }[]> {
    const horizon = subDay(today, -UPCOMING_HORIZON_DAYS);
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
        const [weakness, streak, upcoming] = await Promise.all([
            getTagWeakness(),
            getCurrentStreak(today),
            getUpcomingDue(today),
        ]);
        return Response.json({ weakness, streak, upcoming });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[stats] failed:", error);
        return Response.json(
            { error: "Stats failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
