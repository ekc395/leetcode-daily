import { db } from "@/lib/db";
import { problems, schedule, attempts } from "@/lib/db/schema";
import { sql, and, eq, lte, isNull } from "drizzle-orm";
import { DifficultySchema, type Difficulty } from "@/lib/leetcode/schemas";
import { getAllTagLevels, getGlobalLevel, attemptWindowStart } from "@/lib/scheduler/algorithm";
import { todayPst } from "@/lib/dates";

export const NEW_PROBLEM_EASE_FACTOR = 2.5;
export const NEW_PROBLEM_INTERVAL_DAYS = 0;
const SM2_PASS_THRESHOLD = 3;

// A star is an explicit instruction to prefer the topic, so for starred tags the
// computed level becomes a preference rather than a filter. Step down before up:
// an easier problem in a requested topic beats an unexpectedly harder one.
const DIFFICULTY_NEARNESS: Record<Difficulty, Difficulty[]> = {
    Easy: ["Easy", "Medium", "Hard"],
    Medium: ["Medium", "Easy", "Hard"],
    Hard: ["Hard", "Medium", "Easy"],
};

type RankedTag = { tag: string; starred: boolean };

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

async function hasAttemptToday(today: string): Promise<boolean> {
    const rows = await db
        .select({ id: attempts.id })
        .from(attempts)
        .where(eq(attempts.attemptedAt, today))
        .limit(1);
    return rows.length > 0;
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

async function getTagWeaknessRanking(): Promise<RankedTag[]> {
    const result = await db.execute<{ tag: string; starred: boolean }>(sql`
        WITH attempt_stats AS (
            SELECT
                tag.value AS tag,
                (COUNT(*) FILTER (WHERE a.recall_rating < ${SM2_PASS_THRESHOLD}))::float
                    / NULLIF(COUNT(*), 0)::float AS weakness
            FROM attempts a
            JOIN problems p ON p.id = a.problem_id
            CROSS JOIN LATERAL jsonb_array_elements_text(p.tags) AS tag(value)
            WHERE a.attempted_at >= ${attemptWindowStart()}
            GROUP BY tag.value
        ),
        pool_tags AS (
            SELECT DISTINCT tag.value AS tag
            FROM problems p
            CROSS JOIN LATERAL jsonb_array_elements_text(p.tags) AS tag(value)
            WHERE p.in_neetcode150 = true
        )
        SELECT pt.tag, (st.tag IS NOT NULL) AS starred
        FROM pool_tags pt
        LEFT JOIN attempt_stats s ON s.tag = pt.tag
        LEFT JOIN starred_tags st ON st.tag = pt.tag
        ORDER BY (st.tag IS NOT NULL) DESC, (s.tag IS NULL) DESC, s.weakness DESC NULLS LAST, pt.tag
    `);
    return result.rows.map(r => ({ tag: r.tag, starred: Boolean(r.starred) }));
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
                eq(problems.inNeetcode150, true),
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
        .where(and(isNull(schedule.problemId), eq(problems.inNeetcode150, true), eq(problems.difficulty, "Easy")))
        .limit(1);
    return rows[0] ?? null;
}

async function assignNewProblem(): Promise<QueueProblem | null> {
    const ranking = await getTagWeaknessRanking();
    const [levels, globalLevel] = await Promise.all([getAllTagLevels(), getGlobalLevel()]);

    for (const { tag, starred } of ranking) {
        const level = levels[tag] ?? globalLevel;
        // The retry has to happen inside this iteration: a second pass over the
        // whole ranking would let an unstarred exact-level match win before the
        // starred tag got its turn.
        for (const difficulty of starred ? DIFFICULTY_NEARNESS[level] : [level]) {
            const picked = await pickUnseededByTagAndDifficulty(tag, difficulty);
            if (picked) return picked;
        }
    }

    return pickFallbackEasy();
}

export async function getOrAssignTodaysProblem(): Promise<QueueResult> {
    const today = todayPst();

    const due = await findDueProblem(today);
    if (due) return { problem: due, source: "due" };

    if (await hasAttemptToday(today)) {
        return { problem: null, source: null };
    }

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
