ALTER TABLE `articles` ADD `topic_override` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `status_override` text;--> statement-breakpoint
UPDATE `articles`
SET `status_override` = 'excluded'
WHERE `status` = 'excluded' AND `reason` = '관리자 수동 제외';--> statement-breakpoint
UPDATE `articles`
SET `status` = 'review',
    `reason` = CASE
      WHEN lower(`title`) LIKE '%character spotlight%' OR lower(`summary`) LIKE '%character spotlight%' THEN 'Character Spotlight'
      ELSE 'Review 콘텐츠'
    END
WHERE `status` = 'excluded'
  AND `status_override` IS NULL
  AND (
    lower(`title`) LIKE '%review%'
    OR lower(`title`) LIKE '%character spotlight%'
    OR lower(`summary`) LIKE '%character spotlight%'
    OR `reason` = '리뷰 또는 캐릭터 스포트라이트 제외'
  );
