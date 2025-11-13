# API Contract: Inbox Tasks Retrieval

## Endpoint
`GET /api/lijst/inbox`

## Purpose
Retrieve all tasks in the user's inbox list for processing via voice mode or manual UI.

## Authentication
- **Required**: Yes
- **Method**: Session-based authentication via Express session middleware
- **Validation**: `req.session.user.id` must exist

## Request

### Headers
```
Cookie: connect.sid=<session-id>
```

### Query Parameters
None

### Example Request
```
GET /api/lijst/inbox HTTP/1.1
Cookie: connect.sid=s%3A...
```

## Response

### Success (200 OK)

```json
{
    "tasks": [
        {
            "id": "integer (task ID)",
            "user_id": "string (user ID)",
            "titel": "string (task title)",
            "notities": "string | null (task notes)",
            "project_id": "integer | null (project FK)",
            "project_naam": "string | null (project name, joined)",
            "context_id": "integer | null (context FK)",
            "context_naam": "string | null (context name, joined)",
            "duur": "integer | null (duration in minutes)",
            "prioriteit": "'hoog' | 'gemiddeld' | 'laag' | null",
            "verschijndatum": "string | null (YYYY-MM-DD)",
            "subtaken": "boolean (has subtasks)",
            "lijst": "'inbox' (always for this endpoint)",
            "voltooid": "boolean (false for inbox tasks)",
            "created_at": "string (ISO 8601 timestamp)",
            "herhaling_type": "string | null (recurring pattern)",
            "herhaling_actief": "boolean (recurring active)"
        }
    ]
}
```

### Field Details

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | integer | No | Unique task identifier |
| `user_id` | string | No | Owner user ID |
| `titel` | string | No | Task title/description |
| `notities` | string | Yes | Extended task notes |
| `project_id` | integer | Yes | Foreign key to projecten table |
| `project_naam` | string | Yes | Project name (joined from projecten) |
| `context_id` | integer | Yes | Foreign key to contexten table |
| `context_naam` | string | Yes | Context name (joined from contexten) |
| `duur` | integer | Yes | Duration in minutes |
| `prioriteit` | enum | Yes | Priority level (Dutch) |
| `verschijndatum` | string | Yes | Date when task should appear (ISO 8601) |
| `subtaken` | boolean | No | Whether task has subtasks |
| `lijst` | string | No | Always 'inbox' for this endpoint |
| `voltooid` | boolean | No | Always false for inbox (completed tasks filtered out) |
| `created_at` | string | No | Task creation timestamp |
| `herhaling_type` | string | Yes | Recurring pattern type |
| `herhaling_actief` | boolean | No | Whether recurrence is active |

### Example Response
```json
{
    "tasks": [
        {
            "id": 12345,
            "user_id": "user_1750513625687_5458i79dj",
            "titel": "Bel aannemer voor planning verbouwing",
            "notities": null,
            "project_id": 42,
            "project_naam": "Verbouwing",
            "context_id": 15,
            "context_naam": "Werk",
            "duur": 30,
            "prioriteit": "hoog",
            "verschijndatum": "2025-11-14",
            "subtaken": false,
            "lijst": "inbox",
            "voltooid": false,
            "created_at": "2025-11-13T10:30:00Z",
            "herhaling_type": null,
            "herhaling_actief": false
        },
        {
            "id": 12346,
            "user_id": "user_1750513625687_5458i79dj",
            "titel": "Review website wireframes",
            "notities": "Bekijk vooral de navigation structure",
            "project_id": 43,
            "project_naam": "Website",
            "context_id": null,
            "context_naam": null,
            "duur": null,
            "prioriteit": "gemiddeld",
            "verschijndatum": null,
            "subtaken": true,
            "lijst": "inbox",
            "voltooid": false,
            "created_at": "2025-11-13T11:45:00Z",
            "herhaling_type": null,
            "herhaling_actief": false
        }
    ]
}
```

### Error Responses

#### 401 Unauthorized
```json
{
    "error": "Niet geautoriseerd"
}
```

**Cause**: No valid session or `req.session.user` missing

**Client Behavior**: Redirect to login

#### 500 Internal Server Error
```json
{
    "error": "Database error: <details>"
}
```

**Cause**: Database query failure

**Client Behavior**: Display error message, retry after delay

## Implementation Details

### Database Query
```sql
SELECT
    t.*,
    p.naam AS project_naam,
    c.naam AS context_naam
FROM taken t
LEFT JOIN projecten p ON t.project_id = p.id
LEFT JOIN contexten c ON t.context_id = c.id
WHERE t.user_id = $1
  AND t.lijst = 'inbox'
  AND t.voltooid = false
ORDER BY t.verschijndatum ASC NULLS LAST, t.created_at ASC
```

### Sorting Logic
1. **Primary**: `verschijndatum` ascending (tasks with dates first, nulls last)
2. **Secondary**: `created_at` ascending (older tasks first within same date)

### Performance
- **Indexed Columns**: `user_id`, `lijst`, `voltooid`
- **Expected**: < 300ms query time for typical user (< 100 inbox tasks)
- **Joins**: LEFT JOIN to include tasks without project/context

### Caching
- No caching (tasks change frequently during inbox processing)
- Client can cache for voice mode session duration (refresh on save/complete/route)

## Voice Mode Usage

### Integration with Voice Mode State
```javascript
// Load inbox tasks into voice mode
async function loadInboxForVoice() {
    const response = await fetch('/api/lijst/inbox');
    const data = await response.json();

    // Store in voice mode state
    voiceModeState.tasks = data.tasks;
    voiceModeState.currentTaskIndex = 0;

    // Read first task aloud
    if (data.tasks.length > 0) {
        readTaskAloud(data.tasks[0]);
    } else {
        speak("Je inbox is leeg");
    }
}
```

### Task Properties Available for Voice Setting
All 8 voice-settable properties are included in response:
- ✅ `titel` (via edit_title intent)
- ✅ `notities` (via notes property)
- ✅ `project_id` / `project_naam` (via project property)
- ✅ `context_id` / `context_naam` (via context property)
- ✅ `duur` (via duration property)
- ✅ `prioriteit` (via priority property)
- ✅ `verschijndatum` (via date property)
- ✅ `subtaken` (via subtaken property)
- ✅ `lijst` (via set_list intent for routing)

### Voice Reading Pattern
```javascript
function readTaskAloud(task) {
    let message = `Taak: ${task.titel}`;

    if (task.project_naam) {
        message += `. Project: ${task.project_naam}`;
    }

    if (task.context_naam) {
        message += `. Context: ${task.context_naam}`;
    }

    if (task.notities) {
        message += `. Notitie: ${task.notities}`;
    }

    speak(message);
}
```

## Testing Strategy

### Contract Tests
```javascript
describe('GET /api/lijst/inbox contract', () => {
    it('should return array of inbox tasks with all fields', async () => {
        const response = await request(app)
            .get('/api/lijst/inbox')
            .set('Cookie', validSessionCookie)
            .expect(200);

        expect(response.body.tasks).toBeInstanceOf(Array);

        if (response.body.tasks.length > 0) {
            const task = response.body.tasks[0];

            // Required fields
            expect(task).toHaveProperty('id');
            expect(task).toHaveProperty('user_id');
            expect(task).toHaveProperty('titel');
            expect(task).toHaveProperty('lijst', 'inbox');
            expect(task).toHaveProperty('voltooid', false);

            // Nullable fields
            expect(task).toHaveProperty('notities');
            expect(task).toHaveProperty('project_id');
            expect(task).toHaveProperty('context_id');
            expect(task).toHaveProperty('duur');
            expect(task).toHaveProperty('prioriteit');
            expect(task).toHaveProperty('verschijndatum');
            expect(task).toHaveProperty('subtaken');
        }
    });

    it('should require authentication', async () => {
        await request(app)
            .get('/api/lijst/inbox')
            .expect(401);
    });

    it('should only return tasks for authenticated user', async () => {
        const response = await request(app)
            .get('/api/lijst/inbox')
            .set('Cookie', validSessionCookie)
            .expect(200);

        response.body.tasks.forEach(task => {
            expect(task.user_id).toBe(authenticatedUserId);
        });
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
- Returns joined project/context names for easy voice reading
- Sorted by date then creation time for logical processing order
- Only returns non-completed tasks (voltooid=false filter)
