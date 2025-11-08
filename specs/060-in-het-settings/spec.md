# Feature Specification: Password Reset Screen

**Feature Branch**: `060-in-het-settings`
**Created**: 2025-01-08
**Status**: Draft
**Input**: User description: "In het settings scherm is er de mogelijkheid ingebouwd om je paswoord te resetten. Dat stuurt een email. In die email staat er een link die naar een pagina verwijst om het paswoord te resetten.Dat scherm bestaat nog niet. Kijk na welke link je in de email zet en maak dan het scherm."

## Execution Flow (main)
```
1. Parse user description from Input
   � User needs password reset page that is linked from reset email
2. Extract key concepts from description
   � Actors: User requesting password reset
   � Actions: Open reset link from email, enter new password, submit
   � Data: Reset token (from URL), new password, confirmation password
   � Constraints: Token must be valid, not expired, passwords must match
3. Analyze existing implementation
   � Email link: https://dev.tickedify.com/reset-password?token={token}
   � API endpoint already exists: POST /api/account/password-reset/confirm
   � Endpoint expects: { token, new_password }
4. Fill User Scenarios & Testing section
   � Clear user flow identified: click link � enter password � success/error
5. Generate Functional Requirements
   � All requirements are testable and based on existing API contract
6. No new entities needed (uses existing password_reset_tokens table)
7. Review Checklist: No ambiguities, implementation-agnostic
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
A user who forgot their password clicks "Reset Password" in the settings screen. They receive an email with a reset link. When clicking this link, they are taken to a dedicated password reset page where they can enter a new password. After successfully setting their new password, they can log in with it.

### Acceptance Scenarios

1. **Given** a user has received a password reset email with a valid token
   **When** they click the reset link in the email
   **Then** they are taken to a password reset page that displays a form with two password fields

2. **Given** a user is on the password reset page
   **When** they enter a new password that meets all strength requirements (min 8 chars, uppercase, digit, special char) in both fields that match
   **And** they submit the form
   **Then** their password is updated and they see a success message with instructions to log in

3. **Given** a user is on the password reset page
   **When** they enter passwords that don't match
   **Then** they see an error message and cannot submit the form

4. **Given** a user is on the password reset page
   **When** they enter a password that doesn't meet strength requirements (e.g., too short, no uppercase, no digit, or no special character)
   **Then** they see specific error messages for each failing requirement and cannot submit the form

5. **Given** a user clicks a password reset link
   **When** the token in the link has expired (>24 hours old)
   **Then** they see an error message that the link has expired and instructions to request a new one

6. **Given** a user clicks a password reset link
   **When** the token has already been used
   **Then** they see an error message that the link has already been used

7. **Given** a user clicks a password reset link
   **When** the token is invalid or malformed
   **Then** they see an error message that the link is invalid

8. **Given** a user has successfully reset their password
   **When** they try to use the same reset link again
   **Then** they see an error that the link has already been used

### Edge Cases

- What happens when the user opens a reset link with no token parameter?
  � Show error message that the link is invalid

- What happens when the user navigates directly to /reset-password without a token?
  � Show error message that a valid reset link is required

- What happens when the network fails during password reset submission?
  � Show error message and allow retry

- What happens when the user closes the page and reopens the reset link?
  � As long as token is valid and unused, they can still reset their password

- What happens when user enters password in first field but not in confirmation?
  � Validation prevents submission until both fields are filled

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a dedicated page accessible at `/reset-password` that accepts a token query parameter

- **FR-002**: System MUST extract and validate the token from the URL query parameter on page load

- **FR-003**: System MUST display a password reset form with two input fields: "New Password" and "Confirm Password"

- **FR-004**: System MUST validate that the new password meets all strength requirements before allowing submission:
  - Minimum 8 characters length
  - At least 1 uppercase letter (A-Z)
  - At least 1 digit (0-9)
  - At least 1 special character (non-alphanumeric)

- **FR-005**: System MUST validate that both password fields match before allowing submission

- **FR-006**: System MUST show inline validation errors when password requirements are not met

- **FR-007**: System MUST disable the submit button while validation checks are failing

- **FR-008**: System MUST show loading state on submit button during API request ("Resetting..." or similar)

- **FR-009**: System MUST send the token and new password to the password reset API endpoint when form is submitted

- **FR-010**: System MUST display a success message when password reset is completed successfully

- **FR-011**: System MUST provide a clear link or button to navigate to login page after successful password reset

- **FR-012**: System MUST display appropriate error messages for different failure scenarios:
  - Token expired (with instruction to request new reset)
  - Token already used
  - Token invalid or malformed
  - Password too short (less than 8 characters)
  - Password missing uppercase letter
  - Password missing digit
  - Password missing special character
  - Passwords don't match
  - Network/server errors

- **FR-013**: System MUST show an error state when the page is accessed without a token parameter

- **FR-014**: System MUST prevent resubmission of the form after successful password reset

- **FR-015**: System MUST maintain consistent visual styling with the rest of the Tickedify application

- **FR-016**: Password input fields MUST obscure the entered characters (password type inputs)

- **FR-017**: System SHOULD provide an option to toggle password visibility (show/hide password)

### Key Entities

- **Reset Token**: A secure 64-character hexadecimal string passed via URL query parameter, validated against server records, with 24-hour expiration and single-use constraint

- **Password Reset Form**: User interface containing two password input fields, validation feedback, submit button, and success/error messaging

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Dependencies and Assumptions
- **Assumption**: Email service is already functional and sending reset links to `/reset-password?token={token}`
- **Assumption**: API endpoint `/api/account/password-reset/confirm` is already implemented and accepts `{ token, new_password }`
- **Assumption**: Token validation, expiration, and security are handled by the backend API
- **Dependency**: Existing password reset email functionality in settings screen
- **Dependency**: Existing `password_reset_tokens` database table with proper security constraints

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Additional Context

**Current State Analysis:**
- Email link points to: `https://dev.tickedify.com/reset-password?token={token}`
- API endpoint exists: `POST /api/account/password-reset/confirm`
- API validation: Token format (64 hex), token expiry (24h), single-use enforcement
- Password strength validation exists: `validatePasswordStrength()` function in server.js (line 3363)
  - Validates: min 8 chars, uppercase letter, digit, special character
  - Returns: `{ valid: boolean, errors: string[] }`
  - Used in registration flow - must use same validation in password reset
- Missing component: The `/reset-password` page itself does not exist yet

**User Experience Goals:**
- Minimal friction: Clear, focused form with only essential fields
- Trust and security: Clear messaging about token expiration and single-use links
- Error recovery: Helpful error messages with actionable next steps
- Visual consistency: Matches Tickedify design language
- Accessibility: Keyboard navigation, screen reader support, password visibility toggle

**Success Metrics:**
- User successfully resets password on first attempt
- Clear error messages prevent user confusion
- No support requests related to reset page usability
- Fast page load and responsive form submission
