CREATE TABLE "starred_tags" (
	"tag" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
