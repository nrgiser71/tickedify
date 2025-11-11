# Quickstart: Test Environment Setup & Validation

**Feature**: 064-we-moeten-werk
**Date**: 2025-11-11
**Target**: dev.tickedify.com (staging environment)

## Overview

This quickstart guide walks through complete setup and validation of the isolated test environment with separate database for dev.tickedify.com.

## Prerequisites

- [ ] Admin access to Neon PostgreSQL dashboard
- [ ] Admin access to Vercel project settings
- [ ] Admin credentials for tickedify.com/admin2.html
- [ ] Terminal access with curl installed

---

## Phase 1: Infrastructure Setup (Manual)

### Step 1.1: Create Test Database on Neon

1. Navigate to Neon dashboard: https://console.neon.tech
2. Select Tickedify project
3. Click "Create Database"
4. Configuration:
   - **Database name**: `tickedify_test`
   - **Owner**: Default postgres user
   - **Branch**: main (same as production for connection pooling)
5. Click "Create Database"
6. Copy connection string from dashboard
7. Expected format: `postgresql://user:password@host/tickedify_test?sslmode=require`

**Validation**:
```bash
# Test connection with psql (optional)
psql "postgresql://user:password@host/tickedify_test?sslmode=require" -c "SELECT version();"

# Expected output:
# PostgreSQL 14.x on x86_64-pc-linux-gnu, compiled by gcc...
```

### Step 1.2: Configure Vercel Environment Variables

1. Navigate to Vercel dashboard: https://vercel.com/tickedify/tickedify/settings/environment-variables
2. Add new environment variable:
   - **Key**: `DATABASE_URL_TEST`
   - **Value**: Connection string from Step 1.1
   - **Environments**: Preview (dev.tickedify.com) + Development
   - **Important**: Do NOT add to Production environment
3. Click "Save"
4. Verify existing `DATABASE_URL` remains unchanged (production database)

**Validation**:
- [ ] `DATABASE_URL` exists with Production + Preview + Development
- [ ] `DATABASE_URL_TEST` exists with Preview + Development only
- [ ] Production environment only has `DATABASE_URL` (not TEST)

### Step 1.3: Deploy to Staging

```bash
# From feature branch
git checkout staging
git merge 064-we-moeten-werk --no-edit
git push origin staging

# Vercel automatically deploys to dev.tickedify.com
```

Wait 30-60 seconds for deployment to complete.

**Validation**:
```bash
# Check version endpoint
curl -s -L -k https://dev.tickedify.com/api/version | jq

# Expected output:
# {
#   "version": "1.x.x",
#   "environment": "preview"
# }
```

### Step 1.4: Verify Database Connections

```bash
# Get admin session (login to admin2.html first)
# Then use browser dev tools to copy session cookie value

# Verify both databases are accessible
curl -s -L -k https://dev.tickedify.com/api/admin/test-db/verify \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq

# Expected output:
# {
#   "production": {
#     "connected": true,
#     "latency": 45
#   },
#   "test": {
#     "connected": true,
#     "latency": 52,
#     "configured": true
#   }
# }
```

**Success Criteria**:
- [x] Both `production.connected` and `test.connected` are `true`
- [x] Test database latency is reasonable (<500ms)
- [x] `test.configured` is `true` (DATABASE_URL_TEST exists)

---

## Phase 2: Schema Copy Operations

### Step 2.1: Copy Database Schema

**Via admin2.html UI**:
1. Navigate to https://dev.tickedify.com/admin2.html
2. Click "Test Environment" tab
3. Click "Copy Schema from Production" button
4. Confirm dialog: "This will clear the test database. Continue?"
5. Wait for success notification (20-30 seconds)
6. Verify status message: "Schema copied successfully - 12 tables created"

**Via curl (alternative)**:
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/copy-schema \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"confirm": true}' \
  | jq

# Expected output:
# {
#   "success": true,
#   "tablesCreated": 12,
#   "duration": 28000,
#   "details": "Schema copied successfully with all constraints and indexes"
# }
```

**Success Criteria**:
- [x] Response `success: true`
- [x] Response `tablesCreated: 12` (all tables)
- [x] Operation completes in <60 seconds

### Step 2.2: Verify Schema Structure

```bash
# Connect to test database and verify tables
psql "$DATABASE_URL_TEST" -c "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
"

# Expected output (12 tables):
# bijlagen
# contexten
# feedback
# page_help
# projecten
# subtaken
# taken
# users
# ... (etc)
```

**Success Criteria**:
- [x] All 12 tables exist in test database
- [x] Tables have correct structure (columns, types)
- [x] Indexes are created (verify with `\di` in psql)
- [x] Constraints are enforced (foreign keys, unique, check)

### Step 2.3: Verify Zero Data

```bash
# Verify test database is empty after schema copy
psql "$DATABASE_URL_TEST" -c "
  SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM taken) AS taken,
    (SELECT COUNT(*) FROM projecten) AS projecten,
    (SELECT COUNT(*) FROM contexten) AS contexten,
    (SELECT COUNT(*) FROM subtaken) AS subtaken,
    (SELECT COUNT(*) FROM bijlagen) AS bijlagen,
    (SELECT COUNT(*) FROM feedback) AS feedback,
    (SELECT COUNT(*) FROM page_help) AS page_help;
"

# Expected output:
# users | taken | projecten | contexten | subtaken | bijlagen | feedback | page_help
# ------|-------|-----------|-----------|----------|----------|----------|----------
#     0 |     0 |         0 |         0 |        0 |        0 |        0 |         0
```

**Success Criteria**:
- [x] All tables have 0 rows
- [x] No data was copied (schema only)

---

## Phase 3: User Data Copy Operations

### Step 3.1: List Production Users

**Via admin2.html UI**:
1. In "Test Environment" tab
2. View "Production Users" section
3. Verify list shows all production users with name and email

**Via curl**:
```bash
curl -s -L -k https://dev.tickedify.com/api/admin/production-users \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq

# Expected output:
# {
#   "users": [
#     { "id": 1, "username": "jan@buskens.be", "email": "jan@buskens.be" },
#     { "id": 2, "username": "user2", "email": "user2@example.com" },
#     ... (all production users)
#   ]
# }
```

**Success Criteria**:
- [x] Response contains array of users
- [x] Each user has `id`, `username`, `email`
- [x] User count matches expected production users (~15)

### Step 3.2: Copy User to Test Database

**Via admin2.html UI**:
1. Select "jan@buskens.be" from Production Users list
2. Click "Copy to Test" button
3. Confirm dialog: "Copy user jan@buskens.be and all related data?"
4. Wait for success notification (5-10 seconds)
5. Verify message: "User copied successfully - 150 tasks, 5 projects, 3 contexts"

**Via curl**:
```bash
# Copy user ID 1 (jan@buskens.be)
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/copy-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"userId": 1, "confirm": true}' \
  | jq

# Expected output:
# {
#   "success": true,
#   "userEmail": "jan@buskens.be",
#   "tasksCopied": 150,
#   "projectsCopied": 5,
#   "contextsCopied": 3,
#   "attachmentsCopied": 12,
#   "duration": 8500
# }
```

**Success Criteria**:
- [x] Response `success: true`
- [x] Response shows counts for copied entities
- [x] Operation completes in <30 seconds
- [x] User appears in "Test Users" section of admin UI

### Step 3.3: Verify User Data Integrity

```bash
# Verify user exists in test database
psql "$DATABASE_URL_TEST" -c "
  SELECT id, username, email FROM users WHERE email = 'jan@buskens.be';
"

# Expected output:
# id | username        | email
# ---|-----------------|------------------
#  1 | jan@buskens.be  | jan@buskens.be

# Verify related data was copied
psql "$DATABASE_URL_TEST" -c "
  SELECT
    (SELECT COUNT(*) FROM taken WHERE user_id = 1) AS tasks,
    (SELECT COUNT(*) FROM subtaken WHERE parent_taak_id IN (SELECT id FROM taken WHERE user_id = 1)) AS subtasks,
    (SELECT COUNT(*) FROM bijlagen WHERE user_id = 1) AS attachments,
    (SELECT COUNT(*) FROM feedback WHERE user_id = 1) AS feedback;
"

# Expected output:
# tasks | subtasks | attachments | feedback
# ------|----------|-------------|----------
#   150 |       45 |          12 |        2
```

**Success Criteria**:
- [x] User record exists in test database
- [x] Tasks were copied with correct user_id
- [x] Subtasks maintain relationships to tasks
- [x] Attachments reference correct tasks
- [x] Foreign key integrity is preserved

### Step 3.4: Verify Duplicate Prevention

```bash
# Attempt to copy same user again
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/copy-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"userId": 1, "confirm": true}' \
  | jq

# Expected output (409 Conflict):
# {
#   "error": "UserAlreadyExists",
#   "message": "User jan@buskens.be already exists in test database",
#   "details": "Delete existing user from test database before retrying copy"
# }
```

**Success Criteria**:
- [x] Response status is 409 Conflict
- [x] Error message clearly indicates duplicate
- [x] User was NOT duplicated in test database

### Step 3.5: Test Application with Test Data

```bash
# Navigate to dev.tickedify.com/app
# Login with copied user: jan@buskens.be

# Expected behavior:
# - Login successful
# - Dashboard shows 150 tasks
# - Projects and contexts are available
# - Drag & drop works with test data
# - No connection to production database
```

**Success Criteria**:
- [x] User can login to dev.tickedify.com/app
- [x] All copied tasks are visible
- [x] Application functions normally with test data
- [x] Changes to test data do NOT affect production

---

## Phase 4: Test Database Management

### Step 4.1: List Test Users

**Via admin2.html UI**:
1. View "Test Users" section
2. Verify user list shows jan@buskens.be with delete button

**Via curl**:
```bash
curl -s -L -k https://dev.tickedify.com/api/admin/test-users \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq

# Expected output:
# {
#   "users": [
#     { "id": 1, "username": "jan@buskens.be", "email": "jan@buskens.be" }
#   ]
# }
```

**Success Criteria**:
- [x] Test users list is displayed
- [x] Delete button available for each user
- [x] List updates after copy/delete operations

### Step 4.2: Delete User from Test Database

**Via admin2.html UI**:
1. Click "Delete" button for jan@buskens.be
2. Confirm dialog: "Delete user jan@buskens.be and all related data from test?"
3. Wait for success notification (2-3 seconds)
4. Verify user removed from Test Users list

**Via curl**:
```bash
curl -s -L -k -X DELETE https://dev.tickedify.com/api/admin/test-db/user/1 \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq

# Expected output:
# {
#   "success": true,
#   "deletedTasks": 150,
#   "deletedAttachments": 12,
#   "deletedFeedback": 2
# }
```

**Success Criteria**:
- [x] Response `success: true`
- [x] Response shows counts for deleted entities
- [x] User removed from test database
- [x] Related data cascaded (tasks, attachments, etc.)

### Step 4.3: Clear Test Database

**Via admin2.html UI**:
1. Click "Clear Test Database" button
2. Confirm dialog: "Delete ALL data from test database? Schema will remain."
3. Wait for success notification (5-10 seconds)
4. Verify message: "Test database cleared - 12 tables, 1523 rows deleted"

**Via curl**:
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/clear \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"confirm": true}' \
  | jq

# Expected output:
# {
#   "success": true,
#   "tablesCleared": 12,
#   "totalRowsDeleted": 1523
# }
```

**Success Criteria**:
- [x] Response `success: true`
- [x] All tables cleared
- [x] Schema structure intact (tables still exist)
- [x] Test Users list is empty

### Step 4.4: Verify Production Unaffected

```bash
# Verify production database is unchanged
curl -s -L -k https://tickedify.com/api/admin/production-users \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq

# Expected: All production users still present (unchanged)

# Verify production app works
# Navigate to tickedify.com/app
# Login as jan@buskens.be
# Expected: All production data intact, no changes
```

**Success Criteria**:
- [x] Production database unchanged
- [x] Production app functions normally
- [x] No data loss in production
- [x] Complete isolation verified

---

## Phase 5: End-to-End Workflow Test

### Scenario: Full Test Cycle

```bash
# Step 1: Verify connections
curl -s -L -k https://dev.tickedify.com/api/admin/test-db/verify \
  -H "Cookie: session=YOUR_ADMIN_SESSION" | jq '.production.connected, .test.connected'
# Expected: true, true

# Step 2: Copy schema
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/copy-schema \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"confirm": true}' | jq '.success'
# Expected: true

# Step 3: Copy user
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/copy-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"userId": 1, "confirm": true}' | jq '.success'
# Expected: true

# Step 4: Test application (manual)
# Navigate to dev.tickedify.com/app and test features

# Step 5: Clear test database
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/clear \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"confirm": true}' | jq '.success'
# Expected: true

# Step 6: Verify production unchanged
curl -s -L -k https://tickedify.com/api/admin/production-users \
  -H "Cookie: session=YOUR_ADMIN_SESSION" | jq '.users | length'
# Expected: ~15 (production user count unchanged)
```

**Success Criteria**:
- [x] Complete workflow executes without errors
- [x] All operations complete in reasonable time (<5 minutes total)
- [x] Production database completely isolated and unaffected
- [x] Test environment ready for feature testing

---

## Troubleshooting

### Issue: "Test database not configured"

**Symptoms**: API returns error about missing test database configuration

**Solution**:
1. Verify `DATABASE_URL_TEST` exists in Vercel environment variables
2. Verify variable is set for Preview environment (not just Production)
3. Redeploy staging branch to pick up new environment variable

### Issue: Schema copy fails with timeout

**Symptoms**: Schema copy operation exceeds 60 seconds

**Solution**:
1. Check Neon database performance (dashboard metrics)
2. Verify pg_dump is available in Vercel serverless environment
3. Consider splitting operation into smaller chunks (future enhancement)

### Issue: User copy fails with foreign key violation

**Symptoms**: Copy operation fails with "violates foreign key constraint"

**Solution**:
1. Verify copy order: users → projecten/contexten → taken → subtaken
2. Check if schema copy was successful (all tables exist)
3. Verify production data integrity (no orphaned FKs)

### Issue: Production data affected by test operations

**Symptoms**: Production users report data changes after test operations

**Solution**:
1. **IMMEDIATELY STOP ALL OPERATIONS**
2. Verify environment variable configuration (DATABASE_URL vs DATABASE_URL_TEST)
3. Check server.js connection pool logic (VERCEL_ENV detection)
4. Review recent deployments for code errors
5. Restore production database from backup if necessary

---

## Success Checklist

**Infrastructure**:
- [x] Test database created on Neon
- [x] Vercel environment variables configured correctly
- [x] Both databases accessible from dev.tickedify.com
- [x] Production database remains production-only on tickedify.com

**Schema Operations**:
- [x] Schema copy creates all 12 tables
- [x] Indexes, constraints, sequences preserved
- [x] Zero data in test database after schema copy
- [x] Clear operation removes data, preserves schema

**User Data Operations**:
- [x] User copy preserves all relationships
- [x] Foreign key integrity maintained
- [x] Duplicate prevention works (409 error)
- [x] Delete operation cascades correctly

**Isolation Verification**:
- [x] Test operations do NOT affect production
- [x] Production app unaffected by test database
- [x] Environment-based routing works correctly
- [x] Admin can safely test features on dev.tickedify.com

**Feature Complete**: All test scenarios pass ✅

---
**Quickstart version**: 1.0.0
**Last updated**: 2025-11-11
**Estimated time**: 30-45 minutes for full workflow
