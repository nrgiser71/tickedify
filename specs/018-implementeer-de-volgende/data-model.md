# Data Model: Admin Dashboard v2

**Feature**: Admin Dashboard v2
**Date**: 2025-10-18
**Status**: Complete

## Overview

This document describes the data model for the Admin Dashboard v2 feature. The dashboard leverages existing Tickedify database tables and adds no new tables. All data is read from or modified in existing tables.

## Existing Database Schema

### Users Table
Primary entity for user management features.

```sql
TABLE users (
  id                      SERIAL PRIMARY KEY,
  email                   VARCHAR(255) UNIQUE NOT NULL,
  naam                    VARCHAR(255),
  wachtwoord_hash         TEXT NOT NULL,
  account_type            VARCHAR(50) DEFAULT 'normaal',  -- 'normaal' or 'admin'
  actief                  BOOLEAN DEFAULT true,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subscription_status     VARCHAR(50) DEFAULT 'trial',     -- 'trial', 'active', 'cancelled', 'expired'
  subscription_tier       VARCHAR(50) DEFAULT 'free',      -- 'free', 'premium', 'enterprise'
  trial_end_date          DATE,
  last_login              TIMESTAMP,
  onboarding_video_seen   BOOLEAN DEFAULT false,
  onboarding_video_seen_at TIMESTAMP
)
```

**Indexes**:
- PRIMARY KEY on id
- UNIQUE on email
- Recommended: INDEX on created_at (for registration statistics)
- Recommended: INDEX on subscription_tier (for tier distribution)
- Recommended: INDEX on last_login (for activity tracking)

**Usage in Dashboard**:
- User Management: Search, view details, edit subscription_tier, trial_end_date, actief
- Statistics: Count users, active users, registrations, subscription distribution
- Security: Password reset (update wachtwoord_hash), account blocking (update actief)

### Tasks Table
Used for task statistics.

```sql
TABLE taken (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
  titel              TEXT NOT NULL,
  voltooid           BOOLEAN DEFAULT false,
  voltooid_op        TIMESTAMP,
  aangemaakt_op      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  project            VARCHAR(255),
  context            VARCHAR(255),
  prioriteit         VARCHAR(50),
  geblokkeerd        BOOLEAN DEFAULT false,
  herhaling_type     VARCHAR(50),
  herhaling_actief   BOOLEAN DEFAULT false
)
```

**Indexes**:
- PRIMARY KEY on id
- FOREIGN KEY on user_id → users(id)
- Recommended: INDEX on aangemaakt_op (for creation statistics)
- Recommended: INDEX on voltooid (for completion rate)

**Usage in Dashboard**:
- Task Statistics: Total tasks, completion rate, tasks created today/week/month
- User Data Inspector: Show user's task counts and breakdown

### Email Imports Table
Used for email import statistics.

```sql
TABLE email_imports (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
  from_email         VARCHAR(255),
  subject            TEXT,
  body               TEXT,
  imported_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  task_id            INTEGER REFERENCES taken(id) ON DELETE SET NULL,
  processed          BOOLEAN DEFAULT false
)
```

**Indexes**:
- PRIMARY KEY on id
- FOREIGN KEY on user_id → users(id)
- FOREIGN KEY on task_id → taken(id)
- Recommended: INDEX on imported_at (for import statistics)

**Usage in Dashboard**:
- Email Statistics: Total imports, recent imports, users with email import
- User Data Inspector: Show user's email import history

### System Settings Table
Used for system configuration.

```sql
TABLE system_settings (
  key                VARCHAR(255) PRIMARY KEY,
  value              TEXT,
  description        TEXT,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Indexes**:
- PRIMARY KEY on key

**Usage in Dashboard**:
- System Settings: View and edit onboarding_video_url setting
- Future: Other global configuration settings

### Payment Configurations Table
Used for payment management.

```sql
TABLE payment_configurations (
  id                 SERIAL PRIMARY KEY,
  plan_id            VARCHAR(100) UNIQUE NOT NULL,
  plan_name          VARCHAR(255) NOT NULL,
  tier               VARCHAR(50) NOT NULL,          -- 'free', 'premium', 'enterprise'
  checkout_url       TEXT NOT NULL,
  price_monthly      DECIMAL(10,2),
  price_yearly       DECIMAL(10,2),
  features           JSONB,
  is_active          BOOLEAN DEFAULT true,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Indexes**:
- PRIMARY KEY on id
- UNIQUE on plan_id

**Usage in Dashboard**:
- Payment Management: View payment configs, edit checkout_url
- Revenue Statistics: Calculate MRR based on subscription_tier counts × price_monthly

### Sessions Table
Used for session management (connect-pg-simple).

```sql
TABLE session (
  sid                VARCHAR PRIMARY KEY,
  sess               JSON NOT NULL,
  expire             TIMESTAMP(6) NOT NULL
)
```

**Indexes**:
- PRIMARY KEY on sid
- INDEX on expire (for session cleanup)

**Usage in Dashboard**:
- Security: Force logout (delete sessions WHERE sess->>'passport'->>'user' = user_id)

### Database Metadata
PostgreSQL system tables for database statistics.

```sql
-- pg_database: Database size
SELECT pg_database_size(current_database())

-- pg_class: Table sizes and row counts
SELECT
  relname as table_name,
  pg_total_relation_size(oid) as total_size,
  n_live_tup as row_count
FROM pg_class
WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
```

**Usage in Dashboard**:
- Database Monitor: Database size, table sizes, row counts

## Data Relationships

```
users (1) ──< (many) taken
  │
  ├──< (many) email_imports
  │
  └──< (many) session (via sess JSON)

payment_configurations (1) ──< (many) users (via subscription_tier reference)

system_settings (standalone configuration)
```

## Data Validation Rules

### User Management
- **Email**: Must be valid email format, unique across users table
- **Subscription Tier**: Must be one of ['free', 'premium', 'enterprise']
- **Trial End Date**: Must be future date (validation: trial_end_date >= CURRENT_DATE)
- **Account Type**: Must be one of ['normaal', 'admin']
- **Actief**: Boolean (true/false)

### System Settings
- **Onboarding Video URL**: Must be valid URL format, prefer YouTube/Vimeo
- **Key**: Alphanumeric + underscores only

### Payment Configurations
- **Checkout URL**: Must be valid HTTPS URL, must contain 'mollie.com' domain
- **Tier**: Must match one of users.subscription_tier values
- **Plan ID**: Unique, alphanumeric + hyphens/underscores

### Security Constraints
- **Admin Deletion**: Cannot delete last admin user (WHERE account_type = 'admin')
- **Self Deletion**: Admin cannot delete own account (user_id != session.user_id)
- **Trial Date**: Cannot set trial_end_date to past date

## Statistics Calculations

### User Statistics
```sql
-- Total users
SELECT COUNT(*) FROM users;

-- Active users (last 7 days)
SELECT COUNT(*) FROM users WHERE last_login >= NOW() - INTERVAL '7 days';

-- Active users (last 30 days)
SELECT COUNT(*) FROM users WHERE last_login >= NOW() - INTERVAL '30 days';

-- New registrations (today)
SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE;

-- New registrations (this week)
SELECT COUNT(*) FROM users
WHERE created_at >= DATE_TRUNC('week', NOW());

-- New registrations (this month)
SELECT COUNT(*) FROM users
WHERE created_at >= DATE_TRUNC('month', NOW());

-- Subscription tier distribution
SELECT subscription_tier, COUNT(*) as count
FROM users
GROUP BY subscription_tier;

-- Trial conversion rate
SELECT
  (COUNT(*) FILTER (WHERE subscription_status = 'active') * 100.0 /
   COUNT(*) FILTER (WHERE subscription_status IN ('active', 'expired', 'cancelled')))::DECIMAL(5,2) as conversion_rate
FROM users
WHERE trial_end_date IS NOT NULL;

-- Active trials
SELECT COUNT(*) FROM users
WHERE subscription_status = 'trial' AND trial_end_date >= CURRENT_DATE;

-- User growth (by day, last 30 days)
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_users
FROM users
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Recent registrations (last 10)
SELECT id, email, naam, created_at, subscription_tier
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Inactive users (>30 days)
SELECT COUNT(*) FROM users
WHERE last_login < NOW() - INTERVAL '30 days' OR last_login IS NULL;

-- Inactive users (>60 days)
SELECT COUNT(*) FROM users
WHERE last_login < NOW() - INTERVAL '60 days' OR last_login IS NULL;

-- Inactive users (>90 days)
SELECT COUNT(*) FROM users
WHERE last_login < NOW() - INTERVAL '90 days' OR last_login IS NULL;
```

### Task Statistics
```sql
-- Total tasks
SELECT COUNT(*) FROM taken;

-- Task completion rate
SELECT
  (COUNT(*) FILTER (WHERE voltooid = true) * 100.0 / COUNT(*))::DECIMAL(5,2) as completion_rate
FROM taken;

-- Tasks created today
SELECT COUNT(*) FROM taken WHERE DATE(aangemaakt_op) = CURRENT_DATE;

-- Tasks created this week
SELECT COUNT(*) FROM taken WHERE aangemaakt_op >= DATE_TRUNC('week', NOW());

-- Tasks created this month
SELECT COUNT(*) FROM taken WHERE aangemaakt_op >= DATE_TRUNC('month', NOW());
```

### Email Statistics
```sql
-- Total emails imported
SELECT COUNT(*) FROM email_imports;

-- Emails imported today
SELECT COUNT(*) FROM email_imports WHERE DATE(imported_at) = CURRENT_DATE;

-- Emails imported this week
SELECT COUNT(*) FROM email_imports WHERE imported_at >= DATE_TRUNC('week', NOW());

-- Emails imported this month
SELECT COUNT(*) FROM email_imports WHERE imported_at >= DATE_TRUNC('month', NOW());

-- Users with email import
SELECT COUNT(DISTINCT user_id) FROM email_imports;

-- Percentage of users with email import
SELECT
  (COUNT(DISTINCT email_imports.user_id) * 100.0 / COUNT(DISTINCT users.id))::DECIMAL(5,2) as percentage
FROM users
LEFT JOIN email_imports ON users.id = email_imports.user_id;
```

### Database Statistics
```sql
-- Database size
SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Table sizes
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(oid)) as total_size,
  n_live_tup as row_count
FROM pg_class
WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY pg_total_relation_size(oid) DESC;

-- Database growth rate (estimate based on table sizes over time)
-- Requires periodic sampling - not implemented in v1
```

### Revenue Statistics
```sql
-- Monthly Recurring Revenue (MRR)
SELECT
  SUM(CASE
    WHEN u.subscription_tier = 'free' THEN 0
    WHEN u.subscription_tier = 'premium' THEN pc_premium.price_monthly
    WHEN u.subscription_tier = 'enterprise' THEN pc_enterprise.price_monthly
  END) as mrr
FROM users u
LEFT JOIN payment_configurations pc_premium ON pc_premium.tier = 'premium' AND pc_premium.is_active = true
LEFT JOIN payment_configurations pc_enterprise ON pc_enterprise.tier = 'enterprise' AND pc_enterprise.is_active = true
WHERE u.subscription_status = 'active';

-- Revenue per tier
SELECT
  u.subscription_tier,
  COUNT(*) as user_count,
  SUM(pc.price_monthly) as revenue
FROM users u
LEFT JOIN payment_configurations pc ON pc.tier = u.subscription_tier AND pc.is_active = true
WHERE u.subscription_status = 'active'
GROUP BY u.subscription_tier;
```

## User Data Inspector Query
Comprehensive view of single user's data:

```sql
-- User details
SELECT * FROM users WHERE id = $1;

-- Task summary
SELECT
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE voltooid = true) as completed_tasks,
  COUNT(*) FILTER (WHERE voltooid = false) as active_tasks,
  COUNT(*) FILTER (WHERE herhaling_actief = true) as recurring_tasks,
  COUNT(*) FILTER (WHERE geblokkeerd = true) as blocked_tasks
FROM taken
WHERE user_id = $1;

-- Tasks by project
SELECT project, COUNT(*) as count
FROM taken
WHERE user_id = $1 AND project IS NOT NULL
GROUP BY project
ORDER BY count DESC
LIMIT 10;

-- Tasks by context
SELECT context, COUNT(*) as count
FROM taken
WHERE user_id = $1 AND context IS NOT NULL
GROUP BY context
ORDER BY count DESC
LIMIT 10;

-- Email import summary
SELECT
  COUNT(*) as total_imports,
  COUNT(*) FILTER (WHERE processed = true) as processed_imports,
  MIN(imported_at) as first_import,
  MAX(imported_at) as last_import
FROM email_imports
WHERE user_id = $1;

-- Recent email imports
SELECT from_email, subject, imported_at
FROM email_imports
WHERE user_id = $1
ORDER BY imported_at DESC
LIMIT 10;

-- Subscription details
SELECT
  u.subscription_status,
  u.subscription_tier,
  u.trial_end_date,
  pc.plan_name,
  pc.price_monthly,
  pc.features
FROM users u
LEFT JOIN payment_configurations pc ON pc.tier = u.subscription_tier AND pc.is_active = true
WHERE u.id = $1;
```

## State Transitions

### User Account States
```
[New User]
  → subscription_status = 'trial'
  → trial_end_date = NOW() + INTERVAL '14 days'
  → actief = true

[Trial Active]
  → (on payment) → subscription_status = 'active', trial_end_date = NULL
  → (on expiry) → subscription_status = 'expired'

[Active Subscription]
  → (on cancel) → subscription_status = 'cancelled'
  → (on tier change) → subscription_tier updated, logged

[Blocked Account]
  → actief = false
  → All sessions deleted
  → (on unblock) → actief = true
```

### Admin Actions State Changes
```
[User Search]
  → No state change, read-only query

[View User Details]
  → No state change, read-only query

[Change Subscription Tier]
  → users.subscription_tier updated
  → Audit log created

[Extend Trial]
  → users.trial_end_date updated
  → Audit log created

[Block Account]
  → users.actief = false
  → DELETE FROM session WHERE sess->>'passport'->>'user' = user_id
  → Audit log created

[Delete Account]
  → DELETE FROM users WHERE id = $1
  → Cascades to taken, email_imports (ON DELETE CASCADE)
  → Audit log created

[Reset Password]
  → users.wachtwoord_hash updated with bcrypt hash
  → Audit log created
  → (Optional) Send email with new password

[Force Logout]
  → DELETE FROM session WHERE sess->>'passport'->>'user' = user_id
  → Audit log created
```

## Performance Optimization

### Recommended Indexes
```sql
-- User statistics performance
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_account_type ON users(account_type);

-- Task statistics performance
CREATE INDEX idx_taken_aangemaakt_op ON taken(aangemaakt_op);
CREATE INDEX idx_taken_voltooid ON taken(voltooid);
CREATE INDEX idx_taken_user_id_voltooid ON taken(user_id, voltooid);

-- Email import statistics performance
CREATE INDEX idx_email_imports_imported_at ON email_imports(imported_at);
CREATE INDEX idx_email_imports_user_id ON email_imports(user_id);

-- User search performance
CREATE INDEX idx_users_email_gin ON users USING gin(email gin_trgm_ops);
CREATE INDEX idx_users_naam_gin ON users USING gin(naam gin_trgm_ops);
-- Note: Requires CREATE EXTENSION pg_trgm;
```

### Query Optimization Tips
- Use COUNT(*) FILTER for conditional counts (single table scan)
- Use DATE_TRUNC for time-based grouping (leverages indexes)
- Limit result sets to prevent UI overload (e.g., LIMIT 10, 50)
- Batch multiple statistics into single endpoint where possible
- Use EXPLAIN ANALYZE to verify index usage

## Audit Logging

For compliance and troubleshooting, log all admin actions:

```sql
-- Example audit log entry (if forensic_logs table exists)
INSERT INTO forensic_logs (
  user_id,           -- Admin who performed action
  action_type,       -- e.g., 'USER_TIER_CHANGE', 'USER_DELETE', 'PASSWORD_RESET'
  target_user_id,    -- User being affected
  old_value,         -- Previous value (JSON)
  new_value,         -- New value (JSON)
  ip_address,
  user_agent,
  timestamp
) VALUES (...)
```

If forensic_logs doesn't exist, log to console/server logs:
```javascript
console.log(`[AUDIT] Admin ${adminUserId} changed tier for user ${targetUserId}: ${oldTier} → ${newTier}`);
```

## Data Retention

- **User Data**: Retained indefinitely (or until user requests deletion)
- **Task Data**: Retained indefinitely
- **Email Imports**: Retained indefinitely
- **Sessions**: Auto-expired by connect-pg-simple based on expire timestamp
- **Audit Logs**: 90 days retention (if implemented)

## Privacy & Compliance

- **GDPR**: Users can request data deletion via admin (DELETE user cascade)
- **Data Access**: Only admin accounts can access dashboard
- **Sensitive Data**: Password hashes never exposed via API
- **PII**: Email and naam considered PII, access logged
