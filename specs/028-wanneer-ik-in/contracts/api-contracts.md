# API Contracts: Real-time Bericht Notificatie bij Navigatie

**Feature**: 028-wanneer-ik-in
**Date**: 2025-10-23

---

## Overview

**No new API endpoints required** for this feature. This document describes the existing contracts that will be used.

**Existing Endpoints Used**:
1. `GET /api/messages/unread` - Fetch unread messages (main contract)
2. `POST /api/messages/:messageId/dismiss` - Mark message as dismissed
3. `POST /api/messages/:messageId/snooze` - Snooze message (optional)

**Source**: Feature 026-lees-messaging-system (server.js implementation)

---

## Contract 1: Get Unread Messages

### Endpoint
```
GET /api/messages/unread
```

### Authentication
**Required**: Yes (session-based)
**Type**: Express session cookie
**Header**: `Cookie: connect.sid=<session-id>`

### Request

**Method**: `GET`
**Headers**:
```
Cookie: connect.sid=<session-id>
```

**Query Parameters**: None

**Body**: None

### Response

**Status Code**: `200 OK` (success)

**Content-Type**: `application/json`

**Body Schema**:
```json
{
  "messages": [
    {
      "id": 123,
      "title": "Welcome Message",
      "message": "Hello **world** with [markdown](https://example.com)",
      "message_type": "information",
      "dismissible": true,
      "snoozable": true,
      "snooze_durations": [3600, 14400, 86400],
      "display_at": "2025-10-23T14:30:00.000Z",
      "expires_at": null,
      "button_label": "Learn More",
      "button_action": "navigate",
      "button_target": "/help",
      "dismissed": false,
      "snoozed_until": null,
      "shown_count": 0
    }
  ]
}
```

**Field Descriptions**:
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Unique message identifier |
| title | String | Message title (max 255 chars) |
| message | String | Message body with markdown support |
| message_type | Enum | One of: information, educational, warning, important, feature, tip |
| dismissible | Boolean | Whether user can dismiss message |
| snoozable | Boolean | Whether user can snooze message |
| snooze_durations | Integer[] | Snooze options in seconds |
| display_at | ISO 8601 Timestamp | When message becomes visible |
| expires_at | ISO 8601 Timestamp \| null | When message expires (null = never) |
| button_label | String \| null | Optional action button text |
| button_action | Enum \| null | 'navigate' or 'external' |
| button_target | String \| null | URL or path for button |
| dismissed | Boolean | Whether user dismissed this message |
| snoozed_until | ISO 8601 Timestamp \| null | Snooze expiration time |
| shown_count | Integer | Number of times shown to user |

### Success Response Example

```json
{
  "messages": [
    {
      "id": 42,
      "title": "New Feature: Recurring Tasks",
      "message": "Check out our **new recurring tasks** feature!\n\n- Daily tasks\n- Weekly tasks\n- Custom schedules",
      "message_type": "feature",
      "dismissible": true,
      "snoozable": true,
      "snooze_durations": [3600, 14400, 86400],
      "display_at": "2025-10-23T10:00:00.000Z",
      "expires_at": "2025-10-30T23:59:59.000Z",
      "button_label": "Try It Now",
      "button_action": "navigate",
      "button_target": "/lijst-acties",
      "dismissed": false,
      "snoozed_until": null,
      "shown_count": 0
    },
    {
      "id": 43,
      "title": "System Maintenance",
      "message": "Scheduled maintenance on **Saturday 3AM**.",
      "message_type": "warning",
      "dismissible": false,
      "snoozable": false,
      "snooze_durations": [],
      "display_at": "2025-10-22T12:00:00.000Z",
      "expires_at": null,
      "button_label": null,
      "button_action": null,
      "button_target": null,
      "dismissed": false,
      "snoozed_until": null,
      "shown_count": 2
    }
  ]
}
```

### Empty Response Example (No Messages)

```json
{
  "messages": []
}
```

### Error Responses

**401 Unauthorized** (not logged in):
```json
{
  "error": "Authentication required"
}
```

**500 Internal Server Error** (database issue):
```json
{
  "error": "Failed to fetch messages"
}
```

### Business Logic

**Backend Filtering** (server.js implementation):
```sql
-- Messages returned ONLY when:
WHERE am.active = true                           -- Message is active
  AND am.display_at <= NOW()                     -- ⚡ Scheduled time reached
  AND (am.expires_at IS NULL OR am.expires_at > NOW())  -- Not expired
  AND (mi.dismissed IS NULL OR mi.dismissed = FALSE)     -- Not dismissed
  AND (mi.snoozed_until IS NULL OR mi.snoozed_until <= NOW())  -- Not snoozed
  AND [targeting filters]                        -- User matches target
ORDER BY am.display_at DESC, am.created_at DESC
```

**Key Behavior**:
- Returns **empty array** if no messages match criteria
- Does NOT return future messages (`display_at > NOW()`)
- Does NOT return expired messages
- Does NOT return dismissed messages
- Respects snooze periods

### Performance

**Expected Response Time**: <200ms
**Database Query**: Indexed on `(active, display_at, expires_at)`
**Caching**: No caching (always fresh from DB)

---

## Contract 2: Dismiss Message

### Endpoint
```
POST /api/messages/:messageId/dismiss
```

### Authentication
**Required**: Yes (session-based)

### Request

**Method**: `POST`
**Path Parameters**:
- `messageId` (Integer) - Message ID to dismiss

**Headers**:
```
Cookie: connect.sid=<session-id>
Content-Type: application/json
```

**Body**: None (or empty object `{}`)

### Response

**Status Code**: `200 OK`

**Body**:
```json
{
  "success": true,
  "dismissed": true
}
```

### Error Responses

**401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```

**404 Not Found** (message doesn't exist):
```json
{
  "error": "Message not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to dismiss message"
}
```

### Business Logic

**Database Update**:
```sql
INSERT INTO message_interactions (message_id, user_id, dismissed, first_shown_at, last_shown_at)
VALUES ($1, $2, true, NOW(), NOW())
ON CONFLICT (message_id, user_id)
DO UPDATE SET
  dismissed = true,
  last_shown_at = NOW(),
  shown_count = message_interactions.shown_count + 1
```

**Idempotent**: Calling multiple times has same effect as calling once

**Side Effects**:
- Message excluded from future `GET /api/messages/unread` calls
- `shown_count` incremented
- `last_shown_at` updated to NOW()

---

## Contract 3: Snooze Message (Optional)

### Endpoint
```
POST /api/messages/:messageId/snooze
```

### Authentication
**Required**: Yes (session-based)

### Request

**Method**: `POST`
**Path Parameters**:
- `messageId` (Integer) - Message ID to snooze

**Headers**:
```
Cookie: connect.sid=<session-id>
Content-Type: application/json
```

**Body**:
```json
{
  "duration": 3600
}
```

**Body Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| duration | Integer | Yes | Snooze duration in seconds |

**Valid Durations**:
- `3600` = 1 hour
- `14400` = 4 hours
- `86400` = 24 hours
- (or any custom value)

### Response

**Status Code**: `200 OK`

**Body**:
```json
{
  "success": true,
  "snoozed": true,
  "snoozedUntil": "2025-10-23T15:30:00.000Z"
}
```

### Error Responses

**400 Bad Request** (invalid duration):
```json
{
  "error": "Invalid snooze duration"
}
```

**401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```

**404 Not Found**:
```json
{
  "error": "Message not found"
}
```

### Business Logic

**Database Update**:
```sql
INSERT INTO message_interactions (message_id, user_id, snoozed_until, first_shown_at, last_shown_at)
VALUES ($1, $2, NOW() + INTERVAL '$3 seconds', NOW(), NOW())
ON CONFLICT (message_id, user_id)
DO UPDATE SET
  snoozed_until = NOW() + INTERVAL '$3 seconds',
  last_shown_at = NOW(),
  shown_count = message_interactions.shown_count + 1
```

**Side Effects**:
- Message excluded from `GET /api/messages/unread` until `snoozed_until` passes
- After snooze expires, message returns to unread list (if not dismissed)

---

## Frontend Usage Pattern

### On Page Load (DOMContentLoaded)

```javascript
// message-modal.js:12-15
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📢 Message modal system initialized');
  await checkForMessages();
});

// message-modal.js:18-39
async function checkForMessages() {
  try {
    const response = await fetch('/api/messages/unread');
    if (!response.ok) {
      console.log('No messages or auth required');
      return;
    }

    const data = await response.json();

    if (data.messages && data.messages.length > 0) {
      console.log(`📢 ${data.messages.length} unread message(s) found`);
      currentMessages = data.messages;
      currentMessageIndex = 0;
      showMessage(currentMessages[0]);
    }
  } catch (error) {
    console.error('Check messages error:', error);
  }
}
```

### On Message Dismiss

```javascript
// message-modal.js:234-265
async function dismissMessage(messageId) {
  try {
    const response = await fetch(`/api/messages/${messageId}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error('Failed to dismiss message');
      return;
    }

    console.log(`📢 Message ${messageId} dismissed`);

    // Close modal and update state
    const modal = document.getElementById('message-modal-overlay');
    if (modal) modal.style.display = 'none';

    currentMessages = currentMessages.filter(m => m.id !== messageId);

    // Show next message if available
    if (currentMessages.length > 0) {
      currentMessageIndex = Math.min(currentMessageIndex, currentMessages.length - 1);
      showMessage(currentMessages[currentMessageIndex]);
    }
  } catch (error) {
    console.error('Dismiss error:', error);
  }
}
```

---

## Sequence Diagram

### Scheduled Message Display Flow

```
User                Browser              Server              Database
 |                     |                    |                    |
 |-- Navigate -------->|                    |                    |
 |                     |-- DOMContentLoaded |                    |
 |                     |                    |                    |
 |                     |-- GET /api/messages/unread ------------>|
 |                     |                    |                    |
 |                     |                    |-- SELECT WHERE     |
 |                     |                    |    display_at<=NOW |
 |                     |                    |    dismissed=FALSE |
 |                     |                    |<-------------------|
 |                     |                    |   [messages: [...]]|
 |                     |<-------------------|                    |
 |                     |  200 OK            |                    |
 |                     |  {messages: [...]} |                    |
 |                     |                    |                    |
 |<-- Modal Displayed--|                    |                    |
 |    "New Feature!"   |                    |                    |
 |                     |                    |                    |
 |-- Click "Got it" -->|                    |                    |
 |                     |-- POST /api/messages/42/dismiss ------->|
 |                     |                    |                    |
 |                     |                    |-- UPDATE dismissed |
 |                     |                    |    = TRUE          |
 |                     |                    |<-------------------|
 |                     |<-------------------|                    |
 |                     |  200 OK            |                    |
 |                     |                    |                    |
 |<-- Modal Closed ----|                    |                    |
```

---

## Contract Tests (Future)

**Note**: Geen contract tests nodig voor deze feature - endpoints bestaan al en zijn getest in 026-lees-messaging-system.

**If implementing tests later**:
```javascript
// Test GET /api/messages/unread
describe('GET /api/messages/unread', () => {
  it('returns empty array when no scheduled messages', async () => {
    const response = await fetch('/api/messages/unread');
    const data = await response.json();
    expect(data.messages).toEqual([]);
  });

  it('returns messages where display_at <= NOW', async () => {
    // Create message with display_at = NOW - 1 hour
    // Fetch unread messages
    // Assert message is returned
  });

  it('does NOT return future messages', async () => {
    // Create message with display_at = NOW + 1 hour
    // Fetch unread messages
    // Assert message NOT returned
  });

  it('does NOT return dismissed messages', async () => {
    // Create and dismiss message
    // Fetch unread messages
    // Assert message NOT returned
  });
});
```

---

## Changelog

**v0.19.163 (2025-10-23)**:
- No API changes - reusing existing contracts from 026-lees-messaging-system
- Frontend enhancement only

---

## Summary

**All Required Contracts**: Already implemented ✅
**New Endpoints Needed**: None ✅
**Changes to Existing Endpoints**: None ✅

This feature leverages existing, battle-tested API contracts from the messaging system foundation.

---

**API Contracts Documentation Complete** ✅
