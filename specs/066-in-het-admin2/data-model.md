# Data Model: Revenue Dashboard Detail Views

**Feature**: 066-in-het-admin2
**Date**: 2025-11-14

## Overview

This feature extends the existing Admin2 Revenue Dashboard with detail views. It does NOT introduce new database tables or columns - all data is derived from the existing `users` table.

---

## Existing Entities (No Changes)

### User Entity
**Table**: `users`
**Usage**: Source of all revenue and subscription data

**Relevant Columns**:
```sql
id                      VARCHAR(50) PRIMARY KEY  -- User unique identifier
email                   VARCHAR(255) UNIQUE      -- User email address
naam                    VARCHAR(255)             -- User full name (nullable)
selected_plan           VARCHAR(50)              -- Subscription plan (free, monthly_7, yearly_80, etc.)
subscription_status     VARCHAR(50)              -- Status: trial, active, cancelled, expired
trial_end_date          TIMESTAMP                -- Trial expiry (NULL if not in trial)
created_at              TIMESTAMP                -- Account creation (subscription start proxy)
plugandpay_order_id     VARCHAR(255)             -- Plug&Pay order ID (nullable)
last_login              TIMESTAMP                -- Last activity timestamp
```

**Constraints**:
- `selected_plan` values: 'free', 'monthly_7', 'monthly_8', 'yearly_70', 'yearly_80'
- `subscription_status` values: 'trial', 'active', 'cancelled', 'expired'
- Free plan users: `selected_plan = 'free'` OR `selected_plan IS NULL`
- Active paid users: `subscription_status = 'active' AND selected_plan != 'free'`

---

## Derived Entities (Runtime Only)

These entities are computed at runtime from the `users` table and exist only in API responses and frontend state.

### ActiveSubscription
**Source**: Users table filtered by active paid subscriptions
**Scope**: Runtime only (API response)

**Properties**:
```typescript
{
  user_id: string              // users.id
  email: string                // users.email
  naam: string | null          // users.naam
  selected_plan: PlanType      // users.selected_plan
  monthly_amount: number       // Calculated: yearly plans / 12
  created_at: string (ISO)     // users.created_at (subscription start)
  plugandpay_order_id: string | null  // users.plugandpay_order_id
}
```

**Derivation Logic**:
```sql
SELECT
  id as user_id,
  email,
  naam,
  selected_plan,
  created_at,
  plugandpay_order_id,
  CASE
    WHEN selected_plan LIKE 'yearly%' THEN CAST(SUBSTRING(selected_plan, 8) AS DECIMAL) / 12
    WHEN selected_plan LIKE 'monthly%' THEN CAST(SUBSTRING(selected_plan, 9) AS DECIMAL)
    ELSE 0
  END as monthly_amount
FROM users
WHERE subscription_status = 'active'
  AND selected_plan IS NOT NULL
  AND selected_plan != 'free'
ORDER BY monthly_amount DESC, email ASC
```

**Validation Rules**:
- `email` must be valid email format (enforced by users table constraint)
- `selected_plan` must be one of: monthly_7, monthly_8, yearly_70, yearly_80
- `monthly_amount` must be positive number
- `created_at` must be past timestamp

---

### RevenueTierBreakdown
**Source**: Aggregation of users table grouped by plan
**Scope**: Runtime only (already exists in current API)

**Properties**:
```typescript
{
  tier: PlanType               // users.selected_plan
  user_count: number           // COUNT(*)
  price_monthly: number        // Hardcoded pricing lookup
  revenue: number              // user_count * price_monthly
}
```

**Derivation Logic**:
```sql
SELECT
  COALESCE(selected_plan, 'free') as tier,
  COUNT(*) as user_count
FROM users
WHERE subscription_status = 'active'
  AND COALESCE(selected_plan, 'free') != 'free'
GROUP BY COALESCE(selected_plan, 'free')
ORDER BY COALESCE(selected_plan, 'free')
```

**Post-processing** (server-side JavaScript):
```javascript
const pricing = {
  'monthly_7': 7.00,
  'yearly_70': 70.00,
  'monthly_8': 8.00,
  'yearly_80': 80.00
};

const tierRevenue = tier.user_count * (pricing[tier.tier] || 0);
```

---

### FreeTierStats
**Source**: Aggregated statistics from users table
**Scope**: Runtime only (API response)

**Properties**:
```typescript
{
  free_users: number                  // Total free users
  recent_signups_30d: number          // Free signups in last 30 days
  active_trials: number               // Users with trial_end_date > NOW()
  conversion_opportunities: number    // Free users with recent task activity
}
```

**Derivation Logic**:
```sql
-- Free users total
SELECT COUNT(*) FROM users WHERE selected_plan = 'free' OR selected_plan IS NULL;

-- Recent signups (30 days)
SELECT COUNT(*) FROM users
WHERE (selected_plan = 'free' OR selected_plan IS NULL)
  AND created_at > NOW() - INTERVAL '30 days';

-- Active trials
SELECT COUNT(*) FROM users
WHERE trial_end_date IS NOT NULL
  AND trial_end_date > NOW();

-- Conversion opportunities (requires join with tasks table)
SELECT COUNT(DISTINCT user_id) FROM tasks
WHERE user_id IN (SELECT id FROM users WHERE selected_plan = 'free')
  AND created_at > NOW() - INTERVAL '7 days';
```

---

## Data Flow

### MRR Card Click
```
User clicks "Monthly Recurring Revenue" card
  → No API call needed
  → Reuse existing /api/admin2/stats/revenue response
  → Extract `by_tier` array
  → Render table in modal
  → Show total MRR at bottom
```

### Active Subscriptions Card Click
```
User clicks "Active Subscriptions" card
  → Frontend: GET /api/admin2/revenue/active-subscriptions?sort=revenue
  → Backend: Query users table (active paid filter)
  → Calculate monthly_amount per user
  → Return ActiveSubscription[] array
  → Frontend: Render user list table in modal
  → Click user row → call existing Screens.showUserDetails(userId)
```

### Premium Revenue Card Click
```
User clicks "Premium Revenue" card
  → Frontend: GET /api/admin2/revenue/active-subscriptions?sort=revenue
  → Backend: Same as Active Subscriptions
  → Frontend: Filter client-side where plan IN ('monthly_7', 'monthly_8')
  → Render filtered user list in modal
```

### Enterprise Revenue Card Click
```
User clicks "Enterprise Revenue" card
  → Frontend: GET /api/admin2/revenue/active-subscriptions?sort=revenue
  → Backend: Same as Active Subscriptions
  → Frontend: Filter client-side where plan IN ('yearly_70', 'yearly_80')
  → Render filtered user list in modal
```

### Free Tier Card Click
```
User clicks "Free Tier Revenue" card
  → Frontend: GET /api/admin2/revenue/free-tier
  → Backend: Run aggregation queries on users + tasks tables
  → Return FreeTierStats object
  → Frontend: Render statistics in modal (no user list)
```

---

## Pricing Lookup Table (Runtime)

**Location**: server.js hardcoded object
**Status**: TODO migrate to `payment_configurations` table (existing TODO in codebase)

```javascript
const pricing = {
  'monthly_7': 7.00,
  'monthly_8': 8.00,
  'yearly_70': 70.00,
  'yearly_80': 80.00,
  'free': 0
};
```

**Monthly Normalization**:
- Monthly plans: Use price as-is
- Yearly plans: Divide by 12 for monthly equivalent
  - yearly_70: €70 / 12 = €5.83/month
  - yearly_80: €80 / 12 = €6.67/month

---

## State Management (Frontend)

### Modal State
**Scope**: Frontend JavaScript (admin2.html)
**Lifecycle**: Created on card click, destroyed on modal close

```javascript
const revenueDetailState = {
  currentCard: 'mrr' | 'active' | 'premium' | 'enterprise' | 'free',
  data: ActiveSubscription[] | RevenueTierBreakdown[] | FreeTierStats,
  loading: boolean,
  error: string | null,
  sortBy: 'revenue' | 'email' | 'date'
};
```

**No persistence**: Modal state is ephemeral, re-fetched on each open

---

## Data Validation

### ActiveSubscription Validation
- ✅ `email` must match regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- ✅ `selected_plan` must be non-empty and in allowed values
- ✅ `monthly_amount` must be positive: `> 0`
- ✅ `created_at` must be valid ISO 8601 timestamp
- ⚠️ `naam` can be NULL (fallback: show email in UI)
- ⚠️ `plugandpay_order_id` can be NULL (legacy/manual subscriptions)

### FreeTierStats Validation
- ✅ All counts must be non-negative integers: `>= 0`
- ✅ `recent_signups_30d` must be <= `free_users` (subset)
- ✅ `conversion_opportunities` can exceed `free_users` (multi-device users)

---

## Performance Considerations

### Query Performance
- **Active Subscriptions Query**: Expected <50ms for <100 users
  - Index needed: `(subscription_status, selected_plan)` composite index
  - Current scale: ~10-50 users
  - Acceptable without optimization

- **Free Tier Stats Query**: Multiple aggregations, expected <100ms
  - Simple COUNT queries on indexed columns
  - Acceptable for admin dashboard (not user-facing)

### Frontend Performance
- **Modal Render**: <16ms for 100 rows (60fps target)
  - Use `DocumentFragment` for batch DOM insertion
  - Scroll virtualization NOT needed (current scale)

### Caching Strategy
- ❌ No caching (admin dashboard needs real-time data)
- ✅ Re-fetch on every modal open (ensures fresh data)

---

## Security & Privacy

### Data Access Control
- ✅ All endpoints protected by `requireAdmin` middleware
- ✅ Admin session required (cookie-based auth)
- ✅ No user-specific PII exposed beyond admin context
- ✅ Email addresses visible to admins only

### Data Sensitivity
- **High Sensitivity**: Email addresses, subscription amounts
- **Medium Sensitivity**: User names, signup dates
- **Low Sensitivity**: Aggregated counts

---

## Future Enhancements (Out of Scope)

- [ ] Pagination for >100 user lists
- [ ] Export to CSV feature
- [ ] Inline filtering by plan type
- [ ] Historical revenue trend charts
- [ ] Churn analysis separate screen
- [ ] Migrate pricing to `payment_configurations` table

---

## Database Migration: NONE REQUIRED

This feature requires **zero database changes**:
- ✅ No new tables
- ✅ No new columns
- ✅ No index changes (existing indexes sufficient)
- ✅ All data derived from existing `users` table

**Migration Status**: N/A (no changes)
