# Data Model: Backup Strategie

**Feature**: 071-de-backup-strategie
**Date**: 2025-12-03

---

## Entities

### Backup

Represents a complete database snapshot stored in B2.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | VARCHAR(50) | Yes | Unique identifier (UUID) |
| backup_id | VARCHAR(50) | Yes | Human-readable backup ID (timestamp-based) |
| created_at | TIMESTAMPTZ | Yes | When backup was created |
| backup_type | VARCHAR(20) | Yes | 'scheduled' or 'manual' |
| storage_path | VARCHAR(500) | Yes | B2 object path |
| size_bytes | BIGINT | No | Compressed file size |
| record_counts | JSONB | No | Row counts per table |
| status | VARCHAR(20) | Yes | 'in_progress', 'completed', 'failed' |
| error_message | TEXT | No | Error details if failed |
| expires_at | TIMESTAMPTZ | Yes | When backup should be deleted |

**Validation Rules**:
- `backup_type` must be one of: 'scheduled', 'manual'
- `status` must be one of: 'in_progress', 'completed', 'failed'
- `expires_at` must be > `created_at`
- `storage_path` must be unique

**State Transitions**:
```
[new] → in_progress → completed
                   → failed
```

---

### Transaction Log Entry

Records individual database mutations for audit and replay.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | SERIAL | Yes | Auto-increment primary key |
| timestamp | TIMESTAMPTZ | Yes | When operation occurred |
| user_id | VARCHAR(50) | No | User who triggered operation (null for system) |
| operation | VARCHAR(20) | Yes | 'INSERT', 'UPDATE', 'DELETE' |
| table_name | VARCHAR(50) | Yes | Affected table |
| record_id | VARCHAR(50) | Yes | Primary key of affected record |
| old_data | JSONB | No | Previous state (UPDATE/DELETE) |
| new_data | JSONB | No | New state (INSERT/UPDATE) |
| request_path | VARCHAR(255) | No | API endpoint that triggered change |

**Validation Rules**:
- `operation` must be one of: 'INSERT', 'UPDATE', 'DELETE'
- `old_data` required for UPDATE and DELETE
- `new_data` required for INSERT and UPDATE
- `table_name` must be a tracked table

**Tracked Tables**:
- taken
- projecten
- contexten
- dagelijkse_planning
- subtaken

---

## Relationships

```
┌─────────────────┐
│  backup_metadata │
│─────────────────│
│ id (PK)         │
│ backup_id       │
│ storage_path    │
│ status          │
│ expires_at      │
└─────────────────┘
        │
        │ references (via timestamp)
        ▼
┌─────────────────┐
│ transaction_log │
│─────────────────│
│ id (PK)         │
│ timestamp       │──────┐
│ user_id (FK)    │      │ timestamp > backup.created_at
│ table_name      │      │ = entries to replay
│ record_id       │◄─────┘
│ old_data        │
│ new_data        │
└─────────────────┘
        │
        │ user_id references
        ▼
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK)         │
│ email           │
│ ...             │
└─────────────────┘
```

---

## Indexes

### backup_metadata
```sql
CREATE INDEX idx_backup_created ON backup_metadata(created_at DESC);
CREATE INDEX idx_backup_expires ON backup_metadata(expires_at);
CREATE INDEX idx_backup_status ON backup_metadata(status);
```

### transaction_log
```sql
CREATE INDEX idx_txlog_timestamp ON transaction_log(timestamp DESC);
CREATE INDEX idx_txlog_table_record ON transaction_log(table_name, record_id);
CREATE INDEX idx_txlog_user ON transaction_log(user_id, timestamp DESC);
```

---

## SQL Schema

```sql
-- Backup metadata table
CREATE TABLE IF NOT EXISTS backup_metadata (
    id VARCHAR(50) PRIMARY KEY,
    backup_id VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('scheduled', 'manual')),
    storage_path VARCHAR(500) UNIQUE NOT NULL,
    size_bytes BIGINT,
    record_counts JSONB,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    error_message TEXT,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backup_created ON backup_metadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_expires ON backup_metadata(expires_at);
CREATE INDEX IF NOT EXISTS idx_backup_status ON backup_metadata(status);

-- Transaction log table
CREATE TABLE IF NOT EXISTS transaction_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    request_path VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_txlog_timestamp ON transaction_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_txlog_table_record ON transaction_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_txlog_user ON transaction_log(user_id, timestamp DESC);
```

---

## Data Retention

| Entity | Retention Period | Cleanup Trigger |
|--------|-----------------|-----------------|
| backup_metadata | 24 hours | Cron job after each backup |
| transaction_log | 24 hours | Cron job after each backup |
| B2 backup files | 24 hours | Based on expires_at field |

**Cleanup Query**:
```sql
-- Delete expired backups metadata
DELETE FROM backup_metadata WHERE expires_at < NOW();

-- Delete old transaction logs
DELETE FROM transaction_log WHERE timestamp < NOW() - INTERVAL '24 hours';
```
