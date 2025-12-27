# Research: Edit Icons in Daily Planning

**Feature**: 078-in-het-daily
**Date**: 2025-12-27

## Technical Research Summary

### 1. Existing Edit Functionality

**Decision**: Reuse existing `bewerkActie(id)` function
**Rationale**: This function already opens the planning popup and populates all form fields with task data. It handles both in-memory tasks and API fetches for tasks not yet loaded.
**Alternatives considered**:
- Create new `editPlanningTask()` function → Rejected: would duplicate existing logic
- Open popup directly → Rejected: `bewerkActie()` already handles all edge cases

**Location**: `app.js:8458-8657`
```javascript
async bewerkActie(id) {
    let actie = this.taken.find(t => t.id === id);
    if (!actie) {
        const response = await fetch(`/api/taak/${id}`);
        actie = await response.json();
    }
    // Populates form and opens modal
}
```

### 2. Actions Sidebar Structure

**Decision**: Add edit icon container after star icon, before text
**Rationale**: Consistent with existing icon layout pattern (checkbox → star → edit → text)
**Alternatives considered**:
- Add at end of row → Rejected: would be too far from task, inconsistent spacing
- Replace star with combined icon → Rejected: star has different function (priority)

**Location**: `app.js:11217-11268` - `renderActiesVoorPlanning()`

**Current structure**:
```
.actie-checkbox → .actie-star → .actie-tekst → .actie-meta
```

**New structure**:
```
.actie-checkbox → .actie-star → .actie-edit → .actie-tekst → .actie-meta
```

### 3. Calendar View Structure

**Decision**: Add edit button before delete button in header
**Rationale**: Action buttons grouped together on right side of header
**Alternatives considered**:
- Add after delete → Rejected: delete should be last (destructive action)
- Add in expanded section → Rejected: user requested direct access without extra click

**Location**: `app.js:11296-11445` - `renderPlanningItem()`

**Current header structure**:
```
expand-chevron → checkbox → icon → priority → naam → delete-planning
```

**New header structure**:
```
expand-chevron → checkbox → icon → priority → naam → edit-planning → delete-planning
```

### 4. CSS Pattern Analysis

**Decision**: Follow existing button patterns for consistency
**Rationale**: Matches visual design language of star icon and delete button

**Star icon pattern** (style.css:4712-4747):
- Transparent background
- Opacity 0.5 → 1 on hover
- Scale transform on hover
- 20px font size

**Delete button pattern** (style.css:4148-4169):
- Transparent background
- 24x24px dimensions
- Color change on hover (text-secondary → red)
- Scale 1.1 on hover

**Edit icon styling**: Hybrid of both patterns
- Use star's opacity behavior
- Use delete's sizing and layout
- Change color to blue on hover (not red - edit is not destructive)

### 5. Event Handling

**Decision**: Use onclick with event.stopPropagation() where needed
**Rationale**: Prevents triggering parent element handlers (drag, expand)

**Actions sidebar**:
- Parent is draggable, but onclick doesn't trigger drag
- No stopPropagation needed

**Calendar view**:
- Parent header has expand toggle
- Need `event.stopPropagation()` to prevent expand on edit click

### 6. Mobile/Touch Considerations

**Decision**: Same icon size as delete button (24x24px minimum touch target)
**Rationale**: Apple Human Interface Guidelines recommend 44x44pt touch targets, 24px is acceptable for grouped actions
**Alternatives considered**:
- Larger touch targets → Rejected: would take too much horizontal space

---

## Research Conclusion

All technical aspects resolved. Implementation is straightforward:
- Reuse existing `bewerkActie()` function
- Add HTML in two render functions
- Add CSS following existing patterns
- No API or database changes needed
