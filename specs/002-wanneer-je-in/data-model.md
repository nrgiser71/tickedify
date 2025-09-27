# Data Model: Taak Afwerken vanuit Planning Popup

## Entities

### Task (Existing)
**Description**: Existing task entity with completion workflow
**Storage**: PostgreSQL table `taken`

**Key Fields**:
- `id`: Primary key (existing)
- `tekst`: Task name/description (existing)
- `lijst`: Current status/list (existing) - values: 'inbox', 'acties', 'afgewerkt'
- `afgewerkt`: Completion timestamp (existing) - NULL for incomplete, timestamp for completed
- `herhaling_type`: Recurring pattern (existing) - for recurring task logic
- `herhaling_actief`: Boolean flag (existing) - whether task has recurring pattern
- `verschijndatum`: Appearance date (existing)

**State Transitions**:
```
inbox --[complete via checkbox]--> afgewerkt
inbox --[plan normally]-----------> acties --[complete later]--> afgewerkt
```

**Validation Rules**:
- When completing via checkbox: NO validation required on planning fields
- When planning normally: Standard validation rules apply (datum, project, etc.)
- Completion timestamp (`afgewerkt`) must be set when moving to 'afgewerkt' lijst

### Planning Popup Form (UI Model)
**Description**: Form state for the planning popup interface
**Storage**: Browser DOM/JavaScript state (not persisted)

**Key Fields**:
- `completeTaskMode`: Boolean - checkbox state for "Taak afwerken"
- `taskId`: Reference to task being edited
- `validationBypass`: Boolean - derived from completeTaskMode
- `buttonText`: String - "Maak actie" or "Taak afwerken" based on mode
- `formData`: Object - planning form fields (project, context, date, etc.)

**State Management**:
```javascript
// Checkbox state affects form behavior
if (completeTaskMode === true) {
    validationBypass = true;
    buttonText = "Taak afwerken";
    // Planning fields disabled or ignored
} else {
    validationBypass = false;
    buttonText = "Maak actie";
    // Normal validation rules apply
}
```

## Data Relationships

### No New Database Relationships
This feature uses existing task entity and completion workflow:
- No new tables required
- No new foreign keys needed
- Leverages existing recurring task logic via `herhaling_type` and `herhaling_actief`

### Form-to-Database Mapping
```
Planning Popup State --> Database Action
====================    ===============
completeTaskMode=true   --> UPDATE taken SET lijst='afgewerkt', afgewerkt=NOW() WHERE id=taskId
completeTaskMode=false  --> Normal planning workflow (UPDATE with planning fields)
```

## Recurring Task Integration

### Existing Logic Preservation
When completing task via checkbox:
1. Check if `herhaling_actief = true`
2. If yes, use existing recurring task creation logic
3. Create new task instance with same `herhaling_type` pattern
4. New task gets next calculated date based on recurring pattern

### No Data Model Changes Required
Recurring task logic uses existing fields:
- `herhaling_type`: Pattern string (e.g., 'weekly-1-1', 'monthly-day-15-1')
- `herhaling_actief`: Enable/disable flag
- Date calculation handled by existing `calculateNextRecurringDate()` function

## API Integration Points

### Existing Endpoints to Leverage
- `PUT /api/taak/:id` - Update task status and completion
- `POST /api/taak/recurring` - Create next recurring instance (if applicable)
- `GET /api/lijst/inbox` - Refresh inbox after completion

### Data Flow for Checkbox Completion
```
1. User checks "Taak afwerken" checkbox
2. Form bypasses validation
3. API call: PUT /api/taak/:id { lijst: 'afgewerkt', afgewerkt: new Date() }
4. If recurring: Auto-trigger recurring task creation
5. Frontend: Refresh inbox list, close popup
```

## Validation Rules

### Checkbox Mode (completeTaskMode = true)
- **Skip all planning field validation**
- **Only required validation**: Task must exist and be in 'inbox' status
- **Automatic values**: lijst='afgewerkt', afgewerkt=current timestamp

### Normal Mode (completeTaskMode = false)
- **Standard validation applies**: All existing planning form validation rules
- **Required fields**: Based on current planning popup requirements
- **Optional fields**: User can leave planning fields empty if allowed by current rules

## Error Handling

### Completion Failures
- **Database error**: Show error toast, keep popup open
- **Task not found**: Show error toast, close popup
- **Already completed**: Show warning toast, close popup
- **Recurring task creation failure**: Complete original task, show warning about recurring failure

### UI State Consistency
- **Checkbox toggle**: Immediately update form state and button text
- **Validation feedback**: Hide/show validation messages based on checkbox state
- **Form reset**: Clear checkbox state when popup closed or new task opened