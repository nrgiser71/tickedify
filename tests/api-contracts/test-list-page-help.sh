#!/bin/bash
# Contract Test: GET /api/page-help (list all)
# Feature 062: Page Help Icons
# Expected: ALL TESTS MUST FAIL (endpoint not implemented yet)

BASE_URL="https://dev.tickedify.com"
ENDPOINT="/api/page-help"

echo "=========================================="
echo "Contract Test: GET /api/page-help (list all)"
echo "Expected: ALL TESTS FAIL (not implemented)"
echo "=========================================="
echo ""

# Test 1: Admin auth returns 200 with array of pages
echo "Test 1: Admin auth returns 200 with array of pages"
RESPONSE=$(curl -s -L -k -w "\n%{http_code}" "${BASE_URL}${ENDPOINT}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q '"pages"' && echo "$BODY" | grep -q '\['; then
        echo "✓ PASS - Returns 200 with pages array"
    else
        echo "✗ FAIL - Missing pages array: $BODY"
    fi
else
    echo "✗ EXPECTED FAIL - HTTP $HTTP_CODE (endpoint not implemented)"
fi
echo ""

# Test 2: Response includes all 11 eligible pages
echo "Test 2: Response includes all 11 eligible pages"
RESPONSE=$(curl -s -L -k "${BASE_URL}${ENDPOINT}")
PAGE_COUNT=$(echo "$RESPONSE" | grep -o '"pageId"' | wc -l | tr -d ' ')

if [ "$PAGE_COUNT" = "11" ]; then
    echo "✓ PASS - Response includes 11 pages"
else
    echo "✗ EXPECTED FAIL - Found $PAGE_COUNT pages, expected 11"
fi
echo ""

# Test 3: Shows custom vs. default indicator (hasCustomContent field)
echo "Test 3: Shows hasCustomContent indicator"
RESPONSE=$(curl -s -L -k "${BASE_URL}${ENDPOINT}")
if echo "$RESPONSE" | grep -q '"hasCustomContent"'; then
    echo "✓ PASS - hasCustomContent field present"
else
    echo "✗ EXPECTED FAIL - Missing hasCustomContent field"
fi
echo ""

# Test 4: Non-admin user returns 403
echo "Test 4: Non-admin user returns 403"
RESPONSE=$(curl -s -L -k -w "\n%{http_code}" \
    -c /dev/null -b /dev/null \
    "${BASE_URL}${ENDPOINT}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✓ PASS - Returns 403 for non-admin user"
else
    echo "✗ EXPECTED FAIL - HTTP $HTTP_CODE (admin auth not implemented)"
fi
echo ""

# Test 5: Check all 11 page IDs are present
echo "Test 5: Verify all 11 required page IDs exist in response"
RESPONSE=$(curl -s -L -k "${BASE_URL}${ENDPOINT}")
REQUIRED_PAGES=(
    "inbox"
    "acties"
    "opvolgen"
    "dagelijkse-planning"
    "uitgesteld-wekelijks"
    "uitgesteld-maandelijks"
    "uitgesteld-3maandelijks"
    "uitgesteld-6maandelijks"
    "uitgesteld-jaarlijks"
    "afgewerkt"
    "email-import"
)

MISSING_COUNT=0
for page in "${REQUIRED_PAGES[@]}"; do
    if ! echo "$RESPONSE" | grep -q "\"$page\""; then
        echo "  ✗ Missing page: $page"
        MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
done

if [ "$MISSING_COUNT" = "0" ]; then
    echo "✓ PASS - All 11 required pages present"
else
    echo "✗ EXPECTED FAIL - Missing $MISSING_COUNT pages (endpoint not implemented)"
fi
echo ""

echo "=========================================="
echo "Summary: If all tests show EXPECTED FAIL, proceed to implementation"
echo "=========================================="
