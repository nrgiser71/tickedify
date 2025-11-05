-- Migration: Add Subscription Management
-- Feature: 057-dan-gaan-we
-- Date: 2025-11-05
-- Description: Add subscription management with Plug&Pay integration

-- ==========================================
-- STEP 1: Add subscription columns to users table
-- ==========================================

ALTER TABLE users
  ADD COLUMN plugpay_subscription_id VARCHAR(255),
  ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'trial',
  ADD COLUMN subscription_plan VARCHAR(50),
  ADD COLUMN subscription_renewal_date TIMESTAMP,
  ADD COLUMN subscription_price DECIMAL(10,2),
  ADD COLUMN subscription_cycle VARCHAR(20),
  ADD COLUMN trial_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT NOW();

-- ==========================================
-- STEP 2: Create subscription_plans table
-- ==========================================

CREATE TABLE subscription_plans (
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
);

-- ==========================================
-- STEP 3: Create webhook_events table
-- ==========================================

CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  subscription_id VARCHAR(255),
  payload JSONB,
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- STEP 4: Create subscription_change_requests table
-- ==========================================

CREATE TABLE subscription_change_requests (
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
);

-- ==========================================
-- STEP 5: Create indexes for performance
-- ==========================================

-- Users table indexes
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_plugpay_subscription_id ON users(plugpay_subscription_id);

-- Subscription plans indexes
CREATE INDEX idx_subscription_plans_tier_level ON subscription_plans(tier_level);
CREATE INDEX idx_subscription_plans_plan_id ON subscription_plans(plan_id);

-- Webhook events indexes
CREATE UNIQUE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_subscription_id ON webhook_events(subscription_id);

-- Subscription change requests indexes
CREATE INDEX idx_subscription_change_requests_user_id ON subscription_change_requests(user_id);
CREATE INDEX idx_subscription_change_requests_effective_date ON subscription_change_requests(effective_date);
CREATE INDEX idx_subscription_change_requests_status ON subscription_change_requests(status);

-- ==========================================
-- STEP 6: Seed subscription plans
-- ==========================================

INSERT INTO subscription_plans (plan_id, plan_name, price_monthly, price_yearly, tier_level, features) VALUES
('basic', 'Basic Plan', 4.99, 49.99, 1, '["Unlimited tasks", "Email import", "Daily planning"]'::jsonb),
('pro', 'Pro Plan', 9.99, 99.99, 2, '["Everything in Basic", "Recurring tasks", "Priority support", "Advanced analytics"]'::jsonb),
('enterprise', 'Enterprise Plan', 29.99, 299.99, 3, '["Everything in Pro", "Team collaboration", "API access", "Custom integrations"]'::jsonb);

-- ==========================================
-- STEP 7: Backfill existing users
-- ==========================================

-- Set trial_end_date for all existing users without it
UPDATE users SET trial_end_date = created_at + INTERVAL '14 days' WHERE trial_end_date IS NULL;

-- Update trial status for expired trials
UPDATE users SET subscription_status = 'expired' WHERE trial_end_date < NOW() AND subscription_status = 'trial';

-- ==========================================
-- ROLLBACK SCRIPT (if needed)
-- ==========================================
/*
-- Rollback instructions (run if migration needs to be reverted):

DROP TABLE IF EXISTS subscription_change_requests;
DROP TABLE IF EXISTS webhook_events;
DROP TABLE IF EXISTS subscription_plans;

ALTER TABLE users
  DROP COLUMN IF EXISTS plugpay_subscription_id,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_plan,
  DROP COLUMN IF EXISTS subscription_renewal_date,
  DROP COLUMN IF EXISTS subscription_price,
  DROP COLUMN IF EXISTS subscription_cycle,
  DROP COLUMN IF EXISTS trial_end_date,
  DROP COLUMN IF EXISTS subscription_updated_at;
*/
