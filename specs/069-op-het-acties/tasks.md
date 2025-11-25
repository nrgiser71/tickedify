# Tasks: Select All in Bulk Edit Mode

**Feature Branch**: `069-op-het-acties`
**Date**: 2025-11-25
**Input**: Design documents from `/specs/069-op-het-acties/`
**Prerequisites**: plan.md , research.md , data-model.md , quickstart.md 

## Summary

Frontend-only feature: Add a "Select All" checkbox to the Acties screen bulk edit toolbar with tri-state support (unchecked, checked, indeterminate).

## Path Conventions

This feature modifies existing files in the Tickedify codebase:
- **JavaScript**: `public/app.js`
- **CSS**: `public/style.css`

No new files required. No database or API changes.

---

## Phase 3.1: Setup

- [x] **T001** Read existing bulk edit implementation to understand current patterns
  - File: `public/app.js:15099-15271` (bulk mode functions)
  - File: `public/app.js:5200-5216` (bulk toolbar HTML template)
  - File: `public/style.css:7402-7506` (bulk toolbar styling)
  - Output: Understanding of current implementation for proper integration

---

## Phase 3.2: Core Implementation

### HTML Template Change
- [x] **T002** Add Select All checkbox HTML to `showActiesScherm()` template
  - File: `public/app.js` at line ~5200
  - Locate the `bulk-controls-container` div
  - Add checkbox element before the Bulk Edit button:
    ```html
    <input type="checkbox" id="bulk-select-all" class="bulk-select-all-checkbox"
           style="display: none;" onclick="window.toggleSelectAll()">
    ```
  - Checkbox starts hidden (display: none), becomes visible when bulk mode activates

### JavaScript Methods
- [x] **T003** Add `toggleSelectAll()` method to TaskManager class
  - File: `public/app.js` (add after `deselecteerAlleTaken()` at ~line 15249)
  - Method should:
    1. Count visible tasks: `document.querySelectorAll('.actie-item[data-id]:not([style*="display: none"])').length`
    2. Compare with `this.geselecteerdeTaken.size`
    3. If all selected � call `this.deselecteerAlleTaken()`
    4. Else � call `this.selecteerAlleTaken()`
  - Implementation:
    ```javascript
    toggleSelectAll() {
        const visibleTasks = document.querySelectorAll('.actie-item[data-id]');
        let visibleCount = 0;
        visibleTasks.forEach(item => {
            if (item.style.display !== 'none') visibleCount++;
        });

        if (this.geselecteerdeTaken.size >= visibleCount && visibleCount > 0) {
            this.deselecteerAlleTaken();
        } else {
            this.selecteerAlleTaken();
        }
    }
    ```

- [x] **T004** Add `updateSelectAllCheckbox()` method to TaskManager class
  - File: `public/app.js` (add after `toggleSelectAll()`)
  - Method manages tri-state checkbox:
    ```javascript
    updateSelectAllCheckbox() {
        const checkbox = document.getElementById('bulk-select-all');
        if (!checkbox) return;

        const visibleTasks = document.querySelectorAll('.actie-item[data-id]');
        let visibleCount = 0;
        visibleTasks.forEach(item => {
            if (item.style.display !== 'none') visibleCount++;
        });

        const selectedCount = this.geselecteerdeTaken.size;

        if (visibleCount === 0) {
            checkbox.checked = false;
            checkbox.indeterminate = false;
            checkbox.disabled = true;
        } else if (selectedCount === 0) {
            checkbox.checked = false;
            checkbox.indeterminate = false;
            checkbox.disabled = false;
        } else if (selectedCount >= visibleCount) {
            checkbox.checked = true;
            checkbox.indeterminate = false;
            checkbox.disabled = false;
        } else {
            checkbox.checked = false;
            checkbox.indeterminate = true;
            checkbox.disabled = false;
        }
    }
    ```

- [x] **T005** Add window binding for `toggleSelectAll`
  - File: `public/app.js` (in the window bindings section, search for `window.toggleBulkModus`)
  - Add: `window.toggleSelectAll = () => app.toggleSelectAll();`

### Integration with Existing Code
- [x] **T006** Modify `updateBulkToolbar()` to call `updateSelectAllCheckbox()`
  - File: `public/app.js` at line ~15252
  - Add at the end of the method: `this.updateSelectAllCheckbox();`

- [x] **T007** Modify `toggleBulkModus()` to show/hide Select All checkbox
  - File: `public/app.js` at line ~15099
  - Add checkbox visibility toggle inside the method:
    ```javascript
    const selectAllCheckbox = document.getElementById('bulk-select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.style.display = this.bulkModus ? 'inline-block' : 'none';
    }
    ```
  - Add after the existing `if (this.bulkModus)` block

---

## Phase 3.3: CSS Styling

- [x] **T008** [P] Add CSS styling for `.bulk-select-all-checkbox`
  - File: `public/style.css` (add after `.bulk-mode-toggle` styling, around line ~7380)
  - Styling should:
    - Match 20px size of existing `.selectie-circle` elements
    - Use same blue accent color (#007aff)
    - Handle disabled state (grayed out)
    - Align vertically with other controls
  - CSS:
    ```css
    /* Select All checkbox in bulk mode */
    .bulk-select-all-checkbox {
        width: 20px;
        height: 20px;
        accent-color: #007aff;
        cursor: pointer;
        margin-right: 12px;
        vertical-align: middle;
    }

    .bulk-select-all-checkbox:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    ```

---

## Phase 3.4: Testing & Validation

- [ ] **T009** Manual testing: Basic visibility toggle (Scenario 1, 7)
  - Deploy to staging
  - Navigate to dev.tickedify.com/app � Acties
  - Verify: Click Bulk Edit � checkbox appears
  - Verify: Click Bulk Edit again � checkbox disappears
  - Verify: Checkbox position is left of Bulk Edit button

- [ ] **T010** Manual testing: Select All / Deselect All (Scenario 2, 3)
  - Activate bulk mode with tasks visible
  - Click checkbox � all tasks selected, checkbox checked
  - Click checkbox again � all tasks deselected, checkbox unchecked
  - Verify selection count updates correctly

- [ ] **T011** Manual testing: Indeterminate state (Scenario 4, 5)
  - Activate bulk mode
  - Click one individual task
  - Verify checkbox shows indeterminate state (horizontal line)
  - Click checkbox � all tasks selected
  - Verify checkbox now shows checked state

- [ ] **T012** Manual testing: Filter integration (Scenario 6)
  - Activate bulk mode
  - Apply project filter to show subset of tasks
  - Click Select All checkbox
  - Verify only visible (filtered) tasks are selected
  - Verify hidden tasks remain unselected

- [ ] **T013** Manual testing: Edge cases (Scenario 8, 9)
  - Filter to show no tasks � checkbox should be disabled
  - Test keyboard: Tab to checkbox, press Space � should toggle
  - Verify no console errors in browser DevTools

---

## Phase 3.5: Deployment & Polish

- [x] **T014** Bump version in package.json
  - File: `package.json`
  - Increment patch version (e.g., 1.0.137 � 1.0.138)

- [x] **T015** Update changelog
  - File: `public/changelog.html`
  - Add entry for "Select All" feature in bulk edit mode
  - Use category: ( Features
  - English only per project conventions

- [x] **T016** Deploy to staging and verify
  - Merge feature branch to staging
  - Push to staging branch
  - Wait for Vercel deployment (~30 seconds)
  - Verify version at dev.tickedify.com/api/version
  - Run through quickstart.md scenarios on staging

- [ ] **T017** Update ARCHITECTURE.md with new function locations
  - File: `ARCHITECTURE.md`
  - Add entries for:
    - `toggleSelectAll()` method location
    - `updateSelectAllCheckbox()` method location
    - New CSS classes

---

## Dependencies

```
T001 � T002 (understand before modify)
T002 � T003 � T004 � T005 (sequential JS additions)
T006, T007 can run after T004 (integrate with existing code)
T008 is independent [P] (CSS file, different from JS tasks)
T009-T013 require T001-T008 complete (testing phase)
T014-T017 require testing passed (deployment phase)
```

## Parallel Execution Example

After completing T001-T007, these can run in parallel:
```
# CSS styling (different file)
Task: "T008 Add CSS styling for .bulk-select-all-checkbox in public/style.css"

# OR sequentially if preferred for single-developer workflow
```

Testing scenarios (T009-T013) should run sequentially as they depend on each other.

---

## Validation Checklist

- [x] All quickstart scenarios have corresponding test tasks (T009-T013)
- [x] No parallel tasks modify the same file
- [x] Each task specifies exact file path
- [x] Tasks ordered by dependencies
- [x] Version bump and changelog included
- [x] Architecture documentation update included
- [x] Staging deployment verification included

---

*Generated: 2025-11-25 | Based on plan.md, research.md, data-model.md, quickstart.md*
