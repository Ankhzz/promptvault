import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

let _db: PostgresJsDatabase<typeof schema> | null = null

async function createDb(): Promise<PostgresJsDatabase<typeof schema>> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Configure it in .env.local or Vercel environment variables.\n' +
      'Format: postgresql://user:password@host:6543/database?pgbouncer=true'
    )
  }

  const { default: postgres } = await import('postgres')
  const { drizzle } = await import('drizzle-orm/postgres-js')

  const client = postgres(connectionString, { ssl: 'require', prepare: false })
  return drizzle(client, { schema })
}

export async function getDb(): Promise<PostgresJsDatabase<typeof schema>> {
  if (!_db) {
    _db = await createDb()
  }
  return _db
}
