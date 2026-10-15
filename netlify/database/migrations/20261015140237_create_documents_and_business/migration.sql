CREATE TABLE "business" (
	"id" integer PRIMARY KEY,
	"name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"gstin" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY,
	"kind" text NOT NULL,
	"number" text NOT NULL,
	"issue_date" date NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"customer_address" text DEFAULT '' NOT NULL,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"tax_rate" numeric(5,2) DEFAULT '0' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"total" numeric(14,2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
