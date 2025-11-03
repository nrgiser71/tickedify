# Data Model: Filter Persistentie Fix

**Date**: 2025-11-03
**Feature**: 052-daarstraks-hebben-we

## Overview

Deze bug fix vereist **GEEN database wijzigingen** en **GEEN nieuwe data entities**. Dit is een pure frontend state management fix.

## Runtime State (Frontend Only)

### Filter State (In-Memory, DOM-based)

**Location**: DOM elements in dagelijkse planning scherm

**Filter Fields**:
```javascript
{
  taakFilter: string,        // Tekst filter - getElementById('planningTaakFilter')
  projectFilter: string,     // Project ID - getElementById('planningProjectFilter')
  contextFilter: string,     // Context ID - getElementById('planningContextFilter')
  prioriteitFilter: string,  // Prioriteit waarde - getElementById('planningPrioriteitFilter')
  datumFilter: string,       // Verschijndatum ISO - getElementById('planningDatumFilter')
  duurFilter: string         // Max duur minutes - getElementById('planningDuurFilter')
}
```

**State Lifecycle**:
1. User sets filter → DOM elements updated
2. `filterPlanningActies()` reads from DOM elements
3. Filter applied to `.planning-actie-item` elements (display: none/block)
4. **ISSUE**: State lost when list re-rendered without re-applying filters
5. **FIX**: Always call `filterPlanningActies()` after list re-render

**State Persistence**:
- State persisted in DOM element values (input/select elements)
- No localStorage needed (session-based state)
- Filter reset on page reload (expected behavior)

### Existing Data Entities (No Changes)

**Herhalende Taak** (Database: `taken` table):
```javascript
{
  id: uuid,
  tekst: string,
  projectId: uuid,
  contextId: uuid,
  prioriteit: string,  // 'hoog' | 'gemiddeld' | 'laag'
  verschijndatum: date,
  duur: integer,       // minutes
  herhaling_actief: boolean,
  herhaling_type: string,  // e.g., 'weekly-1-1,3,5'
  lijst: string,       // 'acties' | 'afgewerkt' | etc.
  afgewerkt: timestamp
}
```

**planningActies Array** (Runtime: app.js state):
```javascript
this.planningActies = [
  // Array of taken objects
  // Used by completePlanningTask() for local state management
  // Updated when recurring task created (regel 10754-10756)
]
```

## State Transitions

### Normal Task Completion Flow
```
User clicks checkbox
  → completePlanningTask() called
  → Task marked completed
  → Task removed from arrays (regel 10720-10723)
  → List re-rendered (regel 10778)
  → bindDragAndDropEvents() (regel 10779)
  → filterPlanningActies() (regel 10782) ← Feature 050 fix
  → Filter state PRESERVED ✅
```

### Recurring Task Completion Flow (BEFORE FIX)
```
User clicks checkbox
  → completePlanningTask() called
  → Task marked completed
  → Next instance created via API (regel 10698 or 10705)
  → Next instance fetched (regel 10748)
  → Added to arrays (regel 10754-10756)
  → renderPlanningActies() called (regel 10762) ← DEAD CODE, does nothing
  → List re-rendered (regel 10778)
  → bindDragAndDropEvents() (regel 10779)
  → filterPlanningActies() (regel 10782)
  → Filter state LOST ❌ (due to timing issue with dead code call)
```

### Recurring Task Completion Flow (AFTER FIX)
```
User clicks checkbox
  → completePlanningTask() called
  → Task marked completed
  → Next instance created via API
  → Next instance fetched
  → Added to arrays (regel 10754-10756)
  → [REMOVED: renderPlanningActies() dead code]
  → List re-rendered (regel 10778)
  → bindDragAndDropEvents() (regel 10779)
  → filterPlanningActies() (regel 10782)
  → Filter state PRESERVED ✅
```

## Validation Rules

**No validation changes needed** - this is a fix to existing filter behavior.

**Existing Filter Validation** (unchanged):
- Empty filter values mean "show all" (no filtering)
- Multiple filters are AND-combined
- Invalid filter values gracefully ignored (no crash)

## Data Dependencies

**Frontend Dependencies**:
- `filterPlanningActies()` function (regel 12027-12080)
- `completePlanningTask()` function (regel 10630-10829)
- DOM elements with IDs: planningTaakFilter, planningProjectFilter, etc.
- CSS class: `.planning-actie-item` for filter targeting

**Backend Dependencies**:
- NONE - pure frontend state management fix

## Migration Strategy

**No migration needed**:
- No database schema changes
- No data format changes
- Backward compatible (existing filters work as before)
- Forward compatible (new code handles old data)

## Performance Considerations

**Improvement**: By removing dead code (regel 10762), we eliminate one unnecessary DOM manipulation attempt, slightly improving performance.

**Filter Performance** (unchanged):
- `filterPlanningActies()` iterates over all `.planning-actie-item` DOM elements
- O(n) complexity where n = number of tasks in planning list
- Typical n < 50 tasks → negligible performance impact (<5ms)

## Testing Data Requirements

**Test Data Setup**:
1. User with herhalende taak in dagelijkse planning
2. Task properties:
   - Project: "Test Project"
   - Context: "Test Context"
   - Priority: "hoog"
   - Recurring: weekly (every Monday)
   - Due date: today
3. Multiple tasks to verify filter effects

**Test Verification**:
- Visual: Filter dropdown/checkbox state preserved
- DOM: Filter DOM elements retain values
- Behavior: Filtered tasks remain hidden, visible tasks remain visible

## Conclusion

This fix requires **zero data model changes**. It's purely a frontend state management fix that ensures `filterPlanningActies()` is called at the right time in the recurring task completion flow, consistent with the Feature 050 fix pattern for normal tasks.
