CREATE TABLE `ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`reserved_micro_usd` integer NOT NULL,
	`actual_micro_usd` integer,
	`status` text DEFAULT 'reserved' NOT NULL,
	`created_at` integer NOT NULL,
	`settled_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_usage_request_id_unique` ON `ai_usage` (`request_id`);--> statement-breakpoint
CREATE TABLE `checkout_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`package_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`credits_micro_usd` integer NOT NULL,
	`stripe_session_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`paid_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_orders_stripe_session_id_unique` ON `checkout_orders` (`stripe_session_id`);--> statement-breakpoint
CREATE TABLE `credit_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`balance_micro_usd` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount_micro_usd` integer NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`metadata_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_ledger_source_id_unique` ON `credit_ledger` (`source_id`);--> statement-breakpoint
CREATE TABLE `github_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`tool_id` text NOT NULL,
	`user_id` text NOT NULL,
	`branch` text NOT NULL,
	`pull_request_url` text,
	`status` text DEFAULT 'creating' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_events` (
	`stripe_event_id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`processed_at` integer NOT NULL
);
