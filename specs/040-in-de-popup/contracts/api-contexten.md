# API Contract: GET /api/lijst/contexten

**Feature**: 040-in-de-popup - Alfabetisch Gesorteerde Contexten
**Date**: 2025-10-30
**Status**: Modified behavior (sorting only)

## Endpoint

```
GET /api/lijst/contexten
```

**Implementation**: `server.js` (regel 4891-4946) → `database.js` getList('contexten', userId)

---

## Request

### Headers
```http
Authorization: [session cookie/token]
Content-Type: application/json
```

### Parameters
- **Method**: GET
- **Path**: `/api/lijst/contexten`
- **Query Parameters**: None (userId extracted from session)
- **Body**: None

### Example Request
```bash
curl -X GET https://dev.tickedify.com/api/lijst/contexten \
     -H "Cookie: connect.sid=..." \
     -s -L -k
```

---

## Response

### Success Response (200 OK)

**Status Code**: `200 OK`

**Headers**:
```http
Content-Type: application/json; charset=utf-8
```

**Body Schema**:
```json
[
  {
    "id": integer,
    "naam": string,
    "user_id": integer,
    "aangemaakt": string (ISO 8601 timestamp)
  }
]
```

**Constraints**:
- ✅ Array is **always alphabetically sorted** by `naam` field (A-Z)
- ✅ Sorting is **case-insensitive** ("admin" sorts same as "Admin")
- ✅ Empty array `[]` if user has no contexts
- ✅ All objects have required fields (id, naam, user_id, aangemaakt)

### Example Success Response (BEFORE Change)

```json
[
  {
    "id": 4,
    "naam": "Hobby",
    "user_id": 1,
    "aangemaakt": "2025-10-25T10:30:00.000Z"
  },
  {
    "id": 3,
    "naam": "Werk",
    "user_id": 1,
    "aangemaakt": "2025-10-20T09:15:00.000Z"
  },
  {
    "id": 1,
    "naam": "Thuis",
    "user_id": 1,
    "aangemaakt": "2025-10-15T14:00:00.000Z"
  },
  {
    "id": 2,
    "naam": "Administratie",
    "user_id": 1,
    "aangemaakt": "2025-10-10T11:45:00.000Z"
  }
]
```

**Sorting**: By `aangemaakt DESC` (nieuwste eerst) ❌ OLD BEHAVIOR

### Example Success Response (AFTER Change)

```json
[
  {
    "id": 2,
    "naam": "Administratie",
    "user_id": 1,
    "aangemaakt": "2025-10-10T11:45:00.000Z"
  },
  {
    "id": 4,
    "naam": "Hobby",
    "user_id": 1,
    "aangemaakt": "2025-10-25T10:30:00.000Z"
  },
  {
    "id": 1,
    "naam": "Thuis",
    "user_id": 1,
    "aangemaakt": "2025-10-15T14:00:00.000Z"
  },
  {
    "id": 3,
    "naam": "Werk",
    "user_id": 1,
    "aangemaakt": "2025-10-20T09:15:00.000Z"
  }
]
```

**Sorting**: By `LOWER(naam) ASC` (alfabetisch A-Z) ✅ NEW BEHAVIOR

---

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "User not authenticated"
}
```

**Cause**: No valid session cookie/token

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Database query failed"
}
```

**Cause**: Database connection issue or query error

---

## Contract Tests

### Test 1: Response is Array
```javascript
test('GET /api/lijst/contexten returns array', async () => {
    const response = await fetch('/api/lijst/contexten');
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
});
```

### Test 2: Array is Alphabetically Sorted
```javascript
test('Contexten are alphabetically sorted', async () => {
    const response = await fetch('/api/lijst/contexten');
    const data = await response.json();

    // Extract names
    const names = data.map(c => c.naam);

    // Create expected sorted array (case-insensitive)
    const sortedNames = [...names].sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase(), 'nl')
    );

    expect(names).toEqual(sortedNames);
});
```

### Test 3: Each Object Has Required Fields
```javascript
test('Each context has required fields', async () => {
    const response = await fetch('/api/lijst/contexten');
    const data = await response.json();

    data.forEach(context => {
        expect(context).toHaveProperty('id');
        expect(context).toHaveProperty('naam');
        expect(context).toHaveProperty('user_id');
        expect(context).toHaveProperty('aangemaakt');
    });
});
```

### Test 4: Case-Insensitive Sorting
```javascript
test('Sorting is case-insensitive', async () => {
    // Setup: Create contexts with mixed case
    await createContext('PROJECTEN');
    await createContext('admin');
    await createContext('Hobby');

    const response = await fetch('/api/lijst/contexten');
    const data = await response.json();
    const names = data.map(c => c.naam);

    // Expected order (case-insensitive): admin, Hobby, PROJECTEN
    const expected = ['admin', 'Hobby', 'PROJECTEN'];
    expect(names).toEqual(expected);
});
```

### Test 5: Empty Array for New User
```javascript
test('Returns empty array for user without contexts', async () => {
    // Setup: New user with no contexts
    const response = await fetch('/api/lijst/contexten');
    const data = await response.json();

    expect(data).toEqual([]);
});
```

### Test 6: Dutch Accented Characters
```javascript
test('Dutch accents are sorted correctly', async () => {
    // Setup: Create contexts with accents
    await createContext('École');
    await createContext('Context');
    await createContext('Café');
    await createContext('Admin');

    const response = await fetch('/api/lijst/contexten');
    const data = await response.json();
    const names = data.map(c => c.naam);

    // PostgreSQL should sort: Admin, Café, Context, École
    expect(names[0]).toBe('Admin');
    expect(names[1]).toBe('Café');
    expect(names[2]).toBe('Context');
    expect(names[3]).toBe('École');
});
```

---

## Breaking Changes

**Is this a breaking change?** ❌ NO

**Rationale**:
- Response structure unchanged (same JSON schema)
- Field types unchanged
- Only array order changed (sorting)
- Frontend should not depend on specific order (defensive programming)
- Client-side fallback sorting provides extra safety

**Backward Compatibility**: ✅ 100% COMPATIBLE

---

## Performance Contract

**Response Time**: <100ms for typical workload (20-30 contexts)

**Payload Size**: ~1-2 KB for 20 contexts

**Database Query**: O(n log n) sorting, n < 50 typically

**Caching**: No caching currently implemented (future consideration)

---

## Implementation Change

### Database Query (database.js:584)

**OLD**:
```javascript
query = 'SELECT * FROM contexten WHERE user_id = $1 ORDER BY aangemaakt DESC';
```

**NEW**:
```javascript
query = 'SELECT * FROM contexten WHERE user_id = $1 ORDER BY LOWER(naam) ASC';
```

**Change Type**: Query modification only
**Files Affected**: `database.js` (1 line change)

---

## Validation Rules

**Server-side** (existing - no changes):
- ✅ `user_id` extracted from authenticated session
- ✅ `naam` NOT NULL constraint in database
- ✅ Only return contexts owned by authenticated user

**Client-side** (existing - no changes):
- ✅ Dropdown requires selection (HTML `required` attribute)
- ✅ Empty string prevented by validation

---

## Manual Testing

### Test via cURL (Staging)

```bash
# Test current staging deployment
curl -s -L -k https://dev.tickedify.com/api/lijst/contexten \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     | jq '.[].naam'

# Expected output (alphabetically sorted):
# "Administratie"
# "Hobby"
# "Thuis"
# "Werk"
```

### Test via Browser DevTools

```javascript
// In browser console on dev.tickedify.com/app
fetch('/api/lijst/contexten')
  .then(r => r.json())
  .then(data => {
      console.log('Contexten:', data.map(c => c.naam));
      // Should be alphabetically sorted
  });
```

---

## Documentation Updates

**API Documentation**: Update internal API docs (if exists) to note alphabetical sorting
**Changelog**: Add entry for v0.20.18+ noting improved context dropdown UX

---

## Contract Summary

| Aspect | Value |
|--------|-------|
| **Endpoint** | GET /api/lijst/contexten |
| **Response Format** | JSON Array |
| **Sorting** | LOWER(naam) ASC (alfabetisch, case-insensitive) |
| **Breaking Change** | ❌ NO |
| **Performance** | <100ms, ~1-2KB payload |
| **Backward Compat** | ✅ YES |
| **Tests Required** | 6 contract tests (sorting, structure, edge cases) |

**Contract Status**: ✅ DEFINED AND TESTABLE
