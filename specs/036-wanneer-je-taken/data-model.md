# Data Model: Real-time Sidebar Counter Updates

**Feature**: 036-wanneer-je-taken
**Date**: 2025-10-27

## Overview

This feature does NOT require any database schema changes. It uses existing tables and queries.

## Existing Database Schema (No Changes)

### Tables Used

#### `taken` (tasks)
```sql
CREATE TABLE taken (
    id SERIAL PRIMARY KEY,
    naam TEXT NOT NULL,
    lijst VARCHAR(50),              -- 'inbox', 'acties', 'opvolgen', 'uitgesteld-*'
    status VARCHAR(20),
    datum VARCHAR(10),
    verschijndatum VARCHAR(10),
    project_id INTEGER REFERENCES projecten(id),
    context_id INTEGER REFERENCES contexten(id),
    afgewerkt TIMESTAMP,            -- NULL = active, timestamp = completed
    user_id VARCHAR(50) REFERENCES users(id),
    -- ... other fields ...
);
```

**Indexes** (existing):
- `lijst` - Used for counting tasks per list
- `user_id` - Used for filtering user's tasks
- `afgewerkt` - Used to exclude completed tasks from counts

#### `projecten` (projects)
```sql
CREATE TABLE projecten (
    id SERIAL PRIMARY KEY,
    naam VARCHAR(255) NOT NULL,
    user_id VARCHAR(50) REFERENCES users(id)
);
```

**Indexes** (existing):
- `user_id` - Used for counting user's projects

## API Data Flow

### Counter Update Request

**Endpoint**: `GET /api/counts/sidebar`

**Request**:
- Method: GET
- Authentication: Required (session-based)
- Headers: None specific
- Body: None

**Response**:
```json
{
    "inbox": 5,
    "acties": 12,
    "projecten": 3,
    "opvolgen": 2,
    "uitgesteld": 8
}
```

**Response Fields**:
- `inbox` (integer): Count of active tasks in inbox list
- `acties` (integer): Count of active tasks in actions list (excluding future verschijndatum)
- `projecten` (integer): Total count of user's projects
- `opvolgen` (integer): Count of active tasks in follow-up list
- `uitgesteld` (integer): Count of active tasks across all deferred lists (weekly, monthly, quarterly, biannual, yearly)

### Query Logic (Existing, No Changes)

**Tasks Count Query**:
```sql
SELECT
    COUNT(CASE WHEN lijst = 'inbox' AND afgewerkt IS NULL THEN 1 END) as inbox,
    COUNT(CASE WHEN lijst = 'acties' AND afgewerkt IS NULL
        AND (verschijndatum IS NULL OR verschijndatum <= CURRENT_DATE) THEN 1 END) as acties,
    COUNT(CASE WHEN lijst = 'opvolgen' AND afgewerkt IS NULL THEN 1 END) as opvolgen,
    COUNT(CASE WHEN lijst LIKE 'uitgesteld-%' AND afgewerkt IS NULL THEN 1 END) as uitgesteld
FROM taken
WHERE user_id = $1
```

**Projects Count Query**:
```sql
SELECT COUNT(*) as count FROM projecten WHERE user_id = $1
```

**Performance**:
- Both queries use indexed columns (user_id, lijst, afgewerkt)
- Typical response time: <10ms
- No N+1 query issues
- Single API call aggregates all counts

## Frontend Data State

### Counter State Management

**Location**: DOM elements (not JavaScript state)

**DOM Structure**:
```html
<!-- Inbox -->
<li data-lijst="inbox">
    <span>Inbox</span>
    <span class="task-count"> (5)</span>
</li>

<!-- Actions -->
<li data-lijst="acties">
    <span>Acties</span>
    <span class="task-count"> (12)</span>
</li>

<!-- Projects -->
<li data-lijst="projecten">
    <span>Projecten</span>
    <span class="task-count"> (3)</span>
</li>

<!-- Follow-up -->
<li data-lijst="opvolgen">
    <span>Opvolgen</span>
    <span class="task-count"> (2)</span>
</li>

<!-- Deferred -->
<li data-lijst="uitgesteld">
    <span>Uitgesteld</span>
    <span class="task-count"> (8)</span>
</li>
```

**Update Mechanism**:
1. Fetch counts from `/api/counts/sidebar`
2. Select elements via `[data-lijst="X"] .task-count`
3. Update `textContent` with ` (${count})`

**Error State**:
- On API failure: Display ` (?)` in all counters
- User can still use application
- Counters recover on next successful update

## Data Consistency

### Update Timing

**Principle**: Counters update AFTER successful task operation

**Sequence**:
1. User performs task operation (move, complete, delete, create)
2. Frontend sends API request (PUT/POST/DELETE to `/api/taak/...`)
3. Backend processes and responds
4. IF response.ok:
   - Update local UI (list view)
   - Call `updateSidebarCounters()` → fetches fresh counts
5. ELSE:
   - Show error toast
   - Do NOT update counters

**Ensures**:
- Counters always reflect database state
- No optimistic updates (reduces complexity and bugs)
- Atomic: operation success = counter update

### Race Condition Handling

**Problem**: Rapid successive operations could trigger multiple counter updates

**Solution**: Debounced updates (optional, not required)

```javascript
// Available if needed (app.js:3154)
debouncedUpdateCounters() {
    if (this.counterUpdateTimer) {
        clearTimeout(this.counterUpdateTimer);
    }
    this.counterUpdateTimer = setTimeout(() => {
        this.updateSidebarCounters();
    }, 300);
}
```

**Decision**: Use direct `updateSidebarCounters()` calls initially
- API is fast enough (<100ms)
- User operations typically spaced >300ms apart
- Can switch to debounced version if performance issues arise

## No Schema Migrations Required

✅ No new tables
✅ No new columns
✅ No new indexes
✅ No new constraints
✅ No data migrations

**Deployment Impact**: Zero downtime, zero schema changes

## Performance Characteristics

### Database Load

**Per Counter Update**:
- 2 SQL queries (tasks count + projects count)
- Both indexed and optimized
- Response time: 5-15ms typical

**Expected Frequency**:
- Average user: 10-50 task operations per session
- Counter updates: 10-50 API calls per session
- Database load: Negligible (well within capacity)

### Frontend Impact

**DOM Updates**:
- 5 `textContent` assignments per update
- No layout recalculation (text-only change)
- No reflows or repaints
- Performance: <1ms

**Network**:
- Request: ~200 bytes
- Response: ~100 bytes
- Total: ~300 bytes per counter update
- Impact: Negligible

## Testing Data Requirements

### Test Scenarios

1. **Empty State**
   - 0 tasks in all lists
   - Expected: All counters show (0)

2. **Mixed State**
   - 5 inbox, 12 actions, 3 projects, 2 follow-up, 8 deferred
   - Expected: Counters match exactly

3. **Large Numbers**
   - 100+ tasks per list
   - Expected: Counters display correctly (no truncation)

4. **Error State**
   - API returns 500
   - Expected: All counters show (?)

5. **Rapid Updates**
   - 10 operations in 5 seconds
   - Expected: Final counts accurate

---

*No database changes required - using existing schema and queries*
