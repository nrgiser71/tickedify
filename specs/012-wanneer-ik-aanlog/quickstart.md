# Quickstart: Admin Login Persistence Testing

**Feature**: Admin Login Persistence
**Branch**: `012-wanneer-ik-aanlog`
**Date**: 2025-10-12

## Prerequisites

- ✅ Tickedify app running locally or on staging
- ✅ Admin credentials: Email `jan@tickedify.com`, Password from env
- ✅ Browser: Chrome, Firefox, or Safari
- ✅ Network access to tickedify.com or localhost:3000

## Quick Test Scenarios

### Scenario 1: Session Persists Across Page Refresh ✓

**Goal**: Verify admin remains logged in after page refresh

**Steps**:
1. Open browser (incognito/private mode recommended)
2. Navigate to `https://tickedify.com/admin.html`
3. **Verify**: Login form is shown
4. Enter admin password
5. Click "Inloggen"
6. **Verify**: Dashboard loads with admin data
7. Press `F5` or `Cmd+R` to refresh page
8. **Expected Result**: Dashboard remains visible, NO login form
9. **Expected**: No password prompt, immediate dashboard load

**Success Criteria**:
- ✅ No login form after refresh
- ✅ Dashboard data loads
- ✅ Admin stats visible

**Failure Indicators**:
- ❌ Login form appears after refresh
- ❌ Dashboard disappears
- ❌ Password prompt shown

---

### Scenario 2: Session Persists After Browser Restart ✓

**Goal**: Verify session survives browser close/reopen

**Steps**:
1. Open browser (incognito/private mode)
2. Navigate to `https://tickedify.com/admin.html`
3. Login with admin password
4. **Verify**: Dashboard loads
5. **Close entire browser** (not just tab)
6. Wait 5 seconds
7. **Reopen browser**
8. Navigate to `https://tickedify.com/admin.html`
9. **Expected Result**: Dashboard loads WITHOUT login form

**Success Criteria**:
- ✅ Dashboard loads immediately
- ✅ No login form shown
- ✅ Session cookie persisted across restart

**Failure Indicators**:
- ❌ Login form appears
- ❌ Session lost after browser restart
- ❌ Password required again

---

### Scenario 3: Session Expires After 24 Hours ✓

**Goal**: Verify sessions expire after configured time

**Steps**:
1. Login to admin dashboard
2. **Note current time**: e.g., 14:30
3. **Wait 24 hours** (or modify system time)
4. Refresh admin page
5. **Expected Result**: Login form appears (session expired)

**Success Criteria**:
- ✅ Login form shown after 24 hours
- ✅ Session cookie expired
- ✅ Graceful redirect to login

**Failure Indicators**:
- ❌ Session persists beyond 24 hours
- ❌ Error messages shown
- ❌ Dashboard accessible with expired session

**Note**: For faster testing, temporarily modify `cookie.maxAge` to shorter duration (e.g., 60000 = 1 minute)

---

### Scenario 4: Explicit Logout Destroys Session ✓

**Goal**: Verify logout properly invalidates session

**Steps**:
1. Login to admin dashboard
2. Dashboard loads successfully
3. Click "🚪 Uitloggen" button
4. **Expected Result**: Login form appears
5. **Verify**: Dashboard hidden
6. Refresh page
7. **Expected Result**: Login form still shown (session destroyed)

**Success Criteria**:
- ✅ Login form shown after logout
- ✅ Dashboard hidden
- ✅ Session cannot be restored by refresh

**Failure Indicators**:
- ❌ Dashboard remains visible after logout
- ❌ Session persists after logout
- ❌ Refresh brings back dashboard

---

### Scenario 5: Invalid Session Handled Gracefully ✓

**Goal**: Verify system handles corrupted/missing sessions

**Steps**:
1. Login to admin dashboard
2. Open browser DevTools → Application → Cookies
3. Delete `tickedify.sid` cookie manually
4. Refresh page
5. **Expected Result**: Login form appears (no errors)

**Success Criteria**:
- ✅ Login form shown
- ✅ No JavaScript errors in console
- ✅ Graceful fallback to login state

**Failure Indicators**:
- ❌ JavaScript errors in console
- ❌ Blank page or error message
- ❌ Dashboard attempts to load

---

## API Testing with cURL

### Test 1: Session Check Without Cookie

```bash
curl -s -L -k https://tickedify.com/api/admin/session
```

**Expected Response** (401):
```json
{
  "authenticated": false,
  "message": "No active admin session"
}
```

---

### Test 2: Session Check With Valid Cookie

**Step 1**: Login and extract cookie
```bash
# Login and save cookies
curl -s -L -k \
  -c cookies.txt \
  -X POST https://tickedify.com/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}'
```

**Step 2**: Check session with cookie
```bash
# Use saved cookie
curl -s -L -k \
  -b cookies.txt \
  https://tickedify.com/api/admin/session
```

**Expected Response** (200):
```json
{
  "authenticated": true,
  "isAdmin": true,
  "loginTime": "2025-10-12T14:30:00.000Z",
  "sessionAge": 3600000
}
```

---

### Test 3: Session Expiry Validation

```bash
# Extract loginTime from session response
LOGIN_TIME=$(curl -s -L -k -b cookies.txt \
  https://tickedify.com/api/admin/session | \
  grep -o '"loginTime":"[^"]*"' | cut -d'"' -f4)

echo "Login time: $LOGIN_TIME"

# Calculate time since login (requires jq for JSON parsing)
SESSION_AGE=$(curl -s -L -k -b cookies.txt \
  https://tickedify.com/api/admin/session | \
  jq '.sessionAge')

echo "Session age: $SESSION_AGE ms"

# Verify session age < 24 hours (86400000 ms)
if [ $SESSION_AGE -lt 86400000 ]; then
  echo "✅ Session is valid"
else
  echo "❌ Session should have expired"
fi
```

---

## Browser DevTools Verification

### Cookie Inspection

1. Open DevTools (F12)
2. Navigate to **Application** → **Cookies** → `https://tickedify.com`
3. Find `tickedify.sid` cookie
4. **Verify**:
   - ✅ **HttpOnly**: ✓ (checkbox checked)
   - ✅ **Secure**: ✓ (if HTTPS)
   - ✅ **SameSite**: Lax
   - ✅ **Expires**: ~24 hours from login time
   - ✅ **Path**: /
   - ✅ **Domain**: tickedify.com

### Network Tab Inspection

1. Open DevTools → **Network** tab
2. Refresh admin page
3. Find `admin.html` request
4. **Verify Request Headers**:
   ```
   Cookie: tickedify.sid=s%3A...
   ```
5. Find `GET /api/admin/session` request
6. **Verify Response**:
   - Status: 200 OK
   - Response body: `{ "authenticated": true, ... }`

---

## Automated Test Commands

### Full Test Suite (Bash Script)

```bash
#!/bin/bash
# test-admin-session.sh

BASE_URL="https://tickedify.com"
ADMIN_PASSWORD="YOUR_PASSWORD"
COOKIE_FILE="test-cookies.txt"

echo "🧪 Admin Session Persistence Test Suite"
echo "========================================"

# Test 1: Login
echo ""
echo "Test 1: Admin Login"
RESPONSE=$(curl -s -L -k -c $COOKIE_FILE -X POST \
  $BASE_URL/api/admin/auth \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  exit 1
fi

# Test 2: Session Check
echo ""
echo "Test 2: Session Check with Cookie"
RESPONSE=$(curl -s -L -k -b $COOKIE_FILE \
  $BASE_URL/api/admin/session)

if echo "$RESPONSE" | grep -q '"authenticated":true'; then
  echo "✅ Session valid"
else
  echo "❌ Session check failed"
  exit 1
fi

# Test 3: Session Without Cookie
echo ""
echo "Test 3: Session Check without Cookie"
RESPONSE=$(curl -s -L -k $BASE_URL/api/admin/session)

if echo "$RESPONSE" | grep -q '"authenticated":false'; then
  echo "✅ Correctly rejected unauthenticated request"
else
  echo "❌ Should have rejected request"
  exit 1
fi

# Test 4: Logout
echo ""
echo "Test 4: Logout"
RESPONSE=$(curl -s -L -k -b $COOKIE_FILE -X POST \
  $BASE_URL/api/admin/logout)

# Test 5: Session After Logout
echo ""
echo "Test 5: Session Check after Logout"
RESPONSE=$(curl -s -L -k -b $COOKIE_FILE \
  $BASE_URL/api/admin/session)

if echo "$RESPONSE" | grep -q '"authenticated":false'; then
  echo "✅ Session correctly destroyed"
else
  echo "❌ Session should be destroyed after logout"
  exit 1
fi

# Cleanup
rm -f $COOKIE_FILE

echo ""
echo "========================================"
echo "✅ All tests passed!"
```

**Run Tests**:
```bash
chmod +x test-admin-session.sh
./test-admin-session.sh
```

---

## Performance Benchmarks

### Session Check Performance

```bash
# Measure session check latency
time curl -s -L -k -b cookies.txt \
  https://tickedify.com/api/admin/session
```

**Expected**: <100ms response time

### Page Load Performance

```bash
# Measure full page load with session check
time curl -s -L -k -b cookies.txt \
  https://tickedify.com/admin.html
```

**Expected**: <500ms total (including session check)

---

## Troubleshooting

### Problem: Session Not Persisting

**Symptoms**: Login form appears after every refresh

**Debug Steps**:
1. Check browser cookies (DevTools → Application)
2. Verify `tickedify.sid` cookie exists
3. Check cookie expiry time (should be 24 hours from now)
4. Verify `HttpOnly` flag is set
5. Check Network tab for `GET /api/admin/session` request
6. Verify response is 200 OK with `authenticated: true`

**Possible Causes**:
- Cookie not being set (check server logs)
- Cookie being deleted (check browser settings)
- Session expiry too short (check `maxAge` in server.js)
- CORS issues (check `credentials: 'include'` in fetch)

---

### Problem: Session Check Returns 401

**Symptoms**: Always shows login form, even after login

**Debug Steps**:
1. Verify session cookie is sent in request (Network tab)
2. Check server logs for session lookup errors
3. Verify database connectivity
4. Check `session` table in PostgreSQL for session data
5. Verify `sess.isAdmin === true` in session data

**Possible Causes**:
- Session not created during login
- Session data corrupted in database
- Session ID mismatch between cookie and database
- express-session misconfiguration

---

### Problem: Session Persists Beyond 24 Hours

**Symptoms**: Can still access dashboard after 24+ hours

**Debug Steps**:
1. Check `cookie.maxAge` in server.js (should be 86400000)
2. Verify session cookie expiry in browser (DevTools)
3. Check PostgreSQL `session` table expire column
4. Verify server time vs. browser time (time zone issues)

**Possible Causes**:
- `maxAge` not updated to 24 hours
- Session cleanup not running
- System time incorrect
- Cookie not expiring properly

---

## Success Metrics

**Definition of Done**:
- ✅ All 5 test scenarios pass
- ✅ cURL tests return expected responses
- ✅ Cookie attributes correctly set
- ✅ Session check response time <100ms
- ✅ No JavaScript errors in console
- ✅ Graceful handling of edge cases

**User Acceptance**:
- ✅ User reports no more repeated login prompts
- ✅ Session persists across browser restarts
- ✅ Logout works correctly
- ✅ No unexpected logouts

---

## Next Steps

After successful testing:
1. ✅ Mark feature as complete in spec.md
2. ✅ Update CHANGELOG.md with version bump
3. ✅ Deploy to staging for user testing
4. ✅ Monitor production for session-related errors
5. ✅ Gather user feedback on login experience
