CREATE TABLE IF NOT EXISTS #datasetName 
(
	`id` bigint(20) NOT NULL,
	`type` varchar(30) NOT NULL,
	`payload` mediumtext CHARACTER SET utf8mb4,
	`repo_id` bigint(20) NOT NULL,
	`actor_login` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL,
	UNIQUE KEY `id` (`id`),
	INDEX `actor_login` (`actor_login`),
	INDEX `created_at` (`created_at`)
	#FULLTEXT (`actor_login`, `created_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;