# Quickstart: Testing the Free Trial Fix

## Prerequisites
- Access to Tickedify staging environment (dev.tickedify.com)
- Browser with developer tools

## Test Scenarios

### Test 1: Unauthenticated User → Free Trial

1. **Open incognito/private browser window**
2. Navigate to `https://dev.tickedify.com/subscription`
3. Verify plans are displayed correctly
4. Click "Start Free Trial" button

**Expected Result:**
- Modal appears: "Please log in or create an account to start your free trial"
- Click "Log in" redirects to login page
- After login, automatically redirected back to subscription page
- Trial is auto-activated
- Redirected to `/app`

### Test 2: Already Logged In User → Free Trial

1. **Log in** to Tickedify with test account
2. Navigate to `https://dev.tickedify.com/subscription`
3. Click "Start Free Trial" button

**Expected Result:**
- Trial activates immediately
- Success message shown
- Redirected to `/app` after 5 seconds

### Test 3: Stale Pending Selection

1. Store manually in sessionStorage:
```javascript
sessionStorage.setItem('tickedify_pending_subscription', JSON.stringify({
  planId: 'trial_14_days',
  source: 'upgrade',
  timestamp: Date.now() - (31 * 60 * 1000), // 31 minutes ago
  returnUrl: '/subscription'
}));
```
2. Refresh `/subscription` page

**Expected Result:**
- Stale selection is ignored
- User can select plan normally
- No error messages

### Test 4: Error Message Language

1. Trigger 401 error (if fix not applied)

**Expected Result:**
- Error message in English, NOT "Niet ingelogd"
- User-friendly message like "Please log in to continue"

## Verification Checklist

- [ ] Unauthenticated user sees friendly redirect prompt
- [ ] Selection is stored before redirect
- [ ] Login page receives correct redirect parameter
- [ ] Post-login auto-confirms stored selection
- [ ] Trial activates successfully
- [ ] All error messages are in English
- [ ] Console has no uncaught errors
- [ ] Works in Chrome, Firefox, Safari
