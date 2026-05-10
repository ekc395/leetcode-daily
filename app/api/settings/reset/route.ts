import { db } from "@/lib/db";
import { schedule } from "@/lib/db/schema";

export async function POST() {
    try {
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
