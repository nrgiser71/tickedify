#!/bin/bash
# Contract Test: GET /api/user-settings
# Feature: 056-je-mag-een (Settings Screen)
# Tests GET endpoint before implementation (TDD approach)

set -e  # Exit on first error

BASE_URL="https://dev.tickedify.com"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================"
echo "GET /api/user-settings Contract Tests"
echo "======================================"
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

# Test 1: GET settings returns 200 status
echo "Test 1: GET /api/user-settings returns 200 status"
HTTP_CODE=$(curl -s -L -k -b cookies.txt -o /dev/null -w "%{http_code}" "$BASE_URL/api/user-settings")

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ PASS: Status 200${NC}"
else
    echo -e "${RED}✗ FAIL: Expected 200, got $HTTP_CODE${NC}"
    exit 1
fi

# Test 2: Response has correct JSON structure
echo "Test 2: Response has success field"
RESPONSE=$(curl -s -L -k -b cookies.txt "$BASE_URL/api/user-settings")
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "")

if [ "$SUCCESS" == "true" ] || [ "$SUCCESS" == "false" ]; then
    echo -e "${GREEN}✓ PASS: success field exists (value: $SUCCESS)${NC}"
else
    echo -e "${RED}✗ FAIL: No success field in response${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 3: Response has settings field (can be null or object)
echo "Test 3: Response has settings field"
HAS_SETTINGS=$(echo "$RESPONSE" | jq 'has("settings")' 2>/dev/null || echo "false")

if [ "$HAS_SETTINGS" == "true" ]; then
    echo -e "${GREEN}✓ PASS: settings field exists${NC}"
else
    echo -e "${RED}✗ FAIL: No settings field in response${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 4: Settings field is null OR object (not string, not array)
echo "Test 4: Settings field has correct type"
SETTINGS_TYPE=$(echo "$RESPONSE" | jq -r '.settings | type' 2>/dev/null || echo "")

if [ "$SETTINGS_TYPE" == "null" ] || [ "$SETTINGS_TYPE" == "object" ]; then
    echo -e "${GREEN}✓ PASS: settings is null or object (type: $SETTINGS_TYPE)${NC}"
else
    echo -e "${RED}✗ FAIL: settings has wrong type: $SETTINGS_TYPE${NC}"
    exit 1
fi

# Test 5: If settings is object, it has required fields (id, user_id, settings, created_at, updated_at)
if [ "$SETTINGS_TYPE" == "object" ]; then
    echo "Test 5: Settings object has required fields"

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
        exit 1
    fi
else
    echo "Test 5: SKIPPED (settings is null, no fields to check)"
fi

# Test 6: GET without authentication returns 401
echo "Test 6: GET without authentication returns 401"
rm -f cookies_empty.txt
touch cookies_empty.txt

HTTP_CODE_NO_AUTH=$(curl -s -L -k -b cookies_empty.txt -o /dev/null -w "%{http_code}" "$BASE_URL/api/user-settings")

# Accept 401 OR redirect to login (302/303) as authentication failure
if [ "$HTTP_CODE_NO_AUTH" == "401" ] || [ "$HTTP_CODE_NO_AUTH" == "302" ] || [ "$HTTP_CODE_NO_AUTH" == "303" ]; then
    echo -e "${GREEN}✓ PASS: Authentication required (status: $HTTP_CODE_NO_AUTH)${NC}"
else
    echo -e "${RED}✗ FAIL: Expected 401/302/303, got $HTTP_CODE_NO_AUTH${NC}"
    exit 1
fi

# Cleanup
rm -f cookies.txt cookies_empty.txt

echo ""
echo "======================================"
echo -e "${GREEN}✓ ALL GET TESTS PASSED${NC}"
echo "======================================"
