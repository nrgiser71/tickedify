// Migration script for user_settings table
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
    const sqlPath = path.join(__dirname, 'migrations/20251105_add_user_settings_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing migration SQL for user_settings table...');

    // Execute SQL
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');

    // Verify table structure
    console.log('\n🔍 Verifying table structure...');
    const columnsResult = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'user_settings'
       ORDER BY ordinal_position`
    );

    console.log('\n📋 Table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type})`);
    });

    // Verify constraints
    console.log('\n🔒 Checking constraints...');
    const constraintsResult = await pool.query(
      `SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'user_settings'
       ORDER BY tc.constraint_type`
    );

    constraintsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.constraint_type}: ${row.constraint_name} (${row.column_name})`);
    });

    // Verify indexes
    console.log('\n📇 Checking indexes...');
    const indexesResult = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'user_settings'`
    );

    indexesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.indexname}`);
    });

    console.log('\n✨ user_settings table is ready!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Table already exists - checking structure...');
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM user_settings`);
        console.log(`✓ Table is accessible (${result.rows[0].count} rows)`);
      } catch (e) {
        console.error('❌ Cannot access table:', e.message);
      }
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
