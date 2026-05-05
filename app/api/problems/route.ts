import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getAllTagWeakness } from "@/lib/scheduler/algorithm";

type ProblemRow = {
    id: number;
    slug: string;
    title: string;
    difficulty: string;
    tags: string[] | null;
    last_attempted_at: string;
    last_recall_rating: number;
    last_solved: boolean;
    next_review_at: string | null;
    attempt_count: number;
};

async function getAttemptedProblems() {
    const result = await db.execute<ProblemRow>(sql`
        SELECT
            p.id,
            p.slug,
            p.title,
            p.difficulty,
            p.tags,
            la.attempted_at::text AS last_attempted_at,
            la.recall_rating AS last_recall_rating,
            la.solved AS last_solved,
            s.next_review_at::text AS next_review_at,
            ac.attempt_count
        FROM problems p
        JOIN (
            SELECT problem_id, COUNT(*)::int AS attempt_count
            FROM attempts
            GROUP BY problem_id
        ) ac ON ac.problem_id = p.id
        JOIN LATERAL (
            SELECT attempted_at, recall_rating, solved
            FROM attempts
            WHERE problem_id = p.id
            ORDER BY attempted_at DESC, id DESC
            LIMIT 1
        ) la ON true
        LEFT JOIN schedule s ON s.problem_id = p.id
    `);
    return result.rows.map(r => ({
        id: Number(r.id),
        slug: r.slug,
        title: r.title,
        difficulty: r.difficulty,
        tags: r.tags ?? [],
        lastAttempt: {
            attemptedAt: r.last_attempted_at,
            recallRating: Number(r.last_recall_rating),
            solved: r.last_solved,
        },
        schedule: r.next_review_at ? { nextReviewAt: r.next_review_at } : null,
        attemptCount: Number(r.attempt_count),
    }));
}

export async function GET() {
    try {
        const [problems, tagWeakness] = await Promise.all([
            getAttemptedProblems(),
            getAllTagWeakness(),
        ]);
        return Response.json({ problems, tagWeakness });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[problems] failed:", error);
        return Response.json(
            { error: "Problems failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
