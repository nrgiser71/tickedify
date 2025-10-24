# Data Model: "Volgende Keer" Bericht Trigger

**Feature**: 032-bij-het-maken
**Date**: 2025-10-24
**Status**: Complete

## Overview

Dit document beschrijft de data model voor de "next_time" trigger feature. Belangrijk: **GEEN database schema wijzigingen nodig**. Bestaande tabellen accommoderen de nieuwe trigger type volledig.

## Existing Database Schema (Unchanged)

### Table: admin_messages

**Purpose**: Stores all admin-created messages with trigger configuration

**Schema** (bestaat al, GEEN wijzigingen):
```sql
CREATE TABLE admin_messages (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'information',
  target_type VARCHAR(50) DEFAULT 'all',
  target_subscription VARCHAR(50)[],
  target_search TEXT,
  target_users VARCHAR(50)[],
  trigger_type VARCHAR(50) DEFAULT 'immediate',      -- ✓ Accommodeert 'next_time'
  trigger_value TEXT,
  dismissible BOOLEAN DEFAULT TRUE,
  snoozable BOOLEAN DEFAULT TRUE,
  snooze_durations INTEGER[] DEFAULT ARRAY[3600, 14400, 86400],
  publish_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  button_label VARCHAR(100),
  button_action VARCHAR(50),
  button_target TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),                -- ✓ Gebruikt voor "next time" logica
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes** (bestaan al):
```sql
CREATE INDEX idx_admin_messages_active ON admin_messages(active);
CREATE INDEX idx_admin_messages_publish_expires ON admin_messages(publish_at, expires_at);
```

**New Trigger Type Value**:
- `trigger_type = 'next_time'` - Nieuwe waarde (bestaande: 'immediate', 'page_visit_count')
- `trigger_value = NULL` - Niet gebruikt voor next_time trigger
- `created_at` - Kritiek veld: bepaalt "na welk moment" = "volgende keer"

---

### Table: message_interactions

**Purpose**: Tracks user interactions with messages (views, dismissals, snoozes)

**Schema** (bestaat al, perfect herbruikbaar):
```sql
CREATE TABLE message_interactions (
  message_id INTEGER REFERENCES admin_messages(id) ON DELETE CASCADE,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  snoozed_until TIMESTAMP,
  dismissed BOOLEAN DEFAULT FALSE,                   -- ✓ Gebruikt voor "next_time" filtering
  first_shown_at TIMESTAMP DEFAULT NOW(),
  last_shown_at TIMESTAMP DEFAULT NOW(),
  shown_count INTEGER DEFAULT 1,
  button_clicked BOOLEAN DEFAULT FALSE,
  button_clicked_at TIMESTAMP,
  PRIMARY KEY (message_id, user_id)
);
```

**Indexes** (bestaan al):
```sql
CREATE INDEX idx_message_interactions_user ON message_interactions(user_id);
CREATE INDEX idx_message_interactions_status ON message_interactions(user_id, dismissed, snoozed_until);
```

**Usage for "next_time" trigger**:
- `dismissed = FALSE` OR `message_id IS NULL` → User ziet bericht
- `dismissed = TRUE` → User ziet bericht NIET meer
- Geen nieuwe kolommen nodig

---

### Table: user_page_visits

**Purpose**: Tracks page visits (voor page_visit_count trigger)

**Not Used**: "next_time" trigger gebruikt deze tabel NIET. Message verschijnt onafhankelijk van page visits.

---

## Data Relationships

```
admin_messages (1) ──< (N) message_interactions
     ↓                           ↓
  trigger_type              dismissed flag
  = 'next_time'            = TRUE/FALSE
  created_at timestamp      (herbruikt!)
```

**Trigger Evaluation Logic**:
```sql
-- Voor een specifieke user, vind alle "next_time" berichten die getoond moeten worden:
SELECT m.*
FROM admin_messages m
LEFT JOIN message_interactions mi
  ON m.id = mi.message_id AND mi.user_id = $user_id
WHERE m.trigger_type = 'next_time'
  AND m.active = TRUE
  AND m.publish_at <= NOW()
  AND (m.expires_at IS NULL OR m.expires_at > NOW())
  AND (mi.message_id IS NULL OR mi.dismissed = FALSE)
ORDER BY m.created_at ASC;
```

**Key Insight**:
- `mi.message_id IS NULL` → User heeft bericht nog nooit gezien → TOON
- `mi.dismissed = FALSE` → User heeft gezien maar niet dismissed → TOON
- `mi.dismissed = TRUE` → User heeft dismissed → VERBERG

---

## State Transitions

### Message Lifecycle (Admin Perspective)

```
[Created] → trigger_type = 'next_time', active = TRUE, publish_at = NOW()
    ↓
[Active] → Bericht is klaar om getoond te worden bij "next visit"
    ↓
[Edited] → updated_at changes, maar message_id blijft hetzelfde
            User interactions blijven intact (dismissed users zien update NIET)
    ↓
[Deactivated] → active = FALSE (admin toggles off)
    ↓
[Expired] → expires_at < NOW() (optioneel)
    ↓
[Deleted] → CASCADE delete removes all message_interactions
```

### User Interaction Lifecycle

```
User opens app → Polling checks /api/messages/unread
    ↓
Backend evaluates: created_at < NOW() AND (no interaction OR dismissed = FALSE)
    ↓
[Show Message] → Create/update message_interactions record
                 first_shown_at, last_shown_at, shown_count++
    ↓
User clicks "Got it" → dismissed = TRUE
    ↓
[Never Show Again] → Message filtered out in future queries
```

**Special Cases**:
- **Page refresh zonder dismiss**: Bericht blijft verschijnen (shown_count++, last_shown_at updated)
- **Multiple sessions**: dismissed status blijft over sessions (persistent in DB)
- **Message edit na dismiss**: User ziet update NIET (dismissed = TRUE blijft staan)

---

## Validation Rules

### Message Creation (Admin)

**Required Fields**:
- `title`: VARCHAR(255), NOT NULL
- `message`: TEXT, NOT NULL
- `trigger_type`: VARCHAR(50), DEFAULT 'immediate'

**Validation for "next_time" trigger**:
```javascript
if (trigger_type === 'next_time') {
  // No special validation needed
  // trigger_value can be NULL
  // publish_at defaults to NOW() or can be scheduled for future
}
```

**Constraints**:
- `publish_at` MUST be <= NOW() voor bericht om actief te zijn
- `expires_at` optioneel, MUST be > NOW() als ingesteld
- `active` MUST be TRUE voor bericht om getoond te worden

### Message Interaction (User)

**Constraints**:
- `message_id` MUST reference existing admin_messages.id
- `user_id` MUST reference existing users.id
- `dismissed` kan alleen TRUE worden (nooit terug naar FALSE)

---

## Data Integrity

**Cascade Deletes**:
- Delete message → CASCADE delete all message_interactions (behouden)
- Delete user → CASCADE delete all message_interactions (behouden)

**No Orphans**:
- message_interactions.message_id heeft FOREIGN KEY constraint
- message_interactions.user_id heeft FOREIGN KEY constraint

**Idempotency**:
- Dismiss actie is idempotent: dismissed = TRUE kan meerdere keren gezet worden
- Message creation heeft SERIAL PRIMARY KEY voor unieke IDs

---

## Performance Considerations

**Query Optimization**:
- Index op `admin_messages(active, publish_at, expires_at)` → Bestaande index OK
- Index op `message_interactions(user_id, dismissed)` → Bestaande index OK
- LEFT JOIN efficiënt: Most users hebben 0-10 interactions

**Estimated Query Performance**:
- GET /api/messages/unread: < 50ms (single user query met indexes)
- Polling interval: 5 minuten → Very low DB load
- Typical dataset: < 20 active messages, < 1000 interaction records

**Scalability**:
- Current scale: Bèta users (~10-50 users)
- Design supports: Thousands of users without schema changes
- Bottleneck: None at current/projected scale

---

## Migration Strategy

**Database Migrations**:
✅ **NONE REQUIRED** - Bestaande schema accommodeert feature volledig

**Data Migration**:
✅ **NOT APPLICABLE** - Geen bestaande data wijzigingen nodig

**Backwards Compatibility**:
✅ **FULLY COMPATIBLE** - Bestaande messages blijven ongewijzigd functioneren

---

## Testing Data

**Test Message Examples**:
```sql
-- Test 1: Basic "next_time" message
INSERT INTO admin_messages (title, message, trigger_type, publish_at)
VALUES ('Feature Update', 'We hebben een nieuwe filter toegevoegd!', 'next_time', NOW());

-- Test 2: Scheduled "next_time" message (future publish)
INSERT INTO admin_messages (title, message, trigger_type, publish_at)
VALUES ('Upcoming Feature', 'Next week: drag & drop verbeteringen', 'next_time', NOW() + INTERVAL '7 days');

-- Test 3: Expiring "next_time" message
INSERT INTO admin_messages (title, message, trigger_type, publish_at, expires_at)
VALUES ('Limited Offer', 'Probeer premium deze week!', 'next_time', NOW(), NOW() + INTERVAL '7 days');
```

**Test Interaction Examples**:
```sql
-- User dismisses message
INSERT INTO message_interactions (message_id, user_id, dismissed)
VALUES (123, 'user-abc-123', TRUE)
ON CONFLICT (message_id, user_id) DO UPDATE SET dismissed = TRUE;

-- Check if user should see message
SELECT COUNT(*) FROM admin_messages m
LEFT JOIN message_interactions mi ON m.id = mi.message_id AND mi.user_id = 'user-abc-123'
WHERE m.trigger_type = 'next_time'
  AND m.active = TRUE
  AND (mi.message_id IS NULL OR mi.dismissed = FALSE);
-- Expected: 0 if dismissed, 1+ if not dismissed
```

---

## Summary

**No Schema Changes Required** ✅
- Bestaande admin_messages.trigger_type accommodeert 'next_time' waarde
- Bestaande message_interactions.dismissed perfect voor tracking
- Bestaande indexes voldoende voor performance

**Reuse Existing Infrastructure** ✅
- Message creation: Bestaande POST /api/admin/messages endpoint
- Message dismissal: Bestaande POST /api/messages/:id/dismiss endpoint
- Polling systeem: Bestaande message-modal.js logic

**Backwards Compatible** ✅
- Geen breaking changes
- Bestaande triggers blijven werken
- Additive feature

---

**Reviewed**: 2025-10-24
**Status**: APPROVED - No database migrations needed
