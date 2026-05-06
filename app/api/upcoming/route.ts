import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

type Row = {
    id: number;
    slug: string;
    title: string;
    difficulty: string;
    tags: string[] | null;
    next_review_at: string;
    interval_days: number;
    ease_factor: number;
};

function todayUtc(): string {
    return new Date().toISOString().split("T")[0]!;
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const limitParam = Number(url.searchParams.get("limit"));
        const limit = Number.isFinite(limitParam) && limitParam > 0
            ? Math.min(limitParam, MAX_LIMIT)
            : DEFAULT_LIMIT;
        const today = todayUtc();

        const result = await db.execute<Row>(sql`
            SELECT
                p.id,
                p.slug,
                p.title,
                p.difficulty,
                p.tags,
                s.next_review_at::text AS next_review_at,
                s.interval_days,
                s.ease_factor
            FROM schedule s
            JOIN problems p ON p.id = s.problem_id
            WHERE s.next_review_at > ${today}
            ORDER BY s.next_review_at ASC
            LIMIT ${limit}
        `);

        const upcoming = result.rows.map(r => ({
            id: Number(r.id),
            slug: r.slug,
            title: r.title,
            difficulty: r.difficulty,
            tags: r.tags ?? [],
            nextReviewAt: r.next_review_at,
            intervalDays: Number(r.interval_days),
            easeFactor: Number(r.ease_factor),
        }));

        return Response.json({ today, upcoming });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[upcoming] failed:", error);
        return Response.json(
            { error: "Upcoming failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
