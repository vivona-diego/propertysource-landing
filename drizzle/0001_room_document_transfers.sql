CREATE TABLE `room_upload_chunks` (
	`id` varchar(80) NOT NULL,
	`upload_id` varchar(64) NOT NULL,
	`chunk_index` int NOT NULL,
	`content_hash` varchar(64) NOT NULL,
	`size_bytes` int NOT NULL,
	`storage_key` varchar(400) NOT NULL,
	CONSTRAINT `room_upload_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_upload_jobs` (
	`id` varchar(64) NOT NULL,
	`owner_hash` varchar(64) NOT NULL,
	`account_id` int NOT NULL,
	`status` enum('uploading','finalizing','complete','cancelled') NOT NULL DEFAULT 'uploading',
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`filename` varchar(200) NOT NULL,
	`size_bytes` int NOT NULL,
	`total_chunks` int NOT NULL,
	`next_chunk` int NOT NULL DEFAULT 0,
	`allow_download` boolean NOT NULL,
	`published` boolean NOT NULL,
	`replace_id` int,
	`document_id` int,
	`expires_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `room_upload_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `room_upload_chunks_job_idx` ON `room_upload_chunks` (`upload_id`);--> statement-breakpoint
CREATE INDEX `room_upload_jobs_owner_idx` ON `room_upload_jobs` (`owner_hash`,`status`);--> statement-breakpoint
CREATE INDEX `room_upload_jobs_expiry_idx` ON `room_upload_jobs` (`expires_at`);