# API Contract: Bulk Eigenschappen Bewerking

**Feature**: 043-op-het-acties | **Date**: 2025-10-30

## Overview
API contracts voor bulk eigenschappen bewerking. Deze feature **reuses existing API endpoint** - geen nieuwe endpoints nodig.

---

## Existing Endpoint: Update Task

### `PUT /api/taak/:id`

**Purpose**: Update één of meerdere eigenschappen van een taak (existing endpoint)

**Authentication**: Required (session-based, existing)

**Path Parameters**:
- `id` (integer, required): Task ID to update

**Request Headers**:
```http
Content-Type: application/json
```

**Request Body** (all fields optional - partial update supported):
```typescript
{
    project_id?: number | null,        // Project ID or null for "Geen project"
    verschijndatum?: string,           // ISO date: "YYYY-MM-DD"
    context?: string | null,           // Context ID or null for "Geen context"
    prioriteit?: string,               // One of: "laag", "normaal", "hoog"
    estimated_time_minutes?: number    // Integer >= 0
    // Other fields possible but not used by bulk edit
}
```

**Response**:

Success (200 OK):
```json
{
    "id": 123,
    "titel": "Task title",
    "project_id": 5,
    "verschijndatum": "2025-11-01",
    "context": "thuis",
    "prioriteit": "hoog",
    "estimated_time_minutes": 30,
    // ... other task fields
}
```

Not Found (404):
```json
{
    "error": "Task not found"
}
```

Validation Error (400):
```json
{
    "error": "Invalid project_id" // Or other validation message
}
```

Server Error (500):
```json
{
    "error": "Internal server error"
}
```

---

## Bulk Edit Usage Pattern

The bulk edit feature calls this existing endpoint **multiple times sequentially**:

```javascript
// Pseudo-code for bulk update
const updates = {
    context: "kantoor",
    prioriteit: "hoog"
};

for (const taskId of [101, 102, 103]) {
    const response = await fetch(`/api/taak/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });

    if (!response.ok) {
        // Handle error for this task
    }
}
```

**No New Endpoint Required**: Bulk logic happens client-side by iterating existing endpoint.

---

## Client-Side API Wrapper

### Function: `bulkEditProperties(taskIds, updates)`

**Purpose**: Execute bulk update via existing API

**Parameters**:
```typescript
interface BulkEditParams {
    taskIds: number[];              // Array of task IDs (length >= 2)
    updates: {
        project_id?: number | null;
        verschijndatum?: string;
        context?: string | null;
        prioriteit?: string;
        estimated_time_minutes?: number;
    };
}
```

**Returns**:
```typescript
interface BulkEditResult {
    successCount: number;
    errorCount: number;
    totalCount: number;
    errors: Array<{
        taskId: number;
        error: string;
    }>;
}
```

**Implementation** (app.js addition):
```javascript
async bulkEditProperties(updates) {
    // Pre-condition checks
    if (this.geselecteerdeTaken.size < 2) {
        toast.warning('Selecteer minimaal 2 taken');
        return;
    }

    // Validation: at least one field filled
    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
        toast.warning('Geen eigenschappen geselecteerd');
        return;
    }

    // Confirmation dialog
    const taskCount = this.geselecteerdeTaken.size;
    const confirmed = confirm(`${taskCount} taken aanpassen met deze eigenschappen?`);
    if (!confirmed) return;

    const selectedIds = Array.from(this.geselecteerdeTaken);
    const totalTasks = selectedIds.length;

    // Progress tracking
    loading.showWithProgress('Eigenschappen aanpassen', 0, totalTasks);

    try {
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        let currentTask = 0;

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
                console.error('Network error:', error);
            }
        }

        loading.show('Finishing...');

        // Result feedback
        if (errorCount > 0) {
            // Partial or complete failure
            toast.error(`${successCount} taken aangepast, ${errorCount} fouten`);
            // Don't reload - preserve partial state (FR-014)
        } else {
            // Complete success
            toast.success(`${successCount} taken aangepast`);
            // Reset bulk mode and reload
            this.toggleBulkModus();
            await this.preserveActionsFilters(() => this.laadHuidigeLijst());
        }

        // Update sidebar counters
        this.debouncedUpdateCounters();

        return { successCount, errorCount, totalCount: totalTasks, errors };

    } finally {
        loading.hide();
    }
}
```

---

## Frontend API: Popup Handling

### Function: `showBulkEditPopup()`

**Purpose**: Display modal popup and collect user input

**Parameters**: None (uses `this.geselecteerdeTaken` from TaskManager)

**Returns**: `Promise<object | null>`
- Resolves with updates object if user saves
- Resolves with `null` if user cancels

**Example Usage**:
```javascript
async openBulkEditPopup() {
    const updates = await showBulkEditPopup();
    if (!updates) {
        // User cancelled
        return;
    }

    // Proceed with bulk edit
    await this.bulkEditProperties(updates);
}
```

**Implementation** (new global function in app.js):
```javascript
function showBulkEditPopup() {
    return new Promise((resolve) => {
        const modal = document.getElementById('bulkEditModal');
        const taskCount = window.taskManager.geselecteerdeTaken.size;

        // Update header with task count
        document.getElementById('bulkEditHeader').textContent =
            `Eigenschappen bewerken voor ${taskCount} taken`;

        // Reset all form fields
        document.getElementById('bulkEditProject').value = '';
        document.getElementById('bulkEditDatum').value = '';
        document.getElementById('bulkEditContext').value = '';
        document.getElementById('bulkEditPriority').value = '';
        document.getElementById('bulkEditTime').value = '';

        // Populate dropdowns
        populateBulkEditDropdowns();

        // Show modal
        modal.style.display = 'flex';

        // Save button handler
        window.bulkEditSave = () => {
            const updates = collectBulkEditUpdates();

            // Validation: at least one field filled
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

        // Escape key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                window.bulkEditCancel();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}

function collectBulkEditUpdates() {
    const updates = {};

    const project = document.getElementById('bulkEditProject').value;
    if (project) {
        updates.project_id = project === 'null' ? null : parseInt(project);
    }

    const datum = document.getElementById('bulkEditDatum').value;
    if (datum) {
        updates.verschijndatum = datum;
    }

    const context = document.getElementById('bulkEditContext').value;
    if (context) {
        updates.context = context === 'null' ? null : context;
    }

    const priority = document.getElementById('bulkEditPriority').value;
    if (priority) {
        updates.prioriteit = priority;
    }

    const time = document.getElementById('bulkEditTime').value;
    if (time) {
        updates.estimated_time_minutes = parseInt(time);
    }

    return updates;
}

function populateBulkEditDropdowns() {
    const taskManager = window.taskManager;

    // Populate project dropdown
    const projectSelect = document.getElementById('bulkEditProject');
    projectSelect.innerHTML = '<option value="">-- Geen wijziging --</option>' +
                              '<option value="null">Geen project</option>';
    taskManager.projecten.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.naam;
        projectSelect.appendChild(option);
    });

    // Populate context dropdown
    const contextSelect = document.getElementById('bulkEditContext');
    contextSelect.innerHTML = '<option value="">-- Geen wijziging --</option>' +
                              '<option value="null">Geen context</option>';
    taskManager.contexten.forEach(context => {
        const option = document.createElement('option');
        option.value = context.id;
        option.textContent = context.naam;
        contextSelect.appendChild(option);
    });
}
```

---

## Contract Tests

### Test 1: Single Task Update (Existing Functionality)
```javascript
// Verify existing endpoint still works
const response = await fetch('/api/taak/123', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prioriteit: 'hoog' })
});

assert(response.status === 200);
const task = await response.json();
assert(task.prioriteit === 'hoog');
```

### Test 2: Partial Update (Existing Functionality)
```javascript
// Verify partial update doesn't clear other fields
const before = await fetch('/api/taak/123').then(r => r.json());

await fetch('/api/taak/123', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: 'kantoor' })
});

const after = await fetch('/api/taak/123').then(r => r.json());
assert(after.context === 'kantoor');
assert(after.prioriteit === before.prioriteit); // Unchanged
assert(after.project_id === before.project_id); // Unchanged
```

### Test 3: Bulk Update via Client Wrapper (New)
```javascript
// Verify bulk update through multiple API calls
const taskIds = [101, 102, 103];
const updates = { prioriteit: 'hoog', context: 'thuis' };

const result = await taskManager.bulkEditProperties(updates);

assert(result.successCount === 3);
assert(result.errorCount === 0);

// Verify each task was updated
for (const id of taskIds) {
    const task = await fetch(`/api/taak/${id}`).then(r => r.json());
    assert(task.prioriteit === 'hoog');
    assert(task.context === 'thuis');
}
```

### Test 4: Partial Failure Handling (New)
```javascript
// Verify graceful degradation when some updates fail
const taskIds = [101, 999, 103]; // 999 doesn't exist
const updates = { prioriteit: 'laag' };

const result = await taskManager.bulkEditProperties(updates);

assert(result.successCount === 2);
assert(result.errorCount === 1);
assert(result.errors.length === 1);
assert(result.errors[0].taskId === 999);

// Verify successful updates still persisted
const task101 = await fetch('/api/taak/101').then(r => r.json());
assert(task101.prioriteit === 'laag');
```

---

## Error Scenarios

| Scenario | Expected Behavior |
|----------|------------------|
| Task not found (404) | Count as error, continue with remaining tasks |
| Invalid project_id (400) | Count as error, log validation message |
| Network timeout | Count as error, continue with remaining tasks |
| Server error (500) | Count as error, continue with remaining tasks |
| All tasks fail | Show error toast, don't exit bulk mode, don't reload |
| Some tasks fail | Show error toast with counts, don't reload (preserve partial state) |
| All tasks succeed | Show success toast, exit bulk mode, reload list |

---

## Performance Considerations

**Sequential vs Parallel**:
- Implementation uses **sequential** updates (one at a time)
- Rationale: Simpler error handling, database load management
- Alternative: Parallel with `Promise.all()` - rejected due to complexity

**Timing**:
- Expected: ~500ms per task (spec PR-002)
- For 100 tasks: ~50 seconds total
- Progress indicator shows current task / total
- User can't cancel mid-operation (matches existing bulk actions)

**Network Payload**:
- Per request: ~500 bytes (headers + JSON body)
- For 100 tasks: ~50KB total
- Acceptable for user-initiated action

---

## Backward Compatibility

✅ **No Breaking Changes**:
- Existing `/api/taak/:id` endpoint unchanged
- Existing single task update workflows unaffected
- Existing bulk actions (date, move) unaffected
- New feature is purely additive

---

## Summary

**New Endpoints**: 0
**Modified Endpoints**: 0
**Client Functions Added**: 3
- `bulkEditProperties()`: Main bulk update logic
- `showBulkEditPopup()`: Modal UI handling
- `populateBulkEditDropdowns()`: Dropdown population
- `collectBulkEditUpdates()`: Form data collection

**Contract Tests Required**: 4
- Existing single update (regression)
- Existing partial update (regression)
- New bulk update success
- New bulk update partial failure

This feature **extends existing API** without modifications - pure client-side orchestration.
