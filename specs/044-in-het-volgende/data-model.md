# Data Model: Bulk Edit Filter Compatibiliteit Fix

**Feature**: 044-in-het-volgende
**Date**: 2025-10-30

## Overview
Dit is een bug fix - geen nieuwe database entities. Het model beschrijft de bestaande data structuren en hoe hun state management wordt verbeterd.

---

## Existing Entities (No Changes Required)

### Task (Database: `taken` tabel)
**Purpose**: Representeert een taak in het Tickedify systeem.

**Schema** (PostgreSQL):
```sql
CREATE TABLE taken (
    id VARCHAR(50) PRIMARY KEY,           -- Format: user-generated of UUID
    tekst TEXT NOT NULL,                  -- Task description
    lijst VARCHAR(50),                    -- 'inbox', 'acties', 'opvolgen', etc.
    status VARCHAR(20),                   -- 'actief', 'afgewerkt', 'uitgesteld'
    project_id INTEGER REFERENCES projecten(id),
    context_id INTEGER REFERENCES contexten(id),
    user_id INTEGER REFERENCES users(id), -- Multi-user support
    verschijndatum VARCHAR(10),           -- YYYY-MM-DD format
    duur INTEGER,                         -- Duration in minutes
    herhaling_type VARCHAR(50),           -- Recurring pattern
    -- ... other fields
);
```

**Valid ID Format**:
- ✅ UUID pattern: `550e8400-e29b-41d4-a716-446655440000`
- ✅ Custom IDs: `xachag1c7mekd5yyn`, `uim72s6ulmfikpu6p`
- ❌ Test IDs: `test-1752000171959-gjj7u1rf0` (never persisted to database)

---

## Client-Side State (JavaScript)

### Taakbeheer Class State

```javascript
class Taakbeheer {
    constructor() {
        this.taken = [];                    // Array<Task> - Loaded from server
        this.geselecteerdeTaken = new Set(); // Set<string> - Selected task IDs
        this.bulkModus = false;              // Boolean - Bulk mode active
        // ... other state
    }
}
```

**State Invariants** (to be enforced by this fix):

1. **this.taken Integrity**:
   - Must only contain tasks loaded from server
   - Updated on: list load, task create/update/delete, filter changes (no change - filters only hide)
   - Never contains test/placeholder IDs

2. **geselecteerdeTaken Integrity** (ENHANCED):
   - ✅ Currently: Cleared on filter change (v0.20.33)
   - ✅ Currently: Filtered for valid IDs before bulk edit (v0.20.33)
   - 🆕 **New**: Validated at selection time (prevent invalid IDs entering Set)
   - 🆕 **New**: Only IDs present in `this.taken` can be selected
   - 🆕 **New**: Test ID pattern explicitly rejected

3. **Bulk Mode Invariants**:
   - Selection circles only clickable on visible tasks (display !== 'none')
   - Selection count matches geselecteerdeTaken.size
   - All IDs in geselecteerdeTaken must exist in database (server validation)

---

## State Transitions

### Task Selection Flow (ENHANCED)

```
User clicks selectie-circle
    ↓
toggleTaakSelectie(taskId) called
    ↓
[NEW] validateTaskId(taskId)
    ├─ ❌ Test pattern detected → REJECT (log warning)
    ├─ ❌ Not in this.taken → REJECT (log warning)
    └─ ✅ Valid → ALLOW
    ↓
Check if task element visible
    ├─ display: 'none' → REJECT (existing check)
    └─ visible → ALLOW
    ↓
Toggle taskId in geselecteerdeTaken Set
    ↓
Update visual selection state
    ↓
Update bulk toolbar count
```

### Filter Change Flow (EXISTING - NO CHANGE)

```
User changes filter value
    ↓
filterActies() called
    ↓
Clear geselecteerdeTaken Set (v0.20.33)
    ↓
Clear visual selections (v0.20.33)
    ↓
Apply CSS display: none to filtered tasks
    ↓
Update bulk toolbar (count = 0)
```

### Bulk Edit Flow (ENHANCED)

```
User clicks "Edit Properties"
    ↓
bulkEditProperties(updates) called
    ↓
Validation: geselecteerdeTaken.size >= 2
    ↓
Confirmation dialog shown
    ↓
[EXISTING] Filter valid IDs from geselecteerdeTaken
    validIds = selectedIds.filter(id => this.taken.find(t => t.id === id))
    ↓
[EXISTING] Warning if invalidCount > 0
    ↓
Sequential API calls for each valid ID
    PUT /api/taak/:id with updates
    ↓
Success/error tracking
    ↓
Reload list if all successful
```

---

## Data Validation Rules (NEW)

### Task ID Validation

**Function**: `validateTaskId(taskId: string): boolean`

**Rules**:
1. **Test Pattern Check**: `!/^test-/.test(taskId)`
   - Rejects: `test-1752000171959-gjj7u1rf0`
   - Reason: Test IDs never persisted to database

2. **Existence Check**: `this.taken.find(t => t.id === taskId) !== undefined`
   - Verifies: Task is loaded in current client state
   - Prevents: Stale IDs from previous list loads

3. **Logging**: Console warnings for rejected IDs
   - Format: `[VALIDATION] {reason}: {taskId}`

**Applied At**:
- `toggleTaakSelectie()` - Individual task selection
- `selecteerAlleTaken()` - Bulk select all visible
- Any future selection entry points

---

## Edge Cases Handled

### 1. Test ID in DOM but not in database
**Scenario**: UI renders placeholder task with test ID
**Current**: Test ID can enter geselecteerdeTaken → 404 error
**Fix**: Test ID rejected at selection time → never enters Set

### 2. Task deleted by another user
**Scenario**: Task exists when page loaded, deleted externally, still visible in UI
**Current**: ID in geselecteerdeTaken → 404 error
**Fix**: ID validated against `this.taken` → rejected if not found

### 3. Rapid filter changes
**Scenario**: User applies filter A, selects tasks, changes to filter B
**Current**: Selection cleared on filter change (v0.20.33) ✅
**Fix**: No change needed - already handled correctly

### 4. Select All with mixed valid/invalid IDs
**Scenario**: DOM contains some test IDs among valid tasks
**Current**: All IDs added to geselecteerdeTaken
**Fix**: validateTaskId() skips invalid IDs during iteration

---

## No Database Changes Required

This fix operates entirely in client-side validation logic:
- ✅ No schema changes
- ✅ No migrations needed
- ✅ No server-side changes (404 is correct response for invalid ID)
- ✅ Backwards compatible (server behavior unchanged)

---

## Testing Data Requirements

**Test Scenario Setup**:
1. Create 10+ real tasks in database (valid IDs)
2. Apply filter to show 5 tasks
3. Select filtered tasks
4. Apply bulk edit (context change)
5. Verify: No 404 errors, all selected tasks updated

**Edge Case Tests**:
- Filter showing 0 tasks → bulk edit disabled
- Filter showing 1 task → bulk edit disabled (minimum 2)
- Rapid filter changes → selections cleared correctly
- Invalid IDs in DOM (manual inject) → rejected by validation

---

## Next Phase
**Contracts**: Define API contract expectations (PUT /api/taak/:id validation behavior)
