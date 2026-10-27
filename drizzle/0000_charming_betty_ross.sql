CREATE TABLE `room_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(254) NOT NULL,
	`role` enum('admin','investor') NOT NULL DEFAULT 'investor',
	`status` enum('invited','active','revoked') NOT NULL DEFAULT 'invited',
	`password_hash` varchar(256),
	`expires_at` bigint,
	`created_at` bigint NOT NULL,
	`last_login_at` bigint,
	CONSTRAINT `room_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `room_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor` varchar(254) NOT NULL,
	`event` varchar(80) NOT NULL,
	`detail` varchar(500) NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `room_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_auth_limits` (
	`limit_key` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`window_start` bigint NOT NULL,
	CONSTRAINT `room_auth_limits_limit_key` PRIMARY KEY(`limit_key`)
);
--> statement-breakpoint
CREATE TABLE `room_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(80) NOT NULL,
	`filename` varchar(200) NOT NULL,
	`storage_key` varchar(400) NOT NULL,
	`size_bytes` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`published` boolean NOT NULL DEFAULT false,
	`allow_download` boolean NOT NULL DEFAULT true,
	`archived` boolean NOT NULL DEFAULT false,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `room_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` bigint NOT NULL,
	`consumed_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `room_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_invites_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `room_sessions` (
	`token_hash` varchar(64) NOT NULL,
	`account_id` int NOT NULL,
	`expires_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `room_sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `room_invites_account_idx` ON `room_invites` (`account_id`);--> statement-breakpoint
CREATE INDEX `room_sessions_account_idx` ON `room_sessions` (`account_id`);