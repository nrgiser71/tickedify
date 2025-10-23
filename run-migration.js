// Tijdelijk script om messaging system database schema aan te maken
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'specs/026-lees-messaging-system/SETUP_DATABASE.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing migration SQL...');

    // Execute SQL
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const result = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('admin_messages', 'message_interactions', 'user_page_visits')
       ORDER BY table_name`
    );

    console.log('Tables created:');
    result.rows.forEach(row => {
      console.log('  ✓ ' + row.table_name);
    });

    // Check subscription_type column
    const columnCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'users'
         AND column_name = 'subscription_type'`
    );

    if (columnCheck.rows.length > 0) {
      console.log('  ✓ users.subscription_type column');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
