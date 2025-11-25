# Research: Select All in Bulk Edit Mode

**Feature Branch**: `069-op-het-acties`
**Date**: 2025-11-25
**Status**: Complete

---

## Technical Context Findings

### 1. Existing Bulk Edit Infrastructure

**Decision**: Extend existing bulk edit mode implementation
**Rationale**: The codebase already has a mature bulk edit system that handles selection, toolbar visibility, and action execution. Adding Select All integrates naturally.
**Alternatives Considered**: None needed - clear extension of existing pattern

#### Current Implementation Locations:
- **Bulk Mode Toggle**: `toggleBulkModus()` at `app.js:15099`
- **Task Selection**: `toggleTaakSelectie(taakId)` at `app.js:15179`
- **Select All Function** (exists): `selecteerAlleTaken()` at `app.js:15222`
- **Deselect All Function** (exists): `deselecteerAlleTaken()` at `app.js:15244`
- **Bulk Toolbar HTML**: Generated in `showActiesScherm()` at `app.js:5200-5216`
- **Bulk Selection Count**: Element `#bulk-selection-count` at `app.js:5209`
- **Bulk Toolbar Styling**: `style.css:7439-7506`
- **Selection Circle Styling**: `style.css:7402-7430`

#### Key Observations:
1. **Selection Logic Already Exists**: `selecteerAlleTaken()` and `deselecteerAlleTaken()` methods already exist
2. **UI Missing**: No checkbox/button exists in the toolbar to trigger these functions
3. **Filtered Task Handling**: Existing `selecteerAlleTaken()` already skips hidden/filtered tasks (`style.display === 'none'`)
4. **Validation Already Present**: Task ID validation via `validateTaskId()` is already integrated

### 2. Checkbox Rendering Pattern

**Decision**: Use indeterminate state checkbox similar to standard patterns
**Rationale**: HTML5 checkbox supports three visual states (unchecked, checked, indeterminate) via JavaScript property
**Alternatives Considered**: Custom three-state icon component - rejected for simplicity

#### Existing Checkbox Pattern:
```javascript
// Individual task selection circles (app.js:5306)
`<div class="selectie-circle ${this.geselecteerdeTaken.has(taak.id) ? 'geselecteerd' : ''}" onclick="...">`
```

#### Select All Checkbox Approach:
- Use standard `<input type="checkbox">` for native indeterminate support
- Position in bulk-controls-container, visible only when bulk mode is active
- JavaScript controls `checked` and `indeterminate` properties

### 3. Toolbar Layout Analysis

**Decision**: Add checkbox in `bulk-controls-container` next to Bulk Edit button
**Rationale**: User requirement: "ter hoogte van selectieknoppen" - aligned with task selection circles

#### Current Structure (app.js:5200-5204):
```html
<div class="bulk-controls-container">
    <button id="bulk-mode-toggle" class="bulk-mode-toggle" onclick="window.toggleBulkModus()">
        Bulk Edit
    </button>
</div>
```

#### Proposed Structure:
```html
<div class="bulk-controls-container">
    <input type="checkbox" id="bulk-select-all" class="bulk-select-all-checkbox"
           style="display: none;" onclick="window.toggleSelectAll()">
    <button id="bulk-mode-toggle" class="bulk-mode-toggle" onclick="window.toggleBulkModus()">
        Bulk Edit
    </button>
</div>
```

### 4. Indeterminate State Implementation

**Decision**: Use JavaScript `indeterminate` property on checkbox
**Rationale**: Native HTML5 feature, no additional dependencies

#### State Logic:
```javascript
updateSelectAllCheckbox() {
    const checkbox = document.getElementById('bulk-select-all');
    if (!checkbox) return;

    const visibleTasks = document.querySelectorAll('.actie-item[data-id]:not([style*="display: none"])');
    const total = visibleTasks.length;
    const selected = this.geselecteerdeTaken.size;

    if (selected === 0) {
        checkbox.checked = false;
        checkbox.indeterminate = false;
    } else if (selected >= total && total > 0) {
        checkbox.checked = true;
        checkbox.indeterminate = false;
    } else {
        checkbox.checked = false;
        checkbox.indeterminate = true;
    }

    checkbox.disabled = total === 0;
}
```

### 5. Toggle Behavior

**Decision**: Clicking checkbox when partially selected → select all
**Rationale**: Standard UX pattern for tri-state checkboxes

#### Logic Flow:
1. **None selected** → Click → **All selected**
2. **Some selected** → Click → **All selected** (not deselect)
3. **All selected** → Click → **None selected**

### 6. Edge Case: Empty Task List

**Decision**: Disable checkbox when no visible tasks exist
**Rationale**: Prevents confusion when there's nothing to select

### 7. Filter Integration

**Decision**: Only select/deselect visible (filtered) tasks
**Rationale**: Existing `selecteerAlleTaken()` already implements this pattern

#### Existing Filter Check (app.js:15226):
```javascript
// Skip hidden/filtered tasks
if (item.style.display === 'none') return;
```

---

## Technology Constraints

| Aspect | Value |
|--------|-------|
| Language/Version | Vanilla JavaScript (ES6+) |
| Primary Dependencies | None (pure DOM manipulation) |
| Storage | N/A (frontend-only feature) |
| Testing | Manual + Playwright automation |
| Target Platform | Web (desktop + tablet) |
| Performance Goals | <50ms UI update |
| Constraints | No external libraries |

---

## Resolved Questions

| Question | Answer | Source |
|----------|--------|--------|
| Where to add Select All checkbox? | In `.bulk-controls-container` before Bulk Edit button | User requirement analysis |
| How to show partial selection? | `checkbox.indeterminate = true` | HTML5 spec |
| Do selection functions exist? | Yes: `selecteerAlleTaken()`, `deselecteerAlleTaken()` | app.js:15222-15249 |
| How are filters handled? | Check `style.display !== 'none'` | app.js:15226 |
| What triggers toolbar update? | `updateBulkToolbar()` method | app.js:15252 |
| How to handle partial → click? | Select all (standard pattern) | UX research |

---

## Implementation Approach

### JavaScript Changes (app.js)
1. Add checkbox HTML in `showActiesScherm()` HTML template
2. Add `toggleSelectAll()` method combining existing select/deselect
3. Add `updateSelectAllCheckbox()` for tri-state management
4. Modify `updateBulkToolbar()` to call `updateSelectAllCheckbox()`
5. Modify `toggleBulkModus()` to show/hide checkbox
6. Add `window.toggleSelectAll = () => app.toggleSelectAll()` binding

### CSS Changes (style.css)
1. Add `.bulk-select-all-checkbox` styling
2. Match 20px size of `.selectie-circle`
3. Use same blue accent color (#007aff)
4. Handle disabled state styling

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Checkbox state out of sync | Low | Medium | Integrate update into existing `updateBulkToolbar()` |
| Filtered tasks incorrectly selected | Low | High | Existing filter check already in `selecteerAlleTaken()` |
| Performance with many tasks | Very Low | Low | Existing Set-based selection is O(n), acceptable |
| Visual misalignment | Medium | Low | Use precise CSS positioning |

---

## File Modification Summary

| File | Changes Required |
|------|-----------------|
| `public/app.js` | ~30 lines: Add checkbox HTML, toggle visibility, update state logic, add toggleSelectAll() |
| `public/style.css` | ~15 lines: Add checkbox positioning and styling |

## No Changes Required

- **No database changes**: Frontend-only feature
- **No API changes**: Uses existing task selection logic
- **No new dependencies**: Pure DOM/JS implementation
- **No index.html changes**: HTML generated via JavaScript

---

*Research completed: 2025-11-25*
