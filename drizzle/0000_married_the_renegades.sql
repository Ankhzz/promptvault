CREATE TYPE "public"."activity_type" AS ENUM('vault_created', 'license_minted', 'vault_accessed', 'vault_shared', 'ip_registered');--> statement-breakpoint
CREATE TYPE "public"."license_token_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."vault_status" AS ENUM('creating', 'active', 'accessed', 'failed');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"vault_uuid" integer NOT NULL,
	"wallet_address" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"tx_hash" text,
	"details" text,
	"block_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "license_tokens" (
	"token_id" text PRIMARY KEY NOT NULL,
	"vault_uuid" integer NOT NULL,
	"owner_address" text NOT NULL,
	"ip_id" text NOT NULL,
	"license_terms_id" integer NOT NULL,
	"mint_tx_hash" text,
	"status" "license_token_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"vault_uuid" integer NOT NULL,
	"buyer_address" text NOT NULL,
	"buyer_license_token_id" text,
	"mint_tx_hash" text,
	"paid" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"ens_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaults" (
	"uuid" serial PRIMARY KEY NOT NULL,
	"owner_address" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ip_id" text NOT NULL,
	"license_terms_id" integer NOT NULL,
	"license_token_id" text,
	"ipfs_cid" text,
	"encrypted_file_meta" text,
	"encrypted_data_key" text,
	"data_key_encryption_meta" text,
	"allocate_tx_hash" text,
	"write_tx_hash" text,
	"register_tx_hash" text,
	"mint_tx_hash" text,
	"status" "vault_status" DEFAULT 'creating' NOT NULL,
	"price" integer,
	"is_for_sale" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_vault_uuid_vaults_uuid_fk" FOREIGN KEY ("vault_uuid") REFERENCES "public"."vaults"("uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_tokens" ADD CONSTRAINT "license_tokens_vault_uuid_vaults_uuid_fk" FOREIGN KEY ("vault_uuid") REFERENCES "public"."vaults"("uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_tokens" ADD CONSTRAINT "license_tokens_owner_address_users_wallet_address_fk" FOREIGN KEY ("owner_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_vault_uuid_vaults_uuid_fk" FOREIGN KEY ("vault_uuid") REFERENCES "public"."vaults"("uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_buyer_address_users_wallet_address_fk" FOREIGN KEY ("buyer_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_owner_address_users_wallet_address_fk" FOREIGN KEY ("owner_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_wallet" ON "activity" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_activity_vault" ON "activity" USING btree ("vault_uuid");--> statement-breakpoint
CREATE INDEX "idx_activity_type" ON "activity" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_activity_created" ON "activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_license_tokens_owner" ON "license_tokens" USING btree ("owner_address");--> statement-breakpoint
CREATE INDEX "idx_license_tokens_vault" ON "license_tokens" USING btree ("vault_uuid");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchases_vault_buyer" ON "purchases" USING btree ("vault_uuid","buyer_address");--> statement-breakpoint
CREATE INDEX "idx_purchases_buyer" ON "purchases" USING btree ("buyer_address");--> statement-breakpoint
CREATE INDEX "idx_vaults_owner" ON "vaults" USING btree ("owner_address");--> statement-breakpoint
CREATE INDEX "idx_vaults_ip_id" ON "vaults" USING btree ("ip_id");--> statement-breakpoint
CREATE INDEX "idx_vaults_status" ON "vaults" USING btree ("status");