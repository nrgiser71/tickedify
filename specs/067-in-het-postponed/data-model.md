# Data Model: Clickable Tasks in Postponed Screen

**Feature**: 067-in-het-postponed
**Date**: 2025-01-18

## Overview

This feature requires **NO database schema changes**. It's a pure frontend enhancement that adds click event handlers to existing postponed task UI elements to open the existing task details modal.

---

## Existing Entities (No Changes)

### Task Entity

**Database Table**: `taken` (existing)

**Relevant Fields** (no modifications):
- `id` (INTEGER, PRIMARY KEY) - Task unique identifier
- `tekst` (TEXT) - Task name/description
- `lijst` (VARCHAR) - List assignment (e.g., 'uitgesteld-wekelijks', 'uitgesteld-maandelijks')
- `projectId` (INTEGER, NULLABLE) - Associated project
- `contextId` (INTEGER, NULLABLE) - Associated context
- `verschijndatum` (DATE, NULLABLE) - Due date
- `prioriteit` (VARCHAR, NULLABLE) - Priority level (hoog/gemiddeld/laag)
- `duur` (INTEGER, NULLABLE) - Estimated duration in minutes
- `opmerkingen` (TEXT, NULLABLE) - Task notes
- `voltooid` (BOOLEAN) - Completion status
- `herhaling_type` (VARCHAR, NULLABLE) - Recurrence pattern
- `herhaling_actief` (BOOLEAN) - Recurrence enabled flag
- (plus other fields not relevant to this feature)

**No schema changes needed** - all task properties already exist and are editable via the existing planningPopup modal.

---

## Frontend Data Flow (Existing)

### Task Loading
```
1. User navigates to postponed screen
2. app.renderUitgesteldConsolidated() renders accordion structure
3. User clicks category header (e.g., "Weekly")
4. app.toggleUitgesteldSectie(categoryKey) toggles section visibility
5. app.loadUitgesteldSectieData(categoryKey) fetches tasks via GET /api/lijst/{categoryKey}
6. app.renderUitgesteldSectieRows(categoryKey, taken) renders task items as <li> elements
```

### Task Editing (After This Feature)
```
7. User clicks on task .taak-content div (NEW: onclick handler added)
8. app.bewerkActieWrapper(id) called (EXISTING function)
9. app.bewerkActie(id) loads task from this.taken array (EXISTING)
10. Populate #planningPopup modal with task data (EXISTING)
11. User modifies fields and clicks "Create action" button (EXISTING)
12. app.saveTask() sends PUT /api/taak/{id} (EXISTING)
13. Backend updates database (EXISTING - no list reassignment)
14. Frontend refreshes postponed section (EXISTING via loadUitgesteldSectieData)
```

**Key Point**: Steps 7-14 already exist for other lists. This feature only adds step 7 for postponed tasks.

---

## State Management (No Changes)

### App State Object

**Location**: `/public/app.js` - `app` object

**Relevant State Properties** (existing, no changes):
```javascript
{
    taken: [],              // Array of all loaded tasks
    huidigeTaakId: null,   // Currently edited task ID (set when modal opens)
    projecten: [],         // Available projects for dropdown
    contexten: []          // Available contexts for dropdown
}
```

**Modal State**:
- `#planningPopup` visibility controlled via `style.display` property
- Form inputs populated from task data when modal opens
- No new state variables needed

---

## Validation Rules (No Changes)

All validation rules remain unchanged - they're enforced by the existing modal and backend:

1. **Task name required** - Enforced by `<input required>` on `#taakNaamInput`
2. **Due date format** - HTML5 date picker ensures valid format
3. **Duration positive integer** - `<input type="number" min="1">` constraint
4. **List assignment** - Tasks stay in current list unless explicitly moved via defer buttons
5. **Priority values** - Dropdown limits to valid options (hoog/gemiddeld/laag)

---

## Data Integrity Constraints

### Critical Constraint: List Preservation

**Rule**: Tasks MUST remain in their current list (`lijst` field) when properties are modified, UNLESS user explicitly clicks a defer button.

**Enforcement**:
- Backend PUT `/api/taak/:id` endpoint does NOT reassign `lijst` based on `verschijndatum`
- Frontend modal does NOT automatically change list assignment
- List changes only via explicit button clicks:
  - "Create action" button (if moving from inbox/postponed to actions)
  - Defer buttons ("Weekly", "Monthly", etc.)

**Testing Verification**:
- Change postponed task due date to today → Task stays in postponed list ✓
- Change postponed task due date to past → Task stays in postponed list ✓
- Click "Weekly" defer button → Task moves to uitgesteld-wekelijks ✓

---

## API Contracts (No Changes)

This feature uses existing API endpoints without modifications:

### GET /api/lijst/:lijstNaam
**Used by**: `loadUitgesteldSectieData()` to fetch postponed tasks
**No changes needed**

### PUT /api/taak/:id
**Used by**: `saveTask()` to update task properties
**No changes needed** - already preserves list assignment

### GET /api/projecten
**Used by**: Modal to populate project dropdown
**No changes needed**

### GET /api/contexten
**Used by**: Modal to populate context dropdown
**No changes needed**

---

## Summary

**Database Changes**: None
**Schema Migrations**: None
**New Entities**: None
**Modified Entities**: None
**New API Endpoints**: None
**Modified API Endpoints**: None

This is a **pure frontend UI enhancement** that adds clickability to existing task elements, reusing all existing backend logic and data structures.
