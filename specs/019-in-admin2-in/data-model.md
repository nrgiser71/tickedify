# Data Model: Admin2 User Details Fix

**Date**: 2025-10-19
**Branch**: 019-in-admin2-in

## Overview
This bugfix does not introduce new data models. It corrects SQL queries to properly reference existing database schema.

## Existing Database Schema

### Table: taken (Tasks)
**Relevant Columns for This Fix**:

| Column Name | Type | Description | Fix Impact |
|------------|------|-------------|------------|
| `project_id` | VARCHAR(50) | Project identifier | ✅ Must use AS alias to `project` |
| `context_id` | VARCHAR(50) | Context identifier | ✅ Must use AS alias to `context` |
| `user_id` | VARCHAR(255) | User identifier | ✅ Used in WHERE clause |
| `afgewerkt` | TIMESTAMP | Completion timestamp | ℹ️ Used for completed count |
| `herhaling_actief` | BOOLEAN | Recurring flag | ℹ️ Used for recurring count |

### Table: users
**Not Modified** - Query already correct

### Table: subscriptions
**Not Modified** - Query already correct (uses LEFT JOIN)

### Table: payment_configurations
**Not Modified** - Query already correct (uses LEFT JOIN)

### Table: email_imports
**Not Modified** - Query already correct

## Query Schema Mapping

### Query 3: Tasks by Project
**Current (Incorrect)**:
```sql
SELECT project, COUNT(*) as count
```

**Fixed**:
```sql
SELECT project_id AS project, COUNT(*) as count
```

**Output Schema**:
```javascript
[
  { project: "string", count: "number" },
  ...
]
```

### Query 4: Tasks by Context
**Current (Incorrect)**:
```sql
SELECT context, COUNT(*) as count
```

**Fixed**:
```sql
SELECT context_id AS context, COUNT(*) as count
```

**Output Schema**:
```javascript
[
  { context: "string", count: "number" },
  ...
]
```

## API Contract (Unchanged)

The API response contract at `GET /api/admin2/users/:id` remains **unchanged**. The fix ensures the implementation matches the existing contract.

**Response Fields (Relevant to Fix)**:
```javascript
{
  // ... other fields
  tasks: {
    // ... other fields
    by_project: [
      { project: "string", count: number }  // ✅ Now correct
    ],
    by_context: [
      { context: "string", count: number }  // ✅ Now correct
    ]
  }
}
```

## Validation Rules

### SQL Query Validation
- [x] All column names must match database schema exactly
- [x] Use AS aliasing when frontend expects different field names
- [x] GROUP BY clause must use actual column name (not alias)
- [x] WHERE clause must use actual column name (not alias)

### NULL Handling
- [x] Use `IS NOT NULL` to filter out NULL values
- [x] Frontend expects empty arrays for users with no data (not NULL)

## State Transitions
Not applicable - this is a read-only query fix.

## Data Integrity Considerations

### Before Fix
- ❌ Query fails with PostgreSQL error
- ❌ 500 error returned to client
- ❌ Admin cannot view user details

### After Fix
- ✅ Query succeeds with proper aliasing
- ✅ 200 OK with correct data structure
- ✅ Admin can view user details

## Documentation Requirements

### Code Comments
Add inline comment above fixed queries:
```javascript
// Fix: Use project_id/context_id with AS aliasing for frontend compatibility
const tasksByProjectQuery = await pool.query(`
    SELECT project_id AS project, COUNT(*) as count
    ...
```

### ARCHITECTURE.md Update
Document the column name mapping:
- `taken.project_id` → API returns as `project`
- `taken.context_id` → API returns as `context`

## Checklist

- [x] Database schema verified
- [x] Query column names mapped to schema
- [x] AS aliasing preserves API contract
- [x] No frontend changes required
- [x] No database migrations required
- [x] Validation rules documented
