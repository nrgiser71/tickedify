# Data Model: Settings Screen

**Feature**: 056-je-mag-een (Settings Screen)
**Date**: 2025-11-05
**Status**: Complete

## Entity Overview

The Settings screen requires one new database entity to store user preferences with an extensible schema that can accommodate future settings additions without database migrations.

## Database Schema

### user_settings Table

**Purpose**: Store user-specific application settings with flexible JSONB structure

```sql
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES gebruikers(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing unique identifier |
| user_id | INTEGER | NOT NULL, REFERENCES gebruikers(id) ON DELETE CASCADE, UNIQUE | Foreign key to user, one settings record per user |
| settings | JSONB | DEFAULT '{}'::jsonb | Flexible settings storage as JSON object |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- PRIMARY KEY on `id` (automatic)
- UNIQUE constraint on `user_id` (enforces one settings record per user)
- B-tree index on `user_id` for fast lookups by user

**Relationships**:
- `user_id` → `gebruikers(id)` (many-to-one, CASCADE delete)
  - When user is deleted, their settings are automatically removed
  - Each user has exactly one settings record (enforced by UNIQUE constraint)

### Settings JSONB Structure

**Initial Structure** (empty placeholder):
```json
{}
```

**Future Extensible Structure** (examples):
```json
{
  "version": 1,
  "ui": {
    "theme": "light",
    "language": "en",
    "dateFormat": "YYYY-MM-DD"
  },
  "notifications": {
    "email": true,
    "reminders": true
  },
  "defaults": {
    "startScreen": "daily-planning",
    "defaultList": "inbox"
  },
  "productivity": {
    "workHours": {
      "start": "09:00",
      "end": "17:00"
    },
    "breakReminders": false
  }
}
```

**Design Principles**:
- **Versioning**: Optional `version` field for future schema migrations
- **Namespacing**: Group related settings (ui, notifications, etc.)
- **Defaults**: Application provides defaults when keys don't exist
- **Partial Updates**: Can update single namespace without replacing entire object
- **Type Flexibility**: Booleans, strings, numbers, nested objects all supported

**JSONB Advantages**:
- No migration needed to add new settings
- Efficient storage and indexing
- Supports partial updates via PostgreSQL JSONB operators
- Can query specific settings paths: `settings->>'ui'->>'theme'`

## Runtime Data Model

### Frontend Global State

```javascript
// Global variable in app.js
let userSettings = {
    loaded: false,
    data: {},
    dirty: false  // True when unsaved changes exist
};
```

**Properties**:
- `loaded`: Boolean indicating if settings have been fetched from API
- `data`: Object containing current settings (mirrors database JSONB)
- `dirty`: Boolean tracking unsaved changes (future use for "Save" button state)

### API Response Format

**GET /api/user-settings Success**:
```json
{
    "success": true,
    "settings": {
        "id": 123,
        "user_id": 45,
        "settings": {},
        "created_at": "2025-11-05T10:30:00Z",
        "updated_at": "2025-11-05T10:30:00Z"
    }
}
```

**GET /api/user-settings (No Settings Yet)**:
```json
{
    "success": true,
    "settings": null
}
```

**POST /api/user-settings Request**:
```json
{
    "settings": {
        "ui": {
            "theme": "dark"
        }
    }
}
```

**POST /api/user-settings Success**:
```json
{
    "success": true,
    "settings": {
        "id": 123,
        "user_id": 45,
        "settings": {
            "ui": {
                "theme": "dark"
            }
        },
        "created_at": "2025-11-05T10:30:00Z",
        "updated_at": "2025-11-05T10:35:00Z"
    }
}
```

**Error Response** (any endpoint):
```json
{
    "success": false,
    "error": "Database connection failed"
}
```

## Data Validation

### Backend Validation

**User ID Validation**:
- Must exist in session: `req.session.userId`
- Must exist in database (enforced by foreign key)
- Automatically scoped to logged-in user (no user_id in request body)

**Settings JSON Validation**:
- Must be valid JSON (enforced by PostgreSQL JSONB type)
- No additional schema validation initially (accept any valid JSON object)
- Future: Add schema validation for specific settings paths

**Size Constraints**:
- JSONB column: PostgreSQL default limit (~1GB theoretical, practical ~10-100KB)
- Recommendation: Warn if settings exceed 10KB (log warning, don't block)

### Frontend Validation

**Initial Phase** (empty screen):
- No frontend validation needed (no settings to validate)

**Future Phase** (when settings added):
- Validate setting values before POST (e.g., theme must be "light" or "dark")
- Show inline validation errors
- Disable Save button if validation fails

## Data Access Patterns

### Read Pattern

**Query**:
```sql
SELECT id, user_id, settings, created_at, updated_at
FROM user_settings
WHERE user_id = $1;
```

**Performance**:
- Index on user_id enables O(log n) lookup
- Expected result: 0 or 1 row (UNIQUE constraint)
- Typical query time: <5ms

### Write Pattern (Upsert)

**Query**:
```sql
INSERT INTO user_settings (user_id, settings, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (user_id)
DO UPDATE SET
    settings = $2,
    updated_at = NOW()
RETURNING id, user_id, settings, created_at, updated_at;
```

**Behavior**:
- First save: Creates new record
- Subsequent saves: Updates existing record (replaces entire JSONB)
- Returns complete updated record
- Automatic updated_at timestamp

**Performance**:
- UNIQUE constraint enables efficient conflict detection
- Typical query time: <10ms

### Partial Update Pattern (Future)

**Query** (update single setting without replacing entire object):
```sql
UPDATE user_settings
SET
    settings = settings || $2::jsonb,
    updated_at = NOW()
WHERE user_id = $1
RETURNING id, user_id, settings, created_at, updated_at;
```

**Example**:
```javascript
// Update only theme, preserve other settings
await pool.query(
    'UPDATE user_settings SET settings = settings || $2::jsonb, updated_at = NOW() WHERE user_id = $1',
    [userId, JSON.stringify({ ui: { theme: 'dark' } })]
);
```

**Note**: Not implemented initially, but JSONB structure supports it

## Migration Script

**File**: `migrations/20251105_add_user_settings_table.sql`

```sql
-- Migration: Add user_settings table for extensible user preferences
-- Date: 2025-11-05
-- Feature: 056-je-mag-een (Settings Screen)

BEGIN;

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES gebruikers(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for fast user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Verify table structure
DO $$
BEGIN
    -- Check foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name LIKE '%user_settings_user_id_fkey%'
        AND table_name = 'user_settings'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint missing on user_settings.user_id';
    END IF;

    -- Check unique constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'UNIQUE'
        AND table_name = 'user_settings'
        AND constraint_name LIKE '%user_id%'
    ) THEN
        RAISE EXCEPTION 'Unique constraint missing on user_settings.user_id';
    END IF;

    RAISE NOTICE 'user_settings table created successfully';
END $$;

COMMIT;

-- Rollback script (execute manually if needed):
-- BEGIN;
-- DROP TABLE IF EXISTS user_settings CASCADE;
-- COMMIT;
```

## Data Lifecycle

### Creation
- **Trigger**: First POST to /api/user-settings for a user
- **Default State**: Empty JSONB object `{}`
- **Timing**: Created on-demand, not during user registration

### Updates
- **Trigger**: POST to /api/user-settings with new settings data
- **Behavior**: Replaces entire settings JSONB (full replacement upsert)
- **Timestamp**: updated_at automatically updated on each save

### Deletion
- **Trigger**: User account deletion (CASCADE from gebruikers table)
- **Behavior**: user_settings record automatically deleted
- **Manual**: Can be deleted via SQL if needed (no API endpoint for deletion)

### Data Retention
- **Policy**: Settings persist indefinitely while user account exists
- **Backup**: Included in standard database backups
- **GDPR**: Deleted automatically when user account is deleted

## Extensibility Guidelines

### Adding New Settings (Future)

**Steps**:
1. Define new setting namespace in documentation
2. Update frontend to read/write new setting
3. Update API validation if needed (optional)
4. No database migration required (JSONB flexibility)

**Example** (add theme setting):
```javascript
// Frontend: Read setting with default
const theme = userSettings.data?.settings?.ui?.theme || 'light';

// Frontend: Update setting
await saveUserSettings({
    ...userSettings.data.settings,
    ui: { theme: 'dark' }
});
```

### Schema Versioning (Future)

If breaking changes needed:
```json
{
    "version": 2,
    "ui": { ... }
}
```

Backend checks version and migrates old format to new format on read.

## Testing Considerations

### Database Tests

**Test Cases**:
1. ✅ Create settings for new user (INSERT)
2. ✅ Update settings for existing user (UPDATE via UPSERT)
3. ✅ UNIQUE constraint prevents duplicate user_id
4. ✅ Foreign key constraint prevents invalid user_id
5. ✅ CASCADE delete removes settings when user deleted
6. ✅ Empty JSONB default works correctly
7. ✅ Complex JSONB structure stores and retrieves correctly

**SQL Test Queries**:
```sql
-- Test UNIQUE constraint (should fail)
INSERT INTO user_settings (user_id, settings) VALUES (1, '{}');
INSERT INTO user_settings (user_id, settings) VALUES (1, '{}'); -- ERROR

-- Test foreign key constraint (should fail if user 99999 doesn't exist)
INSERT INTO user_settings (user_id, settings) VALUES (99999, '{}'); -- ERROR

-- Test JSONB storage and retrieval
INSERT INTO user_settings (user_id, settings) VALUES (1, '{"ui":{"theme":"dark"}}');
SELECT settings->>'ui' FROM user_settings WHERE user_id = 1; -- Returns '{"theme":"dark"}'

-- Test CASCADE delete
DELETE FROM gebruikers WHERE id = 1; -- Should also delete user_settings record
```

### API Tests

**Test Scenarios** (see quickstart.md for details):
1. GET settings for user with no settings (returns null)
2. POST new settings (creates record)
3. GET settings after POST (returns saved settings)
4. POST updated settings (updates existing record)
5. POST invalid JSON (returns error)
6. GET settings without authentication (returns 401)

## Security Considerations

### Authentication
- All endpoints require `requireLogin` middleware
- user_id scoped automatically to session user (no user_id in request body)
- No cross-user access possible (WHERE user_id = req.session.userId)

### Authorization
- Users can only read/write their own settings
- No admin override mechanism (by design)
- No sharing or collaboration features

### Data Validation
- JSONB type prevents SQL injection
- No executable code stored (JSON data only)
- Size limits prevent abuse (future: add max size validation)

### Privacy
- Settings are private to each user
- No analytics or tracking of settings values
- Deleted automatically with user account (CASCADE)

## References

- Feature Spec: `specs/056-je-mag-een/spec.md`
- Research: `specs/056-je-mag-een/research.md`
- API Contracts: `specs/056-je-mag-een/contracts/`
- Database Docs: `ARCHITECTURE.md` (Database Schema section)
