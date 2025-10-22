# Research: Drag & Drop Popup Week Display Bug

## Bug Analysis

### Root Cause Identification

**Location**: `public/app.js:11245` - Function `generateActiesWeekDays()`

**Problematic Code**:
```javascript
const huidigeWeekStart = new Date(vandaag);
huidigeWeekStart.setDate(vandaag.getDate() - vandaag.getDay() + 1); // Maandag van deze week
```

**Problem**:
- `vandaag.getDay()` returns 0 for Sunday
- Formula: `vandaag.getDate() - 0 + 1 = vandaag.getDate() + 1`
- This calculates **next Monday** instead of **current week Monday**

**Example Scenario (Sunday October 19, 2025)**:
- Current date: October 19 (Sunday)
- `getDay()` = 0
- Calculation: `19 - 0 + 1 = 20` → Monday October 20
- Result: "Huidige week" shows October 20-26 (WRONG - should be October 13-19)
- "Volgende week" shows October 27-November 2 (WRONG - should be October 20-26)

### Solution Strategy

**Fix Required**: Handle Sunday (day 0) as special case

**Correct Logic**:
- Sunday (0): Go back 6 days to get Monday of current week
- Monday-Saturday (1-6): Go back (day - 1) days to get Monday

**Implementation Options**:

1. **Ternary operator** (simplest):
```javascript
const dagVanWeek = vandaag.getDay();
const dagenNaarMaandag = dagVanWeek === 0 ? -6 : -(dagVanWeek - 1);
huidigeWeekStart.setDate(vandaag.getDate() + dagenNaarMaandag);
```

2. **Modulo approach** (elegant):
```javascript
const dagenNaarMaandag = -((vandaag.getDay() + 6) % 7);
huidigeWeekStart.setDate(vandaag.getDate() + dagenNaarMaandag);
```

**Recommendation**: Use Option 1 (ternary) - explicit and easier to understand/maintain

### Testing Strategy

**Test Cases Required**:

1. **Sunday Test**: Verify current week includes Sunday
   - Input: Sunday October 19, 2025
   - Expected: Week 1 = Oct 13-19, Week 2 = Oct 20-26

2. **Monday Test**: Verify Monday starts new week correctly
   - Input: Monday October 20, 2025
   - Expected: Week 1 = Oct 20-26, Week 2 = Oct 27-Nov 2

3. **Mid-week Test**: Verify Wednesday shows correct weeks
   - Input: Wednesday October 22, 2025
   - Expected: Week 1 = Oct 20-26, Week 2 = Oct 27-Nov 2

4. **Saturday Test**: Verify Saturday (last workday) shows correct weeks
   - Input: Saturday October 25, 2025
   - Expected: Week 1 = Oct 20-26, Week 2 = Oct 27-Nov 2

5. **Month boundary Test**: Verify correct display across month change
   - Input: Sunday November 30, 2025
   - Expected: Week 1 = Nov 24-30, Week 2 = Dec 1-7

6. **Year boundary Test**: Verify correct display across year change
   - Input: Sunday December 28, 2025
   - Expected: Week 1 = Dec 22-28, Week 2 = Dec 29-Jan 4

### Dependencies & Constraints

**Technical Constraints**:
- Frontend-only fix (no backend/API changes)
- JavaScript Date object handling
- Must work in all modern browsers (Chrome, Safari, Firefox, Edge)
- No external libraries - vanilla JavaScript only

**Related Code**:
- Function: `generateActiesWeekDays()` at line 11228
- Called from: `updateActiesFloatingPanelDates()` at line 11223
- DOM elements: `actiesHuidigeWeek`, `actiesVolgendeWeek`, `actiesDerdeWeek`

**No Breaking Changes**:
- Fix is backward compatible
- Does not change API
- Does not change database schema
- Does not affect other features

### Performance Considerations

**Impact**: Negligible
- Single calculation change
- No additional loops or operations
- Same time complexity O(1) for date calculation
- No memory overhead

### Validation Approach

**Manual Testing**:
1. Change system date to Sunday
2. Open Tickedify app at tickedify.com/app
3. Navigate to "Acties" screen
4. Drag a task to trigger planning popup
5. Verify "Huidige week" shows current week (including Sunday)
6. Verify "Volgende week" shows next week

**Automated Testing** (via Playwright):
1. Mock system date to Sunday
2. Simulate drag action
3. Query DOM for week containers
4. Assert correct dates in each day zone
5. Repeat for other days of week

**Browser Testing**:
- Chrome (primary development browser)
- Safari (macOS default)
- Firefox (cross-browser validation)
- Edge (Windows compatibility)

## Research Findings Summary

### Decision: Ternary Operator Fix
**Rationale**:
- Explicit logic is easier to understand
- Clear special case handling for Sunday
- Matches existing code style in codebase
- No performance difference vs modulo approach

### Alternatives Considered:
1. **Modulo approach**: More mathematical, less readable
2. **Lookup table**: Overkill for simple calculation
3. **Library (date-fns)**: Unnecessary dependency for single fix

### Implementation Risk: LOW
- Single line change in one function
- Well-understood JavaScript Date API
- Extensive test coverage possible
- Easy to rollback if issues arise

### Estimated Effort:
- Code change: 5 minutes
- Testing: 30 minutes (all scenarios)
- Documentation: 15 minutes
- **Total: ~1 hour**
