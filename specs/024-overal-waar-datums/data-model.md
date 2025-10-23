# Data Model: Datumformaat Standaardisatie

**Feature**: DD/MM/YYYY date format standardization
**Date**: 2025-10-22

## Overview

Dit feature introduceert GEEN nieuwe database entities of schema wijzigingen. Het is een pure **UI transformation layer** die bestaande datum data (opgeslagen als YYYY-MM-DD in database) transformeert naar DD/MM/YYYY voor weergave aan gebruikers.

## Core Entity: DisplayDate (Conceptual)

**Type**: Pure function (stateless transformation)
**Scope**: Frontend UI layer only
**Persistence**: None (ephemeral formatting)

### Function Signature

```javascript
/**
 * Formats a date for display in DD/MM/YYYY format
 *
 * @param {Date|string} dateInput - Date object or ISO string (YYYY-MM-DD)
 * @param {Object} options - Optional formatting options
 * @param {boolean} options.includeWeekday - Include weekday name (default: false)
 * @returns {string} Formatted date string "DD/MM/YYYY"
 * @throws {Error} If dateInput is invalid or results in NaN
 *
 * @example
 * formatDisplayDate('2025-10-22')           // "22/10/2025"
 * formatDisplayDate(new Date(2025, 9, 22)) // "22/10/2025"
 * formatDisplayDate('2025-01-01')          // "01/01/2025" (leading zeros)
 */
formatDisplayDate(dateInput, options = {})
```

### Input Types

| Type | Format | Example | Valid |
|------|--------|---------|-------|
| ISO String | YYYY-MM-DD | "2025-10-22" | ✓ |
| Date Object | native | `new Date(2025, 9, 22)` | ✓ |
| ISO DateTime | YYYY-MM-DDTHH:mm:ss | "2025-10-22T14:30:00" | ✓ (tijd ignored) |
| Invalid String | any | "not a date" | ✗ throw Error |
| null | - | null | ✗ throw Error |
| undefined | - | undefined | ✗ throw Error |
| NaN Date | - | `new Date('invalid')` | ✗ throw Error |

### Output Format

**Standard Output**: `DD/MM/YYYY`
- Day: 2-digit (leading zero: 01-31)
- Month: 2-digit (leading zero: 01-12)
- Year: 4-digit (1000-9999)
- Separator: forward slash `/`

**Examples**:
```
Input: "2025-10-22" → Output: "22/10/2025"
Input: "2025-01-01" → Output: "01/01/2025"
Input: "2099-12-31" → Output: "31/12/2099"
```

### Validation Rules

1. **Date must be valid JavaScript Date**
   - `new Date(dateInput)` must not result in `NaN`
   - `date.getTime()` must return valid number

2. **No null/undefined accepted**
   - Fail fast with Error
   - Clear error message: `"Invalid date: {input}"`

3. **No implicit defaults**
   - No fallback to current date
   - No empty string returns
   - Always explicit success or failure

### State Transitions

**N/A** - Stateless pure function (no state machine)

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Database Layer                          │
│                   (PostgreSQL - UNCHANGED)                      │
│                                                                 │
│  taken.verschijndatum: YYYY-MM-DD (varchar)                    │
│  taken.prioriteit_datum: YYYY-MM-DD (varchar)                  │
│  contexten.aangemaakt: timestamp                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ API response (JSON)
                     │ { verschijndatum: "2025-10-22" }
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (app.js)                          │
│                                                                 │
│  1. Ontvang data via fetch()                                   │
│  2. Parse JSON → taak object                                   │
│  3. Extract verschijndatum → "2025-10-22"                      │
│  4. **NEW**: Call formatDisplayDate(taak.verschijndatum)       │
│  5. Render in UI → "22/10/2025"                                │
└─────────────────────────────────────────────────────────────────┘
                     │
                     │ User sees
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                           Browser                               │
│                                                                 │
│  Taak: "Vergadering voorbereiden"                              │
│  Deadline: 22/10/2025  ← DD/MM/YYYY format                     │
└─────────────────────────────────────────────────────────────────┘
```

## UI Display Locations (25+ refactor points)

### Category 1: Taken Lijsten
- **Acties lijst**: `verschijndatum` display (regel 2286)
- **Afgewerkt sectie**: `afgewerkt` datum (regel 2310)
- **Opvolgen lijst**: `verschijndatum` display (vergelijkbaar met Acties)
- **Uitgesteld lijsten**: `verschijndatum` display

### Category 2: Dagelijkse Planning
- **Kalender header**: Huidige dag display (regel 8328)
- **Planning items**: Taak deadline/verschijndatum (regel 8370, 8475)
- **Expandable details**: Volledige taak info (regel 7492)

### Category 3: Floating Panels
- **Acties Floating Panel**: Week overzicht dag nummers (regels 11308-11414)
  - Note: Week dag afkortingen blijven Engels (FR-010 compliance)
  - Alleen dag nummer formattering relevant

### Category 4: Toast Notifications
- **Recurring task completion**: Next occurrence datum (regels 2398, 4003, 10512)
- **Planning confirmations**: Scheduled for datum (regel 4903)

### Category 5: Context Menu & Modals
- **Acties menu overlay**: Taak datum info (regels 3471, 3683, 3767)
- **Context Management**: Aanmaak datum (regel 7079)

### Category 6: Datum Badges
- **Badge display**: Future/overdue datum tekst (regel 2042)

## No Database Changes

**Critical**: Dit feature wijzigt ALLEEN de UI presentation layer.

**Database blijft ongewijzigd**:
- ✓ `taken.verschijndatum` blijft VARCHAR YYYY-MM-DD
- ✓ `taken.prioriteit_datum` blijft VARCHAR YYYY-MM-DD
- ✓ `contexten.aangemaakt` blijft TIMESTAMP
- ✓ Geen migrations nodig
- ✓ Geen API contract changes

**Rationale**:
- ISO format (YYYY-MM-DD) is database best practice (sorting, indexing)
- Backend/database onafhankelijk van frontend display preferences
- Toekomstige user preferences alleen frontend wijziging

## Relationship to Existing Code

### Existing Date Functions (DO NOT MODIFY)

**`formatDate(dateString)`** - regel 14668-14677
- **Purpose**: Bijlagen timestamps (met tijd component)
- **Output**: "6 jan 2025, 14:23"
- **Usage**: BijlagenManager class
- **Status**: KEEP UNCHANGED (different use case)

**`calculateNextRecurringDate(...)`** - regel 4500
- **Purpose**: Herhalende taken datum berekening
- **Output**: ISO string YYYY-MM-DD (for database)
- **Usage**: Recurring task engine
- **Status**: KEEP UNCHANGED (backend logic)

### New Function Location

**`formatDisplayDate(dateInput, options = {})`** - NEW
- **Location**: Taakbeheer class (app.js)
- **Position**: Near existing formatDate() (~regel 14680)
- **Rationale**: Logical grouping met andere utility functions
- **Access**: `this.formatDisplayDate()` binnen class, `app.formatDisplayDate()` global

## Future Extensibility: User Preferences

**Design for Future** (niet nu implementeren):

```javascript
// TOEKOMSTIGE implementatie (Phase 2+)
formatDisplayDate(dateInput, options = {}) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) throw new Error(`Invalid date: ${dateInput}`);

    // TOEKOMST: Lees user preference uit localStorage/database
    const userFormat = this.getUserDatePreference(); // NEW functie

    switch(userFormat) {
        case 'DD/MM/YYYY':  // Nederlands (current implementation)
            return this.formatDDMMYYYY(date);
        case 'MM/DD/YYYY':  // Amerikaans
            return this.formatMMDDYYYY(date);
        case 'YYYY-MM-DD':  // ISO / Technisch
            return this.formatYYYYMMDD(date);
        default:
            return this.formatDDMMYYYY(date); // Fallback
    }
}
```

**Database Schema (Future)**:
```sql
-- NIET NU - Toekomstige extensie
ALTER TABLE users ADD COLUMN date_format_preference VARCHAR(20) DEFAULT 'DD/MM/YYYY';
```

**Benefits**:
- Alle 25+ UI locaties gebruiken centrale functie → automatisch user preference
- 1 functie wijziging ipv 25+ locaties refactoren
- Backward compatible (default blijft DD/MM/YYYY)

---

**Data Model Status**: ✅ COMPLETE - No database changes, pure UI transformation layer
