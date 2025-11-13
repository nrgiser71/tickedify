# API Contract: Voice Command Parsing

## Endpoint
`POST /api/voice/parse-command`

## Purpose
Parse Dutch natural language voice commands into structured intents and parameters for task management actions.

## Authentication
- **Required**: Yes
- **Method**: Session-based authentication via Express session middleware
- **Validation**: `req.session.user` must exist

## Request

### Headers
```
Content-Type: application/json
Cookie: connect.sid=<session-id>
```

### Body Schema
```json
{
    "transcript": "string (required, min 1 char)",
    "conversationHistory": [
        {
            "role": "user | assistant (required)",
            "content": "string (required)"
        }
    ]
}
```

### Body Validation
- `transcript`: Non-empty string, trimmed whitespace
  - If empty or < 2 characters: Return 400 with fallback flag
- `conversationHistory`: Array of message objects (optional, default: [])
  - Max 10 messages (older messages ignored if > 10)
  - Each message must have `role` ('user' or 'assistant') and `content` (string)

### Example Request
```json
{
    "transcript": "project Verbouwing en context Werk",
    "conversationHistory": [
        { "role": "user", "content": "project Verbouwing en context Werk" }
    ]
}
```

## Response

### Success (200 OK)

#### Intent: set_property
```json
{
    "intent": "set_property",
    "property": "project | context | duration | priority | date | notes | subtaken",
    "value": "string | number | boolean (type depends on property)",
    "response_message": "Property bevestiging in het Nederlands"
}
```

**Property Types**:
- `project`: string (project name)
- `context`: string (context name)
- `duration`: number (minutes)
- `priority`: string ('hoog' | 'gemiddeld' | 'laag')
- `date`: string (YYYY-MM-DD format)
- `notes`: string (free text)
- `subtaken`: boolean

**Example**:
```json
{
    "intent": "set_property",
    "property": "project",
    "value": "Verbouwing",
    "response_message": "Project ingesteld op Verbouwing"
}
```

#### Intent: set_list
```json
{
    "intent": "set_list",
    "lijst": "opvolgen | uitgesteld-wekelijks | uitgesteld-maandelijks | uitgesteld-3maandelijks | uitgesteld-6maandelijks | uitgesteld-jaarlijks",
    "response_message": "Taak doorgestuurd naar [lijst naam]"
}
```

**Example**:
```json
{
    "intent": "set_list",
    "lijst": "uitgesteld-wekelijks",
    "response_message": "Taak doorgestuurd naar wekelijkse lijst"
}
```

#### Intent: edit_title
```json
{
    "intent": "edit_title",
    "new_title": "string (new task title)",
    "response_message": "Taaknaam gewijzigd naar [new title]"
}
```

**Example**:
```json
{
    "intent": "edit_title",
    "new_title": "Bel leverancier voor offerte",
    "response_message": "Taaknaam gewijzigd naar: Bel leverancier voor offerte"
}
```

#### Intent: query
```json
{
    "intent": "query",
    "query_type": "count_by_project | count_by_context | list_projects | list_contexts",
    "project": "string (optional, for count_by_project)",
    "context": "string (optional, for count_by_context)",
    "response_message": "Query result in het Nederlands"
}
```

**Example**:
```json
{
    "intent": "query",
    "query_type": "count_by_project",
    "project": "Verbouwing",
    "response_message": "Er zijn 12 taken in project Verbouwing"
}
```

#### Intent: action
```json
{
    "intent": "action",
    "action_type": "start | next | repeat | save | complete | delete | stop",
    "response_message": "Action bevestiging in het Nederlands"
}
```

**Action Types**:
- `start`: Begin voice mode (initial command)
- `next`: Skip to next inbox task without saving
- `repeat`: Repeat current task description
- `save`: Save current task with accumulated properties ("klaar", "taak opslaan")
- `complete`: Mark task as complete and advance ("afvinken", "taak voltooid")
- `delete`: Delete current task
- `stop`: Deactivate voice mode

**Example**:
```json
{
    "intent": "action",
    "action_type": "save",
    "response_message": "Taak opgeslagen"
}
```

#### Intent: create_entity
```json
{
    "intent": "create_entity",
    "entity_type": "project | context",
    "entity_name": "string (name of new entity)",
    "response_message": "Nieuw [entity type] aangemaakt: [entity name]"
}
```

**Example**:
```json
{
    "intent": "create_entity",
    "entity_type": "project",
    "entity_name": "Tuinhuis bouwen",
    "response_message": "Nieuw project aangemaakt: Tuinhuis bouwen"
}
```

### Error Responses

#### 400 Bad Request (Empty Transcript)
```json
{
    "error": "Transcript parameter is required",
    "fallback": true,
    "message": "Empty or missing transcript"
}
```

**Client Behavior**: Attempt regex-based parsing as fallback

#### 400 Bad Request (AI Parsing Failed)
```json
{
    "error": "AI parsing failed: <error details>",
    "fallback": true,
    "transcript": "<original transcript>"
}
```

**Client Behavior**: Attempt regex-based parsing as fallback

#### 401 Unauthorized
```json
{
    "error": "Niet geautoriseerd"
}
```

**Client Behavior**: Redirect to login

#### 500 Internal Server Error
```json
{
    "error": "Server error: <details>",
    "fallback": true
}
```

**Client Behavior**: Attempt regex-based parsing as fallback

## Implementation Details

### AI Model
- **Model**: gpt-4o-mini
- **Mode**: Structured Outputs (JSON schema enforcement)
- **Language**: Dutch system prompt with Nederlandse voorbeelden
- **Temperature**: 0.3 (low for consistency)
- **Max Tokens**: 150 (sufficient for structured output)

### Fallback Mechanism
When `fallback: true` is returned in error response:
1. Client attempts regex-based parsing locally
2. Regex patterns match common commands:
   - `/(project|proj)\s+(.+)/i` → set_property: project
   - `/(context|ctx)\s+(.+)/i` → set_property: context
   - `/(duur|tijd)\s+(\d+)/i` → set_property: duration
   - `/klaar|opslaan/i` → action: save
   - `/afvinken|voltooid/i` → action: complete
   - `/doorsturen\s+naar\s+(\w+)/i` → set_list
3. If regex fails: Display error message to user

### Performance
- **Target**: < 1s response time (p95)
- **Measured**: 200-800ms average in POC
- **Timeout**: 5s client-side (before falling back to regex)

### Cost
- **GPT-4o-mini**: $0.15/1M input tokens, $0.60/1M output tokens
- **Estimated**: < $1/month for 2 users with moderate usage

## Testing Strategy

### Unit Tests
```javascript
describe('POST /api/voice/parse-command', () => {
    it('should parse project setting command', async () => {
        const response = await request(app)
            .post('/api/voice/parse-command')
            .send({ transcript: 'project Verbouwing' })
            .expect(200);

        expect(response.body.intent).toBe('set_property');
        expect(response.body.property).toBe('project');
        expect(response.body.value).toBe('Verbouwing');
    });

    it('should return fallback flag for empty transcript', async () => {
        const response = await request(app)
            .post('/api/voice/parse-command')
            .send({ transcript: '' })
            .expect(400);

        expect(response.body.fallback).toBe(true);
    });
});
```

### Integration Tests
```javascript
describe('Voice command parsing integration', () => {
    it('should handle multiple properties in one command', async () => {
        const response = await request(app)
            .post('/api/voice/parse-command')
            .send({ transcript: 'project Verbouwing context Werk duur 30' })
            .expect(200);

        // Verify first property parsed (client handles sequential parsing)
        expect(response.body.intent).toBe('set_property');
    });

    it('should use conversation history for context', async () => {
        const response = await request(app)
            .post('/api/voice/parse-command')
            .send({
                transcript: 'hoeveel taken in dat project?',
                conversationHistory: [
                    { role: 'user', content: 'project Verbouwing' },
                    { role: 'assistant', content: 'Project ingesteld op Verbouwing' }
                ]
            })
            .expect(200);

        expect(response.body.intent).toBe('query');
        expect(response.body.project).toBe('Verbouwing'); // Context inferred
    });
});
```

## Dependencies
- Express.js session middleware (authentication)
- OpenAI API client (GPT-4o-mini)
- Environment variable: `OPENAI_API_KEY`

## Notes
- This endpoint already exists in production (server.js:882)
- No changes required for voice mode integration
- Proven functionality from voice-poc.html
- Fallback mechanism ensures graceful degradation if AI unavailable
