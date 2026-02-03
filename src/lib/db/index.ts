import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

// In test environment, we use mocks so don't require real connection
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST

if (!connectionString && !isTestEnv) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Supabase requires SSL for all connections (including development)
const isSupabase = connectionString?.includes('supabase')

const pool = new Pool({
  connectionString: connectionString || 'postgresql://test:test@localhost:5432/test',
  // SSL required for Supabase (always), optional for local dev
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  // Connection pool settings optimized for serverless
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Increased for Supabase
})

export const db = drizzle(pool)

export { pool }
