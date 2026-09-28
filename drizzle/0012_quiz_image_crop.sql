ALTER TABLE `quiz_options` ADD `image_crop_x` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_options` ADD `image_crop_y` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_options` ADD `image_crop_zoom` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `hero_crop_x` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `hero_crop_y` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `hero_crop_zoom` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `hero_link_url` text;