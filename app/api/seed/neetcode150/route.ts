import pLimit from "p-limit";
import { and, eq, inArray } from "drizzle-orm";
import { getProblemDetail } from "@/lib/leetcode/client";
import { db } from "@/lib/db";
import { problems } from "@/lib/db/schema";
import { NEETCODE_150_SLUGS } from "@/lib/leetcode/neetcode150";

const CRON_SECRET = process.env.CRON_SECRET;

// The upstream alfa-leetcode-api (onrender free tier) hard rate-limits at
// roughly 80 requests/hour with a 1-hour IP ban, so all 150 can't be fetched in
// one call. This route is incremental and idempotent: it skips slugs already
// seeded (in_neetcode150 = true) and only fetches the remainder, so re-running
// after the limit resets converges on the full 150 without wasting quota.
const SEED_CONCURRENCY = 3;

export async function POST(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const alreadySeeded = new Set(
            (await db
                .select({ slug: problems.slug })
                .from(problems)
                .where(and(
                    inArray(problems.slug, NEETCODE_150_SLUGS),
                    eq(problems.inNeetcode150, true),
                )))
                .map(r => r.slug)
        );

        const todo = NEETCODE_150_SLUGS.filter(slug => !alreadySeeded.has(slug));

        const limit = pLimit(SEED_CONCURRENCY);
        const failed: string[] = [];

        await Promise.all(
            todo.map(slug =>
                limit(async () => {
                    let detail;
                    try {
                        detail = await getProblemDetail(slug);
                    } catch (error) {
                        // Likely the upstream rate-limit ban or a LeetCode-premium
                        // problem. Record and skip — a later run will retry it.
                        console.error(`[seed:nc150] failed to fetch "${slug}":`, error);
                        failed.push(slug);
                        return;
                    }

                    const tags = detail.topicTags.map(t => t.name);
                    await db.insert(problems).values({
                        slug: detail.titleSlug,
                        title: detail.questionTitle,
                        difficulty: detail.difficulty,
                        tags,
                        inNeetcode150: true,
                    })
                    .onConflictDoUpdate({
                        target: problems.slug,
                        set: {
                            title: detail.questionTitle,
                            difficulty: detail.difficulty,
                            tags,
                            inNeetcode150: true,
                        },
                    });
                })
            )
        );

        const seededThisRun = todo.length - failed.length;
        return Response.json({
            seededThisRun,
            alreadySeeded: alreadySeeded.size,
            totalSeeded: alreadySeeded.size + seededThisRun,
            remaining: failed.length,
            failed,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[seed:nc150] failed:", error);
        return Response.json(
            { error: "Seed failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 }
        );
    }
}
