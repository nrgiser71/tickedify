# API Contract: Debug & Database Tools

**Feature**: Admin Dashboard v2
**Date**: 2025-10-18
**Version**: 1.0

## Base Path
All debug and database tool endpoints are under `/api/admin2/debug/`

## Authentication
All endpoints require:
- Valid session cookie with `account_type = 'admin'`
- Returns `401 Unauthorized` if not authenticated
- Returns `403 Forbidden` if not admin

## Endpoints

### GET /api/admin2/debug/user-data/:id
Get comprehensive data for a specific user (user data inspector).

**Request**:
```http
GET /api/admin2/debug/user-data/123 HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "naam": "Test User",
    "account_type": "normaal",
    "subscription_tier": "free",
    "subscription_status": "trial",
    "trial_end_date": "2025-10-25",
    "actief": true,
    "created_at": "2025-10-12T14:00:00Z",
    "last_login": "2025-10-17T16:45:00Z"
  },
  "tasks": {
    "summary": {
      "total": 45,
      "completed": 28,
      "active": 17,
      "recurring": 5,
      "blocked": 2
    },
    "by_project": [
      {"project": "Work", "count": 20},
      {"project": "Personal", "count": 15}
    ],
    "by_context": [
      {"context": "@computer", "count": 25},
      {"context": "@phone", "count": 10}
    ]
  },
  "emails": {
    "summary": {
      "total_imports": 12,
      "processed": 10,
      "first_import": "2025-10-13T08:00:00Z",
      "last_import": "2025-10-17T11:30:00Z"
    },
    "recent": [
      {
        "from": "boss@company.com",
        "subject": "Project deadline",
        "imported_at": "2025-10-17T11:30:00Z"
      }
    ]
  },
  "subscription": {
    "status": "trial",
    "tier": "free",
    "trial_end_date": "2025-10-25",
    "plan_name": null,
    "price_monthly": null
  },
  "sessions": {
    "active_sessions": 2,
    "last_activity": "2025-10-18T09:30:00Z"
  }
}
```

**Response** (404 Not Found):
```json
{
  "error": "User not found",
  "message": "No user with ID 123"
}
```

### POST /api/admin2/debug/sql-query
Execute custom SQL query (with safety checks).

**Request**:
```http
POST /api/admin2/debug/sql-query HTTP/1.1
Cookie: connect.sid=s%3A...
Content-Type: application/json

{
  "query": "SELECT email, created_at FROM users ORDER BY created_at DESC LIMIT 10",
  "confirm_destructive": false
}
```

**Request Body**:
- `query` (required): SQL query string
- `confirm_destructive` (required for non-SELECT): Must be `true` for INSERT/UPDATE/DELETE/DROP

**Response** (200 OK - SELECT query):
```json
{
  "success": true,
  "query_type": "SELECT",
  "rows": [
    {
      "email": "newest@example.com",
      "created_at": "2025-10-18T10:00:00Z"
    }
    // ... up to 100 rows
  ],
  "row_count": 10,
  "execution_time_ms": 15
}
```

**Response** (200 OK - UPDATE/DELETE query):
```json
{
  "success": true,
  "query_type": "UPDATE",
  "rows_affected": 5,
  "execution_time_ms": 23
}
```

**Response** (400 Bad Request - destructive without confirmation):
```json
{
  "error": "Confirmation required",
  "message": "Destructive queries (UPDATE/DELETE/DROP) require confirm_destructive=true",
  "query_type": "DELETE",
  "warning": "This query will modify or delete data"
}
```

**Response** (400 Bad Request - dangerous query):
```json
{
  "error": "Dangerous query blocked",
  "message": "DROP TABLE queries are not allowed via this interface",
  "recommendation": "Use database admin tools for schema changes"
}
```

**Response** (500 Internal Server Error - SQL error):
```json
{
  "error": "SQL execution failed",
  "message": "syntax error at or near \"SELEC\"",
  "query": "SELEC * FROM users",
  "hint": "Check SQL syntax"
}
```

### POST /api/admin2/debug/database-backup
Trigger manual database backup.

**Request**:
```http
POST /api/admin2/debug/database-backup HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "success": true,
  "backup_id": "backup_2025-10-18_10-30-00",
  "timestamp": "2025-10-18T10:30:00Z",
  "size_mb": 245,
  "tables_backed_up": 8,
  "message": "Database backup completed successfully"
}
```

**Response** (500 Internal Server Error):
```json
{
  "error": "Backup failed",
  "message": "pg_dump command failed",
  "details": "Connection refused"
}
```

**Note**: Backup functionality depends on Neon database backup capabilities. This endpoint may trigger a Neon API call to create a backup, or may be informational only if Neon handles backups automatically.

### POST /api/admin2/debug/cleanup-orphaned-data
Clean up orphaned data (sessions, planning entries, etc.).

**Request**:
```http
POST /api/admin2/debug/cleanup-orphaned-data HTTP/1.1
Cookie: connect.sid=s%3A...
Content-Type: application/json

{
  "preview": true
}
```

**Request Body**:
- `preview` (optional): If `true`, show what will be deleted without deleting. Default `false`.

**Response** (200 OK - preview mode):
```json
{
  "preview": true,
  "orphaned_data": {
    "expired_sessions": 127,
    "orphaned_planning": 5,
    "orphaned_email_imports": 0
  },
  "message": "Preview only - no data deleted. Set preview=false to execute cleanup."
}
```

**Response** (200 OK - execute mode):
```json
{
  "success": true,
  "deleted": {
    "expired_sessions": 127,
    "orphaned_planning": 5,
    "orphaned_email_imports": 0
  },
  "total_deleted": 132,
  "timestamp": "2025-10-18T10:30:00Z",
  "message": "Database cleanup completed successfully"
}
```

## SQL Query Safety Checks

### Blocked Queries
These query types are blocked entirely:
- `DROP TABLE` - Schema changes must be done via migrations
- `DROP DATABASE` - Too dangerous
- `TRUNCATE` - Use DELETE with WHERE clause instead
- `ALTER TABLE` - Schema changes must be done via migrations

### Destructive Queries Requiring Confirmation
These require `confirm_destructive: true`:
- `UPDATE` - Modifies data
- `DELETE` - Removes data
- `INSERT` - Adds data (could cause conflicts)

### Safe Queries (No Confirmation)
- `SELECT` - Read-only
- `EXPLAIN` - Query plan analysis
- `SHOW` - Database configuration

### Query Validation
```javascript
const queryType = query.trim().toUpperCase().split(' ')[0];

// Block dangerous operations
const blocked = ['DROP', 'TRUNCATE', 'ALTER'];
if (blocked.includes(queryType)) {
  return { error: 'Dangerous query blocked' };
}

// Require confirmation for destructive operations
const destructive = ['UPDATE', 'DELETE', 'INSERT'];
if (destructive.includes(queryType) && !confirm_destructive) {
  return { error: 'Confirmation required' };
}

// Execute safe queries
if (queryType === 'SELECT' || queryType === 'EXPLAIN') {
  return executeQuery(query);
}
```

### Result Limits
- SELECT queries limited to 100 rows (prevent overwhelming UI)
- Query timeout: 10 seconds
- If more results needed, use LIMIT/OFFSET in query

## Database Cleanup Rules

### Expired Sessions
```sql
-- Delete sessions expired more than 24 hours ago
DELETE FROM session
WHERE expire < NOW() - INTERVAL '24 hours';
```

### Orphaned Planning Entries
```sql
-- Delete planning entries for non-existent tasks
DELETE FROM dagelijkse_planning
WHERE taak_id NOT IN (SELECT id FROM taken);
```

### Orphaned Email Imports
```sql
-- Delete email imports for deleted users
DELETE FROM email_imports
WHERE user_id NOT IN (SELECT id FROM users);
```

### Conservative Approach
- Only delete truly orphaned data (foreign key violations)
- Never delete recent data (<7 days old) even if orphaned
- Always show preview before executing
- Log all cleanup operations

## Audit Logging

All debug operations are logged:
```json
{
  "admin_user_id": 1,
  "action": "SQL_QUERY_EXECUTED",
  "query_type": "SELECT",
  "query": "SELECT * FROM users LIMIT 10",
  "rows_affected": 10,
  "timestamp": "2025-10-18T10:30:00Z",
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "message": "Specific error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Not authenticated",
  "message": "Please login as admin"
}
```

### 403 Forbidden
```json
{
  "error": "Not authorized",
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Server error",
  "message": "Operation failed",
  "details": "Specific technical error"
}
```

## Performance
- User data inspector: <500ms
- SQL query (SELECT): <1000ms
- Database backup: <30s (depends on database size)
- Cleanup preview: <500ms
- Cleanup execute: <5s

## Testing
Test these endpoints with curl:
```bash
# User data inspector
curl -b cookies.txt https://tickedify.com/api/admin2/debug/user-data/123

# SQL query (safe)
curl -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"query":"SELECT email FROM users LIMIT 5","confirm_destructive":false}' \
  https://tickedify.com/api/admin2/debug/sql-query

# SQL query (destructive - requires confirmation)
curl -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"query":"UPDATE users SET subscription_tier = '\''premium'\'' WHERE id = 123","confirm_destructive":true}' \
  https://tickedify.com/api/admin2/debug/sql-query

# Database backup
curl -b cookies.txt -X POST https://tickedify.com/api/admin2/debug/database-backup

# Cleanup preview
curl -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"preview":true}' \
  https://tickedify.com/api/admin2/debug/cleanup-orphaned-data

# Cleanup execute
curl -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"preview":false}' \
  https://tickedify.com/api/admin2/debug/cleanup-orphaned-data
```

## Security Considerations

- **SQL Injection**: Always use parameterized queries where possible
- **Query Timeout**: Prevent long-running queries from blocking server
- **Result Limit**: Prevent memory exhaustion from large result sets
- **Audit Trail**: Log all SQL queries for compliance and debugging
- **Destructive Operations**: Require explicit confirmation
- **Schema Changes**: Block via this interface, use migrations instead
- **Read-Only Option**: Consider adding read-only mode for junior admins
