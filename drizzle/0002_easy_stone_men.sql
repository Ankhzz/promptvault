ALTER TYPE "public"."vault_type" ADD VALUE 'timelocked';--> statement-breakpoint
CREATE TABLE "faucet_claims" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "encrypted_data_key" text;--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN "price_musdc" text;--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN "unlock_time" timestamp with time zone;