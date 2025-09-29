# API Contracts: Bulk Date Actions

## Frontend Interface Contracts

### generateWeekDaysHTML()
**Description**: Utility function voor genereren dag buttons HTML
**Input**:
```javascript
{
  isForBulk: boolean,      // true = bulk buttons, false = context menu
  currentDate?: Date,      // optional, defaults to new Date()
  targetTaskId?: string    // required voor context menu, ignored voor bulk
}
```

**Output**:
```javascript
{
  html: string,           // HTML string met dag buttons
  dayCount: number,       // aantal extra dagen (exclusief Vandaag/Morgen)
  weekdayNames: string[]  // array van getoonde dag namen
}
```

**Example Output**:
```html
<button onclick="window.bulkDateAction('day-2')" class="bulk-action-btn">Vrijdag</button>
<button onclick="window.bulkDateAction('day-3')" class="bulk-action-btn">Zaterdag</button>
<button onclick="window.bulkDateAction('day-4')" class="bulk-action-btn">Zondag</button>
```

### bulkDateAction() Extended
**Description**: Extended bulk date action handler
**Input**:
```javascript
{
  action: string  // 'vandaag' | 'morgen' | 'day-N' (waar N = days offset)
}
```

**Processing**:
```javascript
// Existing actions
if (action === 'vandaag') dayOffset = 0;
if (action === 'morgen') dayOffset = 1;

// New day pattern actions
if (action.startsWith('day-')) {
  dayOffset = parseInt(action.substring(4));
}
```

**Output**: Standard bulk action result (success/error state)

## UI State Contracts

### Bulk Toolbar State
**Current State**:
```javascript
{
  bulkModus: boolean,
  geselecteerdeTaken: Set<string>,
  availableActions: ['vandaag', 'morgen']  // static
}
```

**New State**:
```javascript
{
  bulkModus: boolean,
  geselecteerdeTaken: Set<string>,
  availableActions: string[],              // dynamic based on current day
  weekdayButtons: Array<{
    action: string,      // 'day-2', 'day-3', etc.
    label: string,       // 'Vrijdag', 'Zaterdag', etc.
    dayOffset: number    // 2, 3, etc.
  }>
}
```

### Day Calculation Contract
**Input**:
```javascript
{
  baseDate: Date,
  dayOffset: number    // 0-6 (0=today, 1=tomorrow, 2+=rest of week)
}
```

**Output**:
```javascript
{
  targetDate: Date,
  isoString: string,   // YYYY-MM-DD format for database
  dayName: string,     // 'Maandag', 'Dinsdag', etc.
  isWeekend: boolean   // future extension possibility
}
```

## Component Interface Contracts

### getBulkVerplaatsKnoppen() Enhanced
**Current Return**:
```javascript
return `
  <button onclick="window.bulkDateAction('vandaag')" class="bulk-action-btn">Vandaag</button>
  <button onclick="window.bulkDateAction('morgen')" class="bulk-action-btn">Morgen</button>
  // ... other static buttons
`;
```

**New Return**:
```javascript
return `
  <button onclick="window.bulkDateAction('vandaag')" class="bulk-action-btn">Vandaag</button>
  <button onclick="window.bulkDateAction('morgen')" class="bulk-action-btn">Morgen</button>
  ${this.generateWeekDaysHTML(true)}
  // ... other static buttons
`;
```

## Error Handling Contracts

### Invalid Day Action
**Input**: `bulkDateAction('day-invalid')`
**Output**:
```javascript
{
  success: false,
  error: 'INVALID_DAY_PATTERN',
  message: 'Ongeldige dag actie: day-invalid'
}
```

### Empty Selection
**Input**: `bulkDateAction('day-3')` met lege selectie
**Output**:
```javascript
{
  success: false,
  error: 'NO_TASKS_SELECTED',
  message: 'Selecteer eerst een of meer taken.'
}
```

### Date Calculation Error
**Input**: Invalid date mathematics
**Output**:
```javascript
{
  success: false,
  error: 'DATE_CALCULATION_ERROR',
  message: 'Fout bij datum berekening'
}
```

## Backward Compatibility Contracts

### Existing API Unchanged
- **Context Menu**: `stelDatumIn(taakId, dayOffset)` blijft ongewijzigd
- **Bulk Actions**: `bulkDateAction('vandaag')` en `bulkDateAction('morgen')` blijven werken
- **CSS Classes**: `.bulk-action-btn` styling blijft compatible

### Progressive Enhancement
- Feature werkt als progressive enhancement
- Bij JavaScript errors: fallback naar bestaande Vandaag/Morgen buttons
- Geen breaking changes voor bestaande functionaliteit

## Testing Contracts

### Unit Test Interfaces
```javascript
// Day calculation tests
expect(calculateDayOffset(new Date('2025-12-31'), 2)).toEqual({
  targetDate: Date('2026-01-02'),
  isoString: '2026-01-02',
  dayName: 'Donderdag'
});

// HTML generation tests
expect(generateWeekDaysHTML(true, new Date('2025-12-29'))).toContain(
  'onclick="window.bulkDateAction(\'day-2\')"'
);
```

### Integration Test Scenarios
1. **Context Menu Parity**: Verify same days appear in context menu and bulk toolbar
2. **Week Boundary**: Test Sunday (no extra days) vs Monday (full week)
3. **Bulk Operation**: Select tasks → click generated day button → verify date updates

## Performance Contracts

### Response Time Targets
- **Day Calculation**: < 1ms per calculation
- **HTML Generation**: < 5ms for full week
- **Bulk Date Update**: < 200ms for 20 taken
- **UI Refresh**: < 100ms na bulk operation

### Memory Usage
- **Day Buttons**: < 1KB extra HTML per toolbar
- **State Management**: Geen significante memory overhead
- **Calculation Cache**: Optioneel, huidige datum changes infrequent