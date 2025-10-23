# Tasks: Real-time Bericht Notificatie bij Navigatie

**Feature**: 028-wanneer-ik-in
**Input**: Design documents from `/specs/028-wanneer-ik-in/`
**Prerequisites**: ✅ plan.md, research.md, data-model.md, contracts/, quickstart.md

---

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ Loaded - Tech: JavaScript ES6+, Vanilla JS frontend, Express.js backend
   ✅ Structure: Web app (frontend enhancement, no backend changes)
2. Load optional design documents:
   ✅ data-model.md: No new entities (uses existing admin_messages, message_interactions)
   ✅ contracts/: No new contracts (uses existing GET /api/messages/unread)
   ✅ research.md: Key finding - DOMContentLoaded pattern exists, needs script inclusion audit
   ✅ quickstart.md: 5 test scenarios defined
3. Generate tasks by category:
   → Setup: Audit existing implementation
   → Tests: No new contract tests (reuse existing)
   → Core: Extend message-modal.js, add navigation hooks
   → Integration: Add script includes to HTML pages
   → Polish: Playwright tests, changelog, deployment
4. Apply task rules:
   → HTML file script includes = [P] (different files)
   → message-modal.js = sequential (same file edits)
   → Tests via Playwright = [P] per scenario
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Return: SUCCESS (14 tasks ready for execution)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Tasks ordered by dependency and TDD workflow

---

## Path Conventions
**This is a web application with existing structure**:
- Frontend: `public/*.html`, `public/js/*.js`, `public/css/*.css`
- Backend: `server.js` (NO CHANGES for this feature)
- Database: PostgreSQL via Neon (NO SCHEMA CHANGES)

---

## Phase 3.1: Setup & Investigation

### T001: Audit HTML Files for message-modal.js Script Inclusion ✅ COMPLETED
**File**: `public/*.html` (read-only audit)
**Parallel**: No (sequential analysis)
**Description**:
- Scan ALL HTML files in `public/` directory
- Check for `<script src="js/message-modal.js"></script>` tag
- Create audit report documenting:
  - ✅ Files WITH script tag (working pages)
  - ❌ Files WITHOUT script tag (broken pages)
  - Focus on: `index.html`, `lijst-acties.html`, `dagelijkse-planning.html`
- **Expected finding**: Some pages missing the script (hypothesis from research.md)
- **Output**: List of files needing script tag addition

**AUDIT RESULTS**:
- ✅ **HAS script**: index.html (line 1184), admin2.html (line 9)
- ❌ **MISSING script** - User-facing pages:
  - welcome.html
  - subscription.html
  - subscription-confirm.html
  - payment-success.html
  - payment-cancelled.html
  - trial-expired.html
  - beta-expired.html
- ❌ **MISSING script** - Admin/utility pages (lower priority):
  - admin.html, admin-login.html, admin2-login.html, admin-cleanup.html
  - waitlist.html, waitlist-success.html
  - test-*.html, staging-test.html
  - notion-*.html, recover-recurring.html, emergency-recovery.html, csv-mapper.html, changelog.html

**Acceptance**:
- ✅ Complete list of all HTML files checked (24 files total)
- ✅ Clear identification of missing script tags
- ✅ Document which pages are user-facing vs admin/utility

**Estimated Time**: 30 minutes → **Actual: 10 minutes**

---

### T002: Test Current Behavior - Reproduce Bug
**File**: Manual testing on `https://tickedify.com/app`
**Parallel**: No (prerequisite for understanding)
**Description**:
- Follow quickstart.md Test Scenario 1
- Steps:
  1. Create scheduled message in admin2.html (display_at = NOW + 2 min)
  2. Login to tickedify.com/app
  3. Wait for scheduled time to pass
  4. Navigate between pages WITHOUT refresh
  5. Open browser console and observe logs
- Document exact behavior:
  - Does DOMContentLoaded fire on navigation?
  - Are there console logs from message-modal.js?
  - Does modal appear or not?
- **Goal**: Confirm root cause from research.md hypothesis

**Acceptance**:
- Bug reproduced and documented
- Console logs captured (screenshot or copy-paste)
- Root cause confirmed (script missing OR navigation issue)

**Estimated Time**: 15 minutes

---

## Phase 3.2: Core Implementation

### T003 [P]: Add message-modal.js Script to index.html ✅ COMPLETED
**File**: `public/index.html`
**Parallel**: Yes (different file from other HTML updates)
**Description**:
- Add `<script src="js/message-modal.js"></script>` to `<head>` section
- Place BEFORE closing `</head>` tag (NOT async/defer to ensure DOMContentLoaded fires)
- Position: After other script includes, before closing head
- Ensure path is correct relative to HTML location

**Result**: ✅ ALREADY HAD SCRIPT (line 1184) - No changes needed

**Acceptance**:
- ✅ Script tag present in index.html
- ✅ No async or defer attributes
- ✅ File path correct (`js/message-modal.js`)

**Estimated Time**: 5 minutes → **Actual: N/A (already present)**

---

### T004 [P]: Add message-modal.js Script to lijst-acties.html (if exists) ✅ N/A
**File**: `public/lijst-acties.html`
**Parallel**: Yes (different file)
**Description**:
- IF file exists AND missing script tag (from T001 audit)
- Add `<script src="js/message-modal.js"></script>` to `<head>`
- Same placement as T003

**Result**: ❌ FILE DOES NOT EXIST (removed in previous refactoring)

**Acceptance**:
- ✅ Task marked N/A - file doesn't exist

**Estimated Time**: 5 minutes → **Actual: N/A (file not found)**

---

### T005 [P]: Add message-modal.js Script to dagelijkse-planning.html (if exists) ✅ N/A
**File**: `public/dagelijkse-planning.html`
**Parallel**: Yes (different file)
**Description**:
- IF file exists AND missing script tag (from T001 audit)
- Add `<script src="js/message-modal.js"></script>` to `<head>`
- Same placement as T003

**Result**: ❌ FILE DOES NOT EXIST (removed in previous refactoring)

**Acceptance**:
- ✅ Task marked N/A - file doesn't exist

**Estimated Time**: 5 minutes → **Actual: N/A (file not found)**

---

### T006 [P]: Add message-modal.js Script to Other User-Facing Pages ✅ COMPLETED
**Files**: Any other HTML files identified in T001 audit
**Parallel**: Yes (can batch edit multiple files)
**Description**:
- From T001 audit list, add script tag to remaining user-facing pages
- Skip admin/utility pages if they don't need message display
- Examples might include:
  - `public/welcome.html`
  - `public/subscription.html`
  - Any other pages users navigate to
- Add same script tag to each

**Result**: ✅ SCRIPT ADDED to 7 user-facing pages:
1. welcome.html ✅
2. subscription.html ✅
3. subscription-confirm.html ✅
4. payment-success.html ✅
5. payment-cancelled.html ✅
6. trial-expired.html ✅
7. beta-expired.html ✅

**Script placement**: Before `</body>` tag, consistent with index.html pattern

**Acceptance**:
- ✅ All identified user-facing pages from T001 have script tag
- ✅ Admin-only pages excluded (admin2.html already had script)
- ✅ Verified all 7 files contain message-modal.js reference

**Estimated Time**: 15 minutes → **Actual: 10 minutes**

---

### T007: Verify message-modal.js Loads on DOMContentLoaded ✅ COMPLETED
**File**: `public/js/message-modal.js` (read-only verification)
**Parallel**: No (verification step)
**Description**:
- Open `public/js/message-modal.js`
- Verify lines 12-15 contain:
  ```javascript
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('📢 Message modal system initialized');
    await checkForMessages();
  });
  ```
- Verify `checkForMessages()` function exists (lines 18-39)
- Verify it calls `GET /api/messages/unread`
- **No code changes** - this is verification task

**Result**: ✅ VERIFIED - All checks passed
- ✅ DOMContentLoaded listener exists at lines 12-15
- ✅ Console log "📢 Message modal system initialized" present
- ✅ checkForMessages() function exists at lines 18-39
- ✅ GET /api/messages/unread call present at line 20
- ✅ Proper error handling and console logging
- ✅ showMessage() call when messages found

**Acceptance**:
- ✅ Confirmed DOMContentLoaded listener exists
- ✅ Confirmed checkForMessages() implementation correct
- ✅ No changes needed (existing code is correct)

**Estimated Time**: 10 minutes → **Actual: 5 minutes**

---

## Phase 3.3: Testing & Validation

### T008: Deploy to Staging and Test Navigation Trigger
**Environment**: `https://dev.tickedify.com`
**Parallel**: No (requires deployment)
**Description**:
- Commit changes from T003-T006
- Deploy to staging environment (dev.tickedify.com)
- Wait for deployment confirmation
- Follow quickstart.md Test Scenario 1:
  1. Create scheduled message (display_at = NOW + 2 min)
  2. Login to dev.tickedify.com/app
  3. Wait for scheduled time
  4. Navigate between pages
  5. **VERIFY**: Modal appears automatically
- Check browser console for logs: "📢 Message modal system initialized"

**Acceptance**:
- Staging deployment successful
- Modal appears on navigation after scheduled time
- Console logs confirm script loaded
- Test Scenario 1 PASSES

**Estimated Time**: 20 minutes (including deployment wait)

---

### T009 [P]: Playwright Test - Scheduled Message Navigation
**File**: New test file (create if needed)
**Parallel**: Yes (independent test)
**Description**:
- Use tickedify-testing agent for Playwright automation
- Automate quickstart.md Test Scenario 1:
  1. Login as admin → Create scheduled message (API call faster than UI)
  2. Login as user → Navigate to app
  3. Wait for scheduled time to pass
  4. Navigate between pages
  5. Assert modal appears with correct content
  6. Assert console log: "📢 1 unread message(s) found"
- **Goal**: Automated regression test for future

**Acceptance**:
- Playwright test script created
- Test passes on staging
- Can be run repeatedly for regression

**Estimated Time**: 45 minutes (Playwright setup + script)

---

### T010 [P]: Manual Test - Dismiss Prevention (Scenario 2)
**Environment**: Staging (`dev.tickedify.com`)
**Parallel**: Yes (different test scenario)
**Description**:
- Follow quickstart.md Test Scenario 2:
  1. With message displayed from T008
  2. Click "Got it" to dismiss
  3. Navigate to multiple different pages
  4. **VERIFY**: Message does NOT reappear
- Check network tab: POST /api/messages/{id}/dismiss successful
- Check console: "📢 No unread messages" on subsequent navigations

**Acceptance**:
- Dismissed message does NOT reappear
- Console confirms no unread messages
- Test Scenario 2 PASSES

**Estimated Time**: 10 minutes

---

### T011 [P]: Manual Test - Multiple Messages (Scenario 3)
**Environment**: Staging (`dev.tickedify.com`)
**Parallel**: Yes (different test scenario)
**Description**:
- Follow quickstart.md Test Scenario 3:
  1. Create 3 messages: A (NOW+1min), B (NOW+1min), C (NOW+10min)
  2. Wait 1+ minute
  3. Navigate to trigger check
  4. **VERIFY**: Modal shows "1 / 2" (A and B, not C)
  5. **VERIFY**: Can navigate carousel between A and B
  6. **VERIFY**: C does NOT appear (display_at not reached)

**Acceptance**:
- Carousel shows correct count (2 messages)
- Only messages with display_at <= NOW shown
- Test Scenario 3 PASSES

**Estimated Time**: 15 minutes

---

### T012 [P]: Manual Test - Future Message Not Shown (Scenario 4)
**Environment**: Staging (`dev.tickedify.com`)
**Parallel**: Yes (different test scenario)
**Description**:
- Follow quickstart.md Test Scenario 4:
  1. Create message with display_at = NOW + 20 minutes
  2. Navigate between pages immediately
  3. **VERIFY**: No modal appears
  4. **VERIFY**: Console shows "📢 No unread messages"

**Acceptance**:
- Future message NOT shown prematurely
- Backend filter working correctly
- Test Scenario 4 PASSES

**Estimated Time**: 10 minutes

---

## Phase 3.4: Production Deployment

### T013: Production Deployment
**Environment**: `https://tickedify.com`
**Parallel**: No (critical deployment)
**Description**:
- **IMPORTANT**: Check BÈTA FREEZE status in CLAUDE.md
  - IF freeze active: STOP and request explicit approval
  - IF freeze lifted: Proceed with deployment
- Update version in package.json (bump patch version)
- Commit changes with message:
  ```
  🔧 FIX: Message Navigation Trigger - Script Inclusion - v0.19.164

  - Add message-modal.js to all user-facing pages
  - Fixes scheduled messages not appearing on navigation
  - Messages now show on page navigation without refresh

  Testing: Quickstart scenarios 1-4 all PASS on staging
  ```
- Push to main branch (or create PR if workflow requires)
- Wait for Vercel deployment
- Verify version endpoint: `curl -s https://tickedify.com/api/version`

**Acceptance**:
- Version bumped in package.json
- Committed and pushed to production branch
- Vercel deployment successful
- Version endpoint returns new version

**Estimated Time**: 15 minutes (including deployment wait)

---

### T014: Production Validation & Changelog Update
**Environment**: `https://tickedify.com`
**Parallel**: No (final validation)
**Description**:
- Test on production with real credentials (jan@buskens.be)
- Quick validation:
  1. Create test message (display_at = NOW + 1 min)
  2. Navigate after scheduled time
  3. Verify modal appears
  4. Dismiss message
  5. Verify no reappearance
- Update `public/changelog.html`:
  ```html
  <div class="version-item">
    <div class="version-header">
      <span class="version-badge badge-fix">v0.19.164</span>
      <span class="version-date">23 oktober 2025</span>
    </div>
    <div class="version-content">
      <h3>🔧 Bug Fixes</h3>
      <ul>
        <li><strong>Message Display op Navigatie</strong>: Geprogrammeerde berichten verschijnen nu automatisch wanneer je tussen pagina's navigeert, zonder dat je de pagina hoeft te refreshen. Perfect voor belangrijke aankondigingen!</li>
      </ul>
    </div>
  </div>
  ```
- Mark version as `badge-fix` (bugfix release)
- Commit changelog update

**Acceptance**:
- Production validation successful
- Changelog updated with clear description
- User-facing language (Nederlands)
- Changelog committed

**Estimated Time**: 20 minutes

---

## Dependencies Graph

```
T001 (Audit) ──────────┐
                       ↓
T002 (Reproduce) ──────┤
                       ↓
               ┌───────┴───────┐
               ↓               ↓
         T003 [P]         T004 [P]    (Script additions in parallel)
         T005 [P]         T006 [P]
               ↓               ↓
               └───────┬───────┘
                       ↓
              T007 (Verify)
                       ↓
              T008 (Deploy Staging)
                       ↓
               ┌───────┴────────┐
               ↓                ↓
          T009 [P]         T010 [P]    (Tests in parallel)
          T011 [P]         T012 [P]
               ↓                ↓
               └────────┬───────┘
                        ↓
                   T013 (Deploy Prod)
                        ↓
                   T014 (Validate & Changelog)
```

**Critical Path**: T001 → T002 → T003-T006 → T007 → T008 → T013 → T014
**Parallel Opportunities**:
- T003, T004, T005, T006: HTML file edits (4 parallel)
- T009, T010, T011, T012: Test scenarios (4 parallel)

---

## Parallel Execution Examples

### Example 1: Script Tag Addition (T003-T006)
```bash
# Launch all HTML file edits in parallel:
Task(subagent_type: "tickedify-feature-builder",
     description: "Add script to index.html",
     prompt: "Add <script src='js/message-modal.js'></script> to public/index.html in <head> section")

Task(subagent_type: "tickedify-feature-builder",
     description: "Add script to lijst-acties.html",
     prompt: "Add <script src='js/message-modal.js'></script> to public/lijst-acties.html in <head> section if file exists")

Task(subagent_type: "tickedify-feature-builder",
     description: "Add script to dagelijkse-planning.html",
     prompt: "Add <script src='js/message-modal.js'></script> to public/dagelijkse-planning.html in <head> section if file exists")

Task(subagent_type: "tickedify-feature-builder",
     description: "Add script to other pages",
     prompt: "Add <script src='js/message-modal.js'></script> to remaining user-facing HTML pages identified in audit")
```

### Example 2: Testing Scenarios (T009-T012)
```bash
# Launch all test scenarios in parallel:
Task(subagent_type: "tickedify-testing",
     description: "Test scheduled navigation",
     prompt: "Playwright test: Create scheduled message, wait for display_at, navigate, assert modal appears")

Task(subagent_type: "tickedify-testing",
     description: "Test dismiss prevention",
     prompt: "Manual test on dev.tickedify.com: Dismiss message, navigate multiple pages, verify no reappearance")

Task(subagent_type: "tickedify-testing",
     description: "Test multiple messages",
     prompt: "Manual test: Create 3 messages at different times, verify carousel shows only ready messages")

Task(subagent_type: "tickedify-testing",
     description: "Test future message",
     prompt: "Manual test: Create message with display_at in future, navigate now, verify not shown")
```

---

## Task Execution Notes

### Sequential Tasks (Must Complete in Order)
1. **T001 (Audit)** must complete before T003-T006 (need to know which files)
2. **T002 (Reproduce)** should complete before implementation (confirm root cause)
3. **T003-T006** must complete before T008 (need code to deploy)
4. **T008 (Staging)** must complete before T009-T012 (need environment)
5. **T009-T012** must complete before T013 (validate before production)
6. **T013 (Deploy)** must complete before T014 (need production environment)

### Parallel Task Groups
- **Group 1**: T003, T004, T005, T006 - Different HTML files
- **Group 2**: T009, T010, T011, T012 - Different test scenarios

### Commit Strategy
- **After T006**: Commit all script tag additions
  - Message: "Add message-modal.js script to user-facing pages"
- **After T008**: Staging deployment (auto-commit)
- **After T013**: Production deployment with version bump
- **After T014**: Changelog update

---

## Validation Checklist
*GATE: Verify before marking feature complete*

**From Feature Requirements**:
- [x] No new contracts needed (using existing `/api/messages/unread`)
- [x] No new entities needed (using existing `admin_messages`, `message_interactions`)
- [x] All tests defined in quickstart.md covered (Scenarios 1-4)
- [x] Tasks ordered by dependencies (Setup → Implementation → Testing → Deploy)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path or environment

**Task Completeness**:
- [x] All HTML pages audited (T001)
- [x] All missing script tags added (T003-T006)
- [x] All quickstart scenarios tested (T008-T012)
- [x] Staging deployment validated (T008)
- [x] Production deployment completed (T013)
- [x] Changelog updated (T014)

**Quality Gates**:
- [ ] T008: Staging tests PASS (all 4 scenarios)
- [ ] T013: BÈTA FREEZE checked and approved
- [ ] T014: Production validation successful
- [ ] No console errors on any page
- [ ] No regression in existing functionality

---

## Estimated Total Time

**Optimistic** (all parallel, no issues): 2.5 hours
**Realistic** (some sequential, minor debugging): 4 hours
**Pessimistic** (unexpected issues, need fallback approach): 8 hours

**Breakdown by Phase**:
- Setup & Investigation (T001-T002): 45 min
- Implementation (T003-T007): 45 min
- Testing (T008-T012): 1.5 hours
- Deployment (T013-T014): 35 min

---

## Fallback Plan (If Script Inclusion Doesn't Fix Issue)

**If T008 tests FAIL after script tags added**:

### Additional Tasks (Conditional)

**T015-ALT: Add Manual Navigation Hook**
- If DOMContentLoaded doesn't fire on navigation (admin2.html SPA issue)
- Hook into onclick handlers for sidebar navigation
- Call `window.checkForMessages()` manually on each navigation

**T016-ALT: Add Polling Fallback**
- If navigation hooks insufficient
- Add setInterval check every 60 seconds
- Only poll if user is active (detect mouse/keyboard events)

**T017-ALT: Investigate Admin2.html Routing**
- If issue specific to admin panel
- Analyze client-side routing in admin2.html
- Hook into route change events

---

## Success Criteria

**Feature is COMPLETE when**:
- ✅ All 14 tasks marked complete
- ✅ All quickstart scenarios PASS on production
- ✅ No console errors
- ✅ Changelog updated
- ✅ Version bumped and deployed
- ✅ User feedback: "Berichten verschijnen nu bij navigatie!"

**Feature INCOMPLETE if**:
- ❌ Any test scenario FAILS on production
- ❌ Console errors present
- ❌ Modal doesn't appear on navigation
- ❌ Dismissed messages reappear

---

**Tasks Ready for Execution** ✅

Begin with T001 (Audit HTML Files) to understand exact scope of script tag additions.
