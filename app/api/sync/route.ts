import { getAcceptedSubmissions, getProblemDetail } from "@/lib/leetcode/client";
import { db } from "@/lib/db";
import { problems, schedule } from "@/lib/db/schema";

const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME;

export async function POST(request: Request) {
    try {
        const username = LEETCODE_USERNAME;
        if (!username) {
            return Response.json({ error: "Username not set" }, { status: 500 });
        }
        const submissions = await getAcceptedSubmissions(username);
        const seen = new Set<string>();
        const unique = submissions.filter(s => {
            if (seen.has(s.titleSlug)) {
                return false;
            }
            seen.add(s.titleSlug);
            return true;
        });
        for (const s of unique) {
            const problemDetail = await getProblemDetail(s.titleSlug);
            // Upsert into problems table
            const [problem] = await db.insert(problems).values({
                slug: problemDetail.titleSlug,
                title: problemDetail.title,
                difficulty: problemDetail.difficulty,
                tags: problemDetail.topicTags.map(t => t.name),
            })
            .onConflictDoUpdate({
                target: problems.slug,
                set: {
                    title: problemDetail.title,
                    difficulty: problemDetail.difficulty,
                    tags: problemDetail.topicTags.map(t => t.name),
                },
            })
            .returning();
            // Upsert into schedule table if problemId doesn't exist
            await db.insert(schedule).values({
                problemId: problem.id,
                nextReviewAt: new Date().toISOString().split("T")[0], // today
                intervalDays: 1,
                easeFactor: 2.5,
            })
            .onConflictDoNothing();
        }
        return Response.json({ synced: unique.length }); 
    } catch (error) {
        return Response.json({ error: "Sync failed" }, { status: 500 });
    }
}
