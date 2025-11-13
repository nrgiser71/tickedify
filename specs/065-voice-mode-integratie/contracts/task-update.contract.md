# API Contract: Task Property Updates

## Endpoint
`PUT /api/taak/:id`

## Purpose
Update one or more properties of an existing task. Used by voice mode to apply accumulated properties after "klaar" command, route tasks to different lists, and mark tasks as complete.

## Authentication
- **Required**: Yes
- **Method**: Session-based authentication via Express session middleware
- **Validation**: `req.session.user.id` must exist and match task owner

## Request

### Path Parameters
- `id`: integer (required) - Task ID to update

### Headers
```
Content-Type: application/json
Cookie: connect.sid=<session-id>
```

### Body Schema
```json
{
    "titel": "string (optional)",
    "notities": "string | null (optional)",
    "project_id": "integer | null (optional)",
    "context_id": "integer | null (optional)",
    "duur": "integer | null (optional, minutes)",
    "prioriteit": "'hoog' | 'gemiddeld' | 'laag' | null (optional)",
    "verschijndatum": "string | null (optional, YYYY-MM-DD)",
    "subtaken": "boolean (optional)",
    "lijst": "string (optional, list name)",
    "voltooid": "boolean (optional)"
}
```

### Field Validation

| Field | Type | Validation Rules |
|-------|------|------------------|
| `titel` | string | Non-empty if provided |
| `notities` | string / null | Max 10000 characters |
| `project_id` | integer / null | Must reference existing project owned by user |
| `context_id` | integer / null | Must reference existing context owned by user |
| `duur` | integer / null | Must be positive integer (minutes) |
| `prioriteit` | enum / null | Must be 'hoog', 'gemiddeld', or 'laag' |
| `verschijndatum` | string / null | Must be valid YYYY-MM-DD format |
| `subtaken` | boolean | true or false |
| `lijst` | string | Must be valid lijst name (see below) |
| `voltooid` | boolean | true or false |

### Valid Lijst Names
- `inbox`
- `acties`
- `opvolgen`
- `uitgesteld-wekelijks`
- `uitgesteld-maandelijks`
- `uitgesteld-3maandelijks`
- `uitgesteld-6maandelijks`
- `uitgesteld-jaarlijks`

### Example Requests

#### Voice Mode: Save with Properties
```json
PUT /api/taak/12345

{
    "project_id": 42,
    "context_id": 15,
    "duur": 30,
    "prioriteit": "hoog",
    "verschijndatum": "2025-11-15",
    "notities": "Bel eerst voor afspraak",
    "subtaken": false,
    "lijst": "acties"
}
```

#### Voice Mode: Route to Defer List
```json
PUT /api/taak/12345

{
    "lijst": "uitgesteld-wekelijks"
}
```

#### Voice Mode: Mark Complete
```json
PUT /api/taak/12345

{
    "voltooid": true
}
```

## Response

### Success (200 OK)

```json
{
    "success": true,
    "task": {
        "id": "integer",
        "user_id": "string",
        "titel": "string",
        "notities": "string | null",
        "project_id": "integer | null",
        "context_id": "integer | null",
        "duur": "integer | null",
        "prioriteit": "string | null",
        "verschijndatum": "string | null",
        "subtaken": "boolean",
        "lijst": "string",
        "voltooid": "boolean",
        "updated_at": "string (ISO 8601 timestamp)"
    }
}
```

### Example Response
```json
{
    "success": true,
    "task": {
        "id": 12345,
        "user_id": "user_1750513625687_5458i79dj",
        "titel": "Bel aannemer voor planning verbouwing",
        "notities": "Bel eerst voor afspraak",
        "project_id": 42,
        "context_id": 15,
        "duur": 30,
        "prioriteit": "hoog",
        "verschijndatum": "2025-11-15",
        "subtaken": false,
        "lijst": "acties",
        "voltooid": false,
        "updated_at": "2025-11-13T14:22:00Z"
    }
}
```

### Error Responses

#### 400 Bad Request (Validation Error)
```json
{
    "error": "Validation error: <field> is invalid",
    "field": "<field_name>",
    "value": "<invalid_value>"
}
```

**Examples**:
- Invalid date format: `{ "error": "Validation error: verschijndatum must be YYYY-MM-DD", "field": "verschijndatum", "value": "15/11/2025" }`
- Invalid priority: `{ "error": "Validation error: prioriteit must be hoog, gemiddeld, or laag", "field": "prioriteit", "value": "urgent" }`
- Invalid lijst: `{ "error": "Validation error: lijst not recognized", "field": "lijst", "value": "somedag" }`

#### 401 Unauthorized
```json
{
    "error": "Niet geautoriseerd"
}
```

**Cause**: No valid session

**Client Behavior**: Redirect to login

#### 403 Forbidden
```json
{
    "error": "Je hebt geen toegang tot deze taak"
}
```

**Cause**: Task exists but belongs to different user

**Client Behavior**: Display error, do not retry

#### 404 Not Found
```json
{
    "error": "Taak niet gevonden"
}
```

**Cause**: Task ID does not exist in database

**Client Behavior**: Display error, remove from local cache

#### 500 Internal Server Error
```json
{
    "error": "Database error: <details>"
}
```

**Cause**: Database update failure

**Client Behavior**: Display error, allow retry

## Implementation Details

### Database Query
```sql
UPDATE taken
SET
    titel = COALESCE($1, titel),
    notities = COALESCE($2, notities),
    project_id = COALESCE($3, project_id),
    context_id = COALESCE($4, context_id),
    duur = COALESCE($5, duur),
    prioriteit = COALESCE($6, prioriteit),
    verschijndatum = COALESCE($7, verschijndatum),
    subtaken = COALESCE($8, subtaken),
    lijst = COALESCE($9, lijst),
    voltooid = COALESCE($10, voltooid),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $11
  AND user_id = $12
RETURNING *;
```

### Partial Updates
- Only provided fields are updated (COALESCE pattern)
- Omitted fields retain current values
- `null` explicitly sets field to NULL (clears value)
- Undefined fields are not sent (omit from JSON)

### Validation Logic
1. Check session authentication
2. Validate task ownership (user_id match)
3. Validate field formats (date, prioriteit, lijst)
4. Validate foreign keys (project_id, context_id exist for user)
5. Execute UPDATE query
6. Return updated task

### Performance
- **Indexed Columns**: `id`, `user_id`
- **Expected**: < 100ms update time
- **Transaction**: Single UPDATE statement (atomic)

### Recurring Tasks Handling
- If task has `herhaling_actief=true` and `voltooid=true` is set:
  - Triggers recurring task logic (creates next instance)
  - See recurring tasks feature for details
- Voice mode typically sets `voltooid=true` via separate "afvinken" command

## Voice Mode Usage Patterns

### Pattern 1: Accumulate and Save
```javascript
// User says multiple property commands
// Properties accumulate in pendingProperties object

// User says "klaar" or "taak opslaan"
async function saveVoiceTask() {
    const task = currentTasks[voiceModeState.currentTaskIndex];
    const updates = {};

    // Resolve project name to ID
    if (pendingProperties.project) {
        const project = await findOrCreateProject(pendingProperties.project);
        updates.project_id = project.id;
    }

    // Resolve context name to ID
    if (pendingProperties.context) {
        const context = await findOrCreateContext(pendingProperties.context);
        updates.context_id = context.id;
    }

    // Copy other properties directly
    if (pendingProperties.duration) updates.duur = pendingProperties.duration;
    if (pendingProperties.priority) updates.prioriteit = pendingProperties.priority;
    if (pendingProperties.date) updates.verschijndatum = pendingProperties.date;
    if (pendingProperties.notes) updates.notities = pendingProperties.notes;
    if (pendingProperties.subtaken !== null) updates.subtaken = pendingProperties.subtaken;
    if (pendingProperties.lijst !== 'acties') updates.lijst = pendingProperties.lijst;

    // PUT /api/taak/:id
    await fetch(`/api/taak/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });

    // Reset pending properties
    resetPendingProperties();

    // Advance to next task
    advanceToNextTask();
}
```

### Pattern 2: Route to List
```javascript
// User says "doorsturen naar wekelijkse lijst"
// AI parses: intent=set_list, lijst=uitgesteld-wekelijks

async function routeTaskToList(lijst) {
    const task = currentTasks[voiceModeState.currentTaskIndex];

    await fetch(`/api/taak/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lijst })
    });

    // Remove from inbox, advance
    currentTasks.splice(voiceModeState.currentTaskIndex, 1);
    readCurrentTask(); // Same index, next task
}
```

### Pattern 3: Mark Complete
```javascript
// User says "afvinken" or "taak voltooid"
// AI parses: intent=action, action_type=complete

async function completeTask() {
    const task = currentTasks[voiceModeState.currentTaskIndex];

    await fetch(`/api/taak/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voltooid: true })
    });

    // Remove from inbox (completed tasks filtered out)
    currentTasks.splice(voiceModeState.currentTaskIndex, 1);
    readCurrentTask();
}
```

## Testing Strategy

### Contract Tests
```javascript
describe('PUT /api/taak/:id contract', () => {
    it('should update task properties', async () => {
        const response = await request(app)
            .put(`/api/taak/${testTaskId}`)
            .set('Cookie', validSessionCookie)
            .send({
                prioriteit: 'hoog',
                duur: 30
            })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.task.prioriteit).toBe('hoog');
        expect(response.body.task.duur).toBe(30);
    });

    it('should enforce task ownership', async () => {
        await request(app)
            .put(`/api/taak/${otherUserTaskId}`)
            .set('Cookie', validSessionCookie)
            .send({ titel: 'Hacked' })
            .expect(403);
    });

    it('should validate lijst enum', async () => {
        await request(app)
            .put(`/api/taak/${testTaskId}`)
            .set('Cookie', validSessionCookie)
            .send({ lijst: 'invalid-list' })
            .expect(400);
    });

    it('should allow partial updates', async () => {
        // Only send one field
        const response = await request(app)
            .put(`/api/taak/${testTaskId}`)
            .set('Cookie', validSessionCookie)
            .send({ notities: 'Nieuwe notitie' })
            .expect(200);

        // Other fields unchanged
        expect(response.body.task.titel).toBe(originalTask.titel);
        expect(response.body.task.notities).toBe('Nieuwe notitie');
    });
});
```

### Voice Mode Integration Tests
```javascript
describe('Voice mode task updates', () => {
    it('should accumulate and save properties', async () => {
        // Simulate voice mode flow
        await voiceMode.setProperty('project', 'Verbouwing');
        await voiceMode.setProperty('duration', 30);
        await voiceMode.save();

        // Verify API call
        expect(mockFetch).toHaveBeenCalledWith(
            `/api/taak/${task.id}`,
            expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({
                    project_id: 42,
                    duur: 30
                })
            })
        );
    });

    it('should route task to defer list', async () => {
        await voiceMode.routeToList('uitgesteld-wekelijks');

        expect(mockFetch).toHaveBeenCalledWith(
            `/api/taak/${task.id}`,
            expect.objectContaining({
                body: JSON.stringify({
                    lijst: 'uitgesteld-wekelijks'
                })
            })
        );
    });
});
```

## Dependencies
- Express.js session middleware (authentication)
- PostgreSQL database connection (via database.js)
- Environment variable: `DATABASE_URL` or `DATABASE_URL_TEST` (staging)

## Notes
- This endpoint already exists in production (no changes required)
- Used by both manual UI and voice mode
- Supports partial updates (only send changed fields)
- Enforces ownership (user can only update their own tasks)
- Atomic updates (single database transaction)
- Returns full updated task for client-side cache synchronization
