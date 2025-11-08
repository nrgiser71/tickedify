#!/bin/bash

# =====================================================
# Tickedify Account Settings API Tests
# Feature: 058-dan-mag-je
# Version: 0.21.93
# =====================================================
# TDD: These tests MUST FAIL initially before implementation
# Run against: dev.tickedify.com (staging)
# Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
# =====================================================

BASE_URL="https://dev.tickedify.com"
TEST_EMAIL="jan@buskens.be"
TEST_PASSWORD="qyqhut-muDvop-fadki9"
COOKIE_FILE="/tmp/tickedify_test_cookies.txt"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper: Print test header
print_test() {
  echo ""
  echo "=========================================="
  echo "TEST $1: $2"
  echo "=========================================="
}

# Helper: Print success
print_success() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

# Helper: Print failure
print_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Helper: Login and save session cookie
login() {
  echo "Logging in as $TEST_EMAIL..."
  RESPONSE=$(curl -s -L -k -c "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    -w "\n%{http_code}")

  STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$STATUS_CODE" == "200" ]; then
    echo "Login successful"
    return 0
  else
    echo "Login failed: $STATUS_CODE"
    echo "$BODY"
    return 1
  fi
}

# Helper: Logout
logout() {
  echo "Logging out..."
  curl -s -L -k -X POST "$BASE_URL/api/auth/logout" -b "$COOKIE_FILE" > /dev/null
  rm -f "$COOKIE_FILE"
}

# =====================================================
# T002: API test - Fetch account info (authenticated)
# =====================================================
print_test "T002" "Fetch account info (authenticated)"

login
if [ $? -eq 0 ]; then
  RESPONSE=$(curl -s -L -k -b "$COOKIE_FILE" -X GET "$BASE_URL/api/account" -w "\n%{http_code}")
  STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$STATUS_CODE" == "200" ]; then
    # Check if response contains expected fields
    if echo "$BODY" | grep -q '"id"' && \
       echo "$BODY" | grep -q '"name"' && \
       echo "$BODY" | grep -q '"created_at"' && \
       echo "$BODY" | grep -q '"member_since"' && \
       echo "$BODY" | grep -q '"total_tasks_created"' && \
       echo "$BODY" | grep -q '"total_tasks_completed"'; then
      print_success "Account info returned with all expected fields"
      echo "Response: $BODY"
    else
      print_fail "Response missing expected fields"
      echo "Response: $BODY"
    fi
  else
    print_fail "Expected 200, got $STATUS_CODE (EXPECTED TO FAIL - endpoint doesn't exist yet)"
    echo "Response: $BODY"
  fi
else
  print_fail "Could not login"
fi

logout

# =====================================================
# T003: API test - Fetch account info (unauthenticated)
# =====================================================
print_test "T003" "Fetch account info (unauthenticated)"

RESPONSE=$(curl -s -L -k -X GET "$BASE_URL/api/account" -w "\n%{http_code}")
STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS_CODE" == "401" ]; then
  if echo "$BODY" | grep -q "Not authenticated"; then
    print_success "Correctly rejected unauthenticated request with 401"
  else
    print_fail "Got 401 but wrong error message"
    echo "Response: $BODY"
  fi
else
  print_fail "Expected 401, got $STATUS_CODE (EXPECTED TO FAIL - endpoint doesn't exist yet)"
  echo "Response: $BODY"
fi

# =====================================================
# T004: API test - Request password reset (valid email)
# =====================================================
print_test "T004" "Request password reset (valid email)"

RESPONSE=$(curl -s -L -k -X POST "$BASE_URL/api/account/password-reset" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}" \
  -w "\n%{http_code}")

STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS_CODE" == "200" ]; then
  if echo "$BODY" | grep -q '"message"' && echo "$BODY" | grep -q '"expires_in_hours"'; then
    print_success "Password reset request accepted"
    echo "Response: $BODY"
  else
    print_fail "Got 200 but response format incorrect"
    echo "Response: $BODY"
  fi
else
  print_fail "Expected 200, got $STATUS_CODE (EXPECTED TO FAIL - endpoint doesn't exist yet)"
  echo "Response: $BODY"
fi

# =====================================================
# T005: API test - Request password reset (non-existent email)
# =====================================================
print_test "T005" "Request password reset (non-existent email)"

RESPONSE=$(curl -s -L -k -X POST "$BASE_URL/api/account/password-reset" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"nonexistent@example.com\"}" \
  -w "\n%{http_code}")

STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS_CODE" == "200" ]; then
  print_success "Returns 200 even for non-existent email (security - prevents enumeration)"
  echo "Response: $BODY"
else
  print_fail "Expected 200, got $STATUS_CODE (EXPECTED TO FAIL - endpoint doesn't exist yet)"
  echo "Response: $BODY"
fi

# =====================================================
# T006: API test - Password reset rate limiting
# =====================================================
print_test "T006" "Password reset rate limiting"

echo "Sending 4 reset requests in quick succession..."
for i in {1..4}; do
  RESPONSE=$(curl -s -L -k -X POST "$BASE_URL/api/account/password-reset" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\"}" \
    -w "\n%{http_code}")

  STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  echo "Request $i: Status $STATUS_CODE"

  if [ $i -le 3 ]; then
    if [ "$STATUS_CODE" == "200" ]; then
      echo "  ✓ Request $i accepted"
    else
      echo "  ✗ Request $i should have been accepted"
    fi
  else
    if [ "$STATUS_CODE" == "429" ]; then
      if echo "$BODY" | grep -q "retry_after_seconds"; then
        print_success "Rate limiting enforced at request 4 with 429"
        echo "Response: $BODY"
      else
        print_fail "Got 429 but missing retry_after_seconds"
        echo "Response: $BODY"
      fi
    else
      print_fail "Expected 429 on 4th request, got $STATUS_CODE (EXPECTED TO FAIL - rate limiting not implemented yet)"
      echo "Response: $BODY"
    fi
  fi

  sleep 0.5
done

# =====================================================
# T007: API test - Confirm password reset (valid token)
# =====================================================
print_test "T007" "Confirm password reset (valid token)"

# First request a reset to get a token
echo "Requesting password reset to get token..."
RESPONSE=$(curl -s -L -k -X POST "$BASE_URL/api/account/password-reset" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}" \
  -w "\n%{http_code}")

STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
if [ "$STATUS_CODE" == "200" ]; then
  echo "Reset requested successfully"

  # Note: In real test, we'd extract token from email or database
  # For now, we test with a dummy token to verify endpoint behavior
  TEST_TOKEN="a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890"

  RESPONSE=$(curl -s -L -k -X POST "$BASE_URL/api/account/password-reset/confirm" \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$TEST_TOKEN\",\"new_password\":\"NewTestPassword123\"}" \
    -w "\n%{http_code}")

  STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$STATUS_CODE" == "200" ]; then
    print_success "Password reset confirmed successfully"
    echo "Response: $BODY"
  else
    print_fail "Expected 200, got $STATUS_CODE (EXPECTED TO FAIL - endpoint doesn't exist yet)"
    echo "Response: $BODY"
  fi
else
  print_fail "Could not request password reset to get token"
fi

# =====================================================
# T008: API test - Confirm password reset (expired token)
# =====================================================
print_test "T008" "Confirm password reset (expired token)"

# Test with expired token (would need to be created in DB with expires_at < NOW())
EXPIRED_TOKEN="expired0000000000000000000000000000000000000000000000000000000000"

RESPONSE=$(curl -s -L -k -X POST "$BASE_URL/api/account/password-reset/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$EXPIRED_TOKEN\",\"new_password\":\"NewTestPassword123\"}" \
  -w "\n%{http_code}")

STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS_CODE" == "401" ]; then
  if echo "$BODY" | grep -q "expired"; then
    print_success "Expired token correctly rejected with 401"
    echo "Response: $BODY"
  else
    print_fail "Got 401 but wrong error message"
    echo "Response: $BODY"
  fi
else
  print_fail "Expected 401, got $STATUS_CODE (EXPECTED TO FAIL - endpoint doesn't exist yet)"
  echo "Response: $BODY"
fi

# =====================================================
# T009: API test - Confirm password reset (used token)
# =====================================================
print_test "T009" "Confirm password reset (used token)"

# Test using a token twice (would need actual token from T007)
USED_TOKEN="used00000000000000000000000000000000000000000000000000000000000000"

RESPONSE=$(curl -s -L -k -X POST "$BASE_URL/api/account/password-reset/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$USED_TOKEN\",\"new_password\":\"NewTestPassword123\"}" \
  -w "\n%{http_code}")

STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS_CODE" == "401" ]; then
  if echo "$BODY" | grep -q "already been used"; then
    print_success "Used token correctly rejected with 401"
    echo "Response: $BODY"
  else
    print_fail "Got 401 but wrong error message"
    echo "Response: $BODY"
  fi
else
  print_fail "Expected 401, got $STATUS_CODE (EXPECTED TO FAIL - endpoint doesn't exist yet)"
  echo "Response: $BODY"
fi

# =====================================================
# T010: API test - Confirm password reset (weak password)
# =====================================================
print_test "T010" "Confirm password reset (weak password)"

TEST_TOKEN="valid000000000000000000000000000000000000000000000000000000000000"

RESPONSE=$(curl -s -L -k -X POST "$BASE_URL/api/account/password-reset/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TEST_TOKEN\",\"new_password\":\"weak\"}" \
  -w "\n%{http_code}")

STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS_CODE" == "400" ]; then
  if echo "$BODY" | grep -q "at least 8 characters"; then
    print_success "Weak password correctly rejected with 400"
    echo "Response: $BODY"
  else
    print_fail "Got 400 but wrong error message"
    echo "Response: $BODY"
  fi
else
  print_fail "Expected 400, got $STATUS_CODE (EXPECTED TO FAIL - endpoint doesn't exist yet)"
  echo "Response: $BODY"
fi

# =====================================================
# T011: API test - Task statistics increment
# =====================================================
print_test "T011" "Task statistics increment"

login
if [ $? -eq 0 ]; then
  # Get current task counts
  echo "Fetching current task counts..."
  RESPONSE=$(curl -s -L -k -b "$COOKIE_FILE" -X GET "$BASE_URL/api/account" -w "\n%{http_code}")
  STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$STATUS_CODE" == "200" ]; then
    CREATED_BEFORE=$(echo "$BODY" | grep -o '"total_tasks_created":[0-9]*' | grep -o '[0-9]*')
    COMPLETED_BEFORE=$(echo "$BODY" | grep -o '"total_tasks_completed":[0-9]*' | grep -o '[0-9]*')
    echo "Before: Created=$CREATED_BEFORE, Completed=$COMPLETED_BEFORE"

    # Create a task
    echo "Creating new task..."
    TASK_RESPONSE=$(curl -s -L -k -b "$COOKIE_FILE" -X POST "$BASE_URL/api/lijst/acties" \
      -H "Content-Type: application/json" \
      -d '{"titel":"Test task for statistics","lijst":"acties"}' \
      -w "\n%{http_code}")

    TASK_STATUS=$(echo "$TASK_RESPONSE" | tail -n 1)
    TASK_BODY=$(echo "$TASK_RESPONSE" | head -n -1)
    TASK_ID=$(echo "$TASK_BODY" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

    if [ "$TASK_STATUS" == "201" ] && [ -n "$TASK_ID" ]; then
      echo "Task created with ID: $TASK_ID"

      # Check if total_tasks_created incremented
      sleep 1
      RESPONSE=$(curl -s -L -k -b "$COOKIE_FILE" -X GET "$BASE_URL/api/account")
      CREATED_AFTER=$(echo "$RESPONSE" | grep -o '"total_tasks_created":[0-9]*' | grep -o '[0-9]*')

      if [ "$CREATED_AFTER" -gt "$CREATED_BEFORE" ]; then
        print_success "total_tasks_created incremented from $CREATED_BEFORE to $CREATED_AFTER"
      else
        print_fail "total_tasks_created did not increment (EXPECTED TO FAIL - logic not implemented yet)"
      fi

      # Complete the task
      echo "Completing task..."
      curl -s -L -k -b "$COOKIE_FILE" -X PUT "$BASE_URL/api/taak/$TASK_ID" \
        -H "Content-Type: application/json" \
        -d '{"voltooid":true}' > /dev/null

      # Check if total_tasks_completed incremented
      sleep 1
      RESPONSE=$(curl -s -L -k -b "$COOKIE_FILE" -X GET "$BASE_URL/api/account")
      COMPLETED_AFTER=$(echo "$RESPONSE" | grep -o '"total_tasks_completed":[0-9]*' | grep -o '[0-9]*')

      if [ "$COMPLETED_AFTER" -gt "$COMPLETED_BEFORE" ]; then
        print_success "total_tasks_completed incremented from $COMPLETED_BEFORE to $COMPLETED_AFTER"
      else
        print_fail "total_tasks_completed did not increment (EXPECTED TO FAIL - logic not implemented yet)"
      fi
    else
      print_fail "Could not create test task"
    fi
  else
    print_fail "Could not fetch account info"
  fi
else
  print_fail "Could not login"
fi

logout

# =====================================================
# T012: API test - Last login tracking
# =====================================================
print_test "T012" "Last login tracking"

login
if [ $? -eq 0 ]; then
  # Get current last_login
  RESPONSE=$(curl -s -L -k -b "$COOKIE_FILE" -X GET "$BASE_URL/api/account")
  STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$STATUS_CODE" == "200" ]; then
    LAST_LOGIN_BEFORE=$(echo "$BODY" | grep -o '"last_login":"[^"]*"' | head -1)
    echo "Last login before: $LAST_LOGIN_BEFORE"

    logout
    echo "Waiting 5 seconds..."
    sleep 5

    # Login again
    login

    # Check if last_login updated
    RESPONSE=$(curl -s -L -k -b "$COOKIE_FILE" -X GET "$BASE_URL/api/account")
    LAST_LOGIN_AFTER=$(echo "$RESPONSE" | grep -o '"last_login":"[^"]*"' | head -1)
    LAST_LOGIN_RELATIVE=$(echo "$RESPONSE" | grep -o '"last_login_relative":"[^"]*"')

    echo "Last login after: $LAST_LOGIN_AFTER"
    echo "Last login relative: $LAST_LOGIN_RELATIVE"

    if [ "$LAST_LOGIN_AFTER" != "$LAST_LOGIN_BEFORE" ]; then
      if echo "$LAST_LOGIN_RELATIVE" | grep -q "Just now"; then
        print_success "last_login updated and shows 'Just now'"
      else
        print_success "last_login updated but relative time might not be 'Just now'"
      fi
    else
      print_fail "last_login did not update (EXPECTED TO FAIL - logic not implemented yet)"
    fi
  else
    print_fail "Could not fetch account info"
  fi
else
  print_fail "Could not login"
fi

logout

# =====================================================
# TEST SUMMARY
# =====================================================
echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${YELLOW}NOTE: These tests are EXPECTED TO FAIL initially (TDD).${NC}"
  echo -e "${YELLOW}After implementation, all tests should pass.${NC}"
fi

echo ""
