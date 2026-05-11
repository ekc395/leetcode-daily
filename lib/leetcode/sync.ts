import pLimit from "p-limit";
import { sql } from "drizzle-orm";
import { getAcceptedSubmissions, getProblemDetail } from "@/lib/leetcode/client";
import { db } from "@/lib/db";
import { problems, schedule, settings } from "@/lib/db/schema";
import { todayPst, shiftDay } from "@/lib/dates";

export async function runSync(): Promise<{ synced: number; lastSyncAt: Date }> {
    const username = process.env.LEETCODE_USERNAME;
    if (!username) {
        throw new Error("LEETCODE_USERNAME is not set");
    }

    const submissions = await getAcceptedSubmissions(username);
    const seen = new Set<string>();
    const unique = submissions.filter(s => {
        if (seen.has(s.titleSlug)) return false;
        seen.add(s.titleSlug);
        return true;
    });

    const limit = pLimit(5);
    const details = await Promise.all(
        unique.map(s => limit(() => getProblemDetail(s.titleSlug)))
    );

    const tomorrowStr = shiftDay(todayPst(), 1);

    for (const problemDetail of details) {
        const [problem] = await db.insert(problems).values({
            slug: problemDetail.titleSlug,
            title: problemDetail.questionTitle,
            difficulty: problemDetail.difficulty,
            tags: problemDetail.topicTags.map(t => t.name),
        })
        .onConflictDoUpdate({
            target: problems.slug,
            set: {
                title: problemDetail.questionTitle,
                difficulty: problemDetail.difficulty,
                tags: problemDetail.topicTags.map(t => t.name),
            },
        })
        .returning();

        await db.insert(schedule).values({
            problemId: problem.id,
            nextReviewAt: tomorrowStr,
            intervalDays: 1,
            easeFactor: 2.5,
        })
        .onConflictDoNothing();
    }

    const lastSyncAt = new Date();
    await db.insert(settings)
        .values({ id: 1, lastSyncAt })
        .onConflictDoUpdate({
            target: settings.id,
            set: { lastSyncAt: sql`excluded.last_sync_at` },
        });

    return { synced: unique.length, lastSyncAt };
}
