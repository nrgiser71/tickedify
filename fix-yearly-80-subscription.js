#!/usr/bin/env node
/**
 * Fix Yearly €80 Subscription Bug
 *
 * Problem: Webhook was mapping yearly subscriptions to 'yearly_70' instead of 'yearly_80'
 * This caused wrong plan assignment and wrong confirmation emails
 *
 * This script fixes existing users who paid €80/year but got yearly_70 assigned
 *
 * Usage: node fix-yearly-80-subscription.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixYearly80Subscriptions() {
  try {
    console.log('🔍 Searching for users with yearly_70 who should have yearly_80...\n');

    // Find users with selected_plan = 'yearly_70' who have recent webhook logs
    // indicating they paid €80
    const result = await pool.query(`
      SELECT DISTINCT u.id, u.email, u.naam, u.selected_plan, u.plugandpay_order_id,
             w.amount_cents, w.processed_at
      FROM users u
      LEFT JOIN payment_webhook_logs w ON w.order_id = u.plugandpay_order_id
      WHERE u.selected_plan = 'yearly_70'
        AND w.amount_cents = 8000  -- €80.00 in cents
      ORDER BY w.processed_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('✅ No users found with yearly_70 who paid €80');
      console.log('   All yearly subscriptions appear to be correctly assigned\n');
      return;
    }

    console.log(`Found ${result.rows.length} user(s) with yearly_70 but €80 payment:\n`);

    for (const user of result.rows) {
      console.log(`📧 ${user.email}`);
      console.log(`   Name: ${user.naam || 'N/A'}`);
      console.log(`   Current plan: ${user.selected_plan}`);
      console.log(`   Paid: €${(user.amount_cents / 100).toFixed(2)}`);
      console.log(`   Order ID: ${user.plugandpay_order_id}`);
      console.log(`   Payment date: ${user.processed_at}\n`);

      // Update to yearly_80
      await pool.query(
        'UPDATE users SET selected_plan = $1 WHERE id = $2',
        ['yearly_80', user.id]
      );

      console.log(`   ✅ Updated to yearly_80\n`);
    }

    console.log('🎉 Fix completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Verify in admin2 dashboard that subscriptions show €80');
    console.log('2. New yearly webhooks will now correctly map to yearly_80');
    console.log('3. Confirmation emails will show correct "Jaarlijks €80" plan\n');

  } catch (error) {
    console.error('❌ Error fixing subscriptions:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
fixYearly80Subscriptions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
