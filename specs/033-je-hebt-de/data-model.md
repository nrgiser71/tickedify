# Data Model: "Volgend Bezoek Aan Pagina" Bericht Trigger

**Feature**: 033-je-hebt-de
**Created**: 2025-10-24
**Status**: Complete - No schema changes required

## Overview

This feature reuses existing database tables and columns. **No database migrations are required.** The existing `admin_messages` table already supports the new trigger type via its VARCHAR(50) `trigger_type` column and `trigger_value` field for storing the page identifier.

---

## Existing Tables (Reused)

### admin_messages

**Purpose**: Stores admin-created messages with various trigger types

**Relevant Columns for This Feature**:
```sql
CREATE TABLE admin_messages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,  -- NEW VALUE: 'next_page_visit'
    trigger_value VARCHAR(255),         -- USAGE: stores page pathname (e.g., '/planning')
    active BOOLEAN DEFAULT TRUE,
    publish_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Feature 033 Usage**:
- `trigger_type` = `'next_page_visit'` (new value, no schema change)
- `trigger_value` = Page pathname like `'/planning'`, `'/taken'`, `'/actielijst'`
- All other columns used identically to existing triggers

**Example Row**:
```sql
INSERT INTO admin_messages (title, message, trigger_type, trigger_value, active)
VALUES (
    'Nieuwe filter toegevoegd',
    'We hebben een nieuwe filter functie toegevoegd aan de dagelijkse planning!',
    'next_page_visit',
    '/planning',
    TRUE
);
```

---

### message_interactions

**Purpose**: Tracks user interactions with messages (dismiss, snooze)

**Relevant Columns**:
```sql
CREATE TABLE message_interactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES admin_messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    first_shown_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);
```

**Feature 033 Usage**:
- ✅ Used identically to existing triggers
- `dismissed = TRUE` prevents message from showing again
- No changes to this table's structure or usage

---

### user_page_visits (Optional Reference)

**Purpose**: Tracks which users have visited which pages (used by other triggers)

**Note**: This feature does NOT require querying this table, but it exists for reference.

**Columns**:
```sql
CREATE TABLE user_page_visits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    page_path VARCHAR(255) NOT NULL,
    visit_count INTEGER DEFAULT 1,
    first_visited_at TIMESTAMPTZ DEFAULT NOW(),
    last_visited_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Feature 033 Usage**:
- ❌ NOT used for "next_page_visit" trigger evaluation
- Reason: We trigger on "next visit AFTER message creation", not based on visit history
- This table tracks visit history for `first_page_visit` and `nth_page_visit` triggers

---

## Data Flow Diagram

```
┌─────────────┐
│   Admin     │
│ (admin2.html)│
└──────┬──────┘
       │ POST /api/admin/messages
       │ { trigger_type: 'next_page_visit',
       │   trigger_value: '/planning', ... }
       ▼
┌─────────────────────┐
│  admin_messages     │
│  trigger_type=      │
│  'next_page_visit'  │
│  trigger_value=     │
│  '/planning'        │
└─────────────────────┘
       │
       │ User visits /planning
       │ GET /api/messages/unread?page=/planning
       ▼
┌─────────────────────┐
│  Backend Filtering  │
│  WHERE trigger_type │
│  = 'next_page_visit'│
│  AND trigger_value  │
│  = '/planning'      │
└─────────────────────┘
       │
       │ Message shown to user
       │ User clicks "Got it"
       │ POST /api/messages/:id/dismiss
       ▼
┌─────────────────────┐
│ message_interactions│
│ dismissed = TRUE    │
└─────────────────────┘
```

---

## Entity Definitions

### Message (admin_messages table)

**Purpose**: Represents an admin-created message with trigger configuration

**Attributes for Feature 033**:
| Field          | Type          | Description                                      | Example                  |
|----------------|---------------|--------------------------------------------------|--------------------------|
| id             | SERIAL        | Unique message identifier                        | 42                       |
| title          | VARCHAR(255)  | Message title                                    | "Nieuwe filter"          |
| message        | TEXT          | Message content (markdown supported)             | "We hebben een..."       |
| trigger_type   | VARCHAR(50)   | **NEW VALUE**: `'next_page_visit'`              | `'next_page_visit'`      |
| trigger_value  | VARCHAR(255)  | **Page pathname** for this trigger               | `'/planning'`            |
| active         | BOOLEAN       | Whether message is active                        | TRUE                     |
| publish_at     | TIMESTAMPTZ   | When to start showing message                    | NOW()                    |
| expires_at     | TIMESTAMPTZ   | Optional expiry (NULL = never)                   | NULL or future timestamp |

**Validation Rules**:
- `trigger_type = 'next_page_visit'` → `trigger_value` MUST be a valid page pathname
- `trigger_value` MUST start with `/` (e.g., `/planning`, not `planning`)
- `trigger_value` MUST match known pages (validated in admin UI dropdown)

**Lifecycle**:
1. Created by admin via POST /api/admin/messages
2. Evaluated by GET /api/messages/unread when user visits matching page
3. Dismissed by user via POST /api/messages/:id/dismiss
4. Can be updated/deleted by admin

---

### MessageInteraction (message_interactions table)

**Purpose**: Tracks user-specific interaction with a message

**Attributes**:
| Field           | Type        | Description                              | Example         |
|-----------------|-------------|------------------------------------------|-----------------|
| id              | SERIAL      | Unique interaction identifier            | 123             |
| message_id      | INTEGER     | References admin_messages.id             | 42              |
| user_id         | INTEGER     | References users.id                      | 5               |
| dismissed       | BOOLEAN     | User clicked "Got it"                    | TRUE            |
| dismissed_at    | TIMESTAMPTZ | When dismissed                           | 2025-10-24T...  |
| first_shown_at  | TIMESTAMPTZ | First time shown to user                 | 2025-10-24T...  |

**Constraints**:
- UNIQUE(message_id, user_id) - One interaction record per user per message
- ON DELETE CASCADE for both foreign keys

**Lifecycle**:
1. Created with `dismissed = FALSE` when message first shown to user
2. Updated to `dismissed = TRUE` when user clicks "Got it"
3. Prevents message from showing again to that user

---

## Validation Rules

### Backend Validation (server.js)

**When Creating Message** (POST /api/admin/messages):
```javascript
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
```

**When Fetching Messages** (GET /api/messages/unread):
```javascript
// Page parameter validation
if (page && !page.startsWith('/')) {
    return res.status(400).json({
        error: 'Page parameter must start with / (e.g., /planning)'
    });
}

// SQL filtering
WHERE (
    m.trigger_type = 'next_page_visit'
    AND m.trigger_value = $page_param
)
```

---

### Frontend Validation (admin2.html)

**Admin Form Validation**:
- Dropdown ensures only valid pages can be selected
- No free text input (prevents typos)
- Page field required when trigger_type = "next_page_visit"
- Form submission blocked if page not selected

**User Message Polling**:
- Always send current pathname in `?page=` parameter
- URL-encode pathname to handle special characters
- Graceful handling if page parameter missing (shows non-page-specific messages only)

---

## Indexing Recommendations

**Current State**: No new indexes required initially

**Performance Monitoring**:
- Monitor query performance on GET /api/messages/unread
- Expected <200ms response time (current baseline ~50-100ms)
- Acceptable: <300ms (< 5% overhead target)

**Future Optimization** (if queries slow down):
```sql
-- Composite index on trigger_type + trigger_value
CREATE INDEX idx_messages_trigger_type_value
ON admin_messages(trigger_type, trigger_value)
WHERE active = TRUE;

-- Composite index on message_interactions for faster dismiss checks
CREATE INDEX idx_interactions_user_dismissed
ON message_interactions(user_id, message_id)
WHERE dismissed = TRUE;
```

**When to Add Indexes**:
- ⏳ Wait until >100 messages in admin_messages table
- ⏳ Wait until query times exceed 200ms consistently
- ⏳ Current scale doesn't require optimization yet

---

## Migration Status

**Schema Changes**: ✅ NONE REQUIRED

**Why No Migration Needed**:
1. `trigger_type` column already VARCHAR(50) - accommodates 'next_page_visit'
2. `trigger_value` column already VARCHAR(255) - accommodates page paths
3. `message_interactions` table unchanged - works identically
4. No new tables needed
5. No column additions or modifications

**Compatibility**:
- ✅ Backwards compatible with all existing triggers
- ✅ Existing queries work unchanged (OR clauses in WHERE)
- ✅ No breaking changes to database schema
- ✅ BÈTA FREEZE compliant (no production database risk)

---

## Test Data Examples

### Test Message 1: Planning Page Feature Announcement
```sql
INSERT INTO admin_messages (title, message, trigger_type, trigger_value)
VALUES (
    'Nieuwe filter functionaliteit',
    'We hebben filtering toegevoegd aan de dagelijkse planning. Probeer het uit!',
    'next_page_visit',
    '/planning'
);
```

### Test Message 2: Task List Update
```sql
INSERT INTO admin_messages (title, message, trigger_type, trigger_value)
VALUES (
    'Bulk acties beschikbaar',
    'Je kunt nu meerdere taken tegelijk bewerken in de takenlijst.',
    'next_page_visit',
    '/taken'
);
```

### Test Message 3: Action List Enhancement
```sql
INSERT INTO admin_messages (title, message, trigger_type, trigger_value)
VALUES (
    'Prioriteiten sortering geüpdatet',
    'De actielijst sorteert nu automatisch op prioriteit en deadline.',
    'next_page_visit',
    '/actielijst'
);
```

### Test Interaction: User Dismisses Message
```sql
INSERT INTO message_interactions (message_id, user_id, dismissed, dismissed_at)
VALUES (42, 5, TRUE, NOW());
```

---

## Queries for Debugging

### Find All next_page_visit Messages
```sql
SELECT id, title, trigger_value AS page, active, created_at
FROM admin_messages
WHERE trigger_type = 'next_page_visit'
ORDER BY created_at DESC;
```

### Find Messages User Has NOT Dismissed
```sql
SELECT m.id, m.title, m.trigger_value, m.trigger_type
FROM admin_messages m
LEFT JOIN message_interactions mi
    ON m.id = mi.message_id AND mi.user_id = 5
WHERE m.active = TRUE
    AND m.trigger_type = 'next_page_visit'
    AND (mi.dismissed IS NULL OR mi.dismissed = FALSE);
```

### Check Message Interaction Status
```sql
SELECT
    m.title,
    m.trigger_value AS page,
    mi.dismissed,
    mi.dismissed_at,
    mi.first_shown_at
FROM admin_messages m
LEFT JOIN message_interactions mi ON m.id = mi.message_id
WHERE m.trigger_type = 'next_page_visit'
    AND mi.user_id = 5;
```

---

## Summary

**Database Impact**:
- ✅ Zero schema changes required
- ✅ Reuses existing `admin_messages` table
- ✅ Reuses existing `message_interactions` table
- ✅ No migrations, no downtime, no rollback risk

**Validation**:
- ✅ Backend validates page identifier format
- ✅ Frontend dropdown prevents invalid pages
- ✅ SQL constraints unchanged

**Performance**:
- ✅ Expected <5% overhead on existing queries
- ✅ No indexes needed initially (monitor at scale)
- ✅ Query pattern identical to existing triggers

---

**Data Model Complete**: 2025-10-24
**Ready for API Contract Generation** (Phase 1 next step)
