# Data Model: YouTube Onboarding Video Feature

**Feature**: 014-de-eerste-keer
**Date**: 2025-10-14
**Status**: Design Complete

## Overview

This feature adds two database changes:
1. **User tracking** - Track whether user has seen onboarding video
2. **System settings** - Store admin-configurable video URL

Both changes extend Tickedify's existing PostgreSQL schema.

---

## Entity 1: User Onboarding Tracking

### users table (EXTENSION)

**Purpose**: Track onboarding video view status per user account

**New Columns**:
```sql
ALTER TABLE users
ADD COLUMN onboarding_video_seen BOOLEAN DEFAULT FALSE,
ADD COLUMN onboarding_video_seen_at TIMESTAMP;
```

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `onboarding_video_seen` | BOOLEAN | DEFAULT FALSE, NOT NULL | Whether user has closed the onboarding popup |
| `onboarding_video_seen_at` | TIMESTAMP | NULL | Timestamp when user closed popup (NULL if never seen) |

**Validation Rules**:
- `onboarding_video_seen` defaults to FALSE for all new users
- `onboarding_video_seen_at` set when user closes popup for first time
- `onboarding_video_seen_at` can be NULL (user hasn't seen video yet)
- Both fields managed per user account (not per device)

**State Transitions**:
```
Initial State:
  onboarding_video_seen = FALSE
  onboarding_video_seen_at = NULL

After User Closes Popup:
  onboarding_video_seen = TRUE
  onboarding_video_seen_at = CURRENT_TIMESTAMP
```

**Business Logic**:
- Popup shows automatically ONLY if `onboarding_video_seen = FALSE`
- Sidebar link always visible (regardless of seen status)
- Clicking sidebar link shows popup but does NOT change seen status
- Closing popup via X, ESC, or overlay click sets seen=TRUE

**Indexing**:
- No additional index needed (small table, <1000 users expected)
- Primary key `users.id` sufficient for lookups

---

## Entity 2: System Settings

### system_settings table (NEW)

**Purpose**: Store system-wide configuration values (admin-managed)

**Schema**:
```sql
CREATE TABLE system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);
```

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `key` | VARCHAR(255) | PRIMARY KEY | Unique setting identifier |
| `value` | TEXT | NULL allowed | Setting value (JSON, URL, text) |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| `updated_by` | INTEGER | FOREIGN KEY → users(id) | Admin user who updated |

**Initial Data**:
```sql
INSERT INTO system_settings (key, value, updated_at, updated_by)
VALUES ('onboarding_video_url', NULL, CURRENT_TIMESTAMP, NULL);
```

**Validation Rules**:
- `key` must be unique (enforced by PRIMARY KEY)
- `value` can be NULL (no video configured yet)
- `value` must be valid YouTube URL when not NULL (validated by admin UI)
- `updated_by` can be NULL for system-inserted values
- `updated_at` auto-updates via application logic (not database trigger)

**Onboarding Video Setting**:
- **Key**: `'onboarding_video_url'`
- **Value Format**: Full YouTube URL
  - Examples:
    - `https://www.youtube.com/watch?v=VIDEO_ID`
    - `https://youtu.be/VIDEO_ID`
    - `https://www.youtube-nocookie.com/embed/VIDEO_ID`
  - NULL = no video configured
- **Updated By**: Admin user ID who saved the setting

**Business Logic**:
- If `value` is NULL: Show fallback message "Nog geen welkomstvideo beschikbaar"
- If `value` is valid URL: Extract video ID and embed
- Admin can update value via admin.html settings page
- Value validation happens in admin UI (JavaScript) before saving

**Future Extensibility**:
This table design supports additional system settings:
- `email_signature` TEXT
- `max_file_upload_size` TEXT (as number string)
- `maintenance_mode` TEXT ('true'/'false' as string)

**Indexing**:
- PRIMARY KEY on `key` is sufficient (small table, <50 settings)
- No additional indexes needed

---

## Relationships

```
┌─────────────────────┐
│ users               │
├─────────────────────┤
│ id (PK)             │────┐
│ username            │    │
│ ...existing cols... │    │
│ onboarding_video_   │    │
│   seen              │    │
│ onboarding_video_   │    │
│   seen_at           │    │
└─────────────────────┘    │
                           │
                           │ FK: updated_by
                           │
                           ▼
┌─────────────────────────────────┐
│ system_settings                 │
├─────────────────────────────────┤
│ key (PK)                        │
│ value                           │
│ updated_at                      │
│ updated_by → users(id)          │
└─────────────────────────────────┘
```

**Relationship Rules**:
- `system_settings.updated_by` → `users.id` (FOREIGN KEY)
- Cascade behavior: SET NULL on user deletion (preserve settings)
- No direct relationship between `users.onboarding_video_seen` and `system_settings`

---

## Migration Strategy

### Migration Script: `migration-014-onboarding-video.js`

**Idempotency**:
- Check if columns exist before adding (prevent duplicate column error)
- Check if table exists before creating (prevent table already exists error)
- Safe to run multiple times

**Transaction Wrapping**:
```javascript
await client.query('BEGIN');
try {
  // Migrations here
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}
```

**Verification Queries**:
```sql
-- Check if users columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name='users'
  AND column_name IN ('onboarding_video_seen', 'onboarding_video_seen_at');

-- Check if system_settings table exists
SELECT FROM information_schema.tables
WHERE table_name='system_settings';
```

### Rollback Script: `rollback-014-onboarding-video.js`

**Rollback Operations**:
```sql
-- Remove columns from users table
ALTER TABLE users
DROP COLUMN IF EXISTS onboarding_video_seen,
DROP COLUMN IF EXISTS onboarding_video_seen_at;

-- Drop system_settings table
DROP TABLE IF EXISTS system_settings;
```

**Safety**:
- `DROP COLUMN IF EXISTS` prevents errors if column doesn't exist
- `DROP TABLE IF EXISTS` prevents errors if table doesn't exist
- Rollback safe to run even if migration never ran

---

## Database Functions (database.js additions)

### User Onboarding Functions

```javascript
/**
 * Check if user has seen onboarding video
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
async function hasSeenOnboardingVideo(userId) {
  const result = await pool.query(
    'SELECT onboarding_video_seen FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.onboarding_video_seen || false;
}

/**
 * Mark onboarding video as seen for user
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function markOnboardingVideoSeen(userId) {
  await pool.query(
    `UPDATE users
     SET onboarding_video_seen = TRUE,
         onboarding_video_seen_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [userId]
  );
}
```

### System Settings Functions

```javascript
/**
 * Get system setting by key
 * @param {string} key
 * @returns {Promise<string|null>}
 */
async function getSystemSetting(key) {
  const result = await pool.query(
    'SELECT value FROM system_settings WHERE key = $1',
    [key]
  );
  return result.rows[0]?.value || null;
}

/**
 * Update system setting (admin only)
 * @param {string} key
 * @param {string|null} value
 * @param {number} adminUserId
 * @returns {Promise<void>}
 */
async function updateSystemSetting(key, value, adminUserId) {
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at, updated_by)
     VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
     ON CONFLICT (key)
     DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = CURRENT_TIMESTAMP,
       updated_by = EXCLUDED.updated_by`,
    [key, value, adminUserId]
  );
}
```

---

## Testing Scenarios

### User Tracking Tests

1. **New User Default State**
   - Create new user
   - Verify `onboarding_video_seen = FALSE`
   - Verify `onboarding_video_seen_at = NULL`

2. **Mark Video as Seen**
   - Call `markOnboardingVideoSeen(userId)`
   - Verify `onboarding_video_seen = TRUE`
   - Verify `onboarding_video_seen_at` is recent timestamp

3. **Idempotent Mark Seen**
   - Call `markOnboardingVideoSeen(userId)` twice
   - Verify second call doesn't error
   - Verify timestamp updated to most recent call

### System Settings Tests

1. **Get Non-Existent Setting**
   - Call `getSystemSetting('nonexistent_key')`
   - Verify returns NULL

2. **Get Onboarding Video URL (NULL)**
   - Call `getSystemSetting('onboarding_video_url')`
   - Verify returns NULL (initial state)

3. **Update Onboarding Video URL**
   - Call `updateSystemSetting('onboarding_video_url', 'https://youtube.com/watch?v=abc123', adminId)`
   - Verify value updated
   - Verify `updated_by` set to adminId
   - Verify `updated_at` is recent

4. **Clear Video URL (Set NULL)**
   - Call `updateSystemSetting('onboarding_video_url', NULL, adminId)`
   - Verify value is NULL
   - Verify `updated_at` updated

---

## Performance Considerations

**Query Performance**:
- All queries use indexed columns (PRIMARY KEY, FOREIGN KEY)
- Expected < 5ms query time for user lookups
- Expected < 2ms query time for settings lookups
- No N+1 query issues (single lookup per feature use)

**Storage Impact**:
- `users` table: +2 columns, ~16 bytes per user
- `system_settings` table: <10 rows expected, <1 KB total
- Negligible impact on database size

**Concurrency**:
- No concurrent write issues (user updates only own row)
- Admin settings updates serialized via web server (single admin user)
- No need for row-level locking

---

**Data Model Complete**: 2025-10-14
**Next**: API Contracts (contracts/)
