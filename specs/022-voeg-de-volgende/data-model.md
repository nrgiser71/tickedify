# Data Model: Sidebar Taak Tellers

## Overzicht
Deze feature introduceert GEEN nieuwe database entities. Het gebruikt bestaande `taken` tabel data en voegt een aggregatie API toe.

## Bestaande Entities (Gebruikt)

### Task (taken tabel)
**Relevante Velden**:
```typescript
interface Task {
  id: number;              // Primary key
  lijst: string;           // 'inbox' | 'acties' | 'opvolgen' | 'uitgesteld-YYYY-MM-DD'
  status: string;          // 'actief' | 'afgewerkt' | 'uitgesteld'
  project_id: number | null; // Reference naar projecten tabel
  user_id: number;         // User ownership
  // ... andere velden niet relevant voor counters
}
```

**Filtering Rules voor Counters**:
1. **Inbox**: `lijst = 'inbox' AND status = 'actief'`
2. **Acties**: `lijst = 'acties' AND status = 'actief'`
3. **Projecten**: `project_id IS NOT NULL AND status = 'actief'`
4. **Opvolgen**: `lijst = 'opvolgen' AND status = 'actief'`
5. **Uitgesteld**: `lijst LIKE 'uitgesteld-%' AND status = 'actief'`

**Belangrijke Constraint**: Alleen taken met `status = 'actief'` tellen mee (geen afgewerkte taken)

## API Data Structures

### SidebarCounts (Response Object)
```typescript
interface SidebarCounts {
  inbox: number;      // Count van inbox taken
  acties: number;     // Count van acties taken
  projecten: number;  // Count van taken met project_id
  opvolgen: number;   // Count van opvolgen taken
  uitgesteld: number; // Count van uitgestelde taken (alle datums)
}
```

**Voorbeeld Response**:
```json
{
  "inbox": 12,
  "acties": 8,
  "projecten": 15,
  "opvolgen": 3,
  "uitgesteld": 5
}
```

**Validatie Rules**:
- Alle values moeten >= 0 zijn (non-negative integers)
- Response is ALTIJD compleet (alle 5 velden aanwezig)
- Bij error: return 500 status (client toont fallback "(?)")

## State Transitions

### Counter Update Flow
```
User Action (create/delete/move/complete)
    ↓
JavaScript functie voltooit
    ↓
updateSidebarCounters() aangeroepen (debounced 300ms)
    ↓
GET /api/counts/sidebar
    ↓
Receive SidebarCounts object
    ↓
Update DOM voor alle 5 counters
```

### Error States
```
API Call Fails
    ↓
Catch error in frontend
    ↓
Display "(?) " in alle counters
    ↓
Schedule retry na 5 seconden
    ↓
Na 3 failed retries: stop retry, blijf "(?) " tonen
```

## Data Integrity Constraints

### Database Level
- `status` kolom heeft beperkte values (via CHECK constraint indien aanwezig)
- `user_id` is REQUIRED - counters zijn altijd user-specific
- `lijst` waarden volgen conventie: lowercase, geen spaties

### Application Level
- Counter updates zijn **eventually consistent** (niet transactioneel)
- Bij concurrent updates: laatste API call wint (acceptabel voor single-user beta)
- Geen optimistic updates - altijd server als source of truth

## Performance Considerations

### Query Optimization
```sql
-- Efficient single query voor alle counts
SELECT
  COUNT(CASE WHEN lijst = 'inbox' AND status = 'actief' THEN 1 END) as inbox,
  COUNT(CASE WHEN lijst = 'acties' AND status = 'actief' THEN 1 END) as acties,
  COUNT(CASE WHEN project_id IS NOT NULL AND status = 'actief' THEN 1 END) as projecten,
  COUNT(CASE WHEN lijst = 'opvolgen' AND status = 'actief' THEN 1 END) as opvolgen,
  COUNT(CASE WHEN lijst LIKE 'uitgesteld-%' AND status = 'actief' THEN 1 END) as uitgesteld
FROM taken
WHERE user_id = $1;
```

**Index Requirements**:
- Existing indexes op `user_id`, `lijst`, `status` zijn voldoende
- Query scant max 1x door user's taken (efficient voor <10k taken)

### Caching Strategy
**Geen server-side caching** - redenen:
1. Data wijzigt frequent (bij elke taak operatie)
2. Query is fast genoeg (<50ms voor typische user)
3. Single-user context maakt caching invalidatie complex
4. Simplicity > premature optimization

## Relationships Met Bestaande Features

### Impacted by Counter Updates
1. **Task Creation** - Incrementeert relevante counter
2. **Task Deletion** - Decrementeert relevante counter
3. **Task Move** - Decrementeert oude lijst, incrementeert nieuwe lijst
4. **Task Completion** - Decrementeert counter (status wordt 'afgewerkt')
5. **Bulk Operations** - Multiple counters kunnen wijzigen
6. **Project Assignment** - Kan Projecten counter beïnvloeden

### Not Impacted By
- Dagelijkse planning (planning is aparte view, geen lijst wijziging)
- Subtaken (subtaken zijn geen top-level taken)
- Context wijzigingen (context is apart van lijst/status)

## Migration & Rollback

### Deployment
**Geen database migratie nodig** - gebruikt bestaande schema

**Rollout Steps**:
1. Deploy nieuwe API endpoint (`GET /api/counts/sidebar`)
2. Deploy frontend wijzigingen (sidebar HTML + JavaScript)
3. Test counters op staging
4. Deploy naar productie

### Rollback
**Simple rollback** - verwijder:
1. Frontend: `<span class="task-count">` elements uit HTML
2. Frontend: `updateSidebarCounters()` function calls
3. Backend: Route handler voor `/api/counts/sidebar`

**Geen data cleanup nodig** - feature voegt geen data toe

## Testing Data Scenarios

### Test Case Data Sets
```javascript
// Scenario 1: Empty state
{ inbox: 0, acties: 0, projecten: 0, opvolgen: 0, uitgesteld: 0 }

// Scenario 2: Typical workload
{ inbox: 12, acties: 8, projecten: 15, opvolgen: 3, uitgesteld: 5 }

// Scenario 3: Single category heavy
{ inbox: 50, acties: 2, projecten: 1, opvolgen: 0, uitgesteld: 0 }

// Scenario 4: After bulk move
Before: { inbox: 20, acties: 5, ... }
After:  { inbox: 10, acties: 15, ... }

// Scenario 5: Task completion
Before: { acties: 8, ... }
After:  { acties: 7, ... }
```

## Acceptance Criteria Mapping

| Requirement | Data Validation |
|-------------|-----------------|
| FR-001: Display counts | SidebarCounts heeft alle 5 velden |
| FR-003: Reflect actual count | SQL query count matches werkelijk aantal |
| FR-006: Always accurate | Debounce prevents missed updates |
| FR-010: Only active tasks | WHERE status = 'actief' in query |

## Open Questions (None)
Alle data modeling vragen zijn opgelost in research fase.
