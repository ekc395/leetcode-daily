import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import vercelConfig from "@/vercel.json";

const PatchSchema = z.object({
    notificationsEnabled: z.boolean().optional(),
    notificationEmail: z.string().email().nullable().optional(),
}).refine(v => v.notificationsEnabled !== undefined || v.notificationEmail !== undefined, {
    message: "Provide notificationsEnabled or notificationEmail",
});

function dailyReminderCron(): string | null {
    const cron = vercelConfig.crons?.find(c => c.path === "/api/cron/daily-reminder");
    return cron?.schedule ?? null;
}

function parseHost(url: string | undefined): string | null {
    if (!url) return null;
    try {
        return new URL(url).host;
    } catch {
        return null;
    }
}

function cronToTimeUtc(cron: string | null): string | null {
    if (!cron) return null;
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 2) return null;
    const [minute, hour] = parts;
    if (!minute || !hour || minute.includes("*") || hour.includes("*")) return null;
    const hh = hour.padStart(2, "0");
    const mm = minute.padStart(2, "0");
    return `${hh}:${mm}`;
}

async function loadOrCreateSettings() {
    const [row] = await db.select().from(settings).limit(1);
    if (row) return row;
    const [created] = await db.insert(settings).values({ id: 1 }).returning();
    return created;
}

export async function GET() {
    try {
        const row = await loadOrCreateSettings();
        const cronSchedule = dailyReminderCron();

        return Response.json({
            notificationsEnabled: row.notificationsEnabled,
            notificationEmail: row.notificationEmail ?? process.env.NOTIFICATION_EMAIL ?? null,
            lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
            system: {
                leetcodeUsername: process.env.LEETCODE_USERNAME ?? null,
                leetcodeApiHost: parseHost(process.env.LEETCODE_API_URL),
                cronSchedule,
                sendTimeUtc: cronToTimeUtc(cronSchedule),
                databaseConfigured: Boolean(process.env.DATABASE_URL),
                smtpConfigured: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[settings GET] failed:", error);
        return Response.json(
            { error: "Settings load failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const parsed = PatchSchema.safeParse(await request.json());
        if (!parsed.success) {
            return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
        }
        const { notificationsEnabled, notificationEmail } = parsed.data;

        await loadOrCreateSettings();

        const patch: Partial<typeof settings.$inferInsert> = {};
        if (notificationsEnabled !== undefined) patch.notificationsEnabled = notificationsEnabled;
        if (notificationEmail !== undefined) patch.notificationEmail = notificationEmail;

        const [row] = await db.update(settings)
            .set(patch)
            .where(eq(settings.id, 1))
            .returning();

        return Response.json({
            notificationsEnabled: row.notificationsEnabled,
            notificationEmail: row.notificationEmail,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[settings PATCH] failed:", error);
        return Response.json(
            { error: "Settings update failed", ...(process.env.NODE_ENV !== "production" && { detail: message }) },
            { status: 500 },
        );
    }
}
