# API Contract: User Management

**Feature**: Admin Dashboard v2
**Date**: 2025-10-18
**Version**: 1.0

## Base Path
All user management endpoints are under `/api/admin2/users/`

## Authentication
All endpoints require:
- Valid session cookie with `account_type = 'admin'`
- Returns `401 Unauthorized` if not authenticated
- Returns `403 Forbidden` if not admin

## Endpoints

### GET /api/admin2/users/search
Search for users by email, name, or ID.

**Request**:
```http
GET /api/admin2/users/search?q=jan HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Query Parameters**:
- `q` (required): Search term (min 2 characters)
- `limit` (optional): Max results, default 50

**Response** (200 OK):
```json
{
  "query": "jan",
  "results": [
    {
      "id": 1,
      "email": "jan@example.com",
      "naam": "Jan Buskens",
      "account_type": "admin",
      "subscription_tier": "premium",
      "subscription_status": "active",
      "trial_end_date": null,
      "actief": true,
      "created_at": "2025-01-15T10:00:00Z",
      "last_login": "2025-10-18T09:30:00Z"
    }
    // ... up to 50 results
  ],
  "count": 1,
  "total_users": 156
}
```

**Response** (400 Bad Request - query too short):
```json
{
  "error": "Invalid query",
  "message": "Search term must be at least 2 characters"
}
```

### GET /api/admin2/users/:id
Get detailed information about a specific user.

**Request**:
```http
GET /api/admin2/users/123 HTTP/1.1
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
    "last_login": "2025-10-17T16:45:00Z",
    "onboarding_video_seen": true,
    "onboarding_video_seen_at": "2025-10-12T14:05:00Z"
  },
  "tasks": {
    "total": 45,
    "completed": 28,
    "active": 17,
    "recurring": 5,
    "blocked": 2,
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
    "total_imports": 12,
    "processed": 10,
    "first_import": "2025-10-13T08:00:00Z",
    "last_import": "2025-10-17T11:30:00Z",
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

### PUT /api/admin2/users/:id/tier
Change user's subscription tier.

**Request**:
```http
PUT /api/admin2/users/123/tier HTTP/1.1
Cookie: connect.sid=s%3A...
Content-Type: application/json

{
  "tier": "premium"
}
```

**Request Body**:
- `tier` (required): One of ['free', 'premium', 'enterprise']

**Response** (200 OK):
```json
{
  "success": true,
  "user_id": 123,
  "old_tier": "free",
  "new_tier": "premium",
  "updated_at": "2025-10-18T10:00:00Z"
}
```

**Response** (400 Bad Request - invalid tier):
```json
{
  "error": "Invalid tier",
  "message": "Tier must be one of: free, premium, enterprise"
}
```

### PUT /api/admin2/users/:id/trial
Extend user's trial period.

**Request**:
```http
PUT /api/admin2/users/123/trial HTTP/1.1
Cookie: connect.sid=s%3A...
Content-Type: application/json

{
  "trial_end_date": "2025-11-01"
}
```

**Request Body**:
- `trial_end_date` (required): ISO date string (YYYY-MM-DD), must be future date

**Response** (200 OK):
```json
{
  "success": true,
  "user_id": 123,
  "old_trial_end": "2025-10-25",
  "new_trial_end": "2025-11-01",
  "updated_at": "2025-10-18T10:00:00Z"
}
```

**Response** (400 Bad Request - past date):
```json
{
  "error": "Invalid date",
  "message": "Trial end date must be in the future"
}
```

### PUT /api/admin2/users/:id/block
Block user account (prevent login).

**Request**:
```http
PUT /api/admin2/users/123/block HTTP/1.1
Cookie: connect.sid=s%3A...
Content-Type: application/json

{
  "blocked": true
}
```

**Request Body**:
- `blocked` (required): Boolean (true = block, false = unblock)

**Response** (200 OK):
```json
{
  "success": true,
  "user_id": 123,
  "blocked": true,
  "sessions_invalidated": 2,
  "updated_at": "2025-10-18T10:00:00Z"
}
```

**Response** (403 Forbidden - self-block):
```json
{
  "error": "Cannot block self",
  "message": "Admins cannot block their own account"
}
```

### DELETE /api/admin2/users/:id
Delete user account and all associated data.

**Request**:
```http
DELETE /api/admin2/users/123 HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "success": true,
  "user_id": 123,
  "email": "user@example.com",
  "deleted_at": "2025-10-18T10:00:00Z",
  "cascade_deleted": {
    "tasks": 45,
    "email_imports": 12,
    "sessions": 1
  }
}
```

**Response** (403 Forbidden - self-delete):
```json
{
  "error": "Cannot delete self",
  "message": "Admins cannot delete their own account"
}
```

**Response** (403 Forbidden - last admin):
```json
{
  "error": "Cannot delete last admin",
  "message": "At least one admin account must remain"
}
```

### POST /api/admin2/users/:id/reset-password
Reset user's password (admin-initiated).

**Request**:
```http
POST /api/admin2/users/123/reset-password HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "success": true,
  "user_id": 123,
  "email": "user@example.com",
  "new_password": "Xk9mP2zL5qR8",
  "message": "Provide this password to the user securely"
}
```

**Note**: New password is randomly generated, 12 characters, alphanumeric.

### POST /api/admin2/users/:id/logout
Force logout user (invalidate all sessions).

**Request**:
```http
POST /api/admin2/users/123/logout HTTP/1.1
Cookie: connect.sid=s%3A...
```

**Response** (200 OK):
```json
{
  "success": true,
  "user_id": 123,
  "sessions_invalidated": 3,
  "timestamp": "2025-10-18T10:00:00Z"
}
```

## Security Constraints

### Self-Action Prevention
- Admins cannot block their own account
- Admins cannot delete their own account
- Admins cannot force logout themselves (but can via normal logout)

### Last Admin Protection
- System prevents deletion of last admin account
- Query: `SELECT COUNT(*) FROM users WHERE account_type = 'admin'`
- If count = 1 and target user is admin → reject with 403

### Audit Logging
All user management actions are logged:
```json
{
  "admin_user_id": 1,
  "action": "TIER_CHANGE",
  "target_user_id": 123,
  "old_value": "free",
  "new_value": "premium",
  "timestamp": "2025-10-18T10:00:00Z",
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "message": "Specific validation error message"
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
  "message": "Specific authorization error"
}
```

### 404 Not Found
```json
{
  "error": "User not found",
  "message": "No user with ID {id}"
}
```

### 500 Internal Server Error
```json
{
  "error": "Server error",
  "message": "Failed to {action}"
}
```

## Performance
- Search: <500ms
- Get user details: <300ms
- Update operations: <200ms
- Delete: <1000ms (cascade delete)

## Testing
Test these endpoints with curl:
```bash
# Search users
curl -b cookies.txt "https://tickedify.com/api/admin2/users/search?q=jan"

# Get user details
curl -b cookies.txt https://tickedify.com/api/admin2/users/123

# Change tier
curl -b cookies.txt -X PUT -H "Content-Type: application/json" \
  -d '{"tier":"premium"}' https://tickedify.com/api/admin2/users/123/tier

# Extend trial
curl -b cookies.txt -X PUT -H "Content-Type: application/json" \
  -d '{"trial_end_date":"2025-11-01"}' https://tickedify.com/api/admin2/users/123/trial

# Block user
curl -b cookies.txt -X PUT -H "Content-Type: application/json" \
  -d '{"blocked":true}' https://tickedify.com/api/admin2/users/123/block

# Delete user
curl -b cookies.txt -X DELETE https://tickedify.com/api/admin2/users/123

# Reset password
curl -b cookies.txt -X POST https://tickedify.com/api/admin2/users/123/reset-password

# Force logout
curl -b cookies.txt -X POST https://tickedify.com/api/admin2/users/123/logout
```
