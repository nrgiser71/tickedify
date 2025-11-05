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
    console.log('🔍 Checking existing structure...\n');
    
    // Check what users columns exist
    const usersCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
      AND (column_name LIKE '%subscription%' OR column_name = 'trial_end_date' OR column_name LIKE '%plugpay%' OR column_name LIKE '%plugandpay%')
      ORDER BY column_name
    `);
    console.log('Existing users columns:', usersCols.rows.map(r => r.column_name).join(', '));
    
    // Create missing tables
    console.log('\n📝 Creating subscription_plans table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        plan_id VARCHAR(50) UNIQUE NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        price_monthly DECIMAL(10,2) NOT NULL,
        price_yearly DECIMAL(10,2) NOT NULL,
        features JSONB,
        tier_level INTEGER NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('📝 Creating webhook_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        subscription_id VARCHAR(255),
        payload JSONB,
        processed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('📝 Creating subscription_change_requests table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_change_requests (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        current_plan VARCHAR(50) NOT NULL,
        new_plan VARCHAR(50) NOT NULL,
        change_type VARCHAR(20) NOT NULL,
        effective_date TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        plugpay_change_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('\n📇 Creating indexes...');
    
    // Subscription plans indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier_level ON subscription_plans(tier_level)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_id ON subscription_plans(plan_id)');
    
    // Webhook events indexes
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_webhook_events_subscription_id ON webhook_events(subscription_id)');
    
    // Subscription change requests indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_subscription_change_requests_user_id ON subscription_change_requests(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_subscription_change_requests_effective_date ON subscription_change_requests(effective_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_subscription_change_requests_status ON subscription_change_requests(status)');
    
    // Users indexes (if not exist)
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status)');
    
    console.log('\n💰 Seeding subscription plans...');
    
    // Check if plans already exist
    const planCount = await client.query('SELECT COUNT(*) as count FROM subscription_plans');
    if (parseInt(planCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO subscription_plans (plan_id, plan_name, price_monthly, price_yearly, tier_level, features) VALUES
        ('basic', 'Basic Plan', 4.99, 49.99, 1, '["Unlimited tasks", "Email import", "Daily planning"]'::jsonb),
        ('pro', 'Pro Plan', 9.99, 99.99, 2, '["Everything in Basic", "Recurring tasks", "Priority support", "Advanced analytics"]'::jsonb),
        ('enterprise', 'Enterprise Plan', 29.99, 299.99, 3, '["Everything in Pro", "Team collaboration", "API access", "Custom integrations"]'::jsonb)
      `);
      console.log('✅ Plans seeded successfully');
    } else {
      console.log('ℹ️  Plans already exist, skipping seed');
    }
    
    // Add missing users columns if needed
    console.log('\n👤 Checking users table columns...');
    
    const existingCols = usersCols.rows.map(r => r.column_name);
    
    if (!existingCols.includes('subscription_plan')) {
      console.log('Adding subscription_plan column...');
      await client.query('ALTER TABLE users ADD COLUMN subscription_plan VARCHAR(50)');
    }
    
    if (!existingCols.includes('subscription_renewal_date')) {
      console.log('Adding subscription_renewal_date column...');
      await client.query('ALTER TABLE users ADD COLUMN subscription_renewal_date TIMESTAMP');
    }
    
    if (!existingCols.includes('subscription_price')) {
      console.log('Adding subscription_price column...');
      await client.query('ALTER TABLE users ADD COLUMN subscription_price DECIMAL(10,2)');
    }
    
    if (!existingCols.includes('subscription_cycle')) {
      console.log('Adding subscription_cycle column...');
      await client.query('ALTER TABLE users ADD COLUMN subscription_cycle VARCHAR(20)');
    }
    
    if (!existingCols.includes('subscription_updated_at')) {
      console.log('Adding subscription_updated_at column...');
      await client.query('ALTER TABLE users ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT NOW()');
    }
    
    if (!existingCols.includes('plugpay_subscription_id') && existingCols.includes('plugandpay_subscription_id')) {
      console.log('Renaming plugandpay_subscription_id to plugpay_subscription_id...');
      await client.query('ALTER TABLE users RENAME COLUMN plugandpay_subscription_id TO plugpay_subscription_id');
      await client.query('CREATE INDEX IF NOT EXISTS idx_users_plugpay_subscription_id ON users(plugpay_subscription_id)');
    }
    
    console.log('\n✅ Migration completed successfully!');
    
    // Verify final state
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('subscription_plans', 'webhook_events', 'subscription_change_requests')
      ORDER BY table_name
    `);
    console.log('\n📊 Subscription tables:', tables.rows.map(r => r.table_name).join(', '));
    
    const plans = await client.query('SELECT plan_id, plan_name, tier_level FROM subscription_plans ORDER BY tier_level');
    console.log('\n💳 Available plans:');
    plans.rows.forEach(p => console.log(`  - ${p.plan_name} (${p.plan_id}), tier ${p.tier_level}`));
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
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
