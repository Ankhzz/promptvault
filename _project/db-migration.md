# Database Migration Guide

Safe backup and restore of encrypted vault keys for PromptVault.

## Why this exists

Some database fields are **irrecoverable** if lost:

| Field | Location | Recoverable? |
|---|---|---|
| `ipfsCid` | vaults table | ❌ Only in DB |
| `encryptedDataKey` | vaults + purchases | ❌ Only in DB |
| `encryptedFileMeta` | vaults table | ❌ Only in DB |
| `dataKeyEncryptionMeta` | vaults table | ❌ Only in DB |
| `ipId`, `licenseTermsId`, `txHash` | on-chain (Story) | ✅ Indexable from chain |

These scripts backup only the irrecoverable fields so you can safely reset or migrate your database.

## Prerequisites

- Node.js 20+ installed
- `DATABASE_URL` in `.env.local` (already configured)

## Backup

Export vault keys to a JSON file:

```bash
npx tsx --env-file=.env.local scripts/backup-vault-keys.ts
```

This creates a `backup-YYYY-MM-DD.json` file in the project root with:

- `vaults[]` — each vault's `uuid`, `ownerAddress`, `name`, `ipId`, `ipfsCid`, `encryptedDataKey`, `encryptedFileMeta`, `dataKeyEncryptionMeta`
- `purchases[]` — each purchase's `vaultUuid`, `buyerAddress`, `encryptedDataKey`

**Store the generated JSON file in a safe place** (e.g. encrypted cloud storage, password manager, or offline backup).

## Restore

After resetting/recreating the database, restore the keys:

```bash
npx tsx --env-file=.env.local scripts/restore-vault-keys.ts backup-2026-05-16.json
```

**Requirements for restore:**
- The vaults and purchases must already exist in the database (same `uuid` and `buyerAddress`)
- Only fields with `NULL` or outdated values will be updated
- The vault ownership (`ownerAddress`) must match the original

## Safe Purge Flow

Use this when you need to reset the database completely:

```
1. Run backup → backup-2026-05-16.json
2. (optional) Verify backup file is valid JSON
3. Purge database tables
4. Run migrations / recreate schema
5. Run restore → backup-2026-05-16.json
6. Verify vault content is accessible
```

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `DATABASE_URL not set` | Missing environment | Use `--env-file=.env.local` flag |
| `ENOTFOUND` pooler host | Wrong region in URL | Check Supabase → Settings → Database → Connection string |
| `ECONNREFUSED :6543` | Supabase project paused | Resume project in Supabase dashboard |
| `Cannot find module 'drizzle-orm'` | Dependencies not installed | Run `npm install` |
| Empty vaults in backup | All vaults are keyless (private only) | This is normal — nothing to restore |
| Restore succeeds but vault shows no content | `encryptedDataKey` didn't match | Ensure backup was taken before the purge |
