# Quickstart: Duplicate Submit Prevention Testing

**Feature**: 023-wanneer-je-op
**Purpose**: Manual testing procedure to verify duplicate task submission prevention
**Prerequisite**: Implementation complete, deployed to staging or local environment

## Test Environment Setup

1. **Navigate to application**:
   - Staging: `https://dev.tickedify.com/app`
   - Production (after deploy): `https://tickedify.com/app`
   - Local: `http://localhost:3000` (if running locally)

2. **Login**:
   - Email: `jan@buskens.be`
   - Password: `qyqhut-muDvop-fadki9`

3. **Navigate to Inbox**:
   - Click "Inbox" in sidebar (should be default view)
   - Verify you see the task input field at the top

## Test Scenario 1: Rapid Enter Key Presses

**Objective**: Verify that pressing Enter multiple times in quick succession only creates one task

### Steps:
1. Click in the task input field at the top of the Inbox
2. Type: `Test rapid enter presses`
3. **Rapidly press Enter 5 times** within 1 second (hold Enter briefly or press very quickly)
4. Wait for loading indicator to disappear (1-2 seconds)

### Expected Result:
✅ **PASS**: Only ONE task "Test rapid enter presses" appears in the inbox list
✅ **PASS**: Input field is cleared after submission
✅ **PASS**: Loading overlay appeared briefly during submission
✅ **PASS**: "Toevoegen" button showed disabled state during submission

❌ **FAIL**: Multiple duplicate tasks appear (2 or more)
❌ **FAIL**: No task appears
❌ **FAIL**: Error message appears

### Cleanup:
- Delete the test task: Click the task → click "Verwijderen" button in popup

---

## Test Scenario 2: Rapid Button Clicks

**Objective**: Verify that clicking the "Toevoegen" button multiple times in quick succession only creates one task

### Steps:
1. Click in the task input field at the top of the Inbox
2. Type: `Test rapid button clicks`
3. **Rapidly click the "Toevoegen" button 5 times** within 1 second
4. Wait for loading indicator to disappear (1-2 seconds)

### Expected Result:
✅ **PASS**: Only ONE task "Test rapid button clicks" appears in the inbox list
✅ **PASS**: Input field is cleared after submission
✅ **PASS**: Button showed disabled state during submission (opacity reduced, cursor not-allowed)
✅ **PASS**: Loading overlay appeared briefly during submission

❌ **FAIL**: Multiple duplicate tasks appear (2 or more)
❌ **FAIL**: No task appears
❌ **FAIL**: Button remained clickable during submission

### Cleanup:
- Delete the test task: Click the task → click "Verwijderen" button in popup

---

## Test Scenario 3: Mixed Enter + Button Clicks

**Objective**: Verify that alternating between Enter presses and button clicks only creates one task

### Steps:
1. Click in the task input field at the top of the Inbox
2. Type: `Test mixed submit methods`
3. **Alternate rapidly** (within 1 second total):
   - Press Enter
   - Click "Toevoegen" button
   - Press Enter again
   - Click "Toevoegen" button again
4. Wait for loading indicator to disappear (1-2 seconds)

### Expected Result:
✅ **PASS**: Only ONE task "Test mixed submit methods" appears in the inbox list
✅ **PASS**: Input field is cleared after submission
✅ **PASS**: Both Enter and button were blocked after first submission
✅ **PASS**: Loading overlay appeared briefly during submission

❌ **FAIL**: Multiple duplicate tasks appear (2 or more)
❌ **FAIL**: No task appears
❌ **FAIL**: Either method bypassed the guard

### Cleanup:
- Delete the test task: Click the task → click "Verwijderen" button in popup

---

## Test Scenario 4: Slow Network Conditions

**Objective**: Verify that the guard remains active during slow network responses

### Steps:
1. **Throttle network** (Chrome DevTools):
   - Open Chrome DevTools (F12)
   - Go to Network tab
   - Change throttling dropdown from "No throttling" to "Slow 3G"
2. Click in the task input field at the top of the Inbox
3. Type: `Test slow network`
4. Press Enter once
5. **Immediately press Enter 3 more times** while loading indicator is still visible
6. Wait for loading indicator to disappear (may take 5-10 seconds on Slow 3G)

### Expected Result:
✅ **PASS**: Only ONE task "Test slow network" appears in the inbox list
✅ **PASS**: Loading overlay remained visible for ~5-10 seconds
✅ **PASS**: Additional Enter presses during loading were ignored
✅ **PASS**: Button remained disabled during entire loading period

❌ **FAIL**: Multiple duplicate tasks appear
❌ **FAIL**: Additional submissions were accepted during loading

### Cleanup:
- Delete the test task
- **Reset network throttling**: Change back to "No throttling" in DevTools

---

## Test Scenario 5: Submission After Previous Completion

**Objective**: Verify that the guard is properly released after successful submission, allowing new tasks

### Steps:
1. Click in the task input field at the top of the Inbox
2. Type: `First task`
3. Press Enter
4. Wait for loading indicator to disappear (~1 second)
5. Type: `Second task`
6. Press Enter
7. Wait for loading indicator to disappear (~1 second)

### Expected Result:
✅ **PASS**: TWO separate tasks appear in the inbox list:
   - "First task"
   - "Second task"
✅ **PASS**: Both submissions were accepted (guard was released after first)
✅ **PASS**: No error messages appeared

❌ **FAIL**: Second submission was blocked
❌ **FAIL**: Only one task appears
❌ **FAIL**: Guard remained permanently active

### Cleanup:
- Delete both test tasks

---

## Test Scenario 6: Enter Key Held Down (Autorepeat)

**Objective**: Verify that holding Enter (keyboard autorepeat) only creates one task

### Steps:
1. Click in the task input field at the top of the Inbox
2. Type: `Test enter autorepeat`
3. **Hold down the Enter key** for 2-3 seconds (keyboard autorepeat will fire multiple keypress events)
4. Release Enter key
5. Wait for loading indicator to disappear

### Expected Result:
✅ **PASS**: Only ONE task "Test enter autorepeat" appears in the inbox list
✅ **PASS**: Autorepeat events were blocked by the guard

❌ **FAIL**: Multiple duplicate tasks appear
❌ **FAIL**: No task appears

### Cleanup:
- Delete the test task

---

## Test Scenario 7: Error Handling (Guard Release on Failure)

**Objective**: Verify that the guard is released even if submission fails

### Steps:
1. **Simulate network error**:
   - Open Chrome DevTools (F12)
   - Go to Network tab
   - Click "Offline" checkbox to disconnect
2. Click in the task input field at the top of the Inbox
3. Type: `Test error handling`
4. Press Enter
5. Wait for error message to appear (~5 seconds timeout)
6. **Re-enable network**: Uncheck "Offline" in DevTools
7. Press Enter again (same input field, should still have "Test error handling" text)

### Expected Result:
✅ **PASS**: First submission shows error toast message
✅ **PASS**: Second submission (after network restored) succeeds and creates the task
✅ **PASS**: Guard was properly released after first failure
✅ **PASS**: No permanent blocking of submissions

❌ **FAIL**: Guard remained active after error, blocking subsequent attempts
❌ **FAIL**: No error message shown
❌ **FAIL**: Second attempt still blocked

### Cleanup:
- Delete the test task (if created)
- **Reset network**: Ensure "Offline" is unchecked in DevTools

---

## Visual Feedback Verification

During ANY of the above test scenarios, verify these visual states:

### During Submission (Loading State):
✅ Global loading overlay visible (semi-transparent background)
✅ Loading spinner visible in overlay
✅ Loading text: "Taak toevoegen..." visible
✅ "Toevoegen" button has reduced opacity (~0.6)
✅ "Toevoegen" button cursor changes to "not-allowed" on hover

### After Submission Complete:
✅ Global loading overlay disappears
✅ "Toevoegen" button returns to normal opacity (1.0)
✅ "Toevoegen" button cursor returns to normal pointer
✅ Input field is cleared and focused
✅ Success toast appears: "Taak toegevoegd!"
✅ New task appears in inbox list

---

## Test Summary Checklist

After running all scenarios, verify:

- [ ] Scenario 1: Rapid Enter presses (PASS/FAIL)
- [ ] Scenario 2: Rapid button clicks (PASS/FAIL)
- [ ] Scenario 3: Mixed Enter + button (PASS/FAIL)
- [ ] Scenario 4: Slow network conditions (PASS/FAIL)
- [ ] Scenario 5: Submission after completion (PASS/FAIL)
- [ ] Scenario 6: Enter key held (autorepeat) (PASS/FAIL)
- [ ] Scenario 7: Error handling (PASS/FAIL)
- [ ] Visual feedback verification (PASS/FAIL)

**All Scenarios Must Pass**: If any scenario fails, bug fix is required before deployment.

---

## Troubleshooting

### Issue: Multiple tasks still created despite guard
**Possible Causes**:
- Guard check not properly implemented in both event handlers
- operationId mismatch between guard check and `withLoading()` call
- Race condition in LoadingManager state management

**Debug Steps**:
1. Open Chrome DevTools Console
2. Look for console.log statements in `voegTaakToe()`
3. Check if multiple "🚀 Sending task to server" logs appear
4. Verify `loading.isOperationActive('add-task')` returns correct boolean

### Issue: Guard never releases (submissions permanently blocked)
**Possible Causes**:
- Error in `withLoading()` finally block
- operationId not properly removed from activeOperations Set
- Exception thrown before `endOperation()` called

**Debug Steps**:
1. Check Chrome DevTools Console for JavaScript errors
2. Manually call `loading.activeOperations.clear()` in console to reset
3. Verify `withLoading()` has proper try/finally structure

### Issue: Button disabled state doesn't appear
**Possible Causes**:
- CSS class not properly defined in styles.css
- Class not properly added/removed in event handler
- CSS selector specificity issue

**Debug Steps**:
1. Inspect button element in Chrome DevTools
2. Verify `.disabled` class is added during submission
3. Check computed styles for opacity and pointer-events values

---

## Success Criteria

✅ **Feature Ready for Production** when:
- All 7 test scenarios pass consistently
- Visual feedback works as expected
- No duplicate tasks created under any condition
- Guard properly releases after success and error states
- Performance is imperceptible (<5ms overhead per submission)

---

**Testing Complete**: Document results and proceed to deployment or bug fixing as needed.
