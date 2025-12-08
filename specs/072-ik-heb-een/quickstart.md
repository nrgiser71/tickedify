# Quickstart: Session Expiration Handling

## Overview

Test the session expiration handling feature to ensure users are proactively redirected to login when their session expires.

---

## Prerequisites

- Access to staging environment (dev.tickedify.com)
- Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Browser DevTools for network inspection

---

## Test Scenarios

### Scenario 1: Proactive Session Check (Primary)

**Purpose**: Verify that expired sessions are detected within 60 seconds

**Steps**:
1. Login to dev.tickedify.com/app
2. Open DevTools > Network tab
3. Wait and observe `/api/auth/me` calls every 60 seconds
4. In another browser/incognito: Login as same user (invalidates first session)
5. Wait up to 60 seconds
6. **Expected**: First browser redirects to /login automatically

**Pass Criteria**: Redirect happens without user action

---

### Scenario 2: Tab Visibility Check

**Purpose**: Verify immediate session check when returning to tab

**Steps**:
1. Login to dev.tickedify.com/app
2. Switch to another browser tab for 30+ seconds
3. In another browser: Logout the user (invalidates session)
4. Return to Tickedify tab
5. **Expected**: Immediate redirect to /login

**Pass Criteria**: Redirect happens within 1 second of tab focus

---

### Scenario 3: API Call Fallback

**Purpose**: Verify 401 responses trigger redirect

**Steps**:
1. Login to dev.tickedify.com/app
2. Open DevTools > Application > Cookies
3. Delete the `tickedify.sid` cookie
4. Try to complete a task (mark as done)
5. **Expected**: Redirect to /login (no generic error toast)

**Pass Criteria**: No "Error completing task" message shown

---

### Scenario 4: Multiple 401 Prevention

**Purpose**: Verify only one redirect occurs with multiple failing requests

**Steps**:
1. Login and navigate to daily planning (makes multiple API calls)
2. Open DevTools > Network tab
3. Delete session cookie
4. Navigate to another screen (triggers multiple API calls)
5. **Expected**: Single redirect to /login

**Pass Criteria**: No multiple redirects, no error toasts

---

### Scenario 5: Network Error Distinction

**Purpose**: Verify network errors don't trigger session redirect

**Steps**:
1. Login to dev.tickedify.com/app
2. Open DevTools > Network tab
3. Set "Offline" mode in DevTools
4. Try to complete a task
5. **Expected**: Network error handling (existing behavior)
6. Go back online
7. **Expected**: App recovers, no login redirect

**Pass Criteria**: Network errors don't trigger login redirect

---

## API Testing (Direct)

### Test Session Check Endpoint

```bash
# Valid session - should return 200 with user data
curl -s -L -k "https://dev.tickedify.com/api/auth/me" \
  -H "Cookie: tickedify.sid=<valid_session_id>"

# Invalid/expired session - should return 401
curl -s -L -k "https://dev.tickedify.com/api/auth/me" \
  -H "Cookie: tickedify.sid=invalid_session"

# No session - should return 401
curl -s -L -k "https://dev.tickedify.com/api/auth/me"
```

### Expected Responses

**Valid Session (200)**:
```json
{
  "user": { "id": "...", "naam": "...", "email": "..." },
  "hasAccess": true,
  "requiresUpgrade": false
}
```

**Invalid/No Session (401)**:
```json
{
  "error": "Not authenticated"
}
```

---

## Browser Console Verification

After implementation, these console messages should appear:

```
✅ Session check interval started (every 60 seconds)
🕐 Session check: valid
🕐 Session check: valid
⚠️ Session expired - redirecting to login
```

---

## Regression Checklist

After implementation, verify these existing features still work:

- [ ] Normal login flow
- [ ] Normal logout flow
- [ ] Task completion (mark as done)
- [ ] Task creation (add to inbox)
- [ ] Drag and drop operations
- [ ] Daily planning interactions
- [ ] Recurring task creation
- [ ] Beta/trial expiry redirects (if applicable)

---

## Success Criteria

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| Proactive check | Redirect within 60 sec | High |
| Tab visibility | Redirect within 1 sec | High |
| API fallback | Redirect on 401, no toast | High |
| Multiple 401 | Single redirect | Medium |
| Network error | No session redirect | Medium |
| Existing features | No regression | High |

---

## Troubleshooting

### Issue: No Redirect on Session Expiry
- Check: Is `setupGlobalFetchInterceptor()` called?
- Check: Is interval running? (DevTools > Console)
- Check: Is `/api/auth/me` returning 401?

### Issue: Multiple Redirects
- Check: Is `isRedirecting` flag working?
- Check: Console for multiple redirect attempts

### Issue: Redirect on Network Errors
- Check: Is 401 status being checked correctly?
- Check: Network errors should throw, not return 401
