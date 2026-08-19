import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { problems, starredTags } from "@/lib/db/schema";

const PatchSchema = z.object({
    tag: z.string().min(1).max(120),
    starred: z.boolean(),
});

// Tags are raw LeetCode strings with no FK target, so the pool is the only thing
// that can tell a real tag from a typo. Hits problems_tags_gin_idx.
async function isPoolTag(tag: string): Promise<boolean> {
    const rows = await db
        .select({ id: problems.id })
        .from(problems)
        .where(and(eq(problems.inNeetcode150, true), sql`${problems.tags} ? ${tag}`))
        .limit(1);
    return rows.length > 0;
}

export async function PATCH(request: Request) {
    try {
        const parsed = PatchSchema.safeParse(await request.json());
        if (!parsed.success) {
            return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
        }
        const { tag, starred } = parsed.data;

        // Unstarring is always allowed, so a tag that has since left the pool can
        // still be cleared from the UI.
        if (starred && !(await isPoolTag(tag))) {
            return Response.json({ error: "Unknown tag" }, { status: 404 });
        }

        if (starred) {
            await db.insert(starredTags).values({ tag }).onConflictDoNothing();
        } else {
            await db.delete(starredTags).where(eq(starredTags.tag, tag));
        }

        return Response.json({ tag, starred });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[tags/starred] failed:", error);
        return Response.json(
            { error: "Star update failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
