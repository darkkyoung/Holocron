ALTER TABLE `works` ADD `tmdb_media_type` text;--> statement-breakpoint
ALTER TABLE `works` ADD `tmdb_id` text;--> statement-breakpoint
ALTER TABLE `works` ADD `tmdb_season_number` text;--> statement-breakpoint
CREATE INDEX `idx_works_tmdb_reference` ON `works` (`tmdb_media_type`,`tmdb_id`,`tmdb_season_number`);