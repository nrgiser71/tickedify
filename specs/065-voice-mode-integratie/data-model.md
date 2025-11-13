# Data Model: Voice Mode Integration

## Overview

Voice mode integration operates **entirely on existing database structures**. No new database tables, columns, or migrations are required. All state is runtime-only (in-memory JavaScript) and resets on page load.

## Existing Database Entities (Unchanged)

### Users Table
**Purpose**: Authentication and email whitelist check

```
users
├── id (PRIMARY KEY)
├── email (VARCHAR, UNIQUE) ← Used for whitelist check
├── naam (VARCHAR)
├── password_hash (VARCHAR)
├── created_at (TIMESTAMP)
└── [other existing columns...]
```

**Voice Mode Usage**:
- Email whitelist check: `WHERE email IN ('jan@buskens.be', 'info@baasoverjetijd.be')`
- No modifications to users table

### Taken (Tasks) Table
**Purpose**: Stores all task data including voice-settable properties

```
taken
├── id (PRIMARY KEY)
├── user_id (FOREIGN KEY → users.id)
├── titel (VARCHAR) ← Voice: task name editing
├── notities (TEXT) ← Voice: "notitie toevoegen"
├── project_id (FOREIGN KEY → projecten.id) ← Voice: "project Verbouwing"
├── context_id (FOREIGN KEY → contexten.id) ← Voice: "context Werk"
├── duur (INTEGER) ← Voice: "duur 30 minuten"
├── prioriteit (VARCHAR: 'hoog'|'gemiddeld'|'laag') ← Voice: "prioriteit hoog"
├── verschijndatum (DATE) ← Voice: "datum 15 november"
├── subtaken (BOOLEAN) ← Voice: "dit heeft subtaken"
├── lijst (VARCHAR) ← Voice: "doorsturen naar wekelijkse lijst"
│   Values: 'inbox', 'acties', 'opvolgen',
│            'uitgesteld-wekelijks', 'uitgesteld-maandelijks',
│            'uitgesteld-3maandelijks', 'uitgesteld-6maandelijks',
│            'uitgesteld-jaarlijks'
├── voltooid (BOOLEAN) ← Voice: "afvinken" (mark complete)
└── [other existing columns...]
```

**Voice Mode Usage**:
- Read: GET /api/lijst/inbox retrieves tasks with lijst='inbox'
- Update: PUT /api/taak/:id updates any of the 8 voice-settable properties
- Complete: PUT /api/taak/:id with voltooid=true
- All operations via existing API endpoints (no schema changes)

### Projecten (Projects) Table
**Purpose**: Project entity for task categorization

```
projecten
├── id (PRIMARY KEY)
├── user_id (FOREIGN KEY → users.id)
├── naam (VARCHAR) ← Voice references by name ("project Verbouwing")
├── kleur (VARCHAR)
└── [other existing columns...]
```

**Voice Mode Usage**:
- Query: GET /api/projecten to fetch all projects for user
- Auto-create: POST /api/projecten if project name doesn't exist
- Count: "Hoeveel taken in Verbouwing?" queries taken WHERE project_id=...

### Contexten (Contexts) Table
**Purpose**: Context entity for task categorization

```
contexten
├── id (PRIMARY KEY)
├── user_id (FOREIGN KEY → users.id)
├── naam (VARCHAR) ← Voice references by name ("context Werk")
└── [other existing columns...]
```

**Voice Mode Usage**:
- Query: GET /api/contexten to fetch all contexts for user
- Auto-create: POST /api/contexten if context name doesn't exist
- Count: "Hoeveel taken in context Werk?" queries taken WHERE context_id=...

## Runtime State (In-Memory Only)

### Voice Mode State Object
**Location**: app.js (in-memory JavaScript)
**Lifecycle**: Created on voice mode activation, destroyed on deactivation or page load
**Persistence**: NONE (resets on page refresh)

```javascript
const voiceModeState = {
    // Core state
    active: false,              // Boolean: is voice mode currently active?
    currentTaskIndex: 0,        // Integer: index in currentTasks array

    // Temporary property accumulator (before save)
    pendingProperties: {
        project: null,          // String: project name (to be resolved to ID)
        context: null,          // String: context name (to be resolved to ID)
        duration: null,         // Integer: minutes
        priority: null,         // String: 'hoog'|'gemiddeld'|'laag'
        date: null,             // String: YYYY-MM-DD
        notes: null,            // String: free text
        subtaken: false,        // Boolean
        lijst: 'acties'         // String: target list (default 'acties')
    },

    // Conversation history (for context-aware queries)
    conversationHistory: [],    // Array<{role: 'user'|'assistant', content: string}>
                                // Max 10 messages, FIFO when full

    // Web Speech API instances
    recognition: null,          // SpeechRecognition instance
    audioElement: null,         // HTMLAudioElement for TTS playback

    // Statistics tracking
    stats: {
        processed: 0,           // Count of tasks processed
        saved: 0,               // Count of tasks saved
        completed: 0,           // Count of tasks marked complete
        routed: 0               // Count of tasks routed to defer lists
    }
};
```

**Property Accumulation Flow**:
1. User says "project Verbouwing" → pendingProperties.project = 'Verbouwing'
2. User says "duur 30" → pendingProperties.duration = 30
3. User says "klaar" → Merge pendingProperties with currentTasks[currentTaskIndex], save via API, reset pendingProperties
4. Advance to next task: currentTaskIndex++

### Conversation History Management

```javascript
function addToConversationHistory(role, content) {
    voiceModeState.conversationHistory.push({ role, content });

    // Keep only last 10 messages (FIFO)
    if (voiceModeState.conversationHistory.length > 10) {
        voiceModeState.conversationHistory.shift();
    }
}
```

**Usage**:
- Context-aware queries: "Hoeveel taken in dat project?" (dat = last mentioned project)
- AI parsing receives conversation history for context
- History cleared on voice mode deactivation

### Task Navigation State

```javascript
// Voice mode operates on existing currentTasks array from loadInbox()
// No separate task array needed

function getCurrentVoiceTask() {
    return currentTasks[voiceModeState.currentTaskIndex];
}

function advanceToNextTask() {
    voiceModeState.currentTaskIndex++;

    if (voiceModeState.currentTaskIndex >= currentTasks.length) {
        speak("Alle inbox taken verwerkt.");
        // Stay on last task or deactivate voice mode
    } else {
        readCurrentTask();
    }
}
```

## Data Flow Diagrams

### Property Setting Flow

```
User: "project Verbouwing"
  ↓
Speech Recognition → Transcript: "project Verbouwing"
  ↓
POST /api/voice/parse-command
  body: { transcript: "project Verbouwing", conversationHistory: [...] }
  ↓
AI Response: { intent: 'set_property', property: 'project', value: 'Verbouwing' }
  ↓
Update pendingProperties.project = 'Verbouwing'
  ↓
TTS Feedback: "Project ingesteld op Verbouwing"
  ↓
(Wait for more commands or "klaar" to save)
```

### Save Task Flow

```
User: "klaar"
  ↓
Speech Recognition → Transcript: "klaar"
  ↓
POST /api/voice/parse-command
  body: { transcript: "klaar", conversationHistory: [...] }
  ↓
AI Response: { intent: 'action', action_type: 'save' }
  ↓
Merge pendingProperties with currentTasks[currentTaskIndex]
  ↓
Resolve project/context names to IDs (find or create)
  ↓
PUT /api/taak/:id
  body: { project_id, context_id, duur, prioriteit, verschijndatum, notities, subtaken }
  ↓
Database: UPDATE taken SET ... WHERE id=:id
  ↓
Reset pendingProperties to defaults
  ↓
Advance to next task: currentTaskIndex++
  ↓
TTS Feedback: "Taak opgeslagen. [Next task title]"
```

### List Routing Flow

```
User: "doorsturen naar wekelijkse lijst"
  ↓
Speech Recognition → Transcript: "doorsturen naar wekelijkse lijst"
  ↓
POST /api/voice/parse-command
  body: { transcript: "doorsturen naar wekelijkse lijst", conversationHistory: [...] }
  ↓
AI Response: { intent: 'set_list', lijst: 'uitgesteld-wekelijks' }
  ↓
PUT /api/taak/:id
  body: { lijst: 'uitgesteld-wekelijks' }
  ↓
Database: UPDATE taken SET lijst='uitgesteld-wekelijks' WHERE id=:id
  ↓
Remove task from currentTasks array
  ↓
TTS Feedback: "Taak doorgestuurd naar wekelijkse lijst. [Next task title]"
```

### Query Flow

```
User: "hoeveel taken in Verbouwing?"
  ↓
Speech Recognition → Transcript: "hoeveel taken in Verbouwing?"
  ↓
POST /api/voice/parse-command
  body: { transcript: "hoeveel taken in Verbouwing?", conversationHistory: [...] }
  ↓
AI Response: { intent: 'query', query_type: 'count_by_project', project: 'Verbouwing' }
  ↓
GET /api/projecten → Find project_id for 'Verbouwing'
  ↓
GET /api/lijst/acties → Filter tasks by project_id, count
  ↓
Count: 12 tasks
  ↓
TTS Feedback: "Er zijn 12 taken in project Verbouwing"
  ↓
(No task navigation, stay on current task)
```

## Entity Relationships (Existing)

```
users (1) ←──── (N) taken
users (1) ←──── (N) projecten
users (1) ←──── (N) contexten

taken (N) ────→ (1) projecten (optional FK)
taken (N) ────→ (1) contexten (optional FK)
```

**Voice Mode Impact**: NONE - operates within existing relationships

## Validation Rules (Existing)

All validation rules enforced by existing API endpoints, no changes:

1. **Email uniqueness**: users.email must be unique
2. **Project/context ownership**: User can only access their own projects/contexts
3. **Task ownership**: User can only modify their own tasks
4. **Lijst enum**: Must be one of valid list names
5. **Prioriteit enum**: Must be 'hoog', 'gemiddeld', or 'laag'
6. **Date format**: verschijndatum must be valid YYYY-MM-DD
7. **Duration**: duur must be positive integer (minutes)

## State Transitions

### Voice Mode Lifecycle

```
INACTIVE (page load)
  ↓ [user clicks toggle, whitelist check passes]
INITIALIZING (request microphone permission)
  ↓ [permission granted]
ACTIVE (listening for commands)
  ↓ [user speaks command]
PROCESSING (AI parsing)
  ↓ [command recognized]
EXECUTING (update task/query)
  ↓ [TTS feedback]
ACTIVE (listening for next command)
  ↓ [user clicks toggle OR page refresh]
INACTIVE (cleanup, reset state)
```

### Task Processing States

```
CURRENT TASK (index N)
  ↓ [property commands]
ACCUMULATING PROPERTIES (pendingProperties filled)
  ↓ ["klaar" command]
SAVING (API call, merge properties)
  ↓ [save success]
NEXT TASK (index N+1)
```

OR

```
CURRENT TASK (index N)
  ↓ [list routing command]
ROUTING (update lijst via API)
  ↓ [route success]
NEXT TASK (index N, or N+1 if array shifted)
```

OR

```
CURRENT TASK (index N)
  ↓ ["afvinken" command]
COMPLETING (set voltooid=true via API)
  ↓ [complete success]
NEXT TASK (index N+1)
```

## Data Integrity Considerations

**No Data Integrity Risks**:
1. Voice mode uses existing, battle-tested API endpoints
2. All validation rules already enforced server-side
3. No direct database access from voice mode (API only)
4. Pending properties discarded on voice mode deactivation (no orphaned state)
5. Conversation history is ephemeral (no storage)

**Rollback Scenarios**:
- If save fails: pendingProperties retained, user can retry "klaar" command
- If routing fails: task remains in inbox, user can retry routing command
- If query fails: spoken error message, no state change

## Performance Considerations

**Memory**:
- Voice mode state object: ~5KB in memory
- Conversation history: ~2KB (10 messages × ~200 bytes)
- Audio buffer: Streaming (no accumulation)
- Total footprint: < 10KB additional memory usage

**API Load**:
- Property commands: 0 API calls (pending only)
- Save command: 1-3 API calls (PUT task, optional POST project/context if new)
- Route command: 1 API call (PUT task)
- Query command: 1-2 API calls (GET projects/contexts, count tasks)
- Average: ~1.5 API calls per voice command

**Database Impact**:
- Voice mode generates same queries as manual inbox processing
- No additional database load beyond normal usage
- Indexed queries (by user_id, lijst) ensure performance

## Conclusion

Voice mode integration introduces **ZERO database schema changes** and operates entirely on existing entities. All state is runtime-only (in-memory JavaScript) and follows existing API contracts. The data model is simple, performant, and carries no data integrity risks.

**Next**: Define API contracts for voice mode integration.
