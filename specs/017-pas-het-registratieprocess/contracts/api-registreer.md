# API Contract: POST /api/registreer (Met Wachtwoord Validatie)

**Feature**: 017-pas-het-registratieprocess
**Date**: 2025-10-18
**Endpoint**: `POST /api/registreer`
**Status**: MODIFIED (nieuwe validatie regels)

## Contract Overview

Dit contract beschrijft de uitgebreide wachtwoord validatie voor de bestaande `/api/registreer` endpoint. De endpoint accepteert nu alleen wachtwoorden die voldoen aan sterkte eisen.

## Request Specification

### HTTP Method
`POST`

### URL
`/api/registreer`

### Headers
```http
Content-Type: application/json
```

### Request Body Schema

```json
{
  "email": "string (required, email format)",
  "wachtwoord": "string (required, min 8 chars, must meet strength requirements)",
  "naam": "string (required, min 1 char)"
}
```

### Request Body Constraints

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email format, unique in database |
| `wachtwoord` | string | Yes | **NEW**: Min 8 chars, 1 uppercase, 1 digit, 1 special char |
| `naam` | string | Yes | Min 1 character |

### Wachtwoord Strength Requirements (NEW)

**Alle volgende regels MOETEN voldaan zijn**:

1. **Minimum lengte**: `wachtwoord.length >= 8`
2. **Hoofdletter**: `wachtwoord` bevat minimaal 1 karakter A-Z
3. **Cijfer**: `wachtwoord` bevat minimaal 1 karakter 0-9
4. **Speciaal teken**: `wachtwoord` bevat minimaal 1 karakter dat niet A-Z, a-z, of 0-9 is

**Regex Validatie**:
```javascript
const minLength = password.length >= 8;
const hasUppercase = /[A-Z]/.test(password);
const hasDigit = /[0-9]/.test(password);
const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

const isValid = minLength && hasUppercase && hasDigit && hasSpecialChar;
```

### Request Examples

#### Valid Request #1: Strong Password
```json
{
  "email": "jan@example.com",
  "wachtwoord": "Welkom2025!",
  "naam": "Jan Buskens"
}
```
**Validation**: ✅ 11 chars, has 'W', has '2', has '!'

#### Valid Request #2: Minimum Requirements
```json
{
  "email": "test@example.com",
  "wachtwoord": "Test@123",
  "naam": "Test User"
}
```
**Validation**: ✅ 8 chars, has 'T', has '1', has '@'

#### Invalid Request #1: No Special Character
```json
{
  "email": "weak@example.com",
  "wachtwoord": "Welkom2025",
  "naam": "Weak User"
}
```
**Expected Response**: 400 Bad Request (missing special char)

#### Invalid Request #2: Too Short
```json
{
  "email": "short@example.com",
  "wachtwoord": "Test!1",
  "naam": "Short User"
}
```
**Expected Response**: 400 Bad Request (only 6 chars)

#### Invalid Request #3: Multiple Violations
```json
{
  "email": "multi@example.com",
  "wachtwoord": "test",
  "naam": "Multi User"
}
```
**Expected Response**: 400 Bad Request (4 chars, no uppercase, no digit, no special)

## Response Specification

### Success Response (HTTP 200)

**Scenario**: Wachtwoord voldoet aan alle eisen, email is uniek

```json
{
  "success": true,
  "message": "Account succesvol aangemaakt"
}
```

**Side Effects**:
- User record created in `users` table
- Password hashed with bcrypt before storage
- Session may be created (existing behavior)

### Error Response: Password Validation Failed (HTTP 400)

**Scenario**: Wachtwoord voldoet niet aan één of meerdere sterkte eisen

```json
{
  "success": false,
  "error": "Wachtwoord voldoet niet aan de beveiligingseisen",
  "passwordErrors": [
    "Wachtwoord moet minimaal 1 hoofdletter bevatten",
    "Wachtwoord moet minimaal 1 speciaal teken bevatten"
  ]
}
```

**Response Fields**:
- `success` (boolean): Always `false`
- `error` (string): Algemene foutmelding
- `passwordErrors` (array): **NEW** - Specifieke validatie fouten

**Possible `passwordErrors` Values**:
```javascript
[
  "Wachtwoord moet minimaal 8 tekens bevatten",        // Length violation
  "Wachtwoord moet minimaal 1 hoofdletter bevatten",   // Uppercase violation
  "Wachtwoord moet minimaal 1 cijfer bevatten",        // Digit violation
  "Wachtwoord moet minimaal 1 speciaal teken bevatten" // Special char violation
]
```

### Error Response: Email Already Exists (HTTP 400)

**Scenario**: Wachtwoord is geldig, maar email bestaat al

```json
{
  "success": false,
  "error": "Dit e-mailadres is al geregistreerd"
}
```

**Note**: Geen `passwordErrors` field (password was valid)

### Error Response: Missing Fields (HTTP 400)

**Scenario**: Verplichte velden ontbreken

```json
{
  "success": false,
  "error": "Email, wachtwoord en naam zijn verplicht"
}
```

### Error Response: Invalid Email Format (HTTP 400)

**Scenario**: Email formaat is ongeldig

```json
{
  "success": false,
  "error": "Ongeldig e-mailadres"
}
```

### Error Response: Server Error (HTTP 500)

**Scenario**: Database error, bcrypt error, etc.

```json
{
  "success": false,
  "error": "Er is een fout opgetreden. Probeer het later opnieuw."
}
```

## Validation Flow

### Server-Side Validation Order

```
1. Check required fields (email, wachtwoord, naam)
   ↓ FAIL → 400 "Email, wachtwoord en naam zijn verplicht"

2. Validate email format
   ↓ FAIL → 400 "Ongeldig e-mailadres"

3. Validate password strength (NEW STEP)
   ↓ FAIL → 400 with passwordErrors array

4. Check email uniqueness (database query)
   ↓ FAIL → 400 "Dit e-mailadres is al geregistreerd"

5. Hash password with bcrypt
   ↓ FAIL → 500 "Server error"

6. Insert user into database
   ↓ FAIL → 500 "Server error"

7. Return success
   → 200 "Account succesvol aangemaakt"
```

**IMPORTANT**: Password strength validation MUST happen BEFORE email uniqueness check to prevent timing attacks revealing existing emails.

## Edge Cases

### Edge Case #1: Empty Password
**Input**: `"wachtwoord": ""`
**Expected**: 400 with passwordErrors: `["Wachtwoord moet minimaal 8 tekens bevatten"]`

### Edge Case #2: Whitespace-Only Password
**Input**: `"wachtwoord": "        "` (8 spaces)
**Expected**: 400 with passwordErrors (spaces count as special chars but no uppercase/digit)

### Edge Case #3: Unicode Characters
**Input**: `"wachtwoord": "Tëst@123"` (ë is uppercase-ish)
**Expected**: 400 (ë not recognized as uppercase A-Z by regex)
**Note**: Keep validation simple - only ASCII A-Z for uppercase

### Edge Case #4: Very Long Password
**Input**: `"wachtwoord": "VeryLongPassword123!" + "x".repeat(200)`
**Expected**: 200 (accept long passwords, bcrypt truncates safely)

### Edge Case #5: Special Characters List
**Valid Special Chars**: `!@#$%^&*()_+-=[]{}|;:,.<>?/~` ` (backtick) and space
**Input**: `"wachtwoord": "Test!123"` → ✅ Valid
**Input**: `"wachtwoord": "Test#123"` → ✅ Valid
**Input**: `"wachtwoord": "Test 123"` → ✅ Valid (space is special char)
**Input**: `"wachtwoord": "Test-123"` → ✅ Valid (hyphen is special char)

### Edge Case #6: Null/Undefined Password
**Input**: `{"email": "...", "naam": ".."}` (wachtwoord missing)
**Expected**: 400 "Email, wachtwoord en naam zijn verplicht"

## Security Considerations

### Password Transit Security
- ✅ HTTPS enforced (Vercel default) - password encrypted in transit
- ✅ Password in POST body (not in URL parameters)
- ❌ Password NEVER logged server-side
- ❌ Password NEVER stored in plain text

### Password Storage Security
- ✅ bcrypt hashing with salt (existing implementation)
- ✅ Validation happens BEFORE hashing
- ✅ Hash stored in `users.wachtwoord_hash` column

### Information Disclosure
- ✅ Generic error for server errors (don't reveal internals)
- ✅ Specific password errors OK (helps user correct input)
- ⚠️ Email existence check timing (consider rate limiting)

### Rate Limiting
**Recommendation**: Add rate limiting to prevent:
- Brute force password attempts
- Email enumeration via registration attempts

**Future Enhancement**:
```javascript
// Rate limit: 5 registration attempts per IP per hour
app.use('/api/registreer', rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5
}));
```

## Backwards Compatibility

### Impact on Existing System

**Database**: NO CHANGES
- Existing `users` table unchanged
- Existing `wachtwoord_hash` column accepts all bcrypt hashes

**Login Endpoint**: NO CHANGES
- `POST /api/login` validation unchanged
- Existing users can login with weak passwords (if created before this update)

**Registration Endpoint**: BEHAVIORAL CHANGE
- `POST /api/registreer` now rejects weak passwords
- New response field: `passwordErrors`
- HTTP status codes unchanged (400 for validation errors)

**Client Compatibility**:
- Old clients without password validation UI will receive clear error messages
- New clients can use `passwordErrors` field for better UX

## Testing Contract

### Manual Test Cases

**Test Case 1**: Valid Strong Password
```bash
curl -X POST https://tickedify.com/api/registreer \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@example.com","wachtwoord":"Welkom2025!","naam":"Test 1"}'
```
**Expected**: 200 with `success: true`

**Test Case 2**: Weak Password (No Special Char)
```bash
curl -X POST https://tickedify.com/api/registreer \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","wachtwoord":"Welkom2025","naam":"Test 2"}'
```
**Expected**: 400 with `passwordErrors: ["Wachtwoord moet minimaal 1 speciaal teken bevatten"]`

**Test Case 3**: Multiple Violations
```bash
curl -X POST https://tickedify.com/api/registreer \
  -H "Content-Type: application/json" \
  -d '{"email":"test3@example.com","wachtwoord":"test","naam":"Test 3"}'
```
**Expected**: 400 with `passwordErrors` containing 4 items

**Test Case 4**: Duplicate Email (Valid Password)
```bash
# First registration
curl -X POST https://tickedify.com/api/registreer \
  -H "Content-Type: application/json" \
  -d '{"email":"duplicate@example.com","wachtwoord":"Valid@123","naam":"First"}'

# Second registration (same email)
curl -X POST https://tickedify.com/api/registreer \
  -H "Content-Type: application/json" \
  -d '{"email":"duplicate@example.com","wachtwoord":"Other@456","naam":"Second"}'
```
**Expected**: First succeeds (200), Second fails (400) with "Dit e-mailadres is al geregistreerd"

## Implementation Checklist

- [ ] Server-side: Implement `validatePasswordStrength()` function
- [ ] Server-side: Add password validation to POST /api/registreer handler
- [ ] Server-side: Return `passwordErrors` array in 400 responses
- [ ] Server-side: Maintain validation order (password before email check)
- [ ] Client-side: Handle `passwordErrors` response field
- [ ] Client-side: Display password errors to user
- [ ] Testing: Verify all test cases pass
- [ ] Testing: Verify backwards compatibility (existing users can login)
- [ ] Documentation: Update API documentation
- [ ] Deployment: Test on staging before production

## Contract Version

**Version**: 2.0.0
**Breaking Changes**: Yes (new validation rules reject previously accepted passwords)
**Migration Path**: None needed (only affects new registrations)

## References

- Feature Spec: [spec.md](../spec.md)
- Data Model: [data-model.md](../data-model.md)
- Research: [research.md](../research.md)
