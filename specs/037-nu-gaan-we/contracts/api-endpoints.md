# API Contracts: Archive Functionaliteit

**Feature**: Archive Tabel voor Afgewerkte Taken
**Date**: 2025-10-27

## Modified Endpoints

### 1. PUT /api/taak/:id (Mark Task Complete)

**Purpose**: Mark taak als voltooid - now triggers archivering

**Existing Behavior**: Updates taak status/lijst to 'afgewerkt'
**New Behavior**: Archives taak to taken_archief + creates new instance if recurring

**Request**:
```http
PUT /api/taak/:id HTTP/1.1
Content-Type: application/json
Authorization: Bearer {token}

{
  "lijst": "afgewerkt",
  "status": "afgewerkt"
}
```

**Response** (Success):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Taak afgewerkt en gearchiveerd",
  "archived_taak_id": "abc123",
  "new_recurring_taak_id": "def456"  // Optional: alleen voor recurring tasks
}
```

**Response** (Archive Failure):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Taak afgewerkt (archivering pending)",
  "warning": "Archive failed, zal automatisch retried worden"
}
```

**Implementation Changes**:
```javascript
// In server.js PUT /api/taak/:id endpoint

// Old flow:
UPDATE taken SET lijst='afgewerkt', status='afgewerkt' WHERE id=?

// New flow:
BEGIN TRANSACTION
  // 1. Insert into archive
  INSERT INTO taken_archief SELECT *, CURRENT_TIMESTAMP FROM taken WHERE id=?

  // 2. Archive subtaken
  INSERT INTO subtaken_archief
    SELECT *, CURRENT_TIMESTAMP FROM subtaken WHERE parent_taak_id=?

  // 3. If recurring: create new instance
  IF herhaling_actief THEN
    INSERT INTO taken (naam, herhaling_type, datum, ...) VALUES (...)

  // 4. Delete from active
  DELETE FROM subtaken WHERE parent_taak_id=?
  DELETE FROM taken WHERE id=?
COMMIT
```

**Edge Cases**:
- Recurring task: Response includes `new_recurring_taak_id`
- Archive failure: Transaction rollback, taak blijft in active state, warning logged
- Subtaken: Cascade archived, no separate API call needed

---

### 2. GET /api/lijst/afgewerkt (Get Completed Tasks)

**Purpose**: Ophalen afgewerkte taken - now reads from archive table

**Existing Behavior**: `SELECT * FROM taken WHERE lijst='afgewerkt'`
**New Behavior**: `SELECT * FROM taken_archief WHERE user_id=?`

**Request**:
```http
GET /api/lijst/afgewerkt HTTP/1.1
Authorization: Bearer {token}
```

**Query Parameters** (Optional):
- `project_id`: Filter by project
- `context_id`: Filter by context
- `datum_van`: Filter datum >= (YYYY-MM-DD)
- `datum_tot`: Filter datum <= (YYYY-MM-DD)

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "taken": [
    {
      "id": "abc123",
      "naam": "Completed task title",
      "lijst": "afgewerkt",
      "status": "afgewerkt",
      "datum": "2025-10-25",
      "project_id": 5,
      "context_id": 3,
      "duur": 30,
      "opmerkingen": "Task notes",
      "archived_at": "2025-10-26T14:30:00Z"
    },
    ...
  ]
}
```

**Implementation Changes**:
```javascript
// In server.js GET /api/lijst/afgewerkt endpoint

// Old query:
const query = 'SELECT * FROM taken WHERE lijst = $1 AND user_id = $2';
const values = ['afgewerkt', userId];

// New query:
const query = 'SELECT * FROM taken_archief WHERE user_id = $1 ORDER BY datum DESC';
const values = [userId];

// With filters:
let query = 'SELECT * FROM taken_archief WHERE user_id = $1';
if (project_id) query += ' AND project_id = $2';
if (context_id) query += ' AND context_id = $3';
query += ' ORDER BY datum DESC, archived_at DESC';
```

**Backwards Compatibility**:
- Response format identical (no frontend changes)
- Filters work identically
- Sort order maintained
- NEW field: `archived_at` included (frontend can ignore)

---

### 3. GET /api/subtaken/:parentId (Get Subtasks)

**Purpose**: Ophalen subtaken - now checks both active and archive tables

**Existing Behavior**: `SELECT * FROM subtaken WHERE parent_taak_id=?`
**New Behavior**: Check active first, fallback to archive for archived parent

**Request**:
```http
GET /api/subtaken/:parentId HTTP/1.1
Authorization: Bearer {token}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "subtaken": [
    {
      "id": 1,
      "parent_taak_id": "abc123",
      "titel": "Subtask title",
      "voltooid": true,
      "volgorde": 0,
      "archived_at": "2025-10-26T14:30:00Z"  // Only present for archived
    },
    ...
  ]
}
```

**Implementation Changes**:
```javascript
// In server.js GET /api/subtaken/:parentId endpoint

// Try active table first
let result = await db.query(
  'SELECT * FROM subtaken WHERE parent_taak_id = $1 ORDER BY volgorde',
  [parentId]
);

// If empty, check archive
if (result.rows.length === 0) {
  result = await db.query(
    'SELECT * FROM subtaken_archief WHERE parent_taak_id = $1 ORDER BY volgorde',
    [parentId]
  );
}

return result.rows;
```

**Edge Cases**:
- Parent in active table: Read from `subtaken`
- Parent in archive table: Read from `subtaken_archief`
- No subtaken: Return empty array (both tables)

---

## New Endpoints

### 4. POST /api/admin/migrate-archive (Migration Script)

**Purpose**: Manual migration trigger voor initial data move (admin only)

**Request**:
```http
POST /api/admin/migrate-archive HTTP/1.1
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "dry_run": false  // If true, simulate without actual migration
}
```

**Response** (Success):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "tasks_migrated": 523,
  "subtasks_migrated": 1847,
  "duration_ms": 1834,
  "errors": []
}
```

**Response** (Dry Run):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "dry_run": true,
  "tasks_to_migrate": 523,
  "subtasks_to_migrate": 1847,
  "estimated_duration_ms": 2000
}
```

**Response** (Failure):
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "success": false,
  "error": "Migration failed during subtask archiving",
  "tasks_migrated": 0,  // Transaction rolled back
  "rollback": true
}
```

**Implementation**:
```javascript
// server.js POST /api/admin/migrate-archive
router.post('/api/admin/migrate-archive', requireAdmin, async (req, res) => {
  const { dry_run } = req.body;
  const startTime = Date.now();

  try {
    if (dry_run) {
      // Count only
      const takenCount = await db.query(
        'SELECT COUNT(*) FROM taken WHERE lijst = $1',
        ['afgewerkt']
      );
      const subtakenCount = await db.query(
        `SELECT COUNT(*) FROM subtaken s
         INNER JOIN taken t ON s.parent_taak_id = t.id
         WHERE t.lijst = $1`,
        ['afgewerkt']
      );

      return res.json({
        success: true,
        dry_run: true,
        tasks_to_migrate: takenCount.rows[0].count,
        subtasks_to_migrate: subtakenCount.rows[0].count,
        estimated_duration_ms: takenCount.rows[0].count * 4 // Rough estimate
      });
    }

    // Actual migration
    await db.query('BEGIN');

    // Migrate taken
    const takenResult = await db.query(`
      INSERT INTO taken_archief
      SELECT *, CURRENT_TIMESTAMP as archived_at
      FROM taken WHERE lijst = 'afgewerkt'
    `);

    // Migrate subtaken
    const subtakenResult = await db.query(`
      INSERT INTO subtaken_archief
      SELECT s.*, CURRENT_TIMESTAMP as archived_at
      FROM subtaken s
      INNER JOIN taken t ON s.parent_taak_id = t.id
      WHERE t.lijst = 'afgewerkt'
    `);

    // Delete from active
    await db.query(`
      DELETE FROM subtaken WHERE parent_taak_id IN
        (SELECT id FROM taken WHERE lijst = 'afgewerkt')
    `);
    await db.query(`DELETE FROM taken WHERE lijst = 'afgewerkt'`);

    await db.query('COMMIT');

    res.json({
      success: true,
      tasks_migrated: takenResult.rowCount,
      subtasks_migrated: subtakenResult.rowCount,
      duration_ms: Date.now() - startTime,
      errors: []
    });

  } catch (error) {
    await db.query('ROLLBACK');

    res.status(500).json({
      success: false,
      error: error.message,
      tasks_migrated: 0,
      rollback: true
    });
  }
});
```

---

### 5. GET /api/admin/archive-stats (Archive Statistics)

**Purpose**: Monitoring endpoint voor archive health (admin only)

**Request**:
```http
GET /api/admin/archive-stats HTTP/1.1
Authorization: Bearer {admin_token}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "active_tasks": 234,
  "archived_tasks": 1523,
  "active_subtasks": 89,
  "archived_subtasks": 4821,
  "recent_archives": [
    {
      "taak_id": "abc123",
      "naam": "Recently completed task",
      "archived_at": "2025-10-27T10:15:00Z",
      "user_id": 5
    },
    ...
  ],
  "archive_errors_24h": 0,
  "oldest_active_completed_task": null  // Should be null after migration
}
```

**Implementation**:
```javascript
// server.js GET /api/admin/archive-stats
router.get('/api/admin/archive-stats', requireAdmin, async (req, res) => {
  const stats = {
    active_tasks: await getCount('taken'),
    archived_tasks: await getCount('taken_archief'),
    active_subtasks: await getCount('subtaken'),
    archived_subtasks: await getCount('subtaken_archief'),
    recent_archives: await getRecentArchives(10),
    archive_errors_24h: await getArchiveErrors(),
    oldest_active_completed_task: await getOldestCompleted()
  };

  res.json(stats);
});
```

---

## Deprecated Endpoints

None - all existing endpoints maintained for backwards compatibility.

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 200  | Archive success | Normal flow |
| 200  | Archive warning | Completion succeeded, archivering failed (logged) |
| 400  | Invalid task ID | Return error |
| 404  | Task not found | Return error |
| 500  | Database error | Rollback transaction |
| 503  | Archive unavailable | Retry later |

## Rate Limiting

No changes - existing rate limits apply.

## Authentication

No changes - existing Bearer token authentication.

## Testing Contracts

See `contracts/test-scenarios.md` for complete test cases.
