# Research: Archive Tabel Implementatie

**Feature**: Archive Tabel voor Afgewerkte Taken
**Date**: 2025-10-27
**Status**: Complete

## Research Questions

### 1. PostgreSQL Archive Table Best Practices

**Decision**: Mirror source table schema + archived_at timestamp

**Rationale**:
- Simpelste migratie strategie - `INSERT INTO archive SELECT * FROM source`
- Query compatibility - zelfde kolommen betekent UI code ongewijzigd
- Debugging gemak - troubleshooting door direct table vergelijking
- Foreign key preservation - relaties naar projecten/contexten blijven werken

**Alternatives Considered**:
- **JSON column approach**: Alle data in JSONB kolom → Rejected: complex queries, geen type safety
- **Compressed schema**: Alleen essential velden archiveren → Rejected: data loss risk, incomplete history
- **Separate database**: Archive in eigen DB → Rejected: cross-DB queries complex, deployment overhead

**Implementation Notes**:
- `CREATE TABLE taken_archief (LIKE taken INCLUDING ALL)` voor perfecte schema mirror
- Add `archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` kolom
- Zelfde indexes als source table voor filter performance

### 2. Real-time Archivering vs Batch Processing

**Decision**: Real-time archivering via database transaction

**Rationale**:
- Immediate performance benefit - actieve tabel blijft direct klein
- Simpele code flow - archivering gekoppeld aan completion event
- No timing complexity - geen batch scheduling, cron jobs, of race conditions
- User expectation alignment - "Afgewerkt" scherm direct accurate

**Alternatives Considered**:
- **Nightly batch**: Archiveer alle afgewerkte taken elke nacht → Rejected: actieve tabel bevat dag-oude afgewerkte taken, delayed performance gain
- **Weekly batch**: Archiveer eens per week → Rejected: te traag voor performance doelen
- **Lazy archiving**: Archiveer bij volgende read → Rejected: unpredictable performance, complex state management

**Implementation Notes**:
- Transaction flow: `BEGIN → INSERT INTO archive → DELETE FROM source → COMMIT`
- Error handling: On failure ROLLBACK, taak blijft in source
- Logging: Log archivering errors met taak ID en user ID voor monitoring

### 3. Cascade Archivering voor Subtaken

**Decision**: Atomaire batch insert within parent transaction

**Rationale**:
- Data consistency - parent + children altijd samen gearchiveerd
- Foreign key integrity - geen orphaned subtaken in active of archive
- Transaction safety - rollback includeert alle subtaken bij failure
- Performance - single batch insert sneller dan N individual inserts

**Alternatives Considered**:
- **Separate archiving**: Subtaken apart archiveren na parent → Rejected: race condition window, orphans mogelijk
- **Lazy subtask archiving**: Archiveer subtaken on-demand bij view → Rejected: data inconsistency, complex queries
- **No subtask archiving**: Verwijder subtaken bij parent archivering → Rejected: data loss, incomplete history

**Implementation Notes**:
```sql
BEGIN TRANSACTION;
  -- Archive parent
  INSERT INTO taken_archief SELECT * FROM taken WHERE id = $1;

  -- Archive alle subtaken in one batch
  INSERT INTO subtaken_archief
    SELECT * FROM subtaken WHERE parent_taak_id = $1;

  -- Delete from active tables
  DELETE FROM subtaken WHERE parent_taak_id = $1;
  DELETE FROM taken WHERE id = $1;
COMMIT;
```

### 4. Recurring Tasks Archivering Logic

**Decision**: Archive completed instance + create new instance in same transaction

**Rationale**:
- Seamless UX - gebruiker ziet onmiddellijk nieuwe recurring taak
- No recurring chain break - herhaling blijft consistent
- Archive accuracy - elke completion tracked in archive
- Transaction safety - rollback creates/deletes both operations

**Alternatives Considered**:
- **Keep recurring parent active**: Alleen instance data archiveren → Rejected: unclear schema, complex queries
- **Archive after last instance**: Wacht tot recurring definitie gestopt → Rejected: no clear "last" voor infinite recurrences
- **Separate recurring table**: Apart tracking voor recurring definitions → Rejected: schema complexity, migration overhead

**Implementation Notes**:
- Detect recurring: Check `herhaling_actief = TRUE` bij completion
- Calculate next date: Use existing `calculateNextRecurringDate()` logic
- Transaction flow:
  ```sql
  BEGIN;
    -- Archive completed instance (met recurring velden)
    INSERT INTO taken_archief SELECT * FROM taken WHERE id = $1;

    -- Create nieuwe instance (copy recurring velden)
    INSERT INTO taken (naam, herhaling_type, herhaling_actief, ...)
      VALUES ($naam, $herhaling_type, TRUE, ...);

    -- Delete oude instance
    DELETE FROM taken WHERE id = $1;
  COMMIT;
  ```

### 5. Migration Strategy voor Bestaande Data

**Decision**: Single maintenance window migration met verification

**Rationale**:
- Simple execution - één script, één run, klaar
- Predictable downtime - exact 15-30 min window om 00:00
- Complete verification - elk record verified tijdens migratie
- Low user impact - 10 weinig-actieve gebruikers, nacht timing
- Easy rollback - database backup pre-migration

**Alternatives Considered**:
- **Live migration**: Geen downtime, dual-write pattern → Rejected: complex state management, race conditions
- **Gradual migration**: Batch migrate over dagen → Rejected: temporary inconsistency, complex "afgewerkt" scherm logic
- **Manual migration**: Admin manually triggers → Rejected: human error risk, no atomic guarantee

**Migration Script Structure**:
```sql
-- Pre-migration checks
SELECT COUNT(*) FROM taken WHERE lijst = 'afgewerkt'; -- Know data volume

BEGIN TRANSACTION;
  -- Migrate taken
  INSERT INTO taken_archief
    SELECT *, CURRENT_TIMESTAMP as archived_at
    FROM taken
    WHERE lijst = 'afgewerkt';

  -- Migrate subtaken (join to get parent_taak_ids)
  INSERT INTO subtaken_archief
    SELECT s.*, CURRENT_TIMESTAMP as archived_at
    FROM subtaken s
    INNER JOIN taken t ON s.parent_taak_id = t.id
    WHERE t.lijst = 'afgewerkt';

  -- Verify counts match
  -- If mismatch → ROLLBACK

  -- Delete from active tables
  DELETE FROM subtaken WHERE parent_taak_id IN
    (SELECT id FROM taken WHERE lijst = 'afgewerkt');
  DELETE FROM taken WHERE lijst = 'afgewerkt';

COMMIT;

-- Post-migration verification
SELECT COUNT(*) FROM taken_archief;
SELECT COUNT(*) FROM subtaken_archief;
```

### 6. "Afgewerkt" Scherm Query Update

**Decision**: Transparent union query - read from archive only

**Rationale**:
- Zero UI changes - scherm blijft identiek
- Simple query - single table SELECT na migratie
- Performance maintained - archive table has same indexes
- Future-proof - schema mirror betekent query compatibility

**Alternatives Considered**:
- **UNION query**: `SELECT * FROM taken WHERE lijst='afgewerkt' UNION SELECT * FROM taken_archief` → Rejected: performance overhead, unnecessary complexity post-migration
- **View abstraction**: CREATE VIEW → Rejected: adds indirection layer, debugging complexity
- **Dual endpoint**: Separate API voor archive → Rejected: frontend changes, dual code paths

**Implementation Notes**:
- Update `GET /api/lijst/afgewerkt` endpoint:
  ```javascript
  // Voor migratie: SELECT * FROM taken WHERE lijst = 'afgewerkt'
  // Na migratie:  SELECT * FROM taken_archief WHERE user_id = $1
  ```
- Filter parameters identical: datum, project_id, context_id
- Sort order identical: ORDER BY datum DESC, id DESC
- Response format identical: {...}

### 7. Error Handling & Monitoring

**Decision**: Log all archivering errors + keep task in active table

**Rationale**:
- User data safety - geen task verlies bij database issues
- Observable failures - logging maakt debugging mogelijk
- Graceful degradation - system blijft functioneel ondanks archive failures
- Admin visibility - errors tracked voor proactive intervention

**Implementation Notes**:
```javascript
try {
  await db.query('BEGIN');

  // Archive logic...
  await db.query('INSERT INTO taken_archief ...');
  await db.query('DELETE FROM taken ...');

  await db.query('COMMIT');

} catch (error) {
  await db.query('ROLLBACK');

  // Log met context
  console.error('Archive failed:', {
    taak_id: taakId,
    user_id: userId,
    error: error.message,
    timestamp: new Date()
  });

  // Task blijft in active table - safe fallback
  // Return success to user (completion succeeded, archivering failed silently)
}
```

## Technology Decisions

### Database
- **PostgreSQL 14+**: Bestaande Neon hosted database
- **Transaction Isolation**: READ COMMITTED (default) voldoende
- **Indexes**: Mirror source table indexes voor filter performance

### Backend
- **Node.js + Express**: Bestaande stack
- **Database Driver**: Existing pg client
- **Transaction Management**: Explicit BEGIN/COMMIT/ROLLBACK

### Frontend
- **Vanilla JavaScript**: Geen framework changes
- **API Updates**: Minimal endpoint URL changes
- **UI**: Zero visual changes

## Performance Considerations

### Query Performance
- Archive table indexes: `(user_id, datum)`, `(user_id, project_id)`, `(user_id, context_id)`
- Target: < 200ms response time maintained
- Partitioning: Not needed voor 10,000 records per user scale

### Archiving Performance
- Single task archival: < 50ms (INSERT + DELETE in transaction)
- Bulk archival (100 tasks): < 5 seconds
- Migration: 15-30 minutes voor all existing data

### Database Growth
- Active table: Stays < 5000 records per user (performance maintained)
- Archive table: Unlimited growth OK (read-only queries, indexed)

## Security & Compliance

### Data Retention
- Archive bewaard zolang subscription actief
- Bij account deletion: CASCADE delete via user_id foreign key

### GDPR Compliance
- Complete deletion: Archive + active tables both cleaned
- Data export: Archive data included in user data exports

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Migration failure | Data loss | Pre-migration backup, transaction rollback, verification checks |
| Archive performance degradation | Slow "Afgewerkt" scherm | Same indexes as source, monitor query times |
| Recurring task archivering bug | Missing recurrences | Extensive staging testing, rollback capability |
| Subtask orphaning | Data inconsistency | Atomic transaction for parent+children |

## Open Questions
**All Resolved** - No remaining unknowns

## References
- Existing codebase: `server.js` PUT /api/taak/:id endpoint (completion logic)
- Database schema: `ARCHITECTURE.md` lines 8-64
- Recurring logic: `app.js` calculateNextRecurringDate() function
