CREATE TABLE "attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"problem_id" integer NOT NULL,
	"attempted_at" date NOT NULL,
	"recall_rating" integer NOT NULL,
	"solved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"difficulty" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "problems_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "schedule" (
	"problem_id" integer PRIMARY KEY NOT NULL,
	"next_review_at" date NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"ease_factor" real DEFAULT 2.5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"notification_email" text
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE no action ON UPDATE no action;