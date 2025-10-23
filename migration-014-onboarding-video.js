const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔄 Starting migration 014: Onboarding Video...');

    // Check if onboarding_video_seen column already exists (idempotent)
    const checkUsersColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='users' AND column_name='onboarding_video_seen'
    `);

    if (checkUsersColumns.rows.length === 0) {
      console.log('  Adding onboarding video columns to users table...');
      await client.query(`
        ALTER TABLE users
        ADD COLUMN onboarding_video_seen BOOLEAN DEFAULT FALSE,
        ADD COLUMN onboarding_video_seen_at TIMESTAMP
      `);
      console.log('  ✅ Users columns added successfully');
    } else {
      console.log('  ✓ Users columns already exist');
    }

    // Check if system_settings table exists
    const checkTable = await client.query(`
      SELECT FROM information_schema.tables
      WHERE table_name='system_settings'
    `);

    if (checkTable.rows.length === 0) {
      console.log('  Creating system_settings table...');
      await client.query(`
        CREATE TABLE system_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by VARCHAR(50) REFERENCES users(id)
        )
      `);
      console.log('  ✅ system_settings table created');

      // Insert initial onboarding video URL (NULL)
      console.log('  Inserting initial system settings...');
      await client.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('onboarding_video_url', NULL)
      `);
      console.log('  ✅ Initial settings inserted');
    } else {
      console.log('  ✓ system_settings table already exists');

      // Check if onboarding_video_url setting exists
      const checkSetting = await client.query(`
        SELECT key FROM system_settings WHERE key = 'onboarding_video_url'
      `);

      if (checkSetting.rows.length === 0) {
        console.log('  Inserting onboarding_video_url setting...');
        await client.query(`
          INSERT INTO system_settings (key, value)
          VALUES ('onboarding_video_url', NULL)
        `);
        console.log('  ✅ onboarding_video_url setting inserted');
      } else {
        console.log('  ✓ onboarding_video_url setting already exists');
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migration 014 complete!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
