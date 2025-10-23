# Data Model: In-App Admin-to-User Messaging System

**Feature**: 026-lees-messaging-system
**Date**: 2025-01-23

## Entity Overview

Het messaging systeem bestaat uit 3 nieuwe database entities en 1 extended entity:

1. **AdminMessage** - Berichten aangemaakt door admin
2. **MessageInteraction** - User interacties met berichten (junction table)
3. **UserPageVisit** - Page visit tracking voor trigger logica
4. **User** (extended) - Bestaande entity met subscription field

---

## Entity: AdminMessage

**Purpose**: Opslag van admin berichten met targeting, triggering en content configuratie.

**Table**: `admin_messages`

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unieke message identifier |
| title | VARCHAR(255) | NOT NULL | Message titel (toon in header) |
| message | TEXT | NOT NULL | Message content (markdown links supported) |
| message_type | VARCHAR(50) | DEFAULT 'information' | Type: information, educational, warning, important, feature, tip |
| target_type | VARCHAR(50) | DEFAULT 'all' | Targeting: 'all', 'filtered', 'specific_users' |
| target_subscription | VARCHAR(50)[] | NULL | Array van subscription types (NULL = all) |
| target_search | TEXT | NULL | Search term voor name/email filtering (legacy, niet gebruikt) |
| target_users | INTEGER[] | NULL | Array van user IDs voor specific targeting |
| trigger_type | VARCHAR(50) | DEFAULT 'immediate' | Trigger: 'immediate', 'days_after_signup', 'first_page_visit', 'nth_page_visit' |
| trigger_value | TEXT | NULL | Trigger waarde (afhankelijk van trigger_type) |
| dismissible | BOOLEAN | DEFAULT TRUE | Of gebruiker bericht kan sluiten |
| snoozable | BOOLEAN | DEFAULT TRUE | Of gebruiker bericht kan snoozen |
| snooze_durations | INTEGER[] | DEFAULT [3600, 14400, 86400] | Snooze opties in seconden |
| publish_at | TIMESTAMP | DEFAULT NOW() | Wanneer bericht actief wordt |
| expires_at | TIMESTAMP | NULL | Wanneer bericht verloopt (NULL = never) |
| button_label | VARCHAR(100) | NULL | Optionele action button tekst |
| button_action | VARCHAR(50) | NULL | Button type: 'navigate' of 'external' |
| button_target | TEXT | NULL | Button target: path of URL |
| active | BOOLEAN | DEFAULT TRUE | Of bericht actief is (soft delete) |
| created_at | TIMESTAMP | DEFAULT NOW() | Aanmaak timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Laatste wijziging timestamp |

### Indexes

```sql
CREATE INDEX idx_admin_messages_active ON admin_messages(active);
CREATE INDEX idx_admin_messages_publish_expires ON admin_messages(publish_at, expires_at);
```

### Validation Rules

**From Feature Spec**:
- FR-001: title en message zijn verplicht
- FR-002: message_type moet één van: information, educational, warning, important, feature, tip
- FR-003: active flag voor activate/deactivate (geen permanent delete)
- FR-010: target_type moet één van: 'all', 'filtered', 'specific_users'
- FR-014-017: trigger_type moet één van: 'immediate', 'days_after_signup', 'first_page_visit', 'nth_page_visit'
- NFR-008: message content max 10,000 characters

### State Transitions

```
[DRAFT] --> [ACTIVE] --> [INACTIVE] --> [ACTIVE] (toggle cycle)
           ↓
      [EXPIRED] (auto when expires_at < NOW)
```

**Business Rules**:
- Active messages met publish_at > NOW zijn "scheduled" (niet zichtbaar)
- Active messages met expires_at < NOW zijn "expired" (niet zichtbaar)
- Inactive messages zijn nooit zichtbaar, ongeacht dates

---

## Entity: MessageInteraction

**Purpose**: Tracking van user interacties met berichten (seen, dismissed, snoozed, button clicks).

**Table**: `message_interactions`

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| message_id | INTEGER | REFERENCES admin_messages(id) ON DELETE CASCADE | Bericht ID |
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | User ID |
| snoozed_until | TIMESTAMP | NULL | Tot wanneer bericht snoozed is (NULL = not snoozed) |
| dismissed | BOOLEAN | DEFAULT FALSE | Of gebruiker bericht dismissed heeft |
| first_shown_at | TIMESTAMP | DEFAULT NOW() | Eerste keer bericht getoond |
| last_shown_at | TIMESTAMP | DEFAULT NOW() | Laatste keer bericht getoond |
| shown_count | INTEGER | DEFAULT 1 | Aantal keer bericht getoond |
| button_clicked | BOOLEAN | DEFAULT FALSE | Of gebruiker button heeft geklikt |
| button_clicked_at | TIMESTAMP | NULL | Wanneer button geklikt |

**Primary Key**: (message_id, user_id) - Composite key

### Indexes

```sql
CREATE INDEX idx_message_interactions_user ON message_interactions(user_id);
CREATE INDEX idx_message_interactions_snoozed ON message_interactions(snoozed_until)
  WHERE snoozed_until IS NOT NULL;
CREATE INDEX idx_message_interactions_status ON message_interactions(user_id, dismissed, snoozed_until);
```

### Validation Rules

**From Feature Spec**:
- FR-007: dismissed flag wordt gezet bij dismiss action
- FR-008: dismissed berichten worden gefilterd uit unread query
- FR-029: snoozed_until wordt gezet bij snooze action (NOW + duration)
- FR-030: snoozed berichten worden gefilterd tot snoozed_until < NOW
- FR-028: button_clicked flag wordt gezet bij button click

### UPSERT Pattern

```sql
-- Bij dismiss
INSERT INTO message_interactions (message_id, user_id, dismissed)
VALUES ($1, $2, true)
ON CONFLICT (message_id, user_id)
DO UPDATE SET dismissed = true, last_shown_at = NOW();

-- Bij snooze
INSERT INTO message_interactions (message_id, user_id, snoozed_until)
VALUES ($1, $2, NOW() + INTERVAL '1 second' * $3)
ON CONFLICT (message_id, user_id)
DO UPDATE SET snoozed_until = NOW() + INTERVAL '1 second' * $3;

-- Bij button click
UPDATE message_interactions
SET button_clicked = true, button_clicked_at = NOW()
WHERE message_id = $1 AND user_id = $2;
```

---

## Entity: UserPageVisit

**Purpose**: Tracking van page visits per user voor trigger logica.

**Table**: `user_page_visits`

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | User ID |
| page_identifier | VARCHAR(100) | NOT NULL | Page identifier (e.g., 'dagelijkse-planning') |
| visit_count | INTEGER | DEFAULT 1 | Aantal bezoeken aan deze pagina |
| first_visit_at | TIMESTAMP | DEFAULT NOW() | Eerste bezoek timestamp |
| last_visit_at | TIMESTAMP | DEFAULT NOW() | Laatste bezoek timestamp |

**Primary Key**: (user_id, page_identifier) - Composite key

### Indexes

```sql
CREATE INDEX idx_user_page_visits_count ON user_page_visits(page_identifier, visit_count);
```

### Page Identifiers

**Standard Identifiers** (uit MESSAGING_SYSTEM_SPEC.md Appendix C):
- `dagelijkse-planning` - Daily planning page
- `actielijst` - Action list page
- `inbox` - Inbox page
- `edit-task-modal` - Edit task modal
- `quick-add-modal` - Quick add modal
- `recurring-task-popup` - Recurring task popup
- `planning-popup` - Planning popup

### UPSERT Pattern

```sql
-- Bij page visit
INSERT INTO user_page_visits (user_id, page_identifier, visit_count)
VALUES ($1, $2, 1)
ON CONFLICT (user_id, page_identifier)
DO UPDATE SET
  visit_count = user_page_visits.visit_count + 1,
  last_visit_at = NOW()
RETURNING visit_count;
```

**Trigger Evaluation**:
- first_page_visit: match wanneer visit_count = 1
- nth_page_visit: match wanneer visit_count = N (uit trigger_value)

---

## Entity: User (Extended)

**Purpose**: Bestaande users tabel - vereist subscription_type field voor targeting.

**Table**: `users` (existing)

### Required Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | User identifier (existing) |
| email | VARCHAR(255) | UNIQUE | User email (existing) |
| name | VARCHAR | NULL | User name (existing or add) |
| subscription_type | VARCHAR(50) | DEFAULT 'free' | Subscription: 'free', 'premium', 'trial' |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation (existing) |

### Relationships

- **Has many**: MessageInteractions (via user_id)
- **Has many**: UserPageVisits (via user_id)

### Validation Rules

**From Feature Spec**:
- FR-011: subscription_type wordt gebruikt voor filtered targeting
- FR-015: created_at wordt gebruikt voor days_after_signup trigger

**Migration Note**: Als subscription_type niet bestaat, toevoegen met migration:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'free';
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_type, created_at);
```

---

## Relationships Diagram

```
User (1) ----< (N) MessageInteraction (N) >---- (1) AdminMessage
  |
  |
  +----< (N) UserPageVisit
```

**Cascade Rules**:
- Delete User → Delete all MessageInteractions (CASCADE)
- Delete User → Delete all UserPageVisits (CASCADE)
- Delete AdminMessage → Delete all MessageInteractions (CASCADE)

---

## Query Patterns

### 1. Get Unread Messages for User

**Purpose**: FR-004 - Toon nieuwe berichten bij app load

```sql
SELECT m.* FROM admin_messages m
WHERE m.active = true
  AND m.publish_at <= NOW()
  AND (m.expires_at IS NULL OR m.expires_at > NOW())

  -- Targeting filter
  AND (
    m.target_type = 'all'
    OR (m.target_type = 'filtered' AND (
      m.target_subscription IS NULL OR $user_subscription = ANY(m.target_subscription)
    ))
    OR (m.target_type = 'specific_users' AND $user_id = ANY(m.target_users))
  )

  -- Trigger filter (immediate + days_after_signup)
  AND (
    m.trigger_type = 'immediate'
    OR (m.trigger_type = 'days_after_signup' AND $days_since_signup >= m.trigger_value::integer)
  )

  -- Exclude dismissed/snoozed
  AND m.id NOT IN (
    SELECT message_id FROM message_interactions
    WHERE user_id = $user_id
      AND (dismissed = true OR snoozed_until > NOW())
  )

ORDER BY
  CASE m.message_type
    WHEN 'important' THEN 1
    WHEN 'warning' THEN 2
    WHEN 'feature' THEN 3
    WHEN 'educational' THEN 4
    WHEN 'tip' THEN 5
    WHEN 'information' THEN 6
    ELSE 7
  END,
  m.created_at DESC;
```

**Note**: Page visit triggered messages worden via separate query gevonden (zie research.md §3).

### 2. Get Message Analytics

**Purpose**: FR-041 - Admin analytics dashboard

```sql
SELECT
  m.*,
  COUNT(DISTINCT CASE WHEN mi.user_id IS NOT NULL THEN mi.user_id END) as shown_count,
  COUNT(DISTINCT CASE WHEN mi.dismissed = true THEN mi.user_id END) as dismissed_count,
  COUNT(DISTINCT CASE WHEN mi.snoozed_until > NOW() THEN mi.user_id END) as snoozed_count,
  COUNT(DISTINCT CASE WHEN mi.button_clicked = true THEN mi.user_id END) as button_clicks
FROM admin_messages m
LEFT JOIN message_interactions mi ON mi.message_id = m.id
WHERE m.id = $message_id
GROUP BY m.id;
```

### 3. Preview Targeting Count

**Purpose**: FR-047 - Live preview tijdens message creation

```sql
SELECT COUNT(*) FROM users
WHERE 1=1
  AND ($target_type = 'all' OR subscription_type = ANY($subscriptions))
  AND ($target_type != 'specific_users' OR id = ANY($user_ids));
```

---

## Data Model Validation Checklist

- [x] All entities from feature spec identified
- [x] All fields mapped to requirements (FR-001 t/m FR-048)
- [x] Relationships defined with foreign keys
- [x] Cascade delete rules specified
- [x] Indexes for performance on frequent queries
- [x] Validation rules documented
- [x] State transitions mapped
- [x] Query patterns documented
- [x] UPSERT patterns for conflict handling

**Ready for Contract Generation** ✅
