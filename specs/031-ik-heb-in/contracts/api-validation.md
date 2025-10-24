# API Contract: Admin Message Validation

**Feature**: 031-ik-heb-in
**Version**: 1.0.0
**Date**: 2025-10-24

## Contract: POST /api/admin/messages (Enhanced)

**Purpose**: Create admin message met enhanced validation

### Request

**Method**: `POST`
**Path**: `/api/admin/messages`
**Auth**: Required (requireAdmin middleware)
**Content-Type**: `application/json`

**Body Schema**:
```json
{
  "title": "string (required, max 255 chars)",
  "message": "string (required)",
  "message_type": "string (optional, default: 'information')",
  "target_type": "enum: 'all' | 'filtered' | 'specific_users' (optional, default: 'all')",
  "target_subscription": "string[] | null (required if target_type='filtered')",
  "target_users": "string[] | null (required if target_type='specific_users', MUST NOT BE EMPTY)",
  "trigger_type": "string (optional, default: 'immediate')",
  "trigger_value": "number | null",
  "dismissible": "boolean (optional, default: true)",
  "snoozable": "boolean (optional, default: true)",
  "publish_at": "string ISO8601 | null",
  "expires_at": "string ISO8601 | null",
  "button_label": "string | null",
  "button_action": "string | null",
  "button_target": "string | null",
  "active": "boolean (optional, default: true)"
}
```

### Response: Success (201 Created)

```json
{
  "success": true,
  "messageId": 123,
  "message": "Message created successfully"
}
```

### Response: Validation Error (400 Bad Request)

**Case 1: Missing Required Fields**
```json
{
  "error": "Title and message are required"
}
```

**Case 2: Empty target_users (NEW VALIDATION)**
```json
{
  "error": "Geen gebruikers geselecteerd. Selecteer minimaal één gebruiker voor dit bericht."
}
```

**Case 3: Invalid User IDs (Optional Validation)**
```json
{
  "error": "Enkele geselecteerde gebruikers bestaan niet meer"
}
```

### Response: Server Error (500)

```json
{
  "error": "Internal server error"
}
```

## Contract Test

**Test File**: `tests/contract/admin-messages-validation.test.js` (to be created)

```javascript
describe('POST /api/admin/messages - Validation', () => {
  test('should reject specific_users with empty target_users array', async () => {
    const response = await request(app)
      .post('/api/admin/messages')
      .set('Cookie', adminSessionCookie)
      .send({
        title: 'Test',
        message: 'Test message',
        target_type: 'specific_users',
        target_users: []  // EMPTY - should fail
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Geen gebruikers geselecteerd');
  });

  test('should reject specific_users with null target_users', async () => {
    const response = await request(app)
      .post('/api/admin/messages')
      .set('Cookie', adminSessionCookie)
      .send({
        title: 'Test',
        message: 'Test message',
        target_type: 'specific_users',
        target_users: null  // NULL - should fail
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Geen gebruikers geselecteerd');
  });

  test('should accept specific_users with valid target_users', async () => {
    const response = await request(app)
      .post('/api/admin/messages')
      .set('Cookie', adminSessionCookie)
      .send({
        title: 'Test',
        message: 'Test message',
        target_type: 'specific_users',
        target_users: ['valid_user_id']  // Valid
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.messageId).toBeDefined();
  });
});
```

## Implementation Checklist

- [ ] Add validation logic in server.js:13243-13248
- [ ] Return 400 with Dutch error message
- [ ] Preserve existing validation (title/message required)
- [ ] Add optional user ID existence check
- [ ] Write contract tests
- [ ] Verify tests fail before implementation
- [ ] Implement validation
- [ ] Verify tests pass after implementation

## Breaking Changes

**None** - This is additive validation only. Existing valid requests continue to work.

## Backwards Compatibility

- ✅ Existing messages with valid data unaffected
- ✅ Existing API clients with valid requests unaffected
- ✅ Only blocks previously invalid requests (empty target_users)

## Security Considerations

- Validation runs after `requireAdmin` middleware (auth required)
- No sensitive data in error messages
- User ID validation prevents targeting non-existent users
- No SQL injection risk (parameterized queries)

## Performance Impact

- Validation adds ~1ms per request (synchronous checks)
- Optional user ID lookup adds ~10-50ms (database query)
- Negligible impact on admin interface (low volume)

## Monitoring

**Metrics to Track**:
- Count of 400 validation errors (expect spike initially, then near-zero)
- Admin message creation success rate (should stay high)
- User search usage patterns (admin looking for users)

**Log Example**:
```
[ERROR] Admin message validation failed: Empty target_users for specific_users type
Admin ID: admin_123, Attempted at: 2025-10-24T10:30:00Z
```
