# API Contract: Task Completion via Checkbox

## PUT /api/taak/:id - Complete Task Directly

### Description
Update task status to completed when user clicks "Taak afwerken" in planning popup.

### Request
**Method**: PUT
**Path**: `/api/taak/:id`
**Content-Type**: `application/json`

**Path Parameters**:
- `id` (integer, required): Task ID to complete

**Request Body**:
```json
{
  "lijst": "afgewerkt",
  "afgewerkt": "2025-01-27T10:30:00.000Z",
  "completedViaCheckbox": true
}
```

**Field Specifications**:
- `lijst`: Must be "afgewerkt" for completion
- `afgewerkt`: ISO 8601 timestamp of completion
- `completedViaCheckbox`: Boolean flag to indicate completion method (optional)

### Response

**Success (200)**:
```json
{
  "success": true,
  "task": {
    "id": 123,
    "tekst": "Example task",
    "lijst": "afgewerkt",
    "afgewerkt": "2025-01-27T10:30:00.000Z",
    "herhaling_actief": false
  },
  "recurringTaskCreated": false
}
```

**Success with Recurring Task (200)**:
```json
{
  "success": true,
  "task": {
    "id": 123,
    "tekst": "Example recurring task",
    "lijst": "afgewerkt",
    "afgewerkt": "2025-01-27T10:30:00.000Z",
    "herhaling_actief": true,
    "herhaling_type": "weekly-1-1"
  },
  "recurringTaskCreated": true,
  "nextTask": {
    "id": 124,
    "tekst": "Example recurring task",
    "lijst": "inbox",
    "verschijndatum": "2025-02-03"
  }
}
```

**Error Responses**:

**404 - Task Not Found**:
```json
{
  "success": false,
  "error": "Task not found",
  "code": "TASK_NOT_FOUND"
}
```

**400 - Invalid Task State**:
```json
{
  "success": false,
  "error": "Task is not in inbox or already completed",
  "code": "INVALID_TASK_STATE",
  "currentState": "afgewerkt"
}
```

**500 - Database Error**:
```json
{
  "success": false,
  "error": "Database error occurred",
  "code": "DATABASE_ERROR"
}
```

### Validation Rules
- Task must exist in database
- Task must be in 'inbox' or 'acties' status (not already completed)
- `afgewerkt` timestamp must be valid ISO 8601 format
- If task has `herhaling_actief = true`, trigger recurring task creation

### Side Effects
1. **Task Status Update**: Task `lijst` changed to 'afgewerkt'
2. **Completion Timestamp**: Task `afgewerkt` field set to provided timestamp
3. **Recurring Task Creation**: If `herhaling_actief = true`, create new task instance
4. **Session Update**: Update user session with completion count (if tracked)

### Integration Points
- **Recurring Task Logic**: Uses existing `createRecurringTask()` function
- **Database Transaction**: Wrapped in transaction for consistency
- **Error Handling**: Follows existing API error response patterns
- **Authentication**: Uses existing session-based auth (single user)

## Frontend Contract

### JavaScript Function Signature
```javascript
async function completeTaskViaCheckbox(taskId) {
  // Returns: Promise<{ success: boolean, task?: object, error?: string }>
}
```

### UI State Changes
1. **Button State**: Change "Maak actie" to "Taak afwerken"
2. **Validation Bypass**: Disable all planning field validation
3. **Form Submission**: Call completion API instead of planning API
4. **Success Handling**: Close popup, refresh inbox, show success toast
5. **Error Handling**: Show error toast, keep popup open for retry

### Event Handlers
```javascript
// Checkbox change handler
document.getElementById('completeTaskCheckbox').addEventListener('change', function(e) {
  const isChecked = e.target.checked;
  toggleCompleteMode(isChecked);
});

// Form submit handler modification
function handlePlanningFormSubmit(e) {
  e.preventDefault();

  const completeMode = document.getElementById('completeTaskCheckbox').checked;

  if (completeMode) {
    return completeTaskViaCheckbox(currentTaskId);
  } else {
    return handleNormalPlanning();
  }
}
```

### DOM Integration
- Checkbox element: `<input type="checkbox" id="completeTaskCheckbox">`
- Button text update: Dynamic content change based on checkbox state
- Validation message toggle: Hide/show based on completion mode