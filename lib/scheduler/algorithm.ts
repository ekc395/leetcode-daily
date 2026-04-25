import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const SM2_PASS_THRESHOLD = 3;
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

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + finalInterval);
    const nextReviewAtStr = nextReviewAt.toISOString().split("T")[0]!;

    return {
        nextReviewAt: nextReviewAtStr,
        intervalDays: finalInterval,
        easeFactor: sm2.easeFactor,
    };
}
