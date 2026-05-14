'use server'

import { users, vaults, activity, licenseTokens, purchases } from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getDb } from '@/db'

export async function getOrCreateUser(walletAddress: string) {
  const db = await getDb()
  const existing = await db.select().from(users).where(eq(users.walletAddress, walletAddress)).get()
  if (existing) {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.walletAddress, walletAddress))
    return existing
  }
  return db.insert(users).values({ walletAddress }).returning().get()
}

export async function createVaultRecord(data: {
  uuid: number
  ownerAddress: string
  name: string
  description?: string
  ipId: string
  licenseTermsId: number
  licenseTokenId?: string
  ipfsCid?: string
  encryptedFileMeta?: string
  encryptedDataKey?: string
  dataKeyEncryptionMeta?: string
  allocateTxHash?: string
  writeTxHash?: string
  registerTxHash?: string
  mintTxHash?: string
}) {
  const db = await getDb()
  await getOrCreateUser(data.ownerAddress)
  const result = await db.insert(vaults).values({
    ...data,
    status: 'active',
  }).returning().get()

  await db.insert(activity).values({
    vaultUuid: data.uuid,
    walletAddress: data.ownerAddress,
    type: 'vault_created',
    txHash: data.allocateTxHash,
    details: JSON.stringify({ name: data.name, ipId: data.ipId }),
  }).run()

  if (data.licenseTokenId) {
    await db.insert(activity).values({
      vaultUuid: data.uuid,
      walletAddress: data.ownerAddress,
      type: 'license_minted',
      txHash: data.mintTxHash,
      details: JSON.stringify({ licenseTokenId: data.licenseTokenId }),
    }).run()
  }

  return result
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
  }).run()

  await db.update(vaults)
    .set({ status: 'accessed', updatedAt: new Date() })
    .where(eq(vaults.uuid, data.vaultUuid))
    .run()
}

export async function getUserVaults(walletAddress: string) {
  const db = await getDb()
  return db.select().from(vaults)
    .where(eq(vaults.ownerAddress, walletAddress))
    .orderBy(desc(vaults.createdAt))
    .limit(100)
    .all()
}

export async function getVaultByUuid(uuid: number) {
  const db = await getDb()
  return db.select().from(vaults).where(eq(vaults.uuid, uuid)).get()
}

export async function getVaultLicenseTokens(vaultUuid: number) {
  const db = await getDb()
  return db.select().from(licenseTokens)
    .where(eq(licenseTokens.vaultUuid, vaultUuid))
    .orderBy(desc(licenseTokens.createdAt))
    .all()
}

export async function getVaultActivity(vaultUuid: number, limit = 20) {
  const db = await getDb()
  return db.select().from(activity)
    .where(eq(activity.vaultUuid, vaultUuid))
    .orderBy(desc(activity.createdAt))
    .limit(limit)
    .all()
}

export async function getUserActivity(walletAddress: string, limit = 50) {
  const db = await getDb()
  return db.select().from(activity)
    .where(eq(activity.walletAddress, walletAddress))
    .orderBy(desc(activity.createdAt))
    .limit(limit)
    .all()
}

export async function vaultExists(uuid: number) {
  const db = await getDb()
  const row = await db.select({ uuid: vaults.uuid }).from(vaults).where(eq(vaults.uuid, uuid)).get()
  return !!row
}

export async function getVaultEncryptedDataKey(uuid: number) {
  const db = await getDb()
  const row = await db.select({
    encryptedDataKey: vaults.encryptedDataKey,
    dataKeyEncryptionMeta: vaults.dataKeyEncryptionMeta,
    ownerAddress: vaults.ownerAddress,
    ipfsCid: vaults.ipfsCid,
    encryptedFileMeta: vaults.encryptedFileMeta,
  }).from(vaults).where(eq(vaults.uuid, uuid)).get()
  return row
}

export async function getUserStats(walletAddress: string) {
  const db = await getDb()
  const [vaultCount, activeCount, accessedCount, licenseCount, accessCount] = await Promise.all([
    db.select({ value: sql<number>`count(*)` }).from(vaults)
      .where(eq(vaults.ownerAddress, walletAddress)).get(),
    db.select({ value: sql<number>`count(*)` }).from(vaults)
      .where(and(eq(vaults.ownerAddress, walletAddress), eq(vaults.status, 'active'))).get(),
    db.select({ value: sql<number>`count(*)` }).from(vaults)
      .where(and(eq(vaults.ownerAddress, walletAddress), eq(vaults.status, 'accessed'))).get(),
    db.select({ value: sql<number>`count(*)` }).from(activity)
      .where(and(eq(activity.walletAddress, walletAddress), eq(activity.type, 'license_minted'))).get(),
    db.select({ value: sql<number>`count(*)` }).from(activity)
      .where(and(eq(activity.walletAddress, walletAddress), eq(activity.type, 'vault_accessed'))).get(),
  ])

  return {
    totalVaults: Number(vaultCount?.value ?? 0),
    activeVaults: Number(activeCount?.value ?? 0),
    accessedVaults: Number(accessedCount?.value ?? 0),
    licenseCount: Number(licenseCount?.value ?? 0),
    accessCount: Number(accessCount?.value ?? 0),
  }
}

export async function setVaultPrice(uuid: number, price: number | null) {
  const db = await getDb()
  await db.update(vaults)
    .set({ price, updatedAt: new Date() })
    .where(eq(vaults.uuid, uuid))
    .run()
}

export async function setVaultForSale(uuid: number, isForSale: boolean) {
  const db = await getDb()
  const updates: Partial<typeof vaults.$inferInsert> = { isForSale, updatedAt: new Date() }
  if (!isForSale) updates.price = null
  await db.update(vaults)
    .set(updates)
    .where(eq(vaults.uuid, uuid))
    .run()
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
    .get()
  if (existing) return existing
  return db.insert(purchases).values({
    vaultUuid,
    buyerAddress,
    buyerLicenseTokenId,
    mintTxHash,
    paid: true,
    createdAt: new Date(),
  }).returning().get()
}

export async function getPurchase(vaultUuid: number, buyerAddress: string) {
  const db = await getDb()
  return db.select().from(purchases)
    .where(and(eq(purchases.vaultUuid, vaultUuid), eq(purchases.buyerAddress, buyerAddress)))
    .get()
}

export async function getPurchasesForBuyer(buyerAddress: string) {
  const db = await getDb()
  return db.select().from(purchases)
    .where(eq(purchases.buyerAddress, buyerAddress))
  .orderBy(desc(purchases.createdAt))
  .limit(100)
  .all()
}

export async function getVaultsForSale(limit = 50, offset = 0) {
  const db = await getDb()
  return db.select({
    uuid: vaults.uuid,
    name: vaults.name,
    description: vaults.description,
    price: vaults.price,
    ownerAddress: vaults.ownerAddress,
    ipId: vaults.ipId,
    status: vaults.status,
    createdAt: vaults.createdAt,
    updatedAt: vaults.updatedAt,
  }).from(vaults)
    .where(eq(vaults.isForSale, true))
    .orderBy(desc(vaults.updatedAt))
    .limit(limit)
    .offset(offset)
    .all()
}
