/**
 * Run Feature 011 database migrations
 * This script runs the payment system migrations
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

async function runMigrations() {
  try {
    console.log('🚀 Starting Feature 011 migrations...');

    // Read migration files
    const migration1 = fs.readFileSync(
      path.join(__dirname, 'migrations/011-001-extend-users-table.sql'),
      'utf8'
    );
    const migration2 = fs.readFileSync(
      path.join(__dirname, 'migrations/011-002-create-payment-configurations.sql'),
      'utf8'
    );
    const migration3 = fs.readFileSync(
      path.join(__dirname, 'migrations/011-003-create-webhook-logs.sql'),
      'utf8'
    );

    // Run migration 011-001
    console.log('📋 Running migration 011-001: Extend users table...');
    await pool.query(migration1);
    console.log('✅ Migration 011-001 completed');

    // Run migration 011-002
    console.log('📋 Running migration 011-002: Create payment_configurations table...');
    await pool.query(migration2);
    console.log('✅ Migration 011-002 completed');

    // Run migration 011-003
    console.log('📋 Running migration 011-003: Create payment_webhook_logs table...');
    await pool.query(migration3);
    console.log('✅ Migration 011-003 completed');

    console.log('🎉 All migrations completed successfully!');

    // Verify migrations
    console.log('\n🔍 Verifying migrations...');

    // Check users table extensions
    const usersColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('payment_confirmed_at', 'trial_start_date', 'trial_end_date',
                           'had_trial', 'plugandpay_order_id', 'amount_paid_cents',
                           'login_token', 'login_token_expires', 'login_token_used')
    `);
    console.log(`✅ Users table: ${usersColumns.rows.length}/9 new columns added`);

    // Check payment_configurations table
    const configCount = await pool.query('SELECT COUNT(*) FROM payment_configurations');
    console.log(`✅ Payment configurations table: ${configCount.rows[0].count} initial rows`);

    // Check payment_webhook_logs table
    const logsCount = await pool.query('SELECT COUNT(*) FROM payment_webhook_logs');
    console.log(`✅ Payment webhook logs table: ${logsCount.rows[0].count} rows (empty is expected)`);

    console.log('\n✅ All verifications passed!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
