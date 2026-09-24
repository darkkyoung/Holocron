ALTER TABLE `works` ADD `series_key` text;--> statement-breakpoint
ALTER TABLE `works` ADD `season_number` text;--> statement-breakpoint
CREATE INDEX `idx_works_series_season` ON `works` (`series_key`,`season_number`);
--> statement-breakpoint
UPDATE `works` SET `title`='만달로리안 시즌 1',`original_title`='The Mandalorian Season 1',`series_key`='the-mandalorian',`season_number`='1' WHERE `id`='mandalorian' AND `title`='만달로리안';
--> statement-breakpoint
UPDATE `works` SET `title`='스타워즈: 배드 배치 시즌 1',`original_title`='Star Wars: The Bad Batch Season 1',`series_key`='the-bad-batch',`season_number`='1' WHERE `id`='bad-batch' AND `title`='스타워즈: 배드 배치';
--> statement-breakpoint
UPDATE `works` SET `title`='안도르 시즌 1',`original_title`='Andor Season 1',`series_key`='andor',`season_number`='1' WHERE `id`='andor' AND `title`='안도르';
--> statement-breakpoint
UPDATE `works` SET `title`='아소카 시즌 1',`original_title`='Ahsoka Season 1',`series_key`='ahsoka',`season_number`='1' WHERE `id`='ahsoka' AND `title`='아소카';
--> statement-breakpoint
INSERT OR IGNORE INTO `works` (`id`,`title`,`original_title`,`type`,`status`,`poster_url`,`release_date`,`release_precision`,`official_url`,`franchise`,`series_key`,`season_number`) VALUES
('attack-of-the-clones','스타워즈: 클론의 습격','Star Wars: Attack of the Clones (Episode II)','영화','archive','https://lumiere-a.akamaihd.net/v1/images/EP2-IA-69221-RESIZED_1e8e0971.jpeg','2002-05-16','day','https://www.starwars.com/films/star-wars-episode-ii-attack-of-the-clones','star-wars',NULL,NULL),
('revenge-of-the-sith','스타워즈: 시스의 복수','Star Wars: Revenge of the Sith (Episode III)','영화','archive','https://lumiere-a.akamaihd.net/v1/images/image_ff356cdb.jpeg','2005-05-19','day','https://www.starwars.com/films/star-wars-episode-iii-revenge-of-the-sith','star-wars',NULL,NULL),
('clone-wars-film','스타워즈: 클론 전쟁','Star Wars: The Clone Wars','영화','archive','https://lumiere-a.akamaihd.net/v1/images/star-wars-the-clone-wars-poster_eca245da.jpeg','2008-08-15','day','https://www.starwars.com/films/star-wars-the-clone-wars','star-wars',NULL,NULL),
('force-awakens','스타워즈: 깨어난 포스','Star Wars: The Force Awakens (Episode VII)','영화','archive','https://lumiere-a.akamaihd.net/v1/images/avco_payoff_1-sht_v7_lg_32e68793.jpeg','2015-12-18','day','https://www.starwars.com/films/star-wars-episode-vii-the-force-awakens','star-wars',NULL,NULL),
('last-jedi','스타워즈: 라스트 제다이','Star Wars: The Last Jedi (Episode VIII)','영화','archive','https://lumiere-a.akamaihd.net/v1/images/sb_teaser2_1-sht_v3a_online_lg_86f89198.jpeg','2017-12-15','day','https://www.starwars.com/films/star-wars-episode-viii-the-last-jedi','star-wars',NULL,NULL),
('solo','한 솔로: 스타워즈 스토리','Solo: A Star Wars Story','영화','archive','https://lumiere-a.akamaihd.net/v1/images/solo-theatrical-poster_f98a86eb_62fc4b3c.jpeg','2018-05-25','day','https://www.starwars.com/films/solo','star-wars',NULL,NULL),
('rise-of-skywalker','스타워즈: 라이즈 오브 스카이워커','Star Wars: The Rise of Skywalker (Episode IX)','영화','archive','https://lumiere-a.akamaihd.net/v1/images/the-rise-of-skywalker-films-poster-catalog_c46adc71.jpeg','2019-12-20','day','https://www.starwars.com/films/star-wars-episode-ix-the-rise-of-skywalker','star-wars',NULL,NULL),
('mandalorian-season-2','만달로리안 시즌 2','The Mandalorian Season 2','드라마','archive','https://lumiere-a.akamaihd.net/v1/images/the-mandalorian-poster-post-catalog_1e7babb3.jpeg','2020-10-30','day','https://www.starwars.com/series/the-mandalorian','star-wars','the-mandalorian','2'),
('mandalorian-season-3','만달로리안 시즌 3','The Mandalorian Season 3','드라마','archive','https://lumiere-a.akamaihd.net/v1/images/the-mandalorian-poster-post-catalog_1e7babb3.jpeg','2023-03-01','day','https://www.starwars.com/series/the-mandalorian','star-wars','the-mandalorian','3'),
('bad-batch-season-2','스타워즈: 배드 배치 시즌 2','Star Wars: The Bad Batch Season 2','애니메이션','archive','https://lumiere-a.akamaihd.net/v1/images/the-bad-batch-poster-post-catalog_31481d5a.jpeg','2023-01-04','day','https://www.starwars.com/series/the-bad-batch','star-wars','the-bad-batch','2'),
('bad-batch-season-3','스타워즈: 배드 배치 시즌 3','Star Wars: The Bad Batch Season 3','애니메이션','archive','https://lumiere-a.akamaihd.net/v1/images/the-bad-batch-poster-post-catalog_31481d5a.jpeg','2024-02-21','day','https://www.starwars.com/series/the-bad-batch','star-wars','the-bad-batch','3'),
('andor-season-2','안도르 시즌 2','Andor Season 2','드라마','archive','https://lumiere-a.akamaihd.net/v1/images/andor-season-2-series-poster-catalog_be46f85f.jpeg','2025-04-22','day','https://www.starwars.com/series/andor','star-wars','andor','2'),
('ahsoka-season-2','아소카 시즌 2','Ahsoka Season 2','드라마','upcoming','','2027-01-20','day','https://www.starwars.com/series/ahsoka','star-wars','ahsoka','2');
