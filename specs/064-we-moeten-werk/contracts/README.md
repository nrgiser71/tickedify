# API Contracts: Test Environment Management

**Feature**: 064-we-moeten-werk
**Date**: 2025-11-11

## Overview

This directory contains OpenAPI 3.0 specifications for the Test Environment Management API endpoints.

## Files

- **admin-test-db.yml**: Complete OpenAPI spec for 7 admin endpoints

## Endpoints Summary

### Database Operations
1. `GET /api/admin/test-db/verify` - Verify both database connections
2. `POST /api/admin/test-db/copy-schema` - Copy schema from production to test
3. `POST /api/admin/test-db/clear` - Clear all data from test database

### User Management
4. `GET /api/admin/production-users` - List production users
5. `GET /api/admin/test-users` - List test database users
6. `POST /api/admin/test-db/copy-user` - Copy user from production to test
7. `DELETE /api/admin/test-db/user/:userId` - Delete user from test database

## Authentication

All endpoints require admin authentication via `requireAdmin` middleware (existing pattern in server.js).

## Testing the Contracts

### Using curl (with admin session)

```bash
# 1. Verify database connections
curl -s -L -k https://dev.tickedify.com/api/admin/test-db/verify \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq

# Expected response:
# {
#   "production": { "connected": true, "latency": 45 },
#   "test": { "connected": true, "latency": 52, "configured": true }
# }

# 2. Copy schema to test database
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/copy-schema \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"confirm": true}' \
  | jq

# Expected response:
# {
#   "success": true,
#   "tablesCreated": 12,
#   "duration": 28000,
#   "details": "Schema copied successfully with all constraints and indexes"
# }

# 3. List production users
curl -s -L -k https://dev.tickedify.com/api/admin/production-users \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq

# Expected response:
# {
#   "users": [
#     { "id": 1, "username": "jan@buskens.be", "email": "jan@buskens.be" },
#     { "id": 2, "username": "user2", "email": "user2@example.com" }
#   ]
# }

# 4. Copy user to test database
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/copy-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"userId": 1, "confirm": true}' \
  | jq

# Expected response:
# {
#   "success": true,
#   "userEmail": "jan@buskens.be",
#   "tasksCopied": 150,
#   "projectsCopied": 5,
#   "contextsCopied": 3,
#   "attachmentsCopied": 12,
#   "duration": 8500
# }

# 5. List test database users
curl -s -L -k https://dev.tickedify.com/api/admin/test-users \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq

# Expected response:
# {
#   "users": [
#     { "id": 1, "username": "jan@buskens.be", "email": "jan@buskens.be" }
#   ]
# }

# 6. Delete user from test database
curl -s -L -k -X DELETE https://dev.tickedify.com/api/admin/test-db/user/1 \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq

# Expected response:
# {
#   "success": true,
#   "deletedTasks": 150,
#   "deletedAttachments": 12,
#   "deletedFeedback": 2
# }

# 7. Clear test database
curl -s -L -k -X POST https://dev.tickedify.com/api/admin/test-db/clear \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"confirm": true}' \
  | jq

# Expected response:
# {
#   "success": true,
#   "tablesCleared": 12,
#   "totalRowsDeleted": 1523
# }
```

## Error Responses

### 400 Bad Request
Missing or invalid `confirm` parameter:
```json
{
  "error": "BadRequest",
  "message": "Confirmation required for destructive operation"
}
```

### 404 User Not Found
User doesn't exist in specified database:
```json
{
  "error": "UserNotFound",
  "message": "User ID 999 not found in production database"
}
```

### 409 User Already Exists
Duplicate prevention (user already in test DB):
```json
{
  "error": "UserAlreadyExists",
  "message": "User jan@buskens.be already exists in test database",
  "details": "Delete existing user from test database before retrying copy"
}
```

### 500 Server Error
Database operation failure:
```json
{
  "error": "InternalServerError",
  "message": "Database operation failed",
  "details": "Connection timeout to test database"
}
```

## Contract Testing

**Contract tests** should verify:
1. Request/response schema validation
2. Status code correctness
3. Error response format
4. Authentication requirement

**Contract tests do NOT**:
- Test business logic (integration tests)
- Test database state (E2E tests)
- Test UI interactions (UI tests)

## Implementation Notes

1. All endpoints use existing `requireAdmin` middleware (server.js pattern)
2. Environment detection via `VERCEL_ENV` (production vs preview)
3. Dual connection pools: `productionPool` and `testPool`
4. Error handling: Try-catch with appropriate HTTP status codes
5. Confirmation pattern: All destructive operations require `{ confirm: true }`

## Validation

To validate OpenAPI spec:
```bash
# Using swagger-cli (if installed)
swagger-cli validate admin-test-db.yml

# Using online validator
# Upload to https://editor.swagger.io
```

## Next Steps

1. Implement endpoints in server.js (Phase 4)
2. Write contract tests for each endpoint
3. Integrate with admin2.html frontend (Phase 4)
4. Execute integration tests from quickstart.md

---
**Contract version**: 1.0.0
**Last updated**: 2025-11-11
