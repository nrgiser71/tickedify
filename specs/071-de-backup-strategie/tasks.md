# Tasks: Backup Strategie

**Input**: Design documents from `/specs/071-de-backup-strategie/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths are relative to repository root

---

## Phase 3.1: Setup & Database Schema

- [ ] T001 Add backup_metadata table schema to database.js
  - File: `/database.js`
  - Add CREATE TABLE statement from data-model.md
  - Add indexes: idx_backup_created, idx_backup_expires, idx_backup_status
  - Reference: specs/071-de-backup-strategie/data-model.md

- [ ] T002 Add transaction_log table schema to database.js
  - File: `/database.js`
  - Add CREATE TABLE statement from data-model.md
  - Add indexes: idx_txlog_timestamp, idx_txlog_table_record, idx_txlog_user
  - Reference: specs/071-de-backup-strategie/data-model.md

- [ ] T003 Deploy schema to staging and verify tables created
  - Deploy to staging branch
  - Verify via: `curl -s -L -k "https://dev.tickedify.com/api/debug/database-tables"`
  - Confirm backup_metadata and transaction_log exist

---

## Phase 3.2: Core Modules

- [ ] T004 [P] Create backup-manager.js module - BackupManager class structure
  - File: `/backup-manager.js` (NEW)
  - Create class with constructor (pool, storageManager)
  - Define TABLES_TO_BACKUP array: ['users', 'taken', 'projecten', 'contexten', 'dagelijkse_planning', 'subtaken', 'bijlagen', 'mind_dump_preferences']
  - Define RETENTION_HOURS = 24
  - Export class

- [ ] T005 [P] Create transaction-logger.js module - TransactionLogger class structure
  - File: `/transaction-logger.js` (NEW)
  - Create class with constructor (pool)
  - Define TRACKED_TABLES array: ['taken', 'projecten', 'contexten', 'dagelijkse_planning', 'subtaken']
  - Define RETENTION_HOURS = 24
  - Export class

- [ ] T006 Implement BackupManager.createBackup() method
  - File: `/backup-manager.js`
  - Export all TABLES_TO_BACKUP as JSON
  - Compress with zlib.gzip
  - Upload to B2 via storageManager
  - Insert metadata record into backup_metadata table
  - Return backup object with id, backup_id, status, size_bytes, record_counts
  - Handle errors: set status='failed', error_message

- [ ] T007 Implement BackupManager.listBackups() method
  - File: `/backup-manager.js`
  - Query backup_metadata table with optional status filter
  - Support limit parameter (default 20)
  - Order by created_at DESC
  - Return { backups: [], total: number }

- [ ] T008 Implement BackupManager.downloadBackup() method
  - File: `/backup-manager.js`
  - Find backup by id in backup_metadata
  - Download from B2 via storageManager
  - Return gzip buffer
  - Handle 404 if not found

- [ ] T009 Implement BackupManager.restoreBackup() method
  - File: `/backup-manager.js`
  - Download and decompress backup
  - Begin database transaction
  - Truncate tables in FK-safe order
  - Insert data from backup
  - Optionally replay transaction log entries since backup timestamp
  - Commit or rollback on error
  - Return { success, tablesRestored, transactionsReplayed }

- [ ] T010 Implement BackupManager.cleanupExpired() method
  - File: `/backup-manager.js`
  - Delete backup_metadata where expires_at < NOW()
  - Delete corresponding files from B2
  - Return count of deleted backups

- [ ] T011 Implement TransactionLogger.log() method
  - File: `/transaction-logger.js`
  - Insert into transaction_log table
  - Parameters: { userId, operation, tableName, recordId, oldData, newData, requestPath }
  - Handle null userId for system operations

- [ ] T012 Implement TransactionLogger.getLogSince() method
  - File: `/transaction-logger.js`
  - Query transaction_log with filters: since, until, userId, tableName, operation
  - Support limit parameter (default 100)
  - Order by timestamp DESC
  - Return { entries: [], total: number }

- [ ] T013 Implement TransactionLogger.undoOperation() method
  - File: `/transaction-logger.js`
  - Find entry by id
  - Check record hasn't been modified since (compare current state)
  - For DELETE: re-insert old_data
  - For INSERT: delete record
  - For UPDATE: update with old_data
  - Return { success, message, affectedRecord }

- [ ] T014 Implement TransactionLogger.cleanup() method
  - File: `/transaction-logger.js`
  - Delete from transaction_log where timestamp < NOW() - INTERVAL '24 hours'
  - Return count of deleted entries

---

## Phase 3.3: API Endpoints

- [ ] T015 Add GET /api/admin/backups endpoint to server.js
  - File: `/server.js`
  - Use existing admin middleware
  - Call backupManager.listBackups()
  - Support query params: limit, status
  - Return JSON response

- [ ] T016 Add POST /api/admin/backups/create endpoint to server.js
  - File: `/server.js`
  - Use existing admin middleware
  - Call backupManager.createBackup('manual')
  - Return 201 with backup object
  - Return 503 if backup already in progress

- [ ] T017 Add GET /api/admin/backups/:id endpoint to server.js
  - File: `/server.js`
  - Use existing admin middleware
  - Call backupManager.downloadBackup(id)
  - Set Content-Type: application/gzip
  - Return 404 if not found

- [ ] T018 Add POST /api/admin/backups/:id/restore endpoint to server.js
  - File: `/server.js`
  - Use existing admin middleware
  - Parse replayTransactions from body (default true)
  - Call backupManager.restoreBackup(id, replayTransactions)
  - Return restore result

- [ ] T019 Add GET /api/admin/transaction-log endpoint to server.js
  - File: `/server.js`
  - Use existing admin middleware
  - Call transactionLogger.getLogSince()
  - Support query params: since, until, userId, tableName, operation, limit
  - Return JSON response

- [ ] T020 Add POST /api/admin/transaction-log/:id/undo endpoint to server.js
  - File: `/server.js`
  - Use existing admin middleware
  - Call transactionLogger.undoOperation(id)
  - Return undo result

- [ ] T021 Add GET /api/cron/backup endpoint to server.js
  - File: `/server.js`
  - Verify Authorization header matches CRON_SECRET env var
  - Call backupManager.createBackup('scheduled')
  - Call backupManager.cleanupExpired()
  - Call transactionLogger.cleanup()
  - Return { success, backupId, cleanedUp }

---

## Phase 3.4: Transaction Logging Integration

- [ ] T022 Add transaction logging to POST /api/taak endpoint
  - File: `/server.js`
  - After successful insert, call transactionLogger.log() with operation='INSERT'
  - Include newData with the created task
  - Include req.path as requestPath

- [ ] T023 Add transaction logging to PUT /api/taak/:id endpoint
  - File: `/server.js`
  - Before update, fetch current record as oldData
  - After successful update, call transactionLogger.log() with operation='UPDATE'
  - Include oldData and newData

- [ ] T024 Add transaction logging to DELETE /api/taak/:id endpoint
  - File: `/server.js`
  - Before delete, fetch current record as oldData
  - After successful delete, call transactionLogger.log() with operation='DELETE'
  - Include oldData

- [ ] T025 Add transaction logging to projecten CRUD endpoints
  - File: `/server.js`
  - Add logging to POST/PUT/DELETE /api/projecten and /api/project/:id
  - Same pattern as taken endpoints

- [ ] T026 Add transaction logging to contexten CRUD endpoints
  - File: `/server.js`
  - Add logging to POST/PUT/DELETE /api/contexten and /api/context/:id
  - Same pattern as taken endpoints

- [ ] T027 Add transaction logging to dagelijkse_planning endpoints
  - File: `/server.js`
  - Add logging to POST/PUT/DELETE /api/dagelijkse-planning
  - Same pattern as taken endpoints

- [ ] T028 Add transaction logging to subtaken endpoints
  - File: `/server.js`
  - Add logging to POST/PUT/DELETE /api/subtaak
  - Same pattern as taken endpoints

---

## Phase 3.5: Vercel Cron Configuration

- [ ] T029 Add cron configuration to vercel.json
  - File: `/vercel.json`
  - Add crons array with schedule "0 */4 * * *" (every 4 hours)
  - Path: "/api/cron/backup"
  - Reference: Vercel Cron documentation

- [ ] T030 Add CRON_SECRET environment variable to Vercel
  - Generate secure random string
  - Add to Vercel project settings for staging
  - Document in deployment notes

---

## Phase 3.6: Admin UI

- [ ] T031 Add Backups navigation item to admin2.html sidebar
  - File: `/public/admin2.html`
  - Add nav item with backup icon
  - Link to #backups screen

- [ ] T032 Create Backups screen in admin2.html
  - File: `/public/admin2.html`
  - Add stats cards: Last backup time, Total backups, Database size
  - Add "Create Backup" button
  - Add backup list table with columns: ID, Created, Type, Size, Status, Actions

- [ ] T033 Add backup list functionality with download buttons
  - File: `/public/admin2.html`
  - Fetch from GET /api/admin/backups
  - Add Download button per row (triggers file download)
  - Add Restore button per row (with confirmation)

- [ ] T034 Add Transaction Log section to admin2.html
  - File: `/public/admin2.html`
  - Add filter controls: date range, table, operation
  - Add log entries table with columns: Time, User, Operation, Table, Record
  - Add Undo button per row (with confirmation)

---

## Phase 3.7: Testing & Validation

- [ ] T035 [P] Test backup creation via API
  - Run quickstart.md Step 2
  - Verify backup created and stored in B2
  - Verify backup_metadata record created

- [ ] T036 [P] Test backup download via API
  - Run quickstart.md Step 4
  - Verify gzip file is valid
  - Verify JSON content matches database

- [ ] T037 [P] Test transaction logging via API
  - Run quickstart.md Step 5
  - Create, update, delete a task
  - Verify all operations logged with correct data

- [ ] T038 [P] Test undo operation via API
  - Run quickstart.md Step 6
  - Undo a DELETE operation
  - Verify record is restored

- [ ] T039 Test restore functionality on staging
  - Run quickstart.md Step 8
  - Create backup, modify data, restore
  - Verify data matches backup + replayed transactions

- [ ] T040 Test cron endpoint via API
  - Run quickstart.md Step 7
  - Verify backup created
  - Verify cleanup executed

- [ ] T041 Verify admin UI functionality
  - Run quickstart.md Step 9
  - Test all UI controls manually
  - Verify data displays correctly

---

## Phase 3.8: Polish & Deploy

- [ ] T042 Bump version in package.json
  - File: `/package.json`
  - Increment patch version (e.g., 1.0.161 → 1.0.162)

- [ ] T043 Update changelog
  - File: `/public/changelog.html`
  - Add entry for backup feature
  - Include: Automatic backups, transaction logging, restore capability

- [ ] T044 Final staging deployment and verification
  - Merge to staging branch
  - Run full quickstart.md validation
  - Document any issues found

- [ ] T045 Update plan.md with Phase 3 completion
  - File: `/specs/071-de-backup-strategie/plan.md`
  - Mark Phase 3: Tasks generated ✅
  - Mark Phase 4: Implementation complete ✅

---

## Dependencies

```
T001, T002 → T003 (schema before deploy)
T003 → T004, T005 (deploy before modules)
T004 → T006, T007, T008, T009, T010 (class before methods)
T005 → T011, T012, T013, T014 (class before methods)
T006 → T015, T016, T021 (createBackup before endpoints)
T007 → T015 (listBackups before endpoint)
T008 → T017 (downloadBackup before endpoint)
T009 → T018 (restoreBackup before endpoint)
T011 → T022-T028 (log method before integration)
T012 → T019 (getLogSince before endpoint)
T013 → T020 (undoOperation before endpoint)
T015-T021 → T035-T041 (endpoints before testing)
T035-T041 → T042-T045 (testing before polish)
```

---

## Parallel Execution Examples

### Example 1: Core module creation (T004 + T005)
```
Launch in parallel:
- Task: "Create backup-manager.js module - BackupManager class structure"
- Task: "Create transaction-logger.js module - TransactionLogger class structure"
```

### Example 2: Transaction logging integration (T022-T028)
```
These modify same file (server.js) - run SEQUENTIALLY, not parallel
```

### Example 3: API testing (T035-T038)
```
Launch in parallel:
- Task: "Test backup creation via API - quickstart.md Step 2"
- Task: "Test backup download via API - quickstart.md Step 4"
- Task: "Test transaction logging via API - quickstart.md Step 5"
- Task: "Test undo operation via API - quickstart.md Step 6"
```

---

## Validation Checklist

- [x] All contracts have corresponding endpoint tasks (T015-T021)
- [x] All entities have model/schema tasks (T001-T002)
- [x] All tests come after implementation (T035-T041 after T015-T028)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

---

## Notes

- Constitution: Deploy only to staging (Beta Freeze in effect)
- Testing: Use API-based testing per constitution requirement
- Credentials: Use staging test account (jan@buskens.be)
- Verification: Check /api/version after each deploy
