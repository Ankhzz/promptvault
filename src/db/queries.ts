'use server'

import { db } from '@/db'
import { users, vaults, activity, licenseTokens } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function getOrCreateUser(walletAddress: string) {
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
  return db.select().from(vaults)
    .where(eq(vaults.ownerAddress, walletAddress))
    .orderBy(desc(vaults.createdAt))
    .all()
}

export async function getVaultByUuid(uuid: number) {
  return db.select().from(vaults).where(eq(vaults.uuid, uuid)).get()
}

export async function getVaultLicenseTokens(vaultUuid: number) {
  return db.select().from(licenseTokens)
    .where(eq(licenseTokens.vaultUuid, vaultUuid))
    .orderBy(desc(licenseTokens.createdAt))
    .all()
}

export async function getVaultActivity(vaultUuid: number, limit = 20) {
  return db.select().from(activity)
    .where(eq(activity.vaultUuid, vaultUuid))
    .orderBy(desc(activity.createdAt))
    .limit(limit)
    .all()
}

export async function getUserActivity(walletAddress: string, limit = 50) {
  return db.select().from(activity)
    .where(eq(activity.walletAddress, walletAddress))
    .orderBy(desc(activity.createdAt))
    .limit(limit)
    .all()
}

export async function vaultExists(uuid: number) {
  const row = await db.select({ uuid: vaults.uuid }).from(vaults).where(eq(vaults.uuid, uuid)).get()
  return !!row
}

export async function getVaultEncryptedDataKey(uuid: number) {
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
  const userVaults = await db.select().from(vaults)
    .where(eq(vaults.ownerAddress, walletAddress))
    .all()

  const userActivity = await db.select().from(activity)
    .where(eq(activity.walletAddress, walletAddress))
    .all()

  return {
    totalVaults: userVaults.length,
    activeVaults: userVaults.filter(v => v.status === 'active').length,
    accessedVaults: userVaults.filter(v => v.status === 'accessed').length,
    licenseCount: userActivity.filter(a => a.type === 'license_minted').length,
    accessCount: userActivity.filter(a => a.type === 'vault_accessed').length,
  }
}
