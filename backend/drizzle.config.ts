// ==========================================
// DRIZZLE CONFIG
//
// The SQL schema in db/init/01_schema.sql is the source of truth; the
// TypeScript schema in src/db/schema.ts is generated from a live database by:
//
//   npx drizzle-kit pull
//
// so the two can never drift. Don't hand-edit src/db/schema.ts.
// ==========================================

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required (see backend/db/README.md)');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL
  },
  casing: 'snake_case',
  verbose: true,
  strict: true
});
