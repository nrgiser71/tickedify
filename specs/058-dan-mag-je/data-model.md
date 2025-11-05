# Data Model: Account Settings Block

**Feature**: 058-dan-mag-je
**Date**: 2025-11-05
**Based on**: research.md decisions

## Entity Relationships

```
users (existing table, extended)
├── id (PK)
├── naam (existing)
├── email (existing)
├── wachtwoord (existing)
├── aangemaakt_op (existing)
├── last_login (NEW)
├── total_tasks_created (NEW)
└── total_tasks_completed (NEW)
     ↓ 1:N
password_reset_tokens (new table)
├── id (PK)
├── user_id (FK → users.id)
├── token_hash (UNIQUE)
├── expires_at
├── used_at
├── created_at
├── ip_address
└── user_agent
```

## Table: users (Extensions)

**Purpose**: Add fields to track user account metadata and statistics

### New Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| last_login | TIMESTAMP | NULL allowed | Last successful login timestamp, NULL for never logged in |
| total_tasks_created | INTEGER | DEFAULT 0, NOT NULL | Lifetime count of tasks created by user |
| total_tasks_completed | INTEGER | DEFAULT 0, NOT NULL | Lifetime count of tasks marked as completed |

### Migration Script

```sql
-- Migration: Add account metadata to users table
ALTER TABLE users
  ADD COLUMN last_login TIMESTAMP,
  ADD COLUMN total_tasks_created INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN total_tasks_completed INTEGER DEFAULT 0 NOT NULL;

-- Backfill total_tasks_created with existing data
UPDATE users u
SET total_tasks_created = (
  SELECT COUNT(*)
  FROM taken t
  WHERE t.eigenaar_id = u.id
);

-- Backfill total_tasks_completed with existing data
UPDATE users u
SET total_tasks_completed = (
  SELECT COUNT(*)
  FROM taken t
  WHERE t.eigenaar_id = u.id
    AND t.voltooid = TRUE
);

-- Note: last_login remains NULL for existing users until next login
```

### Validation Rules

- `total_tasks_created` >= 0 (non-negative)
- `total_tasks_completed` >= 0 (non-negative)
- `total_tasks_completed` <= `total_tasks_created` (logical consistency, not enforced by constraint)
- `last_login` <= NOW() if not NULL (can't be in the future)

### Update Triggers

**When to update**:
- `last_login`: On successful login (POST /api/auth/login, auto-login token validation)
- `total_tasks_created`: On task creation (POST /api/lijst/acties, email import, recurring task instantiation)
- `total_tasks_completed`: On task completion (PUT /api/taak/:id with voltooid = TRUE)

## Table: password_reset_tokens (New)

**Purpose**: Store password reset tokens with expiration and single-use enforcement

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment token identifier |
| user_id | INTEGER | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | User requesting password reset |
| token_hash | VARCHAR(64) | NOT NULL, UNIQUE | SHA-256 hash of reset token (64 hex chars) |
| expires_at | TIMESTAMP | NOT NULL | Token expiration timestamp (24 hours from creation) |
| used_at | TIMESTAMP | NULL allowed | Timestamp when token was used (NULL = unused) |
| created_at | TIMESTAMP | DEFAULT NOW(), NOT NULL | Token creation timestamp |
| ip_address | VARCHAR(45) | NULL allowed | IP address of reset request (audit trail, supports IPv6) |
| user_agent | TEXT | NULL allowed | Browser user agent string (audit trail) |

### Indexes

```sql
CREATE INDEX idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

CREATE INDEX idx_password_reset_tokens_token_hash
  ON password_reset_tokens(token_hash);
```

**Rationale**:
- `user_id` index: Lookup pending tokens for rate limiting
- `expires_at` index: Cleanup expired tokens efficiently
- `token_hash` index: Fast token validation on reset confirmation (UNIQUE constraint creates this automatically)

### Migration Script

```sql
-- Migration: Create password_reset_tokens table
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

-- No need for token_hash index - UNIQUE constraint creates it
```

### Validation Rules

- `token_hash` MUST be exactly 64 characters (SHA-256 hex output)
- `expires_at` MUST be > `created_at` (future expiration)
- `used_at` MUST be <= `expires_at` if not NULL (can't use expired token)
- `used_at` MUST be >= `created_at` if not NULL (logical timeline)

### State Transitions

**Token Lifecycle**:
```
1. CREATED → user_id set, token_hash set, expires_at = NOW() + 24 hours, used_at = NULL
2. VALID → expires_at > NOW() AND used_at IS NULL
3. USED → used_at set to NOW()
4. EXPIRED → expires_at <= NOW()
5. INVALID → used_at IS NOT NULL OR expires_at <= NOW()
```

**Business Rules**:
- Token can only transition from VALID to USED
- Once USED or EXPIRED, token cannot be reused
- User can have multiple CREATED tokens (for retry scenarios)
- Rate limiting enforces max 3 CREATED tokens per hour per user

## Data Integrity Constraints

### Foreign Key Constraints

```sql
-- password_reset_tokens.user_id → users.id
-- ON DELETE CASCADE: When user is deleted, all their reset tokens are deleted
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

### Check Constraints

```sql
-- Ensure non-negative task counts
ALTER TABLE users
  ADD CONSTRAINT chk_users_task_counts_nonnegative
  CHECK (total_tasks_created >= 0 AND total_tasks_completed >= 0);

-- Ensure token_hash is exactly 64 characters (SHA-256 hex)
ALTER TABLE password_reset_tokens
  ADD CONSTRAINT chk_password_reset_tokens_hash_length
  CHECK (LENGTH(token_hash) = 64);
```

## Performance Considerations

### Query Patterns

**Account Information Retrieval** (Settings page load):
```sql
SELECT
  id,
  naam,
  aangemaakt_op,
  last_login,
  total_tasks_created,
  total_tasks_completed
FROM users
WHERE id = $1;
```
- Index: PRIMARY KEY (id) - O(log n) lookup
- Expected execution time: <5ms

**Password Reset Request** (rate limiting check):
```sql
SELECT COUNT(*)
FROM password_reset_tokens
WHERE user_id = $1
  AND created_at > NOW() - INTERVAL '1 hour'
  AND used_at IS NULL;
```
- Index: idx_password_reset_tokens_user_id - O(log n) seek + O(k) scan (k = tokens in last hour)
- Expected execution time: <10ms (k typically 0-3)

**Token Validation** (reset confirmation):
```sql
SELECT user_id, expires_at, used_at
FROM password_reset_tokens
WHERE token_hash = $1;
```
- Index: UNIQUE constraint on token_hash - O(log n) lookup
- Expected execution time: <5ms

### Cleanup Strategy

**Optional Maintenance Query** (delete expired tokens):
```sql
DELETE FROM password_reset_tokens
WHERE expires_at < NOW() - INTERVAL '7 days';
```
- Run weekly via cron job or on-demand
- Index: idx_password_reset_tokens_expires_at - efficient scan
- Not critical for functionality (expired tokens are simply ignored)

## Security Considerations

### Token Storage

- **Never store plaintext tokens in database**
- Store SHA-256 hash: `crypto.createHash('sha256').update(token).digest('hex')`
- Send plaintext token only via email to user
- If database is compromised, attackers cannot use hashed tokens

### Rate Limiting

- Prevent email bombing: max 3 reset requests per hour
- Prevents account enumeration to some degree (error messages must be generic)
- Database query count, no external dependencies

### Audit Trail

- `ip_address` and `user_agent` provide forensics if account is compromised
- Can detect suspicious patterns (multiple requests from different IPs)
- Logs help support team investigate user complaints

## Testing Data

### Test User Account

```sql
-- Existing test user: jan@buskens.be
UPDATE users
SET
  last_login = NOW() - INTERVAL '3 hours',
  total_tasks_created = 42,
  total_tasks_completed = 18
WHERE email = 'jan@buskens.be';
```

### Test Password Reset Token

```sql
-- Create a valid test token for jan@buskens.be
INSERT INTO password_reset_tokens
  (user_id, token_hash, expires_at, created_at, ip_address, user_agent)
VALUES (
  (SELECT id FROM users WHERE email = 'jan@buskens.be'),
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', -- SHA-256 of 'test-token'
  NOW() + INTERVAL '24 hours',
  NOW(),
  '127.0.0.1',
  'Mozilla/5.0 (Test Browser)'
);
```

## Summary

**Tables Modified**: 1 (users - add 3 columns)
**Tables Created**: 1 (password_reset_tokens - 8 columns)
**Indexes Created**: 2 (user_id, expires_at on password_reset_tokens)
**Foreign Keys**: 1 (password_reset_tokens.user_id → users.id)
**Check Constraints**: 2 (task counts non-negative, token_hash length)

**Complexity Assessment**: Low
- Simple schema extensions
- No complex relationships
- Standard password reset pattern
- Efficient query patterns with proper indexes
