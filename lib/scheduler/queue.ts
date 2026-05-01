import { db } from "@/lib/db";
import { problems, schedule, attempts } from "@/lib/db/schema";
import { sql, and, eq, lte, isNull } from "drizzle-orm";
import { DifficultySchema, type Difficulty } from "@/lib/leetcode/schemas";

const NEW_PROBLEM_EASE_FACTOR = 2.5;
const NEW_PROBLEM_INTERVAL_DAYS = 0;
const SM2_PASS_THRESHOLD = 3;

export type QueueProblem = {
    id: number;
    slug: string;
    title: string;
    difficulty: string;
    tags: string[];
};

export type QueueResult =
    | { problem: QueueProblem; source: "due" | "new" }
    | { problem: null; source: null };

function todayUtc(): string {
    return new Date().toISOString().split("T")[0]!;
}

async function findDueProblem(today: string): Promise<QueueProblem | null> {
    const rows = await db
        .select({
            id: problems.id,
            slug: problems.slug,
            title: problems.title,
            difficulty: problems.difficulty,
            tags: problems.tags,
        })
        .from(schedule)
        .innerJoin(problems, eq(problems.id, schedule.problemId))
        .leftJoin(
            attempts,
            and(
                eq(attempts.problemId, schedule.problemId),
                eq(attempts.attemptedAt, today),
            ),
        )
        .where(and(lte(schedule.nextReviewAt, today), isNull(attempts.id)))
        .orderBy(schedule.nextReviewAt)
        .limit(1);
    return rows[0] ?? null;
}

async function getTagWeaknessRanking(): Promise<string[]> {
    const result = await db.execute<{ tag: string }>(sql`
        SELECT tag.value AS tag
        FROM attempts a
        JOIN problems p ON p.id = a.problem_id
        CROSS JOIN LATERAL jsonb_array_elements_text(p.tags) AS tag(value)
        GROUP BY tag.value
        ORDER BY (COUNT(*) FILTER (WHERE a.recall_rating < ${SM2_PASS_THRESHOLD}))::float
                 / NULLIF(COUNT(*), 0)::float DESC NULLS LAST
    `);
    return result.rows.map(r => r.tag);
}

async function getAdaptiveDifficulty(tag: string): Promise<Difficulty> {
    const result = await db.execute<{ avg_rating: number | null; total: number }>(sql`
        SELECT AVG(a.recall_rating)::float AS avg_rating, COUNT(*)::int AS total
        FROM attempts a
        JOIN problems p ON p.id = a.problem_id
        WHERE p.difficulty = 'Medium' AND p.tags ? ${tag}
    `);
    const row = result.rows[0];
    if (!row || row.total === 0 || row.avg_rating == null) return "Easy";
    if (row.avg_rating >= 4) return "Hard";
    if (row.avg_rating <= 2) return "Easy";
    return "Medium";
}

async function pickUnseededByTagAndDifficulty(
    tag: string,
    difficulty: Difficulty,
): Promise<QueueProblem | null> {
    const rows = await db
        .select({
            id: problems.id,
            slug: problems.slug,
            title: problems.title,
            difficulty: problems.difficulty,
            tags: problems.tags,
        })
        .from(problems)
        .leftJoin(schedule, eq(schedule.problemId, problems.id))
        .where(
            and(
                isNull(schedule.problemId),
                eq(problems.difficulty, difficulty),
                sql`${problems.tags} ? ${tag}`,
            ),
        )
        .limit(1);
    return rows[0] ?? null;
}

async function pickFallbackEasy(): Promise<QueueProblem | null> {
    const rows = await db
        .select({
            id: problems.id,
            slug: problems.slug,
            title: problems.title,
            difficulty: problems.difficulty,
            tags: problems.tags,
        })
        .from(problems)
        .leftJoin(schedule, eq(schedule.problemId, problems.id))
        .where(and(isNull(schedule.problemId), eq(problems.difficulty, "Easy")))
        .limit(1);
    return rows[0] ?? null;
}

async function assignNewProblem(): Promise<QueueProblem | null> {
    const ranking = await getTagWeaknessRanking();

    for (const tag of ranking) {
        const difficulty = await getAdaptiveDifficulty(tag);
        const picked = await pickUnseededByTagAndDifficulty(tag, difficulty);
        if (picked) return picked;
    }

    return pickFallbackEasy();
}

export async function getOrAssignTodaysProblem(): Promise<QueueResult> {
    const today = todayUtc();

    const due = await findDueProblem(today);
    if (due) return { problem: due, source: "due" };

    const picked = await assignNewProblem();
    if (!picked) return { problem: null, source: null };

    await db.insert(schedule).values({
        problemId: picked.id,
        nextReviewAt: today,
        intervalDays: NEW_PROBLEM_INTERVAL_DAYS,
        easeFactor: NEW_PROBLEM_EASE_FACTOR,
    }).onConflictDoNothing();

    DifficultySchema.parse(picked.difficulty);

    return { problem: picked, source: "new" };
}
