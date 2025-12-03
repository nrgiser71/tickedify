# Research: Backup Strategie

**Feature**: 071-de-backup-strategie
**Date**: 2025-12-03

---

## Research Findings

### 1. B2 Storage Integration

**Decision**: Hergebruik bestaande B2 integratie uit `storage-manager.js`

**Rationale**:
- Volledig functionele B2 client al aanwezig
- Error handling en logging patterns gestandaardiseerd
- SHA1 hash verificatie voor data integriteit
- Environment variables al geconfigureerd

**Alternatives Considered**:
- AWS S3: Afgewezen - hogere kosten, geen bestaande integratie
- Local filesystem: Afgewezen - geen offsite protection, Vercel serverless incompatible
- Nieuwe B2 implementatie: Afgewezen - duplicatie van bestaande code

**Key Code Patterns** (storage-manager.js):
- `uploadToB2()` regel 201-269 - Raw upload met error handling
- `downloadFromB2()` regel 393-457 - Download met arraybuffer
- `deleteFile()` regel 460-555 - Cleanup met categorized errors

---

### 2. Database Export Strategy

**Decision**: JSON-based table export per tabel, gecomprimeerd met gzip

**Rationale**:
- Vercel serverless 4.5MB payload limit
- 30 seconden execution time limit
- JSON makkelijker te restoren dan SQL dump
- Gzip compressie reduceert 10x typisch

**Alternatives Considered**:
- pg_dump: Afgewezen - vereist shell access, niet beschikbaar in Vercel serverless
- Streaming export: Afgewezen - complexiteit, niet nodig voor huidige database grootte
- External backup service: Afgewezen - extra kosten, dependency

**Tables to Backup** (database.js analyse):
1. `users` - User accounts
2. `taken` - Tasks (core data)
3. `projecten` - Projects
4. `contexten` - Contexts
5. `dagelijkse_planning` - Daily planning
6. `subtaken` - Subtasks
7. `bijlagen` - Attachment metadata (niet files)
8. `mind_dump_preferences` - User preferences

---

### 3. Cron Job Scheduling

**Decision**: Vercel Cron met `/api/cron/backup` endpoint

**Rationale**:
- Native Vercel ondersteuning
- Geen externe dependencies
- Eenvoudige configuratie via vercel.json
- Automatische retry bij failures

**Alternatives Considered**:
- External cron service (cron-job.org): Afgewezen - extra dependency
- GitHub Actions: Afgewezen - complexity overhead voor simpele schedule
- Manual triggers only: Afgewezen - voldoet niet aan automatische backup requirement

**Configuration** (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/backup",
    "schedule": "0 */4 * * *"
  }]
}
```

---

### 4. Admin Authentication

**Decision**: Hergebruik bestaande admin middleware

**Rationale**:
- Robuuste session-based authentication al aanwezig
- Session regeneration voor security
- Rate limiting op auth endpoint

**Key Code** (server.js):
- Admin middleware: regel 1301-1323
- Auth endpoint: regel 11700-11737 (`/api/admin/auth`)
- Session check: `req.session.isAdmin || req.session.adminAuthenticated`

---

### 5. Transaction Logging

**Decision**: Nieuwe `transaction_log` tabel met middleware integratie

**Rationale**:
- Minimale code changes per endpoint
- JSONB voor flexible old/new data storage
- Automatische cleanup met retention policy

**Alternatives Considered**:
- PostgreSQL triggers: Afgewezen - moeilijker te debuggen, Neon beperkte trigger support
- Audit log service: Afgewezen - extra dependency en kosten
- Event sourcing: Afgewezen - massive architectural change, overkill

**Schema**:
```sql
CREATE TABLE transaction_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id VARCHAR(50),
  operation VARCHAR(20) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id VARCHAR(50) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  request_path VARCHAR(255)
);
```

---

### 6. Restore Strategy

**Decision**: Transactional restore met maintenance mode

**Rationale**:
- Atomic restore - all or nothing
- Maintenance mode voorkomt data corruption tijdens restore
- Transaction log replay voor minimaal dataverlies

**Restore Flow**:
1. Set maintenance mode flag
2. Begin database transaction
3. Truncate tables in correct order (foreign key dependencies)
4. Insert backup data
5. Replay transaction log entries since backup timestamp
6. Commit transaction
7. Clear maintenance mode

---

### 7. Storage Cost Analysis

**Decision**: Dedicated folder in bestaande B2 bucket

**Rationale**:
- B2 pricing: $6/TB/month storage
- Verwachte usage: <1GB zelfs met 1000 users
- Estimated cost: <$0.01/month

**Cost Breakdown**:
| Scenario | DB Size | Backups/24h | Storage | Monthly Cost |
|----------|---------|-------------|---------|--------------|
| 5 users | 5 MB | 30 MB | 30 MB | ~$0.00 |
| 100 users | 100 MB | 600 MB | 600 MB | ~$0.004 |
| 1000 users | 1 GB | 6 GB | 6 GB | ~$0.04 |

---

### 8. Performance Constraints

**Decision**: Backup must complete within 30 seconds

**Rationale**:
- Vercel serverless function timeout: 60s (Pro plan)
- Safety margin: 50% buffer
- JSON export + gzip: ~5-10s for 1GB database

**Mitigation Strategies**:
- Parallel table exports
- Streaming compression
- Early abort on timeout approaching

---

## Resolved Clarifications

| Item | Resolution |
|------|------------|
| Storage provider | Backblaze B2 (bestaande integratie) |
| Backup format | Compressed JSON (gzip) |
| Scheduling | Vercel Cron (elke 4 uur) |
| Admin auth | Bestaande session-based auth |
| Transaction logging | Custom middleware + database tabel |
| Restore approach | Transactional with maintenance mode |

---

## Technical Risks

1. **Vercel timeout**: Backup moet binnen 30s compleet
   - Mitigation: Parallel exports, early monitoring

2. **B2 availability**: Als B2 niet bereikbaar
   - Mitigation: Retry logic, alert naar admin

3. **Database lock**: Restore kan reads blokkeren
   - Mitigation: Maintenance mode communicatie

4. **Data growth**: Database groter dan verwacht
   - Mitigation: Monitoring, incremental backup future feature
