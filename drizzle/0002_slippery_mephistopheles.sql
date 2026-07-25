CREATE TABLE `provider_budgets` (
	`bucket` text PRIMARY KEY NOT NULL,
	`reserved_micro_usd` integer DEFAULT 0 NOT NULL,
	`spent_micro_usd` integer DEFAULT 0 NOT NULL,
	`limit_micro_usd` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `provider_reserved_micro_usd` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `provider_actual_micro_usd` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `ai_usage_one_active_request_per_user`
ON `ai_usage` (`user_id`) WHERE `status` = 'reserved';
