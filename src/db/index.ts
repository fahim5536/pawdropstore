import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pkg;

// Guard check to notify lack of DB env config gracefully rather than crashing
const checkDbEnv = () => {
  const missing = [];
  if (!process.env.SQL_HOST) missing.push("SQL_HOST");
  if (!process.env.SQL_USER) missing.push("SQL_USER");
  if (!process.env.SQL_PASSWORD) missing.push("SQL_PASSWORD");
  if (!process.env.SQL_DB_NAME) missing.push("SQL_DB_NAME");
  return missing;
};

// Lazy creation helper to prevent instant startup failure if keys are temporarily missing
export const createPool = () => {
  const missing = checkDbEnv();
  if (missing.length > 0) {
    console.error(`[Cloud SQL] Missing environment keys: ${missing.join(', ')}. Using mock fallback pool.`);
    return new Pool(); // Return empty pool
  }

  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  });
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const dbResult = drizzle(pool, { schema });
export { schema };
