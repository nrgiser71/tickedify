# Quickstart Testing Guide: Context Management Titel Bug Fix

**Feature**: 051-als-ik-in
**Date**: 2025-11-03

## Prerequisites
- Toegang tot staging environment: https://dev.tickedify.com/app
- Login credentials:
  - Email: jan@buskens.be
  - Password: qyqhut-muDvop-fadki9

## Quick Verification (30 seconds)

### Primary Bug Test
**Scenario**: Context Management → Inbox navigatie

1. **Navigate to Context Management**:
   - Open https://dev.tickedify.com/app
   - Klik op "Context Management" in sidebar
   - ✅ Verify: Titel toont "Contexten Beheer"

2. **Navigate to Inbox**:
   - Klik op "Inbox" in sidebar
   - ✅ **EXPECTED (FIXED)**: Titel toont "Inbox"
   - ❌ **BUG (BEFORE FIX)**: Titel blijft "Contexten Beheer"

**Fix Verification**: Titel moet correct veranderen naar "Inbox"

## Comprehensive Test Scenarios

### Test 1: Context Management → All Regular Lists
**Purpose**: Verify title updates for all list navigation targets

1. Navigate to Context Management
2. Click on each of the following and verify title:
   - ✅ Inbox → Title: "Inbox"
   - ✅ Actions → Title: "Actions"
   - ✅ Projects → Title: "Projects"
   - ✅ Follow-up → Title: "Follow-up"
   - ✅ Completed → Title: "Completed"

### Test 2: Context Management → Special Sections
**Purpose**: Verify title updates for special section navigation

1. Navigate to Context Management
2. Click on each special section:
   - ✅ Daily Planning → Title: "Daily Planning"
   - ✅ Postponed → Title: "Postponed"
   - ✅ Search → Title: "Search"

### Test 3: Round-Trip Navigation
**Purpose**: Verify title consistency on round-trip journeys

**Scenario A: Inbox → Context Management → Inbox**
1. Start at Inbox (title: "Inbox")
2. Click Context Management (title: "Contexten Beheer")
3. Click Inbox again
4. ✅ Verify: Title correctly shows "Inbox"

**Scenario B: Daily Planning → Context Management → Daily Planning**
1. Start at Daily Planning (title: "Daily Planning")
2. Click Context Management (title: "Contexten Beheer")
3. Click Daily Planning again
4. ✅ Verify: Title correctly shows "Daily Planning"

### Test 4: Browser Navigation
**Purpose**: Verify title updates with browser back/forward buttons

1. Navigate: Inbox → Context Management → Actions
2. Click browser back button (should go to Context Management)
3. ✅ Verify: Title shows "Contexten Beheer"
4. Click browser back button again (should go to Inbox)
5. ✅ Verify: Title shows "Inbox"
6. Click browser forward button (should go to Context Management)
7. ✅ Verify: Title shows "Contexten Beheer"

### Test 5: Direct URL Access
**Purpose**: Verify title is correct on direct page load

1. Open new tab
2. Navigate directly to: https://dev.tickedify.com/app#inbox
3. ✅ Verify: Title shows "Inbox" (not leftover from previous session)

### Test 6: Other Tools → Lists (Regression Test)
**Purpose**: Ensure fix doesn't break other tool navigation

**Scenario: Search → Inbox**
1. Click "Search" in sidebar (title: "Search")
2. Click "Inbox" in sidebar
3. ✅ Verify: Title correctly shows "Inbox"

**Scenario: CSV Import (external tool)**
1. Click "CSV Import" in sidebar
2. ✅ Verify: Opens in new tab (no title impact on main app)

## Playwright Automated Test

### Test Script Location
File: `specs/051-als-ik-in/tests/title-persistence.spec.js`

### Run Automated Tests
```bash
# From repo root
npx playwright test specs/051-als-ik-in/tests/title-persistence.spec.js
```

### Expected Output
```
✓ Context Management → Inbox title update
✓ Context Management → Actions title update
✓ Context Management → Daily Planning title update
✓ Round-trip navigation title consistency
✓ Browser back/forward title updates

5 passed (15s)
```

## Regression Checklist

### Areas to Verify No Impact
- [ ] Inbox navigation works normally
- [ ] Actions/Projects/Follow-up navigation works normally
- [ ] Daily Planning navigation works normally
- [ ] Postponed consolidated view navigation works normally
- [ ] Search tool navigation works normally
- [ ] Feedback forms open correctly
- [ ] Task input container visibility (only Inbox shows input)
- [ ] Sidebar active state highlighting

## Performance Verification

### Visual Update Speed
**Expected**: Title change should be instant (<16ms, single frame)

**Test**:
1. Navigate from Context Management → Inbox
2. Observe title change visually
3. ✅ Verify: No flicker, no delay, instant update

### Browser DevTools Check
```javascript
// In browser console, time the title update:
console.time('title-update');
document.getElementById('page-title').textContent = 'Test';
console.timeEnd('title-update');

// Expected: < 1ms
```

## Success Criteria

### Must Pass
- [x] All 6 test scenarios pass
- [x] No console errors during navigation
- [x] Title updates instantly (no visual delay)
- [x] No regression in other menu items
- [x] Browser back/forward works correctly

### Deployment Ready If
- All manual tests pass on dev.tickedify.com
- Automated Playwright tests pass
- No console errors observed
- Version number incremented in package.json
- Changelog updated with fix description

## Troubleshooting

### If Title Still Persists
**Check**:
1. Clear browser cache and reload
2. Verify deployment version: https://dev.tickedify.com/api/version
3. Check browser console for JavaScript errors
4. Verify code change in `public/app.js` is deployed

### If Tests Fail
**Debug Steps**:
1. Open browser DevTools (F12)
2. Navigate to Console tab
3. Reproduce failing scenario
4. Check for JavaScript errors
5. Inspect `this.huidigeLijst` value in TaakManager instance

## Expected Timeline
- **Manual Testing**: 5-10 minutes (all scenarios)
- **Automated Testing**: 15 seconds (Playwright run)
- **Regression Testing**: 5 minutes
- **Total**: ~15-20 minutes

## Post-Deployment Verification

### Version Check
```bash
curl -s -L -k https://dev.tickedify.com/api/version
# Should show new version number (e.g., "0.21.26")
```

### Smoke Test
1. Login to dev.tickedify.com/app
2. Navigate: Context Management → Inbox
3. Verify title shows "Inbox"
4. ✅ **FIX CONFIRMED**
