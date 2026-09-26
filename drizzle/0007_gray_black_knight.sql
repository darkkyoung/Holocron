CREATE TABLE `collection_locks` (
	`name` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`trigger` text NOT NULL,
	`acquired_at` text NOT NULL,
	`expires_at` text NOT NULL
);
