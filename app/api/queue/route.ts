import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getOrAssignTodaysProblem } from "@/lib/scheduler/queue";

type LastAttemptRow = {
    attempted_at: string;
    recall_rating: number;
    solved: boolean;
};

async function getLastAttempt(problemId: number) {
    const result = await db.execute<LastAttemptRow>(sql`
        SELECT attempted_at::text AS attempted_at, recall_rating, solved
        FROM attempts
        WHERE problem_id = ${problemId}
        ORDER BY attempted_at DESC, id DESC
        LIMIT 1
    `);
    const row = result.rows[0];
    if (!row) return null;
    return {
        attemptedAt: row.attempted_at,
        recallRating: Number(row.recall_rating),
        solved: row.solved,
    };
}

export async function GET() {
    try {
        const result = await getOrAssignTodaysProblem();
        if (!result.problem) {
            return Response.json({ problem: null });
        }
        const lastAttempt = await getLastAttempt(result.problem.id);
        return Response.json({
            problem: result.problem,
            source: result.source,
            lastAttempt,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[queue] failed:", error);
        return Response.json(
            { error: "Queue failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
