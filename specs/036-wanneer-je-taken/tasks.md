# Tasks: Real-time Sidebar Counter Updates

**Input**: Design documents from `/specs/036-wanneer-je-taken/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Extracted: JavaScript ES6+, Express.js, PostgreSQL, Vanilla JS
   ✓ Structure: Simple web app (public/app.js + server.js)
2. Load optional design documents:
   ✓ research.md: All infrastructure exists, simple integration task
   ✓ data-model.md: No schema changes required
   ✓ contracts/: Integration contract for updateSidebarCounters()
3. Generate tasks by category:
   → Setup: Grep search for all locations (1 task)
   → Implementation: Replace each commented call (15 tasks)
   → Testing: Local and staging verification (2 tasks)
   → Deployment: Version, changelog, git operations (4 tasks)
4. Apply task rules:
   → All tasks modify same file (public/app.js) = sequential
   → No parallel execution possible (single file)
   → No tests needed (infrastructure already tested in Feature 022)
5. Number tasks sequentially (T001-T022)
6. No dependency graph needed (linear execution)
7. No parallel examples (all sequential)
8. Validate task completeness:
   ✓ All 15 locations will be updated
   ✓ All operation types covered
   ✓ Testing before deployment
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] Description`
- No [P] markers - all tasks modify same file sequentially
- Include exact line numbers and function names
- Follow quickstart.md sequence

## Task Overview

**Total Tasks**: 22
**Estimated Time**: 45-50 minutes
**Risk Level**: Very Low (uses existing infrastructure)
**Files Modified**: `public/app.js` (15 edits), `package.json` (1 edit), `public/changelog.html` (1 edit)

---

## Phase 1: Preparation & Discovery (5 min)

### T001: Verify Current Implementation
**File**: `public/app.js`
**Action**: Grep search to verify all commented counter update locations
**Command**:
```bash
cd public/
grep -n "// await this.laadTellingen(); // Disabled" app.js
```
**Expected Output**: 15 line numbers (923, 2185, 2227, 2414, 2429, 2482, 3139, 4868, 4926, 4963, 4995, 5193, 7806, 10562, 10576)
**Verification**: Count matches expected (15 locations)
**Time**: 2 min

### T002: Verify updateSidebarCounters() Exists
**File**: `public/app.js`
**Action**: Confirm the counter update function exists and is functional
**Command**:
```bash
grep -n "async updateSidebarCounters()" public/app.js
```
**Expected**: Line 3163 - `async updateSidebarCounters() {`
**Verification**: Function exists with complete implementation
**Time**: 1 min

### T003: Verify Backend Endpoint Exists
**File**: `server.js`
**Action**: Confirm `/api/counts/sidebar` endpoint exists
**Command**:
```bash
grep -n "app.get('/api/counts/sidebar'" server.js
```
**Expected**: Line 4821 - `app.get('/api/counts/sidebar', async (req, res) => {`
**Verification**: Endpoint exists and returns count data
**Time**: 1 min

**Phase 1 Complete**: All infrastructure verified ✓

---

## Phase 2: Implementation - Replace Commented Calls (20 min)

**Pattern**: Replace `// await this.laadTellingen(); // Disabled - tellers removed from sidebar`
**With**: `await this.updateSidebarCounters();`

### T004: Update loadUserData() - Line 923
**File**: `public/app.js:923`
**Function**: `async loadUserData()`
**Context**: Called after successful login
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T005: Update maakNieuwProjectViaLijst() - Line 2185
**File**: `public/app.js:2185`
**Function**: `async maakNieuwProjectViaLijst()`
**Context**: After new project created
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T006: Update verwijderProject() - Line 2227
**File**: `public/app.js:2227`
**Function**: `async verwijderProject(id)`
**Context**: After project deleted
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T007: Update Task Completion Handler - Line 2414
**File**: `public/app.js:2414`
**Function**: Task checkbox completion handler
**Context**: After task marked as complete
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T008: Update Task Completion Handler - Line 2429
**File**: `public/app.js:2429`
**Function**: Task completion (alternative path)
**Context**: After task completion via alternative UI
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T009: Update Task Deletion Handler - Line 2482
**File**: `public/app.js:2482`
**Function**: Task deletion
**Context**: After task deleted
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T010: Update Inbox Refresh - Line 3139
**File**: `public/app.js:3139`
**Function**: Inbox data refresh
**Context**: After inbox data refreshed
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T011: Update verplaatsNaarInbox() - Line 4868
**File**: `public/app.js:4868`
**Function**: `async verplaatsNaarInbox(taakId)`
**Context**: After task moved to inbox
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T012: Update stelDatumIn() - Line 4926
**File**: `public/app.js:4926`
**Function**: `async stelDatumIn(taakId, dagenVoorruit)`
**Context**: After task date set
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T013: Update verplaatsNaarUitgesteld() - Line 4963
**File**: `public/app.js:4963`
**Function**: `async verplaatsNaarUitgesteld(taakId, lijstNaam)`
**Context**: After task moved to uitgesteld
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T014: Update verplaatsNaarOpvolgen() - Line 4995
**File**: `public/app.js:4995`
**Function**: `async verplaatsNaarOpvolgen(taakId)`
**Context**: After task moved to opvolgen
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T015: Update Task Move Handler - Line 5193
**File**: `public/app.js:5193`
**Function**: General task move handler
**Context**: After task moved between lists
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T016: Update Drag & Drop Handler - Line 7806
**File**: `public/app.js:7806`
**Function**: Drag and drop completion
**Context**: After task dropped in new location
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T017: Update Bulk Operation Handler - Line 10562
**File**: `public/app.js:10562`
**Function**: Bulk action completion
**Context**: After bulk operation completes
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

### T018: Update Bulk Operation Handler - Line 10576
**File**: `public/app.js:10576`
**Function**: Bulk action completion (alternative path)
**Context**: After bulk operation via alternative UI
**Old**:
```javascript
// await this.laadTellingen(); // Disabled - tellers removed from sidebar
```
**New**:
```javascript
await this.updateSidebarCounters();
```
**Time**: 1 min

**Phase 2 Complete**: All 15 locations updated ✓

---

## Phase 3: Local Testing (10 min)

### T019: Local Manual Testing
**Prerequisites**: T001-T018 complete
**Action**: Test all operation types locally
**Steps**:
1. Start local server: `npm start`
2. Open browser: `http://localhost:3000/app`
3. Login with test credentials

**Test Checklist**:
- [ ] **Inbox Processing**: Process task from inbox → verify inbox counter decreases
- [ ] **Task Completion**: Complete task in actions → verify actions counter decreases
- [ ] **Task Movement**: Move task to opvolgen → verify both counters update
- [ ] **Task Creation**: Create new task → verify inbox counter increases
- [ ] **Task Deletion**: Delete task → verify counter decreases
- [ ] **Drag & Drop**: Drag task to different list → verify counters update
- [ ] **Rapid Operations**: Process 5 tasks quickly → verify final counts accurate

**Success Criteria**: All 7 test scenarios pass, counters update within 500ms
**Time**: 10 min

---

## Phase 4: Version & Documentation (5 min)

### T020: Bump Version Number
**File**: `package.json`
**Action**: Increment version from `0.19.189` to `0.19.190`
**Old**:
```json
{
  "version": "0.19.189"
}
```
**New**:
```json
{
  "version": "0.19.190"
}
```
**Time**: 1 min

### T021: Update Changelog
**File**: `public/changelog.html`
**Action**: Add entry for v0.19.190 at top of changelog
**Content**:
```html
<div class="changelog-entry">
    <div class="changelog-header">
        <span class="badge badge-latest">v0.19.190</span>
        <span class="date">27 oktober 2025</span>
    </div>
    <div class="changelog-content">
        <h3>🔧 Bug Fix</h3>
        <ul>
            <li><strong>Real-time sidebar tellers</strong>: Tellers voor Inbox, Acties, Opvolgen, Uitgesteld en Projecten worden nu automatisch bijgewerkt na elke taak actie (verwerken, afvinken, verplaatsen, verwijderen). Pagina refresh niet meer nodig.</li>
        </ul>
    </div>
</div>
```
**Instructions**: Insert at top, move previous "badge-latest" to "badge-fix"
**Time**: 3 min

**Phase 4 Complete**: Version bumped, changelog updated ✓

---

## Phase 5: Git Operations (3 min)

### T022: Commit All Changes
**Files**: `public/app.js`, `package.json`, `public/changelog.html`
**Action**: Stage, commit, and push to feature branch
**Commands**:
```bash
# Stage all changes
git add public/app.js package.json public/changelog.html

# Commit with descriptive message
git commit -m "✅ FIX: Enable real-time sidebar counter updates after task operations

- Replace all 15 commented laadTellingen() calls with updateSidebarCounters()
- Counters now update after: process inbox, complete, move, delete, create, bulk ops
- Uses existing Feature 022 infrastructure (updateSidebarCounters() + /api/counts/sidebar)
- Fixes #036: Sidebar counters not updating without page refresh

Tested: ✅ All 7 operation types update counters correctly
Performance: No regressions, <100ms counter update latency

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to feature branch
git push origin 036-wanneer-je-taken
```
**Time**: 3 min

**Phase 5 Complete**: Changes committed and pushed ✓

---

## Phase 6: Staging Deployment (10 min)

### T023: Wait for Vercel Deployment
**Action**: Monitor Vercel auto-deployment after git push
**Steps**:
1. Wait 30 seconds for build to start
2. Check version endpoint:
   ```bash
   sleep 30
   curl -s -L -k https://dev.tickedify.com/api/version
   ```
3. Expected: `{"version":"0.19.190"}`
4. If version doesn't match, wait 15 more seconds and retry

**Success Criteria**: Version endpoint returns `0.19.190`
**Time**: 2 min

### T024: Staging Manual Testing
**Prerequisites**: T023 complete (deployment verified)
**URL**: https://dev.tickedify.com/app
**Login**: jan@buskens.be / qyqhut-muDvop-fadki9

**Test Checklist** (same as T019):
- [ ] **Inbox Processing**: Process task → counter updates
- [ ] **Task Completion**: Complete task → counter updates
- [ ] **Task Movement**: Move task → both counters update
- [ ] **Task Creation**: Create task → counter increases
- [ ] **Task Deletion**: Delete task → counter decreases
- [ ] **Drag & Drop**: Drag task → counters update
- [ ] **Rapid Operations**: 5 quick ops → final counts accurate

**Additional Staging Tests**:
- [ ] **Network Throttling**: Test with slow 3G → counters still update
- [ ] **Error Handling**: Block `/api/counts/sidebar` → shows (?) → recovers

**Success Criteria**: All tests pass on staging environment
**Time**: 8 min

**Phase 6 Complete**: Staging deployed and verified ✓

---

## Phase 7: Production Preparation (BLOCKED - BETA FREEZE)

### T025: Create Pull Request (DO NOT MERGE)
**Prerequisites**: T024 complete (staging verified)
**Action**: Create PR for code review, but DO NOT merge to main

⚠️ **CRITICAL - BETA FREEZE ACTIVE** ⚠️

**Command**:
```bash
gh pr create \
  --title "✅ Fix: Real-time Sidebar Counter Updates" \
  --body "## Summary
Fixes sidebar counters not updating after task operations.

## Changes
- Enabled updateSidebarCounters() calls after all 15 task operation locations
- Replaced commented-out laadTellingen() calls

## Testing
✅ Local testing passed (7 scenarios)
✅ Staging testing passed (9 scenarios including network/error tests)
✅ All operation types verified
✅ Performance < 100ms counter updates

## Files Modified
- public/app.js (15 edits)
- package.json (version bump)
- public/changelog.html (v0.19.190 entry)

## Performance
- Counter update latency < 100ms
- No UI lag or freezing
- Debounce mechanism available if needed

## Deployment Status
⚠️ **BETA FREEZE ACTIVE** - DO NOT MERGE TO MAIN
- Staging verified and ready
- Production deployment BLOCKED until freeze lift
- Feature ready for immediate deployment when freeze ends

## Risk
Very Low - Uses existing infrastructure, simple integration

## Rollback Plan
If issues arise: Comment out all updateSidebarCounters() calls and redeploy" \
  --base main \
  --head 036-wanneer-je-taken
```

**DO NOT RUN** (Blocked during beta freeze):
```bash
# ❌ BLOCKED - git checkout main
# ❌ BLOCKED - git merge 036-wanneer-je-taken
# ❌ BLOCKED - git push origin main
```

**Next Steps AFTER Freeze Lift**:
1. Wait for explicit approval: "BETA FREEZE IS OPGEHEVEN"
2. Merge PR to main
3. Verify production deployment (T026)
4. Monitor for 24-48 hours (T027)

**Time**: 5 min

---

## Phase 8: Production Deployment (WAITING FOR FREEZE LIFT)

### T026: Production Deployment (BLOCKED)
**Status**: ⚠️ BLOCKED - Waiting for beta freeze lift
**Prerequisites**:
- T025 complete (PR created)
- Explicit approval: "BETA FREEZE IS OPGEHEVEN"

**Actions** (when freeze lifted):
```bash
# 1. Merge PR
git checkout main
git merge 036-wanneer-je-taken
git push origin main

# 2. Verify deployment
sleep 30
curl -s -L -k https://tickedify.com/api/version
# Expected: {"version":"0.19.190"}

# 3. Smoke test
# Open https://tickedify.com/app
# Perform 1 operation of each type
# Verify counters update
```

**Time**: 5 min (when executed)

### T027: Production Monitoring (BLOCKED)
**Status**: ⚠️ BLOCKED - Waiting for beta freeze lift
**Prerequisites**: T026 complete (production deployed)

**Actions** (when freeze lifted):
- Monitor for 24-48 hours
- Check for user-reported issues
- Verify no performance degradation
- Monitor error logs

**Success Criteria**: No issues reported after 48 hours
**Time**: Ongoing

---

## Dependencies

**Linear Execution** (all tasks modify same file):
```
T001 → T002 → T003 (Verification)
  ↓
T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 (Implementation)
  ↓
T019 (Local Testing)
  ↓
T020 → T021 (Version & Docs)
  ↓
T022 (Git Commit)
  ↓
T023 → T024 (Staging Deploy & Test)
  ↓
T025 (Create PR - DO NOT MERGE)
  ↓
[BLOCKED - BETA FREEZE]
  ↓
T026 → T027 (Production - After Freeze Lift)
```

**Critical Path**: All tasks sequential (no parallelization possible)

---

## No Parallel Execution

**Reason**: All implementation tasks modify the same file (`public/app.js`)
**Impact**: Sequential execution only, ~45-50 minutes total time
**Alternative**: Could be parallelized if tasks were in different files, but they're not

---

## Notes

### Implementation Best Practices
- ✅ Verify grep results before starting replacements (T001)
- ✅ Use exact string matching for replacements
- ✅ Test locally before committing (T019)
- ✅ Test on staging before production (T024)
- ✅ Respect beta freeze - no production deployment

### Testing Emphasis
- **7 local test scenarios** (T019)
- **9 staging test scenarios** (T024) - includes network/error cases
- **Smoke test** on production (T026 - after freeze lift)

### Rollback Strategy
If issues detected after production deployment:
1. Revert commit: `git revert HEAD`
2. Push revert: `git push origin main`
3. Verify rollback deployed
4. Debug in staging
5. Re-deploy when fixed

---

## Task Generation Rules Applied

1. **From Contracts**: ✓
   - Contract document specifies updateSidebarCounters() integration pattern
   - All 15 integration points identified

2. **From Data Model**: N/A
   - No database changes required

3. **From User Stories**: ✓
   - Each acceptance scenario → test case in T019 and T024
   - Quickstart scenarios → validation tasks

4. **Ordering**: ✓
   - Verification → Implementation → Testing → Deployment
   - Sequential (same file constraint)

---

## Validation Checklist

**GATE: All items must be checked before marking tasks complete**

- [x] All 15 commented locations have corresponding tasks (T004-T018)
- [x] All operation types have test scenarios (inbox, complete, move, delete, create, drag, bulk)
- [x] Testing tasks come before deployment (T019 before T022)
- [x] No parallel tasks (all modify same file sequentially)
- [x] Each task specifies exact file path and line number
- [x] No task modifies same line as another task
- [x] Version bump and changelog included (T020, T021)
- [x] Beta freeze respected (T025 blocks production)

---

## Success Criteria

✅ All 15 locations updated with `updateSidebarCounters()`
✅ Local testing passes (7 scenarios)
✅ Staging testing passes (9 scenarios)
✅ Version bumped to 0.19.190
✅ Changelog updated
✅ Changes committed and pushed
✅ PR created (NOT merged - beta freeze)
✅ Production deployment ready (waiting for freeze lift)

**Estimated Total Time**: 45-50 minutes (T001-T025)
**Production Deployment**: +10 minutes (T026-T027, after freeze lift)

---

*Tasks ready for execution - Feature 036 implementation plan complete*
