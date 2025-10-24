# Tasks: Admin2 Bericht Tijdstip Correctie

**Input**: Design documents from `/specs/030-als-ik-in/`
**Prerequisites**: plan.md ✅, research.md ✅, quickstart.md ✅
**Feature Branch**: `030-als-ik-in`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ Loaded: Frontend-only bug fix, lines 2164 & 2168 in admin2.html
   ✅ Tech stack: Vanilla JavaScript, Node.js, PostgreSQL
   ✅ Structure: Monolithic (single repo, public/ folder)
2. Load optional design documents:
   ✅ research.md: Timezone conversion solution identified
   ✅ quickstart.md: Manual test scenarios defined
   ❌ data-model.md: N/A (no schema changes)
   ❌ contracts/: N/A (no API changes)
3. Generate tasks by category:
   ✅ Setup: Branch verification, code review
   ✅ Tests: Manual test preparation, Playwright E2E
   ✅ Core: Timezone conversion fix (2 lines)
   ✅ Integration: N/A (frontend-only)
   ✅ Polish: Changelog, version bump, staging deployment
4. Apply task rules:
   ✅ Single file (admin2.html) = sequential tasks
   ✅ Manual testing before Playwright (TDD-like for UI)
   ✅ Staging deployment before production (BÈTA FREEZE)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples (limited - sequential fix)
8. Validate task completeness:
   ✅ All test scenarios from quickstart.md covered
   ✅ Fix addresses both publishAt and expiresAt fields
   ✅ Deployment workflow respects BÈTA FREEZE
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- All paths relative to repository root

## Path Conventions
- **Monolithic structure**: `public/` for frontend, `server.js` for backend
- **Modified file**: `public/admin2.html` (lines 2164, 2168)
- **Tests**: Manual via admin2 UI, automated via Playwright

---

## Phase 3.1: Setup & Preparation

- [x] **T001** Verify feature branch `030-als-ik-in` is checked out
  - Command: `git branch --show-current`
  - Expected output: `030-als-ik-in`

- [x] **T002** Review current buggy implementation in `public/admin2.html`
  - Read lines 2150-2180 to understand `loadMessageForEdit()` function
  - Identify lines 2164 and 2168 with incorrect `toISOString()` usage
  - Verify understanding of bug: UTC string shown as local time

- [x] **T003** Backup current admin2.html (safety measure)
  - Command: `cp public/admin2.html public/admin2.html.backup-030`
  - Verify backup exists before proceeding

---

## Phase 3.2: Implementation (Bug Fix)

⚠️ **IMPORTANT**: These tasks modify the same file sequentially

- [x] **T004** Create helper function `toLocalISOString()` in `public/admin2.html`
  - Location: Insert after line 1815 (after DOMContentLoaded, before loadMessageForEdit)
  - Function definition:
    ```javascript
    // Helper: Convert UTC timestamp to local ISO string for datetime-local input
    function toLocalISOString(utcTimestamp) {
        if (!utcTimestamp) return '';
        const date = new Date(utcTimestamp);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 16);
    }
    ```
  - Add comment explaining timezone conversion logic

- [x] **T005** Fix publishAt timezone display (line 2164 in `public/admin2.html`)
  - Find code block starting at line 2161: `// Set scheduling`
  - Replace lines 2162-2165:
    ```javascript
    // BEFORE (incorrect):
    if (msg.publish_at) {
        const publishDate = new Date(msg.publish_at);
        document.getElementById('publishAt').value = publishDate.toISOString().slice(0, 16);
    }

    // AFTER (correct):
    if (msg.publish_at) {
        document.getElementById('publishAt').value = toLocalISOString(msg.publish_at);
    }
    ```

- [x] **T006** Fix expiresAt timezone display (line 2168 in `public/admin2.html`)
  - Find code block at line 2166-2169
  - Replace lines 2166-2169:
    ```javascript
    // BEFORE (incorrect):
    if (msg.expires_at) {
        const expiresDate = new Date(msg.expires_at);
        document.getElementById('expiresAt').value = expiresDate.toISOString().slice(0, 16);
    }

    // AFTER (correct):
    if (msg.expires_at) {
        document.getElementById('expiresAt').value = toLocalISOString(msg.expires_at);
    }
    ```

- [x] **T007** Verify code changes are correct
  - Read modified section (lines 1815-2170)
  - Confirm helper function exists
  - Confirm both publishAt and expiresAt use `toLocalISOString()`
  - Confirm no syntax errors (check for missing braces, semicolons)

---

## Phase 3.3: Manual Testing (Test-First Approach)

⚠️ **IMPORTANT**: Complete ALL manual tests before Playwright automation

- [ ] **T008** Prepare test environment
  - Ensure admin2.html changes are saved
  - Have browser open to localhost or staging
  - Have quickstart.md open for reference

- [ ] **T009** Manual Test 1: Basic timezone round-trip (10:00)
  - Login to admin2: jan@buskens.be / qyqhut-muDvop-fadki9
  - Navigate to Messages → New Message
  - Title: "Timezone Test - 10:00"
  - Set publishAt to 10:00 today
  - Save and reload message for editing
  - **VERIFY**: publishAt field shows **10:00** (not 08:00)
  - Document result: ✅ Pass / ❌ Fail

- [ ] **T010** Manual Test 2: Afternoon time (14:30)
  - Create message: "Timezone Test - 14:30"
  - Set publishAt to 14:30 today
  - Save and reload
  - **VERIFY**: Shows **14:30** (not 12:30)
  - Document result: ✅ Pass / ❌ Fail

- [ ] **T011** Manual Test 3: Evening/midnight boundary (23:00)
  - Create message: "Timezone Test - 23:00"
  - Set publishAt to 23:00 today
  - Save and reload
  - **VERIFY**: Shows **23:00** on same date (not tomorrow 00:00)
  - Document result: ✅ Pass / ❌ Fail

- [ ] **T012** Manual Test 4: Early morning/day boundary (01:00)
  - Create message: "Timezone Test - 01:00"
  - Set publishAt to 01:00 tomorrow
  - Save and reload
  - **VERIFY**: Shows **01:00** on tomorrow's date (not today)
  - Document result: ✅ Pass / ❌ Fail

- [ ] **T013** Manual Test 5: Expiration time (expiresAt field)
  - Create message: "Expiration Test"
  - Set publishAt to 10:00 today
  - Set expiresAt to 18:00 tomorrow
  - Save and reload
  - **VERIFY**: publishAt shows 10:00, expiresAt shows 18:00
  - Document result: ✅ Pass / ❌ Fail

- [ ] **T014** Manual Test 6: Edge case - midnight (00:00)
  - Create message: "Timezone Test - 00:00"
  - Set publishAt to 00:00 tomorrow
  - Save and reload
  - **VERIFY**: Shows 00:00 on tomorrow (not 22:00 today)
  - Document result: ✅ Pass / ❌ Fail

- [ ] **T015** Review all manual test results
  - Count passed tests: __/6
  - If any failed: Debug issue before proceeding
  - Document any unexpected behavior
  - Only proceed to T016 if ALL tests pass

---

## Phase 3.4: Automated Testing (Playwright E2E)

⚠️ **PREREQUISITE**: T008-T015 must ALL pass

- [ ] **T016** Create Playwright test file `tests/playwright/admin-message-timezone.spec.js`
  - Create new file if doesn't exist
  - Import Playwright test utilities
  - Add test suite: "Admin Message Timezone Handling"

- [ ] **T017** Implement Playwright test: "Timezone round-trip verification"
  - Test steps from quickstart.md:
    1. Login to admin2-login.html
    2. Navigate to Messages section
    3. Create message with 10:00 publish time
    4. Save and reload message
    5. Assert publishAt input value contains "10:00"
    6. Assert publishAt input value does NOT contain "08:00"
  - Full test code in plan.md Phase 1 section

- [ ] **T018** Run Playwright test locally
  - Command: `npm run test:playwright -- admin-message-timezone.spec.js`
  - Or use tickedify-testing agent
  - **VERIFY**: Test passes ✅
  - If fails: Review test code and fix implementation

---

## Phase 3.5: Regression Testing

- [ ] **T019** Smoke test: Message creation without scheduled time
  - Create message with only title/content, no publishAt
  - Save successfully
  - **VERIFY**: No JavaScript errors in console

- [ ] **T020** Smoke test: Edit message and clear scheduled time
  - Edit existing message
  - Clear publishAt field (delete value)
  - Save successfully
  - **VERIFY**: publishAt saved as null in database

- [ ] **T021** Smoke test: Preview function still works
  - Create message with 10:00 publishAt
  - Click "👁️ Preview" button
  - **VERIFY**: Preview modal opens without errors

- [ ] **T022** Smoke test: Messages list displays correctly
  - Navigate to Messages section
  - **VERIFY**: All messages show correct metadata
  - **VERIFY**: No timezone-related display issues in list

---

## Phase 3.6: Documentation & Deployment

- [x] **T023** Update `public/changelog.html` with bug fix
  - Add new entry at top:
    ```
    Version: [next version from package.json + 0.0.1]
    Date: 2025-10-24
    Category: 🔧 Bug Fix
    Title: Admin2 Bericht Tijdstip Correctie
    Description: Fixed timezone display bug in admin2 message scheduling.
                 Times now display correctly in local timezone when editing
                 messages (10:00 blijft 10:00, niet meer 08:00).
    Badge: badge-fix
    ```

- [x] **T024** Increment version in `package.json`
  - Read current version
  - Increment patch version (e.g., 0.19.171 → 0.19.172)
  - Update "version" field in package.json

- [x] **T025** Git commit with descriptive message
  - Add files: `git add public/admin2.html public/changelog.html package.json`
  - Commit message format:
    ```
    🔧 FIX: Admin2 Message Timezone Display Bug - v[version]

    Fixed timezone conversion bug where scheduled message times displayed
    2 hours earlier when editing. Now correctly converts UTC to local time
    for datetime-local inputs.

    Changes:
    - Added toLocalISOString() helper function
    - Fixed publishAt timezone display (line 2164)
    - Fixed expiresAt timezone display (line 2168)

    Testing:
    - Manual tests: 6/6 passed
    - Playwright E2E: passed
    - Regression tests: passed

    Files modified:
    - public/admin2.html
    - public/changelog.html
    - package.json
    ```

- [x] **T026** Push to feature branch (NOT main - BÈTA FREEZE)
  - Command: `git push origin 030-als-ik-in`
  - **DO NOT** push to main branch
  - **DO NOT** merge to main branch
  - BÈTA FREEZE is active - staging only

---

## Phase 3.7: Staging Deployment & Verification

⚠️ **BÈTA FREEZE**: Deploy to staging ONLY, NOT production

- [x] **T027** Merge feature branch to develop/staging branch
  - Switch to develop: `git checkout develop`
  - Merge feature: `git merge 030-als-ik-in`
  - Push to develop: `git push origin develop`

- [x] **T028** Deploy to dev.tickedify.com (staging)
  - Trigger Vercel deployment (auto-deploys on push to develop)
  - Wait 2 minutes for deployment to complete
  - Monitor deployment status on Vercel dashboard

- [ ] **T029** Verify deployment via API version endpoint
  - Wait 15 seconds after push
  - Check version: `curl -s -L -k https://dev.tickedify.com/api/version`
  - Expected response: `{"version":"[new version from T024]"}`
  - If version doesn't match: Wait another 15 seconds and retry
  - Max wait: 2 minutes total

- [ ] **T030** Verify fix on staging environment
  - Navigate to: https://dev.tickedify.com/admin2.html
  - Login with: jan@buskens.be
  - Repeat manual test T009 (10:00 timezone test)
  - **VERIFY**: Fix works on staging ✅

- [ ] **T031** Run full regression test suite on staging
  - Execute quickstart.md test scenarios on dev.tickedify.com
  - Verify all 6 manual tests pass
  - Verify smoke tests (T019-T022) pass
  - Document any staging-specific issues

---

## Phase 3.8: Production Readiness (BLOCKED BY BÈTA FREEZE)

⚠️ **IMPORTANT**: DO NOT EXECUTE THESE TASKS until "BÈTA FREEZE IS OPGEHEVEN"

- [ ] **T032** 🔒 **BLOCKED** - Create Pull Request to main branch
  - **WAIT FOR**: Explicit user message "BÈTA FREEZE IS OPGEHEVEN"
  - Title: "🔧 FIX: Admin2 Message Timezone Display Bug"
  - Body: Include changelog entry, test results, staging verification
  - Reviewers: Assign for code review

- [ ] **T033** 🔒 **BLOCKED** - Merge to main after approval
  - **WAIT FOR**: PR approval + BÈTA FREEZE lift
  - Merge strategy: Squash and merge
  - Delete feature branch after merge

- [ ] **T034** 🔒 **BLOCKED** - Deploy to production (tickedify.com)
  - **WAIT FOR**: Successful merge to main + BÈTA FREEZE lift
  - Vercel auto-deploys from main branch
  - Monitor deployment: ~2 minutes

- [ ] **T035** 🔒 **BLOCKED** - Verify production deployment
  - **WAIT FOR**: T034 complete
  - Check version: `curl -s -L -k https://tickedify.com/api/version`
  - Verify fix: Login to tickedify.com/admin2.html
  - Run quick smoke test (create message, verify 10:00 → 10:00)

---

## Dependencies

**Sequential Flow** (single file modification):
```
Setup (T001-T003)
  ↓
Implementation (T004-T007)
  ↓
Manual Testing (T008-T015) ← MUST PASS before proceeding
  ↓
Playwright Testing (T016-T018)
  ↓
Regression Testing (T019-T022)
  ↓
Documentation (T023-T026)
  ↓
Staging Deployment (T027-T031)
  ↓
🔒 BLOCKED: Production (T032-T035) - WAIT FOR BÈTA FREEZE LIFT
```

**Critical Gates**:
- T015 blocks T016: All manual tests must pass before Playwright
- T018 blocks T019: Playwright must pass before regression
- T022 blocks T023: Regression must pass before documentation
- T026 blocks T027: Commit must complete before deployment
- T031 blocks T032: Staging verification before production readiness
- **BÈTA FREEZE blocks T032-T035**: Production tasks forbidden

---

## Parallel Execution Examples

⚠️ **Limited parallelism** - most tasks are sequential (same file)

**Only parallel opportunity**: Manual tests can be batched
```bash
# Tests T009-T014 can be executed in single testing session:
# 1. Open admin2.html once
# 2. Run all 6 test scenarios back-to-back
# 3. Document all results together
```

**No Task agent parallelism** - all tasks modify `public/admin2.html` or depend on previous results.

---

## Task Validation Checklist

**Completeness**:
- [x] All test scenarios from quickstart.md covered (T009-T014)
- [x] Both publishAt and expiresAt fields fixed (T005-T006)
- [x] Regression tests included (T019-T022)
- [x] Deployment workflow respects BÈTA FREEZE (T027-T031 staging, T032-T035 blocked)

**Correctness**:
- [x] Helper function created before usage (T004 before T005-T006)
- [x] Manual tests before automation (T009-T015 before T016-T018)
- [x] Staging deployment before production (T027-T031 before T032-T035)
- [x] All tasks specify exact file paths

**Safety**:
- [x] Backup created before modification (T003)
- [x] Verification steps after each phase (T007, T015, T018, T022, T031)
- [x] Production tasks clearly blocked (🔒 marker on T032-T035)

---

## Notes

- **Single file**: All implementation in `public/admin2.html` - no parallel [P] tasks
- **Test-first**: Manual testing (T009-T015) before Playwright (T016-T018)
- **BÈTA FREEZE**: Tasks T032-T035 are BLOCKED until explicit freeze lift
- **Staging only**: Maximum deployment is dev.tickedify.com (T027-T031)
- **Version bump**: Each deployment requires version increment (T024)
- **Changelog**: User-facing documentation of fix (T023)

---

## Success Criteria

**Implementation Complete**: T001-T007 ✅
**Testing Complete**: T008-T022 ✅ (all tests pass)
**Staging Deployed**: T023-T031 ✅ (verified on dev.tickedify.com)
**Production Ready**: T032-T035 ⏸️ (ready but blocked by BÈTA FREEZE)

**Overall Success**:
- ✅ Timezone bug fixed (10:00 → 10:00, not 08:00)
- ✅ All manual tests pass (6/6)
- ✅ Playwright E2E passes
- ✅ No regressions introduced
- ✅ Staging deployment verified
- ⏸️ Production deployment awaits BÈTA FREEZE lift
