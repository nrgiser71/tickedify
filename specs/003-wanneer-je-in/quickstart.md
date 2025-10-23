# Quickstart: Bulk Bewerken Dagen van de Week

## Implementatie Test Scenario

### Setup Verificatie

1. **Open Tickedify applicatie**:
   ```
   Browser: https://tickedify.com/app
   Login: jan@buskens.be / qyqhut-muDvop-fadki9
   ```

2. **Navigeer naar Acties scherm**:
   - Klik "Acties" in sidebar
   - Verificeer taken zijn zichtbaar

3. **Test huidige bulk functionaliteit**:
   - Klik "Bulk bewerken" knop
   - Verificeer alleen "Vandaag" en "Morgen" buttons zichtbaar zijn

### Feature Implementation Verificatie

#### Test 1: Context Menu Referentie (Woensdag)
**Gegeven**: Het is woensdag
**Wanneer**:
1. Rechtsklik op een taak in acties lijst
2. Bekijk datum opties in context menu

**Verwacht**:
- Vandaag, Morgen, Vrijdag, Zaterdag, Zondag buttons
- **Note**: Dit is de referentie implementatie

#### Test 2: Bulk Toolbar Na Implementatie (Woensdag)
**Gegeven**: Het is woensdag
**Wanneer**:
1. Klik "Bulk bewerken"
2. Selecteer een of meer taken
3. Bekijk beschikbare datum buttons

**Verwacht** (na implementatie):
- Vandaag, Morgen, Vrijdag, Zaterdag, Zondag buttons
- **Identiek aan context menu van Test 1**

#### Test 3: Day-of-Week Variations
**Test verschillende dagen**:
```
Maandag → Verwacht: Vandaag, Morgen, Woensdag, Donderdag, Vrijdag, Zaterdag, Zondag
Dinsdag → Verwacht: Vandaag, Morgen, Donderdag, Vrijdag, Zaterdag, Zondag
Woensdag → Verwacht: Vandaag, Morgen, Vrijdag, Zaterdag, Zondag
Donderdag → Verwacht: Vandaag, Morgen, Zaterdag, Zondag
Vrijdag → Verwacht: Vandaag, Morgen, Zondag
Zaterdag → Verwacht: Vandaag, Morgen, Zondag
Zondag → Verwacht: Vandaag, Morgen (geen extra dagen)
```

#### Test 4: Bulk Date Action Functionality
**Gegeven**: Woensdag met meerdere geselecteerde taken
**Wanneer**:
1. Selecteer 3 taken in bulk mode
2. Klik "Vrijdag" button

**Verwacht**:
- Alle 3 taken krijgen vrijdag als verschijndatum
- Success toast notification
- Taken verdwijnen uit acties lijst (verschijnen vrijdag)
- Bulk mode blijft actief voor verdere bewerkingen

#### Test 5: Error Handling
**Test 5a - Geen selectie**:
1. Activeer bulk mode
2. Klik dag button zonder taken te selecteren
3. Verwacht: Warning toast "Selecteer eerst een of meer taken"

**Test 5b - Edge cases**:
1. Test op zondag (geen extra dag buttons)
2. Test date calculation around month/year boundaries
3. Verificeer geen JavaScript errors in console

### Acceptance Criteria Verificatie

#### FR-001: Context Menu Consistency
```
Test: Open context menu en bulk toolbar op zelfde dag
Verificatie: Identieke dag buttons in beide interfaces
```

#### FR-002: Vandaag/Morgen Always Present
```
Test: Alle dagen van de week
Verificatie: Vandaag en Morgen altijd zichtbaar, ongeacht huidige dag
```

#### FR-003: Dynamic Week Days
```
Test: Verschillende dagen van de week
Verificatie: Alleen resterende dagen van huidige week getoond
```

#### FR-004: Correct Date Updates
```
Test: Bulk actie naar gekozen dag
Verificatie: Taken krijgen correct datum toegewezen
Database verificatie: datum field correct bijgewerkt
```

### Performance Testing

#### Responsiveness Test
1. Selecteer 20 taken
2. Klik dag button
3. **Verwacht**: < 200ms response tijd
4. **Verificatie**: UI geeft onmiddellijke feedback

#### UI Fluidity Test
1. Toggle bulk mode aan/uit snel achter elkaar
2. **Verwacht**: Geen flickering of layout shifts
3. **Verificatie**: Smooth transitions

### Edge Case Testing

#### Timezone Testing
```javascript
// Test date calculations around daylight savings
// Test around midnight boundary conditions
// Verify consistent behavior across timezones
```

#### Large Selection Testing
```
1. Selecteer 50+ taken (if available)
2. Perform bulk date action
3. Verify all tasks updated correctly
4. Check performance remains acceptable
```

### Rollback Plan

#### If Implementation Fails
1. **Immediate**: Comment out new day generation code
2. **Fallback**: Return to hardcoded Vandaag/Morgen only
3. **Verification**: Existing bulk functionality still works

#### Minimal Working State
```javascript
// Emergency fallback in getBulkVerplaatsKnoppen()
if (this.huidigeLijst === 'acties') {
    return `
        <button onclick="window.bulkDateAction('vandaag')" class="bulk-action-btn">Vandaag</button>
        <button onclick="window.bulkDateAction('morgen')" class="bulk-action-btn">Morgen</button>
        <!-- New code commented out -->
    `;
}
```

## Success Criteria

### Must Pass
- [x] Context menu and bulk toolbar show identical day options
- [x] All days of week testing pass
- [x] Bulk date actions work correctly
- [x] No JavaScript errors in console
- [x] Performance < 200ms for bulk operations

### Should Pass
- [x] Smooth UI transitions
- [x] Mobile/tablet compatibility maintained
- [x] Large selection handling (20+ tasks)

### Nice to Have
- [x] Timezone robustness
- [x] Month/year boundary handling
- [x] Graceful degradation on errors

## Deployment Verification

1. **Pre-deployment**: Run all tests on development environment
2. **Deployment**: Standard git commit + push to Vercel
3. **Post-deployment**: Run quickstart tests on production
4. **User Acceptance**: Verify with user on different days of week

## Documentation Update

After successful implementation:
1. Update CLAUDE.md with new bulk functionality
2. Add to changelog.html with version number
3. Update any user-facing documentation