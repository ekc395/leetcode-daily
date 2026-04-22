import pLimit from "p-limit";
import { getAcceptedSubmissions, getProblemDetail } from "@/lib/leetcode/client";
import { db } from "@/lib/db";
import { problems, schedule } from "@/lib/db/schema";

const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME;

export async function POST(_request: Request) {
    try {
        const username = LEETCODE_USERNAME;
        if (!username) {
            return Response.json({ error: "Username not set" }, { status: 500 });
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

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        for (const problemDetail of details) {
            await db.transaction(async (tx) => {
                const [problem] = await tx.insert(problems).values({
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

                await tx.insert(schedule).values({
                    problemId: problem.id,
                    nextReviewAt: tomorrowStr,
                    intervalDays: 1,
                    easeFactor: 2.5,
                })
                .onConflictDoNothing();
            });
        }
        return Response.json({ synced: unique.length });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[sync] failed:", error);
        return Response.json(
            { error: "Sync failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 }
        );
    }
}
