# Quickstart: Settings Screen Testing

**Feature**: 056-je-mag-een (Settings Screen)
**Date**: 2025-11-05
**Environment**: dev.tickedify.com (Staging)

## Prerequisites

- Staging environment deployed with Settings feature
- Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- curl installed with `-s -L -k` flags
- Browser for UI testing

## Quick Test Sequence

Execute these tests in order to verify the complete Settings screen functionality.

### 0. Environment Setup

```bash
# Set base URL
export BASE_URL="https://dev.tickedify.com"

# Get session cookie (login)
curl -s -L -k -c cookies.txt -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}'

# Verify login
curl -s -L -k -b cookies.txt "$BASE_URL/api/version"
```

**Expected**: Login success, version endpoint returns current version

---

### 1. Database Migration Verification

**Test**: Verify user_settings table exists with correct schema

```bash
# Via psql (if database access available)
psql $DATABASE_URL -c "\d user_settings"
```

**Expected Output**:
```
Table "public.user_settings"
   Column    |           Type           | Nullable |         Default
-------------+--------------------------+----------+--------------------------
 id          | integer                  | not null | nextval('user_settings_id_seq')
 user_id     | integer                  | not null |
 settings    | jsonb                    |          | '{}'::jsonb
 created_at  | timestamp                |          | now()
 updated_at  | timestamp                |          | now()

Indexes:
    "user_settings_pkey" PRIMARY KEY, btree (id)
    "user_settings_user_id_key" UNIQUE CONSTRAINT, btree (user_id)
    "idx_user_settings_user_id" btree (user_id)
Foreign-key constraints:
    "user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES gebruikers(id) ON DELETE CASCADE
```

**Verification**:
- ✅ Table exists
- ✅ All columns present with correct types
- ✅ UNIQUE constraint on user_id
- ✅ Foreign key to gebruikers(id) with CASCADE
- ✅ Index on user_id

---

### 2. API Test: GET Settings (No Settings Yet)

**Test**: Retrieve settings for user who hasn't created settings yet

```bash
curl -s -L -k -b cookies.txt "$BASE_URL/api/user-settings" | jq
```

**Expected Response**:
```json
{
  "success": true,
  "settings": null
}
```

**Verification**:
- ✅ Status 200
- ✅ `success: true`
- ✅ `settings: null` (no settings exist yet)

---

### 3. API Test: POST Settings (Create New)

**Test**: Create new settings for user

```bash
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{"settings":{"ui":{"theme":"dark","language":"en"}}}' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "settings": {
    "id": 123,
    "user_id": 45,
    "settings": {
      "ui": {
        "theme": "dark",
        "language": "en"
      }
    },
    "created_at": "2025-11-05T10:30:00Z",
    "updated_at": "2025-11-05T10:30:00Z"
  }
}
```

**Verification**:
- ✅ Status 200
- ✅ `success: true`
- ✅ `settings` object returned with id, user_id
- ✅ `settings.settings` contains the posted data
- ✅ `created_at` and `updated_at` timestamps present

---

### 4. API Test: GET Settings (After Creation)

**Test**: Verify settings persist after creation

```bash
curl -s -L -k -b cookies.txt "$BASE_URL/api/user-settings" | jq
```

**Expected Response**:
```json
{
  "success": true,
  "settings": {
    "id": 123,
    "user_id": 45,
    "settings": {
      "ui": {
        "theme": "dark",
        "language": "en"
      }
    },
    "created_at": "2025-11-05T10:30:00Z",
    "updated_at": "2025-11-05T10:30:00Z"
  }
}
```

**Verification**:
- ✅ Same settings returned as in test 3
- ✅ Data persisted correctly in database

---

### 5. API Test: POST Settings (Update Existing)

**Test**: Update existing settings

```bash
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{"settings":{"ui":{"theme":"light"},"notifications":{"email":true}}}' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "settings": {
    "id": 123,
    "user_id": 45,
    "settings": {
      "ui": {
        "theme": "light"
      },
      "notifications": {
        "email": true
      }
    },
    "created_at": "2025-11-05T10:30:00Z",
    "updated_at": "2025-11-05T10:45:00Z"
  }
}
```

**Verification**:
- ✅ Same `id` (record updated, not created new)
- ✅ `settings` object replaced with new data
- ✅ `updated_at` changed (later than created_at)
- ✅ `created_at` unchanged

---

### 6. API Test: POST Empty Settings

**Test**: Save empty settings object

```bash
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{"settings":{}}' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "settings": {
    "id": 123,
    "user_id": 45,
    "settings": {},
    "created_at": "2025-11-05T10:30:00Z",
    "updated_at": "2025-11-05T10:50:00Z"
  }
}
```

**Verification**:
- ✅ Empty object `{}` accepted and stored
- ✅ No error thrown for empty settings

---

### 7. API Test: Error Handling (No Auth)

**Test**: Access settings without authentication

```bash
curl -s -L -k "$BASE_URL/api/user-settings" | jq
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Unauthorized - please log in"
}
```

**Verification**:
- ✅ Status 401
- ✅ `success: false`
- ✅ Appropriate error message

---

### 8. API Test: Error Handling (Invalid JSON)

**Test**: POST invalid JSON data

```bash
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{"settings": invalid}' | jq
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Invalid JSON format"
}
```

**Verification**:
- ✅ Status 400
- ✅ `success: false`
- ✅ Error message indicates JSON parsing issue

---

### 9. UI Test: Sidebar Navigation

**Test**: Verify Settings menu item appears in sidebar with correct spacing

**Steps**:
1. Open browser to https://dev.tickedify.com/app
2. Log in with test credentials
3. Locate Settings menu item in sidebar
4. Verify position (below Search)
5. Verify spacing (extra gap like Trash → Daily Planning)
6. Verify icon (gear icon visible)

**Expected**:
- ✅ Settings menu item visible
- ✅ Positioned below Search item
- ✅ Extra vertical spacing (~20-30px) between Search and Settings
- ✅ Gear icon (⚙️ or SVG) displayed
- ✅ Text reads "Settings"

**Visual Reference**:
```
┌─────────────────┐
│ Inbox           │
│ Follow-up       │
│ ...             │
│ Search          │
│                 │  ← Extra spacing
│ ⚙️ Settings     │  ← Settings item
│                 │  ← Extra spacing
│ 🗑️ Trash        │
│ 📅 Daily Planning│
└─────────────────┘
```

---

### 10. UI Test: Settings Screen Navigation

**Test**: Click Settings menu item and verify screen navigation

**Steps**:
1. In browser at https://dev.tickedify.com/app (logged in)
2. Click "Settings" menu item
3. Verify URL changes (if routing implemented)
4. Verify Settings screen displays

**Expected**:
- ✅ Click navigates to Settings screen
- ✅ URL reflects Settings route (e.g., #settings or /settings)
- ✅ Settings screen visible (main content area)
- ✅ Other screens hidden (inbox, daily planning, etc.)

---

### 11. UI Test: Settings Screen Content

**Test**: Verify Settings screen displays placeholder content correctly

**Steps**:
1. Navigate to Settings screen (from test 10)
2. Verify page structure and content

**Expected Elements**:
- ✅ Header: "Settings" with gear icon
- ✅ Content: Placeholder text (e.g., "Settings will be available here")
- ✅ Footer: "Save" button (may be disabled initially)
- ✅ Consistent styling with other Tickedify screens
- ✅ Responsive layout (works on mobile/tablet/desktop)

**Visual Structure**:
```
┌────────────────────────────────────┐
│ ⚙️ Settings                        │  ← Header
│────────────────────────────────────│
│                                    │
│  Settings will be available here   │  ← Placeholder content
│                                    │
│────────────────────────────────────│
│                     [ Save ]       │  ← Save button (footer)
└────────────────────────────────────┘
```

---

### 12. UI Test: Active Menu Item Highlight

**Test**: Verify Settings menu item highlights when active

**Steps**:
1. Navigate to Settings screen
2. Check if Settings menu item has active/selected state
3. Navigate to another screen (e.g., Inbox)
4. Verify Settings menu item no longer highlighted

**Expected**:
- ✅ Settings item highlighted/selected when on Settings screen
- ✅ Active state styling matches other menu items' active states
- ✅ Only one menu item highlighted at a time

---

### 13. Performance Test: API Response Time

**Test**: Verify API endpoints respond within performance goals

```bash
# Test GET performance
time curl -s -L -k -b cookies.txt "$BASE_URL/api/user-settings" > /dev/null

# Test POST performance
time curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{"settings":{"test":"value"}}' > /dev/null
```

**Expected**:
- ✅ GET response time < 200ms
- ✅ POST response time < 200ms
- ✅ No noticeable delay in UI navigation

---

### 14. Regression Test: Existing Features

**Test**: Verify Settings feature doesn't break existing functionality

**Checks**:
1. Inbox still loads correctly
2. Daily Planning still works
3. Task creation/editing unaffected
4. Search functionality works
5. Trash functionality works
6. Other navigation items still work

**Expected**:
- ✅ All existing features work normally
- ✅ No console errors
- ✅ No layout issues
- ✅ No navigation conflicts

---

## Test Results Summary

Track test results here:

| Test | Status | Notes |
|------|--------|-------|
| 1. Database Migration | ⬜ | |
| 2. GET No Settings | ⬜ | |
| 3. POST Create | ⬜ | |
| 4. GET After Create | ⬜ | |
| 5. POST Update | ⬜ | |
| 6. POST Empty | ⬜ | |
| 7. Error No Auth | ⬜ | |
| 8. Error Invalid JSON | ⬜ | |
| 9. UI Sidebar | ⬜ | |
| 10. UI Navigation | ⬜ | |
| 11. UI Screen Content | ⬜ | |
| 12. UI Active State | ⬜ | |
| 13. Performance | ⬜ | |
| 14. Regression | ⬜ | |

Legend: ⬜ Not tested | ✅ Pass | ❌ Fail

---

## Troubleshooting

### Issue: 401 Unauthorized on API calls

**Solution**: Re-login and get fresh session cookie
```bash
curl -s -L -k -c cookies.txt -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}'
```

### Issue: Settings menu item not visible

**Possible Causes**:
- CSS not loaded correctly (check browser DevTools)
- JavaScript navigation code not deployed
- Deployment not completed yet

**Solution**: Wait 30 seconds for deployment, hard refresh browser (Cmd+Shift+R)

### Issue: Database table not found

**Possible Causes**:
- Migration not run on staging database
- Wrong database connection

**Solution**: Verify migration ran, check server logs

### Issue: JSONB errors in PostgreSQL

**Possible Causes**:
- Invalid JSON syntax in POST data
- PostgreSQL version < 9.4 (JSONB support)

**Solution**: Validate JSON before POST, check PostgreSQL version

---

## Next Steps After Testing

1. ✅ All tests pass → Ready for user acceptance testing
2. ❌ Any test fails → Debug, fix, redeploy, retest
3. Document any issues found in GitHub issues
4. Update changelog with testing results
5. Plan next settings feature additions (theme, notifications, etc.)

---

## Cleanup After Testing

```bash
# Optional: Reset settings to empty state
curl -s -L -k -b cookies.txt -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{"settings":{}}'

# Remove cookie file
rm cookies.txt
```

---

## References

- Feature Spec: `specs/056-je-mag-een/spec.md`
- API Contract: `specs/056-je-mag-een/contracts/user-settings-api.yml`
- Data Model: `specs/056-je-mag-een/data-model.md`
- Test Environment: https://dev.tickedify.com/app
