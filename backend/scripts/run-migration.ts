import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigration() {
  try {
    const migrationFile = process.argv[2] || './migrations/001_roles_permissions.sql';
    const sql = readFileSync(migrationFile, 'utf-8');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();
