# Contract: Session Check Endpoint

## Endpoint: GET /api/auth/me

**Purpose**: Verify session validity and return current user info

---

## Request

```http
GET /api/auth/me HTTP/1.1
Host: tickedify.com
Cookie: tickedify.sid=<session_id>
```

**Headers Required**:
- Cookie with valid session ID

**Body**: None

---

## Response: Valid Session (200 OK)

```json
{
  "user": {
    "id": "uuid-string",
    "naam": "User Name",
    "email": "user@example.com"
  },
  "hasAccess": true,
  "requiresUpgrade": false,
  "expiryType": null
}
```

**Status Code**: 200

**Behavior**: Session is valid, user is authenticated

---

## Response: Expired Session (401 Unauthorized)

```json
{
  "error": "Not authenticated"
}
```

**Status Code**: 401

**Behavior**: Session has expired or is invalid

---

## Response: Upgrade Required (200 OK with flag)

```json
{
  "user": { ... },
  "requiresUpgrade": true,
  "expiryType": "beta" | "trial"
}
```

**Status Code**: 200

**Behavior**: User authenticated but subscription/beta period ended

---

## Client-Side Contract

### Expected Frontend Behavior

| Status Code | Response Body | Action |
|-------------|---------------|--------|
| 200 + hasAccess=true | User object | Continue normal operation |
| 200 + requiresUpgrade=true | User object + expiryType | Redirect to upgrade page |
| 401 | error: "Not authenticated" | Redirect to login page |
| Network error | N/A | Ignore, keep current state |

### Implementation Notes

```javascript
// Pseudocode contract
async function checkSession() {
    const response = await fetch('/api/auth/me');

    if (response.status === 401) {
        // CONTRACT: Must redirect to login
        window.location.href = '/login';
        return;
    }

    if (response.ok) {
        const data = await response.json();
        if (data.requiresUpgrade) {
            // CONTRACT: Must redirect to upgrade page
            const page = data.expiryType === 'trial'
                ? '/trial-expired.html'
                : '/beta-expired.html';
            window.location.href = page;
            return;
        }
        // CONTRACT: Update local auth state
        updateAuthState(data.user);
    }
    // Network errors: silently ignore, retry on next interval
}
```

---

## Test Scenarios

### Scenario 1: Valid Session
```
Given: User has valid session cookie
When: GET /api/auth/me is called
Then: Returns 200 with user object and hasAccess=true
```

### Scenario 2: Expired Session
```
Given: User's session has expired (24+ hours or manually invalidated)
When: GET /api/auth/me is called
Then: Returns 401 with { error: "Not authenticated" }
```

### Scenario 3: No Session Cookie
```
Given: Request has no session cookie
When: GET /api/auth/me is called
Then: Returns 401 with { error: "Not authenticated" }
```

### Scenario 4: Trial/Beta Expired
```
Given: User has valid session but subscription period ended
When: GET /api/auth/me is called
Then: Returns 200 with requiresUpgrade=true and expiryType
```

---

## Rate Limiting Considerations

- **Recommended interval**: 60 seconds minimum
- **Visibility change**: 5 second debounce
- **Expected load**: ~1 request per minute per active user

**Server-side impact**: Minimal - lightweight database lookup
