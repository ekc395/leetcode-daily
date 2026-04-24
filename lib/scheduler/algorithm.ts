import { db } from "@/lib/db";
import { problems, attempts } from "@/lib/db/schema";
import { inArray, sql } from "drizzle-orm";

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

    const taggedProblems = await db.select({ id: problems.id, tags: problems.tags })
        .from(problems)
        .where(sql`${problems.tags} ?| array[${sql.join(tags.map(t => sql`${t}`), sql`, `)}]`);
    if (taggedProblems.length === 0) return 0;

    const relatedAttempts = await db.select({
        problemId: attempts.problemId,
        recallRating: attempts.recallRating,
    }).from(attempts).where(inArray(attempts.problemId, taggedProblems.map(p => p.id)));

    const scores: number[] = [];
    for (const tag of tags) {
        const tagProblemIds = new Set(taggedProblems.filter(p => p.tags.includes(tag)).map(p => p.id));
        const tagAttempts = relatedAttempts.filter(a => tagProblemIds.has(a.problemId));
        if (tagAttempts.length === 0) continue;
        const failures = tagAttempts.filter(a => a.recallRating < SM2_PASS_THRESHOLD).length;
        scores.push(failures / tagAttempts.length);
    }
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
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
