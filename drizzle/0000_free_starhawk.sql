CREATE TABLE `activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vault_uuid` integer NOT NULL,
	`wallet_address` text NOT NULL,
	`type` text NOT NULL,
	`tx_hash` text,
	`details` text,
	`block_number` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`vault_uuid`) REFERENCES `vaults`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wallet_address`) REFERENCES `users`(`wallet_address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_activity_wallet` ON `activity` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `idx_activity_vault` ON `activity` (`vault_uuid`);--> statement-breakpoint
CREATE INDEX `idx_activity_type` ON `activity` (`type`);--> statement-breakpoint
CREATE INDEX `idx_activity_created` ON `activity` (`created_at`);--> statement-breakpoint
CREATE TABLE `license_tokens` (
	`token_id` text PRIMARY KEY NOT NULL,
	`vault_uuid` integer NOT NULL,
	`owner_address` text NOT NULL,
	`ip_id` text NOT NULL,
	`license_terms_id` integer NOT NULL,
	`mint_tx_hash` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`vault_uuid`) REFERENCES `vaults`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_address`) REFERENCES `users`(`wallet_address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_license_tokens_owner` ON `license_tokens` (`owner_address`);--> statement-breakpoint
CREATE INDEX `idx_license_tokens_vault` ON `license_tokens` (`vault_uuid`);--> statement-breakpoint
CREATE TABLE `users` (
	`wallet_address` text PRIMARY KEY NOT NULL,
	`ens_name` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vaults` (
	`uuid` integer PRIMARY KEY NOT NULL,
	`owner_address` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`ip_id` text NOT NULL,
	`license_terms_id` integer NOT NULL,
	`license_token_id` text,
	`encrypted_data_key` text,
	`data_key_encryption_meta` text,
	`allocate_tx_hash` text,
	`write_tx_hash` text,
	`register_tx_hash` text,
	`mint_tx_hash` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_address`) REFERENCES `users`(`wallet_address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_vaults_owner` ON `vaults` (`owner_address`);--> statement-breakpoint
CREATE INDEX `idx_vaults_ip_id` ON `vaults` (`ip_id`);--> statement-breakpoint
CREATE INDEX `idx_vaults_status` ON `vaults` (`status`);