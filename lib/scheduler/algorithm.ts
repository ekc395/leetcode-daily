import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { todayPst, shiftDay } from "@/lib/dates";
import type { Difficulty } from "@/lib/types";

const SM2_PASS_THRESHOLD = 3;
const LEVEL_PROMOTE_AVG = 4;
const LEVEL_DEMOTE_AVG = 2;
const LEVEL_MIN_ATTEMPTS = 3;
const LADDER: Difficulty[] = ["Easy", "Medium", "Hard"];
const SM2_EASE_BONUS = 0.1;
const SM2_EASE_PENALTY_SCALE = 0.08;
const SM2_MIN_EASE_FACTOR = 1.3;
const SM2_FIRST_SUCCESS_INTERVAL = 1;
const SM2_SECOND_SUCCESS_INTERVAL = 6;
const SM2_RESET_INTERVAL = 1;

export interface Sm2State {
    intervalDays: number;
    easeFactor: number;
}

export function computeSm2(current: Sm2State, recallRating: number): Sm2State {
    let easeFactor = current.easeFactor + (SM2_EASE_BONUS - (5 - recallRating) * SM2_EASE_PENALTY_SCALE);
    if (easeFactor < SM2_MIN_EASE_FACTOR) {
        easeFactor = SM2_MIN_EASE_FACTOR;
    }

    let intervalDays: number;
    if (recallRating < SM2_PASS_THRESHOLD) {
        intervalDays = SM2_RESET_INTERVAL;
    } else if (current.intervalDays === 0) {
        intervalDays = SM2_FIRST_SUCCESS_INTERVAL;
    } else if (current.intervalDays <= SM2_RESET_INTERVAL) {
        intervalDays = SM2_SECOND_SUCCESS_INTERVAL;
    } else {
        intervalDays = Math.round(current.intervalDays * easeFactor);
    }

    return { intervalDays, easeFactor };
}

export function applyWeaknessModifier(intervalDays: number, avgWeakness: number): number {
    return Math.max(1, Math.round(intervalDays * (1 - avgWeakness)));
}

export interface TagWeaknessRow {
    tag: string;
    failures: number;
    total: number;
    weakness: number;
}

export async function getAllTagWeakness(): Promise<TagWeaknessRow[]> {
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

export type TagLevelStats = Partial<Record<Difficulty, { avg: number; count: number }>>;

export function computeTagLevel(stats: TagLevelStats): Difficulty {
    const count = (d: Difficulty) => stats[d]?.count ?? 0;
    const promoted = (d: Difficulty) =>
        count(d) >= LEVEL_MIN_ATTEMPTS && stats[d]!.avg >= LEVEL_PROMOTE_AVG;
    const demoted = (d: Difficulty) =>
        count(d) >= LEVEL_MIN_ATTEMPTS && stats[d]!.avg <= LEVEL_DEMOTE_AVG;

    let i = count("Hard") > 0 ? 2 : count("Medium") > 0 ? 1 : 0;
    while (i > 0 && demoted(LADDER[i])) i--;
    while (i < 2 && promoted(LADDER[i]) && !demoted(LADDER[i + 1])) i++;
    return LADDER[i];
}

// Averages are all-time, so recovery after a demotion is gradual: due reviews
// at the higher level keep contributing to that level's average.
export async function getAllTagLevels(): Promise<Record<string, Difficulty>> {
    const result = await db.execute<{
        tag: string;
        difficulty: Difficulty;
        avg_rating: number;
        total: number;
    }>(sql`
        SELECT
            tag.value AS tag,
            p.difficulty AS difficulty,
            AVG(a.recall_rating)::float AS avg_rating,
            COUNT(*)::int AS total
        FROM attempts a
        JOIN problems p ON p.id = a.problem_id
        CROSS JOIN LATERAL jsonb_array_elements_text(p.tags) AS tag(value)
        GROUP BY tag.value, p.difficulty
    `);

    const statsByTag = new Map<string, TagLevelStats>();
    for (const r of result.rows) {
        const stats = statsByTag.get(r.tag) ?? {};
        stats[r.difficulty] = { avg: Number(r.avg_rating), count: Number(r.total) };
        statsByTag.set(r.tag, stats);
    }

    const levels: Record<string, Difficulty> = {};
    for (const [tag, stats] of statsByTag) {
        levels[tag] = computeTagLevel(stats);
    }
    return levels;
}

export async function getAverageTagWeakness(tags: string[]): Promise<number> {
    if (tags.length === 0) return 0;

    const tagsArray = sql.join(tags.map(t => sql`${t}`), sql`, `);
    const result = await db.execute<{ avg_weakness: number | null }>(sql`
        WITH tag_stats AS (
            SELECT
                t.tag,
                COUNT(*) FILTER (WHERE a.recall_rating < ${SM2_PASS_THRESHOLD}) AS failures,
                COUNT(*) AS total
            FROM unnest(ARRAY[${tagsArray}]::text[]) AS t(tag)
            JOIN problems p ON p.tags ? t.tag
            JOIN attempts a ON a.problem_id = p.id
            GROUP BY t.tag
        )
        SELECT COALESCE(AVG(failures::float / total), 0)::float AS avg_weakness
        FROM tag_stats
        WHERE total > 0
    `);
    return Number(result.rows[0]?.avg_weakness ?? 0);
}

export async function computeNextSchedule(
    tags: string[],
    current: Sm2State,
    recallRating: number,
): Promise<{
    nextReviewAt: string;
    intervalDays: number;
    easeFactor: number;
}> {
    const sm2 = computeSm2(current, recallRating);
    const avgWeakness = await getAverageTagWeakness(tags);
    const finalInterval = applyWeaknessModifier(sm2.intervalDays, avgWeakness);

    const nextReviewAtStr = shiftDay(todayPst(), finalInterval);

    return {
        nextReviewAt: nextReviewAtStr,
        intervalDays: finalInterval,
        easeFactor: sm2.easeFactor,
    };
}
