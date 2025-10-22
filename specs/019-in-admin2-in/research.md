# Research: Admin2 User Details 500 Error

**Date**: 2025-10-19
**Branch**: 019-in-admin2-in
**Status**: Complete

## Root Cause Analysis

### Problem Statement
The admin2 user management endpoint `GET /api/admin2/users/:id` returns a 500 error when attempting to load user details. The error occurs consistently for all users, preventing admins from viewing user information, task statistics, and subscription details.

### Root Cause
**SQL column name mismatch** in two database queries within the endpoint handler.

**Location**: `server.js` lines 9625-9640

**Specific Issues**:
1. **Query 3 (Tasks by Project)**: Line 9625 queries `SELECT project` but the database column is named `project_id`
2. **Query 4 (Tasks by Context)**: Line 9635 queries `SELECT context` but the database column is named `context_id`

### Technical Evidence

#### PostgreSQL Error Messages
```
ERROR: column "project" does not exist
LINE 1: SELECT project, COUNT(*) as count
               ^
HINT: Perhaps you meant to reference the column "taken.project_id".

ERROR: column "context" does not exist
LINE 1: SELECT context, COUNT(*) as count
               ^
HINT: Perhaps you meant to reference the column "taken.context_id".
```

#### Database Schema (taken table)
```sql
CREATE TABLE taken (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(50),      -- Correct column name
    context_id VARCHAR(50),      -- Correct column name
    -- ... other columns
);
```

#### Current Incorrect Code (server.js)

**Query 3 - Line 9625:**
```javascript
const tasksByProjectQuery = await pool.query(`
    SELECT project, COUNT(*) as count
    FROM taken
    WHERE user_id = $1 AND project IS NOT NULL
    GROUP BY project
    ORDER BY count DESC
    LIMIT 10
`, [userId]);
```

**Query 4 - Line 9635:**
```javascript
const tasksByContextQuery = await pool.query(`
    SELECT context, COUNT(*) as count
    FROM taken
    WHERE user_id = $1 AND context IS NOT NULL
    GROUP BY context
    ORDER BY count DESC
    LIMIT 10
`, [userId]);
```

## Solution Design

### Proposed Fix
Use SQL `AS` aliasing to maintain backwards compatibility with the frontend code that expects fields named `project` and `context`.

**Corrected Query 3 - Line 9625:**
```javascript
const tasksByProjectQuery = await pool.query(`
    SELECT project_id AS project, COUNT(*) as count
    FROM taken
    WHERE user_id = $1 AND project_id IS NOT NULL
    GROUP BY project_id
    ORDER BY count DESC
    LIMIT 10
`, [userId]);
```

**Corrected Query 4 - Line 9635:**
```javascript
const tasksByContextQuery = await pool.query(`
    SELECT context_id AS context, COUNT(*) as count
    FROM taken
    WHERE user_id = $1 AND context_id IS NOT NULL
    GROUP BY context_id
    ORDER BY count DESC
    LIMIT 10
`, [userId]);
```

### Why AS Aliasing?
1. **Frontend Compatibility**: The admin2.js frontend code (lines 1930, 1940) expects response fields named `project` and `context`
2. **Minimal Changes**: No frontend code modifications required
3. **Standard Practice**: SQL AS aliasing is the standard way to rename columns in query results
4. **Backwards Compatible**: Maintains the existing API contract

### Alternative Approaches Considered

#### Alternative 1: Rename Database Columns
**Rejected because**:
- Would require database migration affecting all existing code
- Breaking change across the entire application
- High risk for a simple bugfix

#### Alternative 2: Update Frontend to Use project_id/context_id
**Rejected because**:
- Requires frontend changes in addition to backend
- More code changes = higher risk
- Violates principle of minimal necessary changes for bugfixes

#### Alternative 3: Transform Results in JavaScript
**Rejected because**:
- Less efficient than SQL aliasing
- More code complexity
- SQL AS is cleaner and more readable

## Impact Assessment

### Files Requiring Changes
- ✅ **server.js** (lines 9625-9640): Update 2 SQL queries with AS aliasing
- ✅ **No frontend changes required**: admin2.js already expects correct field names

### Testing Strategy
1. **Unit Test**: Verify SQL queries return correct schema
2. **Integration Test**: Test endpoint with real user ID
3. **Manual Test**: Load user details in admin2 dashboard
4. **Edge Cases**:
   - User with no tasks
   - User with no projects
   - User with no contexts
   - User with NULL project_id/context_id values

### Deployment Considerations
- **Zero Downtime**: Fix can be deployed without downtime
- **No Migration**: No database schema changes needed
- **Backwards Compatible**: Maintains existing API contract
- **Rollback**: Can be reverted by restoring previous SQL queries

## Why This Bug Wasn't Caught Earlier

### Contributing Factors
1. **Parse-Time Error**: Query fails at SQL parsing stage, not during JavaScript execution
2. **Recent Feature**: Admin2 user details endpoint is relatively new functionality
3. **Incomplete Testing**: Not tested with actual database during development
4. **Copy-Paste Error**: Likely copied from older code with different schema naming

### Prevention Measures
- Add integration tests for admin2 endpoints
- Database schema documentation in ARCHITECTURE.md
- SQL query review checklist
- Test with production-like data before deployment

## Research Checklist

- [x] Root cause identified
- [x] SQL error messages documented
- [x] Database schema verified
- [x] Solution designed with rationale
- [x] Alternatives considered and rejected
- [x] Impact assessment complete
- [x] Testing strategy defined
- [x] Deployment considerations documented
- [x] Prevention measures identified

## Next Steps
Proceed to Phase 1: Design & Contracts to formalize the fix and create verification tests.
