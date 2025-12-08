# Data Model: Session Expiration Handling

## Overview

This feature requires **no database schema changes**. Session management is already handled by:
- Server-side: `express-session` with PostgreSQL store (`user_sessions` table)
- Client-side: `AuthManager` class with `isAuthenticated` state

---

## Existing Entities (No Changes)

### Session (Server-Side)
**Table**: `user_sessions` (managed by `connect-pg-simple`)

| Field | Type | Description |
|-------|------|-------------|
| sid | VARCHAR | Session ID (primary key) |
| sess | JSON | Session data including userId |
| expire | TIMESTAMP | Expiration timestamp |

**Configuration** (server.js:1253-1259):
- `maxAge`: 24 hours
- `httpOnly`: true
- `sameSite`: 'lax'
- `secure`: auto-detect HTTPS

### AuthManager (Client-Side)
**Location**: `public/app.js:15757-16097`

| Property | Type | Description |
|----------|------|-------------|
| isAuthenticated | boolean | Current auth state |
| currentUser | object | User data from /api/auth/me |
| betaCheckInterval | number | Interval ID for periodic checks |

---

## New Client-Side State

### SessionMonitor (Extension to AuthManager)

| Property | Type | Description |
|----------|------|-------------|
| sessionCheckInterval | number | Interval ID for session checks (60 sec) |
| isRedirecting | boolean | Flag to prevent multiple redirects |
| lastSessionCheck | Date | Timestamp of last successful check |

**Rationale**: These properties extend the existing AuthManager class to track session monitoring state.

---

## State Transitions

### Session State Machine

```
[AUTHENTICATED]
    │
    ├─── (interval check OK) ──→ [AUTHENTICATED]
    │
    ├─── (visibility change + check OK) ──→ [AUTHENTICATED]
    │
    ├─── (interval check 401) ──→ [SESSION_EXPIRED] ──→ [REDIRECT_TO_LOGIN]
    │
    ├─── (API call returns 401) ──→ [SESSION_EXPIRED] ──→ [REDIRECT_TO_LOGIN]
    │
    └─── (visibility change + 401) ──→ [SESSION_EXPIRED] ──→ [REDIRECT_TO_LOGIN]

[REDIRECT_TO_LOGIN]
    │
    └─── (isRedirecting = true) ──→ Prevents duplicate redirects
```

---

## API Response Contracts

### GET /api/auth/me (Existing)

**Success Response** (200):
```json
{
  "user": {
    "id": "string",
    "naam": "string",
    "email": "string"
  },
  "hasAccess": true,
  "requiresUpgrade": false
}
```

**Session Expired Response** (401):
```json
{
  "error": "Not authenticated"
}
```

**Note**: No changes to this endpoint. Frontend will interpret 401 as session expired.

---

## Client-Side Event Flow

### Proactive Check Flow
```
1. Interval fires (every 60 sec)
2. Call GET /api/auth/me
3. If 200: Update lastSessionCheck, continue
4. If 401: Set isRedirecting=true, redirect to /login
```

### Visibility Change Flow
```
1. Tab becomes visible (visibilitychange event)
2. If time since lastSessionCheck > 5 seconds:
   3. Call GET /api/auth/me
   4. If 200: Update lastSessionCheck
   5. If 401: Set isRedirecting=true, redirect to /login
```

### Fallback (API Call) Flow
```
1. Any API call receives 401
2. If !isRedirecting:
   3. Set isRedirecting=true
   4. Redirect to /login
```

---

## Validation Rules

| Rule | Description |
|------|-------------|
| Interval minimum | 60 seconds (prevent server overload) |
| Redirect guard | Only one redirect per session expiration |
| Network error handling | 401 only, ignore network failures |
| Visibility debounce | 5 second minimum between visibility checks |

---

## No Database Migration Required

This feature operates entirely within the existing session infrastructure:
- ✅ `user_sessions` table already exists
- ✅ `requireLogin` middleware already returns 401
- ✅ `/api/auth/me` endpoint already exists
- ✅ `AuthManager` class already tracks auth state

**Conclusion**: Implementation is purely frontend JavaScript changes.
