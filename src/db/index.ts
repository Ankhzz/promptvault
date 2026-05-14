import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

let _db: LibSQLDatabase<typeof schema> | null = null

async function createDb(): Promise<LibSQLDatabase<typeof schema>> {
  const url = process.env.TURSO_DATABASE_URL || 'file:promptvault.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  const { createClient } = await import('@libsql/client')
  const { drizzle } = await import('drizzle-orm/libsql')

  const client = createClient({ url, authToken })
  return drizzle(client, { schema })
}

export async function getDb(): Promise<LibSQLDatabase<typeof schema>> {
  if (!_db) {
    _db = await createDb()
  }
  return _db
}
