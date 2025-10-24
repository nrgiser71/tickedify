# Database Notes: "Volgende Keer" Trigger Type

**Feature**: 032-bij-het-maken
**Date**: 2025-10-24
**Database**: PostgreSQL (Neon)

## Overview

De "Volgende Keer" trigger is een nieuwe waarde voor het `trigger_type` veld in de `admin_messages` tabel. **Geen database schema wijzigingen zijn nodig** - het bestaande schema accommodeert deze nieuwe waarde volledig.

## Trigger Type: 'next_time'

### Definitie
Een bericht met `trigger_type = 'next_time'` verschijnt bij het **eerstvolgende pagina bezoek** van een gebruiker **NA het aanmaken** van het bericht. Het bericht blijft verschijnen tot de gebruiker op "Got it" klikt (dismiss actie).

### Schema Compatibiliteit

**Bestaand Veld**: `admin_messages.trigger_type VARCHAR(50)`
- ✅ VARCHAR(50) heeft voldoende ruimte voor 'next_time' (9 karakters)
- ✅ Geen ALTER TABLE statement nodig
- ✅ Backwards compatible met bestaande triggers

**Trigger Type Waarden**:
```sql
-- Bestaande waarden:
'immediate'           -- Toont bericht meteen bij page load
'page_visit_count'    -- Toont bij N-de bezoek aan specifieke pagina

-- NIEUWE waarde (v1.0.20+):
'next_time'          -- Toont bij eerstvolgende bezoek na message creatie
```

## SQL Voorbeelden

### 1. Create Message met "next_time" Trigger

```sql
-- Basic next_time message
INSERT INTO admin_messages (
  title,
  message,
  message_type,
  trigger_type,
  target_type,
  dismissible,
  active,
  publish_at
) VALUES (
  'Nieuwe Feature Toegevoegd',
  'We hebben een nieuwe filter functionaliteit toegevoegd aan de dagelijkse planning!',
  'feature',
  'next_time',  -- NIEUWE trigger type
  'all',
  true,
  true,
  NOW()
);
```

### 2. Query Messages met "next_time" Trigger

```sql
-- Vind alle actieve next_time berichten
SELECT
  id,
  title,
  trigger_type,
  created_at,
  publish_at,
  active
FROM admin_messages
WHERE trigger_type = 'next_time'
  AND active = TRUE
ORDER BY created_at DESC;
```

### 3. Check User Interactions (Dismiss Status)

```sql
-- Voor een specifieke gebruiker, check welke next_time berichten nog getoond moeten worden
SELECT
  m.id,
  m.title,
  m.created_at,
  mi.dismissed,
  mi.first_shown_at
FROM admin_messages m
LEFT JOIN message_interactions mi
  ON m.id = mi.message_id
  AND mi.user_id = 'user-abc-123'  -- Replace met actual user_id
WHERE m.trigger_type = 'next_time'
  AND m.active = TRUE
  AND (mi.message_id IS NULL OR mi.dismissed = FALSE);
-- Expected: Messages die gebruiker moet zien (nog niet gedismissed)
```

### 4. Test Scenario: Create en Verify

```sql
-- STEP 1: Create test message
INSERT INTO admin_messages (title, message, trigger_type, active, publish_at)
VALUES ('Test Next Time', 'Testing next_time trigger', 'next_time', true, NOW())
RETURNING id;
-- Note returned ID, bijv. id = 456

-- STEP 2: Verify message exists
SELECT id, title, trigger_type, created_at
FROM admin_messages
WHERE id = 456;
-- Expected: Row met trigger_type = 'next_time'

-- STEP 3: Simulate user viewing (frontend doet dit automatisch)
INSERT INTO message_interactions (message_id, user_id, dismissed, first_shown_at)
VALUES (456, 'test-user-123', FALSE, NOW())
ON CONFLICT (message_id, user_id) DO UPDATE SET last_shown_at = NOW();

-- STEP 4: Check interaction record
SELECT * FROM message_interactions
WHERE message_id = 456 AND user_id = 'test-user-123';
-- Expected: Record met dismissed = FALSE

-- STEP 5: Simulate dismiss action
UPDATE message_interactions
SET dismissed = TRUE
WHERE message_id = 456 AND user_id = 'test-user-123';

-- STEP 6: Verify message no longer shows
SELECT m.id, m.title
FROM admin_messages m
LEFT JOIN message_interactions mi ON m.id = mi.message_id AND mi.user_id = 'test-user-123'
WHERE m.trigger_type = 'next_time'
  AND m.active = TRUE
  AND (mi.message_id IS NULL OR mi.dismissed = FALSE);
-- Expected: Empty result (message 456 is dismissed)
```

## Backend Query Pattern

**GET /api/messages/unread Logica**:
```sql
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

**Key Points**:
- `mi.message_id IS NULL` → User heeft bericht nog nooit gezien → TOON
- `mi.dismissed = FALSE` → User heeft gezien maar niet dismissed → TOON
- `mi.dismissed = TRUE` → User heeft dismissed → VERBERG

## Data Relationships

```
admin_messages
├── id (PK)
├── trigger_type = 'next_time'  ← NIEUWE waarde
├── created_at                  ← Gebruikt voor "volgende keer" bepaling
└── active = TRUE

message_interactions
├── message_id (FK → admin_messages.id)
├── user_id (FK → users.id)
├── dismissed = TRUE/FALSE      ← Herbruikt voor next_time tracking
└── first_shown_at              ← Timestamp van eerste weergave
```

## Migration Strategy

**GEEN MIGRATIONS NODIG** ✅

Waarom:
- Bestaand `trigger_type VARCHAR(50)` veld accommodeert nieuwe waarde
- Bestaande `message_interactions` tabel perfect voor dismiss tracking
- Bestaande indexes voldoende voor performance
- Backend code change only (geen schema change)

## Backwards Compatibility

**Bestaande Messages**: ✅ Volledig compatible
- Messages met `trigger_type = 'immediate'` blijven ongewijzigd werken
- Messages met `trigger_type = 'page_visit_count'` blijven ongewijzigd werken
- Nieuwe `trigger_type = 'next_time'` voegt functionaliteit toe zonder breaking changes

**Database Level**: ✅ Geen conflicten
- Nieuwe waarde wordt toegevoegd, bestaande waarden blijven geldig
- Geen constraints wijzigingen
- Geen foreign key impacts

## Performance Notes

**Query Impact**: Negligible (< 5ms overhead)
- Nieuwe OR clause in WHERE condition
- Bestaande indexes worden gebruikt:
  - `idx_admin_messages_active` (active)
  - `idx_admin_messages_publish_expires` (publish_at, expires_at)
  - `idx_message_interactions_status` (user_id, dismissed)

**Expected Load**:
- Typical: < 20 active messages totaal
- Typical: < 5 next_time messages per user
- Query execution: < 50ms met indexes

## Rollback Strategy

**If Issues Arise**:
```sql
-- Option 1: Deactivate all next_time messages (soft disable)
UPDATE admin_messages
SET active = FALSE
WHERE trigger_type = 'next_time';

-- Option 2: Delete all next_time messages (hard reset, DESTRUCTIVE)
DELETE FROM admin_messages
WHERE trigger_type = 'next_time';
-- Note: CASCADE delete removes message_interactions automatically

-- Option 3: Rename trigger_type (disable without delete)
UPDATE admin_messages
SET trigger_type = 'next_time_disabled'
WHERE trigger_type = 'next_time';
-- Backend won't recognize 'next_time_disabled', effectively disables
```

## Testing Checklist

- [ ] Create message met `trigger_type = 'next_time'` succeeds
- [ ] Message appears in GET /api/messages/unread voor nieuwe users
- [ ] Message appears in GET /api/messages/unread voor bestaande users
- [ ] Dismiss action sets `message_interactions.dismissed = TRUE`
- [ ] Dismissed message does NOT appear in subsequent unread queries
- [ ] Multiple next_time messages show correctly (all undismissed ones)
- [ ] Bestaande immediate triggers blijven werken
- [ ] Bestaande page_visit_count triggers blijven werken

## References

**Original Messaging System Spec**:
`specs/026-lees-messaging-system/SETUP_DATABASE.sql`

**Complete Schema**:
```sql
-- See specs/026-lees-messaging-system/SETUP_DATABASE.sql for:
-- - admin_messages table definition
-- - message_interactions table definition
-- - user_page_visits table definition
-- - All indexes and constraints
```

**Feature Spec**:
`specs/032-bij-het-maken/spec.md`

**Implementation Plan**:
`specs/032-bij-het-maken/plan.md`

---

**Last Updated**: 2025-10-24
**Status**: Complete - Ready for implementation
