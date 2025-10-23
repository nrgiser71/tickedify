const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false }
});

async function rollback() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔄 Starting rollback for migration 014: Onboarding Video...');

    // Drop columns from users table (IF EXISTS)
    console.log('  Dropping onboarding video columns from users table...');
    await client.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS onboarding_video_seen,
      DROP COLUMN IF EXISTS onboarding_video_seen_at
    `);
    console.log('  ✅ Users columns dropped successfully');

    // Drop system_settings table (IF EXISTS)
    console.log('  Dropping system_settings table...');
    await client.query(`DROP TABLE IF EXISTS system_settings`);
    console.log('  ✅ system_settings table dropped successfully');

    await client.query('COMMIT');
    console.log('✅ Rollback 014 complete!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

rollback().catch(err => {
  console.error(err);
  process.exit(1);
});
