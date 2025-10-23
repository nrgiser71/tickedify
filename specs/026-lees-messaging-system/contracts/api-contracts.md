# API Contracts: In-App Admin-to-User Messaging System

**Feature**: 026-lees-messaging-system
**Date**: 2025-01-23
**Base URL**: https://tickedify.com/api (production), https://dev.tickedify.com/api (staging)

## Contract Overview

Het messaging systeem heeft 2 groepen endpoints:

1. **Admin Endpoints** - Vereisen admin authorization
2. **User Endpoints** - Vereisen user authentication

---

## Admin Endpoints

### POST /api/admin/messages

**Purpose**: Create new admin message (FR-001)

**Authorization**: Admin only (user_id = 1 of admin role)

**Request Body**:
```json
{
  "title": "Welcome to Tickedify",
  "message": "This is your task management app...",
  "message_type": "educational",
  "target_type": "all",
  "target_subscription": null,
  "target_users": null,
  "trigger_type": "immediate",
  "trigger_value": null,
  "dismissible": true,
  "snoozable": true,
  "publish_at": null,
  "expires_at": null,
  "button_label": null,
  "button_action": null,
  "button_target": null
}
```

**Field Validation**:
- `title`: Required, string, max 255 chars
- `message`: Required, string, max 10000 chars (NFR-008)
- `message_type`: Enum ['information', 'educational', 'warning', 'important', 'feature', 'tip']
- `target_type`: Enum ['all', 'filtered', 'specific_users']
- `target_subscription`: Array of strings or null (only when target_type = 'filtered')
- `target_users`: Array of integers or null (only when target_type = 'specific_users')
- `trigger_type`: Enum ['immediate', 'days_after_signup', 'first_page_visit', 'nth_page_visit']
- `trigger_value`: String or null (depends on trigger_type)
- `dismissible`: Boolean
- `snoozable`: Boolean
- `publish_at`: ISO timestamp or null (null = NOW)
- `expires_at`: ISO timestamp or null (null = never expires)
- `button_label`: String max 100 chars or null
- `button_action`: Enum ['navigate', 'external'] or null
- `button_target`: String (URL or path) or null

**Response 201 Created**:
```json
{
  "success": true,
  "messageId": 123,
  "message": "Message created successfully"
}
```

**Response 400 Bad Request**:
```json
{
  "error": "Invalid message type",
  "field": "message_type"
}
```

**Response 403 Forbidden**:
```json
{
  "error": "Forbidden - Admin access required"
}
```

---

### GET /api/admin/messages

**Purpose**: List all messages with summary stats (FR-038, FR-039)

**Authorization**: Admin only

**Query Parameters**: None

**Response 200 OK**:
```json
{
  "messages": [
    {
      "id": 123,
      "title": "Welcome to Tickedify",
      "message": "This is your task management app...",
      "message_type": "educational",
      "target_type": "all",
      "trigger_type": "immediate",
      "active": true,
      "created_at": "2025-01-15T10:00:00Z",
      "stats": {
        "targeted": 245,
        "shown": 198,
        "dismissed": 156
      }
    }
  ]
}
```

**Field Descriptions**:
- `stats.targeted`: Aantal users in doelgroep
- `stats.shown`: Aantal users die bericht hebben gezien
- `stats.dismissed`: Aantal users die bericht dismissed hebben

---

### GET /api/admin/messages/:id/analytics

**Purpose**: Get detailed analytics for specific message (FR-041, FR-042, FR-043)

**Authorization**: Admin only

**URL Parameters**:
- `id`: Integer, message ID

**Response 200 OK**:
```json
{
  "message": {
    "id": 123,
    "title": "Welcome to Tickedify",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "targeting": {
    "total_targeted": 245,
    "estimated_reach": 245
  },
  "engagement": {
    "total_shown": 198,
    "total_dismissed": 156,
    "total_snoozed": 42,
    "button_clicks": 89
  },
  "rates": {
    "seen_rate": 80.8,
    "dismiss_rate": 63.7,
    "snooze_rate": 17.1,
    "button_click_rate": 45.0
  },
  "users": [
    {
      "id": 1,
      "name": "Jan Buskens",
      "email": "jan@buskens.be",
      "first_shown_at": "2025-01-15T11:30:00Z",
      "dismissed": true,
      "snoozed": false,
      "button_clicked": true
    }
  ]
}
```

**Calculations**:
- `seen_rate`: (total_shown / total_targeted) * 100
- `dismiss_rate`: (total_dismissed / total_shown) * 100
- `snooze_rate`: (total_snoozed / total_shown) * 100
- `button_click_rate`: (button_clicks / total_shown) * 100

**Response 404 Not Found**:
```json
{
  "error": "Message not found"
}
```

---

### POST /api/admin/messages/:id/toggle

**Purpose**: Toggle message active status (FR-044)

**Authorization**: Admin only

**URL Parameters**:
- `id`: Integer, message ID

**Request Body**: None

**Response 200 OK**:
```json
{
  "success": true,
  "active": false
}
```

---

### GET /api/admin/users/search

**Purpose**: Search users by name/email for targeting (FR-012, FR-046)

**Authorization**: Admin only

**Query Parameters**:
- `q`: String, search query (min 2 chars)

**Response 200 OK**:
```json
{
  "users": [
    {
      "id": 42,
      "name": "John Doe",
      "email": "john@example.com",
      "subscription_type": "premium"
    }
  ]
}
```

**Query Logic**: ILIKE '%query%' op name en email fields

**Response Limit**: Max 50 results

---

### GET /api/admin/messages/preview-targets

**Purpose**: Preview targeted user count during message creation (FR-013, FR-047, FR-048)

**Authorization**: Admin only

**Query Parameters**:
- `target_type`: String, one of ['all', 'filtered', 'specific_users']
- `target_subscription`: JSON array of subscription types (optional)
- `target_users`: JSON array of user IDs (optional)

**Example Request**:
```
GET /api/admin/messages/preview-targets?target_type=filtered&target_subscription=["premium","trial"]
```

**Response 200 OK**:
```json
{
  "count": 87,
  "sample": [
    {
      "id": 1,
      "name": "Jan Buskens",
      "email": "jan@buskens.be"
    },
    {
      "id": 5,
      "name": "Test User",
      "email": "test@example.com"
    }
  ]
}
```

**Response Logic**:
- `count`: Total users matching targeting criteria
- `sample`: First 5 matching users

---

## User Endpoints

### GET /api/messages/unread

**Purpose**: Get unread messages for current user (FR-004, FR-006)

**Authorization**: User authentication required

**Query Parameters**:
- `page`: String, current page identifier (optional, used for page visit triggers)

**Example Request**:
```
GET /api/messages/unread?page=dagelijkse-planning
```

**Response 200 OK**:
```json
{
  "messages": [
    {
      "id": 123,
      "title": "Welcome to Tickedify",
      "message": "This is your task management app...",
      "message_type": "information",
      "dismissible": true,
      "snoozable": true,
      "button_label": "Get Started",
      "button_action": "navigate",
      "button_target": "/dagelijkse-planning"
    }
  ]
}
```

**Filtering Logic**:
1. Active messages only (active = true)
2. Published (publish_at <= NOW)
3. Not expired (expires_at IS NULL OR expires_at > NOW)
4. Target matches user (all, subscription filter, specific user ID)
5. Trigger matches (immediate, days after signup, page visit)
6. Not dismissed by user
7. Not snoozed (snoozed_until IS NULL OR snoozed_until <= NOW)

**Sorting**: Priority (important first) then created_at DESC

**Empty State**:
```json
{
  "messages": []
}
```

---

### POST /api/messages/:id/dismiss

**Purpose**: Mark message as dismissed (FR-007, FR-008)

**Authorization**: User authentication required

**URL Parameters**:
- `id`: Integer, message ID

**Request Body**: None

**Response 200 OK**:
```json
{
  "success": true
}
```

**Side Effects**:
- UPSERT into message_interactions (message_id, user_id, dismissed = true)
- Update last_shown_at = NOW

---

### POST /api/messages/:id/snooze

**Purpose**: Snooze message for specified duration (FR-029, FR-030, FR-031)

**Authorization**: User authentication required

**URL Parameters**:
- `id`: Integer, message ID

**Request Body**:
```json
{
  "duration": 3600
}
```

**Duration Values**:
- `3600`: 1 hour
- `14400`: 4 hours
- `86400`: 1 day

**Response 200 OK**:
```json
{
  "success": true,
  "snoozedUntil": "2025-01-15T15:00:00Z"
}
```

**Side Effects**:
- UPSERT into message_interactions (message_id, user_id, snoozed_until = NOW + duration)

---

### POST /api/messages/:id/button-click

**Purpose**: Track button click interaction (FR-028)

**Authorization**: User authentication required

**URL Parameters**:
- `id`: Integer, message ID

**Request Body**: None

**Response 200 OK**:
```json
{
  "success": true
}
```

**Side Effects**:
- UPDATE message_interactions SET button_clicked = true, button_clicked_at = NOW

---

### POST /api/page-visit/:pageIdentifier

**Purpose**: Track page visit for trigger evaluation (FR-018)

**Authorization**: User authentication required

**URL Parameters**:
- `pageIdentifier`: String, page identifier (e.g., 'dagelijkse-planning')

**Standard Page Identifiers**:
- `dagelijkse-planning`
- `actielijst`
- `inbox`
- `edit-task-modal`
- `quick-add-modal`
- `recurring-task-popup`
- `planning-popup`

**Request Body**: None

**Response 200 OK**:
```json
{
  "success": true,
  "visitCount": 5
}
```

**Side Effects**:
- UPSERT into user_page_visits (increment visit_count, update last_visit_at)
- RETURNING visit_count for response

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden - Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": "Field 'title' is required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Contract Validation Checklist

- [x] All functional requirements mapped to endpoints
- [x] Request/response schemas specified
- [x] Validation rules documented
- [x] Error responses defined
- [x] Authorization requirements specified
- [x] Query parameters documented
- [x] Side effects documented
- [x] Standard values specified (page identifiers, durations, etc.)

**Ready for Quickstart Generation** ✅
