import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../src/db/schema'
import { writeFileSync } from 'node:fs'

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set. Run with: npx tsx --env-file=.env.local scripts/backup-vault-keys.ts')
    process.exit(1)
  }

  console.log('🔌 Connecting to database...')
  const client = postgres(connectionString, { ssl: 'require', prepare: false })
  const db = drizzle(client, { schema })

  console.log('📦 Exporting vaults...')
  const vaults = await db.select({
    uuid: schema.vaults.uuid,
    ownerAddress: schema.vaults.ownerAddress,
    name: schema.vaults.name,
    ipId: schema.vaults.ipId,
    ipfsCid: schema.vaults.ipfsCid,
    encryptedDataKey: schema.vaults.encryptedDataKey,
    encryptedFileMeta: schema.vaults.encryptedFileMeta,
    dataKeyEncryptionMeta: schema.vaults.dataKeyEncryptionMeta,
  }).from(schema.vaults)

  console.log('📦 Exporting purchases...')
  const purchases = await db.select({
    vaultUuid: schema.purchases.vaultUuid,
    buyerAddress: schema.purchases.buyerAddress,
    encryptedDataKey: schema.purchases.encryptedDataKey,
  }).from(schema.purchases)

  const backup = {
    exportedAt: new Date().toISOString(),
    vaults: vaults.filter(v => v.encryptedDataKey != null),
    purchases: purchases.filter(p => p.encryptedDataKey != null),
  }

  const filename = `backup-${new Date().toISOString().split('T')[0]}.json`
  writeFileSync(filename, JSON.stringify(backup, null, 2), 'utf-8')

  console.log(`\n✅ Backup saved to: ${filename}`)
  console.log(`   • Vaults with keys: ${backup.vaults.length}`)
  console.log(`   • Purchases with keys: ${backup.purchases.length}`)
  console.log(`   • Vaults without keys (skipped): ${vaults.length - backup.vaults.length}`)
  console.log(`   • Purchases without keys (skipped): ${purchases.length - backup.purchases.length}`)

  await client.end()
}

main().catch((err) => {
  console.error('❌ Backup failed:', err.message)
  process.exit(1)
})
