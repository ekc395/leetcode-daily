import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, problems, schedule } from "@/lib/db/schema";
import { computeNextSchedule } from "@/lib/scheduler/algorithm";
import { NEW_PROBLEM_EASE_FACTOR, NEW_PROBLEM_INTERVAL_DAYS } from "@/lib/scheduler/queue";
import { todayPst } from "@/lib/dates";

const SM2_PASS_THRESHOLD = 3;

const AttemptBodySchema = z.object({
    problemId: z.number().int().positive(),
    recallRating: z.number().int().min(1).max(5),
});

export async function POST(request: Request) {
    try {
        const parsed = AttemptBodySchema.safeParse(await request.json());
        if (!parsed.success) {
            return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
        }
        const { problemId, recallRating } = parsed.data;
        const today = todayPst();

        const [problem] = await db
            .select({ tags: problems.tags })
            .from(problems)
            .where(eq(problems.id, problemId))
            .limit(1);

        if (!problem) {
            return Response.json({ error: "Problem not found" }, { status: 404 });
        }

        const [existingSchedule] = await db
            .select({
                intervalDays: schedule.intervalDays,
                easeFactor: schedule.easeFactor,
            })
            .from(schedule)
            .where(eq(schedule.problemId, problemId))
            .limit(1);

        let currentState: { intervalDays: number; easeFactor: number };
        if (existingSchedule) {
            currentState = existingSchedule;
        } else {
            await db.insert(schedule).values({
                problemId,
                nextReviewAt: today,
                intervalDays: NEW_PROBLEM_INTERVAL_DAYS,
                easeFactor: NEW_PROBLEM_EASE_FACTOR,
            });
            currentState = {
                intervalDays: NEW_PROBLEM_INTERVAL_DAYS,
                easeFactor: NEW_PROBLEM_EASE_FACTOR,
            };
        }

        const [existing] = await db
            .select({ id: attempts.id })
            .from(attempts)
            .where(and(eq(attempts.problemId, problemId), eq(attempts.attemptedAt, today)))
            .limit(1);

        if (existing) {
            return Response.json({ error: "Already rated today" }, { status: 409 });
        }

        await db.insert(attempts).values({
            problemId,
            attemptedAt: today,
            recallRating,
            solved: recallRating >= SM2_PASS_THRESHOLD,
        });

        const next = await computeNextSchedule(
            problem.tags,
            currentState,
            recallRating,
        );

        await db
            .update(schedule)
            .set({
                nextReviewAt: next.nextReviewAt,
                intervalDays: next.intervalDays,
                easeFactor: next.easeFactor,
            })
            .where(eq(schedule.problemId, problemId));

        return Response.json({ schedule: next });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[attempt] failed:", error);
        return Response.json(
            { error: "Attempt failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
