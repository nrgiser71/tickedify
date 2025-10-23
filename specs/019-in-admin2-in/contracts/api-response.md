# API Contract: GET /api/admin2/users/:id

**Endpoint**: `GET /api/admin2/users/:id`
**Authentication**: Required (Admin only via `requireAdmin` middleware)
**Date**: 2025-10-19
**Status**: Existing contract - Fix ensures implementation matches spec

## Request

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | User identifier (e.g., `user_1760528080063_08xf0g9r1`) |

### Headers
```
Cookie: connect.sid=<session-id>
```

### Query Parameters
None

## Response

### Success Response (200 OK)

**Condition**: User exists and all queries succeed

**Body**:
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "naam": "string|null",
    "account_type": "admin|user",
    "subscription_tier": "free|monthly_7|monthly_8|yearly_70|yearly_80|trial",
    "subscription_status": "active|trial|cancelled|expired|null",
    "trial_end_date": "YYYY-MM-DD|null",
    "actief": "boolean",
    "created_at": "ISO 8601 timestamp",
    "last_login": "ISO 8601 timestamp|null",
    "onboarding_video_seen": "boolean",
    "onboarding_video_seen_at": "ISO 8601 timestamp|null"
  },
  "tasks": {
    "summary": {
      "total": "number",
      "completed": "number",
      "completion_rate": "number (0.0 to 1.0)",
      "pending": "number",
      "recurring": "number"
    },
    "by_project": [
      {
        "project": "string",    // ✅ FIX: Aliased from project_id
        "count": "number"
      }
    ],
    "by_context": [
      {
        "context": "string",    // ✅ FIX: Aliased from context_id
        "count": "number"
      }
    ]
  },
  "emails": {
    "summary": {
      "total": "number",
      "recent_30d": "number"
    },
    "recent": [
      {
        "email_from": "string",
        "email_subject": "string",
        "imported_at": "ISO 8601 timestamp"
      }
    ]
  },
  "subscription": {
    "status": "active|trial|cancelled|expired|null",
    "tier": "free|monthly_7|monthly_8|yearly_70|yearly_80|trial",
    "trial_end_date": "YYYY-MM-DD|null",
    "plan_name": "string|null",
    "price_monthly": "number|null"
  }
}
```

### Error Responses

#### 400 Bad Request
**Condition**: Empty or invalid user ID

**Body**:
```json
{
  "error": "Invalid user ID",
  "message": "User ID must not be empty"
}
```

#### 401 Unauthorized
**Condition**: Not authenticated or not admin

**Body**:
```json
{
  "error": "Unauthorized",
  "message": "Admin access required"
}
```

#### 404 Not Found
**Condition**: User ID not found in database

**Body**:
```json
{
  "error": "User not found",
  "message": "No user with ID <user_id>"
}
```

#### 500 Internal Server Error
**Condition**: Database query failure or server error

**Body**:
```json
{
  "error": "Server error",
  "message": "Failed to get user details",
  "details": "string (only in development mode)"
}
```

**Current Bug**: Queries 3 and 4 fail with SQL column name error causing this response

## Fix Impact

### Before Fix
Queries 3 and 4 fail with:
```
ERROR: column "project" does not exist
ERROR: column "context" does not exist
```

Response: **500 Internal Server Error**

### After Fix
Queries 3 and 4 succeed with AS aliasing:
```sql
SELECT project_id AS project, COUNT(*) as count ...
SELECT context_id AS context, COUNT(*) as count ...
```

Response: **200 OK** with correct data

## Frontend Consumption

**File**: `public/admin2.js`
**Function**: `loadUserDetails(userId)` (line 1224)

**Usage**:
```javascript
const data = await API.users.get(userId);

// Frontend expects these field names:
data.tasks.by_project.forEach(p => {
  console.log(p.project, p.count);  // ✅ Expects 'project' field
});

data.tasks.by_context.forEach(c => {
  console.log(c.context, c.count);  // ✅ Expects 'context' field
});
```

## Contract Test Requirements

### Test Cases

1. **Valid User ID - Success**
   - Given: Valid user ID with tasks
   - When: GET /api/admin2/users/:id
   - Then: 200 OK with complete response schema
   - Assert: `tasks.by_project` is array with `project` field
   - Assert: `tasks.by_context` is array with `context` field

2. **Valid User ID - No Tasks**
   - Given: Valid user ID with zero tasks
   - When: GET /api/admin2/users/:id
   - Then: 200 OK with empty arrays
   - Assert: `tasks.by_project` is `[]`
   - Assert: `tasks.by_context` is `[]`

3. **Invalid User ID - Not Found**
   - Given: Non-existent user ID
   - When: GET /api/admin2/users/:id
   - Then: 404 Not Found

4. **Empty User ID - Bad Request**
   - Given: Empty string user ID
   - When: GET /api/admin2/users/:id
   - Then: 400 Bad Request

5. **Unauthorized Access**
   - Given: No admin session
   - When: GET /api/admin2/users/:id
   - Then: 401 Unauthorized

## Implementation Notes

### Database Queries Executed
1. User details query (users + subscriptions)
2. Task summary query (aggregate counts)
3. **Tasks by project query** ✅ FIX REQUIRED
4. **Tasks by context query** ✅ FIX REQUIRED
5. Email summary query
6. Recent emails query
7. Subscription details query (with payment_configurations)

### Performance Characteristics
- Expected: < 500ms p95
- Queries: 7 total (2 require fixes)
- Database: PostgreSQL (Neon serverless)

### Backwards Compatibility
- ✅ Fix maintains exact response schema
- ✅ No frontend changes required
- ✅ API contract unchanged

## Checklist

- [x] Request parameters documented
- [x] Success response schema defined
- [x] Error responses documented
- [x] Frontend usage documented
- [x] Fix impact explained
- [x] Test cases defined
- [x] Performance characteristics noted
- [x] Backwards compatibility confirmed
