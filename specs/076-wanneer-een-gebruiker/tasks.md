# Tasks: Admin Email Notification for Trial Starts

**Feature**: 076-wanneer-een-gebruiker
**Input**: Design documents from `/specs/076-wanneer-een-gebruiker/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All tasks modify `server.js` - NO parallel execution possible

## Phase 3.1: Implementation

### Core Implementation
All tasks are sequential (same file: server.js)

- [ ] T001 Create `sendNewTrialNotification()` function in server.js after `sendNewCustomerNotification()` (~line 595)
  - **File**: `server.js` (insert after line 595)
  - **Pattern**: Copy `sendNewCustomerNotification()` structure (lines 495-595)
  - **Changes**:
    - Function name: `sendNewTrialNotification(customerEmail, customerName, trialStartDate, trialEndDate)`
    - Subject: "Nieuwe Trial Gebruiker voor Tickedify"
    - Badge: "TRIAL GESTART" (orange/blue instead of green)
    - Header: "🚀 Nieuwe Trial Gebruiker!"
    - Info fields: Naam, Email, Trial Start, Trial Einde
  - **Dependencies**: None

- [ ] T002 Modify SELECT query to include `naam` field in /api/subscription/select endpoint
  - **File**: `server.js` line 5318
  - **Current**: `SELECT email, subscription_status, had_trial FROM users WHERE id = $1`
  - **New**: `SELECT email, naam, subscription_status, had_trial FROM users WHERE id = $1`
  - **Dependencies**: None (but logically before T003)

- [ ] T003 Add notification call after trial activation in /api/subscription/select endpoint
  - **File**: `server.js` (~line 5343-5345)
  - **Location**: After `await pool.query(...)` update, before `return res.json(...)`
  - **Code**:
    ```javascript
    // Send admin notification (non-blocking)
    try {
      await sendNewTrialNotification(
        user.email,
        user.naam || 'Naam onbekend',
        new Date(),
        trialEndDate
      );
    } catch (notificationError) {
      console.error('⚠️ Failed to send trial notification:', notificationError);
      // Continue - don't fail the trial activation
    }
    ```
  - **Dependencies**: T001, T002

## Phase 3.2: Deployment & Testing

- [ ] T004 Update version in package.json
  - **File**: `package.json`
  - **Action**: Increment patch version (e.g., 1.0.190 → 1.0.191)
  - **Dependencies**: T001, T002, T003

- [ ] T005 Update changelog.html with new feature
  - **File**: `public/changelog.html`
  - **Entry**: New version with "Added admin email notification for trial starts"
  - **Category**: ⚡ Feature
  - **Dependencies**: T004

- [ ] T006 Commit and deploy to staging branch
  - **Command**: `git add -A && git commit -m "✨ Add admin notification for trial starts" && git push origin staging`
  - **Dependencies**: T004, T005

- [ ] T007 Verify deployment on staging
  - **Action**: Check `curl -s -L -k https://dev.tickedify.com/api/version` for new version
  - **Timing**: Wait 15s, check, repeat every 15s for max 2 minutes
  - **Dependencies**: T006

## Phase 3.3: Validation

- [ ] T008 Test trial notification via API
  - **Action**: Use tickedify-testing agent or manual API calls:
    1. Register new test user on dev.tickedify.com
    2. Select trial plan via POST /api/subscription/select
    3. Verify admin email received at support@tickedify.com
  - **Dependencies**: T007

- [ ] T009 Verify non-blocking behavior
  - **Action**: Confirm trial activation succeeds even if notification logging shows failure
  - **Check**: Look for "⚠️ Failed to send trial notification" in logs (should not affect response)
  - **Dependencies**: T007

## Dependencies Graph

```
T001 (function) ─────────────┐
                             │
T002 (query) ────────────────┼──→ T003 (integration) ──→ T004 (version)
                             │
                             │
T004 ──→ T005 (changelog) ──→ T006 (deploy) ──→ T007 (verify) ──→ T008 (test)
                                                                    │
                                                                    └──→ T009 (validation)
```

## Parallel Execution

**Not applicable for this feature** - All implementation tasks (T001-T003) modify the same file (server.js) and must be sequential.

**Parallel opportunities:**
- T008 and T009 can run in parallel after T007 completes (different validation concerns)

```
# After T007 completes, launch validation tasks together:
Task: "Test trial notification via API on staging"
Task: "Verify non-blocking behavior in server logs"
```

## Validation Checklist

- [x] Contract (sendNewTrialNotification) has implementation task (T001)
- [x] Query modification task exists (T002)
- [x] Integration task exists (T003)
- [x] Tasks are sequential (same file constraint respected)
- [x] Each task specifies exact file path and line numbers
- [x] Non-blocking requirement addressed (try-catch in T003)
- [x] Deployment and verification tasks included (T006, T007)
- [x] Test scenarios from quickstart.md covered (T008, T009)

## Notes

- This is a simple feature with ~5 core tasks + deployment/testing
- All server.js changes must be sequential (no [P] markers)
- Non-blocking error handling is critical - trial must never fail due to notification
- Use existing `sendNewCustomerNotification()` as template for consistency
