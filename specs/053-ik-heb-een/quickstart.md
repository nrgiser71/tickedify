# Quickstart: Laatste Werkdag Maandelijkse Herhaling Bug Fix

**Purpose**: Verify that the bug fix correctly calculates next occurrence for last workday monthly patterns
**Estimated Time**: 5-10 minutes
**Prerequisites**: Bug fix implemented in `server.js`

## Test Environment

**Staging**: dev.tickedify.com (via Vercel deployment)
**API Base URL**: `https://dev.tickedify.com/api`
**Test Endpoint**: `/test-recurring-next/:pattern/:baseDate`

**Important**: Use Vercel MCP tools or browser with authentication for dev.tickedify.com access

## Quick Verification (30 seconds)

### Test Case 1: Basic Monthly Pattern (Original Reported Bug)

```bash
# Test pattern: monthly-weekday-last-workday-1
# Base date: 2025-10-31 (Friday)
# Expected: 2025-11-28 (Friday - last workday of November)
# Buggy behavior: 2025-12-31 (skipped November)

curl -s -L -k "https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-10-31" | jq '.'
```

**Expected Output**:
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

**✅ PASS Criteria**: `nextDate === "2025-11-28"`
**❌ FAIL Criteria**: `nextDate === "2025-12-31"` (bug still present)

## Full Regression Suite (5 minutes)

### Test Case 2: Month Continuation

```bash
# Base date: 2025-11-28 (Friday)
# Expected: 2025-12-31 (Wednesday - last workday of December)

curl -s -L -k "https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-11-28" | jq '.nextDate'
```

**Expected**: `"2025-12-31"`

### Test Case 3: Year Boundary

```bash
# Base date: 2025-12-31 (Wednesday)
# Expected: 2026-01-30 (Friday - last workday of January)

curl -s -L -k "https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-12-31" | jq '.nextDate'
```

**Expected**: `"2026-01-30"`

### Test Case 4: Short Month (February)

```bash
# Base date: 2025-01-31 (Friday)
# Expected: 2025-02-28 (Friday - last workday of February)

curl -s -L -k "https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-01-31" | jq '.nextDate'
```

**Expected**: `"2025-02-28"`

### Test Case 5: Bi-Monthly Pattern

```bash
# Pattern: monthly-weekday-last-workday-2 (every 2 months)
# Base date: 2025-10-31 (Friday)
# Expected: 2025-12-31 (Wednesday - skip November, go to December)

curl -s -L -k "https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-2/2025-10-31" | jq '.nextDate'
```

**Expected**: `"2025-12-31"`

### Test Case 6: Dutch Pattern

```bash
# Pattern: laatste-werkdag-maand (same as monthly-weekday-last-workday-1)
# Base date: 2025-10-31 (Friday)
# Expected: 2025-11-28 (Friday - last workday of November)

curl -s -L -k "https://dev.tickedify.com/api/test-recurring-next/laatste-werkdag-maand/2025-10-31" | jq '.nextDate'
```

**Expected**: `"2025-11-28"`

## Complete Test Script

**Save as**: `test-recurring-fix.sh`

```bash
#!/bin/bash

# Tickedify Laatste Werkdag Bug Fix - Regression Test Suite
# Tests the fix for monthly-weekday-last-workday pattern

BASE_URL="https://dev.tickedify.com/api"
ENDPOINT="test-recurring-next"

echo "🧪 Testing Laatste Werkdag Maandelijkse Herhaling Bug Fix"
echo "============================================================"
echo ""

# Test 1: Original reported bug
echo "Test 1: Basic Monthly Pattern (31/10 → 28/11)"
RESULT=$(curl -s -L -k "$BASE_URL/$ENDPOINT/monthly-weekday-last-workday-1/2025-10-31" | jq -r '.nextDate')
if [ "$RESULT" == "2025-11-28" ]; then
    echo "✅ PASS: $RESULT"
else
    echo "❌ FAIL: Expected 2025-11-28, got $RESULT"
fi
echo ""

# Test 2: Month continuation
echo "Test 2: Month Continuation (28/11 → 31/12)"
RESULT=$(curl -s -L -k "$BASE_URL/$ENDPOINT/monthly-weekday-last-workday-1/2025-11-28" | jq -r '.nextDate')
if [ "$RESULT" == "2025-12-31" ]; then
    echo "✅ PASS: $RESULT"
else
    echo "❌ FAIL: Expected 2025-12-31, got $RESULT"
fi
echo ""

# Test 3: Year boundary
echo "Test 3: Year Boundary (31/12 → 30/01)"
RESULT=$(curl -s -L -k "$BASE_URL/$ENDPOINT/monthly-weekday-last-workday-1/2025-12-31" | jq -r '.nextDate')
if [ "$RESULT" == "2026-01-30" ]; then
    echo "✅ PASS: $RESULT"
else
    echo "❌ FAIL: Expected 2026-01-30, got $RESULT"
fi
echo ""

# Test 4: Short month (February)
echo "Test 4: Short Month February (31/01 → 28/02)"
RESULT=$(curl -s -L -k "$BASE_URL/$ENDPOINT/monthly-weekday-last-workday-1/2025-01-31" | jq -r '.nextDate')
if [ "$RESULT" == "2025-02-28" ]; then
    echo "✅ PASS: $RESULT"
else
    echo "❌ FAIL: Expected 2025-02-28, got $RESULT"
fi
echo ""

# Test 5: Bi-monthly pattern
echo "Test 5: Bi-Monthly Pattern (31/10 → 31/12, skip Nov)"
RESULT=$(curl -s -L -k "$BASE_URL/$ENDPOINT/monthly-weekday-last-workday-2/2025-10-31" | jq -r '.nextDate')
if [ "$RESULT" == "2025-12-31" ]; then
    echo "✅ PASS: $RESULT"
else
    echo "❌ FAIL: Expected 2025-12-31, got $RESULT"
fi
echo ""

# Test 6: Dutch pattern
echo "Test 6: Dutch Pattern laatste-werkdag-maand (31/10 → 28/11)"
RESULT=$(curl -s -L -k "$BASE_URL/$ENDPOINT/laatste-werkdag-maand/2025-10-31" | jq -r '.nextDate')
if [ "$RESULT" == "2025-11-28" ]; then
    echo "✅ PASS: $RESULT"
else
    echo "❌ FAIL: Expected 2025-11-28, got $RESULT"
fi
echo ""

echo "============================================================"
echo "🏁 Test Suite Complete"
```

**Usage**:
```bash
chmod +x test-recurring-fix.sh
./test-recurring-fix.sh
```

## Manual Browser Testing (Alternative)

If Vercel Authentication is blocking curl:

### Step 1: Open Browser
Navigate to: `https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-10-31`

### Step 2: Login if Prompted
Use Vercel Authentication credentials

### Step 3: Verify JSON Response
```json
{
  "nextDate": "2025-11-28",
  "success": true
}
```

### Step 4: Test Other Scenarios
Change URL pattern and date:
- `/monthly-weekday-last-workday-1/2025-11-28` → expect `2025-12-31`
- `/monthly-weekday-last-workday-1/2025-12-31` → expect `2026-01-30`
- `/laatste-werkdag-maand/2025-10-31` → expect `2025-11-28`

## Integration Test (Complete User Flow)

**Note**: This requires UI access to tickedify.com/app

### Setup
1. Login to dev.tickedify.com/app
2. Create a test task:
   - Titel: "Test Laatste Werkdag Herhaling"
   - Datum: 31/10/2025
   - Herhaling: "Elke maand op laatste werkdag"

### Verification Steps
1. Mark task as completed
2. Check that new task appears with date: **28/11/2025** ✅
3. Not 31/12/2025 ❌ (that would indicate bug still present)

### Expected Behavior
- ✅ Original task: voltooid = true
- ✅ New task created: verschijndatum = "2025-11-28"
- ✅ New task: herhaling_actief = true (inherited)
- ✅ New task visible in appropriate list

## Troubleshooting

### Issue: `curl` returns empty response
**Solution**: Use `-L` flag to follow redirects: `curl -s -L -k "https://..."`

### Issue: Vercel Authentication blocks access
**Solution**: Use Vercel MCP tools:
```javascript
mcp__vercel__web_fetch_vercel_url({
    url: "https://dev.tickedify.com/api/test-recurring-next/monthly-weekday-last-workday-1/2025-10-31"
})
```

### Issue: `jq` command not found
**Solution**: Install jq: `brew install jq` (macOS) or use browser testing instead

### Issue: Test fails with old date
**Solution**: Ensure you're testing on dev.tickedify.com (staging), not tickedify.com (production)

## Success Criteria

**All tests MUST pass** for bug fix to be considered successful:

- ✅ Test 1: 31/10 → 28/11 (original bug scenario)
- ✅ Test 2: 28/11 → 31/12 (continuation)
- ✅ Test 3: 31/12 → 30/01 (year boundary)
- ✅ Test 4: 31/01 → 28/02 (short month)
- ✅ Test 5: Bi-monthly pattern works correctly
- ✅ Test 6: Dutch pattern gives same result

**Regression Check**: Existing patterns must still work:
- ✅ First workday patterns unaffected
- ✅ Regular weekday patterns (first/second/third/fourth) unaffected
- ✅ Other recurring patterns (daily, weekly, yearly) unaffected

## Deployment Verification

After staging tests pass:

1. Check version endpoint:
   ```bash
   curl -s -L -k "https://dev.tickedify.com/api/version"
   ```

2. Verify version matches package.json

3. Run regression suite again to confirm deployment

4. Report results to user for approval

---

**Quickstart Complete**: Ready for implementation and testing phase
