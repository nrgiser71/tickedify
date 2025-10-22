# Quickstart: Fix Admin2 User Details 500 Error

**Branch**: `019-in-admin2-in`
**Date**: 2025-10-19
**Estimated Time**: 15-20 minutes

## Prerequisites

- [x] Branch `019-in-admin2-in` checked out
- [x] Local development environment running
- [x] Access to PostgreSQL database (Neon)
- [x] Admin credentials for testing

## Quick Overview

**What**: Fix SQL column name mismatch causing 500 error in admin2 user details endpoint
**Where**: `server.js` lines 9625-9640
**Why**: Queries use `project`/`context` but database has `project_id`/`context_id`
**Fix**: Add SQL AS aliasing to maintain API contract

## Step-by-Step Fix

### 1. Locate the Buggy Code

Open `server.js` and navigate to line 9625 (Tasks by Project query).

**Current code:**
```javascript
// 3. Get tasks by project (top 10)
const tasksByProjectQuery = await pool.query(`
    SELECT project, COUNT(*) as count
    FROM taken
    WHERE user_id = $1 AND project IS NOT NULL
    GROUP BY project
    ORDER BY count DESC
    LIMIT 10
`, [userId]);
```

### 2. Apply Fix #1 - Tasks by Project

Replace lines 9625-9631 with:

```javascript
// 3. Get tasks by project (top 10)
// Fix: Use project_id with AS aliasing for frontend compatibility
const tasksByProjectQuery = await pool.query(`
    SELECT project_id AS project, COUNT(*) as count
    FROM taken
    WHERE user_id = $1 AND project_id IS NOT NULL
    GROUP BY project_id
    ORDER BY count DESC
    LIMIT 10
`, [userId]);
```

**Changes**:
- Line 9625: Add comment explaining the fix
- Line 9626: `project` → `project_id AS project`
- Line 9628: `project IS NOT NULL` → `project_id IS NOT NULL`
- Line 9629: `GROUP BY project` → `GROUP BY project_id`

### 3. Apply Fix #2 - Tasks by Context

Navigate to line 9635 and replace lines 9634-9641 with:

```javascript
// 4. Get tasks by context (top 10)
// Fix: Use context_id with AS aliasing for frontend compatibility
const tasksByContextQuery = await pool.query(`
    SELECT context_id AS context, COUNT(*) as count
    FROM taken
    WHERE user_id = $1 AND context_id IS NOT NULL
    GROUP BY context_id
    ORDER BY count DESC
    LIMIT 10
`, [userId]);
```

**Changes**:
- Line 9635: Add comment explaining the fix
- Line 9636: `context` → `context_id AS context`
- Line 9638: `context IS NOT NULL` → `context_id IS NOT NULL`
- Line 9639: `GROUP BY context` → `GROUP BY context_id`

### 4. Verify No Other Changes Needed

Scan the rest of the endpoint (lines 9555-9767) to confirm:
- [x] Query 1 (User Details) - Already correct
- [x] Query 2 (Task Summary) - Already correct
- [x] Query 5 (Email Summary) - Already correct
- [x] Query 6 (Recent Emails) - Already correct
- [x] Query 7 (Subscription) - Already correct

Only Queries 3 and 4 need fixing.

### 5. Test Locally

#### Option A: Direct Database Test

Create a test script `test-user-details-fix.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testFix() {
  const userId = 'user_1760528080063_08xf0g9r1'; // Use a real user ID

  try {
    // Test Query 3 (fixed)
    const projectQuery = await pool.query(`
      SELECT project_id AS project, COUNT(*) as count
      FROM taken
      WHERE user_id = $1 AND project_id IS NOT NULL
      GROUP BY project_id
      ORDER BY count DESC
      LIMIT 10
    `, [userId]);
    console.log('✅ Query 3 passed:', projectQuery.rows);

    // Test Query 4 (fixed)
    const contextQuery = await pool.query(`
      SELECT context_id AS context, COUNT(*) as count
      FROM taken
      WHERE user_id = $1 AND context_id IS NOT NULL
      GROUP BY context_id
      ORDER BY count DESC
      LIMIT 10
    `, [userId]);
    console.log('✅ Query 4 passed:', contextQuery.rows);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testFix();
```

Run:
```bash
node test-user-details-fix.js
```

Expected output:
```
✅ Query 3 passed: [ { project: 'Project Name', count: '5' }, ... ]
✅ Query 4 passed: [ { context: 'Context Name', count: '3' }, ... ]
```

#### Option B: API Endpoint Test

Start the server:
```bash
npm start
```

Test the endpoint with curl:
```bash
curl -s -L -k https://localhost:3000/api/admin2/users/user_1760528080063_08xf0g9r1 \
  -H "Cookie: connect.sid=<your-admin-session-cookie>"
```

Expected: 200 OK with complete JSON response including `tasks.by_project` and `tasks.by_context` arrays.

### 6. Test in Admin2 UI

1. Open `http://localhost:3000/admin2.html` (or staging/production URL)
2. Login with admin credentials
3. Search for a user
4. Click on a user in search results
5. Verify user details panel loads successfully
6. Check browser console for errors (should be none)

**Expected Results**:
- ✅ User details panel displays
- ✅ User info, task summary, email summary all visible
- ✅ Project and context breakdowns show data
- ✅ No 500 errors in console
- ✅ No "Failed to get user details" error

### 7. Update Version & Changelog

Update `package.json`:
```json
{
  "version": "0.19.94"  // Increment patch version
}
```

Update `public/changelog.html`:
```html
<div class="changelog-entry">
    <div class="entry-header">
        <span class="badge badge-fix">🔧 Fix</span>
        <span class="version">v0.19.94</span>
        <span class="date">2025-10-19</span>
    </div>
    <div class="entry-content">
        <strong>Admin2 User Details Fixed</strong> - Opgelost: 500 error bij het bekijken van user details in admin dashboard. Database query column names gecorrigeerd (project_id, context_id).
    </div>
</div>
```

### 8. Commit & Deploy

```bash
# Commit changes
git add server.js package.json public/changelog.html
git commit -m "🔧 Fix Admin2 User Details 500 Error - Column Name Mismatch - v0.19.94

Fixed SQL queries in /api/admin2/users/:id endpoint:
- Query 3: Use project_id AS project (was: project)
- Query 4: Use context_id AS context (was: context)

Root cause: Database columns are project_id/context_id, not project/context
Solution: AS aliasing maintains frontend API contract
Impact: Admin can now view user details without 500 errors

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to develop
git push origin 019-in-admin2-in
```

### 9. Verify Deployment

Wait ~15 seconds for Vercel deployment, then check version:

```bash
curl -s -L -k https://tickedify.com/api/version
```

Expected:
```json
{"version":"0.19.94"}
```

### 10. Production Verification

Test in production admin2:

1. Go to https://tickedify.com/admin2.html
2. Login as admin
3. Search for a user
4. Click user to load details
5. Verify no errors

**Success Criteria**:
- ✅ User details load without errors
- ✅ All sections display correctly
- ✅ Projects and contexts show data
- ✅ No console errors
- ✅ Version shows 0.19.94

## Rollback Plan

If issues occur, revert the commit:

```bash
git revert HEAD
git push origin 019-in-admin2-in
```

Wait for deployment, verify version rollback:
```bash
curl -s -L -k https://tickedify.com/api/version
```

## Common Issues

### Issue: Test user has no tasks
**Solution**: Use a different user ID with actual task data

### Issue: Cannot connect to database
**Solution**: Check `.env` file has correct `DATABASE_URL`

### Issue: Still getting 500 error
**Solution**:
1. Check server logs for exact error
2. Verify all 4 column name changes were made
3. Restart server to reload code

## Verification Checklist

- [ ] Code changes applied (2 queries fixed)
- [ ] Local database test passed
- [ ] API endpoint test passed (200 OK)
- [ ] Admin2 UI test passed (no errors)
- [ ] Version incremented to 0.19.94
- [ ] Changelog updated
- [ ] Changes committed with descriptive message
- [ ] Pushed to branch
- [ ] Vercel deployment succeeded
- [ ] Production version verified
- [ ] Production admin2 tested successfully

## Time Breakdown

- **Code changes**: 5 minutes
- **Local testing**: 5 minutes
- **Version & changelog**: 2 minutes
- **Commit & deploy**: 3 minutes
- **Production verification**: 5 minutes

**Total**: ~20 minutes

## Next Steps

After successful deployment:
1. Monitor error logs for any related issues
2. Test with multiple different users
3. Consider adding automated tests for this endpoint
4. Update ARCHITECTURE.md with column name mapping documentation

---

**Status**: Ready for implementation ✅
