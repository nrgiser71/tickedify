const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Reading migration file...');
    let migrationSQL = fs.readFileSync('./migrations/20251105_add_subscription_management.sql', 'utf8');
    
    // Remove the rollback comment block
    migrationSQL = migrationSQL.replace(/\/\*[\s\S]*?\*\//g, '');
    
    console.log('⚙️  Executing migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('subscription_plans', 'webhook_events', 'subscription_change_requests')
      ORDER BY table_name
    `);
    
    console.log('\n📊 Created tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Verify plans
    const plans = await client.query('SELECT plan_id, plan_name, tier_level FROM subscription_plans ORDER BY tier_level');
    console.log('\n💰 Seeded plans:');
    plans.rows.forEach(p => console.log(`  - ${p.plan_name} (${p.plan_id}), tier ${p.tier_level}`));
    
    // Check users table columns
    const usersCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name LIKE '%subscription%'
      OR column_name = 'trial_end_date'
      ORDER BY column_name
    `);
    console.log('\n👤 Users table columns added:', usersCols.rows.map(r => r.column_name).join(', '));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
