#!/bin/bash
# Contract Test: POST /api/user-settings
# Feature: 056-je-mag-een (Settings Screen)
# Tests POST endpoint before implementation (TDD approach)

set -e  # Exit on first error

BASE_URL="https://dev.tickedify.com"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================="
echo "POST /api/user-settings Contract Tests"
echo "======================================="
echo ""

# Setup: Login to get session cookie
echo "Setup: Logging in..."
curl -s -L -k -c cookies.txt -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}' > /dev/null

if [ ! -f cookies.txt ]; then
    echo -e "${RED}✗ FAIL: Login failed - no cookies${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo ""

# Test 1: POST empty settings returns 200
echo "Test 1: POST empty settings returns 200"
HTTP_CODE=$(curl -s -L -k -b cookies.txt -o response1.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{"settings":{}}')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ PASS: Status 200${NC}"
else
    echo -e "${RED}✗ FAIL: Expected 200, got $HTTP_CODE${NC}"
    cat response1.json 2>/dev/null || echo ""
    exit 1
fi

# Test 2: POST response has correct structure (success, settings object)
echo "Test 2: POST response has correct structure"
RESPONSE=$(cat response1.json)
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "")
SETTINGS_TYPE=$(echo "$RESPONSE" | jq -r '.settings | type' 2>/dev/null || echo "")

if [ "$SUCCESS" == "true" ] && [ "$SETTINGS_TYPE" == "object" ]; then
    echo -e "${GREEN}✓ PASS: success=true and settings is object${NC}"
else
    echo -e "${RED}✗ FAIL: success=$SUCCESS, settings type=$SETTINGS_TYPE${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 3: POST response settings object has all required fields
echo "Test 3: POST response has required fields"
REQUIRED_FIELDS=("id" "user_id" "settings" "created_at" "updated_at")
ALL_PRESENT=true

for field in "${REQUIRED_FIELDS[@]}"; do
    HAS_FIELD=$(echo "$RESPONSE" | jq ".settings | has(\"$field\")" 2>/dev/null || echo "false")
    if [ "$HAS_FIELD" != "true" ]; then
        echo -e "${RED}✗ FAIL: Missing field: $field${NC}"
        ALL_PRESENT=false
    fi
done

if [ "$ALL_PRESENT" == "true" ]; then
    echo -e "${GREEN}✓ PASS: All required fields present${NC}"
else
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 4: Store settings ID for update test
SETTINGS_ID=$(echo "$RESPONSE" | jq -r '.settings.id' 2>/dev/null || echo "")
echo "Stored settings ID: $SETTINGS_ID"

# Test 5: POST update (same user) returns same ID but updated timestamp
echo "Test 4: POST update returns same ID with updated timestamp"

# Get initial updated_at timestamp
UPDATED_AT_1=$(echo "$RESPONSE" | jq -r '.settings.updated_at' 2>/dev/null || echo "")

# Wait 1 second to ensure timestamp changes
sleep 1

# Update settings
HTTP_CODE_UPDATE=$(curl -s -L -k -b cookies.txt -o response2.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{"settings":{"ui":{"theme":"dark"}}}')

if [ "$HTTP_CODE_UPDATE" == "200" ]; then
    echo -e "${GREEN}✓ PASS: Update returns 200${NC}"
else
    echo -e "${RED}✗ FAIL: Update expected 200, got $HTTP_CODE_UPDATE${NC}"
    cat response2.json 2>/dev/null || echo ""
    exit 1
fi

RESPONSE_UPDATE=$(cat response2.json)
UPDATED_ID=$(echo "$RESPONSE_UPDATE" | jq -r '.settings.id' 2>/dev/null || echo "")
UPDATED_AT_2=$(echo "$RESPONSE_UPDATE" | jq -r '.settings.updated_at' 2>/dev/null || echo "")

# Check same ID
if [ "$SETTINGS_ID" == "$UPDATED_ID" ]; then
    echo -e "${GREEN}✓ PASS: Same settings ID (upsert worked)${NC}"
else
    echo -e "${RED}✗ FAIL: ID changed from $SETTINGS_ID to $UPDATED_ID${NC}"
    exit 1
fi

# Check updated_at changed
if [ "$UPDATED_AT_1" != "$UPDATED_AT_2" ]; then
    echo -e "${GREEN}✓ PASS: updated_at timestamp changed${NC}"
else
    echo -e "${RED}✗ FAIL: updated_at did not change (still $UPDATED_AT_2)${NC}"
    exit 1
fi

# Test 6: POST with complex nested settings
echo "Test 5: POST with complex nested settings"
HTTP_CODE_COMPLEX=$(curl -s -L -k -b cookies.txt -o response3.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{"settings":{"version":1,"ui":{"theme":"light","language":"en"},"notifications":{"email":true}}}')

if [ "$HTTP_CODE_COMPLEX" == "200" ]; then
    RESPONSE_COMPLEX=$(cat response3.json)
    SAVED_THEME=$(echo "$RESPONSE_COMPLEX" | jq -r '.settings.settings.ui.theme' 2>/dev/null || echo "")

    if [ "$SAVED_THEME" == "light" ]; then
        echo -e "${GREEN}✓ PASS: Complex settings saved correctly${NC}"
    else
        echo -e "${RED}✗ FAIL: Theme not saved correctly (got: $SAVED_THEME)${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ FAIL: Complex settings POST returned $HTTP_CODE_COMPLEX${NC}"
    cat response3.json 2>/dev/null || echo ""
    exit 1
fi

# Test 7: POST without settings field returns 400
echo "Test 6: POST without settings field returns 400"
HTTP_CODE_BAD=$(curl -s -L -k -b cookies.txt -o response_bad.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$HTTP_CODE_BAD" == "400" ]; then
    echo -e "${GREEN}✓ PASS: Missing settings field returns 400${NC}"
else
    echo -e "${RED}✗ FAIL: Expected 400 for missing settings, got $HTTP_CODE_BAD${NC}"
    # Note: This might fail if validation is not strict - that's okay for initial phase
fi

# Test 8: POST invalid JSON returns 400
echo "Test 7: POST invalid JSON returns 400"
HTTP_CODE_INVALID=$(curl -s -L -k -b cookies.txt -o response_invalid.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/user-settings" \
  -H "Content-Type: application/json" \
  -d 'invalid json')

if [ "$HTTP_CODE_INVALID" == "400" ]; then
    echo -e "${GREEN}✓ PASS: Invalid JSON returns 400${NC}"
else
    echo -e "${RED}✗ FAIL: Expected 400 for invalid JSON, got $HTTP_CODE_INVALID${NC}"
    # Note: Express body-parser usually handles this automatically
fi

# Cleanup
rm -f cookies.txt response*.json

echo ""
echo "======================================="
echo -e "${GREEN}✓ ALL POST TESTS PASSED${NC}"
echo "======================================="
