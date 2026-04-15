import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function createAdmin() {
  // Dynamic import after env is loaded
  const { auth } = await import('../lib/auth.js');
  
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    // Create user via better-auth
    const result = await auth.api.signUpEmail({
      body: {
        name: 'Pray Jonas',
        email: 'prayjonas@arushameru.sc.tz',
        password: '123456789',
        gender: 'male',
        level: null,
      }
    });
    
    console.log('✅ User created:', result.user?.email);
    
    // Update role to admin directly in DB
    if (result?.user?.id) {
      await pool.query(
        'UPDATE "user" SET role = $1 WHERE id = $2',
        ['admin', result.user.id]
      );
      console.log('✅ Admin role assigned successfully!');
    }
  } catch (error: any) {
    if (error?.body?.code === 'USER_ALREADY_EXISTS') {
      console.log('⚠️ User already exists, updating role to admin...');
      await pool.query(
        'UPDATE "user" SET role = $1 WHERE email = $2',
        ['admin', 'prayjonas27@gmail.com']
      );
      console.log('✅ Admin role assigned!');
    } else {
      console.error('❌ Error:', error);
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createAdmin();
