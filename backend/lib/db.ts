import { Pool } from "pg";
import type { PoolClient } from "pg";
import { config } from "./config.js";

export const pool = new Pool({
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    options: '-c timezone=Africa/Nairobi',
    max: config.db.maxPoolSize,
    idleTimeoutMillis: config.db.idleTimeoutMillis,
    connectionTimeoutMillis: config.db.connectionTimeoutMillis,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Transaction wrapper to handle BEGIN/COMMIT/ROLLBACK automatically.
 * @param callback Function to execute within the transaction
 * @returns The result of the callback
 */
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
