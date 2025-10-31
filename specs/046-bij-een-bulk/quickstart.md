# Quickstart: Bulk Edit Translation Verification

**Feature**: 046-bij-een-bulk
**Environment**: dev.tickedify.com (staging)
**Date**: 2025-10-31

## Prerequisites
- Staging deployment completed and verified
- Version matches expected version (check `/api/version`)
- Test credentials available (jan@buskens.be / qyqhut-muDvop-fadki9)

## Test Scenario 1: Bulk Edit Day Names in English

**Given**: User is on the actions list with multiple tasks
**When**: User selects 2+ tasks and views bulk edit buttons
**Then**: All day-of-week buttons display in English

### Steps:
1. Navigate to `https://dev.tickedify.com/app`
2. Log in with test credentials if not already logged in
3. Click "Actions" in sidebar to view actions list
4. Select at least 2 tasks by clicking checkboxes (or create tasks if none exist)
5. Observe the bulk action buttons that appear at bottom of screen

### Expected Results:
✅ Day-of-week buttons show: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
❌ FAIL if any Dutch names appear: "Maandag", "Dinsdag", "Woensdag", etc.

### Verification Points:
- [ ] "Monday" button visible (not "Maandag")
- [ ] "Tuesday" button visible (not "Dinsdag")
- [ ] "Wednesday" button visible (not "Woensdag")
- [ ] "Thursday" button visible (not "Donderdag")
- [ ] "Friday" button visible (not "Vrijdag")
- [ ] "Saturday" button visible (not "Zaterdag")
- [ ] "Sunday" button visible (not "Zondag")

**Note**: Only weekdays between "tomorrow" and "Sunday" are shown. If today is Saturday, only "Sunday" will appear.

## Test Scenario 2: "Follow-up" Button in English

**Given**: User has multiple tasks selected in actions list
**When**: User views bulk edit buttons
**Then**: "Follow-up" button displays (not "Opvolgen")

### Steps:
1. Ensure 2+ tasks are selected (continue from Scenario 1)
2. Scroll through bulk action buttons at bottom of screen
3. Locate the button that moves tasks to the follow-up list

### Expected Results:
✅ Button text reads "Follow-up"
❌ FAIL if button reads "Opvolgen"

### Verification Points:
- [ ] "Follow-up" button visible and readable
- [ ] Button is positioned after weekday buttons
- [ ] Button appears before "Weekly", "Monthly", "Quarterly" buttons

## Test Scenario 3: Functionality Preserved

**Given**: User clicks translated buttons
**When**: User performs bulk actions
**Then**: Tasks are moved correctly (functionality unchanged)

### Steps:
1. Select 2 tasks in actions list
2. Click "Follow-up" button in bulk edit
3. Verify tasks moved to "Follow-up" list (check sidebar)
4. Return to actions list, select 2 more tasks
5. Click a weekday button (e.g., "Wednesday")
6. Verify tasks now have the selected date assigned

### Expected Results:
✅ "Follow-up" button correctly moves tasks to follow-up list
✅ Weekday buttons correctly assign dates to tasks
✅ No JavaScript errors in browser console
✅ Toast notifications appear confirming actions

### Verification Points:
- [ ] Tasks moved to correct list when clicking "Follow-up"
- [ ] Tasks receive correct date when clicking weekday button
- [ ] No console errors during bulk operations
- [ ] Success toast messages appear after actions

## Edge Cases

### Edge Case 1: Current Day Affects Visible Weekdays
**Scenario**: Test on different days of week
**Expected**: Only days between tomorrow and Sunday appear
- Monday testing: Should show Tue, Wed, Thu, Fri, Sat, Sun
- Friday testing: Should show Sat, Sun only
- Saturday testing: Should show Sun only
- Sunday testing: No weekday buttons (resets to next week)

### Edge Case 2: Individual Task Menus
**Scenario**: Open context menu for single task (right-click or menu button)
**Expected**: Weekday names also in English in individual task menus
**Steps**:
1. Right-click a single task in actions list
2. View the "Plan op" (Schedule) section
3. Verify weekday buttons show English names

## Regression Check

**Verify No Impact On**:
- [ ] Other list buttons (Weekly, Monthly, Quarterly) - unchanged
- [ ] Task selection mechanism - still works
- [ ] Bulk edit toggle - on/off functionality intact
- [ ] Other lists (Inbox, Follow-up, etc.) - unaffected
- [ ] Individual task menus - also show English if applicable

## Browser Compatibility

**Test In** (minimum):
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

**Expected**: Translations work identically across all browsers

## Success Criteria

**Feature is COMPLETE when**:
✅ All bulk edit buttons display in English
✅ "Follow-up" replaces "Opvolgen"
✅ Weekday names show in English (Monday-Sunday)
✅ All functionality preserved (no broken features)
✅ No JavaScript console errors
✅ Consistent across all supported browsers

## Failure Recovery

**If Tests Fail**:
1. Check browser console for JavaScript errors
2. Verify correct version deployed (check `/api/version`)
3. Clear browser cache and retry
4. Check network tab for failed requests
5. Review app.js source to confirm changes deployed

## Time Estimate
- Test execution: 5-7 minutes
- Regression checks: 3-5 minutes
- **Total**: 8-12 minutes

## Notes
- This is a cosmetic change only (no database/API impact)
- Can be tested entirely via UI
- No API testing required
- No data cleanup needed after testing
