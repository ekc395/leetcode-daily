import { db } from "@/lib/db";
import { problems, attempts } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";

const SM2_PASS_THRESHOLD = 3;       // recall_rating >= this counts as a success
const SM2_EASE_BONUS = 0.1;         // base ease factor bonus per review
const SM2_EASE_PENALTY_SCALE = 0.08; // how much each point below 5 penalizes ease
const SM2_MIN_EASE_FACTOR = 1.3;    // ease factor floor
const SM2_FIRST_SUCCESS_INTERVAL = 6; // days after first successful review
const SM2_RESET_INTERVAL = 1;       // days after a failure
const MIN_INTERVAL_DAYS = 1;        // absolute floor for any computed interval

export async function computeNextSchedule(problemId: number, tags: string[], currentIntervalDays: number, currentEaseFactor: number, recallRating: number): Promise<{ nextReviewAt: string; intervalDays: number; easeFactor: number}> {
    // Update ease factor
    let newEaseFactor = currentEaseFactor + (SM2_EASE_BONUS - (5 - recallRating) * SM2_EASE_PENALTY_SCALE);
    if (newEaseFactor < SM2_MIN_EASE_FACTOR) {
        newEaseFactor = SM2_MIN_EASE_FACTOR;
    }
    // Calculate raw SM-2 interval
    let sm2Interval: number;
    if (recallRating < SM2_PASS_THRESHOLD) {
        // Failure --> reset
        sm2Interval = SM2_RESET_INTERVAL;
    } else if (currentIntervalDays <= SM2_RESET_INTERVAL) {
        sm2Interval = SM2_FIRST_SUCCESS_INTERVAL;
    } else {
        sm2Interval = Math.round(currentIntervalDays * newEaseFactor);
    }
    // Topic weakness modifier
    const taggedProblems = await db.select({
        id: problems.id, 
        tags: problems.tags
    })
    .from(problems);
    const relatedProblemIds = taggedProblems.filter(p => p.tags.some(t => tags.includes(t))).map(p => p.id);
    const relatedAttempts = await db.select({
        problemId: attempts.problemId,
        recallRating: attempts.recallRating
    })
    .from(attempts).where(inArray(attempts.problemId, relatedProblemIds));
}
