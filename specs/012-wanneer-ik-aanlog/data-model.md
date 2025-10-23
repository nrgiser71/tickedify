# Data Model: Admin Login Persistence

**Feature**: Admin Login Persistence
**Branch**: `012-wanneer-ik-aanlog`
**Date**: 2025-10-12

## Overview

This feature leverages existing session infrastructure without requiring new database entities. All session data is stored in the existing `session` table managed by `connect-pg-simple`.

## Existing Entities

### Session (Database Table)

**Table**: `session`
**Managed By**: connect-pg-simple (express-session store)
**Purpose**: Store server-side session data

**Schema** (managed by connect-pg-simple):
```sql
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
```

**Fields**:
- `sid` (VARCHAR, PRIMARY KEY): Session identifier (from cookie)
- `sess` (JSON): Session data object
- `expire` (TIMESTAMP): When session expires

**Session Data Structure** (`sess` JSON field):
```json
{
  "cookie": {
    "originalMaxAge": 86400000,
    "expires": "2025-10-13T14:30:00.000Z",
    "secure": false,
    "httpOnly": true,
    "path": "/",
    "sameSite": "lax"
  },
  "isAdmin": true,
  "adminAuthenticated": true,
  "adminLoginTime": "2025-10-12T14:30:00.000Z"
}
```

**Custom Session Fields** (stored in `sess.JSON`):
- `isAdmin` (boolean): Admin privilege flag
- `adminAuthenticated` (boolean): Secondary authentication flag
- `adminLoginTime` (string, ISO 8601): Timestamp of successful login

**Indexes**:
```sql
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
```

**Session Lifecycle**:
1. **Creation**: POST `/api/admin/auth` with valid password
2. **Storage**: `connect-pg-simple` writes to PostgreSQL
3. **Validation**: GET `/api/admin/session` reads from database
4. **Expiry**: Automatic cleanup by express-session after `maxAge`
5. **Destruction**: POST `/api/admin/logout` or automatic expiry

---

## Client-Side State

### AdminDashboard Class

**File**: `public/admin.js`
**Purpose**: Manage admin dashboard UI state

**Properties**:
```javascript
class AdminDashboard {
  isAuthenticated: boolean  // Current auth state
  data: object             // Dashboard data cache
  refreshInterval: number   // Auto-refresh timer ID
}
```

**State Transitions**:
```
[Page Load]
  ↓
[Check Session] → /api/admin/session
  ↓                ↓
  ↓          (200 OK)
  ↓                ↓
  ↓        isAuthenticated = true
  ↓                ↓
  ↓        [Show Dashboard]
  ↓
(401 Unauthorized)
  ↓
isAuthenticated = false
  ↓
[Show Login Form]
```

**Session Check Flow**:
1. Constructor calls `checkExistingSession()`
2. Fetch GET `/api/admin/session` with `credentials: 'include'`
3. If 200: Set `isAuthenticated = true`, show dashboard
4. If 401: Set `isAuthenticated = false`, show login form
5. If error: Log error, show login form (safe default)

---

## Session Cookie

**Name**: `tickedify.sid`
**Type**: Persistent cookie (survives browser restart)
**Storage**: Browser cookie storage

**Cookie Attributes**:
```javascript
{
  secure: 'auto',          // HTTPS in production
  httpOnly: true,          // No JavaScript access
  maxAge: 86400000,        // 24 hours in milliseconds
  sameSite: 'lax',         // CSRF protection
  path: '/',               // Available site-wide
  domain: undefined        // Current domain only
}
```

**Security Properties**:
- **httpOnly**: Prevents XSS attacks (no `document.cookie` access)
- **secure**: HTTPS-only transmission in production
- **sameSite**: Protects against CSRF attacks
- **maxAge**: Limited lifetime reduces exposure window

**Cookie Lifecycle**:
1. **Set**: Server sends `Set-Cookie` header after successful login
2. **Sent**: Browser automatically includes cookie in requests to tickedify.com
3. **Validated**: Server reads cookie, looks up session in database
4. **Expired**: Browser deletes cookie after 24 hours
5. **Destroyed**: Server sends `Set-Cookie` with empty value on logout

---

## Data Flow Diagram

### Login Flow (Existing)
```
[User] → [Enter Password]
  ↓
[POST /api/admin/auth]
  ↓
[Server: Validate Password]
  ↓
[Server: Create Session in DB]
  ↓
[Server: Send Set-Cookie Header]
  ↓
[Browser: Store Cookie]
  ↓
[Client: isAuthenticated = true]
  ↓
[Show Dashboard]
```

### Session Check Flow (New)
```
[Page Load] → [AdminDashboard Constructor]
  ↓
[GET /api/admin/session]
  ↓
[Browser: Include Cookie Automatically]
  ↓
[Server: Read Session from DB]
  ↓
[Server: Validate isAdmin && loginTime]
  ↓           ↓
(Valid)   (Invalid/Expired)
  ↓           ↓
200 OK      401 Unauthorized
  ↓           ↓
[Client:    [Client:
 Auth=true   Auth=false
 Show Dash]  Show Login]
```

### Logout Flow (Existing)
```
[User] → [Click Logout]
  ↓
[POST /api/admin/logout]
  ↓
[Server: Destroy Session in DB]
  ↓
[Server: Clear Cookie]
  ↓
[Client: isAuthenticated = false]
  ↓
[Show Login Form]
```

---

## Configuration Changes

### Server-Side (server.js)

**Current Configuration**:
```javascript
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}
```

**Required Change**:
```javascript
cookie: {
  maxAge: 24 * 60 * 60 * 1000  // 24 hours
}
```

**Rationale**: Requirement FR-006 specifies 24-hour session expiry

---

## Validation Rules

### Session Validity Criteria
1. ✅ Session cookie exists in browser
2. ✅ Session ID exists in database `session` table
3. ✅ Session not expired (`expire` > current time)
4. ✅ `sess.isAdmin === true`
5. ✅ `sess.adminLoginTime` exists
6. ✅ Current time - adminLoginTime < 24 hours (maxAge)

### Session Invalidation Triggers
1. ❌ Cookie expires (24 hours after creation)
2. ❌ Explicit logout (POST /api/admin/logout)
3. ❌ Session cleanup (expired sessions removed from DB)
4. ❌ Browser cookies cleared by user
5. ❌ Invalid session data (corrupted JSON)

---

## Performance Considerations

### Database Queries
- **Session Check**: 1 SELECT query to `session` table (indexed by `sid`)
- **Query Time**: <10ms (indexed primary key lookup)
- **Frequency**: Once per page load + once per logout

### Network Overhead
- **Session Check Request**: <500 bytes
- **Session Check Response**: <200 bytes
- **Total Overhead**: <1KB per page load

### Caching Strategy
- No client-side caching (always verify with server)
- Server-side: Session data cached in memory by express-session
- Database: PostgreSQL query cache handles repeated lookups

---

## Backward Compatibility

### Existing Sessions
- **7-day sessions**: Will continue to work until natural expiry
- **New logins**: Will use 24-hour maxAge
- **No migration**: Gradual rollover as users re-login

### API Compatibility
- **POST /api/admin/auth**: No changes
- **POST /api/admin/logout**: No changes
- **GET /api/admin/session**: May already exist (verify implementation)

---

## Error Handling

### Client-Side Errors
1. **Network Failure**: Show login form (safe default)
2. **500 Server Error**: Log error, show login form
3. **Malformed Response**: Log error, show login form

### Server-Side Errors
1. **Database Connection Failure**: Return 500 with error details
2. **Session Store Error**: Return 500 with error details
3. **Missing Session**: Return 401 (not an error, expected case)

---

## Security Considerations

### Threat Model
- **XSS**: httpOnly cookie prevents JavaScript access
- **CSRF**: sameSite cookie + server-side validation
- **Session Hijacking**: HTTPS + secure flag in production
- **Brute Force**: Not applicable (existing session, no password check)

### Attack Scenarios
1. **Cookie Theft**: Requires XSS (mitigated by httpOnly)
2. **MITM**: Requires HTTP downgrade (mitigated by secure flag)
3. **CSRF**: Requires cross-site request (mitigated by sameSite)
4. **Session Fixation**: Not applicable (session created server-side)

---

## Summary

This feature requires **no new database entities**. It leverages:
- ✅ Existing `session` table (connect-pg-simple)
- ✅ Existing session cookie infrastructure
- ✅ Existing authentication endpoints

Changes required:
1. Update `cookie.maxAge` from 7 days to 24 hours
2. Add client-side session check on page load
3. Verify/implement GET `/api/admin/session` endpoint
