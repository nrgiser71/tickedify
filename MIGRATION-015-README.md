# Migration 015: Admin Dashboard v2 Performance Indexes

**Feature**: Admin Dashboard v2 (T026)
**Version**: 0.19.39
**Date**: 2025-10-18
**Status**: ✅ DEPLOYED

## Overview

Deze migration voegt **35 strategic database indexes** toe voor dramatische performance verbetering van Admin Dashboard v2 queries. Alle kritieke statistics endpoints en user management operaties worden geoptimaliseerd.

## What Was Deployed

### Performance Indexes Created

#### Users Table (5 indexes)
- `idx_users_created_at` - Registratie statistieken
- `idx_users_laatste_login` - Active users tracking
- `idx_users_account_type` - Admin checks
- `idx_users_email_lower` - Case-insensitive email search
- `idx_users_naam_lower` - Case-insensitive naam search

#### Taken Table (8 indexes)
- `idx_taken_user_id` - User task queries (CASCADE support)
- `idx_taken_afgewerkt` - Completion statistics
- `idx_taken_aangemaakt` - Task creation trends
- `idx_taken_project_id` - Project grouping
- `idx_taken_context_id` - Context grouping
- `idx_taken_prioriteit` - Priority queries
- `idx_taken_top_prioriteit` - Top priority queries
- `idx_taken_user_id_afgewerkt` - **Composite index** voor user completion queries

#### Dagelijkse Planning Table (4 indexes)
- `idx_dagelijkse_planning_user_id` - User planning queries
- `idx_dagelijkse_planning_datum` - Date-based queries
- `idx_dagelijkse_planning_user_datum` - **Composite index** voor user+date queries
- `idx_dagelijkse_planning_actie_id` - Actie relation queries

#### Related Tables (18 indexes)
- **Projecten** (2): user_id, aangemaakt
- **Contexten** (2): user_id, aangemaakt
- **Bijlagen** (3): user_id, bestandsgrootte, geupload (storage statistics)
- **Feedback** (3): user_id, aangemaakt, status
- **Forensic Logs** (4): user_id, timestamp, action, category (audit trail)
- **User Storage Usage** (1): user_id
- **Subscription History** (2): user_id, created_at
- **Session** (1): expire (cleanup queries)

**Total Indexes**: 35

## Expected Performance Impact

| Query Type | Performance Improvement |
|-----------|------------------------|
| User statistics queries | 50-80% sneller |
| Task completion queries | 60-90% sneller |
| Admin search operations | 40-60% sneller |
| Storage statistics | 70-95% sneller |
| Planning queries | 50-70% sneller |
| Audit trail queries | 60-80% sneller |

## How to Run Migration

### First Time Deployment (Already Done)

```bash
node run-migration-015.js
```

**Output**: Uitgebreide verification met index summary per tabel en performance estimates.

### Rollback (Emergency Only)

```bash
node rollback-015-indexes.js
```

**Warning**: Dit dropped alle 35 indexes en degradeert Admin Dashboard performance significant. Alleen gebruiken bij kritieke issues.

## Files Created

1. **migrations/015-admin2-performance-indexes.sql**
   - SQL migration file met alle CREATE INDEX statements
   - Gebruikt werkelijke database kolomnamen (Nederlands)
   - Notities over JSON vs JSONB limitations

2. **run-migration-015.js**
   - Automated migration runner
   - Comprehensive verification (35 index check)
   - Summary by table
   - Performance impact estimates

3. **rollback-015-indexes.js**
   - Emergency rollback tool
   - 5-second safety delay
   - Verifies each index drop
   - Warnings over performance degradation

4. **MIGRATION-015-README.md** (dit bestand)
   - Deployment documentatie
   - Performance impact data
   - Usage instructions

## Technical Notes

### Composite Indexes
Twee composite indexes voor optimale performance:
- `idx_taken_user_id_afgewerkt(user_id, afgewerkt)` - Snelle filtering op user AND completion status
- `idx_dagelijkse_planning_user_datum(user_id, datum)` - Snelle planning queries per user per dag

### LOWER() Function Indexes
Voor case-insensitive search zonder ILIKE penalty:
- `idx_users_email_lower ON users(LOWER(email))`
- `idx_users_naam_lower ON users(LOWER(naam))`

**Usage**: `WHERE LOWER(email) = LOWER($1)` gebruikt index, `WHERE email ILIKE '%foo%'` niet.

### JSON vs JSONB Limitation
Session table gebruikt `JSON` (niet `JSONB`), waardoor GIN index niet mogelijk is voor `sess->>'passport'->>'user'` queries. Force logout queries gebruiken sequential scan.

**Future improvement**: Migreer session.sess van JSON naar JSONB voor GIN index support.

### IF NOT EXISTS Safety
Alle indexes gebruiken `CREATE INDEX IF NOT EXISTS`, dus migration is idempotent en kan veilig opnieuw uitgevoerd worden.

## Verification Queries

Check alle indexes:
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Check specifieke tabel:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY indexname;
```

Index usage statistics:
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

## Deployment Log

**Date**: 2025-10-18
**Environment**: Production (Neon PostgreSQL)
**Duration**: ~3 seconds
**Status**: ✅ SUCCESS
**Indexes Created**: 35/35
**Errors**: None
**Rollback Required**: No

## Admin Dashboard Impact

Deze indexes zijn **kritisch** voor Admin Dashboard v2 performance bij groeiende user base:

- **User Management**: Snelle user search en filtering
- **Statistics Dashboard**: Real-time statistics zonder timeout
- **User Data Inspector**: Comprehensive data breakdown <500ms
- **Audit Trail**: Snelle forensic log queries
- **Storage Analytics**: Real-time storage usage per user

## Next Steps

1. ✅ Migration deployed en verified
2. ✅ Changelog updated (v0.19.39)
3. ✅ Version bumped in package.json
4. ⏳ Monitor index usage via pg_stat_user_indexes
5. ⏳ Consider JSON→JSONB migration voor session table (future)

## Contact

Voor vragen over deze migration, contact Jan Buskens.

---

**Version**: 0.19.39
**Migration**: 015-admin2-performance-indexes
**Feature**: Admin Dashboard v2 (T026)
