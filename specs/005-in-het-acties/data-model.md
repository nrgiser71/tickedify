# Data Model: Bulk Actie Datum Knoppen Uitbreiden

**Feature**: 005-in-het-acties
**Date**: 2025-10-06

## Overview

Dit is een **frontend-only feature** die geen database schema wijzigingen vereist. De feature werkt met bestaande data structuren en UI state.

## Existing Entities (No Changes)

### Taak (Task)

**Bestaande database tabel**: `taken`

**Relevante velden** (geen wijzigingen):
- `id` (UUID) - Primaire sleutel
- `verschijndatum` (DATE) - Datum waarop taak verschijnt in Acties lijst
- `lijst` (VARCHAR) - Huidige lijst locatie (inbox, acties, etc.)
- `tekst` (TEXT) - Taak beschrijving
- `gebruiker_id` (UUID) - Foreign key naar gebruiker

**Gebruikt door bulk actie**:
- `verschijndatum` wordt bijgewerkt bij bulk datum actie
- Bestaande `PUT /api/taak/:id` endpoint wordt gebruikt
- Geen schema wijzigingen nodig

### Bulk Selection State (Frontend Only)

**Implementatie**: JavaScript Set in Taakbeheer class

```javascript
class Taakbeheer {
    constructor() {
        this.bulkModus = false;              // Boolean: bulk modus actief/inactief
        this.geselecteerdeTaken = new Set(); // Set<string>: geselecteerde taak IDs
    }
}
```

**Eigenschappen**:
- `bulkModus`: Boolean flag die bulk edit modus activeert
- `geselecteerdeTaken`: Set van taak ID strings (UUID's)
- State is **tijdelijk** - reset bij bulk modus deactivatie
- State is **lokaal** - niet persistent in database
- State is **per sessie** - verdwijnt bij page reload

**Gebruikt door bulk actie flow**:
1. User klikt "Bulk bewerken" → `bulkModus = true`
2. User klikt taken → IDs toegevoegd aan `geselecteerdeTaken` Set
3. User klikt weekdag knop → itereer door `geselecteerdeTaken`
4. Voor elke ID: update verschijndatum via API
5. Bulk modus deactiveren → `bulkModus = false`, `geselecteerdeTaken.clear()`

## UI Components (No Data Model Impact)

### Bulk Toolbar

**DOM element**: `<div id="bulk-toolbar">`

**Dynamische content**: HTML string gegenereerd door `getBulkVerplaatsKnoppen()`

**Structuur**:
```html
<div id="bulk-toolbar" class="bulk-toolbar">
    <div class="bulk-toolbar-content">
        <div class="bulk-selection-info">
            <span id="bulk-selection-count">X taken geselecteerd</span>
        </div>
        <div class="bulk-actions">
            <!-- Dynamisch gegenereerde weekdag knoppen -->
            <button onclick="window.bulkDateAction(0)" class="bulk-action-btn">Vandaag</button>
            <button onclick="window.bulkDateAction(1)" class="bulk-action-btn">Morgen</button>
            <button onclick="window.bulkDateAction(2)" class="bulk-action-btn">Woensdag</button>
            <!-- ... meer weekdagen ... -->
            <button onclick="window.bulkVerplaatsNaar('opvolgen')" class="bulk-action-btn">Opvolgen</button>
        </div>
        <button onclick="window.toggleBulkModus()" class="bulk-cancel-btn">Annuleren</button>
    </div>
</div>
```

**State binding**:
- Visibility: `display: none` wanneer `bulkModus = false`
- Selection count: Update `#bulk-selection-count` text bij Set wijziging
- Buttons: Dynamisch gegenereerd op basis van `Date().getDay()`

## Data Flow

### Bulk Datum Actie Flow

```
1. User Interface Event
   ↓
   User klikt weekdag knop (bv. "Donderdag")
   ↓
2. Frontend JavaScript Handler
   ↓
   window.bulkDateAction(dagenOffset) aanroep
   ↓
   app.bulkUpdateDates(dagenOffset)
   ↓
3. Date Calculation (Frontend)
   ↓
   const nieuweDatum = new Date()
   nieuweDatum.setDate(nieuweDatum.getDate() + dagenOffset)
   const newDate = nieuweDatum.toISOString().split('T')[0]  // YYYY-MM-DD
   ↓
4. Iterate Selected Tasks
   ↓
   for (const taakId of this.geselecteerdeTaken) {
   ↓
5. API Call (per taak)
   ↓
   PUT /api/taak/:id
   Body: { verschijndatum: newDate }
   ↓
6. Backend Update (Bestaande Logica)
   ↓
   UPDATE taken SET verschijndatum = $1 WHERE id = $2
   ↓
7. Frontend Refresh
   ↓
   toast.success(`${successCount} taken bijgewerkt naar ${newDate}`)
   this.toggleBulkModus()  // Reset bulk state
   await this.laadHuidigeLijst()  // Reload lijst
```

**Geen nieuwe API endpoints nodig** - hergebruikt bestaande `PUT /api/taak/:id`

## Validation Rules (Frontend)

### Weekdag Knop Generatie

**Rule 1**: Alleen resterende dagen van huidige week tonen
- Implementatie: `dagenTotZondag = weekdag === 0 ? 0 : (7 - weekdag)`
- Zondag (weekdag=0) → geen weekdag knoppen
- Maandag (weekdag=1) → 6 dagen (di t/m zo)
- Zaterdag (weekdag=6) → 1 dag (zondag)

**Rule 2**: "Vandaag" en "Morgen" altijd tonen
- Altijd eerste twee knoppen in bulk toolbar
- Onafhankelijk van weekdag berekening
- `dagenOffset = 0` voor vandaag, `1` voor morgen

**Rule 3**: Nederlandse dag namen
- Array: `['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']`
- Index via `datum.getDay()` na offset berekening

### Bulk Selection Validation

**Rule 1**: Bulk modus alleen beschikbaar in "acties" lijst
- Check: `if (this.huidigeLijst === 'acties')`
- Andere lijsten kunnen eigen bulk patterns hebben (uitgesteld, opvolgen)

**Rule 2**: Minimum 1 taak geselecteerd voor actie
- Check: `if (this.geselecteerdeTaken.size === 0)`
- Toast warning: "Selecteer minstens één taak"

**Rule 3**: Maximum bulk size: geen limiet
- PostgreSQL kan honderden updates per seconde aan
- Frontend loading indicator tijdens bulk operatie
- Geen pagination - kleine lijst (typisch <50 acties)

## State Transitions

### Bulk Modus State Machine

```
┌─────────────┐
│   Normal    │
│    Mode     │
└─────────────┘
       │
       │ User klikt "Bulk bewerken"
       ↓
┌─────────────┐
│    Bulk     │
│    Mode     │  ← User selecteert taken (Set.add)
│   Active    │  ← User deselecteert taken (Set.delete)
└─────────────┘
       │
       │ User klikt datum knop / Annuleren
       ↓
┌─────────────┐
│  Bulk Mode  │
│ Deactivate  │  → geselecteerdeTaken.clear()
└─────────────┘  → bulkModus = false
       │          → Reload lijst
       ↓
┌─────────────┐
│   Normal    │
│    Mode     │
└─────────────┘
```

**Transitions**:
1. Normal → Bulk: `toggleBulkModus()` sets `bulkModus = true`
2. Bulk → Normal: Automatic na datum actie of manual "Annuleren"
3. Taken selectie: `toggleTaakSelectie(taakId)` - add/remove van Set
4. Geen persistent state - page reload reset naar Normal mode

## No Database Migrations Required

✅ **Geen schema wijzigingen**
✅ **Geen nieuwe tabellen**
✅ **Geen nieuwe kolommen**
✅ **Geen indexes aanpassen**
✅ **Geen foreign keys toevoegen**

**Rationale**: Feature is pure UI enhancement die bestaande data structuur gebruikt.

## Performance Implications

### Frontend Performance

**Weekdag knoppen rendering**: O(7) worst case (maandag)
- 7 loop iteraties maximum
- String concatenation in JavaScript
- Negligible performance impact (<5ms)

**Bulk update iterations**: O(n) waar n = aantal geselecteerde taken
- Typisch: 5-20 taken per bulk actie
- Each iteration: 1 API call + DOM update
- Total tijd: n × 50ms ≈ 250ms-1000ms voor typische batch

**DOM updates**: Minimal
- Bulk toolbar: 1 innerHTML update bij modus activatie
- Taak items: CSS class toggle per selectie (fast)
- Lijst reload: Full re-render na bulk actie (bestaande logica)

### Backend Performance

**Geen impact** - hergebruikt bestaande `PUT /api/taak/:id` endpoint
- 1 query per taak: `UPDATE taken SET verschijndatum = $1 WHERE id = $2`
- PostgreSQL indexen op `id` (primary key) → instant lookups
- Geen N+1 query problems - updates zijn independent

### Network Performance

**Geen extra overhead**:
- Weekdag logica is client-side JavaScript
- API calls: identiek aan bestaande bulk date action
- Payload size: unchanged (~50 bytes per request)
- Total bandwidth: n × 50 bytes + overhead (minimal)

## Testing Data Requirements

### Test Scenarios

**Scenario 1: Maandag bulk actie**
- Datum: 2025-10-06 (Monday)
- Acties lijst: 10 taken met verschillende data
- Expected: 7 weekdag knoppen (vandaag t/m zondag)

**Scenario 2: Vrijdag bulk actie**
- Datum: 2025-10-10 (Friday)
- Acties lijst: 5 taken
- Expected: 3 weekdag knoppen (vandaag, morgen, zondag)

**Scenario 3: Zondag edge case**
- Datum: 2025-10-12 (Sunday)
- Acties lijst: 3 taken
- Expected: 2 knoppen (vandaag, morgen), geen weekdagen

**Test data setup**: Geen speciale data nodig - bestaande acties lijst is voldoende

## Data Model Conclusion

**Summary**:
- ✅ Geen database wijzigingen vereist
- ✅ Hergebruikt bestaande `taken` tabel en API endpoints
- ✅ Frontend state is tijdelijk en lokaal (JavaScript Set)
- ✅ Geen performance issues verwacht
- ✅ Data flow is straight-forward en gebruikt bestaande patterns

**Ready for contracts generation** ✅
