# Research: Bulk Eigenschappen Bewerking

**Feature**: 043-op-het-acties | **Date**: 2025-10-30
**Status**: Complete

## Overview
Research voor implementation van bulk eigenschappen bewerking op Acties scherm. Focus op bestaande patterns in Tickedify codebase om consistentie te garanderen.

---

## 1. Existing Modal/Popup Patterns

### Decision: Use Existing Modal Infrastructure
Tickedify heeft bestaande modal classes die we kunnen hergebruiken.

### Research Findings

**Bestaande Modal Classes** (app.js):
1. **InputModal** (line 179): Text input modal met OK/Cancel buttons
   - Display: `modal.style.display = 'flex'`
   - Close on backdrop click
   - Escape key support
   - Promise-based API voor async handling

2. **ConfirmModal** (line 233): Confirm/Cancel dialog
   - Similar pattern als InputModal
   - Boolean return (true/false)

3. **ProjectModal** (line 280): Project selection dropdown modal
   - Dynamische lijst van projecten
   - "Geen project" optie
   - Keyboard navigation (Escape)

**Key Pattern Elements**:
- All modals use: `<div id="modalId" class="modal">...</div>`
- Display control: `style.display = 'flex'` (show) / `'none'` (hide)
- Backdrop click → close modal
- Escape key → close modal
- Centered overlay pattern in CSS

### Rationale
Hergebruik bestaande modal infrastructure voor consistentie. Geen nieuwe modal class nodig - we kunnen een dedicated HTML structure maken met bestaande CSS classes.

### Alternatives Considered
- **New Modal Class**: Overengineering, bestaande patterns zijn voldoende
- **Inline Editing**: Verworpen in spec phase - te rommelig voor 5 properties
- **Side Panel**: Overcomplex voor deze use case

---

## 2. Bulk Actions Pattern Analysis

### Decision: Follow Existing Bulk Action Workflow
Nieuwe feature moet identiek workflow volgen als `bulkDateAction()` en `bulkVerplaatsNaar()`.

### Research Findings

**Existing Bulk Actions** (app.js:12300-12484):

**`bulkDateAction(action)`**:
1. Check selection: `if (this.geselecteerdeTaken.size === 0)` → warning toast
2. Get selected IDs: `Array.from(this.geselecteerdeTaken)`
3. Show progress: `loading.showWithProgress('Datum aanpassen taak', 0, totalTasks)`
4. Loop through tasks with progress updates
5. Update each task via PUT `/api/taak/:id`
6. Success toast: `toast.success(\`${successCount} tasks updated\`)`
7. Cleanup: `this.toggleBulkModus()` + `this.laadHuidigeLijst()`
8. Update counters: `this.debouncedUpdateCounters()`

**`bulkVerplaatsNaar(lijstNaam)`**:
- Identical pattern
- Updates `lijst` property instead of `verschijndatum`

**Key Pattern Elements**:
- No confirmation dialogs (but spec requires one for bulk eigenschappen)
- Progress tracking for large selections
- Toast feedback
- Exit bulk mode after completion
- Preserve scroll position via `preserveActionsFilters()`

### Rationale
Proven pattern for bulk operations. Main difference: we add JavaScript `confirm()` before execution because bulk eigenschappen heeft meer impact (5 properties vs 1).

### Implementation Notes
```javascript
async bulkEditProperties() {
    // Step 1: Validation
    if (this.geselecteerdeTaken.size < 2) {
        toast.warning('Selecteer minimaal 2 taken');
        return;
    }

    // Step 2: Show popup (new)
    const updates = await showBulkEditPopup();
    if (!updates) return; // User cancelled

    // Step 3: Confirm dialog (new - not in existing bulk actions)
    const confirmed = confirm(`${this.geselecteerdeTaken.size} taken aanpassen?`);
    if (!confirmed) return;

    // Step 4-8: Same pattern as existing bulk actions
    // - loading.showWithProgress()
    // - Loop with PUT /api/taak/:id
    // - toast.success()
    // - toggleBulkModus()
    // - laadHuidigeLijst()
}
```

---

## 3. API Endpoint Strategy

### Decision: Use Existing `/api/taak/:id` PUT Endpoint
No new endpoint needed - existing endpoint supports partial updates.

### Research Findings

**Existing API Pattern**:
- Endpoint: `PUT /api/taak/:id`
- Accepts partial update objects
- Example from bulkDateAction: `body: JSON.stringify({ verschijndatum: newDate })`
- Example from bulkVerplaatsNaar: `body: JSON.stringify({ lijst: lijstNaam })`

**Database Columns** (from Technical Context):
- `project_id` (foreign key to projects table)
- `verschijndatum` (date)
- `context` (string)
- `prioriteit` (string: 'laag', 'normaal', 'hoog')
- `estimated_time_minutes` (integer)

### Rationale
Existing endpoint perfect voor bulk eigenschappen. We sturen alleen ingevulde properties mee:
```javascript
const updates = {
    ...(project && { project_id: project }),
    ...(datum && { verschijndatum: datum }),
    ...(context && { context: context }),
    ...(priority && { prioriteit: priority }),
    ...(estimatedTime && { estimated_time_minutes: estimatedTime })
};
```

Backend accepteert dit al - geen wijzigingen nodig.

### Alternatives Considered
- **New Bulk Endpoint**: `POST /api/taak/bulk-update` - overengineering, bestaande pattern werkt
- **GraphQL Mutation**: Project gebruikt REST, geen GraphQL

---

## 4. Form Data Collection Strategy

### Decision: Dynamic Dropdowns + Date Picker + Number Input
Gebruik bestaande data sources voor dropdowns.

### Research Findings

**Existing Data Sources**:
1. **Projects**: Already loaded in app
   - `this.projecten` array in TaskManager
   - Populated via `/api/projecten` endpoint
   - Used in ProjectModal (line 280)

2. **Contexts**: Need to research where contexts are stored
   - Likely database table or enum
   - Need to check existing context dropdown patterns

3. **Priorities**: Hardcoded values
   - "Laag", "Normaal", "Hoog"
   - Used in existing priority UI

4. **Date**: HTML5 date input
   - Format: YYYY-MM-DD (ISO format)
   - Direct browser support

5. **Estimated Time**: Number input
   - Minutes (integer)
   - Min: 0, no max limit

### Popup Form Structure
```html
<div id="bulkEditModal" class="modal">
    <div class="modal-content">
        <h2>Eigenschappen bewerken voor X taken</h2>

        <label>Project:</label>
        <select id="bulkEditProject">
            <option value="">-- Geen wijziging --</option>
            <option value="null">Geen project</option>
            <!-- Dynamisch gevuld -->
        </select>

        <label>Datum:</label>
        <input type="date" id="bulkEditDatum">

        <label>Context:</label>
        <select id="bulkEditContext">
            <option value="">-- Geen wijziging --</option>
            <!-- Dynamisch gevuld -->
        </select>

        <label>Prioriteit:</label>
        <select id="bulkEditPriority">
            <option value="">-- Geen wijziging --</option>
            <option value="laag">Laag</option>
            <option value="normaal">Normaal</option>
            <option value="hoog">Hoog</option>
        </select>

        <label>Geschatte tijd (minuten):</label>
        <input type="number" id="bulkEditTime" min="0">

        <div class="button-group">
            <button onclick="closeBulkEditPopup()">Annuleren</button>
            <button onclick="applyBulkEdit()" class="primary">Opslaan</button>
        </div>
    </div>
</div>
```

### Rationale
- Empty default values = "geen wijziging" (spec requirement UX-004)
- Reuse existing project data source
- Standard HTML inputs for simplicity
- Keyboard nav via native HTML (Tab, Enter, Escape)

---

## 5. Validation Strategy

### Decision: Client-Side + Server-Side Validation
Client validates before API call, server validates before database update.

### Research Findings

**Validation Requirements** (from spec FR-012, FR-013):
1. **At least one field filled**: Client-side before confirm dialog
2. **Project exists**: Server-side (database FK constraint)
3. **Date format**: HTML5 date input enforces YYYY-MM-DD
4. **Context exists**: Server-side validation
5. **Priority valid**: Dropdown constrains to valid options
6. **Estimated time >= 0**: HTML5 input min="0"

**Validation Flow**:
```javascript
function validateBulkEdit() {
    const project = document.getElementById('bulkEditProject').value;
    const datum = document.getElementById('bulkEditDatum').value;
    const context = document.getElementById('bulkEditContext').value;
    const priority = document.getElementById('bulkEditPriority').value;
    const time = document.getElementById('bulkEditTime').value;

    // FR-013: At least one field must be filled
    if (!project && !datum && !context && !priority && !time) {
        toast.warning('Geen eigenschappen geselecteerd');
        return false;
    }

    return true;
}
```

### Rationale
- HTML5 inputs handle basic validation (date format, number min)
- Client-side check prevents unnecessary confirm dialogs
- Server FK constraints catch invalid project/context IDs
- No need for complex validation - simple is sufficient

---

## 6. CSS Styling Strategy

### Decision: Reuse Existing Modal CSS + Minor Extensions
No major CSS changes needed.

### Research Findings

**Existing CSS Classes** (from public/style.css):
- `.modal`: Backdrop overlay styling
- `.modal-content`: Centered white box
- `.button-group`: Button container styling
- `.primary`: Primary button styling (blue)
- Form inputs already styled globally

**Required Additions**:
- Specific ID selector `#bulkEditModal` if needed for unique positioning
- Label styling for form fields (likely already exists)
- Minimal changes expected

### Rationale
Tickedify has comprehensive modal styling. Bulk edit popup follows same visual pattern as recurring/priority popups.

---

## 7. Performance Considerations

### Decision: Progress Indicator for 20+ Tasks
Use existing `loading.showWithProgress()` pattern.

### Research Findings

**Existing Performance Handling**:
- Bulk actions show progress for all selections (no threshold)
- Format: `loading.showWithProgress('Verplaatsen taak', currentTask, totalTasks)`
- Updates on each task: `loading.updateProgress('Verplaatsen taak', currentTask, totalTasks)`

**Performance Requirements** (from spec PR-001, PR-002):
- 100+ tasks: Progress indicator (already handled by existing pattern)
- <500ms per task: Network performance, no special handling needed

**Implementation**:
```javascript
loading.showWithProgress('Eigenschappen aanpassen', 0, totalTasks);

for (const taakId of selectedIds) {
    currentTask++;
    loading.updateProgress('Eigenschappen aanpassen', currentTask, totalTasks);

    await fetch(`/api/taak/${taakId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
}
```

### Rationale
Existing pattern handles performance gracefully. No special optimizations needed - sequential updates work fine voor user-initiated bulk actions.

---

## 8. Error Handling Strategy

### Decision: Graceful Degradation with Partial Success Tracking
Track successes, show errors, don't reload on failure.

### Research Findings

**Existing Error Handling**:
```javascript
let successCount = 0;
for (const taakId of selectedIds) {
    try {
        const response = await fetch(`/api/taak/${taakId}`, {...});
        if (response.ok) {
            successCount++;
        }
    } catch (error) {
        console.error('Fout bij bulk update:', error);
    }
}
toast.success(`${successCount} tasks updated`);
```

**Spec Requirements** (FR-014):
- Network error → toast error message
- Partial success → no reload (preserve state)
- Successful tasks stay updated

**Enhanced Error Handling**:
```javascript
let successCount = 0;
let errorCount = 0;

for (const taakId of selectedIds) {
    try {
        const response = await fetch(`/api/taak/${taakId}`, {...});
        if (response.ok) {
            successCount++;
        } else {
            errorCount++;
            console.error(`Failed to update task ${taakId}: ${response.status}`);
        }
    } catch (error) {
        errorCount++;
        console.error('Network error:', error);
    }
}

if (errorCount > 0) {
    toast.error(`${successCount} taken aangepast, ${errorCount} fouten`);
    // Don't reload - preserve partial state
} else {
    toast.success(`${successCount} taken aangepast`);
    this.toggleBulkModus();
    await this.laadHuidigeLijst();
}
```

### Rationale
Transparent error feedback. User sees what succeeded and what failed. No data loss on partial failures.

---

## 9. Button Placement & Activation

### Decision: Button in Bulk Actions Row, Bottom of Screen
Consistent with existing bulk action buttons.

### Research Findings

**Existing Bulk Actions UI** (from spec analysis):
- Buttons appear onderaan scherm during bulk mode
- Class: `bulk-action-btn`
- Examples: "Today", "Tomorrow", weekday buttons, "Opvolgen", etc.
- Rendered by: `getBulkVerplaatsKnoppen()` method

**Implementation Location**:
Add button to bulk actions row in relevant contexts (likely acties list):
```javascript
getBulkVerplaatsKnoppen() {
    if (this.huidigeLijst === 'acties') {
        return `
            <button onclick="window.bulkDateAction(0)" class="bulk-action-btn">Today</button>
            <!-- existing buttons -->
            <button onclick="window.openBulkEditPopup()" class="bulk-action-btn"
                    ${this.geselecteerdeTaken.size < 2 ? 'disabled' : ''}>
                Eigenschappen Bewerken
            </button>
        `;
    }
    // ...
}
```

**Button State**:
- Enabled: `geselecteerdeTaken.size >= 2`
- Disabled: `geselecteerdeTaken.size < 2` (spec FR-002, UX-009)

### Rationale
Visual consistency with existing UI. Users expect bulk actions in same location.

---

## 10. Context Data Source Investigation

### Decision: Need to identify contexts data source before Phase 1
TODO: Research where contexts are stored (database table vs enum).

### Research Required
- Check database schema for `contexts` table
- Check if context is free-text or predefined list
- Find existing context dropdown implementation

### Temporary Assumption
Contexts likely stored similar to projects - database table with user-defined values.

---

## Summary: Key Decisions

1. ✅ **Modal Pattern**: Reuse existing modal infrastructure, add dedicated HTML for bulk edit popup
2. ✅ **Bulk Action Pattern**: Follow `bulkDateAction()`/`bulkVerplaatsNaar()` workflow, add confirm() dialog
3. ✅ **API**: Use existing `PUT /api/taak/:id` with partial updates
4. ✅ **Form Structure**: 5 fields (Project, Datum, Context, Priority, Estimated Time) with empty defaults
5. ✅ **Validation**: Client-side "at least one field" + HTML5 constraints + server FK validation
6. ✅ **CSS**: Reuse existing modal styles, minimal additions
7. ✅ **Performance**: Use existing `loading.showWithProgress()` pattern
8. ✅ **Error Handling**: Track partial success, graceful degradation
9. ✅ **Button Placement**: Add to bulk actions row with disabled state logic
10. ⚠️ **Context Source**: Need Phase 1 research to identify data source

---

## Next Phase: Design & Contracts

Phase 1 will create:
- `data-model.md`: Entity structure for bulk update command
- `contracts/`: API contract specs (reusing existing endpoint)
- `quickstart.md`: Test scenario for bulk edit workflow
- Update to CLAUDE.md with feature context

All unknowns resolved except context data source (will research in Phase 1).

**Status**: ✅ Phase 0 Complete
