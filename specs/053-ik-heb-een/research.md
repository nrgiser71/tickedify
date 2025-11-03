# Research: Laatste Werkdag Maandelijkse Herhaling Bug

**Date**: 2025-11-03
**Status**: Complete

## Problem Analysis

### Bug Description
Herhalende taken met patroon "laatste werkdag van de maand" slaan een maand over bij het aanmaken van de volgende instantie:
- **Current behavior**: 31/10/2025 → 31/12/2025 (skips November)
- **Expected behavior**: 31/10/2025 → 30/11/2025 (next month)

### Root Cause Identified

De bug zit in de JavaScript datum berekening logica in `server.js`. Er zijn twee identieke bugs op verschillende locaties:

**Location 1**: `server.js:7946-7954` - `monthly-weekday-last-workday` pattern
```javascript
} else if (position === 'last') {
    // Last workday of month
    const targetMonth = nextDateObj.getMonth();
    nextDateObj.setMonth(targetMonth + 1);  // ❌ BUG: targetMonth already includes interval!
    nextDateObj.setDate(0); // Last day of target month
    while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
        nextDateObj.setDate(nextDateObj.getDate() - 1);
    }
}
```

**Location 2**: `server.js:7642-7649` - `laatste-werkdag-maand` Dutch pattern
```javascript
} else if (pattern === 'laatste-werkdag-maand') {
    const nextDateObj = new Date(date);
    nextDateObj.setMonth(date.getMonth() + 2);  // ❌ BUG: Should be +1, not +2!
    nextDateObj.setDate(0); // Last day of next month
    while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
        nextDateObj.setDate(nextDateObj.getDate() - 1);
    }
    nextDate = nextDateObj.toISOString().split('T')[0];
}
```

### Technical Explanation

**Problem in Location 1** (`monthly-weekday-last-workday`):
1. `nextDateObj` starts from current date
2. Line 7938: `nextDateObj.setMonth(date.getMonth() + interval)` - Already moves forward by interval (1 month)
3. Line 7948: `const targetMonth = nextDateObj.getMonth()` - Stores the ALREADY incremented month
4. Line 7949: `nextDateObj.setMonth(targetMonth + 1)` - Adds ANOTHER month! ❌
5. Line 7950: `nextDateObj.setDate(0)` - Goes to last day of previous month
6. Result: We end up 2 months ahead instead of 1

**Problem in Location 2** (`laatste-werkdag-maand`):
1. `nextDateObj` starts from current date
2. Line 7644: `nextDateObj.setMonth(date.getMonth() + 2)` - Adds 2 months! ❌ (should be +1)
3. Line 7645: `nextDateObj.setDate(0)` - Goes to last day of previous month
4. Result: We end up 1 month ahead (because setDate(0) subtracts 1 month from the +2)

**Why `setDate(0)` is used**:
- JavaScript Date API: `setDate(0)` = last day of PREVIOUS month
- So `setMonth(month + 1); setDate(0)` = last day of target month
- This is a common JavaScript pattern, but the month calculation was wrong

## Solution Design

### Fix for Location 1 (`monthly-weekday-last-workday`)

**Current (buggy) code**:
```javascript
const targetMonth = nextDateObj.getMonth();
nextDateObj.setMonth(targetMonth + 1);
nextDateObj.setDate(0); // Last day of target month
```

**Fixed code**:
```javascript
// nextDateObj already has correct month from line 7938 (+ interval)
// To get last day, we need to go to NEXT month, then setDate(0)
nextDateObj.setMonth(nextDateObj.getMonth() + 1);
nextDateObj.setDate(0); // Last day of target month
```

**Explanation**: Remove the intermediate `targetMonth` variable and directly increment by 1. Since `nextDateObj` already has the correct target month (from line 7938), we just need +1 to prepare for setDate(0).

### Fix for Location 2 (`laatste-werkdag-maand`)

**Current (buggy) code**:
```javascript
nextDateObj.setMonth(date.getMonth() + 2);
nextDateObj.setDate(0); // Last day of next month
```

**Fixed code**:
```javascript
nextDateObj.setMonth(date.getMonth() + 1);
nextDateObj.setDate(0); // Last day of next month
```

**Explanation**: Simply change +2 to +1. The setDate(0) will then correctly give us last day of next month.

## Verification Strategy

### Test Scenarios

1. **Basic monthly pattern**: 31/10/2025 → 30/11/2025
2. **Continuation**: 30/11/2025 → 31/12/2025
3. **Year boundary**: 31/12/2025 → 31/01/2026
4. **Short month**: 28/02/2025 (vrijdag) → 31/03/2025
5. **Weekend handling**: Month ends on Saturday/Sunday should go to Friday

### Test Method
- Direct API testing via `/api/test-recurring-next/:pattern/:baseDate` endpoint
- Test beide patterns:
  - `monthly-weekday-last-workday-1`
  - `laatste-werkdag-maand`
- Verify BOTH give identical correct results

### Edge Cases Covered
- ✅ Months with 28/29/30/31 days
- ✅ Weekends (Saturday/Sunday) at month end
- ✅ Year boundaries (December → January)
- ✅ Leap years (February 29 scenarios)
- ❌ Public holidays (OUT OF SCOPE - not supported by current system)

## Backwards Compatibility Analysis

### Impact Assessment
- **Risk Level**: LOW
- **Affected Patterns**:
  - `monthly-weekday-last-workday-{interval}` (all intervals)
  - `laatste-werkdag-maand` (Dutch pattern)
- **Not Affected**:
  - All other recurring patterns (daily, weekly, monthly-day, yearly, etc.)
  - First workday patterns (different code path)
  - Regular weekday patterns (first/second/third/fourth)

### Migration Required
- ✅ No database changes needed
- ✅ No schema migrations
- ✅ Existing tasks continue to work
- ✅ Fix is transparent to users
- ⚠️ Users will notice CORRECT behavior (fix) on next completion

## Related Patterns Analysis

### Similar Patterns That Work Correctly

**First workday of month** (`server.js:7634-7641`, `server.js:7940-7945`):
```javascript
// CORRECT implementation - no bug here
nextDateObj.setMonth(date.getMonth() + 1);  // +1 is correct
nextDateObj.setDate(1);  // First day
while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
    nextDateObj.setDate(nextDateObj.getDate() + 1);
}
```

**Last occurrence of regular weekday** (`server.js:7964-7973`):
```javascript
// CORRECT implementation - no bug here
if (position === 'last') {
    const targetMonth = nextDateObj.getMonth();
    nextDateObj.setMonth(targetMonth + 1);
    nextDateObj.setDate(0); // Last day of target month
    while (nextDateObj.getDay() !== jsTargetDay) {
        nextDateObj.setDate(nextDateObj.getDate() - 1);
    }
}
```

**Difference**: Regular weekday 'last' uses SAME buggy pattern, but for DIFFERENT scenario (last Friday, not last workday). Need to verify if this also has the bug.

### Consistency Check Required

After analysis, the regular weekday 'last' pattern at line 7964-7973 uses the SAME logic:
1. Line 7962: `nextDateObj.setMonth(date.getMonth() + interval)` - Adds interval
2. Line 7966: `const targetMonth = nextDateObj.getMonth()` - Stores already incremented month
3. Line 7967: `nextDateObj.setMonth(targetMonth + 1)` - Adds another month ❌

**Conclusion**: This pattern likely has THE SAME BUG! But it's not in the scope of this feature (user didn't report it). We should:
- Fix the two reported patterns
- Document this potential issue for future investigation
- Add test coverage to catch it if users report similar issues

## Implementation Complexity

### Change Scope
- **Files Modified**: 1 (`server.js`)
- **Lines Changed**: ~4 lines total (2 locations × ~2 lines each)
- **Functions Affected**: 1 function (inline logic in test endpoint handler)
- **Test Endpoints**: Existing `/api/test-recurring-next/:pattern/:baseDate` can verify fix

### Risk Assessment
- **Technical Risk**: VERY LOW (simple arithmetic fix)
- **Testing Risk**: LOW (comprehensive test scenarios available)
- **Regression Risk**: LOW (only affects specific patterns, backwards compatible)
- **Deployment Risk**: LOW (serverless function, instant rollback possible)

## Alternatives Considered

### Alternative 1: Rewrite Date Logic
**Description**: Completely refactor the date calculation to use date-fns or moment.js
**Rejected Because**:
- Adds unnecessary dependency
- Higher complexity and testing burden
- Current pattern works for 90% of cases
- Simple arithmetic fix is sufficient

### Alternative 2: Normalize All Month Calculations
**Description**: Extract month calculation to shared utility function
**Rejected Because**:
- Out of scope for this bug fix
- Would require refactoring ALL recurring patterns
- Risk of introducing new bugs in working patterns
- Can be done as separate refactoring task later

### Alternative 3: Add Month Offset Parameter
**Description**: Add explicit parameter to control month offset behavior
**Rejected Because**:
- Unnecessary complexity for simple bug fix
- Makes API less intuitive
- Current pattern is JavaScript standard (setDate(0) trick)

## Decision Summary

**Chosen Approach**: Direct arithmetic fix at 2 locations
- Location 1: Remove intermediate variable, use `nextDateObj.getMonth() + 1` directly
- Location 2: Change `+ 2` to `+ 1`

**Rationale**:
- ✅ Minimal code change (lowest risk)
- ✅ Fixes exact reported problem
- ✅ Maintains existing patterns and conventions
- ✅ Easy to test and verify
- ✅ Backwards compatible
- ✅ No dependencies added

**Testing Strategy**:
- Direct API endpoint testing
- 5+ test scenarios covering edge cases
- Regression testing on staging (dev.tickedify.com)
- User verification with original reported case

**Deployment Plan**:
1. Implement fix on feature branch
2. Test via `/api/test-recurring-next` endpoint locally
3. Merge to staging branch
4. Deploy to dev.tickedify.com
5. Run regression test suite
6. User acceptance testing
7. (After beta freeze lift) Merge to main for production

---

**Research Complete**: All technical decisions made, ready for Phase 1 design.
