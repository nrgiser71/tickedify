# Data Model: Task Completion Checkbox Fix

**Date**: 2025-10-29
**Branch**: 038-als-ik-in

## Overview

Dit is een bugfix die **geen database schema wijzigingen** vereist. Alle benodigde velden bestaan al in de database.

## Existing Data Model (No Changes Required)

### Task Entity

**Table**: `taken`

**Relevant Fields**:
```sql
id SERIAL PRIMARY KEY
naam TEXT NOT NULL
lijst VARCHAR(50)                    -- 'inbox', 'acties', 'opvolgen', 'afgewerkt', etc.
status VARCHAR(20)                   -- 'actief', 'afgewerkt', 'uitgesteld'
datum VARCHAR(10)                    -- YYYY-MM-DD format
verschijndatum VARCHAR(10)           -- Show date
project_id INTEGER REFERENCES projecten(id)
context_id INTEGER REFERENCES contexten(id)
duur INTEGER                         -- Duration in minutes
opmerkingen TEXT                     -- Notes
top_prioriteit INTEGER               -- 1, 2, 3 for top priorities
prioriteit_datum VARCHAR(10)         -- Priority date
herhaling_type VARCHAR(50)           -- Recurring pattern
herhaling_waarde INTEGER             -- Legacy field (unused)
herhaling_actief BOOLEAN DEFAULT FALSE
```

**Fields Used in Bugfix**:
- `id` - Task identifier
- `naam` - Task name (read from popup)
- `lijst` - List assignment (changed to 'afgewerkt' on completion)
- `status` - Status (changed to 'afgewerkt' on completion)
- `herhaling_actief` - Whether task is recurring
- `herhaling_type` - Recurring pattern (for new instance creation)

**Fields NOT Changed**:
- All other fields remain unchanged during checkbox completion

## State Transitions

### Current Bug Behavior

```
Task in popup → User checks checkbox → Click save
                                           ↓
                                      [IGNORED] ❌
                                           ↓
                                   Task unchanged
```

### Expected Behavior (After Fix)

```
Task in popup → User checks checkbox → Click save
                                           ↓
                                     Is checked?
                                     /         \
                                  YES          NO
                                   ↓            ↓
                          Archive task    Normal save
                          (lijst='afgewerkt',
                           status='afgewerkt')
                                   ↓
                          Is recurring?
                          /         \
                       YES          NO
                        ↓            ↓
              Create new       Task archived
              instance         (done)
```

## Data Flow

### 1. Grid Checkbox (Working Reference)

**Trigger**: User clicks checkbox in task list grid

**Data Flow**:
```
Click checkbox
  ↓
taakAfwerken(id)
  ↓
Find task in huidigeActies array
  ↓
Set taak.afgewerkt = new Date().toISOString()
  ↓
verplaatsTaakNaarAfgewerkt(taak)
  ↓
API: POST /api/taak/afwerken (or similar)
  ↓
Database: UPDATE taken SET lijst='afgewerkt', status='afgewerkt' WHERE id=?
  ↓
If recurring: handleRecurringCompletion(taak)
  ↓
Refresh UI: laadHuidigeLijst()
```

### 2. Detail Popup Checkbox (To Be Fixed)

**Trigger**: User checks checkbox in detail popup and clicks save

**Current Data Flow** (Broken):
```
Click save
  ↓
maakActie()
  ↓
Read all fields EXCEPT checkbox ❌
  ↓
Normal save (no completion)
```

**Fixed Data Flow**:
```
Click save
  ↓
maakActie()
  ↓
Read checkbox state: isAfgevinkt
  ↓
If isAfgevinkt:
  ↓
  Find task in huidigeActies array
  ↓
  Set taak.afgewerkt = new Date().toISOString()
  ↓
  verplaatsTaakNaarAfgewerkt(taak)
  ↓
  [Same flow as grid checkbox]
Else:
  ↓
  [Normal save flow]
```

## Validation Rules

### Checkbox State Validation

**Rule 1**: Checkbox can only complete active tasks
- If task already has `status='afgewerkt'`, checkbox should reflect this (checked)
- User can uncheck to "reactivate" task (separate feature, not in scope)

**Rule 2**: Completion requires task ID
- Cannot complete a task that hasn't been created yet (new tasks)
- This is already handled by popup logic (new vs edit mode)

**Rule 3**: Recurring task validation
- If `herhaling_actief=true`, must create new instance on completion
- This is handled by existing `handleRecurringCompletion()` function

## Relationships

### Task → Project (Optional)
- `project_id` references `projecten(id)`
- Preserved during completion
- Not affected by bugfix

### Task → Context (Optional)
- `context_id` references `contexten(id)`
- Preserved during completion
- Not affected by bugfix

### Task → Subtasks (Hierarchical)
- `subtaken` table references `parent_taak_id`
- Should subtasks be completed when parent is completed via popup?
- **Decision**: Follow grid checkbox behavior (check existing implementation)

## Performance Considerations

### Database Operations

**Current**: 1 UPDATE per save (normal save flow)

**After Fix**:
- If checkbox unchecked: 1 UPDATE (no change)
- If checkbox checked: Same operations as grid checkbox
  - 1 UPDATE to archive task
  - 0-1 INSERT for recurring task instance
  - No performance degradation

### UI Updates

**No change in performance**:
- Same `laadHuidigeLijst()` refresh
- Same UI removal logic
- Same toast notification

## Data Integrity

### Consistency Guarantees

1. ✅ **Single source of truth**: Both checkboxes use same archive function
2. ✅ **Atomic operations**: Database UPDATE is atomic
3. ✅ **Recurring task integrity**: Existing logic preserves all recurring properties
4. ✅ **Relationship integrity**: Foreign keys preserved during completion

### Error Handling

**Scenario 1**: Network failure during archive
- Existing error handling in `verplaatsTaakNaarAfgewerkt()`
- User sees error toast
- Task remains in active list

**Scenario 2**: Task deleted before save
- Handled by existing update logic
- API returns 404, user notified

**Scenario 3**: Concurrent modification
- No locking mechanism currently
- Last write wins (existing behavior)
- Not addressed by this bugfix

## Migration Requirements

**None** - No database schema changes required

## Testing Data Model

### Test Cases

1. **Simple completion**:
   - Task with minimal fields (id, naam only)
   - Check checkbox, save
   - Verify: lijst='afgewerkt', status='afgewerkt'

2. **Complex task completion**:
   - Task with project, context, notes, duration
   - Check checkbox, save
   - Verify: All fields preserved, only lijst/status changed

3. **Recurring task completion**:
   - Task with herhaling_actief=true, herhaling_type='weekly-1-1'
   - Check checkbox, save
   - Verify: Original archived, new instance created with next date

4. **Checkbox toggle**:
   - Check checkbox
   - Uncheck checkbox
   - Save
   - Verify: Normal save, task still active

## Summary

**Data Model Changes**: None required

**Existing Fields Used**:
- `id` - Task identifier
- `lijst` - Changed to 'afgewerkt'
- `status` - Changed to 'afgewerkt'
- `herhaling_actief`, `herhaling_type` - For recurring task handling

**Validation**: Handled by existing code (`verplaatsTaakNaarAfgewerkt()`)

**Performance**: No degradation - same operations as grid checkbox

**Integrity**: Maintained through reuse of tested archive function

---

**Phase 1 (Data Model) Status**: ✅ COMPLETE - No schema changes, clear data flow identified
