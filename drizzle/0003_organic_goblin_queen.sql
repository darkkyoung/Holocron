CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`original_title` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`poster_url` text NOT NULL,
	`release_date` text,
	`release_precision` text DEFAULT 'unknown' NOT NULL,
	`official_url` text,
	`franchise` text DEFAULT 'star-wars' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_works_status_release_date` ON `works` (`status`,`release_date`);