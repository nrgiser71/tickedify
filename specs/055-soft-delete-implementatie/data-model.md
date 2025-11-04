# Data Model: Soft Delete Implementatie

**Feature**: 055-soft-delete-implementatie
**Date**: 2025-11-04

## Database Schema Changes

### 1. Taken Tabel - Nieuwe Kolommen

```sql
-- Toevoegen aan bestaande taken tabel
ALTER TABLE taken ADD COLUMN IF NOT EXISTS verwijderd_op TIMESTAMP DEFAULT NULL;
ALTER TABLE taken ADD COLUMN IF NOT EXISTS definitief_verwijderen_op TIMESTAMP DEFAULT NULL;

-- Index voor performance (filtering op NULL)
CREATE INDEX IF NOT EXISTS idx_taken_verwijderd_op ON taken(verwijderd_op);

-- Composite index voor user-scoped queries
CREATE INDEX IF NOT EXISTS idx_taken_user_verwijderd ON taken(user_id, verwijderd_op);
```

**Kolom Semantiek**:
- **verwijderd_op**:
  - NULL = Actieve taak (niet verwijderd)
  - TIMESTAMP = Soft deleted op deze datum/tijd
  - Used for: filtering queries, restore validation

- **definitief_verwijderen_op**:
  - NULL = Niet gepland voor verwijdering
  - TIMESTAMP = Permanent delete gepland op deze datum/tijd
  - Calculated: `verwijderd_op + INTERVAL '30 days'`
  - Used for: UI display ("X dagen over"), cleanup queries

### 2. Users Tabel - Cleanup Tracking

```sql
-- Toevoegen aan bestaande users tabel
ALTER TABLE users ADD COLUMN IF NOT EXISTS laatste_cleanup_op DATE DEFAULT NULL;
```

**Kolom Semantiek**:
- **laatste_cleanup_op**:
  - NULL = Nog nooit cleanup gedaan
  - DATE = Laatste keer dat cleanup werd uitgevoerd (YYYY-MM-DD)
  - Used for: dagelijkse cleanup scheduling (1x per dag per user)

**Rationale**: DATE type is voldoende (geen tijd nodig, alleen dag check)

### 3. Geen Changes aan Gerelateerde Tabellen

**Subtaken & Bijlagen**: GEEN schema changes nodig
- `ON DELETE CASCADE` constraints blijven ongewijzigd
- Soft delete (UPDATE) triggert CASCADE NIET
- Permanent delete (DELETE) triggert CASCADE normaal
- Result: subtaken en bijlagen blijven gekoppeld tijdens soft delete, restored automatisch

## Entity Relationships

```
┌─────────────┐
│   users     │
│─────────────│
│ id          │──┐
│ ...         │  │
│ laatste_    │  │ user_id
│ cleanup_op  │  │
└─────────────┘  │
                 │
                 ↓
┌─────────────────────────────┐
│          taken              │
│─────────────────────────────│
│ id                          │──┐
│ user_id (FK)                │  │
│ lijst                       │  │
│ project_id (FK)             │  │
│ ...                         │  │
│ verwijderd_op (NEW)         │  │ parent_taak_id
│ definitief_verwijderen_op   │  │ (CASCADE)
│ (NEW)                       │  │
└─────────────────────────────┘  │
       │                         │
       │ taak_id                 │
       │ (CASCADE)               │
       │                         │
       ↓                         ↓
┌──────────────┐      ┌─────────────┐
│   bijlagen   │      │  subtaken   │
│──────────────│      │─────────────│
│ id           │      │ id          │
│ taak_id (FK) │      │ parent_     │
│ ...          │      │ taak_id(FK) │
└──────────────┘      │ ...         │
                      └─────────────┘
```

**Key Points**:
- Soft delete op `taken` = geen impact op subtaken/bijlagen (UPDATE, geen DELETE)
- Restore = subtaken/bijlagen automatisch beschikbaar
- Permanent delete = CASCADE werkt normaal

## State Transitions

### Taak Lifecycle States

```
┌─────────┐
│  Actief │ (verwijderd_op = NULL)
└────┬────┘
     │
     │ DELETE actie (soft delete)
     │
     ↓
┌──────────────┐
│ Soft Deleted │ (verwijderd_op = NOW())
│              │ (definitief_verwijderen_op = NOW() + 30 days)
└───┬─────┬────┘
    │     │
    │     │ 30 dagen verlopen + cleanup trigger
    │     │
    │     ↓
    │  ┌────────────────┐
    │  │ Hard Deleted   │ (DELETE FROM taken)
    │  │ (Permanent)    │
    │  └────────────────┘
    │
    │ RESTORE actie
    │
    ↓
┌─────────┐
│ Actief  │ (verwijderd_op = NULL)
└─────────┘
```

### Validation Rules

**Soft Delete**:
```sql
-- Alleen actieve taken kunnen soft deleted worden
WHERE verwijderd_op IS NULL

-- Bij soft delete:
UPDATE taken SET
  verwijderd_op = NOW(),
  definitief_verwijderen_op = NOW() + INTERVAL '30 days',
  herhaling_actief = false  -- Stop recurring voor herhalende taken
WHERE id = $1 AND user_id = $2 AND verwijderd_op IS NULL
```

**Restore**:
```sql
-- Alleen soft deleted taken kunnen restored worden
WHERE verwijderd_op IS NOT NULL

-- Bij restore:
UPDATE taken SET
  verwijderd_op = NULL,
  definitief_verwijderen_op = NULL
  -- herhaling_actief blijft false (user moet manual reactiveren)
WHERE id = $1 AND user_id = $2 AND verwijderd_op IS NOT NULL
```

**Permanent Delete (Cleanup)**:
```sql
-- Alleen taken ouder dan 30 dagen
DELETE FROM taken
WHERE user_id = $1
  AND verwijderd_op IS NOT NULL
  AND verwijderd_op < NOW() - INTERVAL '30 days'
```

## Query Patterns

### Standard Taken Query (Actieve Taken)

```sql
-- ALLE bestaande queries moeten gefilterd worden
SELECT * FROM taken
WHERE user_id = $1
  AND lijst = $2
  AND verwijderd_op IS NULL  -- NIEUWE FILTER
ORDER BY verschijndatum, aangemaakt
```

### Prullenbak Query (Verwijderde Taken)

```sql
-- Speciaal endpoint voor prullenbak scherm
SELECT
  *,
  EXTRACT(DAY FROM (definitief_verwijderen_op - NOW())) as dagen_tot_verwijdering
FROM taken
WHERE user_id = $1
  AND verwijderd_op IS NOT NULL  -- EXPLICIET verwijderde taken
ORDER BY verwijderd_op ASC  -- Oudste eerst (soonest permanent deletion)
```

### Cleanup Trigger Check

```sql
-- Check of cleanup nodig is voor user
SELECT laatste_cleanup_op
FROM users
WHERE id = $1
  AND (laatste_cleanup_op IS NULL OR laatste_cleanup_op < CURRENT_DATE)
```

## Data Migration

**Migration Strategy**: GEEN data migratie nodig

**Rationale**:
- Nieuwe kolommen hebben DEFAULT NULL
- Bestaande data blijft ongewijzigd
- Alle bestaande taken zijn automatisch "actief" (verwijderd_op = NULL)
- Backwards compatible: oude queries werken, nieuwe filter voegt extra safety toe

**Migration Script** (voor database.js):
```javascript
// In createTables() functie
await client.query(`
  ALTER TABLE taken ADD COLUMN IF NOT EXISTS verwijderd_op TIMESTAMP DEFAULT NULL;
`);
await client.query(`
  ALTER TABLE taken ADD COLUMN IF NOT EXISTS definitief_verwijderen_op TIMESTAMP DEFAULT NULL;
`);
await client.query(`
  CREATE INDEX IF NOT EXISTS idx_taken_verwijderd_op ON taken(verwijderd_op);
`);
await client.query(`
  CREATE INDEX IF NOT EXISTS idx_taken_user_verwijderd ON taken(user_id, verwijderd_op);
`);
await client.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS laatste_cleanup_op DATE DEFAULT NULL;
`);
```

## Performance Considerations

### Index Strategy

**Primary Index**: `idx_taken_verwijderd_op ON taken(verwijderd_op)`
- Optimized for `WHERE verwijderd_op IS NULL` (actieve taken queries)
- PostgreSQL NULL handling: index scan efficient voor IS NULL checks
- Expected impact: <5ms overhead per query

**Composite Index**: `idx_taken_user_verwijderd ON taken(user_id, verwijderd_op)`
- Optimized for user-scoped queries (meest common pattern)
- Covers: `WHERE user_id = X AND verwijderd_op IS NULL`
- Expected impact: geen overhead (index hit)

### Query Impact Analysis

**Current State**:
- ~20 endpoints halen taken op
- Gemiddeld 50-200 taken per user
- Query tijd: ~50-100ms

**After Soft Delete**:
- Extra filter: `AND verwijderd_op IS NULL`
- Met index: +5-10ms overhead
- Total: ~60-110ms (10-20% increase, negligible)

**Worst Case** (geen index):
- Full table scan met extra condition
- ~100-200ms overhead
- Result: ALTIJD index toevoegen in migration!

### Cleanup Performance

**Dagelijkse Cleanup Query**:
```sql
DELETE FROM taken
WHERE user_id = $1
  AND verwijderd_op IS NOT NULL
  AND verwijderd_op < NOW() - INTERVAL '30 days'
```

**Performance Estimate**:
- Expected deleted tasks: 5-20 per user per maand
- Cleanup per dag: 0-1 taken gemiddeld
- Query tijd: ~50ms (DELETE is fast voor kleine batches)
- Frequency: 1x per dag per user = negligible impact

**Worst Case** (power user):
- 100 verwijderde taken > 30 dagen
- Cleanup query: ~200-300ms
- Frequency: 1x = acceptable (one-time cost)

## Edge Cases & Constraints

### 1. Concurrent Soft Delete
**Scenario**: User A soft deletes taak, User B probeert te verwijderen
**Handling**: User scope via `AND user_id = $2` in query
**Result**: User B krijgt geen rows affected (taak behoort tot User A)

### 2. Restore van Al-Hard-Deleted Taak
**Scenario**: Cleanup runt, daarna probeert user restore
**Handling**: `WHERE verwijderd_op IS NOT NULL` in restore query
**Result**: Geen rows affected, API returnt 404

### 3. Soft Delete van Archived Taak
**Scenario**: User probeert archived taak te soft deleten
**Handling**: Archived taken zitten in `taken_archief`, niet in `taken`
**Result**: Query raakt verkeerde tabel niet, geen conflict

### 4. Herhalende Taak Instance Deletion
**Scenario**: User soft deletes één instance van recurring taak
**Handling**: `herhaling_actief = false` alleen voor deleted instance
**Result**: Parent recurring pattern blijft actief, nieuwe instances blijven komen

**⚠️ EDGE CASE**: Als parent recurring taak soft deleted is, moeten nieuwe instances ook soft deleted zijn?
**Decision**: NEE - nieuwe instances zijn normaal actief (parent state propagates niet)
**Rationale**: User deleted oude instance, nieuwe instances zijn fresh start

### 5. Bulk Soft Delete Performance
**Scenario**: User selecteert 50 taken en soft deletes in bulk
**Handling**: Loop in frontend, individuele API calls
**Alternative**: Array support in API (`POST /api/bulk/soft-delete` met ID array)
**Decision**: Start met loop, optimize later als performance issue

## Data Integrity Checks

### Constraints

**Check Constraint** (optional, for safety):
```sql
-- Ensure definitief_verwijderen_op alleen set is als verwijderd_op set is
ALTER TABLE taken ADD CONSTRAINT chk_soft_delete_consistency
CHECK (
  (verwijderd_op IS NULL AND definitief_verwijderen_op IS NULL)
  OR
  (verwijderd_op IS NOT NULL AND definitief_verwijderen_op IS NOT NULL)
);
```

**Rationale**: Voorkomt inconsistente state waar definitief_verwijderen_op set is maar verwijderd_op NULL is

### Audit Queries

**Check inconsistente state**:
```sql
-- Taken met definitief_verwijderen_op maar geen verwijderd_op
SELECT id, tekst, verwijderd_op, definitief_verwijderen_op
FROM taken
WHERE verwijderd_op IS NULL AND definitief_verwijderen_op IS NOT NULL;

-- Taken met verwijderd_op maar geen definitief_verwijderen_op
SELECT id, tekst, verwijderd_op, definitief_verwijderen_op
FROM taken
WHERE verwijderd_op IS NOT NULL AND definitief_verwijderen_op IS NULL;
```

**Expected Result**: 0 rows (consistent state)

## Testing Queries

### Setup Test Data
```sql
-- Create soft deleted taak (recent)
INSERT INTO taken (id, tekst, user_id, lijst, verwijderd_op, definitief_verwijderen_op)
VALUES ('test-soft-1', 'Recent verwijderde taak', 'user-123', 'acties',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days' + INTERVAL '30 days');

-- Create soft deleted taak (>30 dagen oud, moet gecleanup worden)
INSERT INTO taken (id, tekst, user_id, lijst, verwijderd_op, definitief_verwijderen_op)
VALUES ('test-soft-2', 'Oude verwijderde taak', 'user-123', 'acties',
        NOW() - INTERVAL '35 days',
        NOW() - INTERVAL '35 days' + INTERVAL '30 days');
```

### Verify Queries
```sql
-- Test: Actieve taken query exclude soft deleted
SELECT COUNT(*) FROM taken
WHERE user_id = 'user-123'
  AND verwijderd_op IS NULL;
-- Expected: Normale taken count (geen soft deleted)

-- Test: Prullenbak query toont soft deleted
SELECT COUNT(*) FROM taken
WHERE user_id = 'user-123'
  AND verwijderd_op IS NOT NULL;
-- Expected: 2 (beide test taken)

-- Test: Cleanup identificeert oude taken
SELECT COUNT(*) FROM taken
WHERE user_id = 'user-123'
  AND verwijderd_op IS NOT NULL
  AND verwijderd_op < NOW() - INTERVAL '30 days';
-- Expected: 1 (test-soft-2)
```

## Data Model Complete ✅

All entities, relationships, state transitions, and validation rules documented. Ready for contract generation.
