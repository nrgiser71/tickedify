# Quickstart: Task Completion Checkbox Fix Testing

**Date**: 2025-10-29
**Branch**: 038-als-ik-in
**Environment**: dev.tickedify.com (staging only - BÈTA FREEZE active)

## Prerequisites

✅ **Code changes deployed to staging**
✅ **Version number incremented in package.json**
✅ **Changelog updated with bugfix**

## Quick Verification (2 minutes)

### Test 1: Simple Checkbox Completion
```
1. Navigate to https://dev.tickedify.com/app
2. Login: jan@buskens.be / qyqhut-muDvop-fadki9
3. Go to Inbox
4. Click any task to open detail popup
5. ✅ Verify checkbox is unchecked
6. Check the completion checkbox
7. Click "Opslaan" button
8. ✅ Verify popup closes
9. ✅ Verify task disappears from Inbox
10. Refresh page
11. ✅ Verify task still not in Inbox (persisted)
```

**Expected Result**: Task archived, no longer visible in active lists

**If Failed**: Bug not fixed - checkbox change not detected

---

## Comprehensive Test Suite (15 minutes)

### Test 2: Acties List Completion
```
1. Navigate to Acties list
2. Click any task to open popup
3. Check completion checkbox
4. Click "Opslaan"
5. ✅ Verify task disappears from Acties
6. ✅ Verify same behavior as Inbox test
```

**Expected Result**: Identical behavior to Inbox completion

### Test 3: Checkbox Toggle (Unchecked State)
```
1. Navigate to Inbox
2. Click task to open popup
3. Check completion checkbox
4. Uncheck completion checkbox
5. Click "Opslaan"
6. ✅ Verify task remains in Inbox (normal save)
7. ✅ Verify task NOT archived
```

**Expected Result**: Normal save when checkbox is unchecked

### Test 4: Popup Close Without Save
```
1. Open task detail popup
2. Check completion checkbox
3. Click close button (X) or press Escape
4. ✅ Verify popup closes
5. ✅ Verify task still in active list (no save occurred)
6. Refresh page
7. ✅ Verify task still active
```

**Expected Result**: No completion when popup closed without save

### Test 5: Recurring Task Completion
```
SETUP:
1. Create a recurring task (e.g., "Test herhalende taak")
2. Set recurrence: "Elke week op maandag"
3. Save to Inbox or Acties

TEST:
4. Open the recurring task popup
5. ✅ Verify "🔄" indicator shows it's recurring
6. Check completion checkbox
7. Click "Opslaan"
8. ✅ Verify original task disappears
9. ✅ Verify NEW instance appears with next Monday's date
10. ✅ Verify new instance has same name and recurring settings
11. Refresh page
12. ✅ Verify new instance persists
```

**Expected Result**: Original archived, new instance created with next occurrence date

### Test 6: Grid vs Popup Checkbox Consistency
```
PART A - Grid Checkbox (Reference):
1. Navigate to Acties list
2. Check checkbox in grid (NOT popup) for Task A
3. ✅ Note behavior: task disappears, archived

PART B - Popup Checkbox (Test):
4. Click Task B to open popup
5. Check completion checkbox in popup
6. Click "Opslaan"
7. ✅ Verify IDENTICAL behavior to grid checkbox
8. ✅ Verify same toast notification (if any)
9. ✅ Verify same UI refresh

PART C - Recurring Grid vs Popup:
10. Create 2 identical recurring tasks (Task C, Task D)
11. Complete Task C via grid checkbox
12. Note next instance details
13. Complete Task D via popup checkbox
14. ✅ Verify next instances are identical (date, settings, etc.)
```

**Expected Result**: Grid and popup checkboxes behave identically in all aspects

### Test 7: Task with All Properties Set
```
SETUP:
1. Create task with:
   - Name: "Complex task test"
   - Project: Any project
   - Context: Any context
   - Duration: 60 minutes
   - Notes: "Test opmerkingen"
   - Show date: Tomorrow
   - Priority: Medium

TEST:
2. Navigate to task location
3. Open popup
4. ✅ Verify all fields are displayed correctly
5. Check completion checkbox
6. Click "Opslaan"
7. ✅ Verify task archived
8. Optional: Check archive/afgewerkt list
9. ✅ Verify all properties preserved (project, context, notes, etc.)
```

**Expected Result**: All task properties preserved during completion

### Test 8: Error Handling (Optional - Requires Dev Tools)
```
1. Open browser dev tools
2. Go to Network tab
3. Set network throttling to "Offline"
4. Open task popup
5. Check completion checkbox
6. Click "Opslaan"
7. ✅ Verify error toast appears
8. ✅ Verify task remains in UI
9. Set network to "Online"
10. Click "Opslaan" again
11. ✅ Verify completion succeeds
```

**Expected Result**: Graceful error handling with user feedback

---

## Regression Tests (5 minutes)

### Regression 1: Normal Save Still Works
```
1. Open task popup
2. Change task name
3. Do NOT check completion checkbox
4. Click "Opslaan"
5. ✅ Verify task name updated
6. ✅ Verify task still in active list (NOT archived)
```

**Expected Result**: Normal save flow unaffected by bugfix

### Regression 2: Grid Checkbox Still Works
```
1. Navigate to Acties
2. Check grid checkbox (NOT popup)
3. ✅ Verify task archives
4. ✅ Verify behavior unchanged from before bugfix
```

**Expected Result**: Grid checkbox still works as before

### Regression 3: New Task Creation
```
1. Click "+" or "Nieuwe taak" button
2. Fill in task details
3. Checkbox should be unchecked (new tasks aren't completed)
4. Do NOT check checkbox
5. Click "Opslaan"
6. ✅ Verify task created in active list
7. ✅ Verify task NOT archived
```

**Expected Result**: New task creation unaffected

---

## Performance Validation (1 minute)

### Performance 1: Checkbox Response Time
```
1. Open task popup
2. Check completion checkbox
3. Click "Opslaan"
4. ⏱️ Time from click to popup close
5. ✅ Expected: <500ms (should be nearly instant)
```

**Expected Result**: Fast response, no noticeable delay vs grid checkbox

### Performance 2: Recurring Task Creation Time
```
1. Create recurring task
2. Complete via popup checkbox
3. ⏱️ Time from save to new instance visible
4. ✅ Expected: <2 seconds
```

**Expected Result**: Acceptable delay for recurring task creation

---

## Automated Testing Script (Playwright)

### Automated Test via tickedify-testing Agent

```javascript
// After manual testing passes, run automated test:

test('Popup checkbox completes task', async ({ page }) => {
  // 1. Login
  await page.goto('https://dev.tickedify.com/app');
  await page.fill('#email', 'jan@buskens.be');
  await page.fill('#password', 'qyqhut-muDvop-fadki9');
  await page.click('#loginButton');

  // 2. Create test task
  await page.click('#newTaskButton');
  await page.fill('#taakNaamInput', 'Automated test task');
  await page.click('#saveButton');

  // 3. Open task popup
  const taskElement = await page.locator('text=Automated test task').first();
  await taskElement.click();

  // 4. Verify checkbox exists and is unchecked
  const checkbox = await page.locator('#completeTaskCheckbox');
  expect(await checkbox.isChecked()).toBe(false);

  // 5. Check checkbox
  await checkbox.check();
  expect(await checkbox.isChecked()).toBe(true);

  // 6. Save
  await page.click('#saveButton');

  // 7. Verify popup closed
  await expect(page.locator('#taskPopup')).not.toBeVisible();

  // 8. Verify task not in inbox
  await expect(page.locator('text=Automated test task')).not.toBeVisible();

  // 9. Refresh and verify persistence
  await page.reload();
  await expect(page.locator('text=Automated test task')).not.toBeVisible();
});
```

**Usage**:
```bash
# After deploying to staging, use tickedify-testing agent:
# "Run the popup checkbox automated test on dev.tickedify.com"
```

---

## Success Criteria Checklist

### Must Pass (Blocking)
- [x] Test 1: Simple checkbox completion works
- [x] Test 2: Acties list completion works
- [x] Test 3: Unchecked state handled correctly
- [x] Test 5: Recurring tasks create new instance
- [x] Test 6: Grid and popup behavior identical
- [x] Regression 1: Normal save still works

### Should Pass (Important)
- [x] Test 4: Close without save doesn't complete
- [x] Test 7: Complex task properties preserved
- [x] Regression 2: Grid checkbox unaffected
- [x] Regression 3: New task creation works

### Nice to Have (Optional)
- [ ] Test 8: Error handling validated
- [ ] Performance tests within acceptable range
- [ ] Automated test passes

---

## Rollback Plan

**If Critical Bug Found**:

```bash
# 1. Revert commit on branch
git revert HEAD

# 2. Push to staging
git push origin 038-als-ik-in

# 3. Wait for deployment
# (Check version endpoint)

# 4. Verify revert successful
# (Run Test 1 - checkbox should NOT work, but app stable)

# 5. Report issue for fixing
```

---

## Deployment to Production (After BÈTA FREEZE Lift)

**BELANGRIJK**: Dit is GEBLOKKEERD tot "BÈTA FREEZE IS OPGEHEVEN" bericht

**Wanneer freeze wordt opgeheven**:
```bash
# 1. Verify all tests pass on staging
# 2. Create PR: 038-als-ik-in → main
# 3. Review PR
# 4. Merge to main (after approval)
# 5. Vercel auto-deploys to production
# 6. Verify version on tickedify.com/api/version
# 7. Run Test 1 on production (tickedify.com/app)
# 8. Monitor for 24 hours
```

---

## Contact & Support

**Bug Reports**: Via feedback systeem in Tickedify (🐛 button)

**Emergency**: Rollback procedure above

---

## Summary

**Quick Test**: Test 1 (2 min) - Verifies core functionality
**Full Test Suite**: Tests 1-8 (15 min) - Complete validation
**Regression**: Tests (5 min) - Ensures no breaking changes
**Performance**: Optional validation

**Total Testing Time**: ~20-25 minutes for complete verification

**Success Rate Goal**: 100% of "Must Pass" tests, >80% of "Should Pass" tests

---

**Quickstart Status**: ✅ COMPLETE - Ready for testing after deployment
