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
        const difficultyMap: Record<number, string> = {
            1: "Easy",
            2: "Medium",
            3: "Hard"
        };
        const rows = problemList.map(problem => ({
            slug: problem.stat.question__title_slug,
            title: problem.stat.question__title,
            difficulty: difficultyMap[problem.difficulty.level] ?? "Medium",
            tags: [] as string[],
        }));
        await db.insert(problems).values(rows).onConflictDoNothing();
        return Response.json({ seeded: problemList.length });
    } catch (error) {
        return Response.json({ error: "Seed failed" }, { status: 500 });
    }
}
