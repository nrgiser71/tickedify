# Quickstart: Bulk Edit Properties Translation

## Purpose
This quickstart guide provides step-by-step instructions to verify that the bulk edit properties modal has been successfully translated from Dutch to English.

## Prerequisites
- Access to dev.tickedify.com staging environment
- Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Modern browser (Chrome, Firefox, Safari, or Edge)
- At least 2 tasks in the Actions list for testing

## Test Environment
**URL**: https://dev.tickedify.com/app (NOT dev.tickedify.com or dev.tickedify.com/admin.html)

## Quick Validation Steps

### Step 1: Login and Navigate
1. Open browser and go to `https://dev.tickedify.com/app`
2. Login with test credentials (jan@buskens.be / qyqhut-muDvop-fadki9)
3. Navigate to **Actions** list in sidebar
4. Verify you have at least 2 tasks visible

**Expected Result**: ✅ Actions list displays with multiple tasks

---

### Step 2: Enable Bulk Mode
1. Click the **Bulk Mode** toggle button (usually in toolbar or top of list)
2. Verify checkboxes appear next to each task
3. Select **2 or more tasks** by clicking their checkboxes

**Expected Result**: ✅ 2+ tasks selected, bulk action buttons appear at bottom

---

### Step 3: Open Bulk Edit Modal
1. Locate the **"Edit Properties"** button in the bulk action toolbar
2. Verify button is enabled (not disabled/grayed out)
3. Click the **"Edit Properties"** button

**Expected Result**: ✅ Modal opens with English title

---

### Step 4: Verify Modal Header
**Check**: Modal header displays task count

**Expected Text**: `"Edit properties for 2 tasks"` (or appropriate number)

**Pass Criteria**: ✅ Header is in English with correct task count

---

### Step 5: Verify Form Labels
**Check**: All form field labels

**Expected Labels**:
- ✅ "Project:"
- ✅ "Date:"
- ✅ "Context:"
- ✅ "Priority:"
- ✅ "Estimated time (minutes):"

**Pass Criteria**: ✅ All 5 labels are in English

---

### Step 6: Verify Project Dropdown
1. Click on the **Project** dropdown
2. Inspect the first two options

**Expected Options**:
- ✅ "-- No change --"
- ✅ "No project"
- (Plus dynamically loaded project names)

**Pass Criteria**: ✅ Default options are in English

---

### Step 7: Verify Context Dropdown
1. Click on the **Context** dropdown
2. Inspect the first two options

**Expected Options**:
- ✅ "-- No change --"
- ✅ "No context"
- (Plus dynamically loaded context names)

**Pass Criteria**: ✅ Default options are in English

---

### Step 8: Verify Priority Dropdown
1. Click on the **Priority** dropdown
2. Inspect all options

**Expected Options**:
- ✅ "-- No change --"
- ✅ "Low"
- ✅ "Normal"
- ✅ "High"

**Pass Criteria**: ✅ All 4 options are in English

**CRITICAL**: Verify that selecting "Normal" still submits `value="gemiddeld"` to backend (check in browser DevTools Network tab if needed)

---

### Step 9: Verify Date Field
1. Inspect the **Date** input field
2. Verify label is correct

**Expected**: ✅ Label shows "Date:"

**Pass Criteria**: ✅ Date field label is in English

---

### Step 10: Verify Time Input
1. Inspect the **Estimated time (minutes)** input field
2. Click or focus on the input
3. Check for placeholder text

**Expected**: ✅ Placeholder shows "Optional"

**Pass Criteria**: ✅ Time field placeholder is in English

---

### Step 11: Verify Buttons
**Check**: Button labels at bottom of modal

**Expected Buttons**:
- ✅ "Cancel" button (secondary style)
- ✅ "Save" button (primary style)

**Pass Criteria**: ✅ Both buttons display English text

---

### Step 12: Test Form Submission
1. Select a project from dropdown (e.g., "Verbouwing")
2. Set priority to "High"
3. Click **"Save"** button

**Expected Result**:
- ✅ Modal closes
- ✅ Toast message: "2 tasks updated" (or similar success message)
- ✅ Tasks in list now show updated project and priority
- ✅ No JavaScript errors in browser console

---

### Step 13: Test Cancel Functionality
1. Open bulk edit modal again (select 2+ tasks, click "Edit Properties")
2. Make no changes or make some changes
3. Click **"Cancel"** button

**Expected Result**:
- ✅ Modal closes
- ✅ No changes applied to tasks
- ✅ No error messages

---

### Step 14: Test Escape Key
1. Open bulk edit modal again
2. Press **ESC** key on keyboard

**Expected Result**:
- ✅ Modal closes (same as clicking Cancel)
- ✅ No changes applied

---

### Step 15: Visual Regression Check
**Check**: Layout integrity

**Verify**:
- ✅ No text wrapping or overflow
- ✅ All labels align properly
- ✅ Dropdowns fit within modal width
- ✅ Buttons are properly positioned
- ✅ Modal is vertically centered on screen
- ✅ Form fields are evenly spaced

**Pass Criteria**: ✅ Layout matches original Dutch version visually

---

## Success Criteria Summary
All 15 steps must pass:
- [ ] Step 1: Login and navigation ✅
- [ ] Step 2: Bulk mode enabled ✅
- [ ] Step 3: Modal opens ✅
- [ ] Step 4: Header in English ✅
- [ ] Step 5: All labels in English ✅
- [ ] Step 6: Project dropdown in English ✅
- [ ] Step 7: Context dropdown in English ✅
- [ ] Step 8: Priority dropdown in English ✅
- [ ] Step 9: Date label in English ✅
- [ ] Step 10: Time placeholder in English ✅
- [ ] Step 11: Buttons in English ✅
- [ ] Step 12: Form submission works ✅
- [ ] Step 13: Cancel works ✅
- [ ] Step 14: ESC key works ✅
- [ ] Step 15: Layout intact ✅

## Troubleshooting

### Issue: Modal doesn't open
**Symptom**: Clicking "Edit Properties" does nothing
**Solution**:
- Refresh page (Ctrl+R or Cmd+R)
- Ensure 2+ tasks are selected
- Check browser console for JavaScript errors

### Issue: Text still in Dutch
**Symptom**: Some elements still show Dutch text
**Solution**:
- Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Verify deployment version: check `https://dev.tickedify.com/api/version`
- Check if correct branch is deployed on Vercel

### Issue: Dropdown options wrong
**Symptom**: Priority shows Dutch values (Laag, Hoog, etc.)
**Solution**:
- Check if JavaScript file was updated (not just HTML)
- Verify `populateBulkEditDropdowns()` function was modified
- Hard refresh browser

### Issue: Layout broken
**Symptom**: Text wraps, overlaps, or overflows
**Solution**:
- Check browser zoom level (should be 100%)
- Test in different browser
- Check browser DevTools for CSS errors
- Verify screen resolution (minimum 1024px width)

## Automated Testing (Optional)

### Playwright Test Command
```bash
# Navigate to project root
cd /Users/janbuskens/Library/CloudStorage/Dropbox/To\ Backup/Baas\ Over\ Je\ Tijd/Software/Tickedify

# Run bulk edit translation test
npx playwright test tests/bulk-edit-translation.spec.js
```

### Expected Playwright Output
```
✓ Bulk edit modal displays all text in English (10s)
  ✓ Modal header in English
  ✓ Form labels in English
  ✓ Project dropdown in English
  ✓ Context dropdown in English
  ✓ Priority dropdown in English
  ✓ Time placeholder in English
  ✓ Buttons in English
  ✓ Form submission works
  ✓ Cancel works
  ✓ ESC key works

All tests passed (10 passed, 0 failed)
```

## Performance Validation
**Expected Load Time**: Modal should open within 200ms
**Expected Rendering**: No visible flicker or layout shift

## Completion Checklist
- [ ] All manual test steps passed
- [ ] No Dutch text remains in modal
- [ ] Form functionality unchanged
- [ ] Layout visually identical to original
- [ ] No browser console errors
- [ ] Toast messages work correctly
- [ ] Keyboard shortcuts work (ESC)
- [ ] Playwright tests passed (if implemented)

## Sign-off
**Tested by**: _____________
**Date**: _____________
**Browser**: _____________
**Result**: ✅ PASS / ❌ FAIL
**Notes**: _____________________________________________

---

**Quickstart Version**: 1.0
**Last Updated**: 2025-10-31
**Feature Branch**: 047-het-bulk-edit
