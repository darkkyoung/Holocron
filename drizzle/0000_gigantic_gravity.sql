CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`image` text NOT NULL,
	`url` text NOT NULL,
	`source` text NOT NULL,
	`published` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`franchise` text DEFAULT 'star-wars' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_url_unique` ON `articles` (`url`);--> statement-breakpoint
CREATE INDEX `idx_articles_status_topic` ON `articles` (`status`,`topic`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
