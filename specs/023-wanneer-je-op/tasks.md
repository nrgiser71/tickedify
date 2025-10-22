# Tasks: Voorkom Duplicate Taak Toevoegingen

**Input**: Design documents from `/specs/023-wanneer-je-op/`
**Prerequisites**: plan.md, research.md, quickstart.md
**Branch**: `023-wanneer-je-op`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Tech stack: JavaScript ES6+, Vanilla JS frontend
   → ✅ Structure: Existing codebase (public/app.js, public/styles.css)
   → ✅ No backend changes needed
2. Load optional design documents:
   → ✅ research.md: Technical decisions for guard implementation
   → ✅ quickstart.md: 7 test scenarios for validation
   → ❌ data-model.md: Not needed (no data model changes)
   → ❌ contracts/: Not needed (no API changes)
3. Generate tasks by category:
   → Setup: None needed (existing codebase)
   → Tests: Manual tests per quickstart.md (optional Playwright)
   → Core: LoadingManager extension + event handler guards + CSS
   → Integration: None needed (pure frontend)
   → Polish: Manual testing validation
4. Apply task rules:
   → Same file (app.js) = sequential (no [P])
   → CSS file = can be parallel [P]
   → Manual tests = can be parallel [P] after implementation
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → ✅ LoadingManager method added
   → ✅ Both event handlers protected
   → ✅ CSS styling added
   → ✅ Test scenarios covered
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Follow TDD principles where applicable

## Path Conventions
**Existing Tickedify structure**:
- `public/app.js` - Main application file (10,507 lines)
- `public/styles.css` - Main stylesheet
- `public/index.html` - Main HTML (minimal changes if any)
- `specs/023-wanneer-je-op/quickstart.md` - Manual test procedures

---

## Phase 3.1: Setup ✅
**No setup tasks needed** - working in existing codebase on feature branch `023-wanneer-je-op`

---

## Phase 3.2: Core Implementation

### ✅ T001: Add isOperationActive() method to LoadingManager class [COMPLETED]
**File**: `public/app.js:744` (after line 744, before closing brace of LoadingManager class)

**Description**:
Add a public method `isOperationActive(operationId)` to the LoadingManager class that returns a boolean indicating whether the specified operation is currently active.

**Implementation**:
```javascript
isOperationActive(operationId) {
    return this.activeOperations.has(operationId);
}
```

**Location Context**:
- Insert after the `withLoading()` method (ends around line 743)
- Before the closing brace of the LoadingManager class (around line 744)

**Verification**:
- Method exists on LoadingManager class
- Returns boolean value
- Correctly checks `activeOperations.has(operationId)`

**Dependencies**: None

---

### ✅ T002: Add guard check to Enter keypress event handler in bindInboxEvents() [COMPLETED]
**File**: `public/app.js:1287-1290`

**Description**:
Wrap the `this.voegTaakToe()` call in the Enter keypress event handler with a guard check using `loading.isOperationActive('add-task')`.

**Current Code** (app.js:1287-1290):
```javascript
taakInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && this.huidigeLijst === 'inbox') {
        this.voegTaakToe();
    }
});
```

**Updated Code**:
```javascript
taakInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && this.huidigeLijst === 'inbox') {
        if (!loading.isOperationActive('add-task')) {
            this.voegTaakToe();
        }
    }
});
```

**Verification**:
- Guard check wraps `voegTaakToe()` call
- Uses correct operationId: `'add-task'`
- Negative check: `!loading.isOperationActive()`
- Rapid Enter presses don't trigger multiple calls

**Dependencies**: T001 (requires `isOperationActive()` method)

---

### ✅ T003: Add guard check to button click event handler in bindInboxEvents() [COMPLETED]
**File**: `public/app.js:1278-1283`

**Description**:
Wrap the `this.voegTaakToe()` call in the button click event handler with a guard check using `loading.isOperationActive('add-task')`.

**Current Code** (app.js:1278-1283):
```javascript
toevoegBtn.addEventListener('click', () => {
    if (this.huidigeLijst === 'inbox') {
        this.voegTaakToe();
    }
});
```

**Updated Code**:
```javascript
toevoegBtn.addEventListener('click', () => {
    if (this.huidigeLijst === 'inbox') {
        if (!loading.isOperationActive('add-task')) {
            this.voegTaakToe();
        }
    }
});
```

**Verification**:
- Guard check wraps `voegTaakToe()` call
- Uses correct operationId: `'add-task'`
- Negative check: `!loading.isOperationActive()`
- Rapid button clicks don't trigger multiple calls

**Dependencies**: T001 (requires `isOperationActive()` method)

---

### ✅ T004 [P]: Add disabled button styling to CSS [COMPLETED]
**File**: `public/styles.css`

**Description**:
Add CSS styling for the disabled state of the "Toevoegen" button. The button should visually indicate it's disabled during submission.

**CSS to Add**:
```css
/* Disabled state for Toevoegen button during submission */
#toevoegBtn.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
}
```

**Location**:
- Add near other button styles (search for `#toevoegBtn` or `.toevoeg-btn`)
- If no specific location exists, add to end of file with clear comment

**Verification**:
- CSS rule exists for `#toevoegBtn.disabled`
- Includes `opacity`, `cursor`, and `pointer-events` properties
- Visual feedback is clear when button is disabled

**Dependencies**: None (can run in parallel with T001-T003)

---

## Phase 3.3: Manual Testing & Validation

### T005 [P]: Execute Manual Test Scenario 1 - Rapid Enter Presses
**File**: Follow procedures in `specs/023-wanneer-je-op/quickstart.md` (Test Scenario 1)

**Description**:
Manually test rapid Enter key presses to verify only one task is created.

**Steps**:
1. Deploy code to staging (dev.tickedify.com) or test locally
2. Login to application
3. Navigate to Inbox
4. Type task name: "Test rapid enter presses"
5. Rapidly press Enter 5 times within 1 second
6. Verify only ONE task appears in inbox
7. Verify loading overlay appeared
8. Verify button showed disabled state
9. Delete test task

**Expected Result**: ✅ Only one task created, no duplicates

**Dependencies**: T001, T002, T003, T004 (all implementation complete)

---

### T006 [P]: Execute Manual Test Scenario 2 - Rapid Button Clicks
**File**: Follow procedures in `specs/023-wanneer-je-op/quickstart.md` (Test Scenario 2)

**Description**:
Manually test rapid button clicks to verify only one task is created.

**Steps**:
1. Deploy code to staging (dev.tickedify.com) or test locally
2. Login to application
3. Navigate to Inbox
4. Type task name: "Test rapid button clicks"
5. Rapidly click "Toevoegen" button 5 times within 1 second
6. Verify only ONE task appears in inbox
7. Verify button showed disabled state (opacity, cursor)
8. Verify loading overlay appeared
9. Delete test task

**Expected Result**: ✅ Only one task created, button disabled during submission

**Dependencies**: T001, T002, T003, T004 (all implementation complete)

---

### T007 [P]: Execute Manual Test Scenario 3 - Mixed Enter + Button
**File**: Follow procedures in `specs/023-wanneer-je-op/quickstart.md` (Test Scenario 3)

**Description**:
Manually test alternating between Enter presses and button clicks.

**Steps**:
1. Deploy code to staging (dev.tickedify.com) or test locally
2. Login to application
3. Navigate to Inbox
4. Type task name: "Test mixed submit methods"
5. Rapidly alternate: Enter → click button → Enter → click button (within 1 second)
6. Verify only ONE task appears in inbox
7. Verify both methods were blocked after first submission
8. Delete test task

**Expected Result**: ✅ Only one task created, both submit methods blocked

**Dependencies**: T001, T002, T003, T004 (all implementation complete)

---

### T008 [P]: Execute Manual Test Scenario 4 - Slow Network
**File**: Follow procedures in `specs/023-wanneer-je-op/quickstart.md` (Test Scenario 4)

**Description**:
Test with throttled network (Slow 3G) to verify guard remains active during long requests.

**Steps**:
1. Deploy code to staging (dev.tickedify.com) or test locally
2. Open Chrome DevTools → Network tab → Throttle to "Slow 3G"
3. Login to application
4. Navigate to Inbox
5. Type task name: "Test slow network"
6. Press Enter once
7. Immediately press Enter 3 more times while loading
8. Wait for loading to complete (~5-10 seconds)
9. Verify only ONE task appears in inbox
10. Reset network throttling
11. Delete test task

**Expected Result**: ✅ Only one task created despite long loading time

**Dependencies**: T001, T002, T003, T004 (all implementation complete)

---

### T009 [P]: Execute Manual Test Scenario 5 - Sequential Submissions
**File**: Follow procedures in `specs/023-wanneer-je-op/quickstart.md` (Test Scenario 5)

**Description**:
Verify that guard is properly released after successful submission, allowing new tasks.

**Steps**:
1. Deploy code to staging (dev.tickedify.com) or test locally
2. Login to application
3. Navigate to Inbox
4. Type "First task" → Press Enter → Wait for completion
5. Type "Second task" → Press Enter → Wait for completion
6. Verify TWO separate tasks appear in inbox
7. Verify both submissions were accepted (guard released after first)
8. Delete both test tasks

**Expected Result**: ✅ Two tasks created successfully, guard not stuck

**Dependencies**: T001, T002, T003, T004 (all implementation complete)

---

### T010 [P]: Execute Manual Test Scenario 6 - Enter Key Autorepeat
**File**: Follow procedures in `specs/023-wanneer-je-op/quickstart.md` (Test Scenario 6)

**Description**:
Test holding Enter key down (keyboard autorepeat) to verify only one task is created.

**Steps**:
1. Deploy code to staging (dev.tickedify.com) or test locally
2. Login to application
3. Navigate to Inbox
4. Type task name: "Test enter autorepeat"
5. Hold down Enter key for 2-3 seconds (autorepeat fires multiple events)
6. Release Enter key
7. Verify only ONE task appears in inbox
8. Delete test task

**Expected Result**: ✅ Only one task created despite autorepeat events

**Dependencies**: T001, T002, T003, T004 (all implementation complete)

---

### T011 [P]: Execute Manual Test Scenario 7 - Error Handling
**File**: Follow procedures in `specs/023-wanneer-je-op/quickstart.md` (Test Scenario 7)

**Description**:
Verify guard is released even when submission fails due to network error.

**Steps**:
1. Deploy code to staging (dev.tickedify.com) or test locally
2. Open Chrome DevTools → Network tab → Check "Offline"
3. Login to application (before going offline)
4. Navigate to Inbox
5. Type task name: "Test error handling"
6. Press Enter → Wait for error message
7. Uncheck "Offline" in DevTools
8. Press Enter again (same text)
9. Verify task is created successfully on second attempt
10. Verify guard was released after first failure
11. Delete test task

**Expected Result**: ✅ Guard released after error, second submission succeeds

**Dependencies**: T001, T002, T003, T004 (all implementation complete)

---

### T012: Complete Visual Feedback Verification
**File**: Follow procedures in `specs/023-wanneer-je-op/quickstart.md` (Visual Feedback section)

**Description**:
During any of the manual test scenarios, verify all visual feedback states.

**Checklist**:
- [ ] Global loading overlay visible during submission
- [ ] Loading spinner visible in overlay
- [ ] Loading text: "Taak toevoegen..." visible
- [ ] Button opacity reduced (~0.6) during submission
- [ ] Button cursor: "not-allowed" on hover during submission
- [ ] Button returns to normal after completion
- [ ] Input field cleared after submission
- [ ] Success toast appears: "Taak toegevoegd!"
- [ ] New task appears in inbox list

**Expected Result**: ✅ All visual states work correctly

**Dependencies**: T001, T002, T003, T004, T005-T011 (run during other tests)

---

## Phase 3.4: Optional - Automated Testing

### T013 [Optional]: Create Playwright test for rapid Enter presses
**File**: New file in tests/ or use tickedify-testing agent

**Description**:
Create an automated Playwright test that simulates rapid Enter key presses and verifies only one task is created.

**Test Steps**:
1. Navigate to inbox
2. Fill input field with "Playwright test rapid enter"
3. Dispatch multiple keypress events (Enter key) in rapid succession
4. Wait for loading to complete
5. Query database or UI for task count
6. Assert only 1 task exists with that name
7. Cleanup: delete test task

**Note**: This task is optional - manual testing may be sufficient for this bug fix.

**Dependencies**: T001, T002, T003, T004 (implementation complete)

---

### T014 [Optional]: Create Playwright test for rapid button clicks
**File**: New file in tests/ or use tickedify-testing agent

**Description**:
Create an automated Playwright test that simulates rapid button clicks and verifies only one task is created.

**Test Steps**:
1. Navigate to inbox
2. Fill input field with "Playwright test rapid clicks"
3. Click "Toevoegen" button multiple times in rapid succession
4. Wait for loading to complete
5. Query database or UI for task count
6. Assert only 1 task exists with that name
7. Cleanup: delete test task

**Note**: This task is optional - manual testing may be sufficient for this bug fix.

**Dependencies**: T001, T002, T003, T004 (implementation complete)

---

## Dependencies

```
T001 (LoadingManager method)
├── T002 (Enter keypress guard) - requires T001
├── T003 (Button click guard) - requires T001
└── T004 [P] (CSS styling) - parallel, no dependencies

T002, T003, T004 (all implementation complete)
├── T005 [P] (Test rapid Enter)
├── T006 [P] (Test rapid clicks)
├── T007 [P] (Test mixed methods)
├── T008 [P] (Test slow network)
├── T009 [P] (Test sequential)
├── T010 [P] (Test autorepeat)
├── T011 [P] (Test error handling)
└── T012 (Visual feedback check) - run during T005-T011

T005-T012 (manual tests complete)
├── T013 [Optional] (Playwright Enter test)
└── T014 [Optional] (Playwright click test)
```

**Critical Path**: T001 → T002 → T003 → (T005-T012 manual tests)

---

## Parallel Execution Examples

### Parallel Group 1: Implementation (after T001)
```bash
# T004 can run in parallel with T002-T003 since it modifies a different file
# However, T002 and T003 modify the same file (app.js) so must be sequential
```

### Parallel Group 2: Manual Testing (after T001-T004)
All manual test scenarios (T005-T011) can be executed in parallel by different testers:
```bash
# Tester 1: Run T005 (rapid Enter)
# Tester 2: Run T006 (rapid clicks)
# Tester 3: Run T007 (mixed methods)
# Tester 4: Run T008 (slow network)
# etc.
```

**Note**: For solo testing, execute T005-T011 sequentially as documented in quickstart.md.

---

## Task Execution Order

**Recommended Sequential Order**:
1. ✅ T001 - Add `isOperationActive()` method to LoadingManager
2. ✅ T002 - Add guard to Enter keypress handler
3. ✅ T003 - Add guard to button click handler
4. ⚡ T004 - Add CSS styling (can overlap with T002-T003)
5. 🧪 T005-T011 - Execute all manual test scenarios
6. 👁️ T012 - Verify visual feedback (during T005-T011)
7. 🤖 T013-T014 - Optional Playwright tests

**Minimum for Production Readiness**: T001-T012 must all pass

---

## Notes

- **No [P] on same-file tasks**: T002 and T003 both modify `app.js:1273-1293` region, so they cannot run in parallel
- **CSS is parallel**: T004 modifies different file, can run concurrently
- **Manual tests are critical**: All 7 scenarios (T005-T011) must pass before production deployment
- **Commit after each task**: Helps with debugging if issues arise
- **operationId consistency**: Always use `'add-task'` string - mismatch will break guard

---

## Validation Checklist
*Verify before marking feature complete*

- [x] LoadingManager has `isOperationActive()` method (T001)
- [x] Enter keypress handler has guard check (T002)
- [x] Button click handler has guard check (T003)
- [x] CSS disabled styling exists (T004)
- [ ] All 7 manual test scenarios pass (T005-T011)
- [ ] Visual feedback verified (T012)
- [ ] No duplicate tasks created under any test condition
- [ ] Guard properly releases after success and error states
- [ ] Performance overhead imperceptible (<5ms)

---

## Success Criteria

✅ **Feature Ready for Production** when:
- All implementation tasks (T001-T004) complete
- All manual test scenarios (T005-T011) pass consistently
- Visual feedback (T012) works as expected
- No duplicate tasks created under any condition tested
- Guard properly releases after both success and error states
- Code deployed to staging and verified by user

**Estimated Total Time**: 2-3 hours
- Implementation (T001-T004): 30-45 minutes
- Manual testing (T005-T012): 60-90 minutes
- Optional automated tests (T013-T014): 60-90 minutes

---

**Tasks Ready for Execution**: Proceed with T001 to begin implementation.
