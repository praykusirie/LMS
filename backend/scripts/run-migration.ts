import dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

const MIGRATIONS_DIR = './migrations';

async function initMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
  const result = await pool.query('SELECT filename FROM _migrations ORDER BY id');
  return result.rows.map(row => row.filename);
}

async function recordMigration(filename: string) {
  await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [filename]);
}

async function runMigration() {
  try {
    await initMigrationTable();

    const appliedMigrations = await getAppliedMigrations();
    const allFiles = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const pendingMigrations = allFiles.filter(f => !appliedMigrations.includes(f));

    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations are already up to date!');
      return;
    }

    console.log(`📦 Found ${pendingMigrations.length} pending migration(s)...\n`);

    for (const filename of pendingMigrations) {
      const filepath = join(MIGRATIONS_DIR, filename);
      console.log(`⏳ Running: ${filename}`);
      const sql = readFileSync(filepath, 'utf-8');
      await pool.query(sql);
      await recordMigration(filename);
      console.log(`✅ Completed: ${filename}\n`);
    }

    console.log(`🎉 All ${pendingMigrations.length} migration(s) completed successfully!`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();
