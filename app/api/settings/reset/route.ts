import { db } from "@/lib/db";
import { attempts, schedule } from "@/lib/db/schema";

// Wipes both tables, not just schedule. Deleting schedule alone would leave
// attempts nothing can reach: the due-review path joins schedule, so those
// rows could never be reviewed again, yet they'd keep feeding tag weakness
// and levels forever.
// starred_tags is deliberately left alone: stars are a preference, not progress,
// and unlike attempts they cannot be orphaned by clearing the schedule.
export async function POST() {
    try {
        await db.delete(attempts);
        await db.delete(schedule);
        return Response.json({ ok: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[settings/reset] failed:", error);
        return Response.json(
            { error: "Reset failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
