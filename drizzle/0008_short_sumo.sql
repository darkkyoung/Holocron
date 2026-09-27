CREATE TABLE `beta_analytics_daily_sessions` (
	`period` text NOT NULL,
	`day` text NOT NULL,
	`route` text NOT NULL,
	`session_hash` text NOT NULL,
	`page_views` integer DEFAULT 1 NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	PRIMARY KEY(`period`, `day`, `route`, `session_hash`)
);
--> statement-breakpoint
CREATE INDEX `idx_beta_analytics_period_day_route` ON `beta_analytics_daily_sessions` (`period`,`day`,`route`);--> statement-breakpoint
CREATE TABLE `feedback_rate_limits` (
	`session_hash` text PRIMARY KEY NOT NULL,
	`next_allowed_at` text NOT NULL
);
