import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { getOrAssignTodaysProblem } from "@/lib/scheduler/queue";
import { sendEmail } from "@/lib/email/sender";
import { buildDailyReminderEmail } from "@/lib/email/template";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [row] = await db.select().from(settings).limit(1);
        const enabled = row?.notificationsEnabled ?? true;
        if (!enabled) {
            return Response.json({ skipped: "notifications_disabled" });
        }

        const result = await getOrAssignTodaysProblem();
        if (!result.problem) {
            return Response.json({ skipped: "no_problem_due" });
        }

        const recipient = row?.notificationEmail ?? process.env.NOTIFICATION_EMAIL;
        if (!recipient) {
            return Response.json(
                { error: "No notification recipient configured" },
                { status: 500 },
            );
        }

        const email = buildDailyReminderEmail({
            slug: result.problem.slug,
            title: result.problem.title,
            difficulty: result.problem.difficulty,
            tags: result.problem.tags,
        });

        await sendEmail({ to: recipient, ...email });

        return Response.json({
            sent: true,
            slug: result.problem.slug,
            source: result.source,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[cron/daily-reminder] failed:", error);
        return Response.json(
            { error: "Cron failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
