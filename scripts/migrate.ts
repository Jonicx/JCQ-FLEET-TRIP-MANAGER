import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error('DATABASE_URL_UNPOOLED is required in .env.local to run migrations.');
}

const migration = await readFile(resolve('migrations/0001_app_user_state.sql'), 'utf8');
const pool = new Pool({ connectionString, max: 1 });

try {
  await pool.query(migration);
  console.log('Neon database migration applied successfully.');
} finally {
  await pool.end();
}
