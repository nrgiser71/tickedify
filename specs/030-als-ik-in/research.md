# Research: Admin2 Timezone Bug

**Feature**: Admin2 Bericht Tijdstip Correctie
**Date**: 2025-10-24
**Status**: Complete

## Problem Statement

Admin2 message scheduling displays incorrect times when editing existing messages:
- User inputs: 10:00
- After save and reload: displays 08:00 (2 hours earlier)
- Timezone: CET (UTC+1) or CEST (UTC+2) depending on season

## Root Cause Analysis

### Bug Location
`/public/admin2.html` lines 2164 and 2168 in `loadMessageForEdit()` function

### Current Implementation (INCORRECT)
```javascript
// Line 2164 - publishAt
if (msg.publish_at) {
    const publishDate = new Date(msg.publish_at);
    document.getElementById('publishAt').value = publishDate.toISOString().slice(0, 16);
}

// Line 2168 - expiresAt
if (msg.expires_at) {
    const expiresDate = new Date(msg.expires_at);
    document.getElementById('expiresAt').value = expiresDate.toISOString().slice(0, 16);
}
```

### Why It Fails
1. `msg.publish_at` from API: `"2025-10-24T08:00:00.000Z"` (UTC)
2. `new Date(msg.publish_at)` parses to local Date object: Oct 24, 10:00 CET
3. `toISOString()` converts back to UTC string: `"2025-10-24T08:00:00.000Z"`
4. `.slice(0, 16)` extracts: `"2025-10-24T08:00"`
5. `datetime-local` input interprets this as **local time 08:00** ❌
6. User sees 08:00 instead of 10:00

### HTML5 datetime-local Specification
From MDN Web Docs:
> The value of the datetime-local input is always in the format `YYYY-MM-DDTHH:mm`, regardless of the timezone. **This value represents local time, not UTC.**

Example:
- If user is in CET (UTC+1) and selects 10:00
- Input value: `"2025-10-24T10:00"` (local time)
- **NOT** `"2025-10-24T09:00"` (UTC equivalent)

## Research Findings

### Decision: Native Date API with Timezone Offset Adjustment

**Implementation**:
```javascript
function toLocalISOString(utcTimestamp) {
    if (!utcTimestamp) return '';
    const date = new Date(utcTimestamp);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

// Usage
if (msg.publish_at) {
    document.getElementById('publishAt').value = toLocalISOString(msg.publish_at);
}
if (msg.expires_at) {
    document.getElementById('expiresAt').value = toLocalISOString(msg.expires_at);
}
```

**How It Works**:
1. Parse UTC timestamp: `new Date("2025-10-24T08:00:00.000Z")`
   - Creates Date object: Oct 24, 10:00 local (CET)
2. Get timezone offset: `getTimezoneOffset()` returns `-60` (CET = UTC+1)
3. Adjust time: `date.getTime() - (-60 * 60000)` adds 1 hour
4. Convert to ISO: `toISOString()` now produces `"2025-10-24T10:00:00.000Z"`
5. Extract local format: `.slice(0, 16)` → `"2025-10-24T10:00"`
6. Result: datetime-local shows 10:00 ✅

### Mathematical Proof
```
UTC time:        08:00 UTC
User timezone:   CET (UTC+1)
Local time:      10:00 CET  ← What user should see

Bug (current):
  toISOString() → "2025-10-24T08:00"
  datetime-local interprets as 08:00 local ❌

Fix (proposed):
  getTimezoneOffset() → -60 minutes (UTC+1)
  Adjustment: 08:00 + (-60 * -1) = 10:00
  Result: "2025-10-24T10:00" ✅
```

### Rationale

**Why This Solution?**
- ✅ No external dependencies (vanilla JavaScript)
- ✅ Cross-browser compatible (all modern browsers)
- ✅ Handles DST automatically (getTimezoneOffset adjusts)
- ✅ Simple, readable, maintainable
- ✅ Follows web standards (datetime-local spec)

### Alternatives Considered

#### Option 1: Intl.DateTimeFormat API
```javascript
const formatter = new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
});
const parts = formatter.formatToParts(new Date(msg.publish_at));
const value = `${parts[4].value}-${parts[2].value}-${parts[0].value}T${parts[6].value}:${parts[8].value}`;
```
**Rejected**: Too complex, harder to maintain, requires manual string building

#### Option 2: Moment.js / date-fns
```javascript
import { format } from 'date-fns';
const value = format(new Date(msg.publish_at), "yyyy-MM-dd'T'HH:mm");
```
**Rejected**: Unnecessary 50KB+ dependency for 2-line fix

#### Option 3: Manual String Formatting
```javascript
const d = new Date(msg.publish_at);
const value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
```
**Rejected**: More code, error-prone, doesn't leverage built-in ISO formatting

## Edge Cases Identified

### 1. Daylight Saving Time Transitions
**Scenario**: Message created in winter (CET, UTC+1), edited in summer (CEST, UTC+2)

**Analysis**:
- UTC storage: `"2025-01-15T08:00:00Z"` (stored in January)
- Summer edit: `getTimezoneOffset()` returns `-120` (CEST = UTC+2)
- Display: `08:00 + 2 hours = 10:00` ✅

**Verdict**: ✅ Works correctly - `getTimezoneOffset()` always returns current offset

### 2. Midnight Boundary
**Scenario**: User sets time to 23:00 local, which becomes 22:00 UTC

**Analysis**:
- Input: `"2025-10-24T23:00"` local
- Stored: `"2025-10-24T22:00:00Z"` UTC ✅
- Retrieved: `toLocalISOString("2025-10-24T22:00:00Z")`
- Display: `"2025-10-24T23:00"` ✅

**Verdict**: ✅ Date boundary handled correctly by Date API

### 3. Early Morning Hours
**Scenario**: User sets 01:00 local, which becomes 00:00 UTC (previous day)

**Analysis**:
- Input: `"2025-10-25T01:00"` local (Oct 25, 01:00 CET)
- Stored: `"2025-10-24T23:00:00Z"` UTC (Oct 24, 23:00) ✅
- Retrieved: `toLocalISOString("2025-10-24T23:00:00Z")`
- Display: `"2025-10-25T01:00"` ✅

**Verdict**: ✅ Handles day rollback correctly

### 4. International Admins (Future Consideration)
**Scenario**: Admin in EST (UTC-5) edits message created by admin in CET (UTC+1)

**Analysis**:
- Message stored: `"2025-10-24T08:00:00Z"` UTC
- CET admin sees: 10:00 (08:00 + 2h CEST)
- EST admin sees: 04:00 (08:00 - 4h EDT)
- Both are correct for their local timezone ✅

**Verdict**: ✅ System-wide consistency maintained via UTC storage

## Testing Strategy

### Manual Tests
1. Create message with 10:00 → verify displays 10:00 on reload
2. Create message with 14:30 → verify displays 14:30 on reload
3. Create message with 23:00 → verify displays 23:00 (not next day 00:00)
4. Create message with 01:00 → verify displays 01:00 (not previous day)

### Automated Playwright Tests
```javascript
test('timezone conversion round-trip', async ({ page }) => {
  const testCases = [
    { input: '10:00', expected: '10:00' },
    { input: '14:30', expected: '14:30' },
    { input: '23:00', expected: '23:00' },
    { input: '01:00', expected: '01:00' }
  ];

  for (const { input, expected } of testCases) {
    // Create message with input time
    // Save and reload
    // Verify field shows expected time
  }
});
```

## Best Practices Validation

### ✅ Database Layer
- PostgreSQL `TIMESTAMP WITH TIME ZONE` stores UTC ✅
- No ambiguity, handles DST correctly ✅
- Standard practice for multi-timezone apps ✅

### ✅ API Layer
- ISO 8601 format with explicit `Z` (UTC) ✅
- Example: `"2025-10-24T08:00:00.000Z"` ✅
- Standard for REST APIs ✅

### ✅ Frontend Layer (FIXED)
- `datetime-local` input expects local time string ✅
- Convert UTC → local for display ✅
- Convert local → UTC for API submission (already working) ✅

## Implementation Checklist

- [x] Research bug root cause
- [x] Identify exact code location (lines 2164, 2168)
- [x] Design solution (timezone offset adjustment)
- [x] Validate against edge cases
- [x] Confirm no breaking changes
- [x] Plan testing strategy
- [ ] Implement fix (Phase 4)
- [ ] Test manually (Phase 5)
- [ ] Test with Playwright (Phase 5)
- [ ] Deploy to staging (Phase 5)
- [ ] Verify in production (after BÈTA FREEZE lift)

## References

- [MDN: `<input type="datetime-local">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local)
- [MDN: Date.prototype.getTimezoneOffset()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset)
- [MDN: Date.prototype.toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
- [PostgreSQL: Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [ISO 8601: Date and time format](https://en.wikipedia.org/wiki/ISO_8601)
