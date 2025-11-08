# Quickstart Testing Guide: Account Settings Block

**Feature**: 058-dan-mag-je
**Version**: 0.21.93
**Test Environment**: dev.tickedify.com
**Test Credentials**: jan@buskens.be / qyqhut-muDvop-fadki9

## Prerequisites

1. **Environment**: Staging deployment on dev.tickedify.com
2. **Database**: Migration applied (users table extensions + password_reset_tokens table)
3. **Email**: Mailgun configured for password reset emails
4. **Authentication**: Test user logged in for account info tests

## Test Scenarios

### 1. View Account Information (Happy Path)

**Objective**: Verify account information displays correctly in Settings screen

**Steps**:
```bash
# 1. Login as test user
curl -s -L -k -X POST https://dev.tickedify.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}' \
  -c cookies.txt

# 2. Fetch account information
curl -s -L -k https://dev.tickedify.com/api/account \
  -b cookies.txt | jq
```

**Expected Response**:
```json
{
  "id": 1,
  "name": "Jan Buskens",
  "created_at": "2025-10-01T10:30:00.000Z",
  "member_since": "October 2025",
  "last_login": "2025-11-05T08:15:00.000Z",
  "last_login_relative": "3 hours ago",
  "total_tasks_created": 42,
  "total_tasks_completed": 18
}
```

**Success Criteria**:
- ✅ Status code: 200
- ✅ Response contains all required fields
- ✅ `member_since` is human-readable (e.g., "October 2025")
- ✅ `last_login_relative` is human-readable (e.g., "3 hours ago" or "Never")
- ✅ Task counts are non-negative integers

---

### 2. View Account Information (Unauthenticated)

**Objective**: Verify authentication requirement for account endpoint

**Steps**:
```bash
# Attempt to fetch account info without authentication
curl -s -L -k https://dev.tickedify.com/api/account | jq
```

**Expected Response**:
```json
{
  "error": "Not authenticated"
}
```

**Success Criteria**:
- ✅ Status code: 401
- ✅ Error message indicates authentication required

---

### 3. Request Password Reset (Valid Email)

**Objective**: Verify password reset email is sent for existing user

**Steps**:
```bash
# Request password reset
curl -s -L -k -X POST https://dev.tickedify.com/api/account/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be"}' | jq
```

**Expected Response**:
```json
{
  "message": "Password reset email sent. Check your inbox.",
  "expires_in_hours": 24
}
```

**Success Criteria**:
- ✅ Status code: 200
- ✅ Success message returned
- ✅ Email received in inbox with reset link
- ✅ Database: New row in `password_reset_tokens` table for user

**Manual Verification**:
- Check Mailgun logs for sent email
- Verify email contains reset link with token
- Verify email mentions 24-hour expiration

---

### 4. Request Password Reset (Non-Existent Email)

**Objective**: Verify security - same response for non-existent email (prevent email enumeration)

**Steps**:
```bash
# Request reset for non-existent email
curl -s -L -k -X POST https://dev.tickedify.com/api/account/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com"}' | jq
```

**Expected Response**:
```json
{
  "message": "Password reset email sent. Check your inbox.",
  "expires_in_hours": 24
}
```

**Success Criteria**:
- ✅ Status code: 200 (NOT 404!)
- ✅ Same response as valid email (security best practice)
- ✅ No email actually sent
- ✅ No database entry created

---

### 5. Request Password Reset (Rate Limiting)

**Objective**: Verify rate limiting prevents abuse (max 3 requests per hour)

**Steps**:
```bash
# Send 4 reset requests in quick succession
for i in {1..4}; do
  echo "Request $i:"
  curl -s -L -k -X POST https://dev.tickedify.com/api/account/password-reset \
    -H "Content-Type: application/json" \
    -d '{"email":"jan@buskens.be"}' | jq
  sleep 1
done
```

**Expected Response** (4th request):
```json
{
  "error": "Too many reset requests. Please wait before trying again.",
  "retry_after_seconds": 1800
}
```

**Success Criteria**:
- ✅ First 3 requests: Status 200
- ✅ 4th request: Status 429 (Too Many Requests)
- ✅ Error message includes `retry_after_seconds`
- ✅ Database: Only 3 tokens created

---

### 6. Confirm Password Reset (Valid Token)

**Objective**: Verify password reset confirmation updates password successfully

**Setup**:
```bash
# 1. Request password reset
curl -s -L -k -X POST https://dev.tickedify.com/api/account/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be"}' | jq

# 2. Extract token from email or database
# For testing, manually retrieve token from database:
# SELECT token_hash FROM password_reset_tokens WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1;
```

**Steps**:
```bash
# Confirm password reset with token
TOKEN="<token_from_email_or_database>"
curl -s -L -k -X POST https://dev.tickedify.com/api/account/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"new_password\":\"NewPassword123!\"}" | jq
```

**Expected Response**:
```json
{
  "message": "Password reset successful. You can now log in with your new password."
}
```

**Success Criteria**:
- ✅ Status code: 200
- ✅ Success message returned
- ✅ Database: `password_reset_tokens.used_at` set to NOW()
- ✅ Database: `users.wachtwoord` updated (bcrypt hash)
- ✅ Can log in with new password
- ✅ Cannot use same token again (single-use enforcement)

**Verification**:
```bash
# Attempt login with new password
curl -s -L -k -X POST https://dev.tickedify.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"NewPassword123!"}' \
  -c cookies-new.txt | jq

# Should succeed
```

---

### 7. Confirm Password Reset (Expired Token)

**Objective**: Verify expired tokens are rejected

**Setup**:
```bash
# Manually create expired token in database for testing:
# INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
# VALUES (1, '<hash>', NOW() - INTERVAL '25 hours', NOW() - INTERVAL '25 hours');
```

**Steps**:
```bash
# Attempt to use expired token
EXPIRED_TOKEN="<expired_token_from_database>"
curl -s -L -k -X POST https://dev.tickedify.com/api/account/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$EXPIRED_TOKEN\",\"new_password\":\"NewPassword456!\"}" | jq
```

**Expected Response**:
```json
{
  "error": "Reset token has expired. Please request a new one."
}
```

**Success Criteria**:
- ✅ Status code: 401
- ✅ Error message indicates token expired
- ✅ Password NOT changed in database

---

### 8. Confirm Password Reset (Already Used Token)

**Objective**: Verify single-use token enforcement

**Steps**:
```bash
# 1. Use token once (from Test 6)
# 2. Attempt to use same token again
TOKEN="<previously_used_token>"
curl -s -L -k -X POST https://dev.tickedify.com/api/account/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"new_password\":\"AnotherPassword789!\"}" | jq
```

**Expected Response**:
```json
{
  "error": "Reset token has already been used."
}
```

**Success Criteria**:
- ✅ Status code: 401
- ✅ Error message indicates token already used
- ✅ Password NOT changed again

---

### 9. Confirm Password Reset (Weak Password)

**Objective**: Verify password validation enforces minimum requirements

**Steps**:
```bash
# Request new token
curl -s -L -k -X POST https://dev.tickedify.com/api/account/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be"}' | jq

# Attempt to set weak password
TOKEN="<new_token>"
curl -s -L -k -X POST https://dev.tickedify.com/api/account/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"new_password\":\"weak\"}" | jq
```

**Expected Response**:
```json
{
  "error": "Password must be at least 8 characters"
}
```

**Success Criteria**:
- ✅ Status code: 400
- ✅ Error message indicates password requirements
- ✅ Token NOT marked as used (user can retry with valid password)

---

### 10. UI Display Test (Playwright)

**Objective**: Verify Account block displays correctly in Settings screen

**Test File**: `tests/account-settings-ui.spec.js`

**Test Steps**:
1. Navigate to https://dev.tickedify.com/app
2. Login with test credentials
3. Click "Settings" in sidebar
4. Verify Account block is visible
5. Verify full name is displayed
6. Verify "Member since" date is displayed
7. Verify "Last login" time is displayed
8. Verify task statistics (created/completed) are displayed
9. Verify "Reset Password" button is visible and clickable
10. Click "Reset Password" button
11. Verify success toast notification appears
12. Verify email is sent (check Mailgun logs)

**Success Criteria**:
- ✅ Account block positioned correctly (above Subscription block)
- ✅ All text fields render with correct values
- ✅ Button is styled consistently with Tickedify design system
- ✅ Toast notification appears on click
- ✅ No console errors

---

### 11. Task Statistics Update Test

**Objective**: Verify task counters increment when tasks are created/completed

**Steps**:
```bash
# 1. Get current task counts
curl -s -L -k https://dev.tickedify.com/api/account \
  -b cookies.txt | jq '.total_tasks_created, .total_tasks_completed'

# 2. Create a new task
curl -s -L -k -X POST https://dev.tickedify.com/api/lijst/acties \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"beschrijving":"Test task for statistics","lijst":"acties"}' | jq '.id'

# 3. Verify total_tasks_created incremented
curl -s -L -k https://dev.tickedify.com/api/account \
  -b cookies.txt | jq '.total_tasks_created'

# 4. Complete the task
TASK_ID="<id_from_step_2>"
curl -s -L -k -X PUT https://dev.tickedify.com/api/taak/$TASK_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"voltooid":true}' | jq

# 5. Verify total_tasks_completed incremented
curl -s -L -k https://dev.tickedify.com/api/account \
  -b cookies.txt | jq '.total_tasks_completed'
```

**Success Criteria**:
- ✅ `total_tasks_created` increases by 1 after task creation
- ✅ `total_tasks_completed` increases by 1 after task completion
- ✅ Counters persist across sessions

---

### 12. Last Login Tracking Test

**Objective**: Verify last_login timestamp updates on authentication

**Steps**:
```bash
# 1. Note current last_login value
curl -s -L -k https://dev.tickedify.com/api/account \
  -b cookies.txt | jq '.last_login, .last_login_relative'

# 2. Logout
curl -s -L -k -X POST https://dev.tickedify.com/api/auth/logout \
  -b cookies.txt

# 3. Wait 5 seconds
sleep 5

# 4. Login again
curl -s -L -k -X POST https://dev.tickedify.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"<current_password>"}' \
  -c cookies-new.txt

# 5. Verify last_login updated
curl -s -L -k https://dev.tickedify.com/api/account \
  -b cookies-new.txt | jq '.last_login, .last_login_relative'
```

**Success Criteria**:
- ✅ `last_login` timestamp is more recent than previous value
- ✅ `last_login_relative` shows "Just now" or similar
- ✅ Value persists in database

---

## Summary Checklist

**API Tests** (automated via curl):
- [ ] Test 1: View account info (authenticated) ✅
- [ ] Test 2: View account info (unauthenticated) ✅
- [ ] Test 3: Request password reset (valid email) ✅
- [ ] Test 4: Request password reset (non-existent email) ✅
- [ ] Test 5: Rate limiting (4th request blocked) ✅
- [ ] Test 6: Confirm reset (valid token) ✅
- [ ] Test 7: Confirm reset (expired token) ✅
- [ ] Test 8: Confirm reset (already used token) ✅
- [ ] Test 9: Confirm reset (weak password) ✅
- [ ] Test 11: Task statistics update ✅
- [ ] Test 12: Last login tracking ✅

**UI Tests** (Playwright):
- [ ] Test 10: Account block display and interaction ✅

**Manual Verification**:
- [ ] Password reset email received with correct content
- [ ] Email contains valid reset link
- [ ] Reset link navigates to password reset page
- [ ] Account block styling matches Subscription block
- [ ] Relative time updates dynamically ("3 hours ago" → "4 hours ago")

**Deployment Verification**:
```bash
# Check version deployed
curl -s -L -k https://dev.tickedify.com/api/version

# Should return: {"version":"0.21.93"}
```

---

## Troubleshooting

**Issue**: Account endpoint returns 404
- **Cause**: Route not registered or registered after parametric routes
- **Fix**: Move `/api/account` route before `/api/:param` routes in server.js

**Issue**: Password reset email not received
- **Cause**: Mailgun not configured or rate limit exceeded
- **Check**: Mailgun logs, verify API key in environment variables
- **Fix**: Check `password_reset_tokens` table for created tokens

**Issue**: Task statistics not incrementing
- **Cause**: Update logic not called on task creation/completion
- **Fix**: Verify `POST /api/lijst/acties` and `PUT /api/taak/:id` update counters

**Issue**: last_login shows "Never" for existing user
- **Cause**: Column added but not backfilled on login
- **Fix**: Ensure login endpoint updates `last_login = NOW()`

---

**Total Tests**: 12
**Estimated Test Duration**: 30 minutes (including manual verification)
**Automation Coverage**: 11/12 tests (92%)
