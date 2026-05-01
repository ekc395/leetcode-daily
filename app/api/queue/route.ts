import { getOrAssignTodaysProblem } from "@/lib/scheduler/queue";

export async function GET() {
    try {
        const result = await getOrAssignTodaysProblem();
        if (!result.problem) {
            return Response.json({ problem: null });
        }
        return Response.json({ problem: result.problem, source: result.source });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[queue] failed:", error);
        return Response.json(
            { error: "Queue failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
