# Data Model: Password Reset Screen

## Overview
This document describes the data model for the password reset page. Since this is a frontend-only feature using an existing backend API, the data model focuses on client-side state management and validation logic.

## Client-Side Entities

### PasswordResetForm
**Purpose**: Manages form state and validation for password reset page
**Lifecycle**: Created on page load, destroyed on successful submit or navigation away
**Storage**: In-memory JavaScript object (no persistence)

**Fields**:
| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `token` | string | `/^[a-f0-9]{64}$/i` | Reset token from URL parameter |
| `newPassword` | string | See Password Validation | User's desired new password |
| `confirmPassword` | string | Must match `newPassword` | Confirmation of new password |
| `validationErrors` | string[] | N/A | Array of current validation error messages |
| `isSubmitting` | boolean | N/A | True during API request |
| `submitAttempted` | boolean | N/A | True after first submit attempt (shows all errors) |

**State Transitions**:
```
Initial → Editing → Validating → Submitting → Success/Error → Final
```

1. **Initial**: Page loads, token extracted from URL
2. **Editing**: User typing in password fields
3. **Validating**: Real-time validation on blur/input
4. **Submitting**: API request in flight (form disabled)
5. **Success**: Password reset successful (show success message)
6. **Error**: API returned error (show error, allow retry)
7. **Final**: Success state locks form (no resubmission)

### Password Validation Rules
**Validation Object**:
```javascript
{
  minLength: {
    valid: password.length >= 8,
    message: "Password must be at least 8 characters long"
  },
  hasUppercase: {
    valid: /[A-Z]/.test(password),
    message: "Password must contain at least one uppercase letter"
  },
  hasDigit: {
    valid: /[0-9]/.test(password),
    message: "Password must contain at least one number"
  },
  hasSpecialChar: {
    valid: /[^A-Za-z0-9]/.test(password),
    message: "Password must contain at least one special character"
  },
  passwordsMatch: {
    valid: newPassword === confirmPassword && confirmPassword !== '',
    message: "Passwords do not match"
  }
}
```

**Validation Triggers**:
- `blur` event: Validate field that lost focus
- `input` event: Clear errors for field being typed in (if `submitAttempted` is true)
- `submit` event: Validate all fields

## Server-Side Entities (Existing)

### password_reset_tokens (Database Table)
**Location**: PostgreSQL database (Neon)
**Schema**:
```sql
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
);
```

**Constraints**:
- `token_hash` is SHA-256 hash of the actual token (security)
- `expires_at` is set to 24 hours from creation
- `used_at` is NULL until token is used (single-use enforcement)
- `user_id` links to the user whose password is being reset

**Relationships**:
- `user_id` → `users.id` (one-to-many: user can have multiple reset tokens)

**Important Notes**:
- This feature does NOT modify this table
- Table is queried/updated by existing API endpoint
- Token validation happens server-side only

### users (Database Table - Password Field)
**Location**: PostgreSQL database (Neon)
**Relevant Fields**:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- Bcrypt hash
  email VARCHAR(255) UNIQUE,
  -- ... other fields
);
```

**Password Update Flow**:
1. Client sends `{ token, new_password }` to API
2. API validates token (not expired, not used, correct format)
3. API hashes `new_password` using bcrypt
4. API updates `users.password_hash` for token's user_id
5. API marks token as used (`used_at = NOW()`)

**Important Notes**:
- This feature does NOT directly interact with users table
- Password hashing happens server-side (bcrypt with salt)
- Old password is NOT required (token proves identity)

## API Contract (Existing Endpoint)

### POST /api/account/password-reset/confirm
**Request**:
```typescript
{
  token: string,         // 64 hex characters from URL
  new_password: string   // User's new password (plain text)
}
```

**Success Response (200)**:
```typescript
{
  message: "Password reset successful. You can now log in with your new password."
}
```

**Error Responses**:

**400 - Invalid Token Format**:
```typescript
{
  error: "Invalid token format"
}
```

**400 - Password Too Short**:
```typescript
{
  error: "Password must be at least 8 characters"
}
```

**401 - Invalid or Expired Token**:
```typescript
{
  error: "Invalid or expired reset token"
}
```

**401 - Token Expired**:
```typescript
{
  error: "Reset token has expired. Please request a new one."
}
```

**401 - Token Already Used**:
```typescript
{
  error: "Reset token has already been used."
}
```

**500 - Server Error**:
```typescript
{
  error: "Internal server error"
}
```

## URL Parameters

### Query Parameters
**token** (required):
- Format: 64-character hexadecimal string
- Example: `?token=a1b2c3d4e5f6...` (64 chars total)
- Validation: `/^[a-f0-9]{64}$/i`
- Source: Email link generated by server

**Error Scenarios**:
- Missing token → Show "Invalid reset link" error state
- Malformed token → Show "Invalid reset link" error state (caught client-side)
- Valid format but invalid token → Server returns 401 (caught after submit)

## Client-Side State Management

### Page Load Flow
```
1. Extract token from URL
   ↓
2. Validate token format (regex)
   ↓ PASS                    ↓ FAIL
3. Show form              3. Show error state
   ↓                          (no retry, must get new link)
4. Initialize validation
   ↓
5. Wait for user input
```

### Form Submission Flow
```
1. Prevent default form submit
   ↓
2. Validate all fields client-side
   ↓ FAIL                    ↓ PASS
3. Show errors            3. Disable form
   (allow retry)             ↓
                          4. Show loading state
                             ↓
                          5. POST to API
                             ↓
                          6. Handle response
                             ↓ 200                ↓ 4xx/5xx
                          7. Success state     7. Show error
                             (lock form)          (allow retry)
```

### Success State
**Fields Shown**:
- Success message: "Your password has been reset successfully!"
- Login button: "Go to Login Page"

**State**:
- Form inputs: Hidden or disabled
- Submit button: Hidden
- Success message: Visible
- Login link: Visible

**Behavior**:
- Cannot resubmit form
- Cannot edit password fields
- Must navigate away to login page

### Error State (No Token)
**Fields Shown**:
- Error icon: ⚠️
- Error message: "This password reset link is invalid. Please request a new password reset from the settings page."
- Link: "Go to Login Page"

**State**:
- Form: Not rendered
- Only error message and login link visible

## Validation Error Messages

### Client-Side Validation Errors
| Rule | Error Message (English) |
|------|------------------------|
| Password too short | "Password must be at least 8 characters long" |
| No uppercase letter | "Password must contain at least one uppercase letter (A-Z)" |
| No digit | "Password must contain at least one number (0-9)" |
| No special character | "Password must contain at least one special character (!@#$%^&*...)" |
| Passwords don't match | "Passwords do not match" |
| Empty password field | "Password is required" |
| Empty confirm field | "Please confirm your password" |

### Server-Side Error Mappings
| Server Error | User-Friendly Message |
|--------------|----------------------|
| `Invalid token format` | "This reset link is invalid. Please request a new password reset." |
| `Invalid or expired reset token` | "This reset link is invalid or has expired. Please request a new password reset." |
| `Reset token has expired. Please request a new one.` | "This reset link has expired. Reset links are valid for 24 hours. Please request a new password reset." |
| `Reset token has already been used.` | "This reset link has already been used. Please request a new password reset if you need to change your password again." |
| `Password must be at least 8 characters` | "Password must be at least 8 characters long" |
| Any other 500 error | "Something went wrong. Please try again or contact support at info@tickedify.com" |

## Implementation Notes

### No Database Migrations Required
This feature uses existing database tables and API endpoints. No schema changes needed.

### No Backend Code Changes Required
The API endpoint `/api/account/password-reset/confirm` already exists and handles all validation and business logic. This feature only adds the frontend page.

### Client-Side Validation Must Match Server-Side
The JavaScript validation rules must exactly replicate the server-side `validatePasswordStrength()` function to ensure consistency. However, server-side validation remains authoritative for security.

### Password Visibility Toggle State
Not persisted - resets when user refreshes page or navigates away. This is intentional for security (passwords should be obscured by default).

## Testing Considerations

### State Transitions to Test
1. Initial → Editing (page load with valid token)
2. Initial → Error (page load with no token)
3. Initial → Error (page load with malformed token)
4. Editing → Validating (blur on password field)
5. Validating → Submitting (click submit with valid input)
6. Submitting → Success (API returns 200)
7. Submitting → Error (API returns 401 - expired token)
8. Submitting → Error (API returns 401 - used token)
9. Error → Editing (fix validation errors, resubmit)
10. Success → Final (cannot resubmit)

### Edge Cases
- Token in URL but empty string: Treat as missing token
- Token in URL twice: URLSearchParams.get() returns first value
- Network timeout during submit: Show generic error, allow retry
- Browser back button after success: Form should still be locked
- Refresh page after success: Token still used, will show "already used" error
