import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const MIN_QUERY_LENGTH = 2;
const LIMIT = 20;

type Row = {
    id: number;
    slug: string;
    title: string;
    difficulty: string;
    tags: string[] | null;
};

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (q.length < MIN_QUERY_LENGTH) {
            return Response.json({ problems: [] });
        }

        const pattern = `%${q}%`;
        const result = await db.execute<Row>(sql`
            SELECT id, slug, title, difficulty, tags
            FROM problems
            WHERE title ILIKE ${pattern} OR slug ILIKE ${pattern}
            ORDER BY title ASC
            LIMIT ${LIMIT}
        `);

        const out = result.rows.map(r => ({
            id: Number(r.id),
            slug: r.slug,
            title: r.title,
            difficulty: r.difficulty,
            tags: r.tags ?? [],
        }));

        return Response.json({ problems: out });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[problems/search] failed:", error);
        return Response.json(
            { error: "Search failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
