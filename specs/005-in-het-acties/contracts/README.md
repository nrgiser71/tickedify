# API Contracts: Bulk Actie Datum Knoppen Uitbreiden

**Feature**: 005-in-het-acties
**Date**: 2025-10-06

## No New API Endpoints Required

Deze feature is een **frontend-only enhancement** die geen nieuwe API endpoints vereist.

## Existing API Endpoints Used

### PUT /api/taak/:id

**Bestaand endpoint** - geen wijzigingen nodig

**Usage**: Bulk datum actie roept dit endpoint aan voor elke geselecteerde taak

**Request**:
```http
PUT /api/taak/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: tickedify.com
Content-Type: application/json
Cookie: connect.sid=...

{
  "verschijndatum": "2025-10-09"
}
```

**Response (Success)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "taak": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tekst": "Rapport schrijven",
    "verschijndatum": "2025-10-09T00:00:00.000Z",
    "lijst": "acties",
    "prioriteit": 2,
    "projectId": null,
    "contextId": null,
    "gebruikerId": "..."
  }
}
```

**Response (Error)**:
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Taak niet gevonden"
}
```

**Validation Rules** (bestaande backend logica):
- `verschijndatum` moet valid ISO 8601 date string zijn (YYYY-MM-DD)
- `id` moet bestaande taak UUID zijn voor ingelogde gebruiker
- Session authentication vereist (connect.sid cookie)

**No changes required** - endpoint wordt al gebruikt door bestaande bulk date action

## Frontend Contract

### JavaScript Function Contract: bulkDateAction(dagenOffset)

**Bestaande functie** - geen signature wijzigingen

**Usage**: Aangeroepen door weekdag knoppen

```javascript
/**
 * Bulk update verschijndatum voor alle geselecteerde taken
 * @param {number} dagenOffset - Aantal dagen vanaf vandaag (0=vandaag, 1=morgen, etc.)
 * @returns {Promise<void>}
 */
async bulkDateAction(dagenOffset) {
    // Implementation in app.js:11847-11898
}
```

**Pre-conditions**:
- `this.bulkModus === true`
- `this.geselecteerdeTaken.size > 0`
- User is authenticated (session active)

**Post-conditions**:
- Alle geselecteerde taken hebben nieuwe `verschijndatum`
- `this.bulkModus === false` (bulk modus gedeactiveerd)
- `this.geselecteerdeTaken.size === 0` (selectie cleared)
- Acties lijst is herladen met bijgewerkte data
- Toast success message getoond

**Error handling**:
- Network error → toast.error("Netwerk fout bij bulk update")
- API error → toast.error("Fout bij bijwerken taak")
- Continue met volgende taken bij individuele failures

### JavaScript Function Contract: getBulkVerplaatsKnoppen()

**Bestaande functie** - wijzigingen vereist voor weekdag knoppen

**Current signature**:
```javascript
/**
 * Genereer HTML voor bulk actie knoppen
 * @returns {string} HTML string met knoppen
 */
getBulkVerplaatsKnoppen() {
    // Current: alleen Vandaag/Morgen
    // New: Vandaag/Morgen + weekdagen
}
```

**New behavior**:
- Return HTML met "Vandaag", "Morgen" + dynamische weekdag knoppen
- Weekdag knoppen gebruik `window.bulkDateAction(dagenOffset)` onclick
- dagenOffset = 2..7 voor weekdagen (wo=2, do=3, vr=4, za=5, zo=6)
- Aantal knoppen varieert op basis van `Date().getDay()`

**Example output (Monday)**:
```html
<button onclick="window.bulkDateAction(0)" class="bulk-action-btn">Vandaag</button>
<button onclick="window.bulkDateAction(1)" class="bulk-action-btn">Morgen</button>
<button onclick="window.bulkDateAction(2)" class="bulk-action-btn">Woensdag</button>
<button onclick="window.bulkDateAction(3)" class="bulk-action-btn">Donderdag</button>
<button onclick="window.bulkDateAction(4)" class="bulk-action-btn">Vrijdag</button>
<button onclick="window.bulkDateAction(5)" class="bulk-action-btn">Zaterdag</button>
<button onclick="window.bulkDateAction(6)" class="bulk-action-btn">Zondag</button>
<button onclick="window.bulkVerplaatsNaar('opvolgen')" class="bulk-action-btn">Opvolgen</button>
...
```

### JavaScript Function Contract: getWeekdagKnoppen(dagenOffset, onclickCallback)

**Nieuwe helper functie** - extract weekdag logica

```javascript
/**
 * Genereer HTML voor weekdag knoppen (woensdag t/m zondag vanaf vandaag)
 * @param {number} dagenOffset - Starting offset (meestal 0 voor vandaag)
 * @param {Function} onclickCallback - Functie die onclick HTML attribuut genereert
 * @returns {string} HTML string met weekdag knoppen
 */
getWeekdagKnoppen(dagenOffset, onclickCallback) {
    // Extract logica uit toonActiesMenu (app.js:4309-4322)
    // Herbruikbaar voor bulk toolbar en individueel menu
}
```

**Parameters**:
- `dagenOffset`: Altijd 0 voor deze feature (vanaf vandaag)
- `onclickCallback`: Functie die `(dagIndex) => string` contract heeft
  - Bulk: `(i) => onclick="window.bulkDateAction(${i})"`
  - Individueel: `(i) => onclick="app.stelDatumIn('${taakId}', ${i})"`

**Return value**:
- Empty string als vandaag = zondag (geen resterende weekdagen)
- HTML buttons voor elke resterende weekdag tot en met zondag
- Buttons hebben class="menu-item" of class="bulk-action-btn" (via callback)

## UI Component Contract

### Bulk Toolbar Rendering

**DOM element**: `#bulk-toolbar`

**Lifecycle**:
1. **Hidden state** (default): `style="display: none"`
2. **Shown state**: User klikt "Bulk bewerken" → `toggleBulkModus()` → remove display:none
3. **Content update**: `getBulkVerplaatsKnoppen()` generates HTML → inserted in `.bulk-actions` div
4. **Hidden state**: Bulk actie completes → `toggleBulkModus()` → `style="display: none"`

**Event bindings**:
- Weekdag knoppen: `onclick="window.bulkDateAction(N)"` inline attributes
- Annuleren knop: `onclick="window.toggleBulkModus()"`
- Lijst knoppen: `onclick="window.bulkVerplaatsNaar('lijst-naam')"`

**CSS classes** (bestaand):
- `.bulk-toolbar` - Container styling
- `.bulk-action-btn` - Button styling (consistent met huidige design)
- `.bulk-selection-info` - Selection count display
- `.bulk-cancel-btn` - Cancel button styling

## Testing Contracts

### Manual Test Contract

**Test environment**: dev.tickedify.com (staging)

**Preconditions**:
- Branch `005-in-het-acties` deployed naar staging
- User logged in met jan@buskens.be credentials
- Acties lijst heeft minstens 5 taken

**Test steps**:
1. Navigeer naar Acties scherm
2. Klik "Bulk bewerken" knop
3. **Verify**: Bulk toolbar verschijnt met correcte weekdag knoppen voor huidige dag
4. Selecteer 3 taken (klik op taken)
5. **Verify**: Selection count toont "3 taken geselecteerd"
6. Klik weekdag knop (bv. "Donderdag")
7. **Verify**: Toast success message "3 taken bijgewerkt naar 2025-10-09"
8. **Verify**: Bulk modus gedeactiveerd automatisch
9. **Verify**: Taken hebben nieuwe datum en staan op juiste positie in lijst

**Expected weekdag knoppen** per dag:
- Maandag: Vandaag, Morgen, Wo, Do, Vr, Za, Zo (7 totaal)
- Dinsdag: Vandaag, Morgen, Do, Vr, Za, Zo (6 totaal)
- Woensdag: Vandaag, Morgen, Vr, Za, Zo (5 totaal)
- Donderdag: Vandaag, Morgen, Za, Zo (4 totaal)
- Vrijdag: Vandaag, Morgen, Zo (3 totaal)
- Zaterdag: Vandaag, Morgen (2 totaal)
- Zondag: Vandaag, Morgen (2 totaal - geen weekdagen)

### Playwright Test Contract

**Test file**: `tests/bulk-weekdag-knoppen.spec.js` (to be created)

**Test scenarios**:
1. ✅ Bulk modus toont correcte weekdag knoppen op maandag
2. ✅ Bulk modus toont correcte weekdag knoppen op vrijdag
3. ✅ Bulk modus toont geen weekdag knoppen op zondag
4. ✅ Klik weekdag knop updates alle geselecteerde taken
5. ✅ Individueel taak menu toont identieke weekdag knoppen als bulk

**Assertions**:
- Button count matches expected per weekdag
- Button labels zijn Nederlandse dag namen
- onclick attributes hebben correcte dagenOffset values
- API calls triggered met correcte verschijndatum payloads
- List reload na bulk actie toont bijgewerkte data

## Contract Test Summary

**No new API contracts** → No contract tests needed ✅

**Frontend contracts**:
- Existing `bulkDateAction()` function - no signature changes ✅
- Modified `getBulkVerplaatsKnoppen()` - internal implementation detail ✅
- New `getWeekdagKnoppen()` helper - unit testable but no contract test needed ✅

**UI contracts**:
- Manual testing protocol defined ✅
- Playwright automation scenarios defined ✅

**Ready for quickstart.md generation** ✅
