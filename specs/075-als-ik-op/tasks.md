# Tasks: Fix Free Trial 401 Unauthorized Error

**Input**: Design documents from `/specs/075-als-ik-op/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths relative to repository root

## Path Conventions
- **Frontend**: `public/js/` (Vanilla JavaScript)
- **Backend**: `server.js` (Express.js - no changes needed)
- **Tests**: Manual browser testing on dev.tickedify.com

---

## Phase 3.1: Setup
- [x] T001 Bump version in package.json (patch increment)
- [x] T002 Create feature branch from staging if not already done

## Phase 3.2: Pending Selection Storage Utilities
*Add sessionStorage utilities for pending subscription selection*

- [x] T003 Add `savePendingSelection(planId, source)` function in `public/js/subscription.js`
  - Key: `tickedify_pending_subscription`
  - Store: `{planId, source, timestamp: Date.now(), returnUrl: '/subscription'}`

- [x] T004 Add `getPendingSelection()` function in `public/js/subscription.js`
  - Return parsed object or null if not exists
  - Check timestamp < 30 minutes old (stale check)
  - Return null if stale

- [x] T005 Add `clearPendingSelection()` function in `public/js/subscription.js`
  - Remove `tickedify_pending_subscription` from sessionStorage

## Phase 3.3: Authentication State Tracking
*Ensure auth state is properly tracked*

- [x] T006 Add `isAuthenticated` property to `subscriptionState` object in `public/js/subscription.js`
  - Initialize as `false`
  - Set based on `loadUserSubscriptionStatus()` response

- [x] T007 Update `loadUserSubscriptionStatus()` to set `subscriptionState.isAuthenticated` flag
  - If response.success && response.authenticated: set true
  - Otherwise: set false
  - Handle 401 gracefully (not an error, just means not logged in)

## Phase 3.4: Core Fix - confirmSelection Modification
*The main fix: check auth before API call*

- [x] T008 Modify `confirmSelection()` in `public/js/subscription.js`
  - At start: check `subscriptionState.isAuthenticated`
  - If not authenticated:
    1. Call `savePendingSelection(planId, source)`
    2. Show modal: "Please log in or create an account to start your free trial"
    3. Modal button: "Log in" → redirect to `/?redirect=/subscription`
    4. Return early (do not call API)
  - If authenticated: continue with existing API call flow

## Phase 3.5: Post-Login Auto-Confirm
*Automatically confirm pending selection after login*

- [x] T009 Add `checkAndProcessPendingSelection()` function in `public/js/subscription.js`
  - Call `getPendingSelection()`
  - If valid pending selection exists AND user is now authenticated:
    1. Call `selectPlan(pending.planId)`
    2. Call `confirmSelection()`
    3. Call `clearPendingSelection()`
  - If stale or invalid: call `clearPendingSelection()` silently

- [x] T010 Update `initializeSubscriptionPage()` to call `checkAndProcessPendingSelection()`
  - Call AFTER `loadUserSubscriptionStatus()` completes
  - Only process if user is authenticated (came back from login)

## Phase 3.6: Error Message English Translation
*Ensure all error messages are in English*

- [x] T011 [P] Update error messages in `public/js/subscription.js` to English
  - "Selecteer eerst een abonnement" → "Please select a plan first"
  - "Bezig met opslaan..." → "Saving..."
  - Any other Dutch text → English

- [x] T012 [P] Update error messages in `public/js/subscription-api.js` to English
  - Review `formatErrorMessage()` translations
  - "Niet ingelogd" should be caught by frontend, but ensure fallback is English

## Phase 3.7: Validation & Deployment
*Deploy and test on staging*

- [x] T013 Update changelog with fix description
- [x] T014 Commit all changes with descriptive message
- [x] T015 Push to staging branch and verify deployment via `/api/version`
- [ ] T016 Test on dev.tickedify.com: Unauthenticated user → Free Trial flow
- [ ] T017 Test on dev.tickedify.com: Authenticated user → Free Trial flow
- [ ] T018 Test on dev.tickedify.com: Stale pending selection handling

---

## Dependencies

```
T001-T002 (Setup)
    ↓
T003-T005 (Storage utilities - sequential, same file)
    ↓
T006-T007 (Auth tracking - sequential, same file)
    ↓
T008 (Main fix - depends on T003-T007)
    ↓
T009-T010 (Auto-confirm - sequential, same file, depends on T008)
    ↓
T011-T012 (Error messages - parallel, different files)
    ↓
T013-T018 (Validation - sequential deployment workflow)
```

## Parallel Execution Examples

### Parallel Group 1: Error Message Updates (after T010)
```javascript
// Can run T011 and T012 in parallel (different files):
Task: "Update error messages in public/js/subscription.js to English"
Task: "Update error messages in public/js/subscription-api.js to English"
```

### Sequential Note
Most tasks modify `public/js/subscription.js` and must be sequential.

---

## Validation Checklist
*Verify before marking complete*

- [ ] All error messages in English (not Dutch)
- [ ] Unauthenticated user sees friendly prompt, not 401 error
- [ ] Pending selection stored correctly in sessionStorage
- [ ] Login redirect includes return URL parameter
- [ ] Post-login auto-confirms trial successfully
- [ ] Stale selections (>30 min) are discarded silently
- [ ] Console has no uncaught errors
- [ ] Version deployed matches package.json

---

## Notes
- No backend changes required
- All changes in `public/js/subscription.js` (main) and minor in `subscription-api.js`
- sessionStorage key: `tickedify_pending_subscription`
- Stale timeout: 30 minutes
- All UI text must be in English per CLAUDE.md policy
