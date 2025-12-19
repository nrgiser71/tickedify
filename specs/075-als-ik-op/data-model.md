# Data Model: Free Trial 401 Fix

## Entities

### PendingSubscriptionSelection (sessionStorage)
Temporary storage for plan selection when user is not authenticated.

| Field | Type | Description |
|-------|------|-------------|
| planId | string | Selected plan ID (e.g., 'trial_14_days') |
| source | string | Selection source ('upgrade', 'registration', 'beta') |
| timestamp | number | Unix timestamp when selection was made |
| returnUrl | string | URL to return to after authentication |

### Storage Location
- **Key**: `tickedify_pending_subscription`
- **Storage**: Browser sessionStorage
- **Lifetime**: Until consumed or session ends

## State Transitions

```
[Visitor on /subscription]
        │
        ▼
[Clicks "Start Free Trial"]
        │
        ▼
[Check authenticated?]─────Yes───► [Call /api/subscription/select]
        │                                      │
        No                                     ▼
        │                           [Trial activated → /app]
        ▼
[Store selection in sessionStorage]
        │
        ▼
[Redirect to login page]
        │
        ▼
[User logs in / registers]
        │
        ▼
[Redirect back to /subscription]
        │
        ▼
[Detect pending selection]
        │
        ▼
[Auto-confirm selection]
        │
        ▼
[Clear pending selection]
        │
        ▼
[Trial activated → /app]
```

## Validation Rules
- `planId` must be one of: 'trial_14_days', 'monthly_7', 'yearly_70', 'monthly_8', 'yearly_80'
- `timestamp` must be within last 30 minutes (stale selections are discarded)
- `returnUrl` must start with '/' (relative URLs only for security)

## Integration Points
- `subscription.js:confirmSelection()` - Creates pending selection
- `subscription.js:initializeSubscriptionPage()` - Checks for pending selection
- Login page - Must redirect back with original return URL
