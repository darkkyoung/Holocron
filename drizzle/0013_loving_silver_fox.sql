CREATE TABLE `admin_login_rate_limits` (
	`client_hash` text PRIMARY KEY NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`window_started_at` integer NOT NULL,
	`blocked_until` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_admin_login_rate_limits_updated_at` ON `admin_login_rate_limits` (`updated_at`);