import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

let _db: PostgresJsDatabase<typeof schema> | null = null

async function createDb(): Promise<PostgresJsDatabase<typeof schema>> {
  const connectionString = process.env.DATABASE_URL!

  const { default: postgres } = await import('postgres')
  const { drizzle } = await import('drizzle-orm/postgres-js')

  const client = postgres(connectionString, { ssl: 'require' })
  return drizzle(client, { schema })
}

export async function getDb(): Promise<PostgresJsDatabase<typeof schema>> {
  if (!_db) {
    _db = await createDb()
  }
  return _db
}
