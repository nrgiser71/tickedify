-- Migration 011-001: Extend users table with payment tracking fields
-- Feature: 011-in-de-app
-- Date: 2025-10-11

-- Add payment tracking fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_start_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS had_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plugandpay_order_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_token_used BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_plugandpay_order_id ON users(plugandpay_order_id);
CREATE INDEX IF NOT EXISTS idx_users_login_token ON users(login_token) WHERE login_token_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_trial_end_date ON users(trial_end_date) WHERE subscription_status = 'trialing';

-- Add constraint for trial dates
ALTER TABLE users ADD CONSTRAINT chk_trial_dates
  CHECK (trial_end_date IS NULL OR trial_start_date IS NULL OR trial_end_date >= trial_start_date);
