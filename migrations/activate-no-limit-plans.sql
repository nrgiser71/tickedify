-- Migration: Activate No Limit subscription plans
-- Version: 0.18.9
-- Date: 2025-10-12
-- Purpose: Set is_active=true for monthly_8 and yearly_80 plans

UPDATE payment_configurations
SET is_active = true,
    updated_at = NOW()
WHERE plan_id IN ('monthly_8', 'yearly_80')
  AND is_active = false;

-- Verify the update
SELECT plan_id, checkout_url, is_active, updated_at
FROM payment_configurations
ORDER BY plan_id;
