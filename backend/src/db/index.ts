// ==========================================
// DATABASE CLIENT
//
// Replaces backend/src/config/supabase.ts. Where that module spoke to
// PostgREST over HTTPS, this one holds a pooled TCP connection to PostgreSQL
// and runs real SQL through Drizzle.
//
// Two things follow from that and matter throughout the codebase:
//
//   1. There is no row-level security. Supabase's service-role key bypassed
//      RLS anyway, so nothing is lost, but it means every query must scope
//      itself to the right user explicitly - a missing `where userId` is now
//      a data leak rather than something the database would have caught.
//
//   2. Errors throw instead of arriving as `{ data, error }`. Callers use
//      try/catch; there is no error object to forget to check.
// ==========================================

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import * as schema from './schema';
import * as relations from './relations';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,

  // A single Express process does not need many connections, and managed
  // Postgres plans cap them low. Keep well under the server's limit.
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,

  // Local Docker speaks plaintext; managed providers require TLS.
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : undefined
});

// An idle client erroring (server restart, network drop) emits here rather
// than on a query. Without a listener this takes the whole process down.
pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

export const db = drizzle(pool, {
  schema: { ...schema, ...relations },
  logger: env.NODE_ENV === 'development' && env.LOG_LEVEL === 'debug'
});

export { schema };

/**
 * Verify the database is reachable before the server starts accepting traffic.
 * Replaces testSupabaseConnection().
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const result = await db.execute<{ db: string; tables: number }>(sql`
      SELECT current_database() AS db,
             (SELECT count(*) FROM information_schema.tables
               WHERE table_schema = 'public') AS tables
    `);

    const row = (result.rows ?? result)[0] as any;
    logger.info('PostgreSQL connection successful', {
      database: row?.db,
      tables: Number(row?.tables)
    });
    return true;
  } catch (error: any) {
    logger.error('PostgreSQL connection test failed', { error: error.message });
    return false;
  }
};

/** Close the pool on shutdown so Postgres isn't left holding connections. */
export const closeDatabase = async (): Promise<void> => {
  await pool.end();
  logger.info('PostgreSQL pool closed');
};
