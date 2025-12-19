# Research: Free Trial 401 Unauthorized Error

## Problem Analysis

### Root Cause Identified
The subscription page (`/subscription`) allows unauthenticated visitors to access it and view plans. However, when clicking "Start Free Trial", the `confirmSelection()` function calls `SubscriptionAPI.selectPlan()` which makes a POST request to `/api/subscription/select`. This endpoint requires authentication (checks `req.session.userId`), returning a 401 Unauthorized error for non-logged-in users.

### Current Flow (Broken)
1. Visitor navigates to `/subscription`
2. Page loads and renders plans (works - `/api/subscription/plans` is public)
3. User clicks "Start Free Trial" button
4. `subscription.js:confirmSelection()` calls `SubscriptionAPI.selectPlan('trial_14_days', 'upgrade')`
5. POST `/api/subscription/select` is called
6. Server checks `req.session.userId` → undefined for unauthenticated users
7. Returns 401 with error "Niet ingelogd"
8. User sees error modal with confusing Dutch message

### Key Files Involved
| File | Role | Line Numbers |
|------|------|--------------|
| `server.js` | API endpoint `/api/subscription/select` | ~5301-5320 |
| `public/js/subscription.js` | Frontend logic, `confirmSelection()` | ~379-470 |
| `public/js/subscription-api.js` | API client, `selectPlan()` | ~124-197 |
| `public/subscription.html` | Subscription page UI | entire file |

### Duplicate Endpoint Issue
There are **two** POST handlers for `/api/subscription/select` in `server.js`:
1. Line ~5301 - Original handler (uses `planId`)
2. Line ~16825 - Newer handler with `requireAuth` middleware (uses `plan_id`)

The first one gets matched, which doesn't have `requireAuth` middleware but still manually checks `userId`.

## Solution Options

### Option A: Redirect to Login (Recommended)
**Decision**: Frontend detects unauthenticated state and redirects to login/registration before allowing plan selection.

**Rationale**:
- Maintains security by keeping `/api/subscription/select` authenticated
- Provides clear user journey: see plans → login/register → select plan
- Avoids complex guest session handling
- Aligns with existing auth patterns in the application

**Alternatives Rejected**:
- Guest trial creation: Would require complex guest→user migration logic
- Public trial endpoint: Security risk, could be abused for spam accounts

### Option B: Store Selection & Redirect
**Decision**: Store selected plan in sessionStorage, redirect to login, restore selection after login.

**Rationale**:
- Seamless user experience - selection is remembered
- Works with both new registrations and existing user logins
- No backend changes required initially

## Technical Approach

### Frontend Changes Required
1. **Check authentication status on page load** - `loadUserSubscriptionStatus()` already does this
2. **Modify `confirmSelection()`** to detect unauthenticated state
3. **Store plan selection** in sessionStorage before redirect
4. **Redirect to login page** with return URL parameter
5. **Post-login handler** reads stored selection and auto-selects plan

### Backend Considerations
- `/api/subscription/status` currently returns 401 for unauthenticated users
- This is correct behavior but frontend should handle gracefully
- No backend changes required for this fix

### UX Flow (Fixed)
1. Visitor navigates to `/subscription`
2. Page loads, plans render (public)
3. `loadUserSubscriptionStatus()` returns `authenticated: false`
4. User clicks "Start Free Trial"
5. Frontend detects not authenticated
6. Stores `{planId: 'trial_14_days', returnUrl: '/subscription'}` in sessionStorage
7. Shows friendly message: "Please log in or create an account to start your trial"
8. Redirects to login page
9. After login, redirects back to `/subscription`
10. Page detects stored selection, auto-confirms trial

## Dependencies
- Existing authentication system (login page, session management)
- sessionStorage browser API
- No new backend endpoints required

## Constraints
- Must work on both new user registration and existing user login flows
- Must preserve user's plan choice across redirect
- Error messages must be in English (UI Language Policy)
