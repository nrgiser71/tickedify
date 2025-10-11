-- Migration 011-002: Create payment_configurations table
-- Feature: 011-in-de-app
-- Date: 2025-10-11

CREATE TABLE IF NOT EXISTS payment_configurations (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(50) UNIQUE NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  checkout_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_configs_plan_id ON payment_configurations(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_configs_active ON payment_configurations(is_active);

-- Insert initial data
INSERT INTO payment_configurations (plan_id, plan_name, checkout_url, is_active) VALUES
  ('monthly_7', 'Maandelijks €7', '', FALSE),
  ('yearly_70', 'Jaarlijks €70', '', FALSE)
ON CONFLICT (plan_id) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_config_updated_at
  BEFORE UPDATE ON payment_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_config_updated_at();
