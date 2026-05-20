'use server'

import { users, vaults, activity, licenseTokens, purchases, faucetClaims } from '@/db/schema'
import { eq, and, desc, sql, ne } from 'drizzle-orm'
import { getDb } from '@/db'

export async function getOrCreateUser(walletAddress: string) {
  const db = await getDb()
  const rows = await db.select().from(users).where(eq(users.walletAddress, walletAddress)).limit(1)
  const existing = rows[0]
  if (existing) {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.walletAddress, walletAddress))
    return existing
  }
  const inserted = await db.insert(users).values({ walletAddress }).returning()
  return inserted[0]
}

export async function createVaultRecord(data: {
  uuid: number
  ownerAddress: string
  name: string
  description?: string
  vaultType?: 'licensed' | 'private' | 'timelocked'
  ipId?: string
  licenseTermsId?: number
  licenseTokenId?: string
  ipfsCid?: string
  encryptedFileMeta?: string
  encryptedDataKey?: string
  dataKeyEncryptionMeta?: string
  allocateTxHash?: string
  writeTxHash?: string
  registerTxHash?: string
  mintTxHash?: string
  unlockTime?: Date
  priceMusdc?: string
}) {
  const db = await getDb()
  await getOrCreateUser(data.ownerAddress)
  const result = await db.insert(vaults).values({
    ...data,
    vaultType: data.vaultType ?? 'licensed',
    status: 'active',
  }).returning()

  await db.insert(activity).values({
    vaultUuid: data.uuid,
    walletAddress: data.ownerAddress,
    type: 'vault_created',
    txHash: data.allocateTxHash,
    details: JSON.stringify({ name: data.name, ipId: data.ipId, vaultType: data.vaultType ?? 'licensed' }),
  })

  if (data.licenseTokenId) {
    await db.insert(activity).values({
      vaultUuid: data.uuid,
      walletAddress: data.ownerAddress,
      type: 'license_minted',
      txHash: data.mintTxHash,
      details: JSON.stringify({ licenseTokenId: data.licenseTokenId }),
    })
  }

  return result[0]
}

export async function recordVaultAccess(data: {
  vaultUuid: number
  walletAddress: string
  txHash?: string
  blockNumber?: number
}) {
  const db = await getDb()
  await db.insert(activity).values({
    vaultUuid: data.vaultUuid,
    walletAddress: data.walletAddress,
    type: 'vault_accessed',
    txHash: data.txHash,
    blockNumber: data.blockNumber,
  })

  await db.update(vaults)
    .set({ status: 'accessed', updatedAt: new Date() })
    .where(eq(vaults.uuid, data.vaultUuid))
}

export async function getUserVaults(walletAddress: string) {
  const db = await getDb()
  return db.select().from(vaults)
    .where(eq(vaults.ownerAddress, walletAddress))
    .orderBy(desc(vaults.createdAt))
    .limit(100)
}

export async function getVaultByUuid(uuid: number) {
  const db = await getDb()
  const rows = await db.select().from(vaults).where(eq(vaults.uuid, uuid)).limit(1)
  return rows[0]
}

export async function getVaultLicenseTokens(vaultUuid: number) {
  const db = await getDb()
  return db.select().from(licenseTokens)
    .where(eq(licenseTokens.vaultUuid, vaultUuid))
    .orderBy(desc(licenseTokens.createdAt))
}

export async function getVaultActivity(vaultUuid: number, limit = 20) {
  const db = await getDb()
  return db.select().from(activity)
    .where(eq(activity.vaultUuid, vaultUuid))
    .orderBy(desc(activity.createdAt))
    .limit(limit)
}

export async function getUserActivity(walletAddress: string, limit = 50) {
  const db = await getDb()
  return db.select().from(activity)
    .where(eq(activity.walletAddress, walletAddress))
    .orderBy(desc(activity.createdAt))
    .limit(limit)
}

export async function vaultExists(uuid: number) {
  const db = await getDb()
  const rows = await db.select({ uuid: vaults.uuid }).from(vaults).where(eq(vaults.uuid, uuid)).limit(1)
  return rows.length > 0
}

export async function getVaultEncryptedDataKey(uuid: number) {
  const db = await getDb()
  const rows = await db.select({
    encryptedDataKey: vaults.encryptedDataKey,
    dataKeyEncryptionMeta: vaults.dataKeyEncryptionMeta,
    ownerAddress: vaults.ownerAddress,
    ipfsCid: vaults.ipfsCid,
    encryptedFileMeta: vaults.encryptedFileMeta,
  }).from(vaults).where(eq(vaults.uuid, uuid)).limit(1)
  return rows[0]
}

export async function getUserStats(walletAddress: string) {
  const db = await getDb()
  const [vaultCount, activeCount, accessedCount, licenseCount, accessCount] = await Promise.all([
    db.select({ value: sql<number>`count(*)` }).from(vaults)
      .where(eq(vaults.ownerAddress, walletAddress)),
    db.select({ value: sql<number>`count(*)` }).from(vaults)
      .where(and(eq(vaults.ownerAddress, walletAddress), eq(vaults.status, 'active'))),
    db.select({ value: sql<number>`count(*)` }).from(vaults)
      .where(and(eq(vaults.ownerAddress, walletAddress), eq(vaults.status, 'accessed'))),
    db.select({ value: sql<number>`count(*)` }).from(activity)
      .where(and(eq(activity.walletAddress, walletAddress), eq(activity.type, 'license_minted'))),
    db.select({ value: sql<number>`count(*)` }).from(activity)
      .where(and(eq(activity.walletAddress, walletAddress), eq(activity.type, 'vault_accessed'))),
  ])

  return {
    totalVaults: Number(vaultCount[0]?.value ?? 0),
    activeVaults: Number(activeCount[0]?.value ?? 0),
    accessedVaults: Number(accessedCount[0]?.value ?? 0),
    licenseCount: Number(licenseCount[0]?.value ?? 0),
    accessCount: Number(accessCount[0]?.value ?? 0),
  }
}

export async function setVaultPrice(uuid: number, price: number | null, callerAddress: string) {
  const db = await getDb()
  const vault = await getVaultByUuid(uuid)
  if (!vault || vault.ownerAddress.toLowerCase() !== callerAddress.toLowerCase()) {
    throw new Error('Not authorized: caller is not the vault owner')
  }
  await db.update(vaults)
    .set({ price, updatedAt: new Date() })
    .where(eq(vaults.uuid, uuid))
}

export async function setVaultForSale(uuid: number, isForSale: boolean, callerAddress: string) {
  const db = await getDb()
  const vault = await getVaultByUuid(uuid)
  if (!vault || vault.ownerAddress.toLowerCase() !== callerAddress.toLowerCase()) {
    throw new Error('Not authorized: caller is not the vault owner')
  }
  const updates: Partial<typeof vaults.$inferInsert> = { isForSale, updatedAt: new Date() }
  if (!isForSale) updates.price = null
  await db.update(vaults)
    .set(updates)
    .where(eq(vaults.uuid, uuid))
}

export async function purchaseVault(
  vaultUuid: number,
  buyerAddress: string,
  buyerLicenseTokenId: string,
  mintTxHash: string,
) {
  const db = await getDb()
  await getOrCreateUser(buyerAddress)
  const existing = await db.select().from(purchases)
    .where(and(eq(purchases.vaultUuid, vaultUuid), eq(purchases.buyerAddress, buyerAddress)))
    .limit(1)
  if (existing[0]) return existing[0]
  const inserted = await db.insert(purchases).values({
    vaultUuid,
    buyerAddress,
    buyerLicenseTokenId,
    mintTxHash,
    paid: true,
  }).returning()
  return inserted[0]
}

export async function getPurchase(vaultUuid: number, buyerAddress: string) {
  const db = await getDb()
  const rows = await db.select().from(purchases)
    .where(and(eq(purchases.vaultUuid, vaultUuid), eq(purchases.buyerAddress, buyerAddress)))
    .limit(1)
  return rows[0]
}

export async function getPurchasesForBuyer(buyerAddress: string) {
  const db = await getDb()
  return db.select().from(purchases)
    .where(eq(purchases.buyerAddress, buyerAddress))
    .orderBy(desc(purchases.createdAt))
    .limit(100)
}

export async function getPurchasedVaults(buyerAddress: string) {
  const db = await getDb()
  return db.select({
    uuid: vaults.uuid,
    name: vaults.name,
    description: vaults.description,
    status: vaults.status,
    vaultType: vaults.vaultType,
    ipId: vaults.ipId,
    licenseTokenId: vaults.licenseTokenId,
    price: vaults.price,
    isForSale: vaults.isForSale,
    createdAt: vaults.createdAt,
    ownerAddress: vaults.ownerAddress,
    buyerLicenseTokenId: purchases.buyerLicenseTokenId,
  }).from(purchases)
    .innerJoin(vaults, eq(purchases.vaultUuid, vaults.uuid))
    .where(eq(purchases.buyerAddress, buyerAddress))
    .orderBy(desc(purchases.createdAt))
    .limit(100)
}

export async function getPurchaseEncryptedDataKey(vaultUuid: number, buyerAddress: string) {
  const db = await getDb()
  const rows = await db.select({
    encryptedDataKey: purchases.encryptedDataKey,
    buyerAddress: purchases.buyerAddress,
  }).from(purchases)
    .where(and(eq(purchases.vaultUuid, vaultUuid), eq(purchases.buyerAddress, buyerAddress)))
    .limit(1)
  return rows[0]
}

export async function setPurchaseEncryptedDataKey(
  vaultUuid: number,
  buyerAddress: string,
  encryptedDataKey: string,
) {
  const db = await getDb()
  await db.update(purchases)
    .set({ encryptedDataKey })
    .where(and(eq(purchases.vaultUuid, vaultUuid), eq(purchases.buyerAddress, buyerAddress)))
}

export async function getVaultsForSale(limit = 50, offset = 0) {
  const db = await getDb()
  return db.select({
    uuid: vaults.uuid,
    name: vaults.name,
    description: vaults.description,
    price: vaults.price,
    priceMusdc: vaults.priceMusdc,
    ownerAddress: vaults.ownerAddress,
    ipId: vaults.ipId,
    status: vaults.status,
    vaultType: vaults.vaultType,
    createdAt: vaults.createdAt,
    updatedAt: vaults.updatedAt,
  }).from(vaults)
  .where(and(eq(vaults.isForSale, true), eq(vaults.vaultType, 'licensed')))
  .orderBy(desc(vaults.updatedAt))
  .limit(limit)
  .offset(offset)
}

export async function getLastFaucetClaim(walletAddress: string) {
  const db = await getDb()
  const rows = await db.select().from(faucetClaims)
    .where(eq(faucetClaims.walletAddress, walletAddress))
    .limit(1)
  return rows[0] ?? null
}

export async function recordFaucetClaim(
  walletAddress: string,
  opts?: { musdc?: boolean; ip?: boolean }
) {
  const db = await getDb()
  const updates: Record<string, unknown> = {}
  if (opts?.musdc) updates.claimedAt = new Date()
  if (opts?.ip) updates.claimedIp = true
  if (Object.keys(updates).length === 0) {
    await db.insert(faucetClaims).values({ walletAddress }).onConflictDoNothing()
    return
  }
  await db.insert(faucetClaims).values({ walletAddress, ...updates })
    .onConflictDoUpdate({
      target: faucetClaims.walletAddress,
      set: updates,
    })
}
