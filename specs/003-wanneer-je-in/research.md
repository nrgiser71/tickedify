# Research: Bulk Bewerken Dagen van de Week

## Feature Analysis

### Existing Context Menu Implementation
**Location**: `public/app.js` - Context menu handler in `toonActieMenu()` function

**Current Logic**:
```javascript
const vandaag = new Date();
const weekdag = vandaag.getDay(); // 0 = zondag, 1 = maandag, etc.
const dagenVanDeWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

// Genereer de rest van de week dagen
let weekdagenHTML = '';
const dagenTotZondag = weekdag === 0 ? 0 : (7 - weekdag);

for (let i = 2; i <= dagenTotZondag; i++) {
    const datum = new Date(vandaag);
    datum.setDate(datum.getDate() + i);
    const dagNaam = dagenVanDeWeek[datum.getDay()];
    weekdagenHTML += `<button onclick="app.stelDatumIn('${taakId}', ${i})" class="menu-item">${dagNaam}</button>`;
}
```

### Current Bulk Implementation
**Location**: `public/app.js` - `getBulkVerplaatsKnoppen()` function

**Current Logic** (problematic):
```javascript
if (this.huidigeLijst === 'acties') {
    return `
        <button onclick="window.bulkDateAction('vandaag')" class="bulk-action-btn">Vandaag</button>
        <button onclick="window.bulkDateAction('morgen')" class="bulk-action-btn">Morgen</button>
        // ... hardcoded zonder dagen van de week
    `;
}
```

## Technical Decisions

### Decision: Reuse Context Menu Logic
**Rationale**:
- Context menu already implements perfect day-of-week calculation
- User expectation is identical behavior between both interfaces
- Avoid code duplication and inconsistencies

**Implementation Strategy**:
- Extract day-of-week calculation into reusable utility function
- Modify `getBulkVerplaatsKnoppen()` to call same logic as context menu
- Maintain same order: Vandaag, Morgen, [remaining days]

### Decision: Minimal Code Changes
**Rationale**:
- Feature is a simple consistency fix, not architectural change
- Risk mitigation - minimal surface area for bugs
- Faster implementation and testing

**Approach**:
- Create `generateWeekDaysHTML()` utility function
- Replace hardcoded buttons with dynamic generation
- Keep existing bulk action handlers (`bulkDateAction()`)

### Decision: Preserve Existing Styling
**Rationale**:
- Bulk toolbar already has responsive design
- CSS classes `.bulk-action-btn` work with additional buttons
- No visual disruption for users

## Implementation Pattern

### Utility Function Pattern
```javascript
generateWeekDaysHTML(isForBulk = false) {
    const vandaag = new Date();
    const weekdag = vandaag.getDay();
    const dagenVanDeWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

    let html = '';
    const dagenTotZondag = weekdag === 0 ? 0 : (7 - weekdag);

    for (let i = 2; i <= dagenTotZondag; i++) {
        const datum = new Date(vandaag);
        datum.setDate(datum.getDate() + i);
        const dagNaam = dagenVanDeWeek[datum.getDay()];

        if (isForBulk) {
            html += `<button onclick="window.bulkDateAction('day-${i}')" class="bulk-action-btn">${dagNaam}</button>`;
        } else {
            html += `<button onclick="app.stelDatumIn('${taakId}', ${i})" class="menu-item">${dagNaam}</button>`;
        }
    }

    return html;
}
```

### Bulk Action Handler Extension
Extend `bulkDateAction()` to handle new day patterns:
- 'vandaag' → existing
- 'morgen' → existing
- 'day-2', 'day-3', etc. → new patterns

## Edge Cases Identified

### Weekend Boundaries
- Sunday (day 0): Should show no additional days (only Vandaag, Morgen)
- Monday (day 1): Should show Dinsdag through Zondag (6 days)
- Saturday (day 6): Should show only Zondag (1 day)

### Dynamic Button Count
- Responsive design must handle variable button count (2-8 total buttons)
- CSS grid/flexbox should accommodate gracefully

### Date Calculation Consistency
- Both systems must use identical date arithmetic
- No timezone issues between context menu and bulk operations

## Testing Strategy

### Manual Test Cases
1. **Wednesday Test**: Verify Vandaag, Morgen, Vrijdag, Zaterdag, Zondag appear
2. **Monday Test**: Verify full week shows (Dinsdag through Zondag)
3. **Sunday Test**: Verify only Vandaag, Morgen show
4. **Comparison Test**: Context menu vs bulk buttons on same day must be identical

### Visual Regression
- Bulk toolbar layout remains intact
- Button spacing and responsiveness preserved
- Mobile/tablet compatibility maintained

## Dependencies

### No External Dependencies
- Feature uses existing JavaScript Date APIs
- No new libraries or frameworks required
- No database schema changes needed

### Internal Dependencies
- Existing `bulkDateAction()` function (extend but don't break)
- Existing CSS classes `.bulk-action-btn` (reuse)
- Existing date manipulation utilities in app.js

## Conclusion

This is a straightforward consistency fix that extends existing, proven logic to the bulk interface. The pattern is well-established, edge cases are understood, and implementation risk is minimal.