# Contract: Unauthenticated Subscription Flow

## Overview
Defines the expected behavior when an unauthenticated user attempts to select a subscription plan.

## Scenario: Unauthenticated User Clicks "Start Free Trial"

### Preconditions
- User is on `/subscription` page
- User is NOT logged in (no session)
- User clicks on a plan selection button

### Expected Behavior

#### Step 1: Detect Unauthenticated State
```javascript
// subscriptionState.userStatus should indicate not authenticated
{
  success: false,
  authenticated: false,
  error: 'Not authenticated'
}
```

#### Step 2: Store Pending Selection
```javascript
// sessionStorage key: tickedify_pending_subscription
{
  planId: 'trial_14_days',
  source: 'upgrade',
  timestamp: 1734567890123,
  returnUrl: '/subscription'
}
```

#### Step 3: Show User Message
```
Modal/Toast message:
"Please log in or create an account to start your free trial."
Button: "Log in" → redirects to login page
```

#### Step 4: Redirect to Login
```
Redirect URL: /?redirect=/subscription
```

### Postconditions
- User is on login page
- Pending selection is stored in sessionStorage
- After successful login, user is redirected back to /subscription

---

## Scenario: Authenticated User Returns to Subscription Page

### Preconditions
- User just logged in
- `tickedify_pending_subscription` exists in sessionStorage
- Selection is less than 30 minutes old

### Expected Behavior

#### Step 1: Page Initialization Detects Pending Selection
```javascript
const pending = sessionStorage.getItem('tickedify_pending_subscription');
if (pending) {
  const selection = JSON.parse(pending);
  if (Date.now() - selection.timestamp < 30 * 60 * 1000) {
    // Auto-confirm the selection
  }
}
```

#### Step 2: Auto-Confirm Selection
```javascript
// Call existing confirmSelection flow with stored planId
selectPlan(selection.planId);
await confirmSelection();
```

#### Step 3: Clear Pending Selection
```javascript
sessionStorage.removeItem('tickedify_pending_subscription');
```

### Postconditions
- Trial is activated
- User is redirected to `/app`
- Pending selection is cleared

---

## Error Handling

### Stale Selection (> 30 minutes old)
- Silently discard pending selection
- Let user select plan again

### Invalid Plan ID
- Silently discard pending selection
- Let user select plan again

### API Error After Auto-Confirm
- Show standard error modal
- Do NOT retry automatically
- Clear pending selection to prevent loops
