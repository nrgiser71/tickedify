# Contract: Fetch Wrapper for 401 Detection

## Purpose

Centralized fetch wrapper that intercepts all API responses and detects session expiration (401 status).

---

## Function Signature

```javascript
async function fetchWithSessionCheck(url, options = {})
```

**Parameters**:
- `url` (string): API endpoint URL
- `options` (object): Standard fetch options (method, headers, body, etc.)

**Returns**: `Promise<Response>` - Standard fetch Response object

---

## Contract Behavior

### Normal Response (Non-401)
```
Given: API call returns any status except 401
When: fetchWithSessionCheck is called
Then: Returns the Response object unchanged
```

### Session Expired (401)
```
Given: API call returns 401 status
When: fetchWithSessionCheck is called
Then:
  1. Checks if redirect is already in progress
  2. If not redirecting: Sets redirect flag, redirects to login
  3. Returns the Response object (for caller cleanup)
```

### Network Error
```
Given: Network request fails (offline, DNS error, etc.)
When: fetchWithSessionCheck is called
Then: Throws the network error (unchanged behavior)
```

---

## Implementation Contract

```javascript
// Contract pseudocode
let isSessionExpiredRedirecting = false;

async function fetchWithSessionCheck(url, options = {}) {
    const response = await fetch(url, options);

    // CONTRACT: Detect 401 and trigger redirect
    if (response.status === 401 && !isSessionExpiredRedirecting) {
        isSessionExpiredRedirecting = true;

        // CONTRACT: Redirect to login page
        window.location.href = '/login';
    }

    // CONTRACT: Always return response for caller
    return response;
}
```

---

## Integration Points

### Files Using Fetch (Partial List)
These files make API calls that need session-expired handling:

| File | Approximate Fetch Calls |
|------|------------------------|
| public/app.js | 100+ |
| public/admin.js | 20+ |
| public/admin2.js | 20+ |

### Integration Strategy

**Option A**: Replace `fetch` calls with `fetchWithSessionCheck` (many changes)
**Option B**: Override global `window.fetch` (single change, affects all)
**Option C**: Add response interceptor in AuthManager (cleanest)

**Chosen**: Option C - Add interceptor pattern in AuthManager

---

## Global Interceptor Contract

```javascript
// In AuthManager class
setupGlobalFetchInterceptor() {
    const originalFetch = window.fetch;
    const authManager = this;

    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);

        // CONTRACT: Only intercept 401 for API calls
        if (response.status === 401 &&
            args[0].startsWith('/api/') &&
            !authManager.isRedirecting) {

            authManager.handleSessionExpired();
        }

        return response;
    };
}
```

---

## Edge Cases

### Multiple Simultaneous 401s
```
Given: Multiple API calls return 401 at the same time
When: Each response is processed
Then: Only one redirect is triggered (isRedirecting flag)
```

### 401 During Redirect
```
Given: Redirect is already in progress
When: Another 401 is received
Then: Ignored (no action taken)
```

### Non-API 401
```
Given: 401 response from non-API URL (e.g., static file)
When: Response is processed
Then: Ignored (only /api/* URLs trigger redirect)
```

---

## Test Scenarios

### Test 1: Single 401 Triggers Redirect
```javascript
// Setup: Mock fetch to return 401
// Call: fetchWithSessionCheck('/api/lijst/acties')
// Assert: window.location.href === '/login'
```

### Test 2: Multiple 401s Single Redirect
```javascript
// Setup: Mock fetch to return 401
// Call: Three concurrent fetchWithSessionCheck calls
// Assert: Only one redirect triggered
```

### Test 3: Non-401 Passes Through
```javascript
// Setup: Mock fetch to return 500
// Call: fetchWithSessionCheck('/api/taak/123')
// Assert: No redirect, response returned
```

### Test 4: Network Error Throws
```javascript
// Setup: Mock fetch to throw TypeError
// Call: fetchWithSessionCheck('/api/taak/123')
// Assert: TypeError is thrown (not caught)
```

---

## Rollback Safety

If issues arise, the interceptor can be disabled by:
1. Setting `authManager.interceptorEnabled = false`
2. Or removing `setupGlobalFetchInterceptor()` call

Original fetch behavior remains available via stored reference.
