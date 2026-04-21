import { getProblemList } from "@/lib/leetcode/client";
import { db } from "@/lib/db";
import { problems } from "@/lib/db/schema";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const problemList = [];
        let skip = 0;
        while (true) {
            const batch = await getProblemList(100, skip);
            if (batch.length === 0) {
                break;
            }
            problemList.push(...batch);
            skip += 100;
        }
        const rows = problemList.map(problem => ({
            slug: problem.titleSlug,
            title: problem.title,
            difficulty: problem.difficulty,
            tags: [] as string[],
        }));
        await db.insert(problems).values(rows).onConflictDoNothing();
        return Response.json({ seeded: problemList.length });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[seed] failed:", error);
        return Response.json(
            { error: "Seed failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 }
        );
    }
}
