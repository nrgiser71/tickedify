# Tasks: Archive Tabel voor Afgewerkte Taken

**Input**: Design documents from `/specs/037-nu-gaan-we/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓
**Branch**: `037-nu-gaan-we`
**Tech Stack**: Node.js + Express + PostgreSQL + Vanilla JavaScript

## Execution Flow
```
1. Load plan.md ✓ - Tech stack: Node.js, Express, PostgreSQL (Neon), Vanilla JS
2. Load design documents ✓
   - data-model.md: taken_archief, subtaken_archief entities
   - contracts/api-endpoints.md: 5 endpoint modifications + 2 new endpoints
   - research.md: 7 technical decisions (real-time archiving, cascade, migration)
   - quickstart.md: 7-step testing guide
3. Generate tasks by category ✓
4. Apply task rules ✓ - Database first, backend sequential, testing parallel
5. Number tasks ✓ - T001-T018 generated
6. Dependencies mapped ✓
7. Parallel execution identified ✓
8. Validation complete ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (independent files/operations)
- Paths relative to repository root
- Backend: `/server.js` (single file)
- Database: PostgreSQL migrations

## Path Conventions
- **Backend**: `/server.js` (monolithic Express app)
- **Frontend**: `/public/app.js` (Vanilla JavaScript)
- **Database**: SQL scripts executed via Neon console or migration endpoint
- **Tests**: Manual testing per quickstart.md (no automated test suite currently)

---

## Phase 3.1: Database Setup (BLOCKING)
**CRITICAL: Complete T001-T002 before any other tasks**

### T001: Create `taken_archief` Table Schema
**File**: Database migration (execute via Neon console or migration script)

**Description**:
Create the `taken_archief` table that mirrors the `taken` table schema plus archiving metadata.

**SQL**:
```sql
CREATE TABLE taken_archief (
  -- Mirrored columns from 'taken'
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

  -- Archive-specific columns
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_taken_archief_user_datum ON taken_archief(user_id, datum DESC);
CREATE INDEX idx_taken_archief_user_project ON taken_archief(user_id, project_id);
CREATE INDEX idx_taken_archief_user_context ON taken_archief(user_id, context_id);
CREATE INDEX idx_taken_archief_archived_at ON taken_archief(archived_at DESC);
```

**Acceptance Criteria**:
- [ ] Table `taken_archief` exists in database
- [ ] All 4 indexes created successfully
- [ ] Foreign keys to `projecten`, `contexten`, `users` tables work
- [ ] `\dt taken_archief` shows table structure
- [ ] `\di idx_taken_archief_*` shows all 4 indexes

**Dependencies**: None (first task)

---

### T002: Create `subtaken_archief` Table Schema
**File**: Database migration (execute via Neon console or migration script)

**Description**:
Create the `subtaken_archief` table that mirrors the `subtaken` table schema plus archiving metadata.

**SQL**:
```sql
CREATE TABLE subtaken_archief (
  -- Mirrored columns from 'subtaken'
  id SERIAL PRIMARY KEY,
  parent_taak_id VARCHAR(50) NOT NULL,
  titel VARCHAR(500) NOT NULL,
  voltooid BOOLEAN DEFAULT TRUE,
  volgorde INTEGER DEFAULT 0,

  -- Archive-specific columns
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_subtaken_archief_parent ON subtaken_archief(parent_taak_id);
CREATE INDEX idx_subtaken_archief_archived_at ON subtaken_archief(archived_at DESC);

-- Foreign key to taken_archief
ALTER TABLE subtaken_archief
  ADD CONSTRAINT fk_subtaken_archief_parent
  FOREIGN KEY (parent_taak_id)
  REFERENCES taken_archief(id)
  ON DELETE CASCADE;
```

**Acceptance Criteria**:
- [ ] Table `subtaken_archief` exists in database
- [ ] Both indexes created successfully
- [ ] Foreign key constraint to `taken_archief` active
- [ ] `\dt subtaken_archief` shows table structure
- [ ] `\d subtaken_archief` shows CASCADE DELETE constraint

**Dependencies**: T001 (requires `taken_archief` to exist for foreign key)

---

## Phase 3.2: Backend Implementation (SEQUENTIAL)
**CRITICAL: Must modify shared `/server.js` file sequentially**

### T003: Implement Archive Logic in PUT /api/taak/:id
**File**: `/server.js` (around line 2400 - existing PUT endpoint)

**Description**:
Modify the PUT /api/taak/:id endpoint to archive tasks when marked as complete, including transaction management, subtaken cascade, and recurring task support.

**Implementation**:
1. Locate existing `PUT /api/taak/:id` endpoint in server.js
2. Add completion detection: `if (updates.lijst === 'afgewerkt' && updates.status === 'afgewerkt')`
3. Implement transaction-based archiving:
   - BEGIN transaction
   - INSERT into `taken_archief` (all fields + archived_at)
   - INSERT into `subtaken_archief` (all subtaken)
   - IF recurring: CREATE new instance in `taken` with same recurring settings
   - DELETE from `subtaken` (cascade)
   - DELETE from `taken`
   - COMMIT transaction
4. Add error handling: ROLLBACK on failure, log errors, return warning
5. Return response with `archived_taak_id` and optional `new_recurring_taak_id`

**Key Code Section**:
```javascript
if (updates.lijst === 'afgewerkt' && updates.status === 'afgewerkt') {
  try {
    await db.query('BEGIN');

    // Get task data
    const task = await db.query('SELECT * FROM taken WHERE id = $1', [id]);

    // Archive task
    await db.query(`INSERT INTO taken_archief SELECT *, CURRENT_TIMESTAMP FROM taken WHERE id = $1`, [id]);

    // Archive subtaken
    await db.query(`INSERT INTO subtaken_archief SELECT *, CURRENT_TIMESTAMP FROM subtaken WHERE parent_taak_id = $1`, [id]);

    // Handle recurring
    let newRecurringId = null;
    if (task.rows[0].herhaling_actief) {
      // Create new instance using existing logic
      newRecurringId = await createRecurringInstance(task.rows[0]);
    }

    // Delete from active
    await db.query('DELETE FROM subtaken WHERE parent_taak_id = $1', [id]);
    await db.query('DELETE FROM taken WHERE id = $1', [id]);

    await db.query('COMMIT');

    res.json({ success: true, archived_taak_id: id, new_recurring_taak_id: newRecurringId });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Archive error:', error);
    res.json({ success: true, warning: 'Archive failed' });
  }
}
```

**Acceptance Criteria**:
- [ ] Endpoint detects completion (lijst='afgewerkt' AND status='afgewerkt')
- [ ] Transaction wraps all archive operations
- [ ] Task data inserted into `taken_archief` with `archived_at`
- [ ] Subtaken cascade inserted into `subtaken_archief`
- [ ] Recurring tasks create new instance before deletion
- [ ] Original task and subtaken deleted from active tables
- [ ] ROLLBACK on any error
- [ ] Response includes `archived_taak_id` and optional `new_recurring_taak_id`

**Dependencies**: T001, T002 (archive tables must exist)

---

### T004: Update GET /api/lijst/afgewerkt to Read from Archive
**File**: `/server.js` (around line 900 - existing GET endpoint)

**Description**:
Modify the GET /api/lijst/:naam endpoint to read from `taken_archief` table when lijst = 'afgewerkt'.

**Implementation**:
1. Locate existing `GET /api/lijst/:naam` endpoint in server.js
2. Add conditional logic for 'afgewerkt' lijst:
   - IF naam === 'afgewerkt': Query `taken_archief` table
   - ELSE: Query `taken` table (existing logic)
3. Maintain filters: project_id, context_id, datum filters
4. Maintain sort order: `ORDER BY datum DESC, archived_at DESC`
5. Response format unchanged (backwards compatible)

**Key Code Section**:
```javascript
app.get('/api/lijst/:naam', async (req, res) => {
  const { naam } = req.params;
  const userId = req.user.id;

  if (naam === 'afgewerkt') {
    // NEW: Read from archive
    const result = await db.query(
      'SELECT * FROM taken_archief WHERE user_id = $1 ORDER BY datum DESC, archived_at DESC',
      [userId]
    );
    return res.json({ taken: result.rows });
  }

  // Existing logic for other lists
  const result = await db.query(
    'SELECT * FROM taken WHERE lijst = $1 AND user_id = $2',
    [naam, userId]
  );
  res.json({ taken: result.rows });
});
```

**Acceptance Criteria**:
- [ ] Endpoint reads from `taken_archief` when naam='afgewerkt'
- [ ] Filters by user_id (security)
- [ ] Sort order: datum DESC, archived_at DESC
- [ ] Response format unchanged (includes archived_at field)
- [ ] Other lijst names still read from `taken` table

**Dependencies**: T001 (taken_archief table must exist)

---

### T005: Update GET /api/subtaken/:parentId for Archive Support
**File**: `/server.js` (existing GET subtaken endpoint)

**Description**:
Modify the GET /api/subtaken/:parentId endpoint to check both active and archive tables.

**Implementation**:
1. Locate existing `GET /api/subtaken/:parentId` endpoint
2. Add fallback logic:
   - First query `subtaken` table
   - If empty, query `subtaken_archief` table
3. Return whichever has results
4. Response format unchanged

**Key Code Section**:
```javascript
app.get('/api/subtaken/:parentId', async (req, res) => {
  const { parentId } = req.params;

  // Try active table first
  let result = await db.query(
    'SELECT * FROM subtaken WHERE parent_taak_id = $1 ORDER BY volgorde',
    [parentId]
  );

  // Fallback to archive if empty
  if (result.rows.length === 0) {
    result = await db.query(
      'SELECT * FROM subtaken_archief WHERE parent_taak_id = $1 ORDER BY volgorde',
      [parentId]
    );
  }

  res.json({ subtaken: result.rows });
});
```

**Acceptance Criteria**:
- [ ] Checks `subtaken` table first
- [ ] Falls back to `subtaken_archief` if empty
- [ ] Returns correct subtaken for both active and archived parents
- [ ] Response format unchanged

**Dependencies**: T002 (subtaken_archief table must exist)

---

### T006: Create POST /api/admin/migrate-archive Endpoint
**File**: `/server.js` (new admin endpoint)

**Description**:
Create admin-only endpoint voor migration van bestaande afgewerkte taken naar archive tabellen.

**Implementation**:
1. Add new POST endpoint `/api/admin/migrate-archive`
2. Require admin authentication (existing `requireAdmin` middleware)
3. Support dry_run parameter for testing
4. Implement migration logic:
   - Count afgewerkte taken/subtaken
   - BEGIN transaction
   - INSERT into archive tables
   - DELETE from active tables
   - COMMIT or ROLLBACK
5. Return statistics: tasks_migrated, subtasks_migrated, duration_ms

**Key Code Section**:
```javascript
app.post('/api/admin/migrate-archive', requireAdmin, async (req, res) => {
  const { dry_run } = req.body;
  const startTime = Date.now();

  try {
    if (dry_run) {
      const takenCount = await db.query("SELECT COUNT(*) FROM taken WHERE lijst = 'afgewerkt'");
      const subtakenCount = await db.query(
        `SELECT COUNT(*) FROM subtaken s
         INNER JOIN taken t ON s.parent_taak_id = t.id
         WHERE t.lijst = 'afgewerkt'`
      );

      return res.json({
        success: true,
        dry_run: true,
        tasks_to_migrate: takenCount.rows[0].count,
        subtasks_to_migrate: subtakenCount.rows[0].count
      });
    }

    await db.query('BEGIN');

    // Migrate taken
    const takenResult = await db.query(
      `INSERT INTO taken_archief SELECT *, CURRENT_TIMESTAMP FROM taken WHERE lijst = 'afgewerkt'`
    );

    // Migrate subtaken
    const subtakenResult = await db.query(
      `INSERT INTO subtaken_archief
       SELECT s.*, CURRENT_TIMESTAMP FROM subtaken s
       INNER JOIN taken t ON s.parent_taak_id = t.id
       WHERE t.lijst = 'afgewerkt'`
    );

    // Delete from active
    await db.query("DELETE FROM subtaken WHERE parent_taak_id IN (SELECT id FROM taken WHERE lijst = 'afgewerkt')");
    await db.query("DELETE FROM taken WHERE lijst = 'afgewerkt'");

    await db.query('COMMIT');

    res.json({
      success: true,
      tasks_migrated: takenResult.rowCount,
      subtasks_migrated: subtakenResult.rowCount,
      duration_ms: Date.now() - startTime
    });

  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ success: false, error: error.message, rollback: true });
  }
});
```

**Acceptance Criteria**:
- [ ] Endpoint requires admin authentication
- [ ] Dry run mode returns counts without migrating
- [ ] Migration wrapped in transaction
- [ ] All afgewerkte taken moved to archive
- [ ] All related subtaken moved to archive
- [ ] Original records deleted from active tables
- [ ] ROLLBACK on error
- [ ] Response includes statistics and duration

**Dependencies**: T001, T002 (archive tables must exist)

---

### T007: Create GET /api/admin/archive-stats Endpoint
**File**: `/server.js` (new admin endpoint)

**Description**:
Create admin-only monitoring endpoint voor archive health checks.

**Implementation**:
1. Add new GET endpoint `/api/admin/archive-stats`
2. Require admin authentication
3. Query statistics:
   - Active tasks count
   - Archived tasks count
   - Active subtasks count
   - Archived subtasks count
   - Recent archives (last 10)
   - Oldest active completed task (should be NULL post-migration)
4. Return JSON with all stats

**Key Code Section**:
```javascript
app.get('/api/admin/archive-stats', requireAdmin, async (req, res) => {
  const stats = {
    active_tasks: (await db.query('SELECT COUNT(*) FROM taken')).rows[0].count,
    archived_tasks: (await db.query('SELECT COUNT(*) FROM taken_archief')).rows[0].count,
    active_subtasks: (await db.query('SELECT COUNT(*) FROM subtaken')).rows[0].count,
    archived_subtasks: (await db.query('SELECT COUNT(*) FROM subtaken_archief')).rows[0].count,

    recent_archives: (await db.query(
      'SELECT id, naam, archived_at, user_id FROM taken_archief ORDER BY archived_at DESC LIMIT 10'
    )).rows,

    oldest_active_completed: (await db.query(
      "SELECT id, naam FROM taken WHERE lijst = 'afgewerkt' ORDER BY datum ASC LIMIT 1"
    )).rows[0] || null
  };

  res.json(stats);
});
```

**Acceptance Criteria**:
- [ ] Endpoint requires admin authentication
- [ ] Returns counts for all 4 tables
- [ ] Shows last 10 archived tasks
- [ ] Shows oldest active completed task (should be null after migration)
- [ ] JSON response format correct

**Dependencies**: T001, T002 (archive tables must exist)

---

## Phase 3.3: Manual Testing (PARALLEL POSSIBLE)
**Based on quickstart.md scenarios**

### T008 [P]: Test Simple Task Archiving
**File**: Manual testing via UI and API

**Description**:
Test basic task completion and archiving workflow per quickstart.md Step 3, Test Case 1.

**Steps**:
1. Login to dev.tickedify.com
2. Create task "Archive Test Task 1" in inbox
3. Move to Acties lijst
4. Mark as complete (checkbox)
5. Verify archived via API: `curl /api/lijst/afgewerkt`
6. Verify task has `archived_at` timestamp

**Acceptance Criteria**:
- [ ] Task created successfully
- [ ] Task completion triggers archiving
- [ ] Task appears in "Afgewerkt" lijst
- [ ] `archived_at` field populated
- [ ] Task removed from `taken` table
- [ ] Task present in `taken_archief` table

**Dependencies**: T003 (archive logic implemented)

---

### T009 [P]: Test Task with Subtaken Cascade Archiving
**File**: Manual testing via UI and API

**Description**:
Test cascade archiving of subtaken per quickstart.md Step 3, Test Case 2.

**Steps**:
1. Create task "Archive Test Parent" with 2 subtaken
2. Complete both subtaken
3. Complete parent task
4. Verify subtaken archived via database query:
   ```sql
   SELECT s.titel, s.parent_taak_id, s.archived_at
   FROM subtaken_archief s
   INNER JOIN taken_archief t ON s.parent_taak_id = t.id
   WHERE t.naam = 'Archive Test Parent'
   ```

**Acceptance Criteria**:
- [ ] Parent task with 2 subtaken created
- [ ] Both subtaken archived with parent
- [ ] Subtaken in `subtaken_archief` table
- [ ] `parent_taak_id` references archived parent
- [ ] Subtaken removed from `subtaken` table

**Dependencies**: T003 (archive logic with cascade implemented)

---

### T010 [P]: Test Recurring Task Archiving
**File**: Manual testing via UI and API

**Description**:
Test recurring task archiving and new instance creation per quickstart.md Step 3, Test Case 3.

**Steps**:
1. Create recurring task "Archive Test Recurring" (daily recurrence)
2. Mark task as complete
3. Verify two instances exist:
   - Completed instance in `taken_archief`
   - New instance in `taken` (active) with same recurring settings
4. Check API response includes `new_recurring_taak_id`

**Acceptance Criteria**:
- [ ] Recurring task created with herhaling_actief=TRUE
- [ ] Completion archives old instance
- [ ] New instance created with same recurring settings
- [ ] New instance has future datum
- [ ] API response includes both `archived_taak_id` and `new_recurring_taak_id`

**Dependencies**: T003 (archive logic with recurring support)

---

### T011 [P]: Test "Afgewerkt" Scherm UI
**File**: Manual testing via UI

**Description**:
Verify "Afgewerkt" screen shows archived tasks with all filters working per quickstart.md Step 3, Test Case 4.

**Steps**:
1. Navigate to "Afgewerkt" screen in sidebar
2. Verify all 3 test tasks visible (from T008, T009, T010)
3. Test filter by project
4. Test filter by context
5. Test filter by date range
6. Verify no visual differences from before

**Acceptance Criteria**:
- [ ] All archived tasks visible in UI
- [ ] Project filter works correctly
- [ ] Context filter works correctly
- [ ] Date range filter works correctly
- [ ] UI layout identical to before (no visual changes)
- [ ] `archived_at` field may be visible but doesn't break UI

**Dependencies**: T004 (GET /api/lijst/afgewerkt updated)

---

### T012 [P]: Test Database Data Integrity
**File**: Manual database verification via SQL

**Description**:
Run database integrity checks per quickstart.md Step 4.

**SQL Checks**:
```sql
-- No duplicates (task in both active and archive)
SELECT id, COUNT(*) FROM (
  SELECT id FROM taken
  UNION ALL
  SELECT id FROM taken_archief
) combined GROUP BY id HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- No orphaned subtaken
SELECT s.id FROM subtaken_archief s
LEFT JOIN taken_archief t ON s.parent_taak_id = t.id
WHERE t.id IS NULL;
-- Expected: 0 rows

-- Cascade delete works
DELETE FROM taken_archief WHERE naam = 'Archive Test Parent';
SELECT COUNT(*) FROM subtaken_archief WHERE parent_taak_id IN (
  SELECT id FROM taken_archief WHERE naam = 'Archive Test Parent'
);
-- Expected: 0 rows (cascade worked)
```

**Acceptance Criteria**:
- [ ] No duplicate tasks across active and archive
- [ ] No orphaned subtaken in archive
- [ ] CASCADE DELETE constraint works
- [ ] Foreign keys enforced correctly

**Dependencies**: T008, T009 (test data created)

---

### T013 [P]: Test Query Performance
**File**: Manual performance testing via SQL EXPLAIN

**Description**:
Verify query performance meets < 200ms target per quickstart.md Step 5.

**Performance Tests**:
```sql
-- Test afgewerkt lijst query
EXPLAIN ANALYZE
SELECT * FROM taken_archief
WHERE user_id = 1
ORDER BY datum DESC, archived_at DESC;

-- Expected: < 200ms, index scan used
```

**Acceptance Criteria**:
- [ ] Query execution time < 200ms
- [ ] Index scan used (not sequential scan)
- [ ] All 4 indexes utilized correctly
- [ ] Performance maintained with 1000+ archived tasks

**Dependencies**: T001 (indexes created)

---

## Phase 3.4: Migration Execution (SEQUENTIAL)
**CRITICAL: Must run in order, staging only first**

### T014: Dry Run Migration on Staging
**File**: API call to admin endpoint

**Description**:
Test migration without moving data per quickstart.md Step 6.

**Steps**:
1. Deploy all changes to dev.tickedify.com (staging)
2. Call migration endpoint with dry_run=true:
   ```bash
   curl -X POST "https://dev.tickedify.com/api/admin/migrate-archive" \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"dry_run":true}'
   ```
3. Verify response shows task counts without migrating
4. Confirm database unchanged

**Acceptance Criteria**:
- [ ] Dry run returns task counts
- [ ] No data actually migrated
- [ ] Response includes `dry_run: true`
- [ ] Estimated duration < 30 seconds

**Dependencies**: T006 (migration endpoint implemented)

---

### T015: Actual Migration on Staging
**File**: API call to admin endpoint + database backup

**Description**:
Execute actual migration on staging per quickstart.md Step 6.

**Steps**:
1. Backup staging database: `pg_dump [NEON_CONNECTION] > backup_staging.sql`
2. Call migration endpoint with dry_run=false:
   ```bash
   curl -X POST "https://dev.tickedify.com/api/admin/migrate-archive" \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"dry_run":false}'
   ```
3. Verify response shows successful migration
4. Run post-migration verification:
   ```sql
   SELECT COUNT(*) FROM taken WHERE lijst = 'afgewerkt'; -- Should be 0
   SELECT COUNT(*) FROM taken_archief; -- Should match pre-migration count
   ```
5. Test "Afgewerkt" UI - all tasks still visible

**Acceptance Criteria**:
- [ ] Migration completes within 30 seconds
- [ ] All afgewerkte taken moved to archive
- [ ] Zero afgewerkte taken remain in active table
- [ ] Archive table count matches pre-migration count
- [ ] "Afgewerkt" UI shows all tasks (no data loss)

**Dependencies**: T014 (dry run successful)

---

### T016: Rollback Test (Optional Safety Check)
**File**: Database restore from backup

**Description**:
Test rollback procedure per quickstart.md Step 7.

**Steps**:
1. After T015 successful, restore from backup:
   ```bash
   psql [NEON_CONNECTION] < backup_staging.sql
   ```
2. Verify database state restored
3. Drop archive tables:
   ```sql
   DROP TABLE subtaken_archief;
   DROP TABLE taken_archief;
   ```
4. Re-run migration (T015) to verify repeatability

**Acceptance Criteria**:
- [ ] Backup restores successfully
- [ ] Archive tables can be dropped and recreated
- [ ] Migration can be re-run successfully
- [ ] Rollback procedure documented and tested

**Dependencies**: T015 (migration completed)

---

## Phase 3.5: Documentation & Deployment (PARALLEL POSSIBLE)

### T017 [P]: Update ARCHITECTURE.md
**File**: `/ARCHITECTURE.md`

**Description**:
Document archive tables in architecture documentation.

**Updates Needed**:
1. Add to "Database Schema" section (lines 8-64):
   - `taken_archief` table schema
   - `subtaken_archief` table schema
   - Foreign key relationships
   - Indexes
2. Add to "API Endpoints Overzicht" section:
   - Modified: PUT /api/taak/:id (now archives)
   - Modified: GET /api/lijst/afgewerkt (reads from archive)
   - Modified: GET /api/subtaken/:parentId (supports archive)
   - New: POST /api/admin/migrate-archive
   - New: GET /api/admin/archive-stats
3. Update "Belangrijke Features & Locaties" section:
   - Add "Archive Systeem" feature description
   - Document real-time archiving flow
   - Document cascade archiving for subtaken

**Acceptance Criteria**:
- [ ] Archive tables documented in database schema section
- [ ] All endpoint changes documented
- [ ] Feature location documented with line numbers
- [ ] Migration procedure referenced
- [ ] Document updated timestamp at bottom

**Dependencies**: None (can run parallel with testing)

---

### T018 [P]: Create Production Deployment Checklist
**File**: `/specs/037-nu-gaan-we/DEPLOYMENT.md` (new file)

**Description**:
Create deployment guide for production go-live at 00:00.

**Content**:
```markdown
# Production Deployment: Archive Tabel

## Pre-Deployment (T-1 day)
- [ ] All staging tests passed (T008-T013)
- [ ] Staging migration successful (T015)
- [ ] Rollback tested successfully (T016)
- [ ] Database backup scheduled pre-migration
- [ ] Maintenance window communicated to users

## Go-Live Checklist (00:00)
- [ ] Deploy code to production (Vercel)
- [ ] Run database backup
- [ ] Execute migration: POST /api/admin/migrate-archive
- [ ] Verify migration stats (tasks_migrated count)
- [ ] Test "Afgewerkt" screen in production
- [ ] Monitor archive stats: GET /api/admin/archive-stats
- [ ] Check for errors in logs

## Post-Deployment
- [ ] Verify query performance < 200ms
- [ ] Monitor archive errors for 24h
- [ ] Update CHANGELOG.md
- [ ] Notify users of completion
```

**Acceptance Criteria**:
- [ ] Deployment checklist created
- [ ] Pre-deployment requirements listed
- [ ] Go-live steps sequenced correctly
- [ ] Post-deployment monitoring defined
- [ ] Rollback procedure included

**Dependencies**: None (documentation task)

---

## Dependencies Summary

**Blocking Dependencies**:
- T001 → T002 (subtaken_archief needs taken_archief FK)
- T001, T002 → T003, T004, T005, T006, T007 (backend needs tables)
- T003 → T008, T009, T010, T011 (testing needs archive logic)
- T004 → T011 (UI test needs GET endpoint)
- T006 → T014, T015 (migration needs endpoint)
- T014 → T015 (dry run before actual migration)
- T015 → T016 (migration before rollback test)

**Parallel Opportunities**:
- T008, T009, T010, T011, T012, T013 (all testing tasks can run parallel after T003-T005 complete)
- T017, T018 (documentation can run anytime parallel with development)

---

## Execution Recommendations

### Week 1: Database + Backend
```bash
# Day 1: Database setup
Task: T001 (taken_archief table)
Task: T002 (subtaken_archief table)

# Day 2-3: Backend implementation (sequential - same file)
Task: T003 (PUT /api/taak/:id archive logic)
Task: T004 (GET /api/lijst/afgewerkt)
Task: T005 (GET /api/subtaken/:parentId)

# Day 4: Admin endpoints (sequential - same file)
Task: T006 (migration endpoint)
Task: T007 (stats endpoint)
```

### Week 2: Testing + Migration
```bash
# Day 1: Parallel testing after backend complete
Task (parallel): T008 (simple archiving)
Task (parallel): T009 (cascade archiving)
Task (parallel): T010 (recurring)
Task (parallel): T011 (UI verification)
Task (parallel): T012 (data integrity)
Task (parallel): T013 (performance)

# Day 2: Migration staging
Task: T014 (dry run)
Task: T015 (actual migration staging)
Task: T016 (rollback test)

# Day 3: Documentation (can run parallel)
Task (parallel): T017 (ARCHITECTURE.md)
Task (parallel): T018 (deployment checklist)
```

### Production Go-Live (00:00 Maintenance Window)
```bash
1. Deploy code to production
2. Run T006 migration endpoint (dry_run: false)
3. Verify via T007 stats endpoint
4. Quick smoke test T011 (UI verification)
5. Monitor logs for errors
```

---

## Validation Checklist

- [x] All contracts have corresponding tasks
  - T003 (PUT /api/taak/:id), T004 (GET afgewerkt), T005 (GET subtaken)
  - T006 (POST migrate), T007 (GET stats)
- [x] All entities have tasks
  - T001 (taken_archief), T002 (subtaken_archief)
- [x] Tests included (manual per quickstart.md)
  - T008-T013 cover all test scenarios
- [x] Parallel tasks truly independent
  - T008-T013, T017-T018 use different files/systems
- [x] Each task specifies exact file/location
  - All tasks include file paths or SQL execution context
- [x] No same-file conflicts in [P] tasks
  - Backend tasks (T003-T007) sequential (same server.js file)
  - Testing tasks parallel (different contexts)

---

## Notes

- **No automated tests**: Tickedify currently has manual testing workflow per quickstart.md
- **Single backend file**: server.js is monolithic - backend tasks must run sequentially
- **Database first**: T001-T002 are blocking for all other tasks
- **Staging required**: T014-T016 must complete successfully before production
- **00:00 deployment**: Migration planned for maintenance window with minimal user impact
- **Rollback ready**: T016 validates rollback procedure for safety
