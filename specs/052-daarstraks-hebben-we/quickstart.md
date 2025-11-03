# Quickstart: Filter Persistentie Fix voor Herhalende Taken

**Feature**: 052-daarstraks-hebben-we
**Date**: 2025-11-03
**Environment**: dev.tickedify.com (staging)

## Prerequisites

**Test Account**:
- Email: jan@buskens.be
- Password: qyqhut-muDvop-fadki9
- URL: https://dev.tickedify.com/app

**Test Data Required**:
1. Herhalende taak in dagelijkse planning
   - Project: "Test Project" (of bestaand project)
   - Recurring type: weekly (elke maandag)
   - Due date: vandaag
2. Minimaal 3 andere taken in dagelijkse planning voor filter verificatie

## Test Scenario 1: Project Filter Persistentie

**Doel**: Verify project filter blijft actief na afvinken herhalende taak

**Steps**:
1. Navigate to https://dev.tickedify.com/app
2. Login met test credentials
3. Click "Dagelijkse Planning" in sidebar
4. Open project filter dropdown
5. Select "Test Project" (of een ander project met herhalende taak)
6. **Verify**: Lijst toont alleen taken van geselecteerd project
7. Find recurring task (🔄 icon) in gefilterde lijst
8. Click checkbox to complete recurring task
9. **Wait for**: Task completion animation + new instance creation
10. **VERIFY - CRITICAL**:
    - Project filter dropdown still shows "Test Project" selected
    - Lijst blijft gefilterd op "Test Project"
    - Nieuwe recurring task instance visible (als in selected project)
    - Completed task removed from list

**Expected Result**: ✅ Filter blijft actief, nieuwe task visible indien in selected project

**Failure Indicator**: ❌ Filter reset to "All projects", alle taken visible

---

## Test Scenario 2: Context Filter Persistentie

**Doel**: Verify context filter blijft actief na afvinken herhalende taak

**Steps**:
1. Ensure dagelijkse planning scherm open
2. Open context filter dropdown
3. Select "Werk" (of een andere context met herhalende taak)
4. **Verify**: Lijst toont alleen taken met geselecteerde context
5. Find recurring task in gefilterde lijst
6. Click checkbox to complete
7. **Wait for**: Completion + new instance creation
8. **VERIFY - CRITICAL**:
    - Context filter dropdown still shows "Werk" selected
    - Lijst blijft gefilterd op "Werk"
    - Nieuwe task visible indien "Werk" context

**Expected Result**: ✅ Context filter blijft actief

**Failure Indicator**: ❌ Filter reset to "All contexts"

---

## Test Scenario 3: Priority Filter Persistentie

**Doel**: Verify priority filter blijft actief na afvinken herhalende taak

**Steps**:
1. Dagelijkse planning scherm open
2. Open priority filter dropdown
3. Select "Hoog" (high priority)
4. **Verify**: Lijst toont alleen high priority taken
5. Find recurring high priority task
6. Click checkbox to complete
7. **Wait for**: Completion animation
8. **VERIFY - CRITICAL**:
    - Priority filter dropdown still shows "Hoog" selected
    - Lijst blijft gefilterd op high priority
    - Nieuwe task visible indien ook high priority

**Expected Result**: ✅ Priority filter blijft actief

**Failure Indicator**: ❌ Filter reset, alle prioriteiten visible

---

## Test Scenario 4: Multiple Filters Combined

**Doel**: Verify multiple filters blijven actief simultaneously

**Steps**:
1. Dagelijkse planning scherm open
2. Set Project filter: "Test Project"
3. Set Context filter: "Werk"
4. Set Priority filter: "Hoog"
5. **Verify**: Lijst toont alleen taken die aan ALLE 3 filters voldoen
6. Find recurring task that matches all filters
7. Click checkbox to complete
8. **VERIFY - CRITICAL**:
    - Project filter: still "Test Project"
    - Context filter: still "Werk"
    - Priority filter: still "Hoog"
    - Lijst blijft triple-filtered
    - Nieuwe task visible alleen als aan alle filters voldoet

**Expected Result**: ✅ Alle 3 filters blijven actief

**Failure Indicator**: ❌ Any filter reset

---

## Test Scenario 5: Event-Based Recurring Task

**Doel**: Verify filter blijft actief na event popup voor event-based recurring task

**Setup**: Create event-based recurring task (e.g., "10 days before webinar")

**Steps**:
1. Dagelijkse planning open
2. Set Project filter
3. Find event-based recurring task (🔄 icon)
4. Click checkbox to complete
5. **EXPECT**: Popup appears asking for next event date
6. Enter next event date in popup
7. Click "Create Next Instance" in popup
8. **Wait for**: Popup close + list refresh
9. **VERIFY - CRITICAL**:
    - Project filter still active
    - Lijst blijft gefilterd
    - Nieuwe task visible indien aan filter voldoet

**Expected Result**: ✅ Filter blijft actief zelfs na popup interaction

**Failure Indicator**: ❌ Filter reset na popup close

---

## Test Scenario 6: No Filter Active (Baseline)

**Doel**: Verify normal behavior zonder filter actief

**Steps**:
1. Dagelijkse planning open
2. Ensure ALL filters set to "All" / empty
3. **Verify**: Alle taken visible
4. Find recurring task
5. Click checkbox to complete
6. **VERIFY**:
    - Task completion succeeds
    - Nieuwe recurring instance visible
    - No filter state issues (none active)

**Expected Result**: ✅ Normal completion without filters

**Purpose**: Baseline test to ensure fix doesn't break non-filter usage

---

## Test Scenario 7: Filter on New Recurring Instance

**Doel**: Verify nieuwe recurring task instance is immediately filterable

**Steps**:
1. Dagelijkse planning open
2. Complete recurring task WITHOUT filter active
3. **Observe**: Nieuwe task instance created
4. Now SET project filter to task's project
5. **VERIFY**: Nieuwe recurring task immediately filtered correctly

**Expected Result**: ✅ New task responds to filters immediately

---

## Playwright Automation Script (Recommended)

**Test Automation**: Use tickedify-testing sub-agent voor systematic testing

**Playwright Approach**:
```javascript
// Pseudo-code for automated test
1. Navigate to dev.tickedify.com/app
2. Login (jan@buskens.be)
3. Click "Dagelijkse Planning"
4. Select project filter
5. Get initial filter value: projectFilter.value
6. Find recurring task checkbox
7. Click checkbox
8. Wait for completion animation (waitForSelector + timeout)
9. Get post-completion filter value: projectFilter.value
10. Assert: initial === post-completion
```

**Agent Usage**:
```bash
Task(
  subagent_type: "tickedify-testing",
  description: "Filter persistentie testing",
  prompt: "Test filter persistentie in dagelijkse planning na afvinken herhalende taak.

  Scenario's:
  1. Project filter blijft actief
  2. Context filter blijft actief
  3. Priority filter blijft actief
  4. Multiple filters blijven actief

  Voor elke scenario:
  - Set filter
  - Vink herhalende taak af
  - Verify filter state preserved (DOM element values unchanged)
  - Verify filtered tasks blijven correct (display property)

  Report: SUCCESS/FAILURE per scenario met screenshots"
)
```

---

## Performance Verification

**Before Fix** (met dead code regel 10762):
- 2 render passes (renderPlanningActies + renderActiesVoorPlanning)
- Filter timing issue mogelijk

**After Fix** (dead code verwijderd):
- 1 render pass (renderActiesVoorPlanning)
- Filter call consistent timing
- Slight performance improvement expected

**Measurement**:
- Open browser DevTools → Performance tab
- Record during recurring task completion
- Compare render times before/after fix
- **Expected**: 10-20% faster due to single render pass

---

## Rollback Plan

**If Fix Fails**:

1. **Immediate Rollback**:
   ```bash
   git revert <commit-hash>
   git push origin staging
   ```

2. **Alternative Fix** (if needed):
   - Instead of removing regel 10762, add filter call after it
   - Keep double render but ensure filter applied both times

3. **Investigation**:
   - Check browser console for errors
   - Verify `filterPlanningActies()` function not changed
   - Review git diff for unintended changes

---

## Success Criteria

**All scenarios PASS** if:
- ✅ Filter state preserved (DOM elements retain values)
- ✅ Filtered tasks blijven correct (display: none/block)
- ✅ Nieuwe recurring task instance visible/hidden per filter rules
- ✅ No console errors
- ✅ No visual glitches or flickering
- ✅ Consistent behavior across all filter types

**User Acceptance**:
- User confirms filter blijft actief in daily usage
- No regression reports from beta users
- Changelog entry published: "🔧 FIX: Filter persistentie voor herhalende taken in dagelijkse planning - v0.21.x"

---

## Troubleshooting

**Issue**: Filter still resets after fix
**Check**:
1. Verify dead code (regel 10762-10763) removed
2. Verify filter call exists on regel 10782
3. Check browser console for JS errors
4. Clear browser cache + hard reload

**Issue**: New recurring task not visible
**Check**:
1. Verify task created successfully (check database)
2. Verify task meets filter criteria
3. Check filterPlanningActies logic (regel 12027-12080)
4. Verify DOM element has correct data-actie-id

**Issue**: Performance degradation
**Check**:
1. Verify only 1 render pass (not 2)
2. Check for infinite loops in filter logic
3. Monitor DOM manipulation count

---

## Next Steps

1. **Testing**: Run all 7 scenarios (manual or Playwright)
2. **Verification**: All scenarios PASS
3. **Deployment**: Merge to staging, verify on dev.tickedify.com
4. **User Testing**: Beta user confirms fix in real usage
5. **Documentation**: Update changelog
6. **Monitoring**: Watch for regression issues post-deployment

**Estimated Testing Time**: 15-20 minutes (manual) or 5 minutes (Playwright automation)
