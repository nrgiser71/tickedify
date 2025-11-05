# Tasks: Account Settings Block

**Input**: Design documents from `/specs/058-dan-mag-je/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/account-api.yml, quickstart.md
**Branch**: 058-dan-mag-je
**Target Version**: 0.21.93

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Node.js 16+, Express.js, PostgreSQL (Neon), Mailgun
   → Structure: Monolith (server.js + public/app.js)
2. Load optional design documents ✅
   → data-model.md: users table extensions + password_reset_tokens table
   → contracts/: account-api.yml with 3 endpoints
   → research.md: Token generation, email template, rate limiting decisions
   → quickstart.md: 12 test scenarios
3. Generate tasks by category ✅
4. Apply task rules ✅
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Tickedify uses monolith architecture:**
- Backend: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (~15,755 lines)
- Frontend: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js` (~8,000 lines)
- Styles: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/style.css` (~1,800 lines)
- Migrations: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/migrations/`

---

## Phase 3.1: Database Setup

### T001: Create database migration file
**File**: `migrations/20251105_add_account_settings.sql`
**Description**: Create migration script to:
- Add `last_login TIMESTAMP` to users table
- Add `total_tasks_created INTEGER DEFAULT 0` to users table
- Add `total_tasks_completed INTEGER DEFAULT 0` to users table
- Create `password_reset_tokens` table with 8 columns (id, user_id, token_hash, expires_at, used_at, created_at, ip_address, user_agent)
- Create indexes on user_id and expires_at
- Add check constraints for non-negative task counts and token_hash length
- Backfill existing users' task statistics from taken table

**Based on**: data-model.md lines 23-96
**Success Criteria**: Migration file exists with complete SQL

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T002 [P]: API test - Fetch account info (authenticated)
**Test**: quickstart.md Test 1
**Description**: Write curl-based test to verify GET /api/account returns user account information when authenticated. Test should:
- Login with test credentials
- Call GET /api/account with session cookie
- Assert 200 status code
- Assert response contains: id, name, created_at, member_since, last_login, last_login_relative, total_tasks_created, total_tasks_completed
- Verify human-readable date formats

**Expected**: Test FAILS because endpoint doesn't exist yet

---

### T003 [P]: API test - Fetch account info (unauthenticated)
**Test**: quickstart.md Test 2
**Description**: Write curl-based test to verify GET /api/account returns 401 when not authenticated. Test should:
- Call GET /api/account without session cookie
- Assert 401 status code
- Assert error message: "Not authenticated"

**Expected**: Test FAILS because endpoint doesn't exist yet

---

### T004 [P]: API test - Request password reset (valid email)
**Test**: quickstart.md Test 3
**Description**: Write curl-based test to verify POST /api/account/password-reset sends email for existing user. Test should:
- Call POST /api/account/password-reset with valid email
- Assert 200 status code
- Assert response contains message and expires_in_hours
- Verify database has new password_reset_tokens row

**Expected**: Test FAILS because endpoint doesn't exist yet

---

### T005 [P]: API test - Request password reset (non-existent email)
**Test**: quickstart.md Test 4
**Description**: Write curl-based test to verify POST /api/account/password-reset returns same response for non-existent email (security). Test should:
- Call POST /api/account/password-reset with non-existent email
- Assert 200 status code (NOT 404!)
- Assert same response as valid email
- Verify no database entry created

**Expected**: Test FAILS because endpoint doesn't exist yet

---

### T006 [P]: API test - Password reset rate limiting
**Test**: quickstart.md Test 5
**Description**: Write curl-based test to verify rate limiting (max 3 requests per hour). Test should:
- Send 4 reset requests in quick succession
- Assert first 3 return 200
- Assert 4th returns 429 (Too Many Requests)
- Assert error contains retry_after_seconds

**Expected**: Test FAILS because endpoint doesn't exist yet

---

### T007 [P]: API test - Confirm password reset (valid token)
**Test**: quickstart.md Test 6
**Description**: Write curl-based test to verify POST /api/account/password-reset/confirm updates password. Test should:
- Request password reset to get token
- Call POST /api/account/password-reset/confirm with token and new password
- Assert 200 status code
- Verify password updated in database (can login with new password)
- Verify token marked as used (used_at set)

**Expected**: Test FAILS because endpoint doesn't exist yet

---

### T008 [P]: API test - Confirm password reset (expired token)
**Test**: quickstart.md Test 7
**Description**: Write curl-based test to verify expired tokens are rejected. Test should:
- Create expired token in database (expires_at < NOW())
- Call POST /api/account/password-reset/confirm with expired token
- Assert 401 status code
- Assert error: "Reset token has expired. Please request a new one."

**Expected**: Test FAILS because endpoint doesn't exist yet

---

### T009 [P]: API test - Confirm password reset (used token)
**Test**: quickstart.md Test 8
**Description**: Write curl-based test to verify single-use token enforcement. Test should:
- Use a token once
- Attempt to use same token again
- Assert 401 status code
- Assert error: "Reset token has already been used."

**Expected**: Test FAILS because endpoint doesn't exist yet

---

### T010 [P]: API test - Confirm password reset (weak password)
**Test**: quickstart.md Test 9
**Description**: Write curl-based test to verify password validation. Test should:
- Request new token
- Call POST /api/account/password-reset/confirm with password less than 8 characters
- Assert 400 status code
- Assert error: "Password must be at least 8 characters"
- Verify token NOT marked as used (user can retry)

**Expected**: Test FAILS because endpoint doesn't exist yet

---

### T011 [P]: API test - Task statistics increment
**Test**: quickstart.md Test 11
**Description**: Write curl-based test to verify task counters increment. Test should:
- Get current task counts from GET /api/account
- Create new task via POST /api/lijst/acties
- Verify total_tasks_created incremented by 1
- Complete task via PUT /api/taak/:id with voltooid=true
- Verify total_tasks_completed incremented by 1

**Expected**: Test FAILS because counter logic doesn't exist yet

---

### T012 [P]: API test - Last login tracking
**Test**: quickstart.md Test 12
**Description**: Write curl-based test to verify last_login updates on authentication. Test should:
- Note current last_login value
- Logout
- Wait 5 seconds
- Login again
- Verify last_login timestamp is more recent
- Verify last_login_relative shows "Just now"

**Expected**: Test FAILS because last_login logic doesn't exist yet

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### T013: Execute database migration on staging
**File**: Connect to Neon staging database
**Description**: Run migration script from T001 on dev.tickedify.com database. Verify:
- Users table has new columns (last_login, total_tasks_created, total_tasks_completed)
- password_reset_tokens table exists
- Indexes created successfully
- Check constraints active
- Existing users have backfilled task statistics

**Dependency**: T001 (migration file must exist)
**Success Criteria**: Database schema matches data-model.md

---

### T014 [P]: Add password reset token generation helper
**File**: `server.js` (add helper function around line 360)
**Description**: Implement `generatePasswordResetToken()` function:
```javascript
function generatePasswordResetToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Based on**: research.md lines 14-38
**Success Criteria**: Helper functions exist and return correct types

---

### T015 [P]: Add password reset email template
**File**: `server.js` (add helper function around line 400)
**Description**: Implement `sendPasswordResetEmail(userEmail, userName, resetToken)` function using Mailgun:
- Subject: "Reset your Tickedify password"
- HTML template with reset link button
- Plain text fallback
- Include userName, reset link (dev.tickedify.com/reset-password?token=...), expiration notice (24 hours)
- Security notice: "If you didn't request this, ignore this email"

**Based on**: research.md lines 40-79
**Success Criteria**: Function sends email via Mailgun with correct template

---

### T016: Implement GET /api/account endpoint
**File**: `server.js` (add route before parametric routes, around line 3722)
**Description**: Implement endpoint that:
- Requires authentication (requireLogin middleware)
- Queries users table for user_id from session
- Formats response with:
  - id, name, created_at, member_since (human-readable month+year)
  - last_login, last_login_relative (human-readable time ago or "Never")
  - total_tasks_created, total_tasks_completed
- Returns 401 if not authenticated
- Returns 404 if user not found
- Returns 200 with JSON on success

**Based on**: contracts/account-api.yml lines 12-62, data-model.md lines 23-47
**Dependency**: T013 (database migration)
**Success Criteria**: T002, T003 tests pass

---

### T017: Implement POST /api/account/password-reset endpoint
**File**: `server.js` (add route around line 3750)
**Description**: Implement endpoint that:
- Accepts { email } in request body
- Validates email format
- Looks up user by email (ALWAYS return 200 even if not found - security)
- Rate limiting: Check count of pending tokens in last hour, reject if >= 3 with 429
- Generate token with T014 helper
- Hash token and store in password_reset_tokens table
- Set expires_at = NOW() + 24 hours
- Store ip_address and user_agent from request
- Send email via T015 helper
- Return { message: "Password reset email sent. Check your inbox.", expires_in_hours: 24 }

**Based on**: contracts/account-api.yml lines 64-114, research.md lines 161-214
**Dependency**: T013, T014, T015
**Success Criteria**: T004, T005, T006 tests pass

---

### T018: Implement POST /api/account/password-reset/confirm endpoint
**File**: `server.js` (add route around line 3800)
**Description**: Implement endpoint that:
- Accepts { token, new_password } in request body
- Validates token is 64 character hex string
- Validates password is at least 8 characters
- Hash token and lookup in password_reset_tokens
- Verify token exists, not expired (expires_at > NOW()), not used (used_at IS NULL)
- Return appropriate 401 errors for expired/used/invalid tokens
- Hash new password with bcrypt
- Update users.wachtwoord
- Mark token as used (used_at = NOW())
- Return { message: "Password reset successful. You can now log in with your new password." }

**Based on**: contracts/account-api.yml lines 116-168, research.md lines 161-214
**Dependency**: T013, T014
**Success Criteria**: T007, T008, T009, T010 tests pass

---

### T019: Update login endpoint to track last_login
**File**: `server.js` (find POST /api/auth/login endpoint, around line 4200)
**Description**: Add logic to update last_login timestamp:
- After successful password verification
- Before sending response
- Execute: `UPDATE users SET last_login = NOW() WHERE id = $1`

**Based on**: data-model.md lines 48-51
**Dependency**: T013
**Success Criteria**: T012 test passes

---

### T020: Update task creation endpoint to increment total_tasks_created
**File**: `server.js` (find POST /api/lijst/acties endpoint, around line 5000)
**Description**: Add logic to increment counter:
- After successful task insert
- Execute: `UPDATE users SET total_tasks_created = total_tasks_created + 1 WHERE id = $1`

**Based on**: data-model.md lines 52-54
**Dependency**: T013
**Success Criteria**: T011 test passes (creation part)

---

### T021: Update task completion endpoint to increment total_tasks_completed
**File**: `server.js` (find PUT /api/taak/:id endpoint, around line 6500)
**Description**: Add logic to increment counter when task marked complete:
- Check if voltooid changed from false to true
- If yes, execute: `UPDATE users SET total_tasks_completed = total_tasks_completed + 1 WHERE eigenaar_id = $1`

**Based on**: data-model.md lines 55-57
**Dependency**: T013
**Success Criteria**: T011 test passes (completion part)

---

## Phase 3.4: Frontend UI Implementation

### T022: Add fetchUserAccount method to Taakbeheer class
**File**: `public/app.js` (add method to Taakbeheer class around line 8000)
**Description**: Implement async method that:
- Calls GET /api/account
- Returns parsed JSON response
- Handles errors gracefully (returns null on error)
- Logs errors to console

**Success Criteria**: Method exists and returns account data

---

### T023: Add renderAccountBlock method to Taakbeheer class
**File**: `public/app.js` (add method around line 8050)
**Description**: Implement method that takes account data and returns HTML string:
- Account section title
- User's full name display
- "Member since" date (formatted from member_since)
- "Last login" time (use last_login_relative)
- Task statistics: "X tasks created, Y completed"
- "Reset Password" button with click handler
- Error state rendering with retry button if data is null
- Match Subscription block styling (gradient background, border-left)

**Based on**: spec.md FR-001 to FR-005, FR-019
**Success Criteria**: Method returns valid HTML matching design

---

### T024: Add handlePasswordResetClick method
**File**: `public/app.js` (add method around line 8150)
**Description**: Implement async click handler that:
- Shows loading state on button
- Calls POST /api/account/password-reset with user's email
- Shows success toast: "Password reset email sent. Check your inbox."
- Shows error toast on failure
- Restores button state

**Success Criteria**: Method handles click and shows appropriate feedback

---

### T025: Update loadSettingsScreen to include Account block
**File**: `public/app.js` (find loadSettingsScreen method, around line 8200)
**Description**: Update Settings screen rendering:
- Call fetchUserAccount()
- Render Account block ABOVE Subscription block
- Wire up "Reset Password" button to handlePasswordResetClick
- Handle loading state
- Handle error state

**Based on**: spec.md FR-020
**Dependency**: T022, T023, T024
**Success Criteria**: Account block displays in Settings screen

---

### T026 [P]: Add Account block CSS styling
**File**: `public/style.css` (add styles around line 1500)
**Description**: Add CSS matching Subscription block design:
```css
.account-info {
  /* Match subscription-info styling */
  background: linear-gradient(135deg, #f5f7fa 0%, #fff 100%);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  border-left: 4px solid #007aff;
}

.account-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.account-details {
  /* Styling for name, dates, statistics */
}

.account-statistics {
  /* Task counters display */
}

.btn-reset-password {
  /* Primary button styling */
}
```

**Based on**: spec.md FR-019, existing Subscription block styles
**Success Criteria**: Styles match design system

---

## Phase 3.5: Testing & Validation

### T027: Run all API tests
**Description**: Execute all API tests from Phase 3.2 (T002-T012) against deployed staging:
- Verify all 11 API tests pass
- Document any failures
- Fix any issues found

**Dependency**: T013-T021 (all backend implementation)
**Success Criteria**: All API tests pass with 200/401/429 status codes as expected

---

### T028 [P]: UI test - Account block display (Playwright)
**Test**: quickstart.md Test 10
**Description**: Write Playwright test to verify UI:
- Navigate to dev.tickedify.com/app
- Login with test credentials
- Click "Settings" in sidebar
- Verify Account block visible and positioned above Subscription block
- Verify full name displayed
- Verify "Member since" displayed
- Verify "Last login" displayed
- Verify task statistics displayed
- Verify "Reset Password" button visible
- Click button and verify toast notification
- Verify no console errors

**Dependency**: T022-T026 (frontend implementation)
**Success Criteria**: Playwright test passes

---

## Phase 3.6: Deployment

### T029: Version bump to 0.21.93
**File**: `package.json`
**Description**: Update version field from "0.21.92" to "0.21.93"

**Success Criteria**: package.json shows correct version

---

### T030: Update changelog
**File**: `public/changelog.html`
**Description**: Add entry for v0.21.93:
- Date: 2025-11-05
- Badge: badge-latest
- Category: ⚡ Features
- Description: "Account Settings Block - View account information, track task statistics, and reset password directly from Settings screen"
- Move previous version to badge-feature

**Success Criteria**: Changelog entry exists with correct format

---

### T031: Commit and push to staging branch
**Description**: Create git commit with message:
```
⚡ FEATURE: Account Settings Block - v0.21.93

- Add account information display (name, dates, statistics)
- Implement password reset via email with token validation
- Track last login timestamp
- Count tasks created and completed
- Database: users table extensions + password_reset_tokens table
- UI: Account block positioned above Subscription block

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

Push to staging branch for automatic Vercel deployment.

**Dependency**: T029, T030
**Success Criteria**: Commit pushed to origin/staging

---

### T032: Verify deployment on dev.tickedify.com
**Description**: Check deployment status:
- Wait 15 seconds after push
- Run: `curl -s -L -k https://dev.tickedify.com/api/version`
- Verify response: `{"version":"0.21.93"}`
- Repeat every 15 seconds if version doesn't match (max 2 minutes)
- If timeout, investigate Vercel logs

**Dependency**: T031
**Success Criteria**: Version endpoint returns 0.21.93

---

### T033: Execute full quickstart test suite
**Description**: Run all 12 test scenarios from quickstart.md on deployed staging:
- All 11 API tests (T002-T012)
- 1 UI test (T028)
- Document results
- Verify email delivery (check Mailgun logs)

**Dependency**: T032 (deployment verified)
**Success Criteria**: All tests pass, feature is production-ready

---

## Dependencies Graph

```
T001 (migration file)
  ↓
T013 (execute migration)
  ↓
T014, T015 [P] (helpers)
  ↓
T016, T017, T018 [P] (API endpoints)
  ↓
T019, T020, T021 [P] (integrate with existing endpoints)
  ↓
T027 (API tests pass)

T022 (fetch method)
  ↓
T023, T024 [P] (render/handler methods)
  ↓
T025 (integrate into Settings)
  ↓
T026 [P] (CSS styling)
  ↓
T028 (UI test)

T027, T028
  ↓
T029, T030 [P] (version & changelog)
  ↓
T031 (commit & push)
  ↓
T032 (verify deployment)
  ↓
T033 (full test suite)
```

**Critical Path**: T001 → T013 → T016-T021 → T027 → T029 → T031 → T032 → T033

---

## Parallel Execution Examples

### Phase 3.2: Launch all test tasks together
```bash
# These can all be written in parallel (different test scenarios):
Task(subagent_type: "tickedify-feature-builder",
     description: "API test account fetch",
     prompt: "Write T002: API test for GET /api/account authenticated")

Task(subagent_type: "tickedify-feature-builder",
     description: "API test unauthenticated",
     prompt: "Write T003: API test for GET /api/account unauthenticated")

# ... T004-T012 similarly
```

### Phase 3.3: Launch helper functions in parallel
```bash
# These are independent functions:
Task(subagent_type: "tickedify-feature-builder",
     description: "Token generation helper",
     prompt: "Implement T014: generatePasswordResetToken and hashToken functions")

Task(subagent_type: "tickedify-feature-builder",
     description: "Email template helper",
     prompt: "Implement T015: sendPasswordResetEmail function with Mailgun")
```

### Phase 3.4: Launch frontend methods in parallel
```bash
# Different methods in app.js:
Task(subagent_type: "tickedify-feature-builder",
     description: "Render account block",
     prompt: "Implement T023: renderAccountBlock method")

Task(subagent_type: "tickedify-feature-builder",
     description: "Password reset handler",
     prompt: "Implement T024: handlePasswordResetClick method")

# Separate file (can run truly in parallel):
Task(subagent_type: "tickedify-feature-builder",
     description: "Account CSS styling",
     prompt: "Implement T026: Account block CSS in style.css")
```

---

## Notes

- **[P] tasks** can run in parallel (different files or independent logic)
- **Sequential tasks** modify same file or have dependencies
- **Critical**: Tests MUST fail before implementation (TDD)
- Commit after completing each phase (3.1, 3.3, 3.4, 3.6)
- Use `tickedify-feature-builder` agent for all implementation tasks
- Use `tickedify-testing` agent for T027, T028, T033 (testing tasks)

---

## Validation Checklist

- [x] All contracts have corresponding tests (T002-T010 cover account-api.yml)
- [x] All entities have model tasks (T001 creates database tables)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (marked [P] correctly)
- [x] Each task specifies exact file path or location
- [x] No task modifies same file as another [P] task

---

**Total Tasks**: 33
**Parallel Opportunities**: 15 tasks can run in parallel
**Estimated Duration**: 4-6 hours (with parallel execution)
**Critical Path Length**: 14 tasks (sequential dependencies)
