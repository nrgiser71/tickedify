# Tasks: Session Expiration Handling

**Input**: Design documents from `/specs/072-ik-heb-een/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All tasks modify `public/app.js` unless otherwise noted

---

## Phase 3.1: Setup
- [ ] T001 Add session monitoring properties to AuthManager constructor in `public/app.js:15757`
  - Add `this.isRedirecting = false`
  - Add `this.sessionCheckInterval = null`
  - Add `this.lastSessionCheck = null`

## Phase 3.2: Core Session Monitoring Methods
**CRITICAL**: These must be implemented in order as they depend on each other

- [ ] T002 Add `handleSessionExpired()` method to AuthManager in `public/app.js` after line ~16097
  - Check `if (this.isRedirecting) return`
  - Set `this.isRedirecting = true`
  - Log `console.log('⚠️ Session expired - redirecting to login')`
  - Execute `window.location.href = '/login'`

- [ ] T003 Add `setupGlobalFetchInterceptor()` method to AuthManager in `public/app.js` after `handleSessionExpired()`
  - Store original fetch: `const originalFetch = window.fetch`
  - Override `window.fetch` with wrapper function
  - Check response status 401 for URLs starting with `/api/`
  - If 401 and not redirecting: call `this.handleSessionExpired()`
  - Always return original response
  - See contract: `specs/072-ik-heb-een/contracts/fetch-wrapper.contract.md`

- [ ] T004 Add `setupVisibilityListener()` method to AuthManager in `public/app.js` after `setupGlobalFetchInterceptor()`
  - Add event listener for `document.addEventListener('visibilitychange', ...)`
  - On `visibilityState === 'visible'`: check if `lastSessionCheck` is > 5 seconds ago
  - If yes: call `this.checkAuthStatus()` for immediate session validation
  - Log `console.log('🔄 Tab visible - checking session')`

- [ ] T005 Modify `startBetaCheckInterval()` method in `public/app.js:16114-16127`
  - Change interval from 3600000 (1 hour) to 60000 (60 seconds)
  - Rename to `startSessionCheckInterval()` for clarity
  - Update console log message to `'✅ Session check interval started (every 60 seconds)'`
  - Update `lastSessionCheck` on each successful check

- [ ] T006 Update `checkAuthStatus()` method in `public/app.js:16019-16097`
  - Add handling for 401 status: call `this.handleSessionExpired()`
  - Update `this.lastSessionCheck = new Date()` on successful check
  - Add console log `'🕐 Session check: valid'` for successful checks
  - Ensure existing `requiresUpgrade` handling remains intact

## Phase 3.3: Integration
- [ ] T007 Call new methods in AuthManager initialization
  - In constructor or `init()` method, call `this.setupGlobalFetchInterceptor()`
  - Call `this.setupVisibilityListener()` after authentication confirmed
  - Ensure methods are called in correct order

- [ ] T008 Update all references to `startBetaCheckInterval()` to use new name `startSessionCheckInterval()`
  - Update call in `updateUI()` method at `public/app.js:16154`
  - Update `stopBetaCheckInterval()` → `stopSessionCheckInterval()` at `public/app.js:16129-16135`

## Phase 3.4: Version & Deployment
- [ ] T009 Increment version in `package.json`
  - Bump patch version (e.g., 1.0.142 → 1.0.143)

- [ ] T010 Update changelog in `public/changelog.html`
  - Add entry for session expiration handling feature
  - Category: 🎯 Improvement
  - Description: "Automatic session expiration detection with redirect to login"

- [ ] T011 Merge to staging branch and deploy to dev.tickedify.com
  - `git checkout staging && git merge 072-ik-heb-een`
  - `git push origin staging`
  - Wait for Vercel deployment

## Phase 3.5: Testing & Validation
- [ ] T012 [P] API Test: Verify /api/auth/me returns 401 for invalid session
  - Use curl without session cookie
  - Expected: `{ "error": "Not authenticated" }` with status 401

- [ ] T013 Test Scenario 1: Proactive session check
  - Login, wait 60+ seconds
  - Observe `/api/auth/me` calls in Network tab
  - Invalidate session in another browser
  - Expected: Redirect to /login within 60 seconds

- [ ] T014 Test Scenario 2: Tab visibility check
  - Login, switch tabs, invalidate session
  - Return to Tickedify tab
  - Expected: Immediate redirect to /login

- [ ] T015 Test Scenario 3: API call fallback
  - Login, delete session cookie manually
  - Perform any action (complete task)
  - Expected: Redirect to /login, no error toast

- [ ] T016 Test Scenario 4: Multiple 401 prevention
  - Delete session cookie, navigate screens
  - Expected: Single redirect, no duplicate redirects

- [ ] T017 Regression test: Verify existing features work
  - Normal login/logout flow
  - Task completion and creation
  - Drag and drop operations
  - Daily planning interactions

---

## Dependencies

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 (sequential - same file)
T008 → T009 → T010 → T011 (deployment chain)
T011 → T012, T013, T014, T015, T016, T017 (testing after deployment)
```

## Parallel Execution

**Phase 3.5 tests can run in parallel** after deployment:
```
# After T011 completes, launch these together:
Task: "API Test: Verify /api/auth/me returns 401"
Task: "Test Scenario 1: Proactive session check"
Task: "Test Scenario 2: Tab visibility check"
Task: "Test Scenario 3: API call fallback"
Task: "Test Scenario 4: Multiple 401 prevention"
Task: "Regression test: Verify existing features"
```

**Note**: Implementation tasks (T001-T008) are NOT parallel because they all modify the same file (`public/app.js`) and depend on each other.

---

## Files Modified

| File | Tasks | Changes |
|------|-------|---------|
| `public/app.js` | T001-T008 | AuthManager class modifications |
| `package.json` | T009 | Version bump |
| `public/changelog.html` | T010 | New entry |

---

## Validation Checklist

- [x] All contracts have corresponding implementation tasks (T002, T003, T006)
- [x] All test scenarios from quickstart.md have test tasks (T012-T17)
- [x] Implementation before testing (T001-T008 before T012-T17)
- [x] Parallel tasks truly independent (only T012-T17 are parallel)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

---

## Quickstart Reference

See `specs/072-ik-heb-een/quickstart.md` for detailed test procedures and expected behaviors.

## Contract Reference

- Session check: `specs/072-ik-heb-een/contracts/session-check.contract.md`
- Fetch wrapper: `specs/072-ik-heb-een/contracts/fetch-wrapper.contract.md`
