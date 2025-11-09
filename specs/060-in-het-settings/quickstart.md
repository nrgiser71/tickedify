# Quickstart: Password Reset Screen Testing

## Overview
This document provides step-by-step testing scenarios for the password reset page. All scenarios should be executed on **dev.tickedify.com** staging environment before any production deployment.

## Prerequisites

### Access Requirements
- Staging URL: https://dev.tickedify.com/reset-password
- Vercel Authentication required (use MCP tools or browser access)
- Test credentials:
  - Email: jan@buskens.be
  - Password: qyqhut-muDvop-fadki9

### Test Data Setup
Before testing, you need a valid reset token. Generate one via:

**Method 1: Via Settings Page**
1. Log in to dev.tickedify.com/app
2. Navigate to Account Settings
3. Click "Reset Password" button
4. Check email for reset link
5. Extract token from URL: `?token=...`

**Method 2: Via Database (Development Only)**
```sql
-- Generate test token for user jan@buskens.be
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
VALUES (
  (SELECT id FROM users WHERE email = 'jan@buskens.be'),
  -- SHA256 hash of 'test-token-123...' (64 chars)
  'INSERT_REAL_HASH_HERE',
  NOW() + INTERVAL '24 hours'
);
```

---

## Test Scenario 1: Happy Path - Successful Password Reset

### Objective
Verify that a user with a valid token can successfully reset their password.

### Steps
1. **Navigate** to: `https://dev.tickedify.com/reset-password?token={VALID_TOKEN}`
2. **Verify** page loads with:
   - Title: "Reset Your Password" (or similar)
   - Two password input fields visible
   - Submit button visible and enabled

3. **Enter** new password in first field: `NewP@ssw0rd`
4. **Verify** no validation errors appear (password meets all requirements)

5. **Enter** same password in confirm field: `NewP@ssw0rd`
6. **Verify** passwords match (no mismatch error)

7. **Click** submit button
8. **Verify** during submission:
   - Submit button shows loading state ("Resetting..." or spinner)
   - Form inputs are disabled

9. **Verify** after submission:
   - Success message appears: "Your password has been reset successfully!"
   - Login button/link appears
   - Form is locked (cannot resubmit)

10. **Click** "Go to Login" button
11. **Verify** redirected to login page

12. **Login** with:
    - Email: jan@buskens.be
    - Password: NewP@ssw0rd (the new password)
13. **Verify** login successful

### Expected Result
✅ User can reset password and log in with new credentials

---

## Test Scenario 2: Expired Token

### Objective
Verify that expired tokens are rejected with clear error message.

### Steps
1. **Setup**: Create a token with `expires_at` in the past (or wait 24+ hours)
2. **Navigate** to: `https://dev.tickedify.com/reset-password?token={EXPIRED_TOKEN}`
3. **Enter** valid password: `NewP@ssw0rd`
4. **Confirm** password: `NewP@ssw0rd`
5. **Click** submit button
6. **Verify** error message appears:
   - "This reset link has expired. Reset links are valid for 24 hours. Please request a new password reset."
   - Error is displayed prominently (not buried)
   - User can clearly understand what happened

7. **Verify** form remains editable (user could retry with different token)

### Expected Result
✅ Clear error message about expiration with instructions to request new reset

---

## Test Scenario 3: Already Used Token

### Objective
Verify that tokens can only be used once.

### Steps
1. **Complete** Scenario 1 (successful password reset)
2. **Attempt** to reuse the same reset link from step 1
3. **Navigate** to: `https://dev.tickedify.com/reset-password?token={USED_TOKEN}`
4. **Enter** password: `AnotherP@ss123`
5. **Confirm** password: `AnotherP@ss123`
6. **Click** submit button
7. **Verify** error message appears:
   - "This reset link has already been used. Please request a new password reset if you need to change your password again."

8. **Verify** password was NOT changed (login with old password still works)

### Expected Result
✅ Token cannot be reused, clear error message, password unchanged

---

## Test Scenario 4: Invalid Token Format

### Objective
Verify that malformed tokens are caught client-side.

### Steps
1. **Navigate** to: `https://dev.tickedify.com/reset-password?token=invalid-short-token`
2. **Verify** page shows error state immediately:
   - Error message: "This reset link is invalid. Please request a new password reset."
   - Form is NOT displayed
   - "Go to Login" link is visible

3. **Test** other invalid formats:
   - Too short: `?token=abc123`
   - Non-hex characters: `?token=ZZZZ...` (64 chars but invalid)
   - Special characters: `?token=abc-def-...`

4. **Verify** all show same error state (caught before API call)

### Expected Result
✅ Invalid token formats caught immediately, no API call made

---

## Test Scenario 5: Missing Token

### Objective
Verify graceful handling when token parameter is missing.

### Steps
1. **Navigate** to: `https://dev.tickedify.com/reset-password` (no token parameter)
2. **Verify** page shows error state immediately:
   - Error message: "This password reset link is invalid. Please request a new password reset from the settings page."
   - Form is NOT displayed
   - "Go to Login" link is visible

### Expected Result
✅ Clear error when accessing page without token

---

## Test Scenario 6: Password Validation - Too Short

### Objective
Verify password length validation.

### Steps
1. **Navigate** with valid token
2. **Enter** password: `Short1!` (7 characters - one less than minimum)
3. **Tab** to confirm field (trigger blur validation)
4. **Verify** error message appears:
   - "Password must be at least 8 characters long"
   - Submit button is disabled or shows validation error

5. **Fix** password: `Short12!` (8 characters)
6. **Verify** error disappears
7. **Verify** submit button becomes enabled

### Expected Result
✅ Password length validated in real-time with clear error message

---

## Test Scenario 7: Password Validation - Missing Requirements

### Objective
Verify all password strength requirements are validated.

### Test Cases

**7a: No Uppercase Letter**
- Enter: `password123!` (no uppercase)
- Verify error: "Password must contain at least one uppercase letter (A-Z)"

**7b: No Digit**
- Enter: `Password!` (no digit)
- Verify error: "Password must contain at least one number (0-9)"

**7c: No Special Character**
- Enter: `Password123` (no special char)
- Verify error: "Password must contain at least one special character"

**7d: Valid Password**
- Enter: `Password123!`
- Verify: No errors, all requirements met

### Expected Result
✅ Each password requirement validated separately with specific error messages

---

## Test Scenario 8: Password Mismatch

### Objective
Verify passwords must match.

### Steps
1. **Navigate** with valid token
2. **Enter** password: `ValidP@ss123`
3. **Enter** confirm: `DifferentP@ss123`
4. **Tab** out of confirm field (trigger blur validation)
5. **Verify** error message appears:
   - "Passwords do not match"
   - Submit button disabled

6. **Fix** confirm field: `ValidP@ss123`
7. **Verify** error disappears
8. **Verify** submit button enabled

### Expected Result
✅ Password mismatch detected with clear error message

---

## Test Scenario 9: Network Error Handling

### Objective
Verify graceful handling of network failures.

### Steps
1. **Navigate** with valid token
2. **Enter** valid password: `ValidP@ss123`
3. **Confirm** password: `ValidP@ss123`
4. **Disconnect** internet / Enable network throttling
5. **Click** submit button
6. **Verify** error message appears:
   - "Something went wrong. Please try again or contact support at info@tickedify.com"
   - Form remains editable (not locked)
   - Submit button returns to normal state

7. **Reconnect** internet
8. **Click** submit again
9. **Verify** request succeeds (retry works)

### Expected Result
✅ Network errors handled gracefully with retry option

---

## Test Scenario 10: Password Visibility Toggle

### Objective
Verify show/hide password functionality.

### Steps
1. **Navigate** with valid token
2. **Enter** password: `MyP@ssw0rd123`
3. **Verify** password is obscured (bullets/asterisks)
4. **Click** eye icon / "Show password" button
5. **Verify** password is now visible as plain text
6. **Click** eye icon again
7. **Verify** password is obscured again

8. **Test** with confirm field:
9. **Enter** confirm password
10. **Verify** separate toggle works for confirm field

### Expected Result
✅ Password visibility can be toggled independently for each field

---

## Test Scenario 11: Responsive Design - Mobile

### Objective
Verify page works correctly on mobile devices.

### Steps
1. **Resize** browser to 375px width (iPhone size) or use device emulation
2. **Navigate** with valid token
3. **Verify** layout:
   - Form is full-width or appropriately sized
   - Input fields are large enough to tap (min 44px height)
   - Text is readable without zooming
   - Submit button is easily tappable

4. **Enter** password using on-screen keyboard
5. **Verify** input fields don't zoom unexpectedly
6. **Submit** form
7. **Verify** success message is readable on small screen

### Expected Result
✅ Page is fully functional and usable on mobile viewports

---

## Test Scenario 12: Keyboard Navigation

### Objective
Verify full keyboard accessibility.

### Steps
1. **Navigate** with valid token
2. **Press Tab** key repeatedly
3. **Verify** tab order:
   - First password field → Confirm field → Show/hide buttons → Submit button

4. **Use Tab** to focus first password field
5. **Type** password: `ValidP@ss123`
6. **Press Tab** to move to confirm field
7. **Type** same password
8. **Press Tab** to submit button
9. **Press Enter** to submit
10. **Verify** form submits successfully

11. **Test** with keyboard only (no mouse):
12. **Verify** all functionality accessible via keyboard

### Expected Result
✅ Complete keyboard navigation support, logical tab order

---

## Test Scenario 13: Browser Back Button After Success

### Objective
Verify form state persists after successful reset.

### Steps
1. **Complete** successful password reset (Scenario 1)
2. **Verify** success message is showing
3. **Click** browser back button
4. **Verify** one of these behaviors:
   - Success message still shows (state preserved)
   - OR: Token shows as "already used" error (expected)

5. **Verify** form does NOT allow resubmission

### Expected Result
✅ Form prevents resubmission even after browser navigation

---

## Test Scenario 14: Page Refresh During Editing

### Objective
Verify form state does not persist (security).

### Steps
1. **Navigate** with valid token
2. **Enter** password halfway: `MyP@ss`
3. **Refresh** page (F5 / Cmd+R)
4. **Verify** form resets:
   - Password fields are empty
   - No validation errors showing
   - Token is still extracted from URL

5. **Enter** complete valid password
6. **Submit** form
7. **Verify** submission succeeds (token still valid)

### Expected Result
✅ Form does not persist entered passwords (security), but token remains valid

---

## Automated Testing with Playwright

### Setup
Use the `tickedify-testing` agent to run automated browser tests:

```bash
# Navigate to staging environment
playwright.navigate("https://dev.tickedify.com/reset-password?token={TOKEN}")

# Verify page loaded
playwright.snapshot()

# Fill form
playwright.type("#new-password", "ValidP@ss123")
playwright.type("#confirm-password", "ValidP@ss123")

# Submit
playwright.click("#submit-button")

# Verify success
playwright.wait_for_text("Your password has been reset successfully!")
playwright.screenshot("success-state.png")
```

### Test Matrix
Run all 14 scenarios above via Playwright automation:
- Scenario 1-5: Token validation
- Scenario 6-8: Password validation
- Scenario 9: Network errors
- Scenario 10: Password visibility
- Scenario 11: Responsive (viewport resize)
- Scenario 12: Keyboard navigation
- Scenario 13-14: State persistence

---

## Success Criteria

### All Tests Must Pass
- ✅ Scenario 1: Happy path works end-to-end
- ✅ Scenario 2-5: All token states handled correctly
- ✅ Scenario 6-8: All password validations work
- ✅ Scenario 9: Network errors recoverable
- ✅ Scenario 10: Password visibility toggle works
- ✅ Scenario 11: Mobile responsive
- ✅ Scenario 12: Keyboard accessible
- ✅ Scenario 13-14: State management correct

### Performance Benchmarks
- Page load: < 2 seconds
- Validation feedback: < 100ms (instant)
- API response: < 1 second typical
- Mobile performance: Same as desktop

### Browser Compatibility
Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest - especially iOS)

---

## Troubleshooting

### Common Issues

**Issue**: Token invalid immediately after generation
**Solution**: Check token format (must be 64 hex chars), verify hashing matches between generation and validation

**Issue**: Form doesn't submit
**Solution**: Check browser console for JavaScript errors, verify API endpoint is reachable

**Issue**: Password validation not working
**Solution**: Verify regex patterns match server-side validatePasswordStrength() function

**Issue**: Styling looks broken
**Solution**: Verify CSS file loaded, check responsive breakpoints

---

## Next Steps After Testing

1. **Document** any bugs found in issue tracker
2. **Re-test** after fixes
3. **Sign off** on testing completion
4. **Prepare** for staging → production deployment (after bèta freeze lift)
5. **Update** changelog with feature description

---

## Notes

- All testing should be done on **dev.tickedify.com** staging environment
- Do NOT test on production during bèta freeze
- Use tickedify-testing agent for automated regression testing
- Keep test tokens for future regression tests
- Document any edge cases discovered during testing
