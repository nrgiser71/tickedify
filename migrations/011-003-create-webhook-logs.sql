-- Migration 011-003: Create payment_webhook_logs table
-- Feature: 011-in-de-app
-- Date: 2025-10-11

CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100),
  order_id VARCHAR(255),
  email VARCHAR(255),
  amount_cents INTEGER,
  payload JSONB,
  signature_valid BOOLEAN,
  processed_at TIMESTAMP DEFAULT NOW(),
  error_message TEXT,
  ip_address VARCHAR(45)
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON payment_webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON payment_webhook_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON payment_webhook_logs(processed_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON payment_webhook_logs(event_type);
