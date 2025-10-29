# Quickstart: Archive Tabel Feature

**Feature**: Archive Tabel voor Afgewerkte Taken
**Branch**: `037-nu-gaan-we`
**Date**: 2025-10-27

## Doel

Deze guide helpt developers de archive functionaliteit snel te testen en valideren tijdens development.

## Prerequisites

- PostgreSQL database access (Neon connection string)
- Node.js + npm installed
- Tickedify repository cloned op `037-nu-gaan-we` branch
- Test account credentials (`jan@buskens.be` / `qyqhut-muDvop-fadki9`)

## Step 1: Database Schema Setup

### Create Archive Tables

```sql
-- Connect to Neon database
psql [YOUR_NEON_CONNECTION_STRING]

-- Create taken_archief table
CREATE TABLE taken_archief (
  id VARCHAR(50) PRIMARY KEY,
  naam TEXT NOT NULL,
  lijst VARCHAR(50),
  status VARCHAR(20),
  datum VARCHAR(10),
  verschijndatum VARCHAR(10),
  project_id INTEGER REFERENCES projecten(id),
  context_id INTEGER REFERENCES contexten(id),
  duur INTEGER,
  opmerkingen TEXT,
  top_prioriteit INTEGER,
  prioriteit_datum VARCHAR(10),
  herhaling_type VARCHAR(50),
  herhaling_waarde INTEGER,
  herhaling_actief BOOLEAN DEFAULT FALSE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_taken_archief_user_datum ON taken_archief(user_id, datum DESC);
CREATE INDEX idx_taken_archief_user_project ON taken_archief(user_id, project_id);
CREATE INDEX idx_taken_archief_user_context ON taken_archief(user_id, context_id);
CREATE INDEX idx_taken_archief_archived_at ON taken_archief(archived_at DESC);

-- Create subtaken_archief table
CREATE TABLE subtaken_archief (
  id SERIAL PRIMARY KEY,
  parent_taak_id VARCHAR(50) NOT NULL,
  titel VARCHAR(500) NOT NULL,
  voltooid BOOLEAN DEFAULT TRUE,
  volgorde INTEGER DEFAULT 0,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index and foreign key
CREATE INDEX idx_subtaken_archief_parent ON subtaken_archief(parent_taak_id);
CREATE INDEX idx_subtaken_archief_archived_at ON subtaken_archief(archived_at DESC);

ALTER TABLE subtaken_archief
  ADD CONSTRAINT fk_subtaken_archief_parent
  FOREIGN KEY (parent_taak_id)
  REFERENCES taken_archief(id)
  ON DELETE CASCADE;
```

### Verify Schema

```sql
-- Check tables exist
\dt taken_archief
\dt subtaken_archief

-- Check indexes
\di idx_taken_archief_*
\di idx_subtaken_archief_*

-- Verify foreign keys
\d subtaken_archief
```

**Expected Output**: Tables en indexes aangemaakt, foreign key constraint actief.

---

## Step 2: Code Implementation

### Backend Changes (server.js)

**Location**: `/server.js`

**Modify PUT /api/taak/:id endpoint**:

```javascript
// Find existing endpoint (around line 2400)
app.put('/api/taak/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Check if marking as completed
  if (updates.lijst === 'afgewerkt' && updates.status === 'afgewerkt') {
    try {
      await db.query('BEGIN');

      // 1. Get current task data
      const task = await db.query('SELECT * FROM taken WHERE id = $1', [id]);
      if (task.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Task not found' });
      }

      const taskData = task.rows[0];

      // 2. Archive task
      await db.query(`
        INSERT INTO taken_archief (
          id, naam, lijst, status, datum, verschijndatum,
          project_id, context_id, duur, opmerkingen,
          top_prioriteit, prioriteit_datum,
          herhaling_type, herhaling_waarde, herhaling_actief,
          user_id, archived_at
        ) SELECT
          id, naam, 'afgewerkt', 'afgewerkt', datum, verschijndatum,
          project_id, context_id, duur, opmerkingen,
          top_prioriteit, prioriteit_datum,
          herhaling_type, herhaling_waarde, FALSE,
          user_id, CURRENT_TIMESTAMP
        FROM taken WHERE id = $1
      `, [id]);

      // 3. Archive subtaken
      await db.query(`
        INSERT INTO subtaken_archief (
          id, parent_taak_id, titel, voltooid, volgorde, archived_at
        )
        SELECT id, parent_taak_id, titel, voltooid, volgorde, CURRENT_TIMESTAMP
        FROM subtaken WHERE parent_taak_id = $1
      `, [id]);

      // 4. Handle recurring tasks
      let newRecurringId = null;
      if (taskData.herhaling_actief) {
        // Create new instance (existing logic)
        const newTask = await createRecurringInstance(taskData);
        newRecurringId = newTask.id;
      }

      // 5. Delete from active tables
      await db.query('DELETE FROM subtaken WHERE parent_taak_id = $1', [id]);
      await db.query('DELETE FROM taken WHERE id = $1', [id]);

      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'Taak afgewerkt en gearchiveerd',
        archived_taak_id: id,
        new_recurring_taak_id: newRecurringId
      });

    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Archive error:', error);

      // Fallback: mark complete without archiving
      res.json({
        success: true,
        message: 'Taak afgewerkt (archivering pending)',
        warning: 'Archive failed'
      });
    }
  } else {
    // Normal update (existing logic)
    // ... existing code ...
  }
});
```

**Modify GET /api/lijst/afgewerkt endpoint**:

```javascript
// Find existing endpoint (around line 900)
app.get('/api/lijst/:naam', async (req, res) => {
  const { naam } = req.params;
  const userId = req.user.id;

  if (naam === 'afgewerkt') {
    // NEW: Read from archive table
    const result = await db.query(
      'SELECT * FROM taken_archief WHERE user_id = $1 ORDER BY datum DESC, archived_at DESC',
      [userId]
    );

    res.json({ taken: result.rows });
  } else {
    // Existing logic for other lists
    const result = await db.query(
      'SELECT * FROM taken WHERE lijst = $1 AND user_id = $2',
      [naam, userId]
    );

    res.json({ taken: result.rows });
  }
});
```

### Frontend Changes

**No changes required** - API response format identical.

---

## Step 3: Manual Testing

### Test Case 1: Simple Task Archiving

```bash
# 1. Login to staging
open https://dev.tickedify.com/app
# Login: jan@buskens.be / qyqhut-muDvop-fadki9

# 2. Create test task in inbox
# Naam: "Archive Test Task 1"

# 3. Move to "Acties" lijst
# Drag from inbox to acties

# 4. Mark as complete
# Click checkbox to complete

# 5. Verify archived
curl -s -L -k "https://dev.tickedify.com/api/lijst/afgewerkt" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.taken[] | select(.naam == "Archive Test Task 1")'

# Expected: Task present in afgewerkt lijst with archived_at timestamp
```

### Test Case 2: Task with Subtasks

```bash
# 1. Create task met subtaken
# - Naam: "Archive Test Parent"
# - Add subtask: "Subtask 1"
# - Add subtask: "Subtask 2"

# 2. Complete alle subtaken
# Check off both subtasks

# 3. Complete parent task
# Check parent checkbox

# 4. Verify subtaken archived
psql [NEON_CONNECTION] -c "
  SELECT s.titel, s.parent_taak_id, s.archived_at
  FROM subtaken_archief s
  INNER JOIN taken_archief t ON s.parent_taak_id = t.id
  WHERE t.naam = 'Archive Test Parent'
"

# Expected: Both subtasks present in subtaken_archief
```

### Test Case 3: Recurring Task

```bash
# 1. Create recurring task
# - Naam: "Archive Test Recurring"
# - Herhaling: "Dagelijks"

# 2. Mark complete
# Complete the task

# 3. Verify two tasks exist:
# - Archived instance in taken_archief
# - New instance in taken (active)

curl -s -L -k "https://dev.tickedify.com/api/lijst/acties" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.taken[] | select(.naam == "Archive Test Recurring")'

# Expected: New instance exists with same name + recurring settings
```

### Test Case 4: "Afgewerkt" Scherm

```bash
# 1. Navigate to "Afgewerkt" screen in UI
# Click "Afgewerkt" in sidebar

# 2. Verify all archived tasks visible
# Should see all 3 test tasks created above

# 3. Test filters
# - Filter by project
# - Filter by context
# - Filter by date range

# Expected: Filters work identically to before (no UI changes)
```

---

## Step 4: Database Verification

### Check Archive Data Integrity

```sql
-- Count active vs archived
SELECT
  (SELECT COUNT(*) FROM taken) as active_tasks,
  (SELECT COUNT(*) FROM taken_archief) as archived_tasks,
  (SELECT COUNT(*) FROM subtaken) as active_subtasks,
  (SELECT COUNT(*) FROM subtaken_archief) as archived_subtasks;

-- Verify no duplicates (task in both active and archive)
SELECT id, COUNT(*)
FROM (
  SELECT id FROM taken
  UNION ALL
  SELECT id FROM taken_archief
) combined
GROUP BY id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)

-- Check orphaned subtasks (parent not in archive)
SELECT s.id, s.parent_taak_id
FROM subtaken_archief s
LEFT JOIN taken_archief t ON s.parent_taak_id = t.id
WHERE t.id IS NULL;
-- Expected: 0 rows (no orphans)

-- Verify foreign key constraints work
DELETE FROM taken_archief WHERE naam = 'Archive Test Parent';
SELECT COUNT(*) FROM subtaken_archief WHERE parent_taak_id = 'deleted_parent_id';
-- Expected: 0 rows (cascade delete worked)
```

---

## Step 5: Performance Testing

### Measure Query Performance

```sql
-- Test "Afgewerkt" scherm query performance
EXPLAIN ANALYZE
SELECT * FROM taken_archief
WHERE user_id = 1
ORDER BY datum DESC, archived_at DESC;

-- Target: < 200ms execution time
-- Check: Index scan used (not seq scan)
```

### Load Test (Optional)

```bash
# Create 1000 test archived tasks
for i in {1..1000}; do
  curl -s -X POST "https://dev.tickedify.com/api/taak" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"naam\":\"Load Test Task $i\",\"lijst\":\"acties\"}"

  # Mark complete immediately
  curl -s -X PUT "https://dev.tickedify.com/api/taak/TASK_ID" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"lijst\":\"afgewerkt\",\"status\":\"afgewerkt\"}"
done

# Measure "Afgewerkt" scherm load time
time curl -s "https://dev.tickedify.com/api/lijst/afgewerkt" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Target: < 2 seconds for 1000 tasks
```

---

## Step 6: Migration Testing (Staging Only)

### Dry Run Migration

```bash
# Test migration zonder data te verplaatsen
curl -s -X POST "https://dev.tickedify.com/api/admin/migrate-archive" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dry_run":true}' \
  | jq '.'

# Expected output:
# {
#   "success": true,
#   "dry_run": true,
#   "tasks_to_migrate": 123,
#   "subtasks_to_migrate": 456,
#   "estimated_duration_ms": 500
# }
```

### Actual Migration (Staging)

```bash
# Backup database first!
pg_dump [NEON_CONNECTION] > backup_pre_migration.sql

# Run migration
curl -s -X POST "https://dev.tickedify.com/api/admin/migrate-archive" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dry_run":false}' \
  | jq '.'

# Verify results
# - tasks_migrated should match "afgewerkt" count
# - subtasks_migrated should match related subtasks
# - duration_ms should be < 30 seconds
```

### Post-Migration Verification

```sql
-- Should be 0 afgewerkte taken in active table
SELECT COUNT(*) FROM taken WHERE lijst = 'afgewerkt';
-- Expected: 0

-- All should be in archive
SELECT COUNT(*) FROM taken_archief WHERE lijst = 'afgewerkt';
-- Expected: Same as pre-migration "afgewerkt" count

-- UI test: Open "Afgewerkt" scherm
-- Expected: All tasks still visible, no missing data
```

---

## Step 7: Rollback (If Needed)

### Database Rollback

```bash
# Restore from backup
psql [NEON_CONNECTION] < backup_pre_migration.sql

# Drop archive tables
psql [NEON_CONNECTION] -c "DROP TABLE subtaken_archief;"
psql [NEON_CONNECTION] -c "DROP TABLE taken_archief;"
```

### Code Rollback

```bash
# Revert server.js changes
git checkout main -- server.js

# Redeploy
vercel --prod
```

---

## Common Issues & Solutions

### Issue 1: Foreign Key Constraint Error

**Symptom**: `ERROR: foreign key violation` bij archivering

**Solution**:
```sql
-- Check if parent taak exists in archive
SELECT * FROM taken_archief WHERE id = 'parent_id';

-- If not, archive parent first before subtaken
```

### Issue 2: Transaction Timeout

**Symptom**: Migration takes > 30 seconds, times out

**Solution**:
```javascript
// Increase transaction timeout in migration script
await db.query('SET statement_timeout = 60000'); // 60 seconds
```

### Issue 3: "Afgewerkt" Scherm Shows No Tasks

**Symptom**: UI shows empty list after migration

**Solution**:
```javascript
// Verify endpoint reads from archive table
console.log('Query:', 'SELECT * FROM taken_archief WHERE user_id = ?');

// Check for missing user_id filter
WHERE user_id = $1  // Must be present!
```

---

## Success Criteria

✅ **Database**: Archive tables exist with correct schema + indexes
✅ **Archiving**: Tasks move to archive on completion (< 50ms)
✅ **Subtaken**: Cascade archivering works atomically
✅ **Recurring**: New instance created, old archived
✅ **UI**: "Afgewerkt" scherm shows archived tasks (no visual changes)
✅ **Performance**: Queries < 200ms, page load < 2 sec
✅ **Migration**: All existing "afgewerkt" tasks migrated successfully
✅ **Rollback**: Can restore from backup if needed

---

## Next Steps

1. **Staging Deployment**: Deploy to dev.tickedify.com en run all tests
2. **User Acceptance**: Test met Jan's account voor real-world validation
3. **Production Planning**: Schedule 00:00 maintenance window
4. **Monitoring**: Setup alerts voor archive errors
5. **Documentation**: Update ARCHITECTURE.md met archive table details
