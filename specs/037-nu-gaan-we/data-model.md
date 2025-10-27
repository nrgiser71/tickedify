# Data Model: Archive Tabellen

**Feature**: Archive Tabel voor Afgewerkte Taken
**Date**: 2025-10-27

## Entity Overview

### Nieuwe Entiteiten

1. **TaakArchief** (`taken_archief`) - Gearchiveerde voltooide taken
2. **SubtaakArchief** (`subtaken_archief`) - Gearchiveerde subtaken

### Bestaande Entiteiten (Modified)

3. **Taak** (`taken`) - Blijft ongewijzigd (geen schema changes)
4. **Subtaak** (`subtaken`) - Blijft ongewijzigd (geen schema changes)

## Schema Definitions

### taken_archief

**Purpose**: Permanent opslag voor voltooide taken, mirrors `taken` table schema

**Schema**:
```sql
CREATE TABLE taken_archief (
  -- Mirrored columns from 'taken' table
  id VARCHAR(50) PRIMARY KEY,
  naam TEXT NOT NULL,
  lijst VARCHAR(50),                    -- Always 'afgewerkt' for archived tasks
  status VARCHAR(20),                   -- Always 'afgewerkt' for archived tasks
  datum VARCHAR(10),                    -- YYYY-MM-DD format
  verschijndatum VARCHAR(10),           -- YYYY-MM-DD format
  project_id INTEGER REFERENCES projecten(id),
  context_id INTEGER REFERENCES contexten(id),
  duur INTEGER,                         -- Duration in minutes
  opmerkingen TEXT,
  top_prioriteit INTEGER,               -- 1, 2, 3 or NULL
  prioriteit_datum VARCHAR(10),         -- YYYY-MM-DD format
  herhaling_type VARCHAR(50),           -- Recurring pattern (preserved for history)
  herhaling_waarde INTEGER,             -- Legacy field
  herhaling_actief BOOLEAN DEFAULT FALSE, -- Always FALSE in archive (recurring stopped)
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Archive-specific columns
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes voor query performance
CREATE INDEX idx_taken_archief_user_datum ON taken_archief(user_id, datum DESC);
CREATE INDEX idx_taken_archief_user_project ON taken_archief(user_id, project_id);
CREATE INDEX idx_taken_archief_user_context ON taken_archief(user_id, context_id);
CREATE INDEX idx_taken_archief_archived_at ON taken_archief(archived_at DESC);
```

**Field Descriptions**:
- `id`: Preserved from source table - unieke taak identifier
- `naam`: Task title
- `lijst`: Always `'afgewerkt'` in archive
- `status`: Always `'afgewerkt'` in archive
- `datum`: Original due date (preserved for history)
- `verschijndatum`: Original visibility date
- `project_id`, `context_id`: Foreign keys preserved - relaties naar projecten/contexten blijven intact
- `duur`: Task duration in minutes
- `opmerkingen`: Task notes/comments
- `top_prioriteit`: Historical top priority value (1/2/3 or NULL)
- `prioriteit_datum`: Historical priority date
- `herhaling_type`, `herhaling_waarde`, `herhaling_actief`: Recurring info preserved for history (actief always FALSE)
- `user_id`: Owner van taak - critical voor multi-user support en GDPR deletion
- `archived_at`: **NEW** - Timestamp wanneer taak gearchiveerd werd
- `created_at`: **NEW** - Timestamp voor audit trail

**Constraints**:
- PRIMARY KEY on `id`
- FOREIGN KEY `user_id` REFERENCES `users(id)` ON DELETE CASCADE (GDPR compliance)
- FOREIGN KEY `project_id` REFERENCES `projecten(id)` (optional)
- FOREIGN KEY `context_id` REFERENCES `contexten(id)` (optional)
- `archived_at` NOT NULL (elke archive entry moet timestamp hebben)

**Business Rules**:
- Records are INSERT-only (no updates after archivering)
- Deletion only via user account deletion (CASCADE)
- `lijst` altijd `'afgewerkt'` (consistency check)
- `status` altijd `'afgewerkt'` (consistency check)

### subtaken_archief

**Purpose**: Gearchiveerde subtaken van archived parent taken

**Schema**:
```sql
CREATE TABLE subtaken_archief (
  -- Mirrored columns from 'subtaken' table
  id SERIAL PRIMARY KEY,
  parent_taak_id VARCHAR(50) NOT NULL, -- References taken_archief.id
  titel VARCHAR(500) NOT NULL,
  voltooid BOOLEAN DEFAULT TRUE,       -- Always TRUE in archive
  volgorde INTEGER DEFAULT 0,

  -- Archive-specific columns
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index voor parent lookup
CREATE INDEX idx_subtaken_archief_parent ON subtaken_archief(parent_taak_id);
CREATE INDEX idx_subtaken_archief_archived_at ON subtaken_archief(archived_at DESC);

-- Foreign key constraint to taken_archief
ALTER TABLE subtaken_archief
  ADD CONSTRAINT fk_subtaken_archief_parent
  FOREIGN KEY (parent_taak_id)
  REFERENCES taken_archief(id)
  ON DELETE CASCADE;
```

**Field Descriptions**:
- `id`: Auto-increment primary key (preserved from source)
- `parent_taak_id`: Reference naar parent taak in `taken_archief`
- `titel`: Subtask title
- `voltooid`: Always `TRUE` in archive (completed subtasks)
- `volgorde`: Original order in parent task list
- `archived_at`: **NEW** - Timestamp wanneer subtaak gearchiveerd werd (same as parent)
- `created_at`: **NEW** - Timestamp voor audit trail

**Constraints**:
- PRIMARY KEY on `id`
- FOREIGN KEY `parent_taak_id` REFERENCES `taken_archief(id)` ON DELETE CASCADE
- `archived_at` NOT NULL
- `voltooid` always TRUE (constraint of business rule?)

**Business Rules**:
- Records are INSERT-only (no updates)
- Cascade deleted when parent taak deleted
- Always archived together with parent (atomically)
- `voltooid` altijd TRUE (alle subtaken completed before parent archivering)

## Entity Relationships

```
users (existing)
  ├─ 1:N → taken_archief (user_id FK)
  └─ CASCADE DELETE

taken_archief
  ├─ N:1 → projecten (project_id FK, optional)
  ├─ N:1 → contexten (context_id FK, optional)
  ├─ N:1 → users (user_id FK)
  └─ 1:N → subtaken_archief (parent_taak_id FK)
        └─ CASCADE DELETE

subtaken_archief
  └─ N:1 → taken_archief (parent_taak_id FK)
```

## Data Validation Rules

### taken_archief
1. `id` moet unique zijn (geen duplicates van active taken)
2. `user_id` moet NOT NULL zijn (elke taak heeft owner)
3. `archived_at` moet NOT NULL en >= task creation timestamp
4. `lijst` moet `'afgewerkt'` zijn (validation)
5. `status` moet `'afgewerkt'` zijn (validation)
6. `project_id` en `context_id` moeten bestaan in parent tables als not NULL

### subtaken_archief
1. `parent_taak_id` moet bestaan in `taken_archief`
2. `voltooid` moet TRUE zijn (validation rule)
3. `archived_at` moet NOT NULL zijn
4. `titel` mag niet empty zijn (min length 1)

## State Transitions

### Taak Archivering Flow

```
Active State (taken table)
  ├─ lijst: 'acties' | 'inbox' | 'opvolgen' | 'uitgesteld-*'
  ├─ status: 'actief' | 'uitgesteld'
  └─ User marks complete
       ↓
  [Transition: Mark Complete]
       ↓
  ├─ 1. INSERT into taken_archief (all fields + archived_at)
  ├─ 2. INSERT into subtaken_archief (all subtaken)
  ├─ 3. If recurring: CREATE new instance in taken
  ├─ 4. DELETE from subtaken (where parent_taak_id)
  ├─ 5. DELETE from taken (id)
  └─ 6. COMMIT transaction
       ↓
Archive State (taken_archief table)
  ├─ lijst: 'afgewerkt'
  ├─ status: 'afgewerkt'
  └─ Read-only (no further transitions)
```

### Subtaak Cascade Flow

```
Active Subtaken (subtaken table)
  └─ parent_taak_id → taken.id
       ↓
  [Parent Archived]
       ↓
  ├─ INSERT into subtaken_archief (batch)
  └─ DELETE from subtaken (batch)
       ↓
Archive Subtaken (subtaken_archief table)
  └─ parent_taak_id → taken_archief.id
```

## Migration Data Mapping

### Existing 'taken' → 'taken_archief'
```sql
INSERT INTO taken_archief (
  id, naam, lijst, status, datum, verschijndatum,
  project_id, context_id, duur, opmerkingen,
  top_prioriteit, prioriteit_datum,
  herhaling_type, herhaling_waarde, herhaling_actief,
  user_id, archived_at
)
SELECT
  id, naam, lijst, status, datum, verschijndatum,
  project_id, context_id, duur, opmerkingen,
  top_prioriteit, prioriteit_datum,
  herhaling_type, herhaling_waarde, herhaling_actief,
  user_id, CURRENT_TIMESTAMP
FROM taken
WHERE lijst = 'afgewerkt';
```

### Existing 'subtaken' → 'subtaken_archief'
```sql
INSERT INTO subtaken_archief (
  id, parent_taak_id, titel, voltooid, volgorde, archived_at
)
SELECT
  s.id, s.parent_taak_id, s.titel, s.voltooid, s.volgorde,
  CURRENT_TIMESTAMP
FROM subtaken s
INNER JOIN taken t ON s.parent_taak_id = t.id
WHERE t.lijst = 'afgewerkt';
```

## Performance Considerations

### Index Strategy
- **Primary lookups**: user_id + datum DESC (most common filter)
- **Project filtering**: user_id + project_id
- **Context filtering**: user_id + context_id
- **Admin queries**: archived_at DESC (monitoring recent archives)

### Query Optimization
- Avoid full table scans - all queries scoped by user_id
- Use EXPLAIN ANALYZE voor query plans
- Monitor slow query log voor > 200ms queries

### Growth Projections
- **10 users x 10,000 archived tasks = 100,000 rows** (current scale)
- **1000 users x 10,000 archived tasks = 10M rows** (future scale)
- **Partitioning**: Consider partitioning by user_id at 10M+ rows

## Security & Privacy

### Data Access
- All queries MUST include `user_id` filter (prevent cross-user data leaks)
- No direct table access from frontend
- All reads via authenticated API endpoints

### GDPR Compliance
- ON DELETE CASCADE ensures complete data removal
- Archive data included in user data export
- Retention policy: Deleted bij subscription cancellation

## Testing Data

### Minimal Test Dataset
```sql
-- Test user
INSERT INTO users (id, username, email) VALUES
  (999, 'test_archive', 'test@archive.local');

-- Test archived task
INSERT INTO taken_archief (
  id, naam, lijst, status, user_id, archived_at
) VALUES (
  'test-001',
  'Test Archived Task',
  'afgewerkt',
  'afgewerkt',
  999,
  '2025-10-27 12:00:00'
);

-- Test archived subtask
INSERT INTO subtaken_archief (
  parent_taak_id, titel, voltooid, archived_at
) VALUES (
  'test-001',
  'Test Archived Subtask',
  TRUE,
  '2025-10-27 12:00:00'
);
```

## Rollback Strategy

### Undo Migration
```sql
-- Move data back to active tables
INSERT INTO taken SELECT
  id, naam, lijst, status, datum, verschijndatum,
  project_id, context_id, duur, opmerkingen,
  top_prioriteit, prioriteit_datum,
  herhaling_type, herhaling_waarde, herhaling_actief,
  user_id
FROM taken_archief;

INSERT INTO subtaken SELECT
  id, parent_taak_id, titel, voltooid, volgorde, created_at
FROM subtaken_archief;

-- Drop archive tables
DROP TABLE subtaken_archief;
DROP TABLE taken_archief;
```
