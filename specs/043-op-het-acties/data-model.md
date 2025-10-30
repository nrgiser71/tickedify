# Data Model: Bulk Eigenschappen Bewerking

**Feature**: 043-op-het-acties | **Date**: 2025-10-30

## Overview
Data structures voor bulk eigenschappen bewerking feature. Focus op command object dat updates representeert.

---

## Entities

### 1. Taak (Task) - Existing Entity
**Table**: `taken` (PostgreSQL)

**Relevant Columns** (for this feature):
```sql
id                      SERIAL PRIMARY KEY
project_id              INTEGER REFERENCES projecten(id)  -- FK to projects
verschijndatum          DATE                              -- Appearance date
context                 VARCHAR(100)                      -- Context (was: context_id FK, now string?)
prioriteit              VARCHAR(20)                       -- Priority: 'laag', 'normaal', 'hoog'
estimated_time_minutes  INTEGER                           -- Estimated time in minutes
```

**Note**: Based on research, `context` appears to be stored by ID (FK to contexts table), not as string directly. The API likely resolves this.

**Validation Rules**:
- `project_id`: Must exist in `projecten` table OR NULL (geen project)
- `verschijndatum`: Valid ISO date format (YYYY-MM-DD)
- `context`: Must exist in `contexten` table OR NULL (geen context)
- `prioriteit`: Must be one of: 'laag', 'normaal', 'hoog'
- `estimated_time_minutes`: Integer >= 0

**State Transitions**: N/A (no state machine for task properties)

---

### 2. Project - Existing Entity
**Table**: `projecten` (PostgreSQL)

**Structure** (inferred from research):
```sql
id    SERIAL PRIMARY KEY
naam  VARCHAR(255) NOT NULL
-- other columns not relevant for bulk edit
```

**Usage in Bulk Edit**:
- Loaded via `this.projecten` array in TaskManager
- Populated from `/api/projecten` endpoint
- Dropdown shows all projects + "Geen project" option (NULL value)

---

### 3. Context - Existing Entity
**Table**: `contexten` (PostgreSQL)

**Structure** (based on research app.js:4370-4410):
```sql
id    SERIAL PRIMARY KEY  -- OR VARCHAR (UUID?)
naam  VARCHAR(255) NOT NULL
-- other columns not relevant for bulk edit
```

**Usage in Bulk Edit**:
- Loaded via `this.contexten` array in TaskManager
- Populated from `/api/contexten` endpoint (app.js:4349)
- Dropdown shows all contexts + "Geen context" option (NULL value)
- Sorted alfabetisch (case-insensitive, NL locale)

---

### 4. BulkEditCommand - New Entity (Client-Side Only)
**Purpose**: Represents user's bulk edit intention before API execution.

**Structure** (JavaScript object):
```javascript
{
    // Task IDs to update
    taskIds: number[],              // Array of task IDs from geselecteerdeTaken Set

    // Updates to apply (optional fields - only present if user filled them)
    updates: {
        project_id?: number | null,        // null = "Geen project", undefined = no change
        verschijndatum?: string,           // ISO date format YYYY-MM-DD
        context?: string | null,           // Context ID, null = "Geen context"
        prioriteit?: string,               // 'laag' | 'normaal' | 'hoog'
        estimated_time_minutes?: number    // Integer >= 0
    }
}
```

**Validation Rules**:
1. `taskIds.length >= 2` (FR-002: minimum 2 tasks)
2. `updates` must have at least ONE property (FR-013: "Geen eigenschappen geselecteerd" check)
3. If `verschijndatum` present: must be valid ISO date
4. If `prioriteit` present: must be 'laag', 'normaal', or 'hoog'
5. If `estimated_time_minutes` present: must be integer >= 0

**Example**:
```javascript
// User selected 5 tasks, filled Context and Priority
{
    taskIds: [101, 102, 103, 104, 105],
    updates: {
        context: "thuis-id-123",
        prioriteit: "hoog"
        // project_id, verschijndatum, estimated_time_minutes not filled = no change
    }
}
```

---

### 5. BulkEditResult - New Entity (Client-Side Only)
**Purpose**: Tracks execution results for user feedback.

**Structure** (JavaScript object):
```javascript
{
    successCount: number,           // Number of tasks successfully updated
    errorCount: number,             // Number of tasks that failed
    totalCount: number,             // Total tasks attempted (= taskIds.length)
    errors: Array<{                 // Detailed error info (for debugging)
        taskId: number,
        error: string
    }>
}
```

**Example**:
```javascript
// 5 tasks attempted, 4 succeeded, 1 failed (network error)
{
    successCount: 4,
    errorCount: 1,
    totalCount: 5,
    errors: [
        { taskId: 103, error: "Network request failed" }
    ]
}
```

---

## Data Flow

### 1. User Interaction Flow
```
User selects 2+ tasks in bulk mode
  ↓
Clicks "Eigenschappen Bewerken" button
  ↓
Popup opens with empty form fields
  ↓
User fills one or more fields
  ↓
User clicks "Opslaan"
  ↓
Validation: At least one field filled?
  ↓ (yes)
JavaScript confirm() dialog
  ↓ (user confirms)
BulkEditCommand created
  ↓
Execute bulk update
  ↓
BulkEditResult tracked
  ↓
Toast feedback shown
  ↓
Bulk mode exited, list reloaded
```

### 2. API Execution Flow
```
For each task ID in BulkEditCommand.taskIds:
  ↓
  PUT /api/taak/:id
  Body: { ...BulkEditCommand.updates }
  ↓
  Success? → successCount++
  ↓
  Failure? → errorCount++, log error
  ↓
Show result toast based on BulkEditResult
```

---

## Database Schema Changes

**Required Changes**: ❌ NONE

This feature reuses existing database schema:
- `taken` table already has all required columns
- `projecten` table already exists
- `contexten` table already exists
- No new tables needed
- No new columns needed

**API Changes**: ❌ NONE

This feature reuses existing `PUT /api/taak/:id` endpoint which already supports partial updates.

---

## Relationships

```
BulkEditCommand
    ├── taskIds[] → Task.id (many-to-many reference)
    └── updates
         ├── project_id → Project.id (optional FK)
         └── context → Context.id (optional FK)

BulkEditResult
    └── errors[].taskId → Task.id (reference for logging)
```

---

## State Diagram: Bulk Edit Workflow

```
[Idle State]
    ↓ (2+ tasks selected)
[Button Enabled]
    ↓ (button clicked)
[Popup Open]
    ↓ (user fills fields)
    ├→ (cancel) → [Popup Closed] → [Idle State]
    └→ (save)
        ↓
[Validating]
    ├→ (no fields filled) → [Show Warning] → [Popup Open]
    └→ (valid)
        ↓
[Confirming]
    ├→ (user cancels) → [Popup Closed] → [Idle State]
    └→ (user confirms)
        ↓
[Executing]
    ↓ (loop through tasks)
    ├→ [Updating Task 1]
    ├→ [Updating Task 2]
    └→ [Updating Task N]
        ↓
[Complete]
    ├→ (all success) → [Toast Success] → [Exit Bulk Mode] → [List Reload]
    └→ (partial/full failure) → [Toast Error] → [Stay in Current State]
```

---

## Memory/Storage Considerations

**Client-Side**:
- `geselecteerdeTaken`: Set<number> (already exists in TaskManager)
  - Max size: ~100-200 tasks (reasonable user selection limit)
  - Memory: ~8 bytes per task ID
  - Total: < 2KB for 200 tasks

- `BulkEditCommand`: JavaScript object
  - taskIds array: 8 bytes × N tasks
  - updates object: ~200 bytes max
  - Total: < 2KB for 200 tasks

**Server-Side**:
- No new storage - reuses existing database tables
- Transaction overhead: N × UPDATE queries (sequential)
- Network payload: ~500 bytes per PUT request

**Performance Impact**: ✅ Minimal
- Client memory: < 5KB for largest reasonable selections
- Network: Bandwidth depends on selection size (N × 500 bytes)
- Database: Standard UPDATE operations, no locking issues

---

## Data Integrity

**Atomicity**: ❌ Not Guaranteed
- Updates are sequential, not transactional
- Partial success possible (some tasks update, others fail)
- This is acceptable per spec (FR-014: graceful degradation)

**Consistency**: ✅ Guaranteed by Database
- Foreign key constraints ensure valid `project_id`
- Foreign key constraints ensure valid `context` (if FK exists)
- Check constraints ensure valid `prioriteit` enum

**Isolation**: ✅ Not Critical
- Multi-user conflicts possible but unlikely during bulk edit
- If task deleted during bulk edit: API returns 404, counted as error
- Acceptable per edge cases in spec

**Durability**: ✅ Guaranteed by PostgreSQL
- Successful updates persisted immediately
- Failed updates don't affect database state

---

## Summary

**New Entities**: 2 (client-side only)
- `BulkEditCommand`: Command object for API execution
- `BulkEditResult`: Result tracking for user feedback

**Modified Entities**: 0
- All existing entities reused without changes

**Database Changes**: 0
- No schema changes required

**API Changes**: 0
- Existing `PUT /api/taak/:id` endpoint handles all updates

This feature is **purely additive** - no breaking changes to existing data model.
