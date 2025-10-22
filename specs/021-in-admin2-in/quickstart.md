# Quickstart: Admin2 Delete User Account Bug Fix Testing

**Date**: 2025-10-20
**Feature**: 021-in-admin2-in

## Prerequisites
- Access to Admin2 interface at tickedify.com/admin2.html
- Admin credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Test user with string-format ID available in system

## Test Scenario 1: Delete User via Admin2 UI

### Setup
1. Navigate to https://tickedify.com/admin2.html
2. Login with admin credentials
3. Click on "User Management" section

### Execution Steps
1. **Search for test user**:
   - Enter search term in user search box
   - Verify users are listed with string IDs (e.g., `user_1760531416053_qwljhrwxp`)

2. **Select user to delete**:
   - Click on a user row to view details
   - Verify user details load correctly
   - Note the user ID format (should be string)

3. **Initiate deletion**:
   - Click "Delete User Account" button
   - Confirm first prompt
   - Check the confirmation checkbox
   - Confirm second prompt
   - Confirm final prompt

4. **Verify success**:
   - Check for success message showing cascade deletion counts
   - Verify user is removed from user list
   - Verify no console errors

### Expected Results
- ✅ DELETE request succeeds with 200 status
- ✅ Success message displays:
  ```
  User deleted successfully

  Cascade deleted:
  - X tasks
  - X email imports
  - X sessions
  ```
- ✅ User disappears from user management list
- ✅ No browser console errors

### Failure Indicators
- ❌ 400 Bad Request error
- ❌ Console error: "User ID must be a positive number"
- ❌ User still appears in list after deletion

## Test Scenario 2: Direct API Testing

### Using curl
```bash
# Get session cookie first (login)
curl -s -L -k -c cookies.txt -X POST https://tickedify.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}'

# Delete user with string ID
curl -s -L -k -b cookies.txt -X DELETE \
  https://tickedify.com/api/admin2/users/user_1760531416053_qwljhrwxp
```

### Expected Response
```json
{
  "success": true,
  "user_id": "user_1760531416053_qwljhrwxp",
  "cascade_deleted": {
    "tasks": 42,
    "email_imports": 15,
    "sessions": 3
  }
}
```

## Test Scenario 3: Edge Cases

### 3A: Empty User ID
**Request**: `DELETE /api/admin2/users/`
**Expected**: 404 Not Found (route not matched)

### 3B: Whitespace User ID
**Request**: `DELETE /api/admin2/users/%20%20%20` (URL-encoded spaces)
**Expected**: 400 Bad Request
```json
{
  "error": "Invalid user ID",
  "message": "User ID must not be empty"
}
```

### 3C: Non-existent User ID
**Request**: `DELETE /api/admin2/users/user_9999999999999_nonexistent`
**Expected**: 404 Not Found
```json
{
  "error": "Not found",
  "message": "User not found"
}
```

### 3D: Self-deletion Attempt
**Setup**: Login as user with ID `user_123_abc`
**Request**: `DELETE /api/admin2/users/user_123_abc`
**Expected**: 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Cannot delete your own account"
}
```

### 3E: Non-admin Attempt
**Setup**: Login as regular (non-admin) user
**Request**: `DELETE /api/admin2/users/user_1760531416053_qwljhrwxp`
**Expected**: 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

## Test Scenario 4: Verify Other Admin2 Endpoints

### Check Consistency Across Endpoints
Test that all admin2 user endpoints accept string IDs:

1. **GET user details**: ✅ Should work (already fixed)
   ```bash
   curl -s -L -k -b cookies.txt \
     https://tickedify.com/api/admin2/users/user_1760531416053_qwljhrwxp
   ```

2. **PUT trial extension**: Verify accepts string ID
   ```bash
   curl -s -L -k -b cookies.txt -X PUT \
     https://tickedify.com/api/admin2/users/user_1760531416053_qwljhrwxp/trial \
     -H "Content-Type: application/json" \
     -d '{"trial_end_date":"2025-12-31"}'
   ```

3. **PUT block user**: Verify accepts string ID
   ```bash
   curl -s -L -k -b cookies.txt -X PUT \
     https://tickedify.com/api/admin2/users/user_1760531416053_qwljhrwxp/block \
     -H "Content-Type: application/json" \
     -d '{"blocked":true}'
   ```

4. **POST force logout**: Verify accepts string ID
   ```bash
   curl -s -L -k -b cookies.txt -X POST \
     https://tickedify.com/api/admin2/users/user_1760531416053_qwljhrwxp/logout
   ```

## Regression Testing

After fix deployment, verify:
1. ✅ Delete user with string ID works
2. ✅ All cascade deletions execute correctly
3. ✅ Security checks still enforce (no self-delete, admin-only)
4. ✅ Other admin2 endpoints remain functional
5. ✅ No breaking changes to API contracts

## Performance Validation

Monitor DELETE operation performance:
- Response time should be < 2 seconds for typical user
- Database cascade deletes should complete successfully
- No memory leaks or connection pool exhaustion

## Cleanup

After testing:
- Verify test users are properly deleted
- Check no orphaned data remains in database
- Confirm audit logs capture deletion events

---

**Time Estimate**: 15-20 minutes for complete test suite
**Critical Path**: Test Scenario 1 (UI workflow) + Test Scenario 2 (API direct)
