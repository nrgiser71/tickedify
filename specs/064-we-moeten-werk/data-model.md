# Data Model: Test Environment Database Infrastructure

**Feature**: 064-we-moeten-werk
**Date**: 2025-11-11

## Overview

This feature does NOT introduce new database tables. It creates infrastructure for managing two separate database instances (production and test) with identical schemas.

## Database Architecture

### Production Database
- **Host**: Neon PostgreSQL
- **Connection**: `DATABASE_URL` environment variable
- **Usage**: Live user data, read-only for copy operations
- **Access**: tickedify.com (main branch) + dev.tickedify.com for copy source

### Test Database
- **Host**: Neon PostgreSQL (separate database, same project)
- **Connection**: `DATABASE_URL_TEST` environment variable
- **Usage**: Isolated testing environment, writable for admin operations
- **Access**: dev.tickedify.com (staging branch)

## Existing Table Schema

**No schema changes** - test database receives identical schema from production via pg_dump.

**Tables managed** (12 total):

### Core Tables
```sql
-- users: User accounts
id SERIAL PRIMARY KEY
username VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
email VARCHAR(255) UNIQUE
email_import_code VARCHAR(20) UNIQUE

-- taken: User tasks
id SERIAL PRIMARY KEY
naam TEXT NOT NULL
lijst VARCHAR(50)
status VARCHAR(20)
user_id INTEGER REFERENCES users(id)  -- Key for user data filtering
project_id INTEGER REFERENCES projecten(id)
context_id INTEGER REFERENCES contexten(id)
-- ... (additional fields as per ARCHITECTURE.md)

-- projecten: User projects
id SERIAL PRIMARY KEY
naam VARCHAR(255) NOT NULL
-- Note: May need user_id for filtering (to verify in implementation)

-- contexten: User contexts
id SERIAL PRIMARY KEY
naam VARCHAR(255) NOT NULL
-- Note: May need user_id for filtering (to verify in implementation)

-- subtaken: Task subtasks (hierarchical)
id SERIAL PRIMARY KEY
parent_taak_id VARCHAR(50) NOT NULL REFERENCES taken(id) ON DELETE CASCADE
titel VARCHAR(500) NOT NULL
voltooid BOOLEAN DEFAULT FALSE
volgorde INTEGER DEFAULT 0
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- bijlagen: Task attachments
id VARCHAR(50) PRIMARY KEY
taak_id VARCHAR(50) NOT NULL REFERENCES taken(id) ON DELETE CASCADE
bestandsnaam VARCHAR(255) NOT NULL
user_id VARCHAR(50) REFERENCES users(id)  -- Key for user data filtering
-- ... (storage metadata fields)

-- feedback: Beta feedback from users
id VARCHAR(50) PRIMARY KEY
user_id VARCHAR(50) REFERENCES users(id)  -- Key for user data filtering
type VARCHAR(20) CHECK (type IN ('bug', 'feature'))
titel VARCHAR(255) NOT NULL
beschrijving TEXT NOT NULL
status VARCHAR(20) DEFAULT 'nieuw'
-- ... (additional fields)

-- page_help: Page-specific help content
page_id VARCHAR(50) PRIMARY KEY
content TEXT NOT NULL
modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
modified_by VARCHAR(50)
-- Note: Admin-created, optionally user-specific
```

### Additional Tables
- Daily planning tables (if exist - to verify)
- Recurring task metadata (embedded in `taken`)
- User preferences (if separate table - to verify)

## Data Relationships for Copy Operations

**User Data Copy Order** (preserves foreign keys):
1. `users` table (no dependencies)
2. `projecten` table (user-created projects)
3. `contexten` table (user-created contexts)
4. `taken` table (depends on users, projecten, contexten)
5. `subtaken` table (depends on taken)
6. `bijlagen` table (depends on taken, users)
7. `feedback` table (depends on users)
8. `page_help` table (optionally user-specific)

**Foreign Key Preservation**:
- Original IDs are maintained during copy
- `taken.project_id` → `projecten.id` (same ID in test DB)
- `taken.context_id` → `contexten.id` (same ID in test DB)
- `subtaken.parent_taak_id` → `taken.id` (same ID in test DB)
- `bijlagen.taak_id` → `taken.id` (same ID in test DB)

## Connection Configuration

**Server.js Connection Pools**:
```javascript
// Production pool (always available)
const productionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Test pool (only on staging/dev)
let testPool = null;
if (process.env.DATABASE_URL_TEST) {
  testPool = new Pool({
    connectionString: process.env.DATABASE_URL_TEST,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });
}
```

**Environment-Based Routing**:
- `VERCEL_ENV === 'production'` → Use production pool only
- `VERCEL_ENV === 'preview'` → Use test pool (if configured)
- `VERCEL_ENV === 'development'` → Use production pool (local dev)

## Data Operations

### Schema Copy
```sql
-- Step 1: Clear test database (admin2.html button)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Step 2: Export production schema (pg_dump --schema-only)
-- Generated SQL includes:
-- - CREATE TABLE statements
-- - PRIMARY KEY constraints
-- - FOREIGN KEY constraints
-- - UNIQUE constraints
-- - CHECK constraints
-- - CREATE INDEX statements
-- - CREATE SEQUENCE statements
-- - CREATE TRIGGER statements (if any)

-- Step 3: Import to test database (psql < schema.sql)
-- All DDL statements executed in test DB
```

### User Data Copy
```sql
-- Step 1: Check duplicate (before copy)
SELECT id FROM users WHERE email = $1;
-- If exists: return 409 Conflict

-- Step 2: Copy user record
INSERT INTO users (id, username, password_hash, email, email_import_code)
SELECT id, username, password_hash, email, email_import_code
FROM production.users
WHERE id = $1;

-- Step 3: Copy related data (in order)
-- Projects, contexts, taken, subtaken, bijlagen, feedback
-- Each INSERT preserves original IDs

-- Wrapped in transaction for atomicity
BEGIN;
-- ... all copy statements
COMMIT;
```

### User Data Delete
```sql
-- Delete user and cascade to related tables
-- Foreign key ON DELETE CASCADE handles subtaken, bijlagen
DELETE FROM feedback WHERE user_id = $1;
DELETE FROM taken WHERE user_id = $1;  -- Cascades to subtaken, bijlagen
DELETE FROM users WHERE id = $1;

-- Note: projecten/contexten may be shared - do NOT delete
```

### Clear Test Database
```sql
-- Delete all data, preserve schema
DELETE FROM feedback;
DELETE FROM bijlagen;
DELETE FROM subtaken;
DELETE FROM taken;
DELETE FROM users;
-- Order matters (foreign key constraints)
-- Sequences reset to 1 (optional)
-- Schema structure intact
```

## Validation Rules

**User Copy Requirements**:
- User must exist in production database
- User must NOT exist in test database (email unique)
- All foreign key relationships must be valid post-copy
- Transaction must be atomic (all-or-nothing)

**Schema Copy Requirements**:
- All 12 tables must be created in test database
- All indexes must be recreated
- All constraints must be enforced
- Zero data rows after schema copy

**Delete Operations**:
- User must exist in test database
- Cascade delete removes all related records
- No orphaned foreign key references remain

## Implementation Notes

1. **No Schema Migrations**: Feature only manages database connections, no schema changes
2. **ID Preservation Critical**: Copy operations maintain original IDs for FK integrity
3. **Shared Data Handling**: projecten/contexten might be shared - copy duplicates acceptable
4. **Attachment Files**: Bijlagen table copied (Backblaze references remain valid)
5. **Serial Sequences**: Test DB sequences start from max(id) + 1 after copy

## Testing Validation

**Schema Copy Verification**:
```sql
-- Count tables in test DB
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: 12

-- Verify zero data
SELECT
  (SELECT COUNT(*) FROM users) +
  (SELECT COUNT(*) FROM taken) +
  (SELECT COUNT(*) FROM projecten)
  -- ... (all tables)
AS total_rows;
-- Expected: 0
```

**User Copy Verification**:
```sql
-- Verify user exists in test
SELECT COUNT(*) FROM users WHERE email = $1;
-- Expected: 1

-- Verify related data copied
SELECT COUNT(*) FROM taken WHERE user_id = $1;
-- Expected: >0 (if user had tasks)

-- Verify foreign key integrity
SELECT COUNT(*) FROM taken WHERE user_id = $1 AND project_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM projecten WHERE id = taken.project_id);
-- Expected: 0 (no orphaned FKs)
```

---
**Status**: Complete - no database schema changes required
**Next**: API contract definition (contracts/)
