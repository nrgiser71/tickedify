# Research: Soft Delete Implementatie

**Feature**: 055-soft-delete-implementatie
**Date**: 2025-11-04

## Research Overview

Deze research documenteert de technische beslissingen en bevindingen voor het implementeren van soft delete functionaliteit in Tickedify.

## 1. Database Schema Aanpak

### Decision: Kolom-based Soft Delete
**Gekozen Aanpak**: Twee nieuwe kolommen toevoegen aan `taken` tabel:
- `verwijderd_op TIMESTAMP` - NULL betekent niet verwijderd
- `definitief_verwijderen_op TIMESTAMP` - Automatisch berekend als `verwijderd_op + 30 dagen`

**Rationale**:
- Eenvoudigste implementatie met minimale structural changes
- Backwards compatible met bestaande queries (door WHERE filtering)
- Geen data migratie nodig - nieuwe kolommen default NULL
- Performance: index op `verwijderd_op` voor snelle filtering

**Alternatives Considered**:
1. **Aparte `taken_verwijderd` tabel**: Verworpen - complexer, vereist foreign key duplicatie
2. **Status enum met 'verwijderd' waarde**: Verworpen - bestaande `lijst` kolom heeft andere semantiek
3. **Soft delete flag (boolean)**: Verworpen - geen timestamp info voor 30-dagen regel

### Users Tabel Uitbreiding
**Nieuwe Kolom**: `laatste_cleanup_op TIMESTAMP DEFAULT NULL`

**Rationale**:
- Nodig voor "1x per dag per gebruiker" cleanup requirement
- Simpele DATE vergelijking: `laatste_cleanup_op < CURRENT_DATE`
- NULL betekent: nog nooit cleanup gedaan, run bij eerste actie

## 2. CASCADE Constraints Behandeling

### Huidige Situatie
Twee tabellen met ON DELETE CASCADE:
```sql
-- subtaken
parent_taak_id REFERENCES taken(id) ON DELETE CASCADE

-- bijlagen
taak_id REFERENCES taken(id) ON DELETE CASCADE
```

### Decision: Geen CASCADE Changes, Conditional Logic
**Gekozen Aanpak**: Behoud CASCADE constraints, gebruik conditional logic

**Soft Delete Flow**:
1. Soft delete: `UPDATE taken SET verwijderd_op = NOW()` → CASCADE triggert NIET
2. Subtaken en bijlagen blijven gekoppeld aan soft-deleted parent
3. Restore: `UPDATE taken SET verwijderd_op = NULL` → subtaken/bijlagen automatisch beschikbaar
4. Permanent Delete: `DELETE FROM taken WHERE id = X` → CASCADE triggered normaal

**Rationale**:
- Minimale schema changes
- Backwards compatible met bestaande CASCADE behavior
- Subtaken/bijlagen blijven beschikbaar bij restore
- Permanent delete werkt zoals voorheen

**Alternatives Considered**:
1. **CASCADE naar ON DELETE SET NULL**: Verworpen - subtaken/bijlagen verloren bij permanent delete
2. **Soft delete voor subtaken/bijlagen**: Verworpen - out of scope, toekomstige feature
3. **Custom triggers**: Verworpen - onnodige complexiteit

## 3. Query Filtering Strategie

### Decision: WHERE Filter in Alle Queries
**Gekozen Aanpak**: Voeg `WHERE verwijderd_op IS NULL` toe aan ALLE bestaande SELECT queries

**Affected Locations** (via codebase exploration):
- **server.js**:
  - `GET /api/lijst/:naam` - regel ~900 - Lijst queries
  - `GET /api/uitgesteld` - regel ~1,500 - Uitgestelde taken
  - `GET /api/dagelijkse-planning/:datum` - regel ~3,600 - Planning queries
  - ~15 andere endpoints die taken ophalen
- **app.js**:
  - Frontend gebruikt API endpoints - geen directe DB queries
  - Geen client-side filtering nodig

**Implementation Pattern**:
```sql
-- Voor:
SELECT * FROM taken WHERE user_id = $1 AND lijst = $2

-- Na:
SELECT * FROM taken
WHERE user_id = $1
  AND lijst = $2
  AND verwijderd_op IS NULL
```

**Performance Mitigation**:
- Index toevoegen: `CREATE INDEX idx_taken_verwijderd_op ON taken(verwijderd_op);`
- PostgreSQL optimized voor `IS NULL` checks met index
- Expected overhead: <5ms per query (verwaarloosbaar)

**Alternatives Considered**:
1. **Database VIEW**: Verworpen - vereist query rewrites, complexer
2. **PostgreSQL Row-Level Security**: Verworpen - overkill voor deze use case
3. **Application-level filtering**: Verworpen - te foutgevoelig, queries missen filtering

## 4. Prullenbak Scherm UI/UX

### Decision: Dedicated Scherm met Eigen Endpoint
**Gekozen Aanpak**: Nieuw scherm `/prullenbak` met eigen API endpoint

**UI Components**:
- Menu item na "Afgewerkte Taken" (index.html regel ~118)
- Eigen scherm container in HTML
- Lijst rendering hergebruikt bestaande `renderTakenLijst()` functie (app.js regel ~600)
- Extra metadata kolommen: "Verwijderd op", "Permanent over X dagen"

**API Endpoint**: `GET /api/prullenbak`
```javascript
// Query: expliciet ALLEEN verwijderde taken
SELECT *,
  DATE_PART('day', definitief_verwijderen_op - NOW()) as dagen_tot_verwijdering
FROM taken
WHERE user_id = $1
  AND verwijderd_op IS NOT NULL
ORDER BY verwijderd_op ASC
```

**Rationale**:
- Eenvoudige implementatie met bestaande patterns
- Duidelijk gescheiden van normale taken flow
- Sorteer oudste eerst (soonest permanent deletion)
- Hergebruikt bestaande lijst rendering code

**Alternatives Considered**:
1. **Modal popup**: Verworpen - te veel content voor modal
2. **Tab binnen bestaande lijst**: Verworpen - verwarrend met "Afgewerkte Taken"
3. **Dropdown menu**: Verworpen - slechte UX voor lijst weergave

## 5. Cleanup Scheduling Strategie

### Decision: Lazy Evaluation bij Middleware
**Gekozen Aanpak**: Authentication middleware checkt laatste cleanup datum

**Implementation**:
```javascript
// In auth middleware (server.js regel ~150-200)
async function authenticateToken(req, res, next) {
  // ... bestaande auth logic ...

  const user = getUserFromToken(token);

  // Dagelijkse cleanup check
  const today = new Date().toISOString().split('T')[0];
  if (!user.laatste_cleanup_op || user.laatste_cleanup_op < today) {
    await runUserCleanup(user.id);
    await updateLastCleanup(user.id, today);
  }

  next();
}

async function runUserCleanup(userId) {
  // Permanent delete taken ouder dan 30 dagen
  await db.query(`
    DELETE FROM taken
    WHERE user_id = $1
      AND verwijderd_op IS NOT NULL
      AND verwijderd_op < NOW() - INTERVAL '30 days'
  `, [userId]);
}
```

**Rationale**:
- Geen cron job nodig (constitutional requirement)
- Triggers automatisch bij eerste request van de dag
- Per-gebruiker scope (constitutional requirement)
- Minimal performance impact: 1 extra query, max 1x per dag per user
- Self-healing: als user niet inlogt, geen cleanup needed

**Performance Impact**:
- Extra query overhead: ~10-20ms per dag per user
- Cleanup query: ~50-100ms voor 100-500 verwijderde taken
- Total impact: <150ms, 1x per dag = negligible

**Alternatives Considered**:
1. **Cron job**: Verworpen - expliciet verboden in requirements
2. **Manual trigger button**: Verworpen - gebruiker moet niet hoeven ingrijpen
3. **Cleanup bij prullenbak open**: Verworpen - te onvoorspelbaar, gebruiker open misschien nooit prullenbak
4. **Background worker**: Verworpen - unnecessary complexity voor bèta schaal

## 6. Restore Functionaliteit

### Decision: Simple UPDATE Query
**Gekozen Aanpak**: Reset `verwijderd_op` en `definitief_verwijderen_op` naar NULL

**API Endpoint**: `POST /api/taak/:id/restore`
```javascript
await db.query(`
  UPDATE taken
  SET verwijderd_op = NULL,
      definitief_verwijderen_op = NULL
  WHERE id = $1
    AND user_id = $2
    AND verwijderd_op IS NOT NULL
`, [id, userId]);
```

**Rationale**:
- Simpelste implementatie
- Alle originele properties behouden (geen data loss)
- Taak verschijnt automatisch weer in originele lijst
- Subtaken en bijlagen blijven gekoppeld (via CASCADE strategie)

**Edge Case Handling**:
- **Herhalende taken**: `herhaling_actief` blijft false na restore (zoals gespecificeerd)
- **Project/Context deleted**: Foreign keys blijven bestaan, geen extra logic nodig
- **Bulk restore**: Same endpoint, loop in frontend of accept array in API

**Alternatives Considered**:
1. **Restore to inbox**: Verworpen - gebruiker koos voor originele lijst restore
2. **Datum reset**: Verworpen - spec zegt "behoud alle properties"

## 7. Herhalende Taken bij Soft Delete

### Decision: Herhaling Stoppen, Manual Restart
**Gekozen Aanpak**: Zet `herhaling_actief = false` bij soft delete

**Implementation**:
```javascript
// Soft delete endpoint
await db.query(`
  UPDATE taken
  SET verwijderd_op = NOW(),
      definitief_verwijderen_op = NOW() + INTERVAL '30 days',
      herhaling_actief = false
  WHERE id = $1 AND user_id = $2
`, [id, userId]);
```

**Rationale**:
- Voorkomt zombie recurring tasks (nieuwe instances van verwijderde taak)
- Bij restore: gebruiker kan via bestaande UI herhaling opnieuw activeren
- Backwards compatible met bestaande recurring logic
- No special recurring cleanup logic needed

**Alternatives Considered**:
1. **Auto-reactivate bij restore**: Verworpen - spec zegt expliciet manual restart
2. **Laat herhaling actief**: Verworpen - genereert taken voor verwijderde parent

## 8. B2 Bijlagen Behandeling

### Decision: Behoud bij Soft Delete, Cleanup bij Permanent Delete
**Gekozen Aanpak**:
- Soft delete: bijlagen blijven in B2 storage
- Permanent delete: bestaande cleanup logic werkt via CASCADE

**Rationale**:
- Bij restore kunnen gebruikers hun bijlagen terugzien
- Bestaande B2 cleanup code in `DELETE /api/taak/:id` (server.js regel ~6060) blijft werken
- Geen extra B2 API calls bij soft delete = sneller
- 30 dagen extra storage costs zijn minimaal (bèta schaal)

**Storage Impact Estimate**:
- Gemiddeld: 5-10 attachments per maand per user
- Gemiddelde size: 500KB - 2MB per attachment
- Extra 30-dagen retention: ~5-10 MB per user = €0.005/maand (negligible)

**Alternatives Considered**:
1. **Immediate B2 cleanup**: Verworpen - bijlagen verloren bij restore
2. **Move to separate folder**: Verworpen - onnodige complexiteit
3. **Compress attachments**: Verworpen - out of scope

## 9. Archive System Compatibility

### Existing System
Tickedify heeft al een archief systeem voor **afgewerkte** taken:
- `taken_archief` tabel (mirror van `taken`)
- `subtaken_archief` tabel
- Archive gebeurt bij task completion

### Decision: Separate Workflows
**Gekozen Aanpak**: Soft delete en archief zijn volledig gescheiden

**Workflows**:
- **Archive**: Voor afgewerkte taken (checkbox workflow)
- **Soft Delete**: Voor verwijderde taken (trash/prullenbak)
- **Geen overlap**: Taken zijn OF archived OF soft-deleted, nooit beide

**Implementation**:
- Soft delete werkt NIET op `taken_archief` tabel
- Archive endpoint blijft ongewijzigd
- Prullenbak toont ALLEEN taken uit `taken` tabel (niet archief)

**Rationale**:
- Duidelijke semantiek: archived = completed, verwijderd = trashed
- Geen conflicts tussen systemen
- Bestaande archive queries unchanged

**Alternatives Considered**:
1. **Unified soft delete for archive**: Verworpen - verwarrend, verschillende use cases
2. **Archive support in prullenbak**: Verworpen - out of scope

## 10. UI/UX Iconography

### Decision: 🗑️ Trash Icon voor Soft Delete
**Gekozen Aanpak**:
- Menu item: "🗑️ Prullenbak" (na "Afgewerkte Taken")
- Delete button: verander naar trash icon (🗑️) i.p.v. ✕
- Restore button: ↩️ of "Herstel" text

**Rationale**:
- Universele iconografie (trash = recoverable delete)
- Duidelijk verschil met ✓ (complete) en ✕ (cancel)
- Consistent met andere productivity apps (Gmail, Trello, etc.)

**Alternatives Considered**:
1. **Text-only**: Verworpen - minder visueel herkenbaar
2. **Custom SVG icons**: Verworpen - emoji's zijn sneller en consistent

## Research Complete ✅

All technical decisions documented with rationales and alternatives considered. Ready for Phase 1: Design & Contracts.
