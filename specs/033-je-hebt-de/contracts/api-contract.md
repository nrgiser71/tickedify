# API Contract: "Volgend Bezoek Aan Pagina" Bericht Trigger

**Feature**: 033-je-hebt-de
**Created**: 2025-10-24
**Status**: Complete

## Overview

This document defines the API contract modifications required for the page-specific message trigger feature. This feature extends two existing endpoints with minimal changes and adds validation logic.

**Modified Endpoints**:
1. `GET /api/messages/unread` - Add optional `page` query parameter
2. `POST /api/admin/messages` - Add validation for `next_page_visit` trigger

**No New Endpoints** - All functionality integrated into existing APIs

---

## Endpoint 1: Fetch Unread Messages (MODIFIED)

### GET /api/messages/unread

**Purpose**: Fetch all unread messages for the current user, filtered by current page if applicable

**Location in Code**: `server.js` ~line 13571

**Changes from Existing**:
- ✅ Add optional `page` query parameter
- ✅ Extend WHERE clause to filter `next_page_visit` messages by page
- ✅ Maintain backwards compatibility (page param optional)

---

### Request

**Method**: `GET`

**URL**: `/api/messages/unread?page={pathname}`

**Query Parameters**:
| Parameter | Type   | Required | Description                                    | Example       |
|-----------|--------|----------|------------------------------------------------|---------------|
| `page`    | string | Optional | Current page pathname (URL-encoded)            | `/planning`   |

**Headers**:
```http
Cookie: session=<session-token>
```

**Authentication**: Required - User must be logged in (session cookie)

**Examples**:
```http
GET /api/messages/unread HTTP/1.1
Host: tickedify.com
Cookie: session=abc123...

GET /api/messages/unread?page=/planning HTTP/1.1
Host: tickedify.com
Cookie: session=abc123...

GET /api/messages/unread?page=%2Fplanning HTTP/1.1
Host: tickedify.com
Cookie: session=abc123...
```

---

### Response

**Success Response** (200 OK):
```json
{
  "messages": [
    {
      "id": 42,
      "title": "Nieuwe filter functionaliteit",
      "message": "We hebben filtering toegevoegd aan de dagelijkse planning. Probeer het uit!",
      "trigger_type": "next_page_visit",
      "trigger_value": "/planning",
      "publish_at": "2025-10-24T10:00:00Z",
      "expires_at": null,
      "dismissible": true
    },
    {
      "id": 15,
      "title": "Welkom bij Tickedify!",
      "message": "Hier is een kort overzicht van de functies...",
      "trigger_type": "immediate",
      "trigger_value": null,
      "publish_at": "2025-10-20T08:00:00Z",
      "expires_at": null,
      "dismissible": true
    }
  ]
}
```

**Empty Response** (200 OK - no messages):
```json
{
  "messages": []
}
```

**Error Responses**:

**401 Unauthorized** (not logged in):
```json
{
  "error": "Authentication required"
}
```

**400 Bad Request** (invalid page parameter):
```json
{
  "error": "Page parameter must start with / (e.g., /planning)"
}
```

---

### Backend Logic (Pseudocode)

```javascript
app.get('/api/messages/unread', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const page = req.query.page; // e.g., '/planning'

    // Validate page parameter format
    if (page && !page.startsWith('/')) {
        return res.status(400).json({
            error: 'Page parameter must start with / (e.g., /planning)'
        });
    }

    console.log(`📢 Evaluating messages for user ${userId}, page: ${page || 'any'}`);

    const query = `
        SELECT m.*
        FROM admin_messages m
        WHERE m.active = true
          AND m.publish_at <= NOW()
          AND (m.expires_at IS NULL OR m.expires_at > NOW())
          AND (
            -- Existing triggers (unchanged)
            m.trigger_type = 'immediate'
            OR (m.trigger_type = 'days_after_signup'
                AND EXTRACT(days FROM NOW() - u.created_at) >= m.trigger_value::integer)
            OR (m.trigger_type = 'first_page_visit'
                AND NOT EXISTS (SELECT 1 FROM user_page_visits WHERE ...))
            OR (m.trigger_type = 'nth_page_visit'
                AND (SELECT visit_count FROM user_page_visits WHERE ...) >= m.trigger_value::integer)
            -- NEW: next_page_visit trigger
            OR (m.trigger_type = 'next_page_visit'
                AND m.trigger_value = $2)  -- Match page parameter
          )
          AND m.id NOT IN (
            SELECT message_id FROM message_interactions
            WHERE user_id = $1
              AND (dismissed = true OR snoozed_until > NOW())
          )
        ORDER BY m.publish_at DESC
    `;

    const result = await db.query(query, [userId, page]);

    res.json({ messages: result.rows });
});
```

---

### Filtering Behavior

**Case 1: User visits /planning with messages**:
- Request: `GET /api/messages/unread?page=/planning`
- Returns:
  - ✅ All `immediate` messages (not page-specific)
  - ✅ All `days_after_signup` messages (not page-specific)
  - ✅ `next_page_visit` messages WHERE `trigger_value = '/planning'`
  - ❌ `next_page_visit` messages for other pages (e.g., `/taken`)

**Case 2: User visits /planning without page parameter**:
- Request: `GET /api/messages/unread` (no page param)
- Returns:
  - ✅ All `immediate` messages
  - ✅ All `days_after_signup` messages
  - ❌ NO `next_page_visit` messages (page param required for matching)

**Case 3: User visits unknown page**:
- Request: `GET /api/messages/unread?page=/unknown`
- Returns:
  - ✅ All `immediate` messages
  - ✅ All `days_after_signup` messages
  - ❌ NO `next_page_visit` messages (no messages for `/unknown` page)

---

### Backwards Compatibility

**✅ Existing Behavior Unchanged**:
- Calling without `page` parameter works identically to before
- Existing trigger types (`immediate`, `days_after_signup`, etc.) unaffected
- No breaking changes to response format
- Optional parameter = gradual frontend rollout possible

**Migration Path**:
1. Deploy backend with `page` parameter support
2. Existing frontend works (no `page` param = no new triggers shown)
3. Update frontend to send `page` param
4. New trigger type becomes active

---

## Endpoint 2: Create Admin Message (MODIFIED)

### POST /api/admin/messages

**Purpose**: Create a new admin message with trigger configuration

**Location in Code**: `server.js` ~line 13251

**Changes from Existing**:
- ✅ Add validation for `trigger_type = 'next_page_visit'`
- ✅ Require `trigger_value` to be valid page pathname
- ✅ Maintain backwards compatibility for other trigger types

---

### Request

**Method**: `POST`

**URL**: `/api/admin/messages`

**Headers**:
```http
Content-Type: application/json
Cookie: session=<admin-session-token>
```

**Authentication**: Required - Admin role required

**Body** (next_page_visit trigger):
```json
{
  "title": "Nieuwe filter functionaliteit",
  "message": "We hebben filtering toegevoegd aan de dagelijkse planning. Probeer het uit!",
  "trigger_type": "next_page_visit",
  "trigger_value": "/planning",
  "doelgroep": "alle_gebruikers",
  "dismissible": true,
  "publish_at": "2025-10-24T10:00:00Z",
  "expires_at": null
}
```

**Body Fields**:
| Field          | Type    | Required | Description                                  | Example              |
|----------------|---------|----------|----------------------------------------------|----------------------|
| `title`        | string  | Yes      | Message title                                | "Nieuwe filter"      |
| `message`      | string  | Yes      | Message content (markdown supported)         | "We hebben..."       |
| `trigger_type` | string  | Yes      | Trigger type (NEW: `next_page_visit`)        | `next_page_visit`    |
| `trigger_value`| string  | Yes*     | *Required if trigger_type=next_page_visit    | `/planning`          |
| `doelgroep`    | string  | No       | Target audience (default: all)               | `alle_gebruikers`    |
| `dismissible`  | boolean | No       | Can user dismiss? (default: true)            | `true`               |
| `publish_at`   | string  | No       | ISO timestamp (default: NOW)                 | `2025-10-24T...`     |
| `expires_at`   | string  | No       | ISO timestamp (default: null = never)        | `null`               |

---

### Response

**Success Response** (201 Created):
```json
{
  "success": true,
  "message_id": 42,
  "message": "Message created successfully"
}
```

**Error Responses**:

**400 Bad Request** (missing trigger_value):
```json
{
  "error": "Page identifier required for next_page_visit trigger"
}
```

**400 Bad Request** (invalid page format):
```json
{
  "error": "Page identifier must start with / (e.g., /planning)"
}
```

**400 Bad Request** (unknown page):
```json
{
  "error": "Invalid page. Must be one of: /app, /planning, /taken, /actielijst, /profiel"
}
```

**401 Unauthorized** (not admin):
```json
{
  "error": "Admin privileges required"
}
```

**422 Unprocessable Entity** (validation error):
```json
{
  "error": "Title and message are required"
}
```

---

### Backend Validation Logic

```javascript
app.post('/api/admin/messages', async (req, res) => {
    // Admin auth check
    if (!req.session.isAdmin) {
        return res.status(401).json({ error: 'Admin privileges required' });
    }

    const {
        title,
        message,
        trigger_type,
        trigger_value,
        doelgroep,
        dismissible,
        publish_at,
        expires_at
    } = req.body;

    // Basic validation
    if (!title || !message) {
        return res.status(422).json({ error: 'Title and message are required' });
    }

    // NEW: Validation for next_page_visit trigger
    if (trigger_type === 'next_page_visit') {
        if (!trigger_value || trigger_value.trim() === '') {
            return res.status(400).json({
                error: 'Page identifier required for next_page_visit trigger'
            });
        }

        if (!trigger_value.startsWith('/')) {
            return res.status(400).json({
                error: 'Page identifier must start with / (e.g., /planning)'
            });
        }

        const validPages = ['/app', '/planning', '/taken', '/actielijst', '/profiel'];
        if (!validPages.includes(trigger_value)) {
            return res.status(400).json({
                error: `Invalid page. Must be one of: ${validPages.join(', ')}`
            });
        }
    }

    // Insert into database
    const query = `
        INSERT INTO admin_messages
        (title, message, trigger_type, trigger_value, dismissible, publish_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `;

    const result = await db.query(query, [
        title,
        message,
        trigger_type,
        trigger_value,
        dismissible !== false,
        publish_at || new Date(),
        expires_at || null
    ]);

    res.status(201).json({
        success: true,
        message_id: result.rows[0].id,
        message: 'Message created successfully'
    });
});
```

---

### Valid Page Identifiers

**Hardcoded List** (initial implementation):
```javascript
const VALID_PAGES = [
    '/app',       // Hoofdapplicatie
    '/planning',  // Dagelijkse Planning
    '/taken',     // Takenlijst
    '/actielijst',// Actielijst
    '/profiel'    // Profiel
];
```

**Future Enhancement**:
- Auto-discover pages from routing configuration
- Allow wildcard patterns (e.g., `/planning/*`)
- Admin UI to manage custom page identifiers

---

## Endpoint 3: Dismiss Message (UNCHANGED)

### POST /api/messages/:id/dismiss

**Purpose**: Mark a message as dismissed for the current user

**No Changes Required** - Works identically for all trigger types including `next_page_visit`

**Request Example**:
```http
POST /api/messages/42/dismiss HTTP/1.1
Host: tickedify.com
Cookie: session=abc123...
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Message dismissed"
}
```

**Backend Behavior**:
```javascript
app.post('/api/messages/:id/dismiss', async (req, res) => {
    const userId = req.session.userId;
    const messageId = req.params.id;

    const query = `
        INSERT INTO message_interactions (message_id, user_id, dismissed, dismissed_at)
        VALUES ($1, $2, TRUE, NOW())
        ON CONFLICT (message_id, user_id)
        DO UPDATE SET dismissed = TRUE, dismissed_at = NOW()
    `;

    await db.query(query, [messageId, userId]);

    res.json({ success: true, message: 'Message dismissed' });
});
```

**✅ Works for all trigger types** - No special handling needed for `next_page_visit`

---

## Frontend Integration Requirements

### Message Polling (app.html or shared JS)

**Current Implementation** (simplified):
```javascript
// Existing code
async function fetchMessages() {
    const response = await fetch('/api/messages/unread');
    const data = await response.json();
    displayMessages(data.messages);
}

setInterval(fetchMessages, 30000); // Poll every 30 seconds
```

**NEW Implementation** (with page parameter):
```javascript
// Modified code
async function fetchMessages() {
    const page = window.location.pathname; // e.g., '/planning'
    const response = await fetch(`/api/messages/unread?page=${encodeURIComponent(page)}`);
    const data = await response.json();
    displayMessages(data.messages);
}

setInterval(fetchMessages, 30000); // Poll every 30 seconds

// Also fetch on page navigation (if SPA-like behavior)
window.addEventListener('popstate', fetchMessages);
```

**Key Changes**:
- ✅ Add `?page=${pathname}` to API call
- ✅ URL-encode pathname for safety
- ✅ Trigger fetch on page navigation events (if applicable)

---

### Admin Form (admin2.html)

**Current Implementation** (simplified):
```html
<form id="createMessageForm">
    <input type="text" name="title" required>
    <textarea name="message" required></textarea>
    <select name="trigger_type" required>
        <option value="immediate">⚡ Direct</option>
        <option value="days_after_signup">📅 X dagen na signup</option>
    </select>
    <button type="submit">Aanmaken</button>
</form>
```

**NEW Implementation** (with page selector):
```html
<form id="createMessageForm">
    <input type="text" name="title" required>
    <textarea name="message" required></textarea>

    <select name="trigger_type" id="triggerType" required>
        <option value="immediate">⚡ Direct</option>
        <option value="days_after_signup">📅 X dagen na signup</option>
        <option value="next_page_visit">📍 Volgend bezoek aan pagina</option>
    </select>

    <!-- NEW: Page selector (shown only for next_page_visit) -->
    <div id="pageSelector" style="display: none;">
        <label for="pageSelect">Selecteer pagina:</label>
        <select name="trigger_value" id="pageSelect">
            <option value="/app">Hoofdapplicatie</option>
            <option value="/planning">Dagelijkse Planning</option>
            <option value="/taken">Takenlijst</option>
            <option value="/actielijst">Actielijst</option>
            <option value="/profiel">Profiel</option>
        </select>
    </div>

    <button type="submit">Aanmaken</button>
</form>

<script>
// Show/hide page selector based on trigger type
document.getElementById('triggerType').addEventListener('change', (e) => {
    const pageSelector = document.getElementById('pageSelector');
    pageSelector.style.display = e.target.value === 'next_page_visit' ? 'block' : 'none';

    const pageSelect = document.getElementById('pageSelect');
    pageSelect.required = e.target.value === 'next_page_visit';
});
</script>
```

**Key Changes**:
- ✅ Add "📍 Volgend bezoek aan pagina" option to trigger type dropdown
- ✅ Add page selector dropdown (hidden by default)
- ✅ Show page selector only when next_page_visit selected
- ✅ Make page selector required when next_page_visit selected

---

## API Contract Testing Checklist

### GET /api/messages/unread

**Test Scenarios**:
- [ ] Request without `page` parameter returns non-page-specific messages
- [ ] Request with `page=/planning` returns planning-specific + global messages
- [ ] Request with `page=/taken` returns only taken-specific + global messages
- [ ] Request with `page=/unknown` returns only global messages (no matches)
- [ ] Request with invalid `page` format returns 400 error
- [ ] Dismissed messages excluded from response
- [ ] Expired messages excluded from response
- [ ] Inactive messages excluded from response
- [ ] Response format matches existing structure (backwards compatible)

### POST /api/admin/messages

**Test Scenarios**:
- [ ] Creating `next_page_visit` message with valid page succeeds
- [ ] Creating `next_page_visit` message without trigger_value returns 400
- [ ] Creating `next_page_visit` message with invalid page format returns 400
- [ ] Creating `next_page_visit` message with unknown page returns 400
- [ ] Creating other trigger types (immediate, etc.) still works
- [ ] Non-admin user gets 401 error
- [ ] Missing title/message returns 422 error

### POST /api/messages/:id/dismiss

**Test Scenarios**:
- [ ] Dismissing `next_page_visit` message works identically to other types
- [ ] Dismissed `next_page_visit` message no longer appears in subsequent GET requests
- [ ] Dismiss action creates/updates message_interactions record

---

## Performance Considerations

**Query Performance**:
- Expected: <200ms for GET /api/messages/unread (current baseline ~50-100ms)
- Acceptable: <300ms (<5% overhead target)
- WHERE clause extension minimal impact (simple string comparison)

**Monitoring**:
```javascript
// Add timing logs
const startTime = Date.now();
const result = await db.query(query, params);
const duration = Date.now() - startTime;
console.log(`📊 Messages query took ${duration}ms for user ${userId}, page ${page}`);
```

**Optimization if needed**:
- Add composite index on `(trigger_type, trigger_value)` if queries slow
- Cache page list in memory (avoid repeated array lookups)

---

## Error Handling

**Client-Side**:
```javascript
async function fetchMessages() {
    try {
        const page = window.location.pathname;
        const response = await fetch(`/api/messages/unread?page=${encodeURIComponent(page)}`);

        if (!response.ok) {
            console.error('Failed to fetch messages:', response.status);
            return;
        }

        const data = await response.json();
        displayMessages(data.messages);
    } catch (error) {
        console.error('Message fetch error:', error);
        // Fail silently - messages not critical for app functionality
    }
}
```

**Server-Side**:
```javascript
app.get('/api/messages/unread', async (req, res) => {
    try {
        // ... query logic ...
    } catch (error) {
        console.error('Messages query error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
```

---

## Summary

**API Changes**:
- ✅ **2 modified endpoints** (GET /api/messages/unread, POST /api/admin/messages)
- ✅ **0 new endpoints** (extends existing infrastructure)
- ✅ **Backwards compatible** (optional page parameter, existing triggers unchanged)
- ✅ **Minimal complexity** (simple validation + WHERE clause extension)

**Frontend Requirements**:
- ✅ Add `?page=` parameter to message polling
- ✅ Add page selector dropdown to admin form
- ✅ Show/hide page selector based on trigger type

**Testing Priority**:
- 🔴 **High**: Page filtering logic (must only show correct page messages)
- 🟡 **Medium**: Admin validation (prevent invalid page identifiers)
- 🟢 **Low**: Error handling (fail gracefully, messages non-critical)

---

**API Contract Complete**: 2025-10-24
**Ready for Quickstart Test Scenarios** (Phase 1 next step)
