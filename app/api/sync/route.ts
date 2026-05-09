import { runSync } from "@/lib/leetcode/sync";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { synced } = await runSync();
        return Response.json({ synced });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[sync] failed:", error);
        return Response.json(
            { error: "Sync failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 }
        );
    }
}
