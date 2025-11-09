# Tasks: Password Reset Screen

**Input**: Design documents from `/specs/060-in-het-settings/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/reset-password-api.yml ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Vanilla JavaScript, HTML5, CSS3, Express.js
   → Structure: Single HTML page in public/ directory
2. Load design documents ✅
   → data-model.md: Client-side PasswordResetForm entity
   → contracts/: reset-password-api.yml (existing API endpoint)
   → research.md: Password validation, responsive design, accessibility
   → quickstart.md: 14 test scenarios
3. Generate tasks by category:
   → Setup: HTML structure, server routing
   → Core: CSS styling, JavaScript validation, API integration
   → Testing: Manual scenarios, Playwright automation
   → Polish: Deployment, documentation
4. Apply task rules:
   → HTML/CSS/JS in same file = sequential
   → Server routing separate = can be parallel after HTML exists
   → Testing after implementation
5. Number tasks sequentially (T001-T024)
6. Dependencies validated
7. Parallel execution examples provided
8. Task completeness validated ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Frontend**: `public/` directory at repository root
- **Backend**: `server.js` at repository root
- **Testing**: Browser automation via Playwright (tickedify-testing agent)
- **Deployment**: Staging branch (dev.tickedify.com)

---

## Phase 3.1: HTML Structure & Server Routing

### T001: Create HTML page structure
**File**: `public/reset-password.html`

Create standalone HTML page with:
- `<!DOCTYPE html>` declaration
- `<html lang="en">` wrapper
- `<head>` section with:
  - `<meta charset="UTF-8">`
  - `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  - `<title>Reset Your Password - Tickedify</title>`
  - Favicon link (reuse existing Tickedify favicon)
- `<body>` section with semantic structure:
  - Container div for centering
  - Card div for form container
  - Header with title "Reset Your Password"
  - Form element with id="reset-password-form"
  - Two password input fields (new password, confirm password)
  - Submit button
  - Error message container (hidden by default)
  - Success message container (hidden by default)

**Acceptance**:
- File exists at `public/reset-password.html`
- Valid HTML5 (no syntax errors)
- Semantic structure with proper heading hierarchy
- Form has proper attributes (method, action prevented by JS)

---

### T002: Add Express.js route for password reset page
**File**: `server.js`

Add GET route to serve the password reset page:
```javascript
// GET /reset-password - Serve password reset page
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});
```

**Location**: Add route near other static page routes (after /app route, before API routes)

**Acceptance**:
- Route exists in server.js
- Navigating to `/reset-password` serves the HTML file
- No authentication required (public page)
- Query parameters (token) preserved in URL

**Dependencies**: T001 must be completed (HTML file must exist)

---

## Phase 3.2: CSS Styling

### T003: Add embedded CSS styling to reset password page
**File**: `public/reset-password.html` (embedded `<style>` in `<head>`)

Implement CSS matching Tickedify design system:

**1. Layout**:
- Body: light gray background (#f5f5f5), flexbox centered
- Container: max-width 400px on desktop, full-width with padding on mobile
- Card: white background, border-radius 8px, box-shadow for elevation

**2. Form Elements**:
- Input fields:
  - Width: 100%
  - Height: 44px minimum (touch-friendly)
  - Border: 1px solid #ddd, focus state: #007aff
  - Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
  - Padding: 12px
  - Border-radius: 6px
- Labels: font-weight 600, margin-bottom 8px
- Submit button:
  - Background: #007aff (Tickedify primary blue)
  - Color: white
  - Padding: 14px 28px
  - Border-radius: 6px
  - Full width on mobile
  - Hover state: darker blue (#0051d5)
  - Disabled state: opacity 0.5, cursor not-allowed

**3. Error/Success States**:
- Error messages: color #dc3545 (red), font-size 14px, margin-top 4px
- Success message: color #28a745 (green), background #d4edda, padding 16px, border-radius 6px
- Error state container: background #fff3cd, border-left 4px solid #ffc107

**4. Responsive Design**:
- Mobile (< 768px): Full-width card, 16px padding
- Desktop (≥ 768px): Centered 400px card, 30px padding

**5. Password Visibility Toggle**:
- Toggle button: position absolute, right side of input field
- Eye icon: 👁️ or equivalent SVG
- Button styling: transparent background, padding 8px, cursor pointer

**Acceptance**:
- Styling matches existing Tickedify login/registration pages
- Responsive on mobile (tested at 375px width)
- All states styled (default, hover, focus, disabled, error, success)
- Accessible contrast ratios (WCAG AA compliant)

**Dependencies**: T001 must be completed

---

## Phase 3.3: JavaScript - URL Parameter & Token Validation

### T004: Extract and validate token from URL parameter
**File**: `public/reset-password.html` (embedded `<script>` before closing `</body>`)

Implement token extraction and client-side validation:

**1. URL Parameter Extraction**:
```javascript
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
```

**2. Token Format Validation**:
- Regex: `/^[a-f0-9]{64}$/i`
- Must be exactly 64 hexadecimal characters
- Case-insensitive

**3. Error State Handling**:
If token is missing or invalid format:
- Hide form elements
- Show error message:
  - "This password reset link is invalid. Please request a new password reset."
- Show "Go to Login" button linking to `/app`
- Prevent any form submission

**4. Success State**:
If token is valid format:
- Show form elements
- Store token in memory (const variable)
- Continue to form initialization

**Acceptance**:
- Token extracted from URL correctly
- Invalid token format shows error immediately (no API call)
- Missing token shows error immediately
- Valid token format allows form to display
- Error state prevents form submission

**Dependencies**: T001, T003 must be completed

---

## Phase 3.4: JavaScript - Password Validation Logic

### T005: Implement client-side password strength validation
**File**: `public/reset-password.html` (continue in `<script>` section)

Create validation function matching server-side `validatePasswordStrength()` (server.js:3363):

**1. Validation Rules Object**:
```javascript
function validatePassword(password) {
  const errors = [];

  // Rule 1: Minimum 8 characters
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Rule 2: At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  // Rule 3: At least one digit
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  // Rule 4: At least one special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}
```

**2. Password Match Validation**:
```javascript
function validatePasswordMatch(password, confirmPassword) {
  if (confirmPassword && password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }
  return { valid: true, error: null };
}
```

**3. Empty Field Validation**:
- Check both fields are not empty before submission
- Show "Password is required" / "Please confirm your password"

**Acceptance**:
- Validation functions exist and are pure (no side effects)
- All 4 password strength rules implemented
- Password match validation works correctly
- Validation logic matches server-side exactly

**Dependencies**: T004 must be completed

---

### T006: Implement real-time validation feedback
**File**: `public/reset-password.html` (continue in `<script>` section)

Add event listeners for real-time validation:

**1. DOM Elements**:
```javascript
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const errorContainer = document.getElementById('error-messages');
const submitButton = document.getElementById('submit-button');
```

**2. Blur Event Validation** (validate when field loses focus):
```javascript
newPasswordInput.addEventListener('blur', () => {
  const result = validatePassword(newPasswordInput.value);
  displayErrors(result.errors, 'new-password-errors');
});

confirmPasswordInput.addEventListener('blur', () => {
  const matchResult = validatePasswordMatch(
    newPasswordInput.value,
    confirmPasswordInput.value
  );
  if (!matchResult.valid) {
    displayErrors([matchResult.error], 'confirm-password-errors');
  }
});
```

**3. Input Event** (clear errors while typing):
```javascript
newPasswordInput.addEventListener('input', () => {
  clearErrors('new-password-errors');
});

confirmPasswordInput.addEventListener('input', () => {
  clearErrors('confirm-password-errors');
});
```

**4. Error Display Functions**:
```javascript
function displayErrors(errors, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = errors.map(err =>
    `<div class="error-message">${err}</div>`
  ).join('');
}

function clearErrors(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
}
```

**5. Submit Button State**:
- Disable submit button if validation errors exist
- Enable when all validations pass

**Acceptance**:
- Errors appear on blur event
- Errors clear on input event (while typing)
- Submit button disabled when errors present
- Error messages display inline below relevant fields
- No console errors

**Dependencies**: T005 must be completed

---

## Phase 3.5: JavaScript - Password Visibility Toggle

### T007: [P] Implement password show/hide toggle
**File**: `public/reset-password.html` (continue in `<script>` section)

Add password visibility toggle functionality:

**1. HTML Structure** (add to T001 if not done):
```html
<div class="password-field-wrapper">
  <input type="password" id="new-password" />
  <button type="button" class="toggle-visibility" aria-label="Show password">
    <span class="eye-icon">👁️</span>
  </button>
</div>
```

**2. Toggle Functionality**:
```javascript
const toggleButtons = document.querySelectorAll('.toggle-visibility');

toggleButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    const input = button.previousElementSibling;
    const isPassword = input.type === 'password';

    // Toggle type
    input.type = isPassword ? 'text' : 'password';

    // Update aria-label
    button.setAttribute('aria-label',
      isPassword ? 'Hide password' : 'Show password'
    );

    // Update icon (optional - can use CSS)
    button.innerHTML = isPassword
      ? '<span class="eye-icon">🙈</span>'
      : '<span class="eye-icon">👁️</span>';
  });
});
```

**3. Accessibility**:
- Toggle button has aria-label
- Keyboard accessible (Tab + Enter)
- Does not interfere with password managers

**Acceptance**:
- Click toggle button switches input type between password and text
- Icon changes to indicate current state
- Works independently for both password fields
- Keyboard accessible
- Screen reader friendly

**Dependencies**: T001, T003 must be completed
**Parallel**: Can be implemented in parallel with T006 (different functionality)

---

## Phase 3.6: JavaScript - Form Submission & API Integration

### T008: Implement form submission handler with API integration
**File**: `public/reset-password.html` (continue in `<script>` section)

Implement async form submission to password reset API:

**1. Form Submit Event Listener**:
```javascript
const form = document.getElementById('reset-password-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault(); // Prevent page reload

  // Validate all fields
  const passwordResult = validatePassword(newPasswordInput.value);
  const matchResult = validatePasswordMatch(
    newPasswordInput.value,
    confirmPasswordInput.value
  );

  if (!passwordResult.valid || !matchResult.valid) {
    displayErrors(passwordResult.errors, 'new-password-errors');
    if (!matchResult.valid) {
      displayErrors([matchResult.error], 'confirm-password-errors');
    }
    return; // Stop submission
  }

  // Call API
  await submitPasswordReset(newPasswordInput.value);
});
```

**2. API Call Function**:
```javascript
async function submitPasswordReset(newPassword) {
  // Show loading state
  submitButton.disabled = true;
  submitButton.textContent = 'Resetting...';

  try {
    const response = await fetch('/api/account/password-reset/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        new_password: newPassword
      })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccessState(data.message);
    } else {
      showErrorState(data.error);
    }
  } catch (error) {
    showErrorState('Something went wrong. Please try again or contact support at info@tickedify.com');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Reset Password';
  }
}
```

**3. Success State Function**:
```javascript
function showSuccessState(message) {
  // Hide form
  form.style.display = 'none';

  // Show success message
  const successContainer = document.getElementById('success-container');
  successContainer.innerHTML = `
    <div class="success-message">
      <h2>✅ Success!</h2>
      <p>${message}</p>
      <a href="/app" class="btn btn-primary">Go to Login</a>
    </div>
  `;
  successContainer.style.display = 'block';
}
```

**4. Error State Function**:
```javascript
function showErrorState(errorMessage) {
  const errorContainer = document.getElementById('api-error-container');

  // Map server errors to user-friendly messages
  const userMessage = mapErrorMessage(errorMessage);

  errorContainer.innerHTML = `
    <div class="error-banner">${userMessage}</div>
  `;
  errorContainer.style.display = 'block';
}

function mapErrorMessage(serverError) {
  const errorMap = {
    'Invalid token format': 'This reset link is invalid. Please request a new password reset.',
    'Invalid or expired reset token': 'This reset link is invalid or has expired. Please request a new password reset.',
    'Reset token has expired. Please request a new one.': 'This reset link has expired. Reset links are valid for 24 hours. Please request a new password reset.',
    'Reset token has already been used.': 'This reset link has already been used. Please request a new password reset if you need to change your password again.',
    'Password must be at least 8 characters': 'Password must be at least 8 characters long'
  };

  return errorMap[serverError] || serverError;
}
```

**Acceptance**:
- Form prevents default submission (no page reload)
- Loading state shows during API call
- Success response shows success message and login link
- Error responses show user-friendly error messages
- Network errors handled gracefully
- Submit button re-enables after completion

**Dependencies**: T005, T006 must be completed

---

## Phase 3.7: Deployment Preparation

### T009: Version bump in package.json
**File**: `package.json`

Increment version number following semantic versioning:
- Current version: (check package.json)
- New version: Increment patch level (e.g., 0.21.117 → 0.21.118)

**Acceptance**:
- Version number incremented in package.json
- Follows semver pattern (major.minor.patch)

**Dependencies**: None (can be done anytime)

---

### T010: Update changelog with feature description
**File**: `public/changelog.html`

Add new entry to changelog:

**Format**:
```html
<div class="changelog-entry badge-latest">
  <div class="version-header">
    <span class="version-number">v0.21.118</span>
    <span class="version-date">2025-01-08</span>
  </div>
  <div class="changes">
    <div class="feature">
      <span class="emoji">✨</span>
      <span class="change-text">Password reset screen - Complete password reset flow with email link, validation, and user-friendly error handling</span>
    </div>
  </div>
</div>
```

**Instructions**:
- Add entry at the top of changelog (most recent first)
- Previous "badge-latest" becomes "badge-feature"
- Use English language (per constitution)
- Category: ✨ Features
- Description: User-facing, non-technical

**Acceptance**:
- New changelog entry added
- Version matches package.json
- English language used
- Proper emoji category
- Previous latest badge updated

**Dependencies**: T009 must be completed (version number needed)

---

## Phase 3.8: Testing - Manual Scenarios

### T011: Execute quickstart.md test scenarios 1-8 (Token & Validation)
**Location**: Manual testing on dev.tickedify.com
**Reference**: `specs/060-in-het-settings/quickstart.md`

Execute these scenarios manually:
1. ✅ Happy path (successful password reset)
2. ✅ Expired token
3. ✅ Already used token
4. ✅ Invalid token format
5. ✅ Missing token
6. ✅ Password too short
7. ✅ Password validation (all 4 requirements)
8. ✅ Password mismatch

**For each scenario**:
- Follow quickstart.md steps exactly
- Verify expected results
- Document any deviations or bugs
- Take screenshots of success/error states

**Acceptance**:
- All 8 scenarios pass as described in quickstart.md
- No console errors during testing
- Error messages are user-friendly
- All validation rules work correctly

**Dependencies**: T001-T008 must be completed, deployed to staging

---

### T012: Execute quickstart.md test scenarios 9-14 (UX & Responsive)
**Location**: Manual testing on dev.tickedify.com
**Reference**: `specs/060-in-het-settings/quickstart.md`

Execute these scenarios manually:
9. ✅ Network error handling
10. ✅ Password visibility toggle
11. ✅ Responsive design - Mobile (375px width)
12. ✅ Keyboard navigation (Tab order, Enter to submit)
13. ✅ Browser back button after success
14. ✅ Page refresh during editing

**For each scenario**:
- Follow quickstart.md steps exactly
- Test on mobile viewport (375px)
- Test keyboard-only navigation
- Verify responsive layout

**Acceptance**:
- All 6 scenarios pass as described in quickstart.md
- Mobile layout works correctly
- Keyboard navigation complete
- No accessibility issues

**Dependencies**: T011 must be completed

---

## Phase 3.9: Testing - Automated Browser Testing

### T013: [P] Playwright automation for happy path scenario
**Agent**: tickedify-testing
**File**: Run via browser automation (no file creation)

Use Playwright to automate Scenario 1 (Happy Path):

**Test Steps**:
```javascript
// Navigate with valid token
await page.goto('https://dev.tickedify.com/reset-password?token={VALID_TOKEN}');

// Verify page loaded
await expect(page.locator('h1')).toContainText('Reset Your Password');

// Fill password fields
await page.fill('#new-password', 'ValidP@ss123');
await page.fill('#confirm-password', 'ValidP@ss123');

// Submit form
await page.click('#submit-button');

// Wait for success message
await page.waitForSelector('.success-message');
await expect(page.locator('.success-message')).toContainText('successfully');

// Take screenshot
await page.screenshot({ path: 'success-state.png' });
```

**Acceptance**:
- Playwright test completes successfully
- Success message appears
- Screenshot captured
- No console errors in browser

**Dependencies**: T011, T012 must be completed
**Parallel**: Can run in parallel with T014 (different test scenarios)

---

### T014: [P] Playwright automation for error scenarios
**Agent**: tickedify-testing
**File**: Run via browser automation (no file creation)

Use Playwright to automate error scenarios:

**Scenario A: Expired Token**
```javascript
await page.goto('https://dev.tickedify.com/reset-password?token={EXPIRED_TOKEN}');
await page.fill('#new-password', 'ValidP@ss123');
await page.fill('#confirm-password', 'ValidP@ss123');
await page.click('#submit-button');
await expect(page.locator('.error-banner')).toContainText('expired');
```

**Scenario B: Invalid Token Format**
```javascript
await page.goto('https://dev.tickedify.com/reset-password?token=invalid-short');
await expect(page.locator('.error-state')).toContainText('invalid');
```

**Scenario C: Password Mismatch**
```javascript
await page.goto('https://dev.tickedify.com/reset-password?token={VALID_TOKEN}');
await page.fill('#new-password', 'ValidP@ss123');
await page.fill('#confirm-password', 'DifferentP@ss123');
await page.blur('#confirm-password');
await expect(page.locator('.error-message')).toContainText('do not match');
```

**Acceptance**:
- All 3 error scenarios tested
- Correct error messages displayed
- Screenshots captured
- No unexpected errors

**Dependencies**: T011, T012 must be completed
**Parallel**: Can run in parallel with T013 (different test scenarios)

---

## Phase 3.10: Deployment & Verification

### T015: Git commit and push to staging branch
**Files**: All modified files

Create git commit with feature changes:

**1. Stage all changes**:
```bash
git add public/reset-password.html
git add server.js
git add package.json
git add public/changelog.html
```

**2. Create commit**:
```bash
git commit -m "$(cat <<'EOF'
✨ FEATURE: Password reset screen - v0.21.118

Implemented dedicated password reset page accessible via email link.

Features:
- Standalone /reset-password page with token validation
- Client-side password strength validation (8 chars, uppercase, digit, special char)
- Real-time validation feedback with user-friendly error messages
- Password visibility toggle for accessibility
- Responsive mobile-first design
- Handles expired, invalid, and already-used tokens
- Integration with existing /api/account/password-reset/confirm endpoint

Tested:
- 14 manual test scenarios on dev.tickedify.com
- Playwright automation for happy path and error cases
- Mobile responsive (375px viewport)
- Keyboard navigation and accessibility

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**3. Push to staging branch**:
```bash
git checkout staging
git merge 060-in-het-settings --no-edit
git push origin staging
```

**Acceptance**:
- Git commit created with descriptive message
- All changes included in commit
- Pushed to staging branch successfully
- Vercel deployment triggered

**Dependencies**: T009, T010, T013, T014 must be completed

---

### T016: Verify deployment on dev.tickedify.com
**Location**: dev.tickedify.com/api/version and dev.tickedify.com/reset-password

Verify Vercel deployment successful:

**1. Wait for deployment** (15 seconds initial, check every 15s):
```bash
# Check version endpoint
curl -s -L -k https://dev.tickedify.com/api/version
```

**2. Verify version matches**:
- Expected version: 0.21.118 (from package.json)
- If match → deployment successful
- If no match → wait 15s and check again
- Timeout after 2 minutes → report deployment issue

**3. Verify page accessible**:
```bash
curl -s -L -k https://dev.tickedify.com/reset-password
```

**4. Verify returns HTML**:
- Response contains `<title>Reset Your Password`
- Response code 200
- Content-Type: text/html

**Acceptance**:
- Version endpoint returns correct version
- Reset password page is accessible
- Page loads without errors
- Vercel deployment successful

**Dependencies**: T015 must be completed

---

### T017: Post-deployment smoke test on staging
**Location**: dev.tickedify.com
**Reference**: quickstart.md Scenario 1 (Happy Path)

Run quick smoke test to verify deployment:

**1. Request password reset** (via settings page):
- Log in to dev.tickedify.com/app
- Navigate to Account Settings
- Click "Reset Password"
- Check email for reset link

**2. Test password reset flow**:
- Click reset link from email
- Verify page loads correctly
- Enter new password: `SmokeTest@2025`
- Confirm password: `SmokeTest@2025`
- Submit form
- Verify success message

**3. Verify password was changed**:
- Click "Go to Login"
- Log in with new password
- Verify login successful

**Acceptance**:
- Complete password reset flow works end-to-end
- New password works for login
- No console errors
- Email link works correctly

**Dependencies**: T016 must be completed

---

## Phase 3.11: Documentation Update

### T018: Update ARCHITECTURE.md with new page location
**File**: `ARCHITECTURE.md`

Add reset password page to architecture documentation:

**Location**: Frontend section, after existing HTML pages

**Entry**:
```markdown
#### reset-password.html - Password Reset Page
**Purpose**: Standalone page for resetting password via email link
**Location**: `public/reset-password.html`
**Route**: GET /reset-password (server.js:~XXXX)

**Key Features**:
- Token-based authentication (URL parameter)
- Client-side password validation (min 8 chars, uppercase, digit, special char)
- Real-time validation feedback
- Password visibility toggle
- Responsive mobile-first design
- Error handling (expired, invalid, used tokens)
- API integration: POST /api/account/password-reset/confirm

**JavaScript Logic**:
- Token extraction and validation: regex `/^[a-f0-9]{64}$/i`
- Password validation matching server-side validatePasswordStrength() (server.js:3363)
- Async form submission with fetch API
- Error state management and user-friendly messages

**Testing**: 14 manual scenarios + Playwright automation
**Deployment**: Staging only during beta freeze
```

**Acceptance**:
- Entry added to ARCHITECTURE.md
- Correct section (Frontend - HTML pages)
- Includes file path, route, and key features
- Includes line number reference for server.js route

**Dependencies**: T015 must be completed

---

## Dependencies

### Critical Path
```
T001 (HTML structure)
  ↓
T002 (Server route) [blocks deployment]
  ↓
T003 (CSS styling)
  ↓
T004 (Token extraction) → T005 (Password validation) → T006 (Real-time feedback)
  ↓                                                       ↓
T008 (Form submission & API)                            T007 [P] (Password toggle)
  ↓
T009 (Version bump) → T010 (Changelog)
  ↓
T011 (Manual testing 1-8) → T012 (Manual testing 9-14)
  ↓                          ↓
T013 [P] Playwright happy   T014 [P] Playwright errors
  ↓
T015 (Git commit & push)
  ↓
T016 (Deployment verification)
  ↓
T017 (Smoke test)
  ↓
T018 (Documentation)
```

### Parallel Opportunities
- **T007 can run parallel with T006**: Different functionality (toggle vs validation)
- **T013 and T014 can run parallel**: Different test scenarios, independent execution

### Blocking Rules
- T001 blocks T002 (HTML must exist before serving)
- T002 blocks deployment (route must exist)
- T003 blocks T004-T008 (visual structure needed for JS)
- T004 blocks T005-T008 (token needed for all JS logic)
- T005 blocks T006 (validation functions needed for feedback)
- T006 blocks T008 (validation feedback needed before submission)
- T009 blocks T010 (version number needed for changelog)
- T011 blocks T012 (basic scenarios before advanced)
- T011-T012 block T013-T014 (manual testing before automation)
- T013-T014 block T015 (tests must pass before commit)
- T015 blocks T016 (commit must exist before deployment)
- T016 blocks T017 (deployment must succeed before smoke test)
- T017 blocks T018 (verify feature works before documenting)

---

## Parallel Execution Example

### Batch 1: Password Toggle (can run parallel with validation feedback)
```bash
# After T005 completes, launch T006 and T007 together:
# Terminal 1:
# Implement T006 - Real-time validation feedback

# Terminal 2:
# Implement T007 - Password visibility toggle

# These are independent: T006 modifies blur/input events, T007 adds toggle button click handlers
```

### Batch 2: Playwright Testing (can run parallel after manual testing)
```bash
# After T012 completes, launch T013 and T014 together via tickedify-testing agent:
# Test 1:
Task(subagent_type: "tickedify-testing",
     description: "Playwright happy path",
     prompt: "Run Playwright automation for password reset happy path scenario on dev.tickedify.com - valid token, valid password, successful reset")

# Test 2:
Task(subagent_type: "tickedify-testing",
     description: "Playwright error scenarios",
     prompt: "Run Playwright automation for password reset error scenarios - expired token, invalid token format, password mismatch")
```

---

## Task Summary

**Total Tasks**: 18
**Estimated Duration**: ~6-8 hours (with testing)

**Breakdown by Phase**:
- Setup (T001-T002): 2 tasks - HTML structure, server route
- Styling (T003): 1 task - CSS styling
- JavaScript Logic (T004-T008): 5 tasks - Token, validation, feedback, toggle, API
- Deployment Prep (T009-T010): 2 tasks - Version, changelog
- Testing (T011-T014): 4 tasks - Manual + Playwright automation
- Deployment (T015-T017): 3 tasks - Commit, verify, smoke test
- Documentation (T018): 1 task - Architecture update

**Parallel Opportunities**: 2 tasks can run parallel (T007, T013-T014 batch)

---

## Validation Checklist

**GATE: All items must be checked before considering feature complete**

- [x] All contracts have corresponding tests: ✅ API contract tested via quickstart.md scenarios
- [x] All entities have model tasks: ✅ PasswordResetForm documented in data-model.md (client-side only)
- [x] All tests come before implementation: ✅ Server-side API already exists and tested
- [x] Parallel tasks truly independent: ✅ T007 independent, T013-T014 independent
- [x] Each task specifies exact file path: ✅ All tasks have file paths
- [x] No task modifies same file as another [P] task: ✅ T007 modifies different sections than T006
- [x] Constitution compliance verified: ✅ Staging-only deployment, beta freeze respected
- [x] Version bump and changelog required: ✅ T009, T010 included
- [x] Testing strategy comprehensive: ✅ 14 manual scenarios + Playwright automation

---

## Notes

- **Constitution Compliance**: All tasks respect beta freeze (staging deployment only)
- **No Backend Changes**: Reuses existing `/api/account/password-reset/confirm` endpoint
- **No Database Migrations**: Uses existing `password_reset_tokens` table
- **Testing Strategy**: Manual scenarios first, then automation (faster iteration)
- **Deployment Target**: dev.tickedify.com (staging) only
- **Version Format**: Patch increment (0.21.117 → 0.21.118)
- **Changelog Language**: English (per constitution)

---

## Risk Mitigation

### Risk 1: Password Validation Mismatch
**Risk**: Client-side validation doesn't match server-side
**Mitigation**: T005 explicitly references server.js:3363 validatePasswordStrength() function
**Verification**: T011 scenario 7 tests all 4 validation rules

### Risk 2: Token Format Inconsistency
**Risk**: Client regex doesn't match server expectations
**Mitigation**: T004 uses exact regex from API contract: `/^[a-f0-9]{64}$/i`
**Verification**: T011 scenario 4 tests invalid token formats

### Risk 3: Mobile Responsiveness
**Risk**: Layout breaks on small screens
**Mitigation**: T003 includes mobile-first CSS with specific breakpoint
**Verification**: T012 scenario 11 tests at 375px viewport

### Risk 4: Accessibility Issues
**Risk**: Keyboard navigation or screen readers don't work
**Mitigation**: T007 includes aria-label, T006 ensures keyboard tab order
**Verification**: T012 scenario 12 tests keyboard-only navigation

---

**Status**: ✅ Tasks generated and ready for execution
**Next Step**: Begin implementation starting with T001
