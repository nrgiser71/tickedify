# API Contract: Session Check Endpoint

**Endpoint**: `GET /api/admin/session`
**Purpose**: Verify if admin has valid active session
**Authentication**: Session cookie required

## Request

### HTTP Method
```
GET
```

### Headers
```
Cookie: tickedify.sid=<session-id>
```

### Query Parameters
None

### Request Body
None

## Response

### Success Response (200 OK)

**Scenario**: Valid session exists

```json
{
  "authenticated": true,
  "isAdmin": true,
  "loginTime": "2025-10-12T14:30:00.000Z",
  "sessionAge": 3600000
}
```

**Fields**:
- `authenticated` (boolean): Always `true` for 200 response
- `isAdmin` (boolean): Confirms admin privileges
- `loginTime` (string, ISO 8601): When admin logged in
- `sessionAge` (number): Milliseconds since login

### Error Response (401 Unauthorized)

**Scenario**: No session or expired session

```json
{
  "authenticated": false,
  "message": "No active admin session"
}
```

**Fields**:
- `authenticated` (boolean): Always `false` for 401 response
- `message` (string): Human-readable reason

### Error Response (500 Internal Server Error)

**Scenario**: Server error during session validation

```json
{
  "error": "Session validation failed",
  "details": "Error message here"
}
```

## Business Rules

1. **Session Validity**: Session is valid if:
   - Session cookie exists
   - Session data exists in database
   - `req.session.isAdmin === true`
   - Session not expired (within 24 hours of creation)

2. **Session Expiry**: Sessions expire after 24 hours from `loginTime`

3. **Security**:
   - Endpoint only accessible with valid session cookie
   - No session data sent in response (only metadata)
   - httpOnly cookie prevents XSS attacks

## Usage Examples

### JavaScript Fetch Example
```javascript
async function checkSession() {
  try {
    const response = await fetch('/api/admin/session', {
      credentials: 'include'  // Required for cookies
    });

    if (response.ok) {
      const session = await response.json();
      console.log('Valid session:', session.loginTime);
      return true;
    } else {
      console.log('No valid session');
      return false;
    }
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
}
```

### cURL Example
```bash
curl -s -L -k \
  -H "Cookie: tickedify.sid=s%3A..." \
  https://tickedify.com/api/admin/session
```

## Integration Points

### Client-Side (admin.js)
- Called in `AdminDashboard` constructor
- Determines whether to show login form or dashboard
- Result cached in `this.isAuthenticated` property

### Server-Side (server.js)
- Uses `req.session.isAdmin` to validate
- Calculates `sessionAge` from `req.session.adminLoginTime`
- Returns appropriate HTTP status code

## Test Scenarios

1. **Valid Session**: Return 200 with session metadata
2. **No Session Cookie**: Return 401 with authentication false
3. **Expired Session**: Return 401 with authentication false
4. **Invalid Session Data**: Return 401 with authentication false
5. **Server Error**: Return 500 with error details

## Changelog

- **2025-10-12**: Initial API contract definition
