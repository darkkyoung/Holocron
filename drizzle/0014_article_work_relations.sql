CREATE TABLE `article_work_relations` (
	`article_id` text NOT NULL,
	`work_id` text NOT NULL,
	`state` text NOT NULL,
	`origin` text NOT NULL,
	PRIMARY KEY(`article_id`, `work_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "article_work_state" CHECK("article_work_relations"."state" IN ('linked','excluded')),
	CONSTRAINT "article_work_origin" CHECK("article_work_relations"."origin" IN ('automatic','manual')),
	CONSTRAINT "article_work_exclusion_manual" CHECK("article_work_relations"."state" <> 'excluded' OR "article_work_relations"."origin" = 'manual')
);
--> statement-breakpoint
CREATE INDEX `idx_article_work_work_state` ON `article_work_relations` (`work_id`,`state`,`article_id`);