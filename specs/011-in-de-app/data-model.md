# Data Model: Abonnement-Betalingsproces

**Feature**: 011-in-de-app
**Date**: 2025-10-11
**Status**: Design Complete

## Overview

Dit document beschrijft de database schema wijzigingen en entiteiten voor het abonnement-betalingsproces. De implementatie breidt de bestaande `users` tabel uit en voegt twee nieuwe tabellen toe voor payment configurations en webhook logging.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────┐
│ users (extended)                │
├─────────────────────────────────┤
│ id (PK)                         │
│ email                           │
│ subscription_status             │◄────┐
│ selected_plan                   │     │
│ plan_selected_at                │     │
│ payment_confirmed_at (NEW)      │     │
│ trial_start_date (NEW)          │     │
│ trial_end_date (NEW)            │     │
│ had_trial (NEW)                 │     │
│ plugandpay_order_id (NEW, UQ)   │     │
│ amount_paid_cents (NEW)         │     │
│ login_token (NEW)               │     │
│ login_token_expires (NEW)       │     │
│ login_token_used (NEW)          │     │
└─────────────────────────────────┘     │
                                         │
┌─────────────────────────────────┐     │
│ payment_configurations (NEW)    │     │
├─────────────────────────────────┤     │
│ id (PK)                         │     │
│ plan_id (UQ)                    │─────┘ (referenced by users.selected_plan)
│ plan_name                       │
│ checkout_url                    │
│ is_active                       │
│ created_at                      │
│ updated_at                      │
└─────────────────────────────────┘
          │
          │ (1:N)
          ▼
┌─────────────────────────────────┐
│ payment_webhook_logs (NEW)      │
├─────────────────────────────────┤
│ id (PK)                         │
│ user_id (FK)                    │─────► users.id
│ event_type                      │
│ order_id                        │
│ email                           │
│ amount_cents                    │
│ payload (JSONB)                 │
│ signature_valid                 │
│ processed_at                    │
│ error_message                   │
│ ip_address                      │
└─────────────────────────────────┘
```

---

## Entity Definitions

### 1. users (Extended)

**Purpose**: Track user subscription status and payment information

**Bestaande Velden** (relevant):
- `id` (INTEGER PRIMARY KEY)
- `email` (VARCHAR(255) UNIQUE NOT NULL)
- `subscription_status` (VARCHAR(50)) - existing, values updated
- `selected_plan` (VARCHAR(50)) - existing
- `plan_selected_at` (TIMESTAMP) - existing
- `selection_source` (VARCHAR(50)) - existing ('beta', 'registration', 'upgrade')

**Nieuwe Velden**:

| Veld | Type | Constraints | Beschrijving |
|------|------|-------------|--------------|
| `payment_confirmed_at` | TIMESTAMP | NULL | Timestamp wanneer webhook payment confirmation ontvangen |
| `trial_start_date` | DATE | NULL | Start datum van 14-day trial |
| `trial_end_date` | DATE | NULL | Eind datum van 14-day trial |
| `had_trial` | BOOLEAN | DEFAULT FALSE | Flag om te tracken of user al eerder trial heeft gebruikt |
| `plugandpay_order_id` | VARCHAR(255) | UNIQUE, NULL | Plug&Pay order ID voor idempotency |
| `amount_paid_cents` | INTEGER | NULL | Betaald bedrag in cents (voor audit trail) |
| `login_token` | VARCHAR(255) | NULL | Auto-login token voor seamless return na payment |
| `login_token_expires` | TIMESTAMP | NULL | Expiry timestamp voor login token (10 minuten) |
| `login_token_used` | BOOLEAN | DEFAULT FALSE | Flag om single-use token te enforc en |

**subscription_status Values**:
- `beta` - Beta tester (initial state)
- `trialing` - Actieve 14-day trial
- `trial_expired` - Trial afgelopen, needs paid subscription
- `active` - Betaald abonnement actief
- `expired` - Abonnement verlopen (future: failed renewal)
- `cancelled` - Gebruiker cancelled (future)

**selected_plan Values**:
- `trial_14_days` - 14 dagen gratis proefperiode
- `monthly_7` - Maandelijks €7
- `yearly_70` - Jaarlijks €70

**Validation Rules**:
- `trial_end_date` MUST be ≥ `trial_start_date` + 14 days
- `login_token_expires` MUST be ≤ NOW() + 10 minutes when created
- `plugandpay_order_id` UNIQUE constraint prevents duplicate payment processing
- If `subscription_status` = 'trialing', then `trial_start_date` and `trial_end_date` MUST be set
- If `subscription_status` = 'active', then `payment_confirmed_at` MUST be set

**State Transitions**:
```
beta → trialing (select trial)
beta → active (select paid + payment success)
trialing → trial_expired (14 days pass)
trialing → active (upgrade during trial + payment success)
trial_expired → active (select paid + payment success)
active → expired (payment fails - future)
active → cancelled (user cancels - future)
```

**Indexes**:
```sql
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_plugandpay_order_id ON users(plugandpay_order_id);
CREATE INDEX idx_users_login_token ON users(login_token) WHERE login_token_used = FALSE;
CREATE INDEX idx_users_trial_end_date ON users(trial_end_date) WHERE subscription_status = 'trialing';
```

---

### 2. payment_configurations (NEW)

**Purpose**: Admin-configurable Plug&Pay checkout URLs per subscription plan

| Veld | Type | Constraints | Beschrijving |
|------|------|-------------|--------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `plan_id` | VARCHAR(50) | UNIQUE NOT NULL | Plan identifier ('monthly_7', 'yearly_70') |
| `plan_name` | VARCHAR(100) | NOT NULL | Human-readable plan naam |
| `checkout_url` | TEXT | NOT NULL | Volledige Plug&Pay checkout URL |
| `is_active` | BOOLEAN | DEFAULT TRUE | Om tijdelijk URLs te deactiveren |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Wanneer geconfigureerd |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Laatst aangepast |

**Validation Rules**:
- `checkout_url` MUST be valid HTTPS URL
- `checkout_url` MUST start with `https://`
- `plan_id` MUST match one of: `monthly_7`, `yearly_70` (NOT `trial_14_days`)
- `plan_name` MUST be non-empty string

**Initial Data**:
```sql
INSERT INTO payment_configurations (plan_id, plan_name, checkout_url, is_active) VALUES
  ('monthly_7', 'Maandelijks €7', '', FALSE),
  ('yearly_70', 'Jaarlijks €70', '', FALSE);
```

**Business Rules**:
- Trial plan (`trial_14_days`) does NOT have entry in this table (no payment needed)
- Admin MUST configure `checkout_url` before users can select paid plans
- If `checkout_url` is empty or `is_active` = FALSE, show error to user

**Indexes**:
```sql
CREATE INDEX idx_payment_configs_plan_id ON payment_configurations(plan_id);
CREATE INDEX idx_payment_configs_active ON payment_configurations(is_active);
```

---

### 3. payment_webhook_logs (NEW)

**Purpose**: Audit trail en debugging voor alle Plug&Pay webhook events

| Veld | Type | Constraints | Beschrijving |
|------|------|-------------|--------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `user_id` | INTEGER | FOREIGN KEY users(id), NULL | Welke gebruiker (NULL if email lookup fails) |
| `event_type` | VARCHAR(100) | NULL | Plug&Pay event type ('order_payment_completed', etc.) |
| `order_id` | VARCHAR(255) | NULL | Plug&Pay order ID |
| `email` | VARCHAR(255) | NULL | Email uit webhook payload |
| `amount_cents` | INTEGER | NULL | Betaald bedrag in cents |
| `payload` | JSONB | NULL | Volledige webhook payload voor debugging |
| `signature_valid` | BOOLEAN | NULL | Was API key valid? |
| `processed_at` | TIMESTAMP | DEFAULT NOW() | Wanneer webhook ontvangen |
| `error_message` | TEXT | NULL | Error message indien processing failed |
| `ip_address` | VARCHAR(45) | NULL | IP address van webhook sender (for security) |

**Validation Rules**:
- Every webhook MUST create a log entry (even failures)
- `payload` MUST contain complete Plug&Pay data
- `signature_valid` = FALSE MUST set `error_message`

**Retention Policy**:
- Keep logs for minimum 90 days
- Archive older logs to S3/external storage (future)

**Indexes**:
```sql
CREATE INDEX idx_webhook_logs_user_id ON payment_webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_order_id ON payment_webhook_logs(order_id);
CREATE INDEX idx_webhook_logs_processed_at ON payment_webhook_logs(processed_at);
CREATE INDEX idx_webhook_logs_event_type ON payment_webhook_logs(event_type);
```

---

## Database Migrations

### Migration 011-001: Extend users table

```sql
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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_plugandpay_order_id ON users(plugandpay_order_id);
CREATE INDEX IF NOT EXISTS idx_users_login_token ON users(login_token) WHERE login_token_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_trial_end_date ON users(trial_end_date) WHERE subscription_status = 'trialing';

-- Add constraint for trial dates
ALTER TABLE users ADD CONSTRAINT chk_trial_dates
  CHECK (trial_end_date IS NULL OR trial_start_date IS NULL OR trial_end_date >= trial_start_date);
```

### Migration 011-002: Create payment_configurations table

```sql
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
```

### Migration 011-003: Create payment_webhook_logs table

```sql
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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON payment_webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON payment_webhook_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON payment_webhook_logs(processed_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON payment_webhook_logs(event_type);
```

---

## Data Access Patterns

### 1. User Login Check
```sql
-- Check subscription status and trial expiry
SELECT
  id, email, subscription_status, trial_end_date,
  CASE
    WHEN subscription_status = 'trialing' AND trial_end_date < NOW() THEN TRUE
    ELSE FALSE
  END as trial_has_expired
FROM users
WHERE email = $1;
```

### 2. Get Checkout URL for Plan
```sql
-- Get checkout URL for selected plan
SELECT checkout_url, is_active
FROM payment_configurations
WHERE plan_id = $1 AND is_active = TRUE;
```

### 3. Process Webhook (Idempotency Check)
```sql
-- Check if order already processed
SELECT id, subscription_status
FROM users
WHERE plugandpay_order_id = $1;

-- If not found, update user
UPDATE users
SET
  subscription_status = 'active',
  payment_confirmed_at = NOW(),
  plugandpay_order_id = $1,
  amount_paid_cents = $2,
  login_token = $3,
  login_token_expires = NOW() + INTERVAL '10 minutes',
  login_token_used = FALSE
WHERE email = $4;
```

### 4. Auto-Login Token Validation
```sql
-- Validate and use login token
SELECT id, email, login_token_used, login_token_expires
FROM users
WHERE login_token = $1
  AND login_token_used = FALSE
  AND login_token_expires > NOW();

-- Mark token as used
UPDATE users
SET login_token_used = TRUE
WHERE id = $1;
```

### 5. Trial Expiry Check (Daily Cron)
```sql
-- Find expired trials
UPDATE users
SET subscription_status = 'trial_expired'
WHERE subscription_status = 'trialing'
  AND trial_end_date < NOW();
```

---

## Summary

**Database Changes**:
- ✅ Extended `users` table with 9 new fields
- ✅ Created `payment_configurations` table (2 initial rows)
- ✅ Created `payment_webhook_logs` table for audit trail
- ✅ Added 10 indexes for query performance
- ✅ Added constraints for data integrity

**Key Design Decisions**:
- Minimal schema changes (extend existing users table)
- Separate configuration table for admin flexibility
- Comprehensive webhook logging for debugging
- Idempotency via unique `plugandpay_order_id`
- Auto-login security via token expiry and single-use flag

**Status**: Ready for contract generation (Phase 1)
