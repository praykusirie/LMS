import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function resetMigration() {
  try {
    // Remove the migration record so it can be re-run
    await pool.query('DELETE FROM _migrations WHERE filename = $1', ['009_class_management.sql']);
    console.log('✅ Migration 009_class_management.sql reset successfully!');
    console.log('You can now run: npm run migrate');
  } catch (error) {
    console.error('❌ Error resetting migration:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

resetMigration();
