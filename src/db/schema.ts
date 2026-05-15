import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex, index, pgEnum } from 'drizzle-orm/pg-core'

export const vaultStatusEnum = pgEnum('vault_status', ['creating', 'active', 'accessed', 'failed'])
export const vaultTypeEnum = pgEnum('vault_type', ['licensed', 'private', 'timelocked'])
export const activityTypeEnum = pgEnum('activity_type', ['vault_created', 'license_minted', 'vault_accessed', 'vault_shared', 'ip_registered'])
export const licenseTokenStatusEnum = pgEnum('license_token_status', ['active', 'revoked', 'expired'])

export const users = pgTable('users', {
  walletAddress: text('wallet_address').primaryKey(),
  ensName: text('ens_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
})

export const vaults = pgTable('vaults', {
  uuid: serial('uuid').primaryKey(),
  ownerAddress: text('owner_address').notNull().references(() => users.walletAddress),
  name: text('name').notNull(),
  description: text('description'),
  vaultType: vaultTypeEnum('vault_type').notNull().default('licensed'),
  ipId: text('ip_id'),
  licenseTermsId: integer('license_terms_id'),
  licenseTokenId: text('license_token_id'),
  ipfsCid: text('ipfs_cid'),
  encryptedFileMeta: text('encrypted_file_meta'),
  encryptedDataKey: text('encrypted_data_key'),
  dataKeyEncryptionMeta: text('data_key_encryption_meta'),
  allocateTxHash: text('allocate_tx_hash'),
  writeTxHash: text('write_tx_hash'),
  registerTxHash: text('register_tx_hash'),
  mintTxHash: text('mint_tx_hash'),
  status: vaultStatusEnum('status').notNull().default('creating'),
  price: integer('price'),
  isForSale: boolean('is_for_sale').notNull().default(false),
  unlockTime: timestamp('unlock_time', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_vaults_owner').on(table.ownerAddress),
  index('idx_vaults_ip_id').on(table.ipId),
  index('idx_vaults_status').on(table.status),
  index('idx_vaults_type').on(table.vaultType),
])

export const activity = pgTable('activity', {
  id: serial('id').primaryKey(),
  vaultUuid: integer('vault_uuid').notNull().references(() => vaults.uuid),
  walletAddress: text('wallet_address').notNull().references(() => users.walletAddress),
  type: activityTypeEnum('type').notNull(),
  txHash: text('tx_hash'),
  details: text('details'),
  blockNumber: integer('block_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_activity_wallet').on(table.walletAddress),
  index('idx_activity_vault').on(table.vaultUuid),
  index('idx_activity_type').on(table.type),
  index('idx_activity_created').on(table.createdAt),
])

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  vaultUuid: integer('vault_uuid').notNull().references(() => vaults.uuid),
  buyerAddress: text('buyer_address').notNull().references(() => users.walletAddress),
  buyerLicenseTokenId: text('buyer_license_token_id'),
  mintTxHash: text('mint_tx_hash'),
  encryptedDataKey: text('encrypted_data_key'),
  paid: boolean('paid').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_purchases_vault_buyer').on(table.vaultUuid, table.buyerAddress),
  index('idx_purchases_buyer').on(table.buyerAddress),
])

export const licenseTokens = pgTable('license_tokens', {
  tokenId: text('token_id').primaryKey(),
  vaultUuid: integer('vault_uuid').notNull().references(() => vaults.uuid),
  ownerAddress: text('owner_address').notNull().references(() => users.walletAddress),
  ipId: text('ip_id').notNull(),
  licenseTermsId: integer('license_terms_id').notNull(),
  mintTxHash: text('mint_tx_hash'),
  status: licenseTokenStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_license_tokens_owner').on(table.ownerAddress),
  index('idx_license_tokens_vault').on(table.vaultUuid),
])
