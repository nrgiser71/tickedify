# Contract: Week Calculation Logic

## Function Signature

```javascript
/**
 * Calculate the Monday (start) of the current week
 * @param {Date} vandaag - Current date
 * @returns {Date} - Monday of the current week (00:00:00)
 */
function berekenHuidigeWeekStart(vandaag)
```

## Contract Specification

### Input Requirements

**Parameter**: `vandaag` (Date object)
- MUST be a valid JavaScript Date object
- MUST NOT be null or undefined
- CAN be any date (past, present, future)

### Output Guarantees

**Return Value**: Date object representing Monday of current week
- MUST be a Date object
- MUST have day of week = Monday (getDay() === 1)
- MUST be <= input date (vandaag)
- MUST be >= input date - 6 days

### Behavioral Contract

**Rule 1: Sunday Handling**
- WHEN input is Sunday (getDay() === 0)
- THEN output MUST be 6 days before input
- EXAMPLE: Input = Sunday Oct 19 → Output = Monday Oct 13

**Rule 2: Monday Handling**
- WHEN input is Monday (getDay() === 1)
- THEN output MUST equal input (same date)
- EXAMPLE: Input = Monday Oct 20 → Output = Monday Oct 20

**Rule 3: Tuesday-Saturday Handling**
- WHEN input is Tuesday-Saturday (getDay() === 2-6)
- THEN output MUST be (getDay() - 1) days before input
- EXAMPLE: Input = Wednesday Oct 22 (day 3) → Output = Monday Oct 20 (3-1=2 days back)

**Rule 4: Month Boundary**
- WHEN calculated Monday falls in previous month
- THEN output MUST correctly handle month transition
- EXAMPLE: Input = Sunday Nov 2 → Output = Monday Oct 27

**Rule 5: Year Boundary**
- WHEN calculated Monday falls in previous year
- THEN output MUST correctly handle year transition
- EXAMPLE: Input = Sunday Jan 5, 2025 → Output = Monday Dec 30, 2024

### Invariants

**Invariant 1**: Week span
```javascript
const weekStart = berekenHuidigeWeekStart(vandaag);
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6); // Sunday

// MUST be true: weekStart <= vandaag <= weekEnd
```

**Invariant 2**: Monday verification
```javascript
const weekStart = berekenHuidigeWeekStart(vandaag);
// MUST be true: weekStart.getDay() === 1
```

**Invariant 3**: Deterministic
```javascript
const result1 = berekenHuidigeWeekStart(new Date('2025-10-19'));
const result2 = berekenHuidigeWeekStart(new Date('2025-10-19'));
// MUST be true: result1.getTime() === result2.getTime()
```

## Test Contract

### Required Test Cases

```javascript
// Test 1: Sunday calculation
Input:  new Date('2025-10-19') // Sunday
Output: new Date('2025-10-13') // Monday
Assert: output.getDay() === 1 && output.getDate() === 13

// Test 2: Monday calculation
Input:  new Date('2025-10-20') // Monday
Output: new Date('2025-10-20') // Monday (same)
Assert: output.getTime() === input.getTime()

// Test 3: Wednesday calculation
Input:  new Date('2025-10-22') // Wednesday
Output: new Date('2025-10-20') // Monday
Assert: output.getDay() === 1 && output.getDate() === 20

// Test 4: Saturday calculation
Input:  new Date('2025-10-25') // Saturday
Output: new Date('2025-10-20') // Monday
Assert: output.getDay() === 1 && output.getDate() === 20

// Test 5: Month boundary (Sunday Nov 2 → Monday Oct 27)
Input:  new Date('2025-11-02') // Sunday
Output: new Date('2025-10-27') // Monday
Assert: output.getMonth() === 9 && output.getDate() === 27 // Oct = month 9

// Test 6: Year boundary (Sunday Jan 5 → Monday Dec 30)
Input:  new Date('2025-01-05') // Sunday
Output: new Date('2024-12-30') // Monday
Assert: output.getFullYear() === 2024 && output.getMonth() === 11
```

## Integration Points

### Upstream Dependencies
- JavaScript `Date` API
- Browser date/time implementation

### Downstream Consumers
- `generateActiesWeekDays()` - Uses result to render week days
- `updateActiesFloatingPanelDates()` - Triggers recalculation

### Side Effects
- NONE - Pure function
- Does not modify input date
- Does not access external state
- Does not perform I/O

## Performance Contract

**Time Complexity**: O(1)
- Fixed number of operations regardless of input

**Space Complexity**: O(1)
- Creates single Date object

**Expected Execution Time**: < 1ms
- Simple arithmetic operations only

## Backwards Compatibility

**Breaking Changes**: NONE
- Function signature unchanged
- Return type unchanged
- Only internal calculation logic fixed

**Migration Required**: NONE
- Drop-in replacement for existing buggy logic
- All consumers work without modification
