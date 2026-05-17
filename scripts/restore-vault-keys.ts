import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../src/db/schema'
import { readFileSync } from 'node:fs'
import { eq, and } from 'drizzle-orm'

const filename = process.argv[2]
if (!filename) {
  console.error('❌ Usage: npx tsx --env-file=.env.local scripts/restore-vault-keys.ts <backup-file.json>')
  process.exit(1)
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set. Run with: --env-file=.env.local')
    process.exit(1)
  }

  console.log(`📖 Reading backup: ${filename}`)
  const backup = JSON.parse(readFileSync(filename, 'utf-8'))

  console.log('🔌 Connecting to database...')
  const client = postgres(connectionString, { ssl: 'require', prepare: false })
  const db = drizzle(client, { schema })

  let restoredVaults = 0
  let restoredPurchases = 0

  for (const vault of backup.vaults) {
    await db.update(schema.vaults)
      .set({
        ipfsCid: vault.ipfsCid,
        encryptedDataKey: vault.encryptedDataKey,
        encryptedFileMeta: vault.encryptedFileMeta,
        dataKeyEncryptionMeta: vault.dataKeyEncryptionMeta,
      })
      .where(eq(schema.vaults.uuid, vault.uuid))
    restoredVaults++
  }

  for (const purchase of backup.purchases) {
    await db.update(schema.purchases)
      .set({ encryptedDataKey: purchase.encryptedDataKey })
      .where(and(
        eq(schema.purchases.vaultUuid, purchase.vaultUuid),
        eq(schema.purchases.buyerAddress, purchase.buyerAddress),
      ))
    restoredPurchases++
  }

  console.log(`\n✅ Restore complete:`)
  console.log(`   • Vaults restored: ${restoredVaults}`)
  console.log(`   • Purchases restored: ${restoredPurchases}`)

  await client.end()
}

main().catch((err) => {
  console.error('❌ Restore failed:', err.message)
  process.exit(1)
})
