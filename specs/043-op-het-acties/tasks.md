# Tasks: Bulk Eigenschappen Bewerking

**Feature**: 043-op-het-acties | **Branch**: `043-op-het-acties`
**Input**: Design documents from `/specs/043-op-het-acties/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Summary
- **Tech Stack**: JavaScript ES6+ (vanilla), Node.js + Express, PostgreSQL (Neon)
- **Structure**: Integrated web app (public/, server.js, single codebase)
- **Deployment**: Vercel staging (dev.tickedify.com)
- **Testing**: Playwright via tickedify-testing agent
- **Key Decision**: No backend/database changes - frontend only

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **File paths**: All paths relative to repository root

---

## Phase 3.1: Setup & Preparation

### T001: Version Bump & Branch Verification
**File**: `package.json`
```
- Increment version number (current + 0.0.1 patch)
- Verify on correct branch: 043-op-het-acties
- Verify staging deployment target configured
```
**Dependencies**: None
**Estimated Time**: 2 min

---

## Phase 3.2: HTML Structure (Frontend Foundation)

### T002: Create Bulk Edit Modal HTML
**File**: `public/index.html`
```html
Add modal structure before closing </body> tag:

<div id="bulkEditModal" class="modal">
    <div class="modal-content">
        <h2 id="bulkEditHeader">Eigenschappen bewerken voor X taken</h2>

        <div class="form-group">
            <label for="bulkEditProject">Project:</label>
            <select id="bulkEditProject">
                <option value="">-- Geen wijziging --</option>
                <option value="null">Geen project</option>
                <!-- Dynamically populated -->
            </select>
        </div>

        <div class="form-group">
            <label for="bulkEditDatum">Datum:</label>
            <input type="date" id="bulkEditDatum">
        </div>

        <div class="form-group">
            <label for="bulkEditContext">Context:</label>
            <select id="bulkEditContext">
                <option value="">-- Geen wijziging --</option>
                <option value="null">Geen context</option>
                <!-- Dynamically populated -->
            </select>
        </div>

        <div class="form-group">
            <label for="bulkEditPriority">Prioriteit:</label>
            <select id="bulkEditPriority">
                <option value="">-- Geen wijziging --</option>
                <option value="laag">Laag</option>
                <option value="normaal">Normaal</option>
                <option value="hoog">Hoog</option>
            </select>
        </div>

        <div class="form-group">
            <label for="bulkEditTime">Geschatte tijd (minuten):</label>
            <input type="number" id="bulkEditTime" min="0" placeholder="Optioneel">
        </div>

        <div class="button-group">
            <button onclick="window.bulkEditCancel()" class="secondary">Annuleren</button>
            <button onclick="window.bulkEditSave()" class="primary">Opslaan</button>
        </div>
    </div>
</div>
```
**Dependencies**: T001
**Estimated Time**: 10 min
**Verification**: Modal HTML structure exists in index.html

---

## Phase 3.3: CSS Styling (Visual Consistency)

### T003: Add Bulk Edit Modal Styling
**File**: `public/style.css`
```css
Add styling for bulk edit modal (consistent with existing modals):

#bulkEditModal .modal-content {
    max-width: 500px;
    width: 90%;
}

#bulkEditModal .form-group {
    margin-bottom: 1rem;
}

#bulkEditModal .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
}

#bulkEditModal .form-group select,
#bulkEditModal .form-group input[type="date"],
#bulkEditModal .form-group input[type="number"] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

#bulkEditModal .button-group {
    display: flex;
    justify-content: space-between;
    margin-top: 1.5rem;
    gap: 1rem;
}

#bulkEditModal button {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
}

#bulkEditModal button.secondary {
    background-color: #f0f0f0;
    color: #333;
}

#bulkEditModal button.primary {
    background-color: #007bff;
    color: white;
}

#bulkEditModal button.primary:hover {
    background-color: #0056b3;
}

#bulkEditModal button.secondary:hover {
    background-color: #e0e0e0;
}
```
**Dependencies**: T002
**Estimated Time**: 10 min
**Verification**: Modal styling matches existing Tickedify popups

---

## Phase 3.4: JavaScript Helpers (Data & UI Management)

### T004: [P] Implement populateBulkEditDropdowns()
**File**: `public/app.js`
```javascript
Add global function after existing modal classes (~line 350):

function populateBulkEditDropdowns() {
    const taskManager = window.taskManager;

    // Populate project dropdown
    const projectSelect = document.getElementById('bulkEditProject');
    projectSelect.innerHTML = '<option value="">-- Geen wijziging --</option>' +
                              '<option value="null">Geen project</option>';

    // Sort projects alfabetisch (consistent met bestaande pattern)
    const gesorteerdeProjecten = [...taskManager.projecten].sort((a, b) =>
        a.naam.toLowerCase().localeCompare(b.naam.toLowerCase(), 'nl')
    );

    gesorteerdeProjecten.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.naam;
        projectSelect.appendChild(option);
    });

    // Populate context dropdown
    const contextSelect = document.getElementById('bulkEditContext');
    contextSelect.innerHTML = '<option value="">-- Geen wijziging --</option>' +
                              '<option value="null">Geen context</option>';

    // Sort contexts alfabetisch (consistent met existing vulContextSelect pattern)
    const gesorteerdeContexten = [...taskManager.contexten].sort((a, b) =>
        a.naam.toLowerCase().localeCompare(b.naam.toLowerCase(), 'nl')
    );

    gesorteerdeContexten.forEach(context => {
        const option = document.createElement('option');
        option.value = context.id;
        option.textContent = context.naam;
        contextSelect.appendChild(option);
    });
}
```
**Dependencies**: T002 (HTML structure)
**Estimated Time**: 15 min
**Verification**: Function populates dropdowns with sorted data
**Parallel**: Can run parallel with T005, T006

---

### T005: [P] Implement collectBulkEditUpdates()
**File**: `public/app.js`
```javascript
Add global function after populateBulkEditDropdowns():

function collectBulkEditUpdates() {
    const updates = {};

    // Project (optional)
    const project = document.getElementById('bulkEditProject').value;
    if (project) {
        updates.project_id = project === 'null' ? null : parseInt(project);
    }

    // Datum (optional)
    const datum = document.getElementById('bulkEditDatum').value;
    if (datum) {
        updates.verschijndatum = datum;
    }

    // Context (optional)
    const context = document.getElementById('bulkEditContext').value;
    if (context) {
        updates.context = context === 'null' ? null : context;
    }

    // Priority (optional)
    const priority = document.getElementById('bulkEditPriority').value;
    if (priority) {
        updates.prioriteit = priority;
    }

    // Estimated time (optional)
    const time = document.getElementById('bulkEditTime').value;
    if (time) {
        updates.estimated_time_minutes = parseInt(time);
    }

    return updates;
}
```
**Dependencies**: T002 (HTML structure)
**Estimated Time**: 10 min
**Verification**: Function collects form data into updates object
**Parallel**: Can run parallel with T004, T006

---

### T006: [P] Implement showBulkEditPopup()
**File**: `public/app.js`
```javascript
Add global function after collectBulkEditUpdates():

function showBulkEditPopup() {
    return new Promise((resolve) => {
        const modal = document.getElementById('bulkEditModal');
        const taskCount = window.taskManager.geselecteerdeTaken.size;

        // Update header with task count
        document.getElementById('bulkEditHeader').textContent =
            `Eigenschappen bewerken voor ${taskCount} taken`;

        // Reset all form fields to empty (spec UX-004: no placeholders)
        document.getElementById('bulkEditProject').value = '';
        document.getElementById('bulkEditDatum').value = '';
        document.getElementById('bulkEditContext').value = '';
        document.getElementById('bulkEditPriority').value = '';
        document.getElementById('bulkEditTime').value = '';

        // Populate dropdowns with current data
        populateBulkEditDropdowns();

        // Show modal
        modal.style.display = 'flex';

        // Save button handler
        window.bulkEditSave = () => {
            const updates = collectBulkEditUpdates();

            // Validation: at least one field filled (FR-013)
            if (Object.keys(updates).length === 0) {
                toast.warning('Geen eigenschappen geselecteerd');
                return; // Keep popup open
            }

            modal.style.display = 'none';
            resolve(updates);
        };

        // Cancel button handler
        window.bulkEditCancel = () => {
            modal.style.display = 'none';
            resolve(null);
        };

        // Backdrop click handler (consistent with existing modals)
        const backdropHandler = (e) => {
            if (e.target === modal) {
                window.bulkEditCancel();
                modal.removeEventListener('click', backdropHandler);
            }
        };
        modal.addEventListener('click', backdropHandler);

        // Escape key handler (spec UX-007)
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                window.bulkEditCancel();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}
```
**Dependencies**: T002 (HTML), T004 (populate), T005 (collect)
**Estimated Time**: 20 min
**Verification**: Popup opens, validates, returns data or null
**Parallel**: Can run parallel with T004, T005

---

## Phase 3.5: Core Bulk Edit Logic

### T007: Implement bulkEditProperties() in TaskManager
**File**: `public/app.js`
**Location**: Inside TaskManager class, after bulkVerplaatsNaar() method (~line 12500)
```javascript
async bulkEditProperties(updates) {
    // Pre-condition: minimum 2 tasks (FR-002)
    if (this.geselecteerdeTaken.size < 2) {
        toast.warning('Selecteer minimaal 2 taken');
        return;
    }

    // Confirmation dialog (FR-007, FR-008)
    const taskCount = this.geselecteerdeTaken.size;
    const propertiesCount = Object.keys(updates).length;
    const confirmed = confirm(`${taskCount} taken aanpassen met ${propertiesCount} eigenschap${propertiesCount > 1 ? 'pen' : ''}?`);
    if (!confirmed) return;

    const selectedIds = Array.from(this.geselecteerdeTaken);
    const totalTasks = selectedIds.length;

    // Progress tracking (consistent with existing bulk actions)
    loading.showWithProgress('Eigenschappen aanpassen', 0, totalTasks);

    try {
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        let currentTask = 0;

        // Sequential updates (research decision: simpler error handling)
        for (const taakId of selectedIds) {
            currentTask++;
            loading.updateProgress('Eigenschappen aanpassen', currentTask, totalTasks);

            try {
                const response = await fetch(`/api/taak/${taakId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                    const errorText = await response.text();
                    errors.push({ taskId: taakId, error: errorText });
                    console.error(`Failed to update task ${taakId}:`, errorText);
                }
            } catch (error) {
                errorCount++;
                errors.push({ taskId: taakId, error: error.message });
                console.error('Network error during bulk edit:', error);
            }
        }

        loading.show('Finishing...');

        // Result feedback (FR-009, FR-014)
        if (errorCount > 0) {
            // Partial or complete failure
            toast.error(`${successCount} taken aangepast, ${errorCount} fouten`);
            // Don't reload - preserve partial state (FR-014)
        } else {
            // Complete success
            toast.success(`${successCount} taken aangepast`);

            // Reset bulk mode and reload (FR-010, FR-011)
            this.toggleBulkModus();
            await this.preserveActionsFilters(() => this.laadHuidigeLijst());
        }

        // Update sidebar counters (consistent with existing bulk actions)
        this.debouncedUpdateCounters();

        return { successCount, errorCount, totalCount: totalTasks, errors };

    } finally {
        loading.hide();
    }
}
```
**Dependencies**: T006 (needs popup function to exist first conceptually)
**Estimated Time**: 30 min
**Verification**:
- Validates minimum 2 tasks
- Shows confirm dialog
- Executes sequential updates with progress
- Handles partial failures gracefully
- Shows appropriate toast feedback

---

## Phase 3.6: UI Integration

### T008: Add Bulk Edit Button to Bulk Actions Row
**File**: `public/app.js`
**Location**: Inside TaskManager class, getBulkVerplaatsKnoppen() method (~line 12362)
```javascript
Modify getBulkVerplaatsKnoppen() to add button:

getBulkVerplaatsKnoppen() {
    // Use the same logic as individual task dropdown menus
    if (this.huidigeLijst === 'acties') {
        // For actions list: show dagens datum opties + weekdagen + uitgesteld opties
        const weekdagenHTML = this.getWeekdagKnoppen(0, (i) =>
            `onclick="window.bulkDateAction(${i})"`, 'bulk-action-btn'
        );

        return `
            <button onclick="window.bulkDateAction(0)" class="bulk-action-btn">Today</button>
            <button onclick="window.bulkDateAction(1)" class="bulk-action-btn">Tomorrow</button>
            ${weekdagenHTML}
            <button onclick="window.bulkVerplaatsNaar('opvolgen')" class="bulk-action-btn">Opvolgen</button>
            <button onclick="window.bulkVerplaatsNaar('uitgesteld-wekelijks')" class="bulk-action-btn">Weekly</button>
            <button onclick="window.bulkVerplaatsNaar('uitgesteld-maandelijks')" class="bulk-action-btn">Monthly</button>
            <button onclick="window.bulkVerplaatsNaar('uitgesteld-3maandelijks')" class="bulk-action-btn">Quarterly</button>
            <button onclick="window.bulkVerplaatsNaar('uitgesteld-6maandelijks')" class="bulk-action-btn">Semi-annually</button>
            <button onclick="window.bulkVerplaatsNaar('uitgesteld-jaarlijks')" class="bulk-action-btn">Yearly</button>
            <button onclick="window.openBulkEditPopup()"
                    class="bulk-action-btn"
                    ${this.geselecteerdeTaken.size < 2 ? 'disabled' : ''}>
                Eigenschappen Bewerken
            </button>
        `;
    } else if (this.isUitgesteldLijst(this.huidigeLijst)) {
        // ... existing code ...
    } else {
        // ... existing code ...
    }
}
```
**Dependencies**: T007 (bulk edit function must exist)
**Estimated Time**: 10 min
**Verification**: Button appears in bulk mode, disabled when <2 tasks selected

---

### T009: Implement openBulkEditPopup() Global Function
**File**: `public/app.js`
**Location**: Global scope, after showBulkEditPopup() (~line 400)
```javascript
window.openBulkEditPopup = async function() {
    const taskManager = window.taskManager;

    // Pre-check (defensive, button should already be disabled)
    if (taskManager.geselecteerdeTaken.size < 2) {
        toast.warning('Selecteer minimaal 2 taken voor bulk bewerking');
        return;
    }

    // Show popup and collect updates
    const updates = await showBulkEditPopup();

    // User cancelled
    if (!updates) {
        return;
    }

    // Execute bulk edit
    await taskManager.bulkEditProperties(updates);
};
```
**Dependencies**: T007 (calls bulkEditProperties), T006 (calls showBulkEditPopup)
**Estimated Time**: 5 min
**Verification**: Global function orchestrates popup → bulk edit workflow

---

## Phase 3.7: Testing & Validation

### T010: [P] Run Quickstart Test Scenario 1 (Happy Path)
**Agent**: tickedify-testing
**File**: Test scenarios from `specs/043-op-het-acties/quickstart.md`
```
Execute Quickstart Test Scenario 1: Basic Bulk Edit (Happy Path)
- Navigate to dev.tickedify.com/app
- Activate bulk mode
- Select 3 tasks
- Open bulk edit popup
- Fill Context="Kantoor", Priority="Hoog"
- Save and confirm
- Verify: Toast success "3 taken aangepast"
- Verify: Bulk mode exited, list reloaded
- Verify: Tasks have correct properties
```
**Dependencies**: T001-T009 (all implementation complete)
**Estimated Time**: 15 min
**Verification**: Playwright test passes, manual verification successful
**Parallel**: Can run parallel with T011, T012

---

### T011: [P] Run Quickstart Test Scenario 3 (Minimum Selection)
**Agent**: tickedify-testing
```
Execute Quickstart Test Scenario 3: Minimum Selection Validation
- Activate bulk mode, select 1 task
- Verify: "Eigenschappen Bewerken" button is disabled
- Attempt to click (if possible)
- Verify: Warning toast or button truly disabled
```
**Dependencies**: T001-T009
**Estimated Time**: 10 min
**Parallel**: Can run parallel with T010, T012

---

### T012: [P] Run Quickstart Test Scenario 4 (Empty Form)
**Agent**: tickedify-testing
```
Execute Quickstart Test Scenario 4: Empty Form Validation
- Select 3 tasks, open popup
- Leave all fields empty
- Click "Opslaan"
- Verify: Warning toast "Geen eigenschappen geselecteerd"
- Verify: Popup stays open (not closed)
- Fill 1 field, save
- Verify: Update succeeds
```
**Dependencies**: T001-T009
**Estimated Time**: 10 min
**Parallel**: Can run parallel with T010, T011

---

### T013: [P] Run Quickstart Test Scenario 5 (Cancel Workflow)
**Agent**: tickedify-testing
```
Execute Quickstart Test Scenario 5: Cancel Workflow
- Test Escape key cancel
- Test Cancel button
- Test Confirm dialog cancel
- Verify: No changes applied in all cases
- Verify: Selection remains intact
```
**Dependencies**: T001-T009
**Estimated Time**: 15 min
**Parallel**: Can run parallel with T014

---

### T014: [P] Run Quickstart Test Scenario 8 (Keyboard Navigation)
**Agent**: tickedify-testing
```
Execute Quickstart Test Scenario 8: Keyboard Navigation
- Tab through all form fields
- Verify: Logical tab order
- Test Enter on "Opslaan" button
- Test Escape to close
```
**Dependencies**: T001-T009
**Estimated Time**: 10 min
**Parallel**: Can run parallel with T013

---

## Phase 3.8: Documentation & Polish

### T015: [P] Update ARCHITECTURE.md
**File**: `ARCHITECTURE.md`
```
Add function documentation for new bulk edit functions:

## Bulk Eigenschappen Bewerking (Feature 043)

### Global Functions
- `populateBulkEditDropdowns()` - public/app.js:~350 - Populates project/context dropdowns
- `collectBulkEditUpdates()` - public/app.js:~380 - Collects form data into updates object
- `showBulkEditPopup()` - public/app.js:~400 - Shows modal and returns Promise with updates
- `window.openBulkEditPopup()` - public/app.js:~440 - Entry point from bulk actions button

### TaskManager Methods
- `bulkEditProperties(updates)` - public/app.js:~12500 - Executes bulk property updates via API
- `getBulkVerplaatsKnoppen()` - public/app.js:~12362 - Modified to include bulk edit button

### HTML Elements
- `#bulkEditModal` - public/index.html - Modal popup structure
- Form fields: bulkEditProject, bulkEditDatum, bulkEditContext, bulkEditPriority, bulkEditTime

### CSS Classes
- `.bulk-action-btn` - Bulk mode action button styling
- `#bulkEditModal .form-group` - Form field container styling

### API Usage
- PUT /api/taak/:id - Existing endpoint, accepts partial updates
- Updates fields: project_id, verschijndatum, context, prioriteit, estimated_time_minutes
```
**Dependencies**: T001-T009 (know exact line numbers)
**Estimated Time**: 15 min
**Parallel**: Can run parallel with T016

---

### T016: [P] Update Changelog
**File**: `public/changelog.html`
```html
Add new entry at top:

<div class="changelog-entry badge-feature">
    <div class="version">v[CURRENT_VERSION]</div>
    <div class="date">[TODAY'S DATE]</div>
    <div class="changes">
        <h3>⚡ Nieuwe Functionaliteit</h3>
        <ul>
            <li><strong>Bulk Eigenschappen Bewerking</strong>: Pas nu meerdere eigenschappen tegelijk aan voor geselecteerde taken in bulk mode. Ondersteunt Project, Datum, Context, Prioriteit en Geschatte tijd.</li>
        </ul>
        <p class="feature-highlight">
            🎯 <strong>Verbeterde Productiviteit</strong>: Bespaar tijd door eigenschappen voor meerdere taken in één keer in te stellen via een intuïtieve popup interface.
        </p>
    </div>
</div>
```
**Dependencies**: T001 (version number)
**Estimated Time**: 10 min
**Parallel**: Can run parallel with T015

---

## Phase 3.9: Deployment Preparation

### T017: Commit and Push to Staging Branch
**Commands**:
```bash
git add .
git commit -m "✨ FEATURE: Bulk eigenschappen bewerking voor Acties scherm

Implementeert bulk edit functionaliteit voor meerdere taken tegelijk:
- Modal popup voor eigenschappen bewerking (Project, Datum, Context, Priority, Estimated time)
- Minimum 2 taken vereist, confirm dialog voor bevestiging
- Graceful error handling met partial success tracking
- Consistent met bestaande bulk actions patterns

Spec: specs/043-op-het-acties/
Testing: Quickstart scenarios gevalideerd via Playwright
Version: [NEW_VERSION]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin 043-op-het-acties
```
**Dependencies**: T015, T016 (documentation complete)
**Estimated Time**: 5 min
**Verification**: Feature branch pushed to origin

---

### T018: Merge to Staging Branch
**Commands**:
```bash
git checkout staging
git merge 043-op-het-acties --no-edit
git push origin staging
```
**Dependencies**: T017
**Estimated Time**: 5 min
**Verification**: Staging branch updated, Vercel deployment triggered

---

### T019: Verify Staging Deployment
**Steps**:
```
1. Wait 30-60 seconds for Vercel deployment
2. Check dev.tickedify.com/api/version
   - Verify version matches package.json
3. If version not updated: wait 15 more seconds and retry
4. Max wait: 2 minutes
5. Report deployment status
```
**Dependencies**: T018
**Estimated Time**: 2-5 min
**Verification**: Version endpoint returns correct version

---

### T020: Final Validation on Staging
**Agent**: tickedify-testing
**Steps**:
```
Run comprehensive validation on dev.tickedify.com:
1. Login with test account
2. Execute Quickstart Scenario 1 (Happy Path)
3. Execute Quickstart Scenario 2 (Multiple Properties)
4. Execute Quickstart Scenario 10 (UI Consistency)
5. Manual spot checks:
   - Visual consistency with existing modals
   - Toast notifications styling
   - Button placement and disabled state
6. Report any regressions or issues
```
**Dependencies**: T019 (staging deployed)
**Estimated Time**: 20 min
**Verification**: All scenarios pass on live staging environment

---

## Dependencies Graph

```
Setup:
T001 (version bump)
  ↓

HTML/CSS Foundation:
T002 (HTML structure)
  ↓
T003 (CSS styling)
  ↓

JavaScript Helpers (parallel possible):
T004 [P] populateBulkEditDropdowns() ────┐
T005 [P] collectBulkEditUpdates()    ────┤
T006 [P] showBulkEditPopup()         ────┤
  ↓                                       ↓
T007 bulkEditProperties() (uses all helpers)
  ↓

UI Integration:
T008 Add button to bulk actions
  ↓
T009 openBulkEditPopup() orchestration
  ↓

Testing (parallel possible):
T010 [P] Scenario 1: Happy Path      ────┐
T011 [P] Scenario 3: Min Selection   ────┤
T012 [P] Scenario 4: Empty Form      ────┤
T013 [P] Scenario 5: Cancel          ────┤
T014 [P] Scenario 8: Keyboard        ────┘
  ↓

Documentation (parallel possible):
T015 [P] Update ARCHITECTURE.md      ────┐
T016 [P] Update Changelog            ────┘
  ↓

Deployment (sequential):
T017 Commit & Push
  ↓
T018 Merge to Staging
  ↓
T019 Verify Deployment
  ↓
T020 Final Validation
```

---

## Parallel Execution Examples

### Phase 3.4: JavaScript Helpers (3 parallel tasks)
```javascript
// Launch T004, T005, T006 together (different functions, no conflicts):
Task({
    subagent_type: "tickedify-feature-builder",
    description: "Implement populateBulkEditDropdowns()",
    prompt: "Implement populateBulkEditDropdowns() function in public/app.js per task T004 specification"
});

Task({
    subagent_type: "tickedify-feature-builder",
    description: "Implement collectBulkEditUpdates()",
    prompt: "Implement collectBulkEditUpdates() function in public/app.js per task T005 specification"
});

Task({
    subagent_type: "tickedify-feature-builder",
    description: "Implement showBulkEditPopup()",
    prompt: "Implement showBulkEditPopup() function in public/app.js per task T006 specification"
});
```

### Phase 3.7: Testing (5 parallel tests)
```javascript
// Launch T010-T014 together (independent test scenarios):
Task({
    subagent_type: "tickedify-testing",
    description: "Quickstart Scenario 1",
    prompt: "Execute Quickstart Test Scenario 1: Basic Bulk Edit Happy Path on dev.tickedify.com"
});

Task({
    subagent_type: "tickedify-testing",
    description: "Quickstart Scenario 3",
    prompt: "Execute Quickstart Test Scenario 3: Minimum Selection Validation on dev.tickedify.com"
});

Task({
    subagent_type: "tickedify-testing",
    description: "Quickstart Scenario 4",
    prompt: "Execute Quickstart Test Scenario 4: Empty Form Validation on dev.tickedify.com"
});

Task({
    subagent_type: "tickedify-testing",
    description: "Quickstart Scenario 5",
    prompt: "Execute Quickstart Test Scenario 5: Cancel Workflow on dev.tickedify.com"
});

Task({
    subagent_type: "tickedify-testing",
    description: "Quickstart Scenario 8",
    prompt: "Execute Quickstart Test Scenario 8: Keyboard Navigation on dev.tickedify.com"
});
```

### Phase 3.8: Documentation (2 parallel tasks)
```javascript
// Launch T015, T016 together (different files):
Task({
    subagent_type: "general-purpose",
    description: "Update ARCHITECTURE.md",
    prompt: "Update ARCHITECTURE.md with bulk edit function locations per task T015"
});

Task({
    subagent_type: "general-purpose",
    description: "Update Changelog",
    prompt: "Add changelog entry for bulk eigenschappen bewerking per task T016"
});
```

---

## Validation Checklist

### Pre-Execution Validation
- [x] All design documents analyzed (plan, research, data-model, contracts, quickstart)
- [x] Tech stack identified: JavaScript ES6+, vanilla (no framework)
- [x] Structure: Integrated web app (public/, server.js)
- [x] No backend/database changes required (verified in research)

### Task Completeness
- [x] HTML structure task (T002)
- [x] CSS styling task (T003)
- [x] All JavaScript helper functions (T004-T006)
- [x] Core bulk edit logic (T007)
- [x] UI integration (T008-T009)
- [x] Test scenarios from quickstart (T010-T014)
- [x] Documentation updates (T015-T016)
- [x] Deployment workflow (T017-T020)

### Dependency Validation
- [x] Setup before implementation (T001 before T002)
- [x] HTML before JavaScript (T002 before T004-T006)
- [x] Helpers before core logic (T004-T006 before T007)
- [x] Core logic before integration (T007 before T008-T009)
- [x] Implementation before testing (T009 before T010-T014)
- [x] Testing before deployment (T014 before T017)

### Parallel Task Safety
- [x] T004-T006: Different functions, no file conflicts ✓
- [x] T010-T014: Independent test scenarios ✓
- [x] T015-T016: Different files (ARCHITECTURE.md vs changelog.html) ✓
- [x] No [P] tasks modify same file ✓

---

## Execution Notes

### Tickedify-Specific Reminders
1. **BÈTA FREEZE ACTIVE**: Deploy only to staging branch, NOT main
2. **Autonomous Development**: Proceed with staging deployment without additional approval
3. **Changelog Mandatory**: Every code change must update changelog
4. **ARCHITECTURE.md Update**: Document all function locations with line numbers
5. **Sub-Agent Usage**: Use tickedify-testing for Playwright, tickedify-feature-builder for implementation

### File Locations
- HTML: `public/index.html` (add modal before `</body>`)
- CSS: `public/style.css` (add at end)
- JavaScript: `public/app.js` (helpers ~line 350, TaskManager methods ~line 12500)
- Docs: `ARCHITECTURE.md`, `public/changelog.html`

### Avoid Common Issues
- Don't modify `bulkDateAction()` or `bulkVerplaatsNaar()` - only add button to their row
- Keep modal HTML consistent with existing modals (recurring, priority popups)
- Use existing `loading.showWithProgress()` pattern - don't create new progress UI
- Follow existing toast patterns: `toast.success()`, `toast.warning()`, `toast.error()`

### Success Criteria
- ✅ All 20 tasks completed
- ✅ Minimum 5 quickstart scenarios pass (T010-T014)
- ✅ No console errors on dev.tickedify.com
- ✅ Visual consistency with existing UI verified
- ✅ Documentation updated (ARCHITECTURE.md + changelog)
- ✅ Staging deployment successful

---

## Ready for Implementation

**Status**: ✅ Tasks ready for execution
**Total Tasks**: 20 (8 parallel possible)
**Estimated Time**: 4-6 hours total
**Next Step**: Execute T001 (Version Bump)

**Command to start**:
```javascript
Task({
    subagent_type: "tickedify-feature-builder",
    description: "Version bump & setup",
    prompt: "Execute task T001: Increment package.json version (patch level), verify on branch 043-op-het-acties"
});
```
