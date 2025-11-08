# Research: Password Reset Screen

## Overview
This document consolidates research findings for implementing a password reset page that integrates with Tickedify's existing password reset infrastructure.

## Technology Stack Research

### Decision: Vanilla JavaScript for Client-Side Validation
**Rationale**:
- Consistent with Tickedify's existing tech stack (no frameworks policy)
- Lightweight solution for single-page functionality
- No build process required
- Instant validation feedback without dependencies

**Alternatives Considered**:
- React/Vue component: Rejected - violates "no frameworks" constitution principle
- jQuery: Rejected - unnecessary dependency for simple form validation
- Backend-only validation: Rejected - poor UX (requires server roundtrip for every validation check)

### Decision: Standalone HTML Page (reset-password.html)
**Rationale**:
- Self-contained page accessed via direct link from email
- No authentication required (token-based access)
- Minimal complexity - simple form with validation
- Easy to maintain and test independently

**Alternatives Considered**:
- Modal within existing app.js: Rejected - requires authentication, not accessible from email link
- Server-side rendered page: Rejected - Tickedify uses static HTML + client-side JS pattern
- Integrated into settings page: Rejected - can't access without login, token would be wasted

## Existing Infrastructure Analysis

### API Endpoint: POST /api/account/password-reset/confirm
**Location**: server.js:4274
**Contract**:
```javascript
Request: {
  token: string,        // 64 hex characters
  new_password: string  // min 8 chars, validated server-side
}

Response (200): {
  message: "Password reset successful..."
}

Errors:
- 400: Invalid token format
- 400: Password too short
- 401: Invalid/expired/used token
```

**Validation Logic**:
- Token format: `/^[a-f0-9]{64}$/i`
- Password strength: Uses `validatePasswordStrength()` function
- Token expiry: 24 hours from creation
- Single-use enforcement: `used_at` timestamp check

### Password Validation Function: validatePasswordStrength()
**Location**: server.js:3363
**Rules**:
1. Minimum 8 characters
2. At least 1 uppercase letter (A-Z)
3. At least 1 digit (0-9)
4. At least 1 special character (non-alphanumeric)

**Return Format**:
```javascript
{
  valid: boolean,
  errors: string[]  // Dutch error messages
}
```

**Key Insight**: Client-side validation must replicate these exact rules for UX consistency. Backend validation remains authoritative for security.

## Password Visibility Toggle Best Practices

### Decision: Eye Icon Toggle Button
**Rationale**:
- Industry standard pattern (used by Google, Microsoft, Apple)
- Accessible via keyboard (Tab + Enter)
- Clear visual affordance
- No additional dependencies

**Implementation Pattern**:
```html
<input type="password" id="password">
<button type="button" aria-label="Show password">👁️</button>
```

**Accessibility Considerations**:
- aria-label for screen readers
- Toggle button separate from input (clearer focus states)
- Keyboard accessible (Tab navigation)

## Error Messaging Strategy

### Decision: Inline Validation + Toast Notifications
**Rationale**:
- Inline validation: Real-time feedback as user types (better UX)
- Toast notifications: Server-side errors (token expired, network issues)
- Follows Tickedify's existing patterns (ToastManager class in app.js)

**Error Message Mapping**:
| Server Error | User-Friendly Message |
|--------------|----------------------|
| `Invalid token format` | "This reset link is invalid. Please request a new password reset." |
| `Reset token has expired` | "This reset link has expired. Reset links are valid for 24 hours. Please request a new password reset." |
| `Reset token has already been used` | "This reset link has already been used. Please request a new password reset if needed." |
| `Password must be at least 8 characters` | "Password must be at least 8 characters long" |
| Generic 500 errors | "Something went wrong. Please try again or contact support." |

## Responsive Design Considerations

### Decision: Mobile-First CSS with Flexbox
**Rationale**:
- Tickedify is mobile-friendly (confirmed from CLAUDE.md)
- Form inputs must be easily tappable on mobile (min 44px touch targets)
- Single-column layout on mobile, centered card on desktop
- Consistent with existing Tickedify design patterns

**Viewport Breakpoints**:
- Mobile: < 768px (full-width form)
- Tablet/Desktop: ≥ 768px (centered 400px card)

## URL Parameter Handling

### Decision: URLSearchParams API
**Rationale**:
- Modern browser API (supported in all target browsers)
- Built-in URL parsing (no regex needed)
- Clean syntax: `new URLSearchParams(window.location.search).get('token')`

**Edge Cases Handled**:
- No token parameter → Show error state immediately
- Malformed token → Client validates format before API call
- Multiple token parameters → `.get()` returns first value

## Form Submission Best Practices

### Decision: Prevent Default + Async/Await Pattern
**Rationale**:
- Prevent page reload (better UX)
- Show loading state during API call
- Handle network errors gracefully
- Disable form during submission (prevent double-submit)

**Implementation Pattern**:
```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  submitButton.disabled = true;
  submitButton.textContent = 'Resetting...';

  try {
    const response = await fetch('/api/account/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password })
    });
    // Handle response...
  } catch (error) {
    // Show error message...
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Reset Password';
  }
});
```

## Visual Design Consistency

### Decision: Reuse Tickedify Color Scheme and Typography
**Analysis of existing styles** (from login/registration pages):
- Primary color: #007aff (blue)
- Success color: #28a745 (green)
- Error color: #dc3545 (red)
- Background: #f5f5f5 (light gray)
- Card background: #ffffff
- Font family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

**Key Elements to Reuse**:
- Card container with shadow
- Button styling (primary blue, hover states)
- Input field styling (border, focus states)
- Error message styling (red text, small font)

## Security Considerations

### CSRF Protection
**Analysis**: Not required for this endpoint
- Token-based authentication (no session cookies)
- Token is single-use and expires
- Endpoint is idempotent (multiple calls with same token = same error)

### XSS Prevention
**Measures**:
- No innerHTML usage (textContent only)
- No eval or Function constructor
- URL parameter sanitization (validated against hex regex)

### Rate Limiting
**Analysis**: Handled server-side
- Token expiry (24h) limits abuse window
- Single-use tokens prevent replay attacks
- Rate limiting on email sending (not on reset page itself)

## Testing Strategy

### Manual Testing Scenarios
1. **Happy Path**: Valid token → enter valid password → success
2. **Expired Token**: Use token >24h old → see expiry error
3. **Used Token**: Reset password → try same link again → see "already used" error
4. **Invalid Token**: Malformed token parameter → see invalid token error
5. **No Token**: Access /reset-password without token → see error state
6. **Password Validation**: Test each validation rule individually
7. **Password Mismatch**: Enter different passwords → see mismatch error
8. **Network Error**: Disconnect internet → submit → see network error
9. **Mobile**: Test on mobile viewport (responsive layout)
10. **Keyboard Navigation**: Tab through form → Enter to submit

### Browser Automation Testing (Playwright)
**Approach**: Use tickedify-testing agent
**Target**: dev.tickedify.com deployment
**Scenarios**: All 10 manual scenarios above
**Verification**: Screenshot + assertion on success/error messages

## Implementation Checklist

- [x] Research existing API contract
- [x] Research password validation rules
- [x] Research error handling patterns
- [x] Research responsive design requirements
- [x] Research visual design consistency
- [x] Research accessibility requirements
- [x] Research security considerations
- [x] Research testing approach

## Open Questions
None - all technical decisions resolved.

## Next Steps
Proceed to Phase 1: Design & Contracts
- Create data-model.md (client-side state)
- Create contracts/reset-password-api.yml
- Create quickstart.md (test scenarios)
