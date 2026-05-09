import { runSync } from "@/lib/leetcode/sync";

export async function POST() {
    try {
        const { synced, lastSyncAt } = await runSync();
        return Response.json({ synced, lastSyncAt: lastSyncAt.toISOString() });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[settings/sync] failed:", error);
        return Response.json(
            { error: "Sync failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
