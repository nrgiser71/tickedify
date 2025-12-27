# Data Model: Edit Icons in Daily Planning

**Feature**: 078-in-het-daily
**Date**: 2025-12-27

## No New Entities

This feature does not introduce any new data entities. It reuses existing structures:

### Existing Entities Used

**Task (taken)**
- Already exists in database
- Properties: id, tekst, projectId, context, prioriteit, duur, opmerkingen, etc.
- Used by: `bewerkActie(id)` function

**Planning Item (dagelijkse_planning)**
- Already exists in database
- Properties: id, taak_id, datum, uur, duur_minuten
- Used by: `renderPlanningItem()` function

### Relationships

```
Task (1) ←→ (0..n) Planning Item
```

A task can be scheduled multiple times in the calendar (though typically once per day).

## No Schema Changes

No database migrations or schema changes required for this feature.

## UI Component Model

The only new "entities" are UI components:

**Edit Icon (Sidebar)**
- Container class: `.actie-edit`
- Button class: `.edit-button`
- Triggers: `bewerkActie(taskId)`

**Edit Icon (Calendar)**
- Button class: `.edit-planning`
- Triggers: `bewerkActie(planningItem.actieId)`
