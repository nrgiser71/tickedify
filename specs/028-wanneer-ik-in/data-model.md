# Data Model: Real-time Bericht Notificatie bij Navigatie

**Feature**: 028-wanneer-ik-in
**Date**: 2025-10-23

---

## Overview

Dit document beschrijft de data entities voor real-time bericht notificaties. **Deze feature vereist GEEN database wijzigingen** - alle benodigde entities bestaan al vanuit feature 026-lees-messaging-system.

---

## Existing Entities (No Changes Required)

### Entity 1: AdminMessage

**Table**: `admin_messages`
**Source**: Feature 026-lees-messaging-system
**Purpose**: Opslag van admin berichten met scheduling functionaliteit

**Relevante Fields voor deze Feature**:

| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Unieke message identifier |
| title | VARCHAR(255) NOT NULL | Message titel |
| message | TEXT NOT NULL | Message content (markdown supported) |
| message_type | VARCHAR(50) DEFAULT 'information' | Type: information, educational, warning, etc. |
| dismissible | BOOLEAN DEFAULT TRUE | Of gebruiker bericht kan sluiten |
| snoozable | BOOLEAN DEFAULT TRUE | Of gebruiker bericht kan snoozen |
| **display_at** | **TIMESTAMP DEFAULT NOW()** | **⚡ KEY FIELD: Wanneer bericht zichtbaar wordt** |
| expires_at | TIMESTAMP NULL | Wanneer bericht verloopt (NULL = never) |
| active | BOOLEAN DEFAULT TRUE | Of bericht actief is |
| button_label | VARCHAR(100) NULL | Optionele action button |
| button_action | VARCHAR(50) NULL | Button type: 'navigate' of 'external' |
| button_target | TEXT NULL | Button target: path of URL |

**Business Logic**:
```sql
-- Message is klaar om getoond te worden wanneer:
WHERE active = true
  AND display_at <= NOW()  -- ⚡ Scheduled time has passed
  AND (expires_at IS NULL OR expires_at > NOW())
```

**Geen wijzigingen nodig**: `display_at` field bestaat al en wordt correct gefilterd door backend.

---

### Entity 2: MessageInteraction

**Table**: `message_interactions`
**Source**: Feature 026-lees-messaging-system
**Purpose**: Tracking van user interacties om duplicaten te voorkomen

**Relevante Fields voor deze Feature**:

| Field | Type | Description |
|-------|------|-------------|
| message_id | INTEGER REFERENCES admin_messages(id) | Bericht ID (composite PK) |
| user_id | INTEGER REFERENCES users(id) | User ID (composite PK) |
| **dismissed** | **BOOLEAN DEFAULT FALSE** | **⚡ KEY FIELD: Voorkomt duplicate display** |
| snoozed_until | TIMESTAMP NULL | Tot wanneer snoozed (NULL = not snoozed) |
| first_shown_at | TIMESTAMP DEFAULT NOW() | Eerste keer getoond |
| last_shown_at | TIMESTAMP DEFAULT NOW() | Laatste keer getoond |
| shown_count | INTEGER DEFAULT 1 | Aantal keer getoond |

**Composite Primary Key**: `(message_id, user_id)`

**Business Logic**:
```sql
-- User heeft bericht NIET gezien wanneer:
LEFT JOIN message_interactions mi
  ON am.id = mi.message_id AND mi.user_id = $1
WHERE (mi.dismissed IS NULL OR mi.dismissed = FALSE)  -- ⚡ Not dismissed
  AND (mi.snoozed_until IS NULL OR mi.snoozed_until <= NOW())
```

**Geen wijzigingen nodig**: Dismissed tracking werkt perfect voor duplicate prevention.

---

## Data Flow voor deze Feature

### Flow 1: Scheduled Message Display

```
Admin creates message
  ↓
Sets display_at = NOW() + 5 minutes
  ↓
Message saved in admin_messages table
  ↓
User navigates between pages
  ↓
Each page load: DOMContentLoaded triggers checkForMessages()
  ↓
GET /api/messages/unread called
  ↓
Backend query:
  SELECT * FROM admin_messages am
  LEFT JOIN message_interactions mi ...
  WHERE display_at <= NOW()  -- ⚡ Scheduled time check
    AND dismissed = FALSE
  ↓
Frontend receives messages array
  ↓
showMessage() displays in modal
```

### Flow 2: Dismiss Prevents Duplicate

```
User sees message on Page A
  ↓
User clicks "Got it" (dismiss button)
  ↓
POST /api/messages/{id}/dismiss
  ↓
Backend updates:
  INSERT INTO message_interactions (message_id, user_id, dismissed)
  VALUES ($1, $2, true)
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET dismissed = true
  ↓
User navigates to Page B
  ↓
DOMContentLoaded → checkForMessages()
  ↓
Backend query excludes dismissed messages
  ↓
No message shown (dismissed = true filter)
```

### Flow 3: Multiple Scheduled Messages

```
Admin creates 3 messages:
  - Message A: display_at = NOW() + 2 min
  - Message B: display_at = NOW() + 5 min
  - Message C: display_at = NOW() + 10 min
  ↓
After 6 minutes, user navigates:
  ↓
Backend query returns:
  - Message A (2 min passed) ✅
  - Message B (5 min passed) ✅
  - Message C (10 min NOT passed) ❌
  ↓
Frontend shows carousel: "1 / 2"
  ↓
User can navigate between A and B
```

---

## State Transitions

### Message State Lifecycle

```
[CREATED]
   ↓
[SCHEDULED] (display_at > NOW)
   ↓
   ⏰ display_at time reached
   ↓
[READY TO SHOW] (display_at <= NOW, not dismissed)
   ↓
   👁️ User sees message
   ↓
[SHOWN] (first_shown_at set, shown_count++)
   ↓
   ✅ User dismisses
   ↓
[DISMISSED] (dismissed = true)
   ↓
   🔁 Future navigations
   ↓
[HIDDEN] (filtered out by backend query)
```

### Alternative Paths

```
[READY TO SHOW]
   ↓
   😴 User snoozes for 1 hour
   ↓
[SNOOZED] (snoozed_until = NOW + 1 hour)
   ↓
   ⏰ Snooze expires
   ↓
[READY TO SHOW] (snoozed_until < NOW)
```

---

## Queries Used by Feature

### Query 1: Get Unread Messages (Existing)

**Endpoint**: `GET /api/messages/unread`
**Source**: server.js (implemented in 026-lees-messaging-system)

```sql
SELECT am.*,
       mi.dismissed,
       mi.snoozed_until,
       mi.shown_count
FROM admin_messages am
LEFT JOIN message_interactions mi
  ON am.id = mi.message_id AND mi.user_id = $1
WHERE am.active = true
  AND am.display_at <= NOW()  -- ⚡ Scheduled check
  AND (am.expires_at IS NULL OR am.expires_at > NOW())
  AND (mi.dismissed IS NULL OR mi.dismissed = FALSE)
  AND (mi.snoozed_until IS NULL OR mi.snoozed_until <= NOW())
  -- Additional targeting filters (all/filtered/specific_users)
ORDER BY am.display_at DESC, am.created_at DESC
```

**Performance**: Indexed on `(active, display_at, expires_at)`

### Query 2: Dismiss Message (Existing)

**Endpoint**: `POST /api/messages/:messageId/dismiss`
**Source**: server.js (implemented in 026-lees-messaging-system)

```sql
INSERT INTO message_interactions (message_id, user_id, dismissed, first_shown_at, last_shown_at)
VALUES ($1, $2, true, NOW(), NOW())
ON CONFLICT (message_id, user_id)
DO UPDATE SET
  dismissed = true,
  last_shown_at = NOW(),
  shown_count = message_interactions.shown_count + 1
```

**Upsert Logic**: Handles both nieuwe en bestaande interactions

---

## Validation Rules (Existing)

**From Feature Spec 026-lees-messaging-system**:
- FR-001: title en message zijn verplicht
- FR-002: message_type must be valid enum value
- NFR-008: message content max 10,000 characters
- Business rule: display_at can be past, present, or future
- Business rule: expired messages (expires_at < NOW) never shown

**Geen nieuwe validation rules** voor deze feature.

---

## Edge Cases Handled by Existing Schema

### Edge Case 1: Message Scheduled in Past
**Scenario**: Admin sets display_at = 1 hour ago
**Behavior**: Message appears immediately on next navigation
**Query**: `WHERE display_at <= NOW()` returns true

### Edge Case 2: Simultaneous Messages
**Scenario**: 3 messages all have display_at = same timestamp
**Behavior**: All shown in carousel
**Query**: ORDER BY ensures deterministic order

### Edge Case 3: User Dismisses Then Message Updated
**Scenario**: Admin updates message content after user dismissed
**Behavior**: Message stays dismissed (dismissed linked to message_id)
**Design Decision**: Intentional - dismissed = user doesn't want to see it

### Edge Case 4: Message Expires While User Viewing
**Scenario**: User opens modal, message expires_at passes
**Behavior**: Message stays visible until dismissed/closed
**Rationale**: Don't interrupt user mid-read

---

## Data Integrity Constraints

**Foreign Keys**:
```sql
message_interactions.message_id → admin_messages.id ON DELETE CASCADE
message_interactions.user_id → users.id ON DELETE CASCADE
```

**Cascade Behavior**:
- Message deleted → all interactions deleted
- User deleted → all their interactions deleted

**Composite Primary Key**:
```sql
PRIMARY KEY (message_id, user_id)
```
Ensures: 1 interaction record per message per user

---

## Performance Considerations

### Indexes (Existing)
```sql
CREATE INDEX idx_admin_messages_active
  ON admin_messages(active);

CREATE INDEX idx_admin_messages_display_expires
  ON admin_messages(display_at, expires_at);

CREATE INDEX idx_message_interactions_lookup
  ON message_interactions(message_id, user_id);
```

**Query Performance**:
- Indexed WHERE clauses: <10ms for thousands of messages
- JOIN performance: O(1) lookup via composite key
- No N+1 queries: Single query fetches all data

### Scalability
- **Current**: Single beta user (jan@buskens.be)
- **Future**: 1000+ users, 100+ messages
- **Bottleneck**: None - indexed queries scale linearly

---

## Frontend State Management

**JavaScript Objects** (message-modal.js):

```javascript
// Global state
let currentMessages = [];      // Array of message objects from API
let currentMessageIndex = 0;   // Current position in carousel

// Message object structure (from API response)
{
  id: 123,
  title: "Welcome!",
  message: "Hello world",
  message_type: "information",
  display_at: "2025-10-23T14:30:00Z",
  dismissible: true,
  snoozable: true,
  button_label: null,
  button_action: null,
  button_target: null,
  // From JOIN
  dismissed: false,
  snoozed_until: null,
  shown_count: 1
}
```

**No localStorage needed**: Database is source of truth

---

## Success Criteria

### Functional Requirements Met
- ✅ FR-001: Check on navigation (DOMContentLoaded trigger)
- ✅ FR-002: Only display_at <= NOW messages (backend query filter)
- ✅ FR-003: Direct display without refresh (checkForMessages() on load)
- ✅ FR-004: Prevent duplicates (dismissed tracking in DB)
- ✅ FR-005: Consistent modal styling (showMessage() reuse)
- ✅ FR-007: Track shown messages (message_interactions table)

### Data Integrity
- ✅ No duplicate messages per user (composite PK)
- ✅ Cascade deletes handle cleanup
- ✅ Timezone handling via PostgreSQL TIMESTAMP
- ✅ Null safety in queries (LEFT JOIN, IS NULL checks)

---

## No Schema Changes Required ✅

**Conclusion**: Alle benodigde data entities en queries bestaan al vanuit feature 026-lees-messaging-system. Deze feature is pure frontend logic die existing backend API gebruikt.

---

**Phase 1 Data Model Complete** ✅
