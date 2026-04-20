import { getProblemList } from "@/lib/leetcode/client";
import { db } from "@/lib/db";
import { problems } from "@/lib/db/schema";

export async function POST(request: Request) {
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
        return Response.json({ error: "Seed failed" }, { status: 500 });
    }
}
