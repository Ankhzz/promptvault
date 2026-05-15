CREATE TYPE "public"."vault_type" AS ENUM('licensed', 'private');--> statement-breakpoint
ALTER TABLE "vaults" ALTER COLUMN "ip_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vaults" ALTER COLUMN "license_terms_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN "vault_type" "vault_type" DEFAULT 'licensed' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_vaults_type" ON "vaults" USING btree ("vault_type");