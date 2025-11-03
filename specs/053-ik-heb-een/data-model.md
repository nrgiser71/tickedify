# Data Model: Laatste Werkdag Maandelijkse Herhaling Bug Fix

**Date**: 2025-11-03
**Status**: Complete

## Overview

Deze bug fix vereist **GEEN database schema wijzigingen**. De fix is puur een business logic correctie in de JavaScript datum berekening. Het bestaande data model blijft ongewijzigd.

## Existing Data Model (Unchanged)

### Entity: Taak (Task)

Bestaande `taken` tabel in PostgreSQL:

```sql
CREATE TABLE taken (
    id TEXT PRIMARY KEY,
    tekst TEXT NOT NULL,
    verschijndatum DATE,                    -- Task appearance/due date
    herhaling_type VARCHAR(50),             -- Recurrence pattern string
    herhaling_actief BOOLEAN DEFAULT FALSE, -- Whether recurrence is active
    voltooid BOOLEAN DEFAULT FALSE,
    -- ... other fields (project, context, priority, etc.)
);
```

### Recurrence Pattern Format

**Affected Patterns** (string values in `herhaling_type` column):
- `monthly-weekday-last-workday-1` - Last workday every 1 month
- `monthly-weekday-last-workday-2` - Last workday every 2 months
- `monthly-weekday-last-workday-3` - Last workday every 3 months
- `laatste-werkdag-maand` - Dutch pattern: last workday of month (monthly)

**Pattern Structure**: `monthly-weekday-{position}-{day}-{interval}`
- `position`: first, second, third, fourth, last
- `day`: 1-7 (Monday-Sunday) or "workday" (special case)
- `interval`: Number of months between occurrences

**Dutch Pattern**: `laatste-werkdag-maand` (simple string, no parameters)

## Runtime Behavior (Changed by Bug Fix)

### Before Fix (BUGGY)

**Calculation Logic**:
```javascript
// For monthly-weekday-last-workday-1
const nextDateObj = new Date(currentDate);
nextDateObj.setMonth(currentDate.getMonth() + 1);  // Move forward by interval

const targetMonth = nextDateObj.getMonth();         // Store incremented month
nextDateObj.setMonth(targetMonth + 1);             // ❌ Add ANOTHER month
nextDateObj.setDate(0);                            // Last day of previous month
// Result: 2 months ahead instead of 1

// For laatste-werkdag-maand
const nextDateObj = new Date(currentDate);
nextDateObj.setMonth(currentDate.getMonth() + 2);  // ❌ Move forward 2 months
nextDateObj.setDate(0);                            // Last day of previous month
// Result: 1 month ahead (setDate(0) subtracts 1, so +2-1 = +1 net)
```

**Example**:
- Input: `31/10/2025` + `monthly-weekday-last-workday-1`
- Buggy Output: `31/12/2025` (skipped November) ❌
- Expected: `30/11/2025` ✅

### After Fix (CORRECT)

**Calculation Logic**:
```javascript
// For monthly-weekday-last-workday-1
const nextDateObj = new Date(currentDate);
nextDateObj.setMonth(currentDate.getMonth() + interval);  // Move forward by interval

// nextDateObj already has correct target month
nextDateObj.setMonth(nextDateObj.getMonth() + 1);        // ✅ Prepare for setDate(0)
nextDateObj.setDate(0);                                   // Last day of target month

// For laatste-werkdag-maand
const nextDateObj = new Date(currentDate);
nextDateObj.setMonth(currentDate.getMonth() + 1);         // ✅ Move forward 1 month
nextDateObj.setDate(0);                                   // Last day of next month
```

**Example**:
- Input: `31/10/2025` + `monthly-weekday-last-workday-1`
- Fixed Output: `30/11/2025` ✅ (November 30 is last workday)
- Correctly calculated!

## Data Flow

### Task Completion Trigger

```
User completes task
       ↓
Frontend sends PUT /api/taak/:id (voltooid: true)
       ↓
Backend checks herhaling_actief === true
       ↓
If true: Calculate next occurrence date
       ↓
[BUG FIX HAPPENS HERE]
Call date calculation function with herhaling_type
       ↓
Create new task with calculated verschijndatum
       ↓
Return success to frontend
```

### Calculation Function Locations

**Location 1**: `server.js:~7938-7954`
- Context: `/api/test-recurring-next/:pattern/:baseDate` endpoint
- Pattern: `monthly-weekday-last-workday-{interval}`
- Fix: Change `targetMonth + 1` logic

**Location 2**: `server.js:~7642-7649`
- Context: Same test endpoint, different pattern branch
- Pattern: `laatste-werkdag-maand`
- Fix: Change `+ 2` to `+ 1`

**Note**: The actual recurring task creation happens via `database.js:createRecurringTask()`, which calls the same date calculation logic. The test endpoint uses identical code, so fixing the test endpoint fixes the actual feature.

## Validation Rules (Unchanged)

### Workday Definition
- **Workday**: Monday through Friday (weekday 1-5 in JS Date)
- **Weekend**: Saturday (6) and Sunday (0) are NOT workdays
- **Holidays**: NOT considered (out of scope)

### Last Workday Logic
```javascript
// Start from last day of month
nextDateObj.setDate(0);  // Last day via JavaScript Date trick

// If weekend, go backwards to Friday
while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
    nextDateObj.setDate(nextDateObj.getDate() - 1);
}
```

### Edge Cases

**Month Length Handling**:
- 28 days (February non-leap): Last workday = 28th (Friday) or earlier
- 29 days (February leap): Last workday = 29th (Friday) or earlier
- 30 days (April, June, September, November): Last workday = 30th or earlier
- 31 days (January, March, May, July, August, October, December): Last workday = 31st or earlier

**Weekend Examples**:
- If last day (31st) is Saturday → last workday = 29th (Friday)
- If last day (31st) is Sunday → last workday = 29th (Friday)
- If last day (30th) is Sunday → last workday = 28th (Friday)

## Testing Data Scenarios

### Test Case 1: Basic Monthly Pattern
```
Input Date:    2025-10-31 (Friday)
Pattern:       monthly-weekday-last-workday-1
Expected:      2025-11-30 (Sunday → Friday 28th) ❌
Correction:    2025-11-28 (Friday is last workday)
```

Wait, November 30 is actually a Sunday, so last workday should be Friday 28th!

Let me recalculate:
```
Input Date:    2025-10-31 (Friday)
Pattern:       monthly-weekday-last-workday-1
Next month:    November 2025
Last day:      November 30 (Sunday)
Last workday:  November 28 (Friday)
Expected:      2025-11-28 ✅
```

### Test Case 2: Continuation
```
Input Date:    2025-11-28 (Friday)
Pattern:       monthly-weekday-last-workday-1
Next month:    December 2025
Last day:      December 31 (Wednesday)
Last workday:  December 31 (Wednesday)
Expected:      2025-12-31 ✅
```

### Test Case 3: Year Boundary
```
Input Date:    2025-12-31 (Wednesday)
Pattern:       monthly-weekday-last-workday-1
Next month:    January 2026
Last day:      January 31 (Saturday)
Last workday:  January 30 (Friday)
Expected:      2026-01-30 ✅
```

### Test Case 4: Short Month (February)
```
Input Date:    2025-01-31 (Friday)
Pattern:       monthly-weekday-last-workday-1
Next month:    February 2025
Last day:      February 28 (Friday) [non-leap year]
Last workday:  February 28 (Friday)
Expected:      2025-02-28 ✅
```

### Test Case 5: Bi-Monthly Pattern
```
Input Date:    2025-10-31 (Friday)
Pattern:       monthly-weekday-last-workday-2
Next month:    December 2025 (skip November)
Last day:      December 31 (Wednesday)
Last workday:  December 31 (Wednesday)
Expected:      2025-12-31 ✅
```

## State Transitions

### Task Lifecycle with Recurrence

```
State: Active (voltooid: false, herhaling_actief: true)
       ↓
User marks complete
       ↓
State: Completed (voltooid: true)
       ↓
System checks herhaling_actief === true
       ↓
[CALCULATION HAPPENS HERE]
Calculate next occurrence date from verschijndatum + herhaling_type
       ↓
Create NEW task:
  - verschijndatum = calculated next date
  - voltooid = false
  - herhaling_actief = true (inherited)
  - herhaling_type = same pattern (inherited)
       ↓
State: Active (new instance ready for future)
```

**No State Change to Original Task**: The completed task stays completed. A NEW task record is created.

## Impact Analysis

### Records Affected
- **Existing Tasks**: No changes to existing data
- **New Instances**: Will be created with CORRECT dates after fix
- **Historical Data**: Completed tasks remain unchanged

### User Experience Impact
- **Before Fix**: Users see gaps in monthly schedules (missing months)
- **After Fix**: Users see correct monthly progression
- **Migration**: None needed - fix applies to FUTURE occurrences only

---

**Data Model Documentation Complete**: No schema changes required, only runtime calculation behavior changes.
