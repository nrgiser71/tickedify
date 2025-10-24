# API Contract: "Volgende Keer" Trigger Extension

**Feature**: 032-bij-het-maken
**Date**: 2025-10-24
**Status**: Complete

## Overview

Deze feature breidt BESTAANDE API endpoints uit met ondersteuning voor de nieuwe `trigger_type = 'next_time'` waarde. **Geen nieuwe endpoints** nodig - alleen interne logica wijzigingen.

---

## Modified Endpoints

### 1. POST /api/admin/messages (Existing - Minor Extension)

**Purpose**: Create new admin message (WITH nieuwe trigger_type optie)

**Authentication**: requireAdmin middleware

**Request Body** (UNCHANGED SCHEMA):
```json
{
  "title": "string (required, max 255 chars)",
  "message": "string (required)",
  "message_type": "string (optional, default: 'information')",
  "target_type": "string (optional, default: 'all')",
  "target_subscription": "array<string> (optional)",
  "target_users": "array<string> (optional)",
  "trigger_type": "string (optional, default: 'immediate')",  // ← NEW VALUE: 'next_time'
  "trigger_value": "string (optional)",
  "dismissible": "boolean (optional, default: true)",
  "snoozable": "boolean (optional, default: true)",
  "publish_at": "timestamp (optional, default: NOW())",
  "expires_at": "timestamp (optional)",
  "button_label": "string (optional)",
  "button_action": "string (optional)",
  "button_target": "string (optional)"
}
```

**NEW Trigger Type Value**:
```json
{
  "trigger_type": "next_time",
  "trigger_value": null  // Not used for next_time trigger
}
```

**Validation Rules**:
- Existing validation blijft hetzelfde
- `trigger_type = 'next_time'` is een valid value (toegevoegd aan whitelist indien aanwezig)
- `trigger_value` optioneel/ignored voor next_time trigger

**Response** (UNCHANGED):
```json
{
  "success": true,
  "messageId": 123,
  "message": "Message created successfully"
}
```

**Status Codes** (UNCHANGED):
- 201: Success
- 400: Validation error
- 401: Unauthorized
- 500: Server error

**Example Request**:
```bash
curl -X POST https://tickedify.com/api/admin/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "title": "Nieuwe Filter Functionaliteit",
    "message": "We hebben een nieuwe project filter toegevoegd aan de dagelijkse planning!",
    "message_type": "feature",
    "target_type": "all",
    "trigger_type": "next_time",
    "dismissible": true,
    "publish_at": "2025-10-24T10:00:00Z"
  }'
```

---

### 2. GET /api/messages/unread (Existing - Internal Logic Change)

**Purpose**: Fetch unread messages for current user (MODIFIED internal filtering)

**Authentication**: User session (cookie/JWT)

**Request**:
- Method: GET
- Path: /api/messages/unread
- Query params: None
- Body: None

**Response** (UNCHANGED SCHEMA):
```json
{
  "messages": [
    {
      "id": 123,
      "title": "string",
      "message": "string",
      "message_type": "string",
      "trigger_type": "string",  // ← Kan nu 'next_time' zijn
      "dismissible": boolean,
      "snoozable": boolean,
      "button_label": "string | null",
      "button_action": "string | null",
      "button_target": "string | null",
      "created_at": "timestamp",
      "publish_at": "timestamp",
      "expires_at": "timestamp | null"
    }
  ]
}
```

**Internal Logic Change** (Backend implementation):
```sql
-- MODIFIED QUERY to include next_time trigger evaluation
SELECT DISTINCT m.*
FROM admin_messages m
LEFT JOIN message_interactions mi
  ON m.id = mi.message_id AND mi.user_id = $1
WHERE m.active = TRUE
  AND m.publish_at <= NOW()
  AND (m.expires_at IS NULL OR m.expires_at > NOW())
  AND (
    -- Existing immediate trigger
    (m.trigger_type = 'immediate' AND (mi.dismissed = FALSE OR mi.message_id IS NULL))
    OR
    -- NEW: next_time trigger
    (m.trigger_type = 'next_time' AND (mi.dismissed = FALSE OR mi.message_id IS NULL))
    OR
    -- Existing page_visit_count trigger
    (m.trigger_type = 'page_visit_count' AND /* existing logic */)
  )
ORDER BY m.created_at ASC;
```

**Behavioral Changes**:
- Messages met `trigger_type = 'next_time'` worden nu geretourneerd
- Filtering logica: Show if user heeft GEEN interaction OF dismissed = FALSE
- Multiple "next_time" berichten worden allemaal geretourneerd (geen limit)

**Example Response with next_time message**:
```json
{
  "messages": [
    {
      "id": 456,
      "title": "Nieuwe Filter Functionaliteit",
      "message": "We hebben een nieuwe project filter toegevoegd!",
      "message_type": "feature",
      "trigger_type": "next_time",
      "dismissible": true,
      "snoozable": true,
      "button_label": null,
      "button_action": null,
      "button_target": null,
      "created_at": "2025-10-24T10:00:00Z",
      "publish_at": "2025-10-24T10:00:00Z",
      "expires_at": null
    }
  ]
}
```

**Status Codes** (UNCHANGED):
- 200: Success (including empty messages array)
- 401: Unauthorized
- 500: Server error

---

### 3. POST /api/messages/:id/dismiss (Existing - No Changes)

**Purpose**: Dismiss a message for current user

**Authentication**: User session

**Request**:
```bash
POST /api/messages/123/dismiss
```

**Response** (UNCHANGED):
```json
{
  "success": true
}
```

**Behavior for next_time messages**:
- Sets `message_interactions.dismissed = TRUE`
- Message wordt niet meer getoond in /api/messages/unread
- Werkt identiek voor alle trigger types (including next_time)

**No modifications needed** - Existing dismiss logic perfect for next_time trigger

---

## Unchanged Endpoints

De volgende endpoints blijven **100% ongewijzigd**:

- **GET /api/admin/messages** - List all messages (existing)
- **GET /api/admin/messages/:id** - Get single message (existing)
- **PUT /api/admin/messages/:id** - Update message (existing)
- **DELETE /api/admin/messages/:id** - Delete message (existing)
- **POST /api/admin/messages/:id/toggle** - Toggle active status (existing)
- **POST /api/admin/messages/:id/duplicate** - Duplicate message (existing)
- **GET /api/admin/messages/preview-targets** - Preview targeting (existing)
- **GET /api/admin/messages/:id/analytics** - Message analytics (existing)

Deze endpoints werken transparant met `trigger_type = 'next_time'` zonder wijzigingen.

---

## Frontend Contract (Admin Interface)

### Admin Message Form (admin2.html)

**NEW UI Element**:
```html
<!-- Add to trigger type radio button group -->
<input type="radio" name="trigger_type" value="next_time" id="trigger_next_time">
<label for="trigger_next_time">Volgende keer</label>
```

**Form Submission** (UNCHANGED):
- Existing form submit logic blijft hetzelfde
- `trigger_type = 'next_time'` wordt meegestuurd in POST body
- No special handling needed client-side

**Validation** (UNCHANGED):
- Existing client-side validation blijft werken
- No new validation rules for next_time trigger

---

## Frontend Contract (User Interface)

### Message Display (message-modal.js)

**NO CHANGES NEEDED**:
- Existing polling logic (5-minuut interval) blijft identiek
- Existing modal display logic blijft identiek
- Existing dismiss action blijft identiek

**Behavior**:
- Backend returns next_time messages in /api/messages/unread
- Frontend displays wat backend teruggeeft (agnostic van trigger_type)
- User clicks "Got it" → POST /api/messages/:id/dismiss → bericht verdwijnt

---

## Error Handling

### Existing Error Responses (UNCHANGED)

**400 Bad Request**:
```json
{
  "error": "Title and message are required"
}
```

**401 Unauthorized**:
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found**:
```json
{
  "error": "Message not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error"
}
```

**No new error scenarios** voor next_time trigger

---

## Backwards Compatibility

**Guarantee**: Alle bestaande API clients blijven werken zonder wijzigingen.

**Compatibility Matrix**:
| Scenario | Status |
|----------|--------|
| Existing messages (immediate, page_visit_count) | ✅ Fully compatible |
| Admin creates message without trigger_type | ✅ Defaults to 'immediate' (existing behavior) |
| User fetches unread messages | ✅ Includes next_time messages in response |
| User dismisses next_time message | ✅ Uses existing dismiss endpoint |
| Admin edits next_time message | ✅ Uses existing update endpoint |
| Frontend displays next_time message | ✅ Agnostic display logic |

**No Breaking Changes** ✅

---

## Security Considerations

**Authorization** (UNCHANGED):
- POST /api/admin/messages: requireAdmin middleware (existing)
- GET /api/messages/unread: User session required (existing)
- POST /api/messages/:id/dismiss: User session + own message check (existing)

**Injection Protection** (UNCHANGED):
- Parameterized queries (existing)
- Input validation (existing)
- No user-controllable SQL in trigger_type field

**No new security risks** introduced by next_time trigger

---

## Performance Impact

**Database Queries**:
- GET /api/messages/unread: +1 OR clause in WHERE condition
- Impact: Negligible (< 5ms with existing indexes)
- Query plan: Uses existing composite index

**API Response Times** (estimated):
- POST /api/admin/messages: No change (< 100ms)
- GET /api/messages/unread: +2-5ms voor extra OR condition
- POST /api/messages/:id/dismiss: No change (< 50ms)

**Polling Load** (UNCHANGED):
- 5-minuut interval (existing)
- Same number of requests per user
- No additional network overhead

**Overall Impact**: < 5% query time increase, zero noticeable user impact

---

## Testing Checklist

### Contract Tests (Manual)

**Scenario 1: Create next_time message**:
```bash
# Create message
curl -X POST /api/admin/messages -d '{"title":"Test","message":"Test next_time","trigger_type":"next_time"}' -H "Authorization: ..."
# Expected: 201, messageId returned
```

**Scenario 2: Fetch unread messages**:
```bash
# As user
curl https://tickedify.com/api/messages/unread
# Expected: 200, next_time message in array
```

**Scenario 3: Dismiss next_time message**:
```bash
curl -X POST /api/messages/123/dismiss
# Expected: 200, success: true
# Verify: Message not in /api/messages/unread anymore
```

**Scenario 4: Multiple next_time messages**:
```bash
# Create 2 next_time messages
# Fetch /api/messages/unread
# Expected: Both messages in response array
```

### Integration Tests (Manual)

- ✅ Existing immediate trigger still works
- ✅ Existing page_visit_count trigger still works
- ✅ Mixed trigger types in same response
- ✅ Message edit doesn't re-show to dismissed users
- ✅ Message delete removes from unread

---

## Summary

**API Changes**:
- ✅ POST /api/admin/messages: Accepts `trigger_type = 'next_time'` (additive)
- ✅ GET /api/messages/unread: Returns next_time messages (internal logic)
- ✅ All other endpoints: No changes

**Backwards Compatibility**: ✅ Fully compatible
**Breaking Changes**: ❌ None
**New Endpoints**: ❌ None required
**Security**: ✅ No new risks
**Performance**: ✅ Negligible impact (< 5ms)

---

**Reviewed**: 2025-10-24
**Status**: APPROVED - Ready for implementation
