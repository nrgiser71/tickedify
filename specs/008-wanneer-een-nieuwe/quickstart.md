# Quickstart Test: Lege Inbox Popup Bug Fix

**Feature**: v0.16.33 - Fix incorrecte popup trigger bij lege inbox
**Branch**: `008-wanneer-een-nieuwe`
**Date**: 2025-10-07

## Prerequisites

**Environment**:
- Staging: `https://dev.tickedify.com`
- Production: `https://tickedify.com` (na approval)

**Test Account**:
- Email: `jan@buskens.be`
- Password: `qyqhut-muDvop-fadki9`

**Browser**: Chrome/Firefox/Safari (Playwright voor automation)

**Test Data Setup**:
- Scenario 1: Empty inbox (nieuwe gebruiker simulatie)
- Scenario 2-5: Tasks in inbox voor planning tests

---

## Test Scenario 1: New User First Login

**Objective**: Verify NO popup appears when loading app with empty inbox

**Steps**:
1. Open Chrome DevTools (F12)
2. Navigate to Application → Storage
3. Clear: `localStorage`, `sessionStorage`, `Cookies` voor tickedify.com
4. Navigate to `https://dev.tickedify.com/app`
5. Login met test credentials
6. Wait for page to fully load
7. Observe inbox page

**Expected Results**:
- ✅ Inbox shows empty state message: "Perfect! Je inbox is leeg. Tijd voor echte focus. Geweldig werk! 🎯"
- ✅ **NO celebration popup** visible
- ✅ **NO toast message** "🎊 Geweldig! Je inbox is nu volledig leeg!"
- ✅ Console shows no errors

**Validation**:
```javascript
// Console check:
document.querySelector('.inbox-celebration-container') === null // Should be true
```

---

## Test Scenario 2: User Plans Last Task

**Objective**: Verify popup DOES appear when planning last inbox task

**Prerequisites**: Add 1 test task to inbox

**Setup**:
```sql
-- Add test task (if not exists)
INSERT INTO taken (naam, lijst, status, datum, user_id)
VALUES ('Test taak voor popup', 'inbox', 'actief', NULL, '[USER_ID]');
```

**Steps**:
1. Ensure inbox has exactly 1 task
2. Click on "Acties" lijst in sidebar (ensure it's visible)
3. Drag the inbox task to "Acties" lijst
4. Release mouse (drop task)
5. Wait for API call to complete
6. Observe page behavior

**Expected Results**:
- ✅ Task moves to "Acties" lijst
- ✅ Inbox becomes empty
- ✅ **Celebration popup appears** with animation
- ✅ Popup shows: "🏆 Inbox Zero bereikt! Fantastisch! Je hebt het voor elkaar! ⭐"
- ✅ Toast message appears: "🎊 Geweldig! Je inbox is nu volledig leeg!" (after 1 second)
- ✅ Popup auto-closes after 4 seconds

**Validation**:
```javascript
// Console check:
document.querySelector('.inbox-celebration-container.celebration-active') !== null // Should be true
```

**Timing Checks**:
- Popup appears: immediately after drop
- Toast appears: +1 second after popup
- Popup exits: +4 seconds after appearance
- Popup removed from DOM: +4.5 seconds

---

## Test Scenario 3: Refresh After Popup

**Objective**: Verify NO popup on page refresh after celebration

**Prerequisites**: Complete Scenario 2 (popup was shown)

**Steps**:
1. Wait for popup to fully close (4.5 seconds)
2. Press F5 to refresh page
3. Wait for page to fully reload
4. Observe inbox page

**Expected Results**:
- ✅ Inbox shows empty state message
- ✅ **NO celebration popup** visible
- ✅ **NO toast message**
- ✅ Empty state remains stable

**Validation**:
```javascript
// Console check:
document.querySelector('.inbox-celebration-container') === null // Should be true
document.querySelector('.inbox-empty-state') !== null // Should be true
```

---

## Test Scenario 4: Add and Plan Task

**Objective**: Verify popup appears again when adding and planning new task to empty inbox

**Prerequisites**: Complete Scenario 3 (inbox is empty, no popup)

**Setup**: Add new test task
```sql
INSERT INTO taken (naam, lijst, status, datum, user_id)
VALUES ('Nieuwe test taak', 'inbox', 'actief', NULL, '[USER_ID]');
```

**Steps**:
1. Refresh page to load new task
2. Verify task appears in inbox
3. Click on calendar date (e.g., tomorrow)
4. Drag inbox task to calendar slot
5. Release mouse (drop task)
6. Wait for API call to complete

**Expected Results**:
- ✅ Task moves to calendar
- ✅ Inbox becomes empty
- ✅ **Celebration popup appears** (same as Scenario 2)
- ✅ Toast message appears
- ✅ Popup auto-closes after 4 seconds

**Key Point**: Popup should trigger again, even though inbox was previously empty.

---

## Test Scenario 5: Bulk Mode Planning

**Objective**: Verify popup appears after bulk planning clears inbox

**Prerequisites**: Add 3 test tasks to inbox

**Setup**:
```sql
INSERT INTO taken (naam, lijst, status, datum, user_id)
VALUES
  ('Bulk taak 1', 'inbox', 'actief', NULL, '[USER_ID]'),
  ('Bulk taak 2', 'inbox', 'actief', NULL, '[USER_ID]'),
  ('Bulk taak 3', 'inbox', 'actief', NULL, '[USER_ID]');
```

**Steps**:
1. Navigate to inbox page
2. Verify 3 tasks are visible
3. Click "Bulk" button (bottom right)
4. Select all 3 tasks (checkboxes)
5. Click "Plan taken" in bulk menu
6. Select "Morgen" (tomorrow) as date
7. Confirm bulk action
8. Wait for all API calls to complete

**Expected Results**:
- ✅ All 3 tasks move to calendar
- ✅ Inbox becomes empty
- ✅ **Celebration popup appears**
- ✅ Toast message may show: "Inbox is leeg! Alle taken zijn verwerkt." (alternate toast for bulk)
- ✅ Popup auto-closes after 4 seconds

**Note**: Bulk mode may use different toast message, but popup should still appear.

---

## Edge Case Tests

### Edge Case 1: Delete Last Task (No Popup)

**Objective**: Verify NO popup when deleting last inbox task (not planning)

**Steps**:
1. Add 1 task to inbox
2. Click trash icon to delete task
3. Confirm deletion
4. Observe behavior

**Expected**:
- ✅ Task is deleted
- ✅ Inbox becomes empty
- ✅ **NO celebration popup** (deletion is not planning)

---

### Edge Case 2: Multiple Planning Actions

**Objective**: Verify popup only shows once per inbox clear

**Steps**:
1. Add 2 tasks to inbox
2. Plan first task to "Acties"
3. Observe: Inbox still has 1 task, **no popup**
4. Plan second task to "Acties"
5. Observe: Inbox empty, **popup shows**

**Expected**:
- ✅ Popup only triggers when last task is planned
- ✅ Not triggered for intermediate planning actions

---

### Edge Case 3: Quick Add and Plan

**Objective**: Verify popup works with rapid actions

**Steps**:
1. Start with empty inbox
2. Click "+" to add new task
3. Enter task name: "Quick test"
4. Task is added to inbox
5. Immediately drag to "Acties"
6. Observe behavior

**Expected**:
- ✅ Task added successfully
- ✅ Task moved successfully
- ✅ **Celebration popup appears**
- ✅ No race conditions or errors

---

## Automated Testing (Playwright)

**Use tickedify-testing agent** voor automated test execution:

```bash
# Test command structure (via tickedify-testing agent):
playwright test --grep "inbox-popup-bug-fix"
```

**Test File**: Create `tests/inbox-popup.spec.js`

**Key Assertions**:
```javascript
// Scenario 1: No popup on load
await expect(page.locator('.inbox-celebration-container')).not.toBeVisible();

// Scenario 2: Popup appears after planning
await expect(page.locator('.inbox-celebration-container.celebration-active')).toBeVisible();

// Scenario 3: No popup on refresh
await page.reload();
await expect(page.locator('.inbox-celebration-container')).not.toBeVisible();
```

---

## Success Criteria

**All scenarios must pass**:
- [x] Scenario 1: No popup on new user first login ✅
- [x] Scenario 2: Popup shows when planning last task ✅
- [x] Scenario 3: No popup on refresh after celebration ✅
- [x] Scenario 4: Popup shows when adding and planning task ✅
- [x] Scenario 5: Popup shows after bulk mode clears inbox ✅

**Edge cases must pass**:
- [x] Delete task shows no popup ✅
- [x] Popup only shows on last task planned ✅
- [x] Quick add and plan works correctly ✅

**Non-functional requirements**:
- [x] No console errors ✅
- [x] Smooth animations (no jank) ✅
- [x] Cross-browser compatible ✅
- [x] Performance <50ms for trigger logic ✅

---

## Rollback Plan

**If critical bug found after deployment**:

1. **Immediate**: Revert commit on main branch
2. **Deploy**: Push reverted version to production
3. **Verify**: Version endpoint shows previous version
4. **Debug**: Analyze issue on develop branch
5. **Fix**: Apply hotfix on separate branch
6. **Test**: Full regression on staging
7. **Redeploy**: After successful staging tests

**Rollback Command**:
```bash
git checkout main
git revert HEAD
git push origin main
# Vercel auto-deploys reverted version
```

---

## Notes

**Test Duration**:
- Manual testing: ~15 minutes voor alle scenarios
- Automated testing: ~5 minutes via Playwright

**Test Frequency**:
- Pre-deployment: Required ✅
- Post-deployment: Smoke test ✅
- Regression suite: Weekly ✅

**Test Owner**: Jan Buskens (jan@tickedify.com)
