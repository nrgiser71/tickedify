# Data Model: Bulk Bewerken Dagen van de Week

## Entity Analysis

### No New Entities Required

Dit feature vereist geen nieuwe database entities of schema wijzigingen. Het werkt met bestaande data structuren.

## Existing Data Structures

### Taak Entity (existing)
**Description**: Bestaande taak structuur in PostgreSQL database
**Key Attributes**:
- `id` - Unique identifier
- `tekst` - Taak beschrijving
- `datum` - Verschijndatum (wordt gemanipuleerd door bulk actions)
- `lijst` - Huidige lijst locatie (acties, inbox, etc.)
- `project` - Project associatie
- `context` - Context tag

**State Transitions**:
- Bulk date action: `datum` field wordt bijgewerkt voor meerdere taken tegelijk
- Lijst verplaatsing: `lijst` field wordt gewijzigd

### UI State (existing)
**Description**: Frontend state management voor bulk mode
**Key Attributes**:
- `bulkModus` (boolean) - Is bulk mode actief
- `geselecteerdeTaken` (Set) - IDs van geselecteerde taken
- `huidigeLijst` (string) - Huidige lijst context

## Data Flow

### Bulk Date Action Flow
1. **Input**: User selecteert taken + klikt dag button
2. **Validation**: Check geselecteerdeTaken.size > 0
3. **Calculation**: Bereken target datum op basis van dag offset
4. **Update**: Batch update van taak.datum voor alle geselecteerde taken
5. **Response**: Success/failure feedback + UI refresh

### Day Calculation Logic
**Input**:
- Current date (Date object)
- Day offset (integer: 0=vandaag, 1=morgen, 2+=remaining days)

**Processing**:
```javascript
const targetDate = new Date(currentDate);
targetDate.setDate(currentDate.getDate() + dayOffset);
```

**Output**: ISO date string voor database storage

## Validation Rules

### Business Rules
- **FR-001**: Day buttons alleen tonen voor dagen na "morgen" tot einde van week
- **FR-002**: Vandaag/Morgen altijd tonen ongeacht huidige dag
- **FR-003**: Zelfde dag logic als context menu (exact match vereist)

### Technical Constraints
- **TC-001**: Maximum 8 day buttons total (Vandaag + Morgen + 6 weekdagen)
- **TC-002**: Date calculations moeten timezone-safe zijn
- **TC-003**: Batch updates moeten atomair zijn (all-or-nothing)

## Data Relationships

### No New Relationships
Feature gebruikt bestaande relaties tussen taken en lijsten. Geen nieuwe foreign keys of joins vereist.

### Existing Relationships (unchanged)
- Taak → Project (many-to-one)
- Taak → Context (many-to-one)
- Taak → Lijst (enum: acties, inbox, opvolgen, uitgesteld-*)

## Performance Considerations

### Query Patterns
- **Batch Updates**: Single UPDATE query voor multiple task IDs
- **Read Operations**: Geen wijziging in bestaande queries
- **Index Usage**: Existing indexes op datum/lijst blijven relevant

### Scalability
- **Current Scale**: Single-user app, ~100-1000 taken typical
- **Bulk Limits**: No hard limits, practical limit ~50 taken per bulk action
- **Response Time**: Target <200ms voor bulk date updates

## Error Handling

### Data Validation
- **Invalid Date**: Reject date calculations die invalid dates produceren
- **Empty Selection**: Graceful handling van lege taak selectie
- **Database Errors**: Rollback bij partial failure in batch updates

### Recovery Scenarios
- **Network Failure**: Retry logic voor API calls
- **Concurrent Updates**: Optimistic locking niet vereist (single user)
- **State Corruption**: UI refresh als fallback

## Migration Strategy

### No Migration Required
Feature gebruikt bestaande database schema zonder wijzigingen. Deployment is een frontend-only update.

### Backwards Compatibility
- **API Compatibility**: Geen wijziging in bestaande endpoints
- **Data Compatibility**: Geen wijziging in data formaten
- **UI Compatibility**: Additive changes alleen, geen breaking changes