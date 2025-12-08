# Research: Session Expiration Handling

## Existing Architecture Analysis

### Server-Side Session Configuration
**Location**: `server.js:1244-1295`

- **Session Store**: PostgreSQL via `connect-pg-simple` (table: `user_sessions`)
- **Session Duration**: 24 hours (`maxAge: 24 * 60 * 60 * 1000`)
- **Cookie Settings**: httpOnly, sameSite: 'lax', secure: auto-detect
- **Session Name**: `tickedify.sid`

### Authentication Middleware
**Location**: `server.js:370-376`

```javascript
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}
```

**Decision**: Server already returns HTTP 401 with `{ error: 'Not authenticated' }` for expired sessions.

### Frontend Authentication System
**Location**: `public/app.js:15757-16097`

**Key Components**:
1. `AuthManager` class manages authentication state
2. `checkAuthStatus()` - Calls `/api/auth/me` to verify session (line 16019)
3. `startBetaCheckInterval()` - Periodic check every **1 hour** (line 16114-16127)
4. `isAuthenticated` - Boolean flag for auth state

**Decision**: Existing `checkAuthStatus()` can be reused for proactive session checks. Interval needs to change from 60 minutes to 60 seconds.

### Current Error Handling Pattern
**Location**: `public/app.js` (multiple locations)

Current pattern in API calls:
```javascript
if (!response.ok) {
    // Generic error handling
    toast.error('Error completing task. Please try again.');
}
```

**Problem Identified**: No differentiation between 401 (session expired) and other errors.

**Rationale**: This is why users see generic "Error" messages instead of session-specific feedback.

---

## Design Decisions

### Decision 1: Proactive Session Check Interval
- **Chosen**: 60 seconds
- **Rationale**: Balances between immediate detection and server load
- **Alternatives Considered**:
  - 30 seconds: Too frequent, unnecessary server load
  - 120 seconds: Too long, user might start action during gap
  - 5 minutes: Too long for good UX

### Decision 2: Visibility Focus Event Check
- **Chosen**: Use `document.visibilitychange` event
- **Rationale**: Browser tab going inactive/active is perfect trigger for immediate session check
- **Alternatives Considered**:
  - `window.onfocus`: Less reliable, doesn't work for tabs
  - `mousemove`: Too frequent, not relevant to session state

### Decision 3: Centralized Error Interception
- **Chosen**: Create wrapper function for all fetch calls
- **Rationale**: Single point for 401 detection, DRY principle
- **Alternatives Considered**:
  - Modify each fetch call individually: Too error-prone, hundreds of calls
  - Service Worker: Over-engineered for this use case

### Decision 4: Redirect vs Message
- **Chosen**: Automatic redirect to login page (no toast message)
- **Rationale**: Per user request - proactive redirect is cleaner than error messages
- **Alternatives Considered**:
  - Toast + button: Extra click required
  - Modal confirmation: Unnecessary friction

### Decision 5: Session Check Endpoint
- **Chosen**: Use existing `/api/auth/me` endpoint
- **Rationale**: Already exists, lightweight, returns auth status
- **Alternatives Considered**:
  - New `/api/session/check` endpoint: Unnecessary duplication
  - HEAD request: Less information

---

## Technical Findings

### Browser Visibility API
```javascript
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Tab became active - check session immediately
    }
});
```

### Multiple Tab Handling
Each tab maintains its own interval. When one tab detects session expiry:
- That tab redirects to login
- Other tabs will detect on their next interval check or visibility change
- No cross-tab communication needed (simpler architecture)

### Network Error vs Session Error Detection
```javascript
// 401 = Session expired
// 0 or TypeError = Network error
// 5xx = Server error
```

**Decision**: Only handle 401 as session expiration. Other errors keep current behavior.

---

## Integration Points

### Files to Modify
1. `public/app.js` - AuthManager class, fetch wrapper
2. `public/style.css` - No changes needed (redirect, no UI)

### Existing Code to Leverage
- `AuthManager.checkAuthStatus()` - Reuse for proactive checks
- `window.location.href = '/login'` - Standard redirect pattern
- `requireLogin` middleware - Already returns 401

### Testing Approach
- API-first testing via direct endpoint calls
- Simulate 401 response to verify frontend handling
- Tab visibility testing via Playwright

---

## Risk Analysis

| Risk | Mitigation |
|------|------------|
| Too many session checks overload server | 60 second interval is reasonable; `/api/auth/me` is lightweight |
| User loses unsaved work on redirect | Proactive check means redirect happens before user starts action |
| Race condition with multiple 401s | Use flag to prevent multiple simultaneous redirects |
| Network errors trigger false session expired | Only react to HTTP 401, not network failures |

---

## Conclusion

The implementation approach is straightforward:
1. **Proactive**: Reduce check interval from 60 min to 60 sec, add visibility change listener
2. **Reactive fallback**: Add 401 detection to existing fetch calls
3. **Clean redirect**: No toast messages, direct redirect to login page

No database changes required. No new API endpoints needed. Minimal code changes with maximum impact.
