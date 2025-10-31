# Data Model: Email Import Syntax Uitbreiding

**Feature**: 048-email-import-syntax
**Date**: 2025-10-31

## Overview

Deze feature vereist **GEEN database schema wijzigingen**. Alle functionaliteit gebruikt bestaande database structuren. Dit document beschrijft de runtime data models en hoe ze mappen naar bestaande database schema.

## Runtime Data Model

### EmailInstruction (Runtime Only - Not Persistent)

Parsed @t instruction data - alleen in memory tijdens email processing.

**Fields:**
```javascript
{
    project: String | null,          // Project naam uit p: code
    context: String | null,          // Context naam uit c: code
    dueDate: String | null,          // ISO date YYYY-MM-DD uit d: code
    duration: Number | null,         // Minutes uit t: code
    priority: String | null,         // 'High' | 'Medium' | 'Low' uit p0-p9 codes
    lijst: String,                   // 'inbox' | defer mapping value
    deferCode: String | null,        // Original defer code ('df', 'dw', etc.)
    hasDefer: Boolean                // True if defer code was detected
}
```

**Validation Rules:**
- `project`: Any non-empty string, trimmed
- `context`: Any non-empty string, trimmed
- `dueDate`: Must match regex `/^\d{4}-\d{2}-\d{2}$/`, otherwise null
- `duration`: Must be positive integer, otherwise null
- `priority`: One of ['High', 'Medium', 'Low'], otherwise null
- `lijst`: Default 'inbox', overridden by defer mapping
- `deferCode`: One of ['df', 'dw', 'dm', 'd3m', 'd6m', 'dy'], otherwise null
- `hasDefer`: True triggers short-circuit logic

**Lifecycle:**
1. Created during parseEmailToTask() execution
2. Populated from @t instruction parsing
3. Used to query/create Project and Context entities
4. Mapped to Task entity for database insert
5. Discarded after email processing complete

## Existing Database Entities (No Changes)

### Task (taken table)

Bestaande database tabel - geen schema wijzigingen nodig.

**Relevant Columns:**
```sql
CREATE TABLE taken (
    id VARCHAR(255) PRIMARY KEY,
    tekst VARCHAR(500),              -- Task title (from subject)
    opmerkingen TEXT,                -- Task notes (from body, minus @t line)
    lijst VARCHAR(50),               -- List: inbox | acties | followup | weekly | monthly | quarterly | biannual | yearly
    aangemaakt TIMESTAMP,
    verschijndatum DATE,             -- Due date (from d: code)
    duur INTEGER,                    -- Duration in minutes (from t: code)
    prioriteit VARCHAR(20),          -- 'High' | 'Medium' | 'Low' (from p0-p9 codes)
    project_id INTEGER,              -- FK to projecten table (from p: code)
    context_id INTEGER,              -- FK to contexten table (from c: code)
    user_id INTEGER NOT NULL,        -- FK to gebruikers table
    type VARCHAR(20) DEFAULT 'taak'
);
```

**Mapping from EmailInstruction:**
- `tekst` ← Email subject (unchanged from current behavior)
- `opmerkingen` ← Email body minus @t line, truncated at --end--
- `lijst` ← `EmailInstruction.lijst` (inbox or defer mapping)
- `verschijndatum` ← `EmailInstruction.dueDate`
- `duur` ← `EmailInstruction.duration`
- `prioriteit` ← `EmailInstruction.priority`
- `project_id` ← Resolved from `EmailInstruction.project` via findOrCreateProject()
- `context_id` ← Resolved from `EmailInstruction.context` via findOrCreateContext()

**State Transitions:**

```
Email received
    ↓
Parse @t instruction (if present)
    ↓
Map to EmailInstruction
    ↓
Resolve project_id (create if needed)
    ↓
Resolve context_id (create if needed)
    ↓
INSERT into taken table
    ↓
Task created ✅
```

### Project (projecten table)

Bestaande database tabel - geen schema wijzigingen nodig.

**Relevant Columns:**
```sql
CREATE TABLE projecten (
    id SERIAL PRIMARY KEY,
    naam VARCHAR(255) NOT NULL,      -- Project name
    user_id INTEGER NOT NULL,        -- FK to gebruikers table
    UNIQUE(naam, user_id)
);
```

**Auto-creation Logic:**
```javascript
async function findOrCreateProject(projectName, userId) {
    // Try to find existing project
    const existing = await pool.query(
        'SELECT id FROM projecten WHERE naam = $1 AND user_id = $2',
        [projectName, userId]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0].id;
    }

    // Create new project
    const result = await pool.query(
        'INSERT INTO projecten (naam, user_id) VALUES ($1, $2) RETURNING id',
        [projectName, userId]
    );

    return result.rows[0].id;
}
```

**Validation:**
- Project naam must be non-empty string
- Duplicate project names per user are automatically detected via UNIQUE constraint
- Spaties in project naam behouden (niet stripped)

### Context (contexten table)

Bestaande database tabel - geen schema wijzigingen nodig.

**Relevant Columns:**
```sql
CREATE TABLE contexten (
    id SERIAL PRIMARY KEY,
    naam VARCHAR(255) NOT NULL,      -- Context name
    user_id INTEGER NOT NULL,        -- FK to gebruikers table
    UNIQUE(naam, user_id)
);
```

**Auto-creation Logic:**
```javascript
async function findOrCreateContext(contextName, userId) {
    // Try to find existing context
    const existing = await pool.query(
        'SELECT id FROM contexten WHERE naam = $1 AND user_id = $2',
        [contextName, userId]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0].id;
    }

    // Create new context
    const result = await pool.query(
        'INSERT INTO contexten (naam, user_id) VALUES ($1, $2) RETURNING id',
        [contextName, userId]
    );

    return result.rows[0].id;
}
```

**Validation:**
- Context naam must be non-empty string
- Duplicate context names per user are automatically detected via UNIQUE constraint
- Spaties in context naam behouden (niet stripped)

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Email Received (Mailgun)                     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   POST /api/email/import │
                  └─────────────┬────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │  Truncate at --end--     │
                  │  (ALWAYS, even without @t)│
                  └─────────────┬────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │  Check for @t trigger   │
                  └──────┬──────────────┬───┘
                         │              │
            @t found     │              │    No @t
                         │              │
                         ▼              ▼
         ┌────────────────────┐    ┌────────────────────┐
         │ Parse @t segments  │    │  Standard parsing  │
         │ (new logic)        │    │  (unchanged)       │
         └────────┬───────────┘    └────────┬───────────┘
                  │                         │
                  ▼                         │
         ┌────────────────────┐            │
         │ Create              │            │
         │ EmailInstruction    │            │
         └────────┬───────────┘            │
                  │                         │
                  └────────┬────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ findOrCreateProject()    │
              │ (if p: code present)     │
              └─────────────┬────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ findOrCreateContext()    │
              │ (if c: code present)     │
              └─────────────┬────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ INSERT INTO taken       │
              │ (Task created)          │
              └─────────────────────────┘
```

## Defer Code Mapping

**Mapping Table:**

| Defer Code | Lijst Value | Description |
|------------|-------------|-------------|
| `df` | `followup` | Defer to Follow-up lijst |
| `dw` | `weekly` | Defer to Weekly lijst |
| `dm` | `monthly` | Defer to Monthly lijst |
| `d3m` | `quarterly` | Defer to Quarterly lijst |
| `d6m` | `biannual` | Defer to Bi-annual lijst |
| `dy` | `yearly` | Defer to Yearly lijst |

**Database Verification:**

```sql
-- Verify all lijst values are valid
SELECT COUNT(*) FROM taken WHERE lijst IN (
    'inbox', 'acties', 'followup', 'weekly',
    'monthly', 'quarterly', 'biannual', 'yearly'
);
-- Returns: All existing tasks ✅
```

**Absolute Priority Logic:**

When defer code detected:
1. ✅ Set `lijst` to defer mapping value
2. ✅ Ignore ALL other codes (p:, c:, d:, t:, p0-p9)
3. ✅ Short-circuit parsing immediately
4. ✅ Return EmailInstruction with only `lijst` set

```javascript
// Pseudo-code for defer priority
if (deferCodeDetected) {
    return {
        lijst: deferMapping[code],
        // ALL other fields ignored
        project: null,
        context: null,
        dueDate: null,
        duration: null,
        priority: null
    };
}
```

## Priority Normalisatie Mapping

**Mapping Table:**

| Code | Normalized Value | Database Value |
|------|------------------|----------------|
| `p0` | High | `'High'` |
| `p1` | High | `'High'` |
| `p2` | Medium | `'Medium'` |
| `p3` | Low | `'Low'` |
| `p4+` | Low | `'Low'` |

**Implementation:**

```javascript
function normalizePriority(pCode) {
    const match = pCode.match(/^p(\d+)$/i);
    if (!match) return null;

    const num = parseInt(match[1]);

    if (num === 0 || num === 1) return 'High';
    if (num === 2) return 'Medium';
    if (num === 3) return 'Low';
    if (num >= 4) return 'Low';

    return null;
}
```

**Database Compatibility:**

```sql
-- Verify prioriteit kolom accepts normalized values
SELECT DISTINCT prioriteit FROM taken;
-- Returns: NULL, 'High', 'Medium', 'Low' ✅
```

## Validation Rules Summary

### Project Name (p: code)
- ✅ Must be non-empty string after trimming
- ✅ Spaties behouden (niet stripped)
- ✅ Case-sensitive (zoals opgegeven door gebruiker)
- ✅ Auto-created if niet exists
- ❌ Empty string ignored

### Context Name (c: code)
- ✅ Must be non-empty string after trimming
- ✅ Spaties behouden (niet stripped)
- ✅ Case-sensitive (zoals opgegeven door gebruiker)
- ✅ Auto-created if niet exists
- ❌ Empty string ignored

### Due Date (d: code)
- ✅ Must match ISO format: `YYYY-MM-DD`
- ✅ Example: `2025-11-03`
- ❌ Other formats ignored: `03/11/2025`, `Nov 3 2025`, etc.
- ❌ Invalid dates ignored: `2025-13-45`
- ❌ Past dates allowed (no validation)

### Duration (t: code)
- ✅ Must be positive integer
- ✅ Example: `30` (minutes)
- ❌ Negative values ignored: `-30`
- ❌ Non-integer values ignored: `30.5`, `abc`
- ❌ Zero ignored: `0`

### Priority (p0-p9+ codes)
- ✅ Must match format: `p` followed by digits
- ✅ Normalized to High/Medium/Low
- ❌ Non-numeric ignored: `pabc`
- ❌ Missing number ignored: `p`
- ✅ Leading zeros allowed: `p01` → p1 → High

### Defer Code (df/dw/dm/d3m/d6m/dy)
- ✅ Must match exactly (case-insensitive)
- ✅ No colon required (unlike other codes)
- ✅ Triggers absolute priority logic
- ❌ Unknown codes ignored: `d1y`, `dww`
- ✅ First defer code wins if multiple

## Entity Relationships

```
User (gebruikers)
  │
  ├──< Projects (projecten)
  │     └──< Tasks (taken)
  │
  └──< Contexts (contexten)
        └──< Tasks (taken)
```

**Constraints:**
- Task moet altijd user_id hebben (NOT NULL)
- Task kan optionally project_id hebben (NULL allowed)
- Task kan optionally context_id hebben (NULL allowed)
- Project/Context namen zijn unique per user
- Email import code is unique per user (voor routing)

## Data Integrity

### Duplicate Detection

**Project/Context:**
- UNIQUE constraint op (naam, user_id) voorkomt duplicates
- findOrCreate pattern handles race conditions safe

**Task:**
- Geen duplicate detection - elke email wordt nieuwe task
- Dit is intended behavior (user kan meerdere emails doorsturen)

### Referential Integrity

**Foreign Keys:**
```sql
-- Task references
ALTER TABLE taken ADD CONSTRAINT fk_user
    FOREIGN KEY (user_id) REFERENCES gebruikers(id);

ALTER TABLE taken ADD CONSTRAINT fk_project
    FOREIGN KEY (project_id) REFERENCES projecten(id);

ALTER TABLE taken ADD CONSTRAINT fk_context
    FOREIGN KEY (context_id) REFERENCES contexten(id);
```

**Cascade Behavior:**
- User delete → Cascade delete tasks (existing behavior)
- Project delete → Tasks remain with NULL project_id (existing behavior)
- Context delete → Tasks remain with NULL context_id (existing behavior)

## Performance Considerations

### Database Queries Per Email

**Without @t (existing behavior):**
1. SELECT user by import code (1 query)
2. SELECT project by name (0-1 queries)
3. INSERT/SELECT project (0-1 queries)
4. SELECT context by name (0-1 queries)
5. INSERT/SELECT context (0-1 queries)
6. INSERT task (1 query)

**Total: 2-6 queries per email**

**With @t (new behavior):**
- Same query pattern - no additional database overhead
- @t parsing happens in-memory before database queries

### Indexing

**Existing indexes (no changes needed):**
```sql
-- User lookup by import code
CREATE INDEX idx_users_import_code ON gebruikers(import_code);

-- Project lookup by name+user
CREATE UNIQUE INDEX idx_projects_user_name ON projecten(naam, user_id);

-- Context lookup by name+user
CREATE UNIQUE INDEX idx_contexts_user_name ON contexten(naam, user_id);

-- Task queries by user
CREATE INDEX idx_tasks_user ON taken(user_id);
```

✅ All queries remain efficient with existing indexes

## Migration Requirements

### Database Schema Changes

**NONE REQUIRED** ✅

### Data Migration

**NONE REQUIRED** ✅

### Backwards Compatibility

**100% COMPATIBLE** ✅
- Emails zonder @t blijven exact hetzelfde verwerkt
- Bestaande taken tabel kolommen allemaal hergebruikt
- Geen breaking changes in API responses
- Geen changes in database constraints

## Data Model Summary

| Component | Status | Changes | Risk |
|-----------|--------|---------|------|
| EmailInstruction | New runtime model | Created | Low |
| Task (taken) | Existing table | None | Zero |
| Project (projecten) | Existing table | None | Zero |
| Context (contexten) | Existing table | None | Zero |
| Database Schema | Existing | None | Zero |
| Indexes | Existing | None | Zero |
| Foreign Keys | Existing | None | Zero |
| **TOTAAL** | **No DB changes** | **None** | **Zero** |

---

**Data Model Complete** ✅
**Zero database schema changes required** ✅
**All functionality uses existing structures** ✅
