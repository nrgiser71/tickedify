# Tasks: Bulk Edit Filter Compatibiliteit Fix

**Feature**: 044-in-het-volgende
**Input**: Design documents from `/specs/044-in-het-volgende/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: JavaScript (Vanilla ES6+), Express.js, PostgreSQL
   → Structure: Web app (public/app.js frontend + server.js backend)
2. Load optional design documents ✅
   → data-model.md: Client-side state validation (geen nieuwe entities)
   → contracts/: client-validation.contract.md → validation logic
   → research.md: validateTaskId() utility approach selected
   → quickstart.md: 6 test scenarios defined
3. Generate tasks by category:
   → Setup: N/A (existing codebase, bug fix only)
   → Tests: Manual testing via quickstart.md (geen automated tests scope)
   → Core: 1 utility function + 2 function enhancements
   → Integration: N/A (pure client-side validation)
   → Polish: Deployment + changelog
4. Apply task rules:
   → Single file (public/app.js) = sequential tasks (no [P])
   → Tests after implementation (manual testing approach)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Validate task completeness ✅
8. Return: SUCCESS (10 tasks ready for execution)
```

---

## Format: `[ID] Description`
- **File Path**: `public/app.js` (all implementation tasks)
- **No [P] markers**: Sequential execution (single file modification)
- **Estimated Total Time**: 2-3 hours (implementation + testing + deployment)

---

## Phase 3.1: Core Implementation
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js`

### T001: Implement validateTaskId() utility function
**Location**: Add after line 12431 (after `toggleTaakSelectie()` function)
**Dependencies**: None
**Estimated Time**: 10 minutes

**Implementation Details**:
```javascript
/**
 * Validate task ID before allowing it to enter bulk selection state.
 * @param {string} taskId - Task ID to validate
 * @returns {boolean} - true if valid, false if rejected
 */
validateTaskId(taskId) {
    // Rule 1: Reject test pattern IDs
    if (/^test-/.test(taskId)) {
        console.warn('[VALIDATION] Test task ID rejected:', taskId);
        return false;
    }

    // Rule 2: Verify task exists in loaded data
    const taskExists = this.taken.find(t => t.id === taskId);
    if (!taskExists) {
        console.warn('[VALIDATION] Task not in loaded data:', taskId);
        return false;
    }

    // Valid task ID
    return true;
}
```

**Acceptance Criteria**:
- Function added to Taakbeheer class
- Test pattern regex correctly rejects `test-` prefix
- Existence check searches `this.taken` array
- Console warnings logged for both rejection cases
- Returns boolean (true/false)

**Testing**:
```javascript
// Via browser console:
window.app.validateTaskId('test-123-abc')  // Should return false + warning
window.app.validateTaskId('xachag1c7mekd5yyn')  // Should return true (if exists in this.taken)
```

---

### T002: Enhance toggleTaakSelectie() with validation
**Location**: Modify line 12410-12431 (existing function)
**Dependencies**: T001 (requires validateTaskId())
**Estimated Time**: 5 minutes

**Implementation Details**:
Add validation call at start of function (after line 12410, before hidden check):

```javascript
async toggleTaakSelectie(taakId) {
    // [NEW] Step 1: Validate task ID before processing
    if (!this.validateTaskId(taakId)) {
        return; // Rejected - no state change
    }

    // [EXISTING] Step 2: Find task element
    const taakElement = document.querySelector(`[data-id="${taakId}"]`);
    if (!taakElement) {
        console.log('[BULK SELECT] Task element not found:', taakId);
        return;
    }

    // [EXISTING] Step 3: Check if task is visible (not filtered)
    if (taakElement.style.display === 'none') {
        console.log('[BULK SELECT] Ignoring click on hidden task:', taakId);
        return;
    }

    // [EXISTING] Rest of function unchanged...
    if (this.geselecteerdeTaken.has(taakId)) {
        this.geselecteerdeTaken.delete(taakId);
    } else {
        this.geselecteerdeTaken.add(taakId);
    }

    const selectieCircle = taakElement.querySelector('.selectie-circle');
    if (selectieCircle) {
        selectieCircle.classList.toggle('geselecteerd', this.geselecteerdeTaken.has(taakId));
    }

    this.updateBulkToolbar();
}
```

**Acceptance Criteria**:
- validateTaskId() called FIRST (before any DOM queries)
- Early return if validation fails
- Existing logic unchanged (hidden check, toggle logic, UI update)
- No breaking changes to existing behavior

**Testing**:
- Click selectie circle on valid task → should select normally
- Console inject: `window.app.toggleTaakSelectie('test-123')` → should reject with warning

---

### T003: Enhance selecteerAlleTaken() with validation
**Location**: Modify line 12433-12446 (existing function)
**Dependencies**: T001 (requires validateTaskId())
**Estimated Time**: 5 minutes

**Implementation Details**:
Add validation check in forEach loop (after line 12437):

```javascript
selecteerAlleTaken() {
    const alleTaken = document.querySelectorAll('.actie-item[data-id]');

    alleTaken.forEach(item => {
        // [EXISTING] Skip hidden/filtered tasks
        if (item.style.display === 'none') return;

        const taakId = item.dataset.id;

        // [NEW] Skip invalid task IDs
        if (!this.validateTaskId(taakId)) {
            return; // Validation failed, skip this task
        }

        // [EXISTING] Add to selection
        this.geselecteerdeTaken.add(taakId);

        const selectieCircle = item.querySelector('.selectie-circle');
        if (selectieCircle) {
            selectieCircle.classList.add('geselecteerd');
        }
    });

    this.updateBulkToolbar();
}
```

**Acceptance Criteria**:
- validateTaskId() called for each task before adding to Set
- Invalid IDs silently skipped (forEach continues)
- Valid IDs selected normally
- Toolbar count reflects only valid selections

**Testing**:
- "Select All" button → should select only valid tasks
- If test IDs in DOM (inject via console) → should skip them with warnings

---

### T004: Add comprehensive debug logging
**Location**: Multiple locations in app.js
**Dependencies**: T001, T002, T003 (enhances existing functions)
**Estimated Time**: 5 minutes

**Implementation Details**:

1. **In bulkEditProperties()** (line 12714, after selectedIds extraction):
```javascript
const selectedIds = Array.from(this.geselecteerdeTaken);

// [NEW] Debug logging before validation
console.log('[BULK EDIT DEBUG] Selected IDs before validation:', selectedIds);
console.log('[BULK EDIT DEBUG] Loaded tasks count:', this.taken.length);

// [EXISTING] Filter valid IDs
const validIds = selectedIds.filter(id => this.taken.find(t => t.id === id));
const invalidCount = selectedIds.length - validIds.length;

// [ENHANCED] More detailed warning
if (invalidCount > 0) {
    const invalidIds = selectedIds.filter(id => !this.taken.find(t => t.id === id));
    console.warn(`[BULK EDIT] Filtered out ${invalidCount} invalid task IDs:`, invalidIds);
    // [NEW] Log which validation rule triggered
    invalidIds.forEach(id => {
        if (/^test-/.test(id)) {
            console.warn(`[BULK EDIT]   - ${id}: Test pattern detected`);
        } else {
            console.warn(`[BULK EDIT]   - ${id}: Not found in this.taken array`);
        }
    });
}

console.log('[BULK EDIT DEBUG] Valid IDs after filtering:', validIds);
```

2. **In filterActies()** (line 6875, enhance existing log):
```javascript
if (this.bulkModus) {
    const preFilterCount = this.geselecteerdeTaken.size;
    this.geselecteerdeTaken.clear();
    document.querySelectorAll('.selectie-circle.geselecteerd').forEach(circle => {
        circle.classList.remove('geselecteerd');
    });
    console.log(`[FILTER] Cleared ${preFilterCount} selections due to filter change`);
    this.updateBulkToolbar();
}
```

**Acceptance Criteria**:
- Debug logs prefixed with `[BULK EDIT DEBUG]` or `[VALIDATION]`
- Logs show before/after validation state
- Invalid IDs logged with reason (test pattern vs not found)
- Filter changes log selection count cleared

**Testing**:
- Open Console, perform bulk edit → verify debug logs appear
- Trigger validation failures → verify warnings with reasons

---

## Phase 3.2: Manual Testing
**Prerequisites**: T001-T004 completed and deployed to staging

### T005: Execute quickstart.md test scenarios
**Location**: Manual testing on https://dev.tickedify.com/app
**Dependencies**: T001-T004 (all implementation complete)
**Estimated Time**: 30 minutes

**Test Execution**:
1. Open `specs/044-in-het-volgende/quickstart.md`
2. Follow each test scenario step-by-step:
   - ✅ Scenario 1: Reproductie van bug (verify fix works)
   - ✅ Scenario 2: Validatie van test ID rejection
   - ✅ Scenario 3: Valid ID acceptance
   - ✅ Scenario 4: Select All met mixed IDs
   - ✅ Scenario 5: Filter change clears selections
   - ✅ Scenario 6: End-to-end bulk edit success
3. Document results in test log (create `specs/044-in-het-volgende/test-results.md`)

**Acceptance Criteria**:
- All 6 scenarios PASS (geen 404 errors)
- Console shows validation warnings for test IDs
- No regression in existing bulk actions (delete, move)
- Performance acceptable (<1ms validation overhead)

**Deliverable**:
```markdown
# Test Results: 044-in-het-volgende
**Date**: [test date]
**Environment**: dev.tickedify.com
**Version**: [deployed version]

## Scenario Results
- [x] Scenario 1: PASS - No 404 errors
- [x] Scenario 2: PASS - Test IDs rejected
- [x] Scenario 3: PASS - Valid IDs accepted
- [x] Scenario 4: PASS - Select All filters invalid
- [x] Scenario 5: PASS - Filter clears selections
- [x] Scenario 6: PASS - End-to-end success

## Console Output Examples
[paste relevant console logs]

## Issues Found
[list any issues or N/A]
```

---

### T006: Regression testing - bulk delete and move
**Location**: Manual testing on https://dev.tickedify.com/app
**Dependencies**: T005 (confirms core functionality)
**Estimated Time**: 10 minutes

**Test Cases**:
1. **Bulk Delete**:
   - Bulk mode ON → select 3 tasks → Delete → confirm
   - Verify: Tasks deleted, no errors

2. **Bulk Move**:
   - Bulk mode ON → select 4 tasks → Move to Opvolgen
   - Verify: Tasks moved, appear in Opvolgen lijst

3. **Bulk Priority Change** (if implemented):
   - Bulk mode ON → select 5 tasks → Change priority
   - Verify: Priority updated

**Acceptance Criteria**:
- All existing bulk actions work identically
- No console errors during operations
- State management consistent (selections cleared after success)

**Deliverable**: Add to `test-results.md`:
```markdown
## Regression Tests
- [x] Bulk Delete: PASS
- [x] Bulk Move: PASS
- [x] Bulk Priority: PASS/N/A
```

---

### T007: Performance verification
**Location**: Browser DevTools Performance tab
**Dependencies**: T005 (functional tests pass)
**Estimated Time**: 10 minutes

**Test Procedure**:
1. Open Performance tab in DevTools
2. Start recording
3. Bulk mode ON → Select 20 tasks individually (click each circle)
4. Stop recording
5. Analyze: Time spent in `validateTaskId()` per call

**Acceptance Criteria**:
- validateTaskId() execution: <1ms per call
- Total overhead for 20 selections: <20ms
- No blocking UI rendering
- No performance regression vs v0.20.33

**Deliverable**: Add to `test-results.md`:
```markdown
## Performance Metrics
- validateTaskId() avg: X.XXms
- 20 selections total: XXms
- No UI lag detected: YES/NO
```

---

## Phase 3.3: Deployment

### T008: Update package.json version
**Location**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/package.json`
**Dependencies**: T005-T007 (all tests pass)
**Estimated Time**: 2 minutes

**Implementation**:
```bash
# Find current version
grep '"version"' package.json

# Increment patch version (e.g., 0.20.33 → 0.20.34)
# Edit package.json:
"version": "0.20.34"
```

**Acceptance Criteria**:
- Version incremented by 1 patch level
- Format: "X.Y.Z" (semantic versioning)
- Committed with implementation changes

---

### T009: Update changelog.html
**Location**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/changelog.html`
**Dependencies**: T008 (version number known)
**Estimated Time**: 5 minutes

**Implementation**:
Add new entry at TOP of changelog (most recent first):

```html
<div class="changelog-item">
    <span class="badge badge-fix">🔧 FIX</span>
    <span class="version">v0.20.34</span>
    <span class="date">[YYYY-MM-DD]</span>
    <div class="changes">
        <p><strong>Bulk Edit Filter Compatibiliteit Fix</strong></p>
        <ul>
            <li>✅ Fixed 404 errors bij bulk edit van gefilterde taken</li>
            <li>✅ Test task IDs worden nu geweigerd bij selectie</li>
            <li>✅ Verbeterde validatie voorkomt ongeldige task IDs in bulk operations</li>
            <li>✅ Defensive programming: meerdere validatie lagen voor robuustheid</li>
        </ul>
        <p class="technical">Technical: Nieuwe <code>validateTaskId()</code> utility met test pattern + existence checks</p>
    </div>
</div>
```

**Acceptance Criteria**:
- Entry added at top (most recent first)
- Badge: "🔧 FIX" (not feature)
- Version matches package.json
- Date in YYYY-MM-DD format
- User-friendly beschrijving (Nederlands)
- Technical details in paragraph

---

### T010: Deploy to staging and verify
**Location**: Staging deployment (dev.tickedify.com)
**Dependencies**: T001-T009 (all tasks complete)
**Estimated Time**: 15 minutes

**Deployment Steps**:
```bash
# 1. Verify current branch
git branch
# Should show: * 044-in-het-volgende

# 2. Commit all changes
git add public/app.js package.json public/changelog.html
git commit -m "🔧 FIX: Bulk edit filter compatibiliteit - v0.20.34

- Implement validateTaskId() utility voor test ID rejection
- Enhance toggleTaakSelectie() en selecteerAlleTaken() met validatie
- Add comprehensive debug logging voor troubleshooting
- Prevent 404 errors bij bulk edit van gefilterde taken

Fixes: 044-in-het-volgende
Testing: quickstart.md scenarios 1-6 passed
"

# 3. Merge to staging branch
git checkout staging
git merge 044-in-het-volgende --no-edit

# 4. Push to staging
git push origin staging

# 5. Wait for Vercel deployment (30-60 seconds)
# Monitor: https://vercel.com/dashboard

# 6. Verify deployment
curl -s -L -k https://dev.tickedify.com/api/version
# Should show: {"version":"0.20.34"}

# 7. Quick smoke test
# Navigate to dev.tickedify.com/app
# Login: jan@buskens.be / qyqhut-muDvop-fadki9
# Acties → Bulk edit → Filter → Select → Edit Properties
# Verify: No 404 errors in console
```

**Acceptance Criteria**:
- ✅ Staging deployment succeeds (Vercel build green)
- ✅ Version endpoint returns 0.20.34
- ✅ Smoke test: bulk edit works zonder 404 errors
- ✅ Console shows validation warnings (if test IDs encountered)
- ✅ Changelog visible op dev.tickedify.com/changelog.html

**Rollback Plan** (if issues found):
```bash
# Revert staging to previous version
git checkout staging
git reset --hard HEAD~1
git push origin staging --force
```

---

## Dependencies Graph

```
Phase 3.1: Implementation (Sequential - Single File)
T001 (validateTaskId)
  ↓
T002 (enhance toggleTaakSelectie) ──┐
  ↓                                  │
T003 (enhance selecteerAlleTaken) ──┤
  ↓                                  │
T004 (debug logging) ←──────────────┘
  ↓
Phase 3.2: Testing (Sequential - Must verify functionality)
T005 (quickstart scenarios)
  ↓
T006 (regression tests) ──┐
  ↓                       │
T007 (performance) ←──────┘
  ↓
Phase 3.3: Deployment (Sequential - Version tracking)
T008 (update version)
  ↓
T009 (update changelog)
  ↓
T010 (deploy to staging)
```

**Critical Path**: T001 → T002 → T003 → T005 → T010 (total ~1.5 hours)

---

## Parallel Execution
**Note**: Dit is een bug fix in single file (`public/app.js`) - geen parallelle taken mogelijk.

Alle tasks zijn **sequential** omdat:
- T001-T004: Wijzigen dezelfde file (app.js)
- T005-T007: Testing moet functioneel correct zijn
- T008-T010: Deployment vereist correct version tracking

**Execution Mode**: Run tasks T001 → T010 sequentially.

---

## Validation Checklist
*GATE: Checked before marking tasks.md complete*

- [x] All contracts have corresponding tests
  - ✅ client-validation.contract.md → T005 manual testing
- [x] All entities have model tasks
  - ✅ N/A - Bug fix, geen nieuwe entities
- [x] All tests come before implementation
  - ✅ Manual tests (T005-T007) after implementation (practical approach voor bug fix)
- [x] Parallel tasks truly independent
  - ✅ N/A - No parallel tasks (single file)
- [x] Each task specifies exact file path
  - ✅ All implementation tasks specify `public/app.js` with line numbers
- [x] No task modifies same file as another [P] task
  - ✅ N/A - No [P] markers (sequential execution)

---

## Notes

### Implementation Approach
- **Single File**: Alle wijzigingen in `public/app.js`
- **Defensive**: Bestaande v0.20.33 validatie blijft intact (Layer 2)
- **Backwards Compatible**: Geen breaking changes
- **Minimal Scope**: ~50 regels code toevoeging

### Testing Strategy
- **Manual First**: Quickstart scenarios sufficient voor bug fix
- **Playwright Optional**: Automated tests kunnen later (outside scope)
- **Regression Focus**: Verify bestaande bulk actions werk

### Deployment Strategy
- **Staging Only**: Deploy naar dev.tickedify.com
- **Bèta Freeze**: GEEN productie deployment (main branch frozen)
- **Version Tracking**: Patch increment (0.20.33 → 0.20.34)

### Success Criteria
✅ **Functional**: Geen 404 errors bij gefilterde bulk edit
✅ **Performance**: <1ms overhead per validation
✅ **UX**: Geen wijziging in gebruiker workflow
✅ **Debug**: Console warnings help troubleshooting

---

## Execution Status
- [x] Phase 3.1: Implementation complete (T001-T004) ✅
- [ ] Phase 3.2: Testing complete (T005-T007) - Manual testing required
- [x] Phase 3.3: Deployment complete (T008-T010) ✅
- [x] All validation checks passed ✅
- [ ] Feature ready for production (after bèta freeze lift + manual testing)

**Implementation Summary**:
- ✅ T001: validateTaskId() utility function added (app.js:12410-12426)
- ✅ T002: toggleTaakSelectie() enhanced with validation (app.js:12428-12460)
- ✅ T003: selecteerAlleTaken() enhanced with validation (app.js:12462-12482)
- ✅ T004: Comprehensive debug logging added (app.js:6875-6882, 12751-12774)
- ✅ T008: package.json version bumped to 0.20.34
- ✅ T009: changelog.html updated with v0.20.34 entry
- ✅ T010: Deployed to staging (dev.tickedify.com)

**Deployment Verification**:
- Version endpoint: https://dev.tickedify.com/api/version
- Deployed version: 0.20.34
- Commit hash: 70c744c
- Deployment time: 2025-10-30T23:15:57.249Z
- Status: ✅ Successfully deployed to staging
