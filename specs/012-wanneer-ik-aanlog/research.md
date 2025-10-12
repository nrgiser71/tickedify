# Research: Admin Login Persistence

**Feature**: Admin Login Persistence
**Branch**: `012-wanneer-ik-aanlog`
**Date**: 2025-10-12

## Research Questions

### 1. Existing Session Infrastructure

**Question**: What session management is already implemented?

**Findings**:
- ✅ **express-session** installed and configured (server.js:4, 10)
- ✅ **PostgreSQL session store** using `connect-pg-simple` (server.js:10)
- ✅ **Session configuration** at server.js:445-465:
  - `secret`: Uses `SESSION_SECRET` env variable
  - `resave: false` - Don't save unchanged sessions
  - `saveUninitialized: false` - Don't create sessions until something stored
  - `cookie.secure: 'auto'` - Auto-detect HTTPS
  - `cookie.httpOnly: true` - Prevent XSS access
  - `cookie.maxAge: 7 * 24 * 60 * 60 * 1000` - **7 days** (needs change to 24 hours)
  - `cookie.sameSite: 'lax'` - CSRF protection
  - `name: 'tickedify.sid'` - Custom session cookie name

**Decision**:
Leverage existing express-session infrastructure. Only need to:
1. Update cookie.maxAge from 7 days to 24 hours (requirement)
2. Add client-side session check on page load

---

### 2. Server-Side Auth Endpoints

**Question**: What authentication endpoints exist?

**Findings**:
- ✅ **POST `/api/admin/auth`** (server.js:7947-7974)
  - Validates password against `ADMIN_PASSWORD` env variable
  - Sets `req.session.isAdmin = true`
  - Sets `req.session.adminAuthenticated = true`
  - Sets `req.session.adminLoginTime` timestamp
  - Returns success with loginTime

- ✅ **GET `/api/admin/session`** (exists after line 7977)
  - Need to verify implementation
  - Should validate `req.session.isAdmin`
  - Should return session status and loginTime

- ✅ **POST `/api/admin/logout`** (referenced in admin.js:67)
  - Client-side calls this endpoint
  - Need to verify it destroys session properly

**Decision**:
Server-side endpoints are complete. No changes needed to `/api/admin/auth`. Need to verify `/api/admin/session` returns proper validation response.

---

### 3. Client-Side Authentication Flow

**Question**: How does the current client-side authentication work?

**Findings**:
- **AdminDashboard class** in public/admin.js
  - Constructor sets `this.isAuthenticated = false` (line 4)
  - **PROBLEM**: No session check on page load
  - Login form handler `handleLogin()` (lines 30-62):
    - Calls POST `/api/admin/auth` with password
    - On success: sets `isAuthenticated = true`, shows dashboard
    - Uses `credentials: 'include'` for cookie handling (line 123)
  - Logout handler (lines 64-87):
    - Calls POST `/api/admin/logout`
    - Resets `isAuthenticated = false`, shows login form

**Current User Flow**:
1. User opens admin.html
2. Login form always shows (isAuthenticated = false)
3. User enters password
4. Server creates session, sets cookie
5. Dashboard shows
6. **PROBLEM**: User refreshes page → back to step 2 (isAuthenticated reset)

**Desired User Flow**:
1. User opens admin.html
2. **NEW**: Check existing session via GET `/api/admin/session`
3. If session valid: Show dashboard (skip login)
4. If session invalid/expired: Show login form
5. User enters password (if needed)
6. Server validates/creates session
7. Dashboard shows
8. User refreshes page → back to step 2 (session persists)

**Decision**:
Add `checkExistingSession()` method to AdminDashboard constructor to verify session before showing login form.

---

### 4. Session Cookie Persistence

**Question**: Will session cookies persist across browser restarts?

**Findings**:
- Current `maxAge: 7 days` means cookie expires in 7 days
- Cookies with `maxAge` are **persistent cookies** (survive browser restart)
- Cookies without `maxAge` are **session cookies** (deleted on browser close)

**Requirement**: 24-hour persistence across browser restarts

**Decision**:
Change `cookie.maxAge` from `7 * 24 * 60 * 60 * 1000` to `24 * 60 * 60 * 1000` (24 hours).

---

### 5. Session Expiry Handling

**Question**: How should expired sessions be handled?

**Findings**:
- express-session automatically deletes expired sessions
- `/api/admin/session` should return 401 if no valid session
- Client should handle 401 gracefully

**Scenarios**:
1. **Active page, session expires**: Currently no handling
2. **Page refresh after expiry**: Session check fails, show login
3. **API call with expired session**: Should return 401

**Decision**:
1. Session check on page load handles scenario 2
2. For scenario 1: Add periodic session validation (optional enhancement)
3. For scenario 3: Existing API calls already use `credentials: 'include'`

---

### 6. Security Considerations

**Question**: What security measures are needed?

**Findings**:
- ✅ **httpOnly: true** - Prevents JavaScript access to session cookie (XSS protection)
- ✅ **secure: 'auto'** - HTTPS-only in production
- ✅ **sameSite: 'lax'** - CSRF protection
- ✅ **PostgreSQL session store** - Server-side session storage (more secure than client-side)
- ✅ **Password validation** - Server-side password check before session creation

**Additional Considerations**:
- Session data stored in PostgreSQL `session` table
- Only `isAdmin`, `adminAuthenticated`, and `adminLoginTime` stored in session
- No sensitive data in session (password never stored)

**Decision**:
Existing security measures are sufficient. No additional changes needed.

---

## Research Summary

### What Works
1. ✅ Express-session infrastructure fully configured
2. ✅ Server-side auth endpoints exist and work
3. ✅ Session cookies are secure and persistent
4. ✅ Login/logout flow works correctly

### What Needs Fixing
1. ❌ Client-side doesn't check for existing session on page load
2. ❌ Cookie maxAge is 7 days, should be 24 hours

### Implementation Approach
1. **Server-side change**: Update cookie.maxAge to 24 hours
2. **Client-side change**: Add session check in AdminDashboard constructor
3. **API contract**: Verify `/api/admin/session` returns proper format

### Complexity Assessment
- **Low complexity**: Leverages existing infrastructure
- **Minimal changes**: 2 files (server.js, admin.js)
- **No database changes**: Session table already exists
- **No breaking changes**: Extends existing functionality

---

## Next Steps
1. Phase 1: Define API contract for `/api/admin/session` endpoint
2. Phase 1: Create data model for session validation
3. Phase 1: Write integration tests for session persistence
4. Phase 2: Generate implementation tasks
