CREATE TABLE `feedback_sessions` (
	`session_hash` text PRIMARY KEY NOT NULL,
	`display_tag` text NOT NULL,
	`nickname` text NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`banned` integer DEFAULT 0 NOT NULL,
	`banned_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feedback_sessions_display_tag_unique` ON `feedback_sessions` (`display_tag`);
--> statement-breakpoint
CREATE INDEX `idx_feedback_sessions_last_seen` ON `feedback_sessions` (`last_seen_at`);
