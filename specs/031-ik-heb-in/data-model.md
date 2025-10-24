# Data Model: Admin Message Display Debug & Validatie Verbetering

**Feature**: 031-ik-heb-in
**Date**: 2025-10-24

## Existing Database Schema (No Changes Required)

Deze feature maakt gebruik van bestaande database tabellen zonder schema wijzigingen.

### Table: admin_messages

**Purpose**: Opslag van admin berichten met targeting en scheduling configuratie

```sql
CREATE TABLE admin_messages (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'information',
  target_type VARCHAR(50) DEFAULT 'all',
  target_subscription VARCHAR(50)[],
  target_users VARCHAR(50)[],  -- PostgreSQL array, kritiek voor deze feature
  trigger_type VARCHAR(50) DEFAULT 'immediate',
  trigger_value INTEGER,
  dismissible BOOLEAN DEFAULT true,
  snoozable BOOLEAN DEFAULT true,
  publish_at TIMESTAMP,
  expires_at TIMESTAMP,
  button_label VARCHAR(100),
  button_action VARCHAR(50),
  button_target TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Validation Rules** (toegevoegd in deze feature):
- `target_type = 'specific_users'` → `target_users` MOET NOT NULL en length > 0
- `target_users` array elementen MOETEN geldige user IDs zijn (foreign key check)
- `active = false` → waarschuwing in admin UI
- `publish_at > NOW()` → waarschuwing in admin UI

**Relevant Indexes**:
```sql
CREATE INDEX idx_admin_messages_active ON admin_messages(active);
CREATE INDEX idx_admin_messages_publish_at ON admin_messages(publish_at);
```

### Table: users

**Purpose**: Gebruiker accounts, gebruikt voor message targeting

```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  naam VARCHAR(255),
  wachtwoord_hash TEXT NOT NULL,
  subscription VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

**Relevant Fields voor Message Targeting**:
- `id` → gebruikt in admin_messages.target_users array
- `email` → gebruikt voor user search in admin2.html
- `naam` → getoond in admin interface voor user selectie
- `subscription` → gebruikt voor target_subscription filtering

**Query Pattern** (user search):
```sql
SELECT id, email, naam, subscription, created_at
FROM users
WHERE email ILIKE '%{query}%' OR naam ILIKE '%{query}%'
ORDER BY created_at DESC
LIMIT 20;
```

### Table: message_interactions

**Purpose**: Tracking van user interacties met berichten (dismissed, snoozed)

```sql
CREATE TABLE message_interactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id),
  message_id INTEGER REFERENCES admin_messages(id),
  dismissed BOOLEAN DEFAULT false,
  snoozed_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);
```

**Gebruikt in Query Filter**:
```sql
-- Exclude dismissed/snoozed messages
AND message_id NOT IN (
  SELECT message_id FROM message_interactions
  WHERE user_id = $1
    AND (dismissed = true OR snoozed_until > NOW())
)
```

## Data Entities (Application Layer)

### Entity: MessageCreationRequest

**Purpose**: Request body voor POST /api/admin/messages

```javascript
{
  title: string,              // Required
  message: string,            // Required
  message_type: string,       // Default: 'information'
  target_type: string,        // 'all' | 'filtered' | 'specific_users'
  target_subscription: string[] | null,  // Required if target_type = 'filtered'
  target_users: string[] | null,         // Required if target_type = 'specific_users'
  trigger_type: string,       // 'immediate' | 'days_after_signup' | ...
  trigger_value: number | null,
  dismissible: boolean,       // Default: true
  snoozable: boolean,         // Default: true
  publish_at: string | null,  // ISO8601 timestamp
  expires_at: string | null,  // ISO8601 timestamp
  button_label: string | null,
  button_action: string | null,
  button_target: string | null,
  active: boolean             // Default: true
}
```

**Validation Rules** (NEW in deze feature):
```javascript
// Backend validation (server.js)
if (!title || !message) {
  throw ValidationError('Title and message are required');
}

if (target_type === 'specific_users' && (!target_users || target_users.length === 0)) {
  throw ValidationError('Geen gebruikers geselecteerd. Selecteer minimaal één gebruiker voor dit bericht.');
}

// Optional: Verify user IDs exist
if (target_type === 'specific_users') {
  const validUsers = await pool.query(
    'SELECT id FROM users WHERE id = ANY($1)',
    [target_users]
  );
  if (validUsers.rows.length !== target_users.length) {
    throw ValidationError('Enkele geselecteerde gebruikers bestaan niet meer');
  }
}
```

### Entity: UserSearchResult

**Purpose**: Response voor GET /api/admin2/users/search

```javascript
{
  users: [
    {
      id: string,              // User ID voor target_users array
      email: string,           // Primaire identifier (getoond in UI)
      naam: string | null,     // Display name (getoond in UI)
      subscription: string,    // User tier
      created_at: string       // ISO8601 timestamp
    }
  ],
  count: number                // Totaal aantal results
}
```

**UI Display Pattern**:
```javascript
// admin2.html - improved display met email
function displayUserResult(user) {
  return `
    <div class="user-result" data-id="${user.id}">
      <strong>${user.naam || 'Geen naam'}</strong>
      <span class="user-email">${user.email}</span>
      <span class="user-subscription">${user.subscription}</span>
    </div>
  `;
}
```

### Entity: MessagePreview (NEW)

**Purpose**: Preview response voor admin UI

```javascript
{
  targetType: string,          // 'all' | 'filtered' | 'specific_users'
  estimatedReach: number,      // Aantal users die bericht zullen ontvangen
  targetedUsers: [             // Alleen voor specific_users type
    {
      id: string,
      email: string,
      naam: string
    }
  ],
  warnings: [                  // UX warnings
    {
      type: 'inactive' | 'future_publish' | 'no_users',
      message: string
    }
  ]
}
```

**Calculation Logic**:
```javascript
async function calculateMessagePreview(messageData) {
  if (messageData.target_type === 'all') {
    return { estimatedReach: await getTotalUserCount() };
  }

  if (messageData.target_type === 'filtered') {
    return {
      estimatedReach: await getUserCountBySubscription(messageData.target_subscription)
    };
  }

  if (messageData.target_type === 'specific_users') {
    const users = await getUsersByIds(messageData.target_users);
    return {
      estimatedReach: users.length,
      targetedUsers: users.map(u => ({
        id: u.id,
        email: u.email,
        naam: u.naam
      }))
    };
  }
}
```

## State Transitions

### Message Lifecycle

```
┌─────────────────┐
│   Draft State   │ (Admin typing in form)
│  - No DB entry  │
└────────┬────────┘
         │ Submit (with validation)
         ▼
┌─────────────────┐
│  Created State  │ (DB: active=true, publish_at<=NOW)
│ - In database   │
│ - Not yet seen  │
└────────┬────────┘
         │ User visits Actions page
         ▼
┌─────────────────┐
│   Shown State   │ (message_interactions created)
│ - User sees it  │
└────┬────────────┘
     │
     ├─→ Dismiss → Dismissed State (dismissed=true)
     │
     └─→ Snooze  → Snoozed State (snoozed_until>NOW)
```

### Validation State (NEW)

```
Admin Form State:
┌──────────────────┐
│  target_type =   │
│ 'specific_users' │
└────────┬─────────┘
         │
         ├─→ selectedUserIds.length === 0 → ❌ Submit DISABLED
         │                                    (Frontend prevention)
         │
         ├─→ selectedUserIds.length > 0  → ✅ Submit ENABLED
         │                                    (Show user emails)
         │
         └─→ Submit attempt with length=0 → ❌ 400 Error Response
                                             (Backend validation)
```

## Data Relationships

```
┌──────────────┐
│    users     │
│  (id, email) │
└──────┬───────┘
       │
       │ Referenced by (PostgreSQL array)
       │
       ▼
┌──────────────────┐          ┌─────────────────────┐
│ admin_messages   │◀─────────│ message_interactions│
│ (target_users[]) │ FK       │ (message_id)        │
└──────────────────┘          └─────────────────────┘
                                       │
                                       │ FK
                                       │
                                       ▼
                              ┌──────────────┐
                              │    users     │
                              │ (user_id)    │
                              └──────────────┘
```

**Key Constraint**:
- `admin_messages.target_users` array values SHOULD exist as `users.id`
- Currently no formal FK constraint (PostgreSQL limitation for arrays)
- Validation enforced at application layer (NEW in deze feature)

## Query Patterns

### Critical Query: Get Unread Messages for User

**Location**: server.js:13566-13602

```sql
SELECT m.* FROM admin_messages m
WHERE m.active = true
  AND m.publish_at <= NOW()
  AND (m.expires_at IS NULL OR m.expires_at > NOW())

  -- Targeting filter (THIS IS WHERE THE BUG OCCURRED)
  AND (
    m.target_type = 'all'
    OR (m.target_type = 'filtered' AND $1 = ANY(m.target_subscription))
    OR (m.target_type = 'specific_users' AND $2 = ANY(m.target_users))
    -- ^ If target_users = [] (empty array), this NEVER matches
  )

  -- Trigger filter
  AND (
    m.trigger_type = 'immediate'
    OR (m.trigger_type = 'days_after_signup' AND $3 >= m.trigger_value::integer)
  )

  -- Exclude dismissed/snoozed
  AND m.id NOT IN (
    SELECT message_id FROM message_interactions
    WHERE user_id = $2
      AND (dismissed = true OR snoozed_until > NOW())
  )
ORDER BY m.created_at DESC;
```

**Parameters**:
- `$1` = userSubscription ('free', 'monthly_7', etc.)
- `$2` = userId (from session)
- `$3` = daysSinceSignup

**Performance**:
- Uses indexes on `active`, `publish_at`
- `= ANY(array)` is O(n) where n = array length (typically 1-50)
- Subquery for message_interactions uses UNIQUE(user_id, message_id) index

### New Query: Verify User IDs (Optional Validation)

```sql
SELECT id FROM users WHERE id = ANY($1);
```

**Purpose**: Verify all IDs in target_users array exist
**Performance**: O(n) where n = target_users.length (typically < 10)

## Data Integrity Rules

### Existing Rules (Maintained)
1. `admin_messages.title` NOT NULL
2. `admin_messages.message` NOT NULL
3. `users.email` UNIQUE
4. `message_interactions(user_id, message_id)` UNIQUE

### New Rules (Enforced by Feature)
1. **Empty target_users Prevention**:
   - IF `target_type = 'specific_users'` THEN `target_users.length > 0`
   - Enforced: Backend validation (400 error)
   - Enforced: Frontend UX (disabled submit button)

2. **User ID Validity** (Optional):
   - All IDs in `target_users[]` SHOULD exist in `users.id`
   - Enforced: Optional backend check before INSERT
   - Fallback: Query naturally filters non-existent IDs

3. **Active State Awareness**:
   - `active = false` → Show warning in admin UI
   - NOT prevented, but flagged prominently

4. **Future Publish Date Awareness**:
   - `publish_at > NOW()` → Show warning in admin UI
   - NOT prevented, but flagged prominently

## Migration Notes

**No database migrations required for this feature.**

Existing schema supports all requirements:
- ✅ `target_users VARCHAR(50)[]` already exists
- ✅ `active BOOLEAN` already exists
- ✅ Indexes already optimal
- ✅ Foreign key relationships already established

**Data Cleanup** (Optional, manual):
```sql
-- Find messages with empty target_users for specific_users type
SELECT id, title, target_type, target_users, created_at
FROM admin_messages
WHERE target_type = 'specific_users'
  AND (target_users IS NULL OR array_length(target_users, 1) IS NULL);

-- Optional: Mark as inactive or delete
UPDATE admin_messages
SET active = false
WHERE target_type = 'specific_users'
  AND (target_users IS NULL OR array_length(target_users, 1) IS NULL);
```

## Testing Data Scenarios

### Test Case 1: Valid Message Creation
```javascript
{
  title: "Test Bericht",
  message: "Dit is een test",
  target_type: "specific_users",
  target_users: ["user_id_1", "user_id_2"],  // Valid, existing IDs
  active: true,
  publish_at: null  // Immediate
}
// Expected: 201 Created, message_id returned
```

### Test Case 2: Invalid - Empty target_users
```javascript
{
  title: "Test Bericht",
  message: "Dit is een test",
  target_type: "specific_users",
  target_users: [],  // INVALID: Empty array
  active: true
}
// Expected: 400 Bad Request, error: "Geen gebruikers geselecteerd..."
```

### Test Case 3: Warning - Inactive Message
```javascript
{
  title: "Test Bericht",
  message: "Dit is een test",
  target_type: "all",
  active: false  // WARNING in UI, but allowed
}
// Expected: 201 Created, but warning shown in admin UI
```

### Test Case 4: Warning - Future Publish
```javascript
{
  title: "Test Bericht",
  message: "Dit is een test",
  target_type: "all",
  publish_at: "2025-12-31T00:00:00Z"  // Future date
}
// Expected: 201 Created, but warning shown in admin UI
```

## Summary

Deze feature wijzigt **geen database schema**, maar voegt **applicatie-niveau validatie** toe om data integriteit te garanderen. De focus ligt op het voorkomen van lege `target_users` arrays via:

1. Backend validation (hard blokkade)
2. Frontend UX improvements (preventie + warnings)
3. Verbeterde user selection interface (email display)

Alle bestaande data patterns en query patterns blijven ongewijzigd en backwards compatible.
