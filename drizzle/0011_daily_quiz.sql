CREATE TABLE `quizzes` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `question` text NOT NULL,
  `hero_image_url` text,
  `explanation` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `publish_at` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quizzes_status_publish_at` ON `quizzes` (`status`,`publish_at`);
--> statement-breakpoint
CREATE TABLE `quiz_options` (
  `id` text PRIMARY KEY NOT NULL,
  `quiz_id` text NOT NULL,
  `position` integer NOT NULL,
  `label` text NOT NULL,
  `image_url` text,
  `is_correct` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quiz_options_quiz_position` ON `quiz_options` (`quiz_id`,`position`);
--> statement-breakpoint
CREATE TABLE `quiz_responses` (
  `quiz_id` text NOT NULL,
  `session_hash` text NOT NULL,
  `option_id` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY(`quiz_id`, `session_hash`)
);
--> statement-breakpoint
CREATE INDEX `idx_quiz_responses_quiz_option` ON `quiz_responses` (`quiz_id`,`option_id`);
