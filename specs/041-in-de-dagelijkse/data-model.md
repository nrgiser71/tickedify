# Data Model: Uitbreiding Planning Uren 05:00-22:00

**Feature**: 041-in-de-dagelijkse
**Date**: 2025-10-30
**Status**: Complete

## Samenvatting

**Geen data model wijzigingen nodig**. Deze feature is een configuratie aanpassing van bestaande functionaliteit.

## Bestaande Entities (Ongewijzigd)

### DagelijksePlanning (dagelijkse_planning table)

**Purpose**: Opslag van geplande items (taken, blokkeringen, pauzes) per uur per dag per gebruiker.

**Schema** (database.js:192-205):
```sql
CREATE TABLE IF NOT EXISTS dagelijkse_planning (
  id VARCHAR(50) PRIMARY KEY,
  actie_id VARCHAR(50),                    -- FK naar taken.id (nullable)
  datum DATE NOT NULL,                     -- Datum van planning (YYYY-MM-DD)
  uur INTEGER NOT NULL CHECK (uur >= 0 AND uur <= 23),  -- Uur (0-23)
  positie INTEGER DEFAULT 0,               -- Positie binnen uur
  type VARCHAR(20) NOT NULL CHECK (type IN ('taak', 'geblokkeerd', 'pauze')),
  naam TEXT,                               -- Naam voor geblokkeerd/pauze items
  duur_minuten INTEGER NOT NULL,          -- Duur in minuten
  aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(50) REFERENCES users(id),
  FOREIGN KEY (actie_id) REFERENCES taken(id) ON DELETE CASCADE
)
```

**Indices**:
- `idx_dagelijkse_planning_datum`
- `idx_dagelijkse_planning_actie`
- `idx_dagelijkse_planning_datum_uur`
- `idx_dagelijkse_planning_user`
- `idx_dagelijkse_planning_user_datum`

**Validation Rules**:
- ✅ `uur >= 0 AND uur <= 23` - Ondersteunt ALLE uren (0-23)
- ✅ Geen wijzigingen nodig voor 05:00-22:00 venster
- ✅ Bestaande constraints blijven geldig

**Relationships**:
- **Many-to-One** naar `users` (user_id)
- **Many-to-One** naar `taken` (actie_id, nullable)

**State Transitions**:
1. **Created**: Item toegevoegd via drag & drop → INSERT
2. **Reordered**: Item verplaatst binnen/tussen uren → UPDATE uur + positie
3. **Updated**: Naam/duur gewijzigd → UPDATE
4. **Deleted**: Item verwijderd → DELETE

### Taken (taken table)

**Purpose**: Opslag van taken die kunnen worden gepland.

**Relevant Fields**:
- `id` - Unieke identifier
- `tekst` - Taak beschrijving
- `duur` - Geschatte duur in minuten
- `afgewerkt` - Completion timestamp (NULL = nog niet af)
- `project_id` - Project categorisatie
- `context_id` - Context categorisatie
- `user_id` - User isolatie

**Relationship**: Planning items met `type='taak'` verwijzen naar deze tabel.

## Frontend Data Structures (Ongewijzigd)

### LocalStorage Configuration

**Keys**:
- `dagplanning-start-uur` - **WIJZIGING**: Default '8' → '5'
- `dagplanning-eind-uur` - **WIJZIGING**: Default '18' → '22'

**Type**: String (geconverteerd naar Integer via parseInt())

**Purpose**: Per-browser persistentie van gebruiker uren voorkeur.

### Planning Item Object (JavaScript)

**Runtime representatie** van dagelijkse_planning row:
```javascript
{
  id: "dp_uuid",
  actieId: "taak_uuid" | null,      // null voor geblokkeerd/pauze
  datum: "2025-10-30",
  uur: 6,                            // Kan nu 5-21 zijn (was 8-17)
  positie: 0,
  type: "taak" | "geblokkeerd" | "pauze",
  naam: "Taak naam" | "Blokkering naam" | "Pauze",
  duurMinuten: 45,

  // JOIN data van taken table (als type='taak')
  actieTekst: "...",
  projectId: "...",
  contextId: "...",
  // ...
}
```

**Wijziging Impact**:
- ✅ `uur` field kan nu waarden 5-21 bevatten (was 8-17)
- ✅ Bestaande validatie (`uur >= 0 AND uur <= 23`) blijft geldig
- ✅ Geen wijzigingen aan object structuur

## Data Flows (Ongewijzigd)

### 1. Planning Laden
```
User opent dagelijkse planning
  ↓
Frontend: GET /api/dagelijkse-planning/:datum
  ↓
Backend: db.getDagelijksePlanning(datum, userId)
  ↓
Database: SELECT * FROM dagelijkse_planning
          WHERE datum = $1 AND user_id = $2
          ORDER BY uur ASC, positie ASC
  ↓
Frontend: Render items in kalender grid (nu 05:00-22:00)
```

### 2. Taak Slepen naar Planning
```
User sleept taak naar 06:00 slot
  ↓
Frontend: handleDynamicDrop({ type: 'actie', actieId, duurMinuten }, { uur: 6, position: 0 })
  ↓
Frontend: POST /api/dagelijkse-planning
          { actieId, datum, uur: 6, positie: 0, type: 'taak', duurMinuten }
  ↓
Backend: db.addToDagelijksePlanning(data, userId)
  ↓
Database: INSERT INTO dagelijkse_planning (...)
  ↓
Frontend: Re-render planning
```

**Wijziging**: `uur` kan nu 5-21 zijn (was 8-17). Alle flows blijven ongewijzigd.

## Query Impact Analysis

### Bestaande Queries (Ongewijzigd)

**getDagelijksePlanning()** (database.js:1133):
```sql
SELECT dp.*, t.tekst, t.project_id, ...
FROM dagelijkse_planning dp
LEFT JOIN taken t ON dp.actie_id = t.id
WHERE dp.datum = $1 AND dp.user_id = $2
AND (dp.actie_id IS NULL OR t.afgewerkt IS NULL)
ORDER BY dp.uur ASC, dp.positie ASC
```
- ✅ Geen WHERE clause op `uur` → items met uur 5-21 worden automatisch opgehaald
- ✅ ORDER BY sorteert correct (5 < 6 < ... < 21)

**addToDagelijksePlanning()** (database.js:1222):
```sql
INSERT INTO dagelijkse_planning (id, actie_id, datum, uur, positie, ...)
VALUES ($1, $2, $3, $4, $5, ...)
```
- ✅ Accepteert elk uur 0-23 (constraint validatie)
- ✅ Geen wijzigingen nodig

**reorderDagelijksePlanning()** (database.js:1444):
```sql
UPDATE dagelijkse_planning
SET uur = $1, positie = $2
WHERE id = $3 AND user_id = $4
```
- ✅ Kan items verplaatsen naar uur 5-21
- ✅ Constraint `uur >= 0 AND uur <= 23` blijft geldig

## Migration Plan

**Conclusie**: Geen database migraties nodig.

**Rationale**:
1. Schema ondersteunt al uren 0-23
2. Queries hebben geen WHERE filters op uur range
3. Bestaande data (uur 8-17) blijft geldig onder nieuwe defaults
4. Nieuwe data (uur 5-7, 18-21) wordt automatisch ondersteund

**Backwards Compatibility**:
- ✅ Bestaande planning items blijven zichtbaar
- ✅ Oude uren (8-17) blijven volledig functioneel
- ✅ Users met oude LocalStorage waarden (8-18) zien hun custom settings
- ✅ Nieuwe users krijgen nieuwe defaults (5-22)

## Testing Data Scenarios

### Scenario 1: Lege Planning met Nieuwe Defaults
```javascript
// Setup
localStorage.removeItem('dagplanning-start-uur');
localStorage.removeItem('dagplanning-eind-uur');

// Expected
startUur = 5;  // Was 8
eindUur = 22;  // Was 18

// Render result
17 kalender-uur divs (05:00, 06:00, ..., 21:00)  // Was 10 divs (08:00-17:00)
```

### Scenario 2: Bestaande Item op 09:00 (Binnen Oude Range)
```javascript
// Database
{ id: 'x', datum: '2025-10-30', uur: 9, type: 'taak', ... }

// Expected
Item blijft zichtbaar op 09:00 slot
Drag & drop blijft werken
Geen wijzigingen in gedrag
```

### Scenario 3: Nieuwe Item op 06:00 (Vroege Ochtend)
```javascript
// User sleept taak naar 06:00
POST /api/dagelijkse-planning
{ datum: '2025-10-30', uur: 6, type: 'taak', ... }

// Database
INSERT succeeds (6 >= 0 AND 6 <= 23 ✓)

// Frontend render
Item verschijnt in 06:00 slot
Draggable en editable zoals normaal
```

### Scenario 4: Nieuwe Item op 20:00 (Late Avond)
```javascript
// User sleept blokkering naar 20:00
POST /api/dagelijkse-planning
{ datum: '2025-10-30', uur: 20, type: 'geblokkeerd', naam: 'Avondrust', duurMinuten: 60 }

// Database
INSERT succeeds (20 >= 0 AND 20 <= 23 ✓)

// Frontend render
Geblokkeerd item verschijnt op 20:00 slot met 🔒 icon
```

### Scenario 5: User Met Custom Settings (Backwards Compat)
```javascript
// Setup
localStorage.setItem('dagplanning-start-uur', '7');
localStorage.setItem('dagplanning-eind-uur', '19');

// Expected
startUur = 7;  // Custom waarde blijft
eindUur = 19;  // Custom waarde blijft

// Render result
12 kalender-uur divs (07:00-18:00)
User instellingen worden gerespecteerd
```

## Conclusie

**Geen data model wijzigingen vereist**. De bestaande schema en queries ondersteunen volledig het uitgebreide uren venster (05:00-22:00).

**Impact Summary**:
- ✅ Database schema: Geen wijzigingen
- ✅ Queries: Geen wijzigingen
- ✅ API contracts: Geen wijzigingen
- ✅ Frontend data structures: Geen wijzigingen
- ✅ Validation rules: Blijven geldig
- ✅ Indices: Blijven optimaal

**Implementation**: Alleen default waarden in frontend code wijzigen.
