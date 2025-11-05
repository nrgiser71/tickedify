# Data Model: Subscription Management

**Feature**: 057-dan-gaan-we
**Date**: 2025-11-05

## Overview
This data model extends the existing Tickedify database schema to support subscription management with Plug&Pay integration. The design follows a minimal-local-storage approach where Plug&Pay is the source of truth for billing, and local database stores denormalized metadata for fast UI rendering.

## Database Changes

### 1. Users Table Extensions
Extend existing `users` table with subscription-related columns:

```sql
-- Migration: Add subscription columns to users table
ALTER TABLE users
  ADD COLUMN plugpay_subscription_id VARCHAR(255),
  ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'trial',
  ADD COLUMN subscription_plan VARCHAR(50),
  ADD COLUMN subscription_renewal_date TIMESTAMP,
  ADD COLUMN subscription_price DECIMAL(10,2),
  ADD COLUMN subscription_cycle VARCHAR(20),
  ADD COLUMN trial_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT NOW();

-- Add index for subscription lookups
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_plugpay_subscription_id ON users(plugpay_subscription_id);
```

**Field Definitions**:
- `plugpay_subscription_id`: Plug&Pay's subscription identifier (nullable until user subscribes)
- `subscription_status`: Current status enum
  - `'trial'` - In 14-day free trial period
  - `'active'` - Active paid subscription
  - `'canceled'` - Canceled but still in grace period
  - `'expired'` - Trial or subscription ended, no access
- `subscription_plan`: Plan identifier ('basic', 'pro', 'enterprise')
- `subscription_renewal_date`: Next billing date (NULL for expired/trial)
- `subscription_price`: Current plan price (monthly equivalent)
- `subscription_cycle`: Billing frequency ('monthly', 'yearly')
- `trial_end_date`: When trial period expires (set at registration)
- `subscription_updated_at`: Last sync timestamp (for cache freshness)

**State Transitions**:
```
[registration] → trial → active → canceled → expired
                   ↓         ↑
                   └─────────┘ (reactivation during grace period)
                   ↓
                 expired (if trial expires without subscription)
```

### 2. Subscription Plans Table (New)
Define available subscription tiers and pricing:

```sql
CREATE TABLE subscription_plans (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(50) UNIQUE NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  features JSONB,
  tier_level INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for tier comparison (upgrade/downgrade logic)
CREATE INDEX idx_subscription_plans_tier_level ON subscription_plans(tier_level);
CREATE INDEX idx_subscription_plans_plan_id ON subscription_plans(plan_id);

-- Seed data
INSERT INTO subscription_plans (plan_id, plan_name, price_monthly, price_yearly, tier_level, features) VALUES
('basic', 'Basic Plan', 4.99, 49.99, 1, '["Unlimited tasks", "Email import", "Daily planning"]'::jsonb),
('pro', 'Pro Plan', 9.99, 99.99, 2, '["Everything in Basic", "Recurring tasks", "Priority support", "Advanced analytics"]'::jsonb),
('enterprise', 'Enterprise Plan', 29.99, 299.99, 3, '["Everything in Pro", "Team collaboration", "API access", "Custom integrations"]'::jsonb);
```

**Field Definitions**:
- `plan_id`: Internal identifier used in code and API
- `plan_name`: Display name for UI
- `price_monthly`: Monthly subscription price (EUR)
- `price_yearly`: Annual subscription price (EUR)
- `features`: JSON array of feature descriptions for UI display
- `tier_level`: Numeric level for upgrade/downgrade logic (1=basic, 2=pro, 3=enterprise)
- `is_active`: Flag to disable plans without deleting (e.g., legacy plans)

**Business Rules**:
- Upgrade: new_tier_level > current_tier_level
- Downgrade: new_tier_level < current_tier_level
- Plans can be added dynamically without code changes

### 3. Webhook Events Table (New)
Track processed Plug&Pay webhook events for idempotency:

```sql
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  subscription_id VARCHAR(255),
  payload JSONB,
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for idempotency checks (fast duplicate detection)
CREATE UNIQUE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_subscription_id ON webhook_events(subscription_id);
```

**Field Definitions**:
- `event_id`: Plug&Pay's unique event identifier
- `event_type`: Event name ('subscription.created', 'subscription.updated', 'subscription.canceled')
- `subscription_id`: Plug&Pay subscription ID (for filtering)
- `payload`: Full webhook payload (for debugging and audit)
- `processed_at`: When event was successfully processed

**Purpose**:
- Prevent duplicate webhook processing
- Audit trail for subscription changes
- Debugging tool for webhook issues

### 4. Subscription Change Requests Table (New)
Track pending plan changes (scheduled downgrades):

```sql
CREATE TABLE subscription_change_requests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_plan VARCHAR(50) NOT NULL,
  new_plan VARCHAR(50) NOT NULL,
  change_type VARCHAR(20) NOT NULL,  -- 'upgrade', 'downgrade', 'cancel'
  effective_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'completed', 'failed', 'canceled'
  plugpay_change_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_change_requests_user_id ON subscription_change_requests(user_id);
CREATE INDEX idx_subscription_change_requests_effective_date ON subscription_change_requests(effective_date);
CREATE INDEX idx_subscription_change_requests_status ON subscription_change_requests(status);
```

**Field Definitions**:
- `user_id`: Reference to users table
- `current_plan`: Plan at time of request
- `new_plan`: Target plan after change
- `change_type`: Type of change for UI display
- `effective_date`: When change will take effect (immediate for upgrades, next_renewal for downgrades)
- `status`: Processing status
- `plugpay_change_id`: Plug&Pay's scheduled change identifier

**Use Cases**:
- Display "Your plan will change to Basic on March 15" messages
- Cancel scheduled downgrades if user changes mind
- Handle failed plan changes (payment failures)

## Entity Relationships

```
users (1) ──────────── (0..1) plugpay_subscription
  │                              (external, not stored)
  │
  ├── (0..N) subscription_change_requests
  │
  └── (1) ← references ─ (1) subscription_plans
                              (via subscription_plan field)

webhook_events (N) ──references──→ (1) plugpay_subscription_id
                                       (denormalized, not FK)
```

## Data Flow Diagrams

### User Subscribes (Trial → Active)
```
1. User clicks "Upgrade Now" in Settings
2. Frontend: POST /api/subscription/checkout
3. Backend: Create Plug&Pay checkout session → return checkout_url
4. User completes payment on Plug&Pay
5. Plug&Pay: POST /api/webhooks/plugpay (subscription.created)
6. Backend:
   - Validate webhook signature
   - Check idempotency (webhook_events.event_id)
   - Update users: subscription_status='active', plugpay_subscription_id, etc.
   - Insert webhook_events record
7. User sees updated subscription in Settings (next page load)
```

### User Upgrades Plan (Immediate)
```
1. User clicks "Upgrade Plan" → selects Pro → confirms
2. Frontend: POST /api/subscription/upgrade {plan: 'pro'}
3. Backend:
   - Call Plug&Pay API: POST /subscriptions/{id}/change-plan {prorate: true}
   - Update users: subscription_plan='pro', subscription_price=9.99
4. Plug&Pay: POST /api/webhooks/plugpay (subscription.updated)
5. Backend: Verify local data matches webhook (idempotent update)
6. Frontend: Toast "Upgraded to Pro Plan successfully!"
```

### User Downgrades Plan (Scheduled)
```
1. User clicks "Downgrade Plan" → selects Basic → confirms
2. Frontend: POST /api/subscription/downgrade {plan: 'basic'}
3. Backend:
   - Call Plug&Pay API: POST /subscriptions/{id}/schedule-change {effective_date: next_renewal}
   - Insert subscription_change_requests: current_plan='pro', new_plan='basic', effective_date=renewal_date
   - Keep users.subscription_plan='pro' (unchanged until effective_date)
4. Frontend: Display "Your plan will change to Basic on March 15, 2025"
5. On renewal date:
   - Plug&Pay: POST /api/webhooks/plugpay (subscription.updated)
   - Backend: Update users.subscription_plan='basic', subscription_price=4.99
   - Backend: Update subscription_change_requests.status='completed'
```

### User Cancels Subscription
```
1. User clicks "Cancel Subscription" → confirms
2. Frontend: POST /api/subscription/cancel
3. Backend:
   - Call Plug&Pay API: POST /subscriptions/{id}/cancel {at_period_end: true}
   - Update users: subscription_status='canceled'
4. Frontend: Display "Pro Plan - Cancels on March 15, 2025"
5. Frontend: Show "Reactivate Subscription" button
6. On period end:
   - Plug&Pay: POST /api/webhooks/plugpay (subscription.expired)
   - Backend: Update users: subscription_status='expired', subscription_plan=NULL
```

### User Reactivates Subscription
```
1. User clicks "Reactivate Subscription" (within grace period)
2. Frontend: POST /api/subscription/reactivate
3. Backend:
   - Call Plug&Pay API: POST /subscriptions/{id}/reactivate
   - Update users: subscription_status='active'
4. Plug&Pay: POST /api/webhooks/plugpay (subscription.updated)
5. Frontend: Display "Pro Plan - Renews on March 15, 2025"
```

## Validation Rules

### User Subscription Fields
- `subscription_status`: ENUM check ('trial', 'active', 'canceled', 'expired')
- `subscription_plan`: Must exist in subscription_plans.plan_id OR be NULL
- `subscription_renewal_date`: Cannot be in past for 'active' status
- `subscription_price`: Must be positive OR NULL
- `trial_end_date`: Set on registration, never NULL for new users

### Subscription Plans
- `tier_level`: Must be unique (no duplicate tier levels)
- `price_monthly` and `price_yearly`: Must be > 0
- `plan_id`: Immutable after creation (use is_active to deprecate)

### Webhook Events
- `event_id`: Must be unique (enforced by DB constraint)
- `payload`: Must be valid JSON

### Subscription Change Requests
- `effective_date`: Cannot be in past at creation
- `current_plan` and `new_plan`: Must exist in subscription_plans.plan_id
- `change_type`: ENUM check ('upgrade', 'downgrade', 'cancel')

## Migration Strategy

### Migration File: `20251105_add_subscription_management.sql`

```sql
-- Step 1: Add columns to users table
ALTER TABLE users
  ADD COLUMN plugpay_subscription_id VARCHAR(255),
  ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'trial',
  ADD COLUMN subscription_plan VARCHAR(50),
  ADD COLUMN subscription_renewal_date TIMESTAMP,
  ADD COLUMN subscription_price DECIMAL(10,2),
  ADD COLUMN subscription_cycle VARCHAR(20),
  ADD COLUMN trial_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT NOW();

-- Step 2: Create subscription_plans table
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

-- Step 3: Create webhook_events table
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  subscription_id VARCHAR(255),
  payload JSONB,
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Create subscription_change_requests table
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

-- Step 5: Create indexes
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_plugpay_subscription_id ON users(plugpay_subscription_id);
CREATE INDEX idx_subscription_plans_tier_level ON subscription_plans(tier_level);
CREATE INDEX idx_subscription_plans_plan_id ON subscription_plans(plan_id);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_subscription_id ON webhook_events(subscription_id);
CREATE INDEX idx_subscription_change_requests_user_id ON subscription_change_requests(user_id);
CREATE INDEX idx_subscription_change_requests_effective_date ON subscription_change_requests(effective_date);
CREATE INDEX idx_subscription_change_requests_status ON subscription_change_requests(status);

-- Step 6: Seed subscription plans
INSERT INTO subscription_plans (plan_id, plan_name, price_monthly, price_yearly, tier_level, features) VALUES
('basic', 'Basic Plan', 4.99, 49.99, 1, '["Unlimited tasks", "Email import", "Daily planning"]'::jsonb),
('pro', 'Pro Plan', 9.99, 99.99, 2, '["Everything in Basic", "Recurring tasks", "Priority support", "Advanced analytics"]'::jsonb),
('enterprise', 'Enterprise Plan', 29.99, 299.99, 3, '["Everything in Pro", "Team collaboration", "API access", "Custom integrations"]'::jsonb);

-- Step 7: Backfill existing users (set trial_end_date for all users without it)
UPDATE users SET trial_end_date = created_at + INTERVAL '14 days' WHERE trial_end_date IS NULL;

-- Step 8: Update trial status for expired trials
UPDATE users SET subscription_status = 'expired' WHERE trial_end_date < NOW() AND subscription_status = 'trial';
```

### Rollback Plan
```sql
-- Rollback (if needed)
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
```

## Performance Considerations

### Query Optimization
- **Settings Screen Load**: Single query to fetch user + plan details
  ```sql
  SELECT u.*, p.plan_name, p.features, p.tier_level
  FROM users u
  LEFT JOIN subscription_plans p ON u.subscription_plan = p.plan_id
  WHERE u.id = $1;
  ```
  - Cost: Single indexed lookup on users.id (primary key)
  - Expected: <10ms

- **Plan Comparison Modal**: Single query to fetch all active plans
  ```sql
  SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY tier_level;
  ```
  - Cost: Sequential scan (small table <10 rows)
  - Expected: <5ms

- **Webhook Idempotency Check**: Indexed lookup
  ```sql
  SELECT id FROM webhook_events WHERE event_id = $1;
  ```
  - Cost: Unique index scan
  - Expected: <5ms

### Caching Strategy
- **Plan definitions**: Cache in memory (rarely change, <10 rows)
- **User subscription**: Cache with 5-minute TTL (webhook updates invalidate)
- **Plug&Pay API responses**: No caching (always fresh for billing operations)

### Scale Estimates
- **Database size**: ~100 bytes per user + 500 bytes per plan + 2KB per webhook event
- **500 users**: ~50KB (users) + 5KB (plans) + 100KB (webhooks/month) = ~155KB/month
- **Query load**: ~2 queries per Settings page view + 1 query per webhook = <10 QPS at 500 users

## Security Considerations

### Data Protection
- `plugpay_subscription_id`: Index for fast lookup, but not exposed in frontend API responses
- `webhook_events.payload`: Contains full webhook data - restrict access to admin only
- Subscription prices: Public data (visible in pricing page)

### Access Control
- Users can only view/modify their own subscription
- Webhook endpoint validates HMAC signature (shared secret)
- Admin endpoints (if any) require elevated permissions

### Audit Trail
- `webhook_events`: Complete audit log of external subscription changes
- `subscription_change_requests`: Track all user-initiated changes
- `subscription_updated_at`: Timestamp for cache invalidation and debugging

## Testing Strategy

### Unit Tests
- Subscription status state machine transitions
- Tier level comparison logic (upgrade vs downgrade)
- Webhook idempotency (duplicate event_id handling)

### Integration Tests
- Full subscription lifecycle (trial → active → canceled → expired)
- Upgrade flow (immediate billing)
- Downgrade flow (scheduled change)
- Reactivation within grace period

### Contract Tests
- Plug&Pay API request/response schemas
- Webhook payload validation
- Database schema constraints

## Summary

**Tables Added**: 3 (subscription_plans, webhook_events, subscription_change_requests)
**Columns Added**: 8 (to users table)
**Indexes Added**: 11 (for performance)
**Migration Complexity**: Medium (additive only, no data loss risk)
**External Dependencies**: Plug&Pay API, webhook endpoint

This data model supports the complete subscription management feature with minimal local storage, webhook-driven synchronization, and graceful handling of plan changes and cancellations.
