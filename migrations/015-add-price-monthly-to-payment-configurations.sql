-- Migration 015: Add price_monthly column to payment_configurations table
-- Date: 2025-10-19
-- Purpose: Add price_monthly column to store monthly price for each plan tier

ALTER TABLE payment_configurations
ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2);

-- Set default prices for existing plans
UPDATE payment_configurations SET price_monthly = 7.00 WHERE plan_id = 'monthly_7' AND price_monthly IS NULL;
UPDATE payment_configurations SET price_monthly = 5.83 WHERE plan_id = 'yearly_70' AND price_monthly IS NULL;  -- 70/12 = 5.83
UPDATE payment_configurations SET price_monthly = 8.00 WHERE plan_id = 'monthly_8' AND price_monthly IS NULL;
UPDATE payment_configurations SET price_monthly = 6.67 WHERE plan_id = 'yearly_80' AND price_monthly IS NULL;  -- 80/12 = 6.67
UPDATE payment_configurations SET price_monthly = 0.00 WHERE plan_id = 'free' AND price_monthly IS NULL;
UPDATE payment_configurations SET price_monthly = 0.00 WHERE plan_id = 'trial' AND price_monthly IS NULL;
