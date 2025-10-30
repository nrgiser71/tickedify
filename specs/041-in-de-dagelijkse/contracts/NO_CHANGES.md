# API Contracts: Geen Wijzigingen

**Feature**: 041-in-de-dagelijkse
**Date**: 2025-10-30

## Samenvatting

**Geen API contract wijzigingen nodig**. Alle bestaande endpoints ondersteunen het uitgebreide uren venster (05:00-22:00) zonder aanpassingen.

## Bestaande Endpoints (Ongewijzigd)

### GET /api/dagelijkse-planning/:datum

**Purpose**: Haal alle planning items voor een specifieke datum op.

**Parameters**:
- `datum` (path) - Format: YYYY-MM-DD

**Response**:
```json
[
  {
    "id": "dp_uuid",
    "actieId": "taak_uuid",
    "datum": "2025-10-30",
    "uur": 6,                    // Kan nu 5-21 zijn (was 8-17)
    "positie": 0,
    "type": "taak",
    "naam": "Taak naam",
    "duurMinuten": 45,
    "actieTekst": "...",
    "projectId": "...",
    "contextId": "..."
  }
]
```

**Status**: ✅ Geen wijziging - accepteert en retourneert elk uur 0-23

---

### POST /api/dagelijkse-planning

**Purpose**: Voeg nieuw item toe aan dagelijkse planning.

**Request Body**:
```json
{
  "actieId": "taak_uuid",      // Optioneel (null voor geblokkeerd/pauze)
  "datum": "2025-10-30",
  "uur": 6,                     // Kan nu 5-21 zijn
  "positie": 0,                 // Optioneel (berekend als niet gegeven)
  "type": "taak",               // "taak" | "geblokkeerd" | "pauze"
  "naam": "Taak naam",          // Optioneel (van taken table als type='taak')
  "duurMinuten": 45
}
```

**Response**:
```json
{
  "success": true,
  "id": "dp_uuid"
}
```

**Validation**:
- ✅ `uur >= 0 AND uur <= 23` (database constraint)
- ✅ Accepteert uur 5-21 zonder wijzigingen

**Status**: ✅ Geen wijziging

---

### PUT /api/dagelijkse-planning/:id

**Purpose**: Update bestaand planning item (naam, duur, type).

**Request Body**:
```json
{
  "naam": "Nieuwe naam",        // Optioneel
  "duurMinuten": 60,            // Optioneel
  "type": "geblokkeerd"         // Optioneel
}
```

**Response**:
```json
{
  "success": true
}
```

**Status**: ✅ Geen wijziging

---

### PUT /api/dagelijkse-planning/:id/reorder

**Purpose**: Verplaats item naar ander uur/positie (drag & drop).

**Request Body**:
```json
{
  "targetUur": 20,              // Kan nu 5-21 zijn
  "targetPosition": 1
}
```

**Response**:
```json
{
  "success": true
}
```

**Validation**:
- ✅ `targetUur >= 0 AND targetUur <= 23`
- ✅ Accepteert targetUur 5-21 zonder wijzigingen

**Status**: ✅ Geen wijziging

---

### DELETE /api/dagelijkse-planning/:id

**Purpose**: Verwijder planning item.

**Response**:
```json
{
  "success": true
}
```

**Status**: ✅ Geen wijziging

---

## Contract Testing

### Bestaande Tests Blijven Geldig

Alle bestaande API tests blijven geldig omdat de endpoints geen wijzigingen hebben.

### Aanvullende Test Scenarios (Aanbevolen)

**Test 1: POST met vroeg uur (05:00)**
```javascript
// Request
POST /api/dagelijkse-planning
{
  "actieId": "taak_123",
  "datum": "2025-10-30",
  "uur": 5,
  "type": "taak",
  "duurMinuten": 45
}

// Expected
Status: 200 OK
Response: { "success": true, "id": "..." }
Database: Row inserted met uur = 5
```

**Test 2: POST met laat uur (21:00)**
```javascript
// Request
POST /api/dagelijkse-planning
{
  "datum": "2025-10-30",
  "uur": 21,
  "type": "pauze",
  "naam": "Avond pauze",
  "duurMinuten": 30
}

// Expected
Status: 200 OK
Response: { "success": true, "id": "..." }
Database: Row inserted met uur = 21
```

**Test 3: GET retourneert items in uitgebreid venster**
```javascript
// Setup: Database heeft items met uur 5, 9, 20
INSERT INTO dagelijkse_planning (uur, ...) VALUES (5, ...), (9, ...), (20, ...);

// Request
GET /api/dagelijkse-planning/2025-10-30

// Expected
Status: 200 OK
Response: [
  { "uur": 5, ... },    // Vroeg item
  { "uur": 9, ... },    // Normaal item
  { "uur": 20, ... }    // Laat item
]
// ORDER BY uur ASC zorgt voor correcte sortering
```

**Test 4: Reorder naar uitgebreid uur**
```javascript
// Setup: Item op uur 9
// Request
PUT /api/dagelijkse-planning/item_id/reorder
{ "targetUur": 6, "targetPosition": 0 }

// Expected
Status: 200 OK
Database: Item heeft nu uur = 6
```

**Test 5: Invalid uur (out of bounds)**
```javascript
// Request
POST /api/dagelijkse-planning
{ "uur": 24, ... }  // Invalid

// Expected
Status: 400 Bad Request (database constraint violation)
Error: "uur must be between 0 and 23"
```

## Conclusie

**Alle bestaande API endpoints ondersteunen het uitgebreide uren venster zonder wijzigingen**.

**Rationale**:
1. Endpoints hebben geen hard-coded uur range validatie
2. Database constraints (`uur >= 0 AND uur <= 23`) zijn al ruim genoeg
3. Frontend bepaalt welk venster wordt getoond (8-18 of 5-22)
4. Backend is uren-agnostisch - accepteert en opslag elk geldig uur

**Implementation Impact**: Geen backend code wijzigingen nodig.
