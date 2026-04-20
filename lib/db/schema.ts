import { pgTable, serial, text, integer, boolean, timestamp, date, real, jsonb, index } from "drizzle-orm/pg-core";

export const problems = pgTable("problems", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull(), // "Easy" | "Medium" | "Hard"
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
}, (table) => [
  index("problems_tags_gin_idx").using("gin", table.tags),
]);

export const attempts = pgTable("attempts", {
  id: serial("id").primaryKey(),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problems.id),
  attemptedAt: date("attempted_at").notNull(),
  recallRating: integer("recall_rating").notNull(), // 1–5
  solved: boolean("solved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const schedule = pgTable("schedule", {
  problemId: integer("problem_id")
    .primaryKey()
    .references(() => problems.id),
  nextReviewAt: date("next_review_at").notNull(),
  intervalDays: integer("interval_days").notNull().default(1),
  easeFactor: real("ease_factor").notNull().default(2.5),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  notificationEmail: text("notification_email"),
});
