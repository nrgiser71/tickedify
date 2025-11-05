// Check database tables
const { Pool } = require('pg');
require('dotenv').config();

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');

    // List all tables
    const result = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );

    console.log('\n📋 Available tables:');
    result.rows.forEach(row => {
      console.log(`  • ${row.table_name}`);
    });

    // Check for user-related tables
    const userTables = result.rows.filter(r =>
      r.table_name.toLowerCase().includes('user') ||
      r.table_name.toLowerCase().includes('gebruiker')
    );

    if (userTables.length > 0) {
      console.log('\n👤 User-related tables found:');
      userTables.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
    }

    // Check users table structure
    console.log('\n🔍 Checking users table structure...');
    const usersColumns = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'users'
       ORDER BY ordinal_position`
    );

    console.log('\n📋 users table columns:');
    usersColumns.rows.forEach(row => {
      console.log(`  • ${row.column_name} (${row.data_type})`);
    });

    // Check for primary key
    const pk = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'users'
         AND tc.constraint_type = 'PRIMARY KEY'`
    );

    if (pk.rows.length > 0) {
      console.log('\n🔑 Primary key:');
      pk.rows.forEach(row => {
        console.log(`  ✓ ${row.column_name}`);
      });
    } else {
      console.log('\n⚠️  No primary key found on users table!');
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
