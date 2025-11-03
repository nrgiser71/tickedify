# API Contract: Recurring Date Calculation

**Endpoint**: Internal function (not direct HTTP endpoint)
**Purpose**: Calculate next occurrence date for recurring task patterns
**Affects**: `/api/test-recurring-next/:pattern/:baseDate` test endpoint
**Context**: Bug fix for last workday monthly patterns

## Function Signature (Conceptual)

```javascript
/**
 * Calculate next occurrence date for a recurring pattern
 * @param {string} pattern - Recurrence pattern (e.g., "monthly-weekday-last-workday-1")
 * @param {string} baseDate - Current task date in ISO format (YYYY-MM-DD)
 * @returns {string|null} Next occurrence date in ISO format, or null if invalid pattern
 */
function calculateNextOccurrence(pattern, baseDate) {
    // Implementation in server.js
}
```

## Input Contracts

### Pattern Format

**Affected Patterns** (scope of this bug fix):

1. **Monthly Weekday Last Workday**
   ```
   Format: "monthly-weekday-last-workday-{interval}"
   Example: "monthly-weekday-last-workday-1"
   Components:
     - "monthly-weekday" = pattern type
     - "last" = position (last occurrence)
     - "workday" = target day type (Monday-Friday)
     - "1" = interval (every 1 month)
   ```

2. **Dutch Pattern: Laatste Werkdag Maand**
   ```
   Format: "laatste-werkdag-maand"
   Meaning: Last workday of month (monthly)
   No parameters: simple string pattern
   ```

### Base Date Format
```
Format: ISO 8601 date string "YYYY-MM-DD"
Examples:
  - "2025-10-31" ✅
  - "2025-11-28" ✅
  - "2026-01-30" ✅
Invalid formats:
  - "31/10/2025" ❌ (European format not accepted)
  - "10-31-2025" ❌ (US format not accepted)
  - "2025-10-31T00:00:00Z" ❌ (ISO datetime not accepted, date only)
```

## Output Contracts

### Success Response
```javascript
{
    pattern: string,        // Echo of input pattern
    baseDate: string,       // Echo of input base date (ISO format)
    nextDate: string,       // Calculated next date (ISO format)
    success: boolean,       // true if calculation succeeded
    message: string,        // Human-readable result
    calculation: string     // Formula used (for debugging)
}
```

**Example**:
```json
{
    "pattern": "monthly-weekday-last-workday-1",
    "baseDate": "2025-10-31",
    "nextDate": "2025-11-28",
    "success": true,
    "message": "Next occurrence: 2025-11-28",
    "calculation": "2025-10-31 + monthly-weekday-last-workday-1 = 2025-11-28"
}
```

### Failure Response
```javascript
{
    pattern: string,
    baseDate: string,
    nextDate: null,
    success: false,
    message: string,        // Error description
    calculation: string     // "Pattern not recognized"
}
```

## Behavioral Contract (Fixed Behavior)

### Last Workday Calculation Rules

**Definition**: Last workday = last Monday-Friday of target month

**Algorithm** (AFTER fix):
```
1. Start from base date
2. Add interval months to get target month
3. Move to (target month + 1), then setDate(0) to get last day of target month
4. If last day is Saturday (6) or Sunday (0):
   - Move backwards (decrement date) until Friday is found
5. Return calculated date in ISO format
```

**Before Fix (BUGGY)**:
```
Step 3 was: Move to (target month + 1), then +1 AGAIN → off by 1 month ❌
```

### Test Scenarios (Contract Validation)

#### Scenario 1: Basic Monthly Pattern
```json
Input: {
  "pattern": "monthly-weekday-last-workday-1",
  "baseDate": "2025-10-31"
}

Output: {
  "nextDate": "2025-11-28",
  "success": true
}

Rationale:
  - October 31, 2025 (Friday) + 1 month = November 2025
  - Last day of November = 30th (Sunday)
  - Last workday = Friday November 28
```

#### Scenario 2: Month Continuation
```json
Input: {
  "pattern": "monthly-weekday-last-workday-1",
  "baseDate": "2025-11-28"
}

Output: {
  "nextDate": "2025-12-31",
  "success": true
}

Rationale:
  - November 28, 2025 + 1 month = December 2025
  - Last day of December = 31st (Wednesday)
  - Last workday = Wednesday December 31 (already a workday)
```

#### Scenario 3: Year Boundary
```json
Input: {
  "pattern": "monthly-weekday-last-workday-1",
  "baseDate": "2025-12-31"
}

Output: {
  "nextDate": "2026-01-30",
  "success": true
}

Rationale:
  - December 31, 2025 + 1 month = January 2026
  - Last day of January = 31st (Saturday)
  - Last workday = Friday January 30
```

#### Scenario 4: Short Month (February)
```json
Input: {
  "pattern": "monthly-weekday-last-workday-1",
  "baseDate": "2025-01-31"
}

Output: {
  "nextDate": "2025-02-28",
  "success": true
}

Rationale:
  - January 31, 2025 + 1 month = February 2025
  - Last day of February = 28th (Friday, non-leap year)
  - Last workday = Friday February 28
```

#### Scenario 5: Bi-Monthly Pattern
```json
Input: {
  "pattern": "monthly-weekday-last-workday-2",
  "baseDate": "2025-10-31"
}

Output: {
  "nextDate": "2025-12-31",
  "success": true
}

Rationale:
  - October 31, 2025 + 2 months = December 2025
  - Last day of December = 31st (Wednesday)
  - Last workday = Wednesday December 31
```

#### Scenario 6: Dutch Pattern
```json
Input: {
  "pattern": "laatste-werkdag-maand",
  "baseDate": "2025-10-31"
}

Output: {
  "nextDate": "2025-11-28",
  "success": true
}

Rationale:
  - Same as Scenario 1 (monthly = interval 1)
  - October 31, 2025 + 1 month = November 2025
  - Last workday = Friday November 28
```

## Edge Cases Contract

### Weekend Handling
```
If last day of month falls on:
  - Saturday (6) → Return previous Friday (-2 days)
  - Sunday (0) → Return previous Friday (-2 days)
  - Friday (5) → Return that Friday (no adjustment)
  - Any other weekday → Return that day (no adjustment)
```

### Month Length Variations
```
February (28/29 days):
  - Non-leap year: Max 28 days
  - Leap year: Max 29 days
  - Workday calculation applies normally

April, June, September, November (30 days):
  - Max 30 days
  - Workday calculation applies normally

January, March, May, July, August, October, December (31 days):
  - Max 31 days
  - Workday calculation applies normally
```

### Invalid Pattern Handling
```json
Input: {
  "pattern": "invalid-pattern",
  "baseDate": "2025-10-31"
}

Output: {
  "nextDate": null,
  "success": false,
  "message": "Pattern not recognized"
}
```

## Backwards Compatibility

### Guaranteed Behavior
- ✅ All OTHER recurring patterns remain unchanged
- ✅ First workday patterns still work correctly
- ✅ Regular weekday patterns (first/second/third/fourth) unchanged
- ✅ Daily, weekly, yearly patterns unchanged

### Breaking Changes
- ❌ None - this is a bug fix, not a breaking change
- ⚠️ Users will see CORRECTED behavior (fix fixes broken functionality)

## Performance Contract

### Execution Time
- **Target**: < 1ms per calculation
- **Maximum**: < 10ms per calculation
- **Complexity**: O(1) - constant time (max 31 days iteration for weekend check)

### Memory Usage
- **Allocation**: Minimal (single Date object)
- **No Caching**: Stateless calculation, no persistence

## Error Handling Contract

### Invalid Pattern
```javascript
// Behavior: Return null, set success: false
if (!pattern || typeof pattern !== 'string') {
    return {
        pattern,
        baseDate,
        nextDate: null,
        success: false,
        message: 'Invalid pattern'
    };
}
```

### Invalid Base Date
```javascript
// Behavior: Return null or invalid date
const date = new Date(baseDate);
if (isNaN(date.getTime())) {
    return {
        pattern,
        baseDate,
        nextDate: null,
        success: false,
        message: 'Invalid base date format'
    };
}
```

---

**Contract Status**: ✅ Complete and testable via `/api/test-recurring-next/:pattern/:baseDate` endpoint
