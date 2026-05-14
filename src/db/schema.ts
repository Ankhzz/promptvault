import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  walletAddress: text('wallet_address').primaryKey(),
  ensName: text('ens_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const vaults = sqliteTable('vaults', {
  uuid: integer('uuid').primaryKey(),
  ownerAddress: text('owner_address').notNull().references(() => users.walletAddress),
  name: text('name').notNull(),
  description: text('description'),
  ipId: text('ip_id').notNull(),
  licenseTermsId: integer('license_terms_id').notNull(),
  licenseTokenId: text('license_token_id'),
  ipfsCid: text('ipfs_cid'),
  encryptedFileMeta: text('encrypted_file_meta'),
  encryptedDataKey: text('encrypted_data_key'),
  dataKeyEncryptionMeta: text('data_key_encryption_meta'),
  allocateTxHash: text('allocate_tx_hash'),
  writeTxHash: text('write_tx_hash'),
  registerTxHash: text('register_tx_hash'),
  mintTxHash: text('mint_tx_hash'),
  status: text('status', { enum: ['creating', 'active', 'accessed', 'failed'] }).notNull().$defaultFn(() => 'creating'),
  price: integer('price'),
  isForSale: integer('is_for_sale', { mode: 'boolean' }).notNull().default(false).$defaultFn(() => false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_vaults_owner').on(table.ownerAddress),
  index('idx_vaults_ip_id').on(table.ipId),
  index('idx_vaults_status').on(table.status),
])

export const activity = sqliteTable('activity', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vaultUuid: integer('vault_uuid').notNull().references(() => vaults.uuid),
  walletAddress: text('wallet_address').notNull().references(() => users.walletAddress),
  type: text('type', { enum: ['vault_created', 'license_minted', 'vault_accessed', 'vault_shared', 'ip_registered'] }).notNull(),
  txHash: text('tx_hash'),
  details: text('details'),
  blockNumber: integer('block_number'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_activity_wallet').on(table.walletAddress),
  index('idx_activity_vault').on(table.vaultUuid),
  index('idx_activity_type').on(table.type),
  index('idx_activity_created').on(table.createdAt),
])

export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vaultUuid: integer('vault_uuid').notNull().references(() => vaults.uuid),
  buyerAddress: text('buyer_address').notNull().references(() => users.walletAddress),
  buyerLicenseTokenId: text('buyer_license_token_id'),
  mintTxHash: text('mint_tx_hash'),
  paid: integer('paid', { mode: 'boolean' }).notNull().default(true).$defaultFn(() => true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_purchases_vault_buyer').on(table.vaultUuid, table.buyerAddress),
  index('idx_purchases_buyer').on(table.buyerAddress),
])

export const licenseTokens = sqliteTable('license_tokens', {
  tokenId: text('token_id').primaryKey(),
  vaultUuid: integer('vault_uuid').notNull().references(() => vaults.uuid),
  ownerAddress: text('owner_address').notNull().references(() => users.walletAddress),
  ipId: text('ip_id').notNull(),
  licenseTermsId: integer('license_terms_id').notNull(),
  mintTxHash: text('mint_tx_hash'),
  status: text('status', { enum: ['active', 'revoked', 'expired'] }).notNull().$defaultFn(() => 'active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_license_tokens_owner').on(table.ownerAddress),
  index('idx_license_tokens_vault').on(table.vaultUuid),
])
