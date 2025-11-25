# Data Model: Select All in Bulk Edit Mode

**Feature**: 069-op-het-acties
**Date**: 2025-11-25

## Overview

This feature is a **frontend-only UI enhancement**. No database changes are required.

## Existing Data Structures (No Changes)

### Task Selection State
**Location**: `App` class instance properties in `app.js`

| Property | Type | Description |
|----------|------|-------------|
| `bulkModus` | `boolean` | Whether bulk edit mode is active |
| `geselecteerdeTaken` | `Set<string>` | Set of selected task IDs |

### Task DOM Structure
```html
<li class="actie-item" data-id="{taskId}">
    <div class="drag-handle"></div>
    <div class="taak-checkbox">
        <!-- In bulk mode: -->
        <div class="selectie-circle [geselecteerd]"></div>
    </div>
    <div class="taak-content">...</div>
    <div class="taak-acties">...</div>
</li>
```

## New UI Elements

### Select All Checkbox
**Element**: `<input type="checkbox" id="bulk-select-all">`
**Container**: `.bulk-controls-container` (header bar)

**States**:
| State | Visual | Condition |
|-------|--------|-----------|
| Unchecked | ☐ | `geselecteerdeTaken.size === 0` |
| Checked | ☑ | `geselecteerdeTaken.size === visibleTaskCount` |
| Indeterminate | ☒ | `0 < geselecteerdeTaken.size < visibleTaskCount` |

**Visibility**: Hidden when `bulkModus === false`, visible when `bulkModus === true`

## State Transitions

```
[Bulk mode inactive]
    │
    ▼ toggleBulkModus()
[Bulk mode active, no selection]
    │ Checkbox: unchecked, visible
    │
    ├──▶ Click checkbox ──▶ selecteerAlleTaken()
    │                           │
    │                           ▼
    │                    [All tasks selected]
    │                    Checkbox: checked
    │                           │
    │                    ├──▶ Click checkbox ──▶ deselecteerAlleTaken()
    │                    │                           │
    │                    │                           ▼
    │                    │                    [No tasks selected]
    │                    │                    Checkbox: unchecked
    │                    │
    │                    └──▶ Click individual task ──▶ toggleTaakSelectie()
    │                                                       │
    │                                                       ▼
    │                                                [Partial selection]
    │                                                Checkbox: indeterminate
    │
    └──▶ Click individual task ──▶ toggleTaakSelectie()
                                        │
                                        ▼
                                 [Partial selection]
                                 Checkbox: indeterminate
```

## Computed Values

### Visible Task Count
```javascript
function getVisibleTaskCount() {
    return document.querySelectorAll(
        '.actie-item[data-id]:not([style*="display: none"])'
    ).length;
}
```

### Checkbox State Calculation
```javascript
function calculateCheckboxState(selectedCount, visibleCount) {
    if (visibleCount === 0) {
        return { checked: false, indeterminate: false, disabled: true };
    }
    if (selectedCount === 0) {
        return { checked: false, indeterminate: false, disabled: false };
    }
    if (selectedCount === visibleCount) {
        return { checked: true, indeterminate: false, disabled: false };
    }
    return { checked: false, indeterminate: true, disabled: false };
}
```

## No Database Impact

This feature does not:
- Add new tables
- Modify existing tables
- Add new columns
- Change relationships
- Require migrations
