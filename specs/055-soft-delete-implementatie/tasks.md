# Tasks: Soft Delete Implementatie

**Feature**: 055-soft-delete-implementatie
**Input**: Design documents from `/specs/055-soft-delete-implementatie/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow Completed ✅
```
1. Loaded plan.md: Node.js backend, Vanilla JS frontend, PostgreSQL, Express.js
2. Loaded design documents:
   - data-model.md: 3 database schema changes, state transitions
   - contracts/: 6 API endpoints
   - research.md: 10 technical decisions
   - quickstart.md: 10 test scenarios
3. Generated 38 tasks across 5 phases
4. Applied task rules: [P] voor verschillende files, TDD order
5. Numbered sequentially T001-T038
6. Validated: All contracts tested, all entities modeled
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Tickedify gebruikt single-project structure:
- **Root files**: `server.js` (backend), `database.js` (schema)
- **Frontend**: `public/app.js`, `public/style.css`, `public/index.html`
- **Tests**: Playwright voor UI, curl/API testing voor backend

---

## Phase 3.1: Database Setup

### T001: Database Schema Migration - Taken Tabel
**File**: `database.js` (regel ~37-63, binnen `createTables()` functie)

**Task**: Voeg soft delete kolommen toe aan taken tabel
```sql
ALTER TABLE taken ADD COLUMN IF NOT EXISTS verwijderd_op TIMESTAMP DEFAULT NULL;
ALTER TABLE taken ADD COLUMN IF NOT EXISTS definitief_verwijderen_op TIMESTAMP DEFAULT NULL;
```

**Location**: Na bestaande CREATE TABLE taken statement
**Verification**: Query `SELECT verwijderd_op, definitief_verwijderen_op FROM taken LIMIT 1` should work

---

### T002: Database Schema Migration - Users Tabel
**File**: `database.js` (regel ~23-32, binnen `createTables()` functie)

**Task**: Voeg cleanup tracking kolom toe aan users tabel
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS laatste_cleanup_op DATE DEFAULT NULL;
```

**Location**: Na bestaande CREATE TABLE users statement
**Verification**: Query `SELECT laatste_cleanup_op FROM users LIMIT 1` should work

---

### T003: Database Indexes voor Performance
**File**: `database.js` (na migrations)

**Task**: Creëer indexes voor soft delete filtering
```sql
CREATE INDEX IF NOT EXISTS idx_taken_verwijderd_op ON taken(verwijderd_op);
CREATE INDEX IF NOT EXISTS idx_taken_user_verwijderd ON taken(user_id, verwijderd_op);
```

**Rationale**: Performance optimization voor `WHERE verwijderd_op IS NULL` queries
**Verification**: Query `\d taken` should show beide indexes

**Dependencies**: T001 must complete first

---

## Phase 3.2: Backend API Endpoints

### T004: Soft Delete Endpoint
**File**: `server.js` (na bestaande DELETE endpoint ~regel 6027)

**Task**: Implementeer `PUT /api/taak/:id/soft-delete` endpoint
```javascript
app.put('/api/taak/:id/soft-delete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await db.query(`
      UPDATE taken
      SET verwijderd_op = NOW(),
          definitief_verwijderen_op = NOW() + INTERVAL '30 days',
          herhaling_actief = false
      WHERE id = $1
        AND user_id = $2
        AND verwijderd_op IS NULL
      RETURNING id, verwijderd_op, definitief_verwijderen_op, herhaling_type
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Taak niet gevonden' });
    }

    const taak = result.rows[0];
    res.json({
      success: true,
      id: taak.id,
      verwijderd_op: taak.verwijderd_op,
      definitief_verwijderen_op: taak.definitief_verwijderen_op,
      herhaling_gestopt: taak.herhaling_type !== null
    });
  } catch (error) {
    console.error('Soft delete error:', error);
    res.status(500).json({ error: 'Database fout bij soft delete' });
  }
});
```

**Verification**: curl test scenario 1 van quickstart.md

**Dependencies**: T001-T003 (database schema must exist)

---

### T005: Restore Endpoint
**File**: `server.js` (na soft delete endpoint)

**Task**: Implementeer `POST /api/taak/:id/restore` endpoint
```javascript
app.post('/api/taak/:id/restore', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await db.query(`
      UPDATE taken
      SET verwijderd_op = NULL,
          definitief_verwijderen_op = NULL
      WHERE id = $1
        AND user_id = $2
        AND verwijderd_op IS NOT NULL
      RETURNING *
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Verwijderde taak niet gevonden' });
    }

    res.json({
      success: true,
      id: result.rows[0].id,
      taak: result.rows[0]
    });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Database fout bij restore' });
  }
});
```

**Verification**: curl test scenario 2 van quickstart.md

**Dependencies**: T001-T003

---

### T006: Prullenbak Endpoint
**File**: `server.js` (na restore endpoint)

**Task**: Implementeer `GET /api/prullenbak` endpoint
```javascript
app.get('/api/prullenbak', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(`
      SELECT
        *,
        EXTRACT(DAY FROM (definitief_verwijderen_op - NOW())) as dagen_tot_verwijdering
      FROM taken
      WHERE user_id = $1
        AND verwijderd_op IS NOT NULL
      ORDER BY verwijderd_op ASC
    `, [userId]);

    res.json({
      taken: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Prullenbak query error:', error);
    res.status(500).json({ error: 'Database fout bij ophalen prullenbak' });
  }
});
```

**Verification**: curl test scenario 5 van quickstart.md

**Dependencies**: T001-T003

---

### T007: [P] Bulk Soft Delete Endpoint
**File**: `server.js` (na prullenbak endpoint)

**Task**: Implementeer `POST /api/bulk/soft-delete` endpoint
```javascript
app.post('/api/bulk/soft-delete', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array vereist' });
  }

  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 taken per bulk operatie' });
  }

  try {
    const result = await db.query(`
      UPDATE taken
      SET verwijderd_op = NOW(),
          definitief_verwijderen_op = NOW() + INTERVAL '30 days',
          herhaling_actief = false
      WHERE id = ANY($1::text[])
        AND user_id = $2
        AND verwijderd_op IS NULL
      RETURNING id
    `, [ids, userId]);

    const deletedIds = result.rows.map(r => r.id);
    const failedIds = ids.filter(id => !deletedIds.includes(id));

    res.json({
      success: true,
      deleted_count: deletedIds.length,
      failed: failedIds.map(id => ({ id, reason: 'Taak niet gevonden of al verwijderd' }))
    });
  } catch (error) {
    console.error('Bulk soft delete error:', error);
    res.status(500).json({ error: 'Database fout bij bulk soft delete' });
  }
});
```

**Verification**: curl test scenario 4 van quickstart.md

**Dependencies**: T001-T003
**[P] Reason**: Separate endpoint, geen conflict met T004-T006

---

### T008: [P] Bulk Restore Endpoint
**File**: `server.js` (na bulk soft delete endpoint)

**Task**: Implementeer `POST /api/bulk/restore` endpoint
```javascript
app.post('/api/bulk/restore', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array vereist' });
  }

  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 taken per bulk operatie' });
  }

  try {
    const result = await db.query(`
      UPDATE taken
      SET verwijderd_op = NULL,
          definitief_verwijderen_op = NULL
      WHERE id = ANY($1::text[])
        AND user_id = $2
        AND verwijderd_op IS NOT NULL
      RETURNING id
    `, [ids, userId]);

    const restoredIds = result.rows.map(r => r.id);
    const failedIds = ids.filter(id => !restoredIds.includes(id));

    res.json({
      success: true,
      restored_count: restoredIds.length,
      failed: failedIds.map(id => ({ id, reason: 'Taak niet gevonden' }))
    });
  } catch (error) {
    console.error('Bulk restore error:', error);
    res.status(500).json({ error: 'Database fout bij bulk restore' });
  }
});
```

**Verification**: Bulk variant van scenario 2

**Dependencies**: T001-T003
**[P] Reason**: Separate endpoint, geen conflict met T004-T007

---

### T009: [P] Admin Cleanup Stats Endpoint
**File**: `server.js` (na bulk restore endpoint)

**Task**: Implementeer `GET /api/admin/cleanup-stats` endpoint
```javascript
app.get('/api/admin/cleanup-stats', authenticateToken, async (req, res) => {
  // Check admin role
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Admin rechten vereist' });
  }

  try {
    // Total soft deleted
    const totalResult = await db.query(`
      SELECT COUNT(*) as count
      FROM taken
      WHERE verwijderd_op IS NOT NULL
    `);

    // Ready for cleanup (>30 dagen)
    const cleanupResult = await db.query(`
      SELECT COUNT(*) as count
      FROM taken
      WHERE verwijderd_op IS NOT NULL
        AND verwijderd_op < NOW() - INTERVAL '30 days'
    `);

    // Per user stats
    const perUserResult = await db.query(`
      SELECT
        u.id as user_id,
        u.email,
        COUNT(t.id) as soft_deleted_count,
        u.laatste_cleanup_op
      FROM users u
      LEFT JOIN taken t ON t.user_id = u.id AND t.verwijderd_op IS NOT NULL
      GROUP BY u.id, u.email, u.laatste_cleanup_op
      ORDER BY soft_deleted_count DESC
    `);

    res.json({
      total_soft_deleted: parseInt(totalResult.rows[0].count),
      ready_for_cleanup: parseInt(cleanupResult.rows[0].count),
      per_user: perUserResult.rows
    });
  } catch (error) {
    console.error('Cleanup stats error:', error);
    res.status(500).json({ error: 'Database fout bij ophalen statistieken' });
  }
});
```

**Verification**: Check response structure

**Dependencies**: T001-T003
**[P] Reason**: Admin endpoint, separate van andere endpoints

---

## Phase 3.3: Cleanup Trigger Middleware

### T010: Cleanup Trigger in Auth Middleware
**File**: `server.js` (regel ~150-200, binnen `authenticateToken` middleware)

**Task**: Voeg dagelijkse cleanup check toe aan auth middleware
```javascript
// In authenticateToken middleware, NA user lookup maar VOOR next()
async function authenticateToken(req, res, next) {
  // ... bestaande auth logic ...

  const user = req.user; // Assume already retrieved

  // Dagelijkse cleanup check
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if cleanup needed (NULL or before today)
    if (!user.laatste_cleanup_op || user.laatste_cleanup_op < today) {
      // Run cleanup for this user
      await db.query(`
        DELETE FROM taken
        WHERE user_id = $1
          AND verwijderd_op IS NOT NULL
          AND verwijderd_op < NOW() - INTERVAL '30 days'
      `, [user.id]);

      // Update laatste_cleanup_op
      await db.query(`
        UPDATE users
        SET laatste_cleanup_op = CURRENT_DATE
        WHERE id = $1
      `, [user.id]);

      // Refresh user object (optional, voor stats)
      user.laatste_cleanup_op = today;
    }
  } catch (error) {
    console.error('Cleanup trigger error:', error);
    // Non-blocking: continue request even if cleanup fails
  }

  next();
}
```

**Verification**: Test scenario 6 van quickstart.md

**Dependencies**: T002 (laatste_cleanup_op kolom must exist)

**⚠️ CRITICAL**: Cleanup moet NON-BLOCKING zijn - fout in cleanup mag request niet blokkeren

---

## Phase 3.4: Query Filtering Audit

### T011: Audit Alle Taken Queries
**File**: `server.js` (multiple locations)

**Task**: Identificeer ALLE queries die taken ophalen zonder soft delete filter

**Locations to Check** (van ARCHITECTURE.md en code exploration):
1. `GET /api/lijst/:naam` - regel ~900
2. `GET /api/uitgesteld` - regel ~1,500
3. `GET /api/dagelijkse-planning/:datum` - regel ~3,600
4. `GET /api/taak/:id` - Individual task fetch
5. `GET /api/prioriteiten/:datum` - Top 3 priorities
6. Mogelijk andere endpoints die taken queries uitvoeren

**Method**:
```bash
# Search for queries without soft delete filter
grep -n "FROM taken" server.js | grep -v "verwijderd_op IS NULL"
```

**Output**: List van regelnummers en endpoint namen in comment in code of document

**Dependencies**: None (read-only audit)
**Blocks**: T012-T019 (must know all locations before filtering)

---

### T012: Filter GET /api/lijst/:naam
**File**: `server.js` (regel ~900)

**Task**: Voeg soft delete filter toe aan lijst endpoint
```javascript
// Voor:
const result = await db.query(`
  SELECT * FROM taken
  WHERE user_id = $1 AND lijst = $2
  ORDER BY ...
`, [userId, lijst]);

// Na:
const result = await db.query(`
  SELECT * FROM taken
  WHERE user_id = $1
    AND lijst = $2
    AND verwijderd_op IS NULL
  ORDER BY ...
`, [userId, lijst]);
```

**Verification**: Soft deleted taken verdwijnen uit lijstweergave

**Dependencies**: T011 (audit moet eerst)

---

### T013: Filter GET /api/uitgesteld
**File**: `server.js` (regel ~1,500)

**Task**: Voeg soft delete filter toe aan uitgesteld endpoint
```javascript
// Add: AND verwijderd_op IS NULL
// To WHERE clause in uitgesteld query
```

**Verification**: Soft deleted uitgestelde taken verdwijnen

**Dependencies**: T011

---

### T014: Filter GET /api/dagelijkse-planning/:datum
**File**: `server.js` (regel ~3,600)

**Task**: Voeg soft delete filter toe aan dagelijkse planning queries
```javascript
// Add: AND verwijderd_op IS NULL
// To ALL queries in dagelijkse planning endpoint
// Note: Mogelijk meerdere queries (planning items + acties)
```

**Verification**: Soft deleted taken verdwijnen uit planning grid

**Dependencies**: T011

---

### T015: Filter GET /api/taak/:id
**File**: `server.js` (individual task fetch)

**Task**: Voeg soft delete filter toe aan single task fetch
```javascript
// Add: AND verwijderd_op IS NULL
// OR return 404 if verwijderd_op IS NOT NULL
```

**Verification**: Direct access naar soft deleted taak geeft 404

**Dependencies**: T011

---

### T016: Filter GET /api/prioriteiten/:datum
**File**: `server.js` (top prioriteiten endpoint)

**Task**: Voeg soft delete filter toe aan prioriteiten query
```javascript
// Add: AND verwijderd_op IS NULL
```

**Verification**: Soft deleted top priority taken verdwijnen

**Dependencies**: T011

---

### T017: Filter Remaining Queries
**File**: `server.js` (multiple locations van T011 audit)

**Task**: Voeg soft delete filter toe aan ALLE overige taken queries die nog niet gefilterd zijn

**Method**: Loop door lijst van T011 audit, filter elke locatie

**Verification**: grep check should return 0 results:
```bash
grep -n "FROM taken" server.js | grep -v "verwijderd_op" | grep -v "prullenbak"
```

**Dependencies**: T011-T016

**⚠️ CRITICAL**: ALLE queries moeten gefilterd zijn, anders lekken soft deleted taken

---

### T018: Update Bestaande DELETE Endpoint
**File**: `server.js` (regel ~6027, `DELETE /api/taak/:id`)

**Task**: Verwijder of deactiveer oude hard delete endpoint

**Options**:
1. **Redirect naar soft delete**: Change DELETE to call soft delete logic
2. **Keep for admin**: Restrict to admin role only
3. **Deprecate**: Return error message directing to use soft delete

**Decision**: Option 1 (redirect naar soft delete voor backwards compatibility)

```javascript
// In DELETE /api/taak/:id endpoint
// Change van hard DELETE to soft delete UPDATE
app.delete('/api/taak/:id', authenticateToken, async (req, res) => {
  // Redirect to soft delete logic
  const { id } = req.params;
  // Call same logic as PUT /api/taak/:id/soft-delete
  // ...
});
```

**Verification**: Old DELETE calls now soft delete instead of hard delete

**Dependencies**: T004 (soft delete endpoint must exist)

---

## Phase 3.5: Frontend UI - Prullenbak Scherm

### T019: [P] Add Prullenbak Menu Item
**File**: `public/index.html` (regel ~118, na "Afgewerkte Taken")

**Task**: Voeg prullenbak menu item toe aan sidebar
```html
<!-- Na Afgewerkte Taken menu item (regel ~117) -->
<div class="lijst-item" data-lijst="prullenbak">
  <span class="lijst-icon">🗑️</span>
  Prullenbak
</div>
```

**Verification**: Menu item zichtbaar in sidebar

**Dependencies**: None (HTML only)
**[P] Reason**: Separate file van server.js

---

### T020: [P] Add Prullenbak Scherm Container
**File**: `public/index.html` (main content area)

**Task**: Voeg prullenbak scherm container toe
```html
<!-- Na bestaande scherm containers -->
<div id="prullenbak-scherm" class="scherm hidden">
  <div class="scherm-header">
    <h2>🗑️ Prullenbak</h2>
    <p class="prullenbak-info">Taken blijven 30 dagen bewaard voordat ze permanent worden verwijderd</p>
  </div>
  <div id="prullenbak-lijst" class="taken-lijst">
    <!-- Dynamisch gevuld via JavaScript -->
  </div>
</div>
```

**Verification**: Scherm bestaat in DOM (hidden)

**Dependencies**: None
**[P] Reason**: Same file als T019 maar independent section

---

### T021: Prullenbak CSS Styling
**File**: `public/style.css` (append at end)

**Task**: Voeg styling toe voor prullenbak scherm
```css
/* Prullenbak Scherm */
#prullenbak-scherm {
  padding: 20px;
}

.prullenbak-info {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
}

.prullenbak-taak-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 10px;
  background: #f9f9f9;
}

.prullenbak-taak-info {
  flex: 1;
}

.prullenbak-taak-tekst {
  font-weight: 500;
  margin-bottom: 5px;
}

.prullenbak-taak-meta {
  font-size: 12px;
  color: #888;
  display: flex;
  gap: 15px;
}

.prullenbak-countdown {
  color: #ff6b6b;
  font-weight: 600;
}

.prullenbak-countdown.warning {
  color: #ff0000;
}

.restore-button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.restore-button:hover {
  background: #45a049;
}

.restore-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

**Verification**: Prullenbak scherm styling correct

**Dependencies**: T020 (HTML structure must exist)

---

### T022: Prullenbak JavaScript - Scherm Navigatie
**File**: `public/app.js` (regel ~400, bij `laadHuidigeLijst()` functie)

**Task**: Voeg prullenbak scherm logica toe aan navigatie systeem
```javascript
// In laadHuidigeLijst() functie, add case voor prullenbak
async laadHuidigeLijst() {
  if (this.huidigeLijst === 'prullenbak') {
    await this.laadPrullenbak();
    return;
  }

  // ... bestaande lijst loading logic ...
}

// Add event listener voor prullenbak menu item
// In initialization code
document.querySelector('[data-lijst="prullenbak"]').addEventListener('click', () => {
  this.huidigeLijst = 'prullenbak';
  this.updateActiveMenuItem('prullenbak');
  this.toonScherm('prullenbak-scherm');
  this.laadPrullenbak();
});
```

**Verification**: Click prullenbak menu item loads scherm

**Dependencies**: T019 (menu item must exist), T020 (scherm must exist)

---

### T023: Prullenbak JavaScript - Load & Render Functie
**File**: `public/app.js` (na navigatie logic)

**Task**: Implementeer `laadPrullenbak()` en rendering functie
```javascript
async laadPrullenbak() {
  try {
    this.toonLoading();

    const response = await fetch('/api/prullenbak', {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error('Fout bij ophalen prullenbak');
    }

    const data = await response.json();
    this.renderPrullenbak(data.taken);

    this.verbergLoading();
  } catch (error) {
    console.error('Prullenbak load error:', error);
    this.toonToast('Fout bij laden prullenbak', 'error');
    this.verbergLoading();
  }
}

renderPrullenbak(taken) {
  const container = document.getElementById('prullenbak-lijst');

  if (taken.length === 0) {
    container.innerHTML = '<p class="geen-taken">Prullenbak is leeg</p>';
    return;
  }

  container.innerHTML = taken.map(taak => {
    const dagenOver = Math.ceil(taak.dagen_tot_verwijdering);
    const isWarning = dagenOver <= 7;

    return `
      <div class="prullenbak-taak-item" data-id="${taak.id}">
        <div class="prullenbak-taak-info">
          <div class="prullenbak-taak-tekst">${taak.tekst}</div>
          <div class="prullenbak-taak-meta">
            <span>Lijst: ${this.vertaalLijstNaam(taak.lijst)}</span>
            <span>Verwijderd: ${this.formatDatum(taak.verwijderd_op)}</span>
            <span class="prullenbak-countdown ${isWarning ? 'warning' : ''}">
              Permanent verwijderen over ${dagenOver} ${dagenOver === 1 ? 'dag' : 'dagen'}
            </span>
          </div>
        </div>
        <button class="restore-button" onclick="app.restoreTaak('${taak.id}')">
          ↩️ Herstel
        </button>
      </div>
    `;
  }).join('');
}

vertaalLijstNaam(lijst) {
  const namen = {
    'inbox': 'Inbox',
    'acties': 'Acties',
    'opvolgen': 'Opvolgen',
    'uitgesteld-wekelijks': 'Uitgesteld (Wekelijks)',
    // ... etc
  };
  return namen[lijst] || lijst;
}

formatDatum(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
```

**Verification**: Prullenbak lijst rendering correct met metadata

**Dependencies**: T006 (prullenbak endpoint must exist), T022 (navigation must work)

---

### T024: Prullenbak JavaScript - Restore Functie
**File**: `public/app.js` (na render functie)

**Task**: Implementeer `restoreTaak()` functie
```javascript
async restoreTaak(id) {
  try {
    const response = await fetch(`/api/taak/${id}/restore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Fout bij herstellen taak');
    }

    const data = await response.json();

    this.toonToast('Taak hersteld', 'success');

    // Refresh prullenbak lijst
    await this.laadPrullenbak();

    // Optional: update count badge indien aanwezig
    this.updateTakenCounts();

  } catch (error) {
    console.error('Restore error:', error);
    this.toonToast('Fout bij herstellen taak', 'error');
  }
}
```

**Verification**: Restore button werkt, taak verdwijnt uit prullenbak

**Dependencies**: T005 (restore endpoint must exist), T023 (render must work)

---

### T025: Update Delete Button naar Soft Delete
**File**: `public/app.js` (regel ~4390, `verwijderTaak()` functie)

**Task**: Update bestaande delete functie naar soft delete API call
```javascript
// In verwijderTaak() functie
async verwijderTaak(id, categoryKey = null) {
  // ... bestaande confirmation modal logic ...

  try {
    // Change van DELETE naar PUT soft-delete
    const response = await fetch(`/api/taak/${id}/soft-delete`, {
      method: 'PUT',  // Changed from DELETE
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error('Fout bij verwijderen taak');
    }

    const data = await response.json();

    // Update UI feedback
    this.toonToast('Taak verplaatst naar prullenbak', 'success');

    // Refresh current lijst
    await this.laadHuidigeLijst();

  } catch (error) {
    console.error('Soft delete error:', error);
    this.toonToast('Fout bij verwijderen taak', 'error');
  }
}
```

**Verification**: Delete button now soft deletes instead of hard delete

**Dependencies**: T004 (soft delete endpoint must exist)

---

### T026: [P] Update Delete Button Icon naar Trash
**File**: `public/app.js` (regel ~600, `renderTakenLijst()` functie)

**Task**: Update delete button icon van ✕ naar 🗑️
```javascript
// In task item rendering, change delete button icon
// Voor:
<button class="delete-btn">✕</button>

// Na:
<button class="delete-btn" title="Naar prullenbak">🗑️</button>
```

**Verification**: Delete buttons tonen trash icon

**Dependencies**: None (UI only)
**[P] Reason**: Icon change, no API dependencies

---

## Phase 3.6: Testing & Validation

### T027: [P] Test Scenario 1 - Soft Delete Normale Taak
**Method**: curl commands van quickstart.md scenario 1

**Steps**:
1. Create test taak via POST /api/taak
2. Verify in acties lijst
3. Soft delete via PUT /api/taak/:id/soft-delete
4. Verify NOT in acties lijst
5. Verify IN prullenbak

**Expected**: All steps pass, taak soft deleted correctly

**Dependencies**: T004 (soft delete), T006 (prullenbak), T012 (lijst filtering)
**[P] Reason**: Read-only testing, no writes

---

### T028: [P] Test Scenario 2 - Restore Taak
**Method**: curl commands van quickstart.md scenario 2

**Steps**:
1. Create soft deleted taak
2. Verify in prullenbak
3. Restore via POST /api/taak/:id/restore
4. Verify back in acties lijst
5. Verify NOT in prullenbak

**Expected**: Restore succesvol, alle properties behouden

**Dependencies**: T005 (restore), T004 (soft delete)
**[P] Reason**: Independent test scenario

---

### T029: [P] Test Scenario 3 - Herhalende Taak Soft Delete
**Method**: curl commands van quickstart.md scenario 3

**Steps**:
1. Create recurring taak met herhaling_actief = true
2. Soft delete
3. Verify herhaling_actief = false in prullenbak
4. Restore
5. Verify herhaling_actief still false

**Expected**: Herhaling stopt bij soft delete, blijft gestopt na restore

**Dependencies**: T004 (soft delete logic moet herhaling_actief updaten)
**[P] Reason**: Independent test scenario

---

### T030: [P] Test Scenario 4 - Bulk Soft Delete
**Method**: curl commands van quickstart.md scenario 4

**Steps**:
1. Create 3 test taken
2. Bulk soft delete via POST /api/bulk/soft-delete
3. Verify deleted_count = 3
4. Verify alle taken in prullenbak

**Expected**: Bulk operatie succesvol

**Dependencies**: T007 (bulk soft delete)
**[P] Reason**: Independent test scenario

---

### T031: [P] Test Scenario 5 - Prullenbak Weergave
**Method**: curl commands van quickstart.md scenario 5

**Steps**:
1. Create taken met verschillende delete tijden
2. Haal prullenbak op
3. Verify sorting (oudste eerst)
4. Verify dagen_tot_verwijdering berekend correct

**Expected**: Prullenbak data correct

**Dependencies**: T006 (prullenbak endpoint)
**[P] Reason**: Read-only testing

---

### T032: Test Scenario 6 - Cleanup Trigger
**Method**: quickstart.md scenario 6 (vereist SQL setup)

**Steps**:
1. Via SQL: Create oude soft deleted taak (>30 dagen)
2. Trigger cleanup via any API call (middleware)
3. Verify oude taak permanent verwijderd
4. Verify laatste_cleanup_op updated

**Expected**: Cleanup werkt automatisch

**Dependencies**: T010 (cleanup trigger middleware)

**⚠️ NOTE**: Vereist direct database access voor time manipulation

---

### T033: Test Scenario 7 - Query Filtering Verificatie
**Method**: curl commands van quickstart.md scenario 7

**Steps**:
1. Create soft deleted taak
2. Test ALLE endpoints die taken tonen:
   - /api/lijst/:naam
   - /api/uitgesteld
   - /api/dagelijkse-planning/:datum
   - /api/taak/:id
   - /api/prioriteiten/:datum
3. Verify soft deleted taak NERGENS verschijnt (behalve prullenbak)

**Expected**: Complete filtering coverage

**Dependencies**: T012-T017 (alle query filters)

**⚠️ CRITICAL**: Dit is DE belangrijkste test - missed queries = data leak

---

### T034: [P] Test Scenario 8 - Subtaken & Bijlagen
**Method**: quickstart.md scenario 8

**Steps**:
1. Create taak met subtaak
2. Soft delete parent
3. Verify subtaak nog gekoppeld
4. Restore parent
5. Verify subtaak nog steeds aanwezig
6. Hard delete (via SQL of wait 30 dagen)
7. Verify CASCADE werkt

**Expected**: Soft delete laat relaties intact, hard delete triggert CASCADE

**Dependencies**: T004 (soft delete), T005 (restore)
**[P] Reason**: Independent test van soft delete logic

---

### T035: UI Test - Prullenbak Scherm (Playwright)
**Method**: Browser automation via tickedify-testing agent

**Steps**:
1. Login op dev.tickedify.com/app
2. Create test taken via UI
3. Soft delete via delete button
4. Navigate naar prullenbak scherm
5. Verify taken zichtbaar met metadata
6. Click restore button
7. Verify taak verdwijnt uit prullenbak
8. Verify taak terug in originele lijst

**Expected**: Volledige UI workflow werkt

**Dependencies**: T019-T026 (alle frontend changes)

**⚠️ USE**: `tickedify-testing` sub-agent voor deze test

---

### T036: [P] Performance Test - Query Overhead
**Method**: Benchmark queries voor en na soft delete filtering

**Steps**:
1. Create 100 normale taken + 50 soft deleted
2. Benchmark GET /api/lijst/acties (10x runs)
3. Calculate gemiddelde overhead
4. Expected: <10ms overhead

**Expected**: Negligible performance impact

**Dependencies**: T012-T017 (all filters), T003 (indexes)
**[P] Reason**: Independent performance test

---

### T037: Edge Cases Test
**Method**: curl test alle edge cases van quickstart scenario 10

**Test Cases**:
- 10a: Restore non-existent taak → 404
- 10b: Soft delete already deleted taak → 404
- 10c: Restore other user's taak → 403
- 10d: Bulk delete met invalid IDs → partial success

**Expected**: All edge cases handled gracefully

**Dependencies**: T004-T008 (all endpoints must handle errors)

---

### T038: Final Validation - Run Complete Quickstart
**Method**: Execute ALLE 10 scenarios van quickstart.md sequentially

**Steps**:
1. Setup test environment
2. Run scenario 1-10 in order
3. Verify success criteria checklist
4. Document any failures

**Expected**: ALL scenarios PASS ✅

**Dependencies**: T027-T037 (all individual tests should pass first)

**⚠️ GATE**: This is the final validation before feature completion

---

## Dependencies Summary

```
Phase 3.1 (Database): T001 → T002 → T003

Phase 3.2 (Backend API):
  T001-T003 → [T004, T005, T006] → [T007, T008, T009]

Phase 3.3 (Cleanup):
  T002 → T010

Phase 3.4 (Query Filtering):
  T011 → [T012, T013, T014, T015, T016] → T017 → T018
  T004 → T018 (redirect logic)

Phase 3.5 (Frontend):
  [T019, T020] → T021 → T022 → T023 → T024
  T004 → T025 → [T026]
  T006 → T023

Phase 3.6 (Testing):
  Individual scenarios depend on specific endpoints
  T038 depends on ALL tests passing
```

---

## Parallel Execution Examples

### Example 1: Backend Endpoints (T004-T009)
```bash
# After T001-T003 complete, launch endpoints in parallel:
# Note: T004-T006 can run parallel (different functionality)
# T007-T009 can run after T004-T006 (independent endpoints)

# Parallel Group 1 (Core endpoints):
Task(description="Soft delete endpoint", prompt="Implement T004...")
Task(description="Restore endpoint", prompt="Implement T005...")
Task(description="Prullenbak endpoint", prompt="Implement T006...")

# Parallel Group 2 (Bulk & admin):
Task(description="Bulk soft delete", prompt="Implement T007...")
Task(description="Bulk restore", prompt="Implement T008...")
Task(description="Admin stats", prompt="Implement T009...")
```

### Example 2: Query Filtering (T012-T016)
```bash
# After T011 audit complete, filter queries in parallel:
# Each query is independent, different code sections

Task(description="Filter lijst endpoint", prompt="Implement T012...")
Task(description="Filter uitgesteld endpoint", prompt="Implement T013...")
Task(description="Filter dagelijkse planning", prompt="Implement T014...")
Task(description="Filter single task", prompt="Implement T015...")
Task(description="Filter prioriteiten", prompt="Implement T016...")
```

### Example 3: Frontend UI (T019-T020, T026)
```bash
# HTML changes can run parallel (different sections):
Task(description="Add prullenbak menu", prompt="Implement T019...")
Task(description="Add prullenbak container", prompt="Implement T020...")

# Icon change independent:
Task(description="Update delete icon", prompt="Implement T026...")
```

### Example 4: Testing Scenarios (T027-T031, T034, T036)
```bash
# Read-only tests can all run parallel:
Task(description="Test soft delete", prompt="Run T027...")
Task(description="Test restore", prompt="Run T028...")
Task(description="Test herhalende taak", prompt="Run T029...")
Task(description="Test bulk delete", prompt="Run T030...")
Task(description="Test prullenbak weergave", prompt="Run T031...")
Task(description="Test subtaken", prompt="Run T034...")
Task(description="Performance test", prompt="Run T036...")
```

---

## Validation Checklist

**Pre-Implementation**:
- [x] All contracts have corresponding API endpoints (6 endpoints defined)
- [x] All entities have schema changes (taken + users tables)
- [x] All tests scenarios documented (10 scenarios in quickstart)
- [x] Parallel tasks truly independent (verified no file conflicts)
- [x] Each task specifies exact file path and line numbers

**Post-Implementation**:
- [ ] All tests (T027-T037) PASS
- [ ] Final validation (T038) PASS
- [ ] Performance acceptable (<10ms overhead)
- [ ] Edge cases handled gracefully
- [ ] UI workflow complete and tested
- [ ] Documentation updated (ARCHITECTURE.md)

---

## Notes

**Critical Path**: T001-T003 → T004-T006 → T012-T017 → T022-T025 → T038

**Parallel Opportunities**:
- Backend endpoints (T007-T009) na core endpoints
- Query filtering (T012-T016) na audit
- Testing scenarios (T027-T031, T034, T036)

**Risk Areas**:
- **T017**: Missing een query = data leak (gebruik grep verificatie)
- **T033**: Query filtering test is critical
- **T010**: Cleanup trigger moet non-blocking zijn
- **T018**: Oude DELETE endpoint redirect moet backwards compatible zijn

**Estimated Completion Time**: 12-18 hours total
- Phase 3.1: 1-2 hours (database)
- Phase 3.2: 4-6 hours (backend)
- Phase 3.3: 1 hour (cleanup)
- Phase 3.4: 2-3 hours (filtering)
- Phase 3.5: 3-4 hours (frontend)
- Phase 3.6: 2-3 hours (testing)

---

**Tasks Document Complete** ✅

Ready for implementation via `/implement` command or manual execution with tickedify-feature-builder agent.
