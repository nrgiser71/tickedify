# Research: Bulk Actie Datum Knoppen Uitbreiden

**Feature**: 005-in-het-acties
**Date**: 2025-10-06

## Research Questions

### Q1: Hoe werkt de huidige weekdag logica in het 3-puntjes menu?

**Decision**: Hergebruik bestaande `toonActiesMenu()` weekdag berekening logica

**Rationale**:
- Bestaande logica in app.js:4309-4322 berekent correct resterende weekdagen
- Gebruikt `getDay()` (0=zondag, 1=maandag, ..., 6=zaterdag)
- Loop van i=2 tot `dagenTotZondag` genereert weekdag knoppen
- Nederlandse dag namen array: `['Zondag', 'Maandag', ..., 'Zaterdag']`
- Callback: `stelDatumIn(taakId, dagenOffset)` voor individuele taken

**Alternatives considered**:
- Nieuwe datum berekening implementeren → Afgewezen: violates DRY principe
- Moment.js of date-fns library toevoegen → Afgewezen: overkill voor simpele weekdag berekening
- Externe API voor datum logica → Afgewezen: onnodige dependency en latency

**Code referentie**:
```javascript
// app.js:4309-4322
const vandaag = new Date();
const weekdag = vandaag.getDay(); // 0 = zondag, 1 = maandag, etc.
const dagenVanDeWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

let weekdagenHTML = '';
const dagenTotZondag = weekdag === 0 ? 0 : (7 - weekdag);

for (let i = 2; i <= dagenTotZondag; i++) {
    const datum = new Date(vandaag);
    datum.setDate(datum.getDate() + i);
    const dagNaam = dagenVanDeWeek[datum.getDay()];
    weekdagenHTML += `<button onclick="app.stelDatumIn('${taakId}', ${i})" class="menu-item">${dagNaam}</button>`;
}
```

### Q2: Hoe werkt de huidige bulk datum actie implementatie?

**Decision**: Refactor `getBulkVerplaatsKnoppen()` om weekdag logica te integreren

**Rationale**:
- Huidige implementatie (app.js:11900-11940) toont alleen "Vandaag" en "Morgen"
- `bulkDateAction()` functie bestaat al en roept `bulkUpdateDates()` aan
- Bulk update flow: itereer geselecteerde taken → update verschijndatum → reload lijst
- Moet nieuwe weekdag knoppen toevoegen tussen "Morgen" en "Opvolgen" knoppen

**Alternatives considered**:
- Volledig nieuwe bulk actie systeem → Afgewezen: bestaande flow werkt goed
- Aparte functie voor weekdag bulk acties → Afgewezen: dupliceert bestaande bulkDateAction
- Inline HTML in getBulkVerplaatsKnoppen → Geaccepteerd: consistent met huidige pattern

**Bestaande bulk flow**:
1. User klikt bulk weekdag knop → `bulkDateAction(dagOffset)`
2. `bulkDateAction()` roept `bulkUpdateDates(dagenOffset)` aan
3. `bulkUpdateDates()` itereert `geselecteerdeTaken` Set
4. Voor elke taak: bereken nieuwe datum, roep `/api/taak/:id` PUT endpoint aan
5. Toast success message, deactiveer bulk modus, reload lijst

### Q3: Welke edge cases moeten afgehandeld worden?

**Decision**: Volg exact dezelfde edge case handling als individuele taak menu

**Rationale**:
- Zondag scenario: `dagenTotZondag = 0`, geen weekdag loop, alleen "Vandaag"/"Morgen"
- Zaterdag scenario: `dagenTotZondag = 1`, loop genereert alleen "Zondag" knop
- Maandag scenario: `dagenTotZondag = 6`, loop genereert di/wo/do/vr/za/zo knoppen
- Datum wisseling tijdens sessie: knoppen blijven consistent (berekend bij render)

**Alternatives considered**:
- Speciale handling voor weekend → Afgewezen: bestaande logica handled dit al correct
- Timezone compensatie → Afgewezen: lokale browser tijd is voldoende accuraat
- Automatische refresh bij dag wisseling → Afgewezen: buiten scope, geen user complaint

### Q4: Welke testing strategie is nodig?

**Decision**: Manual browser testing + Playwright automation voor alle weekdag scenario's

**Rationale**:
- Tickedify gebruikt tickedify-testing agent voor Playwright end-to-end tests
- Test matrix: maandag/vrijdag/zaterdag/zondag bulk modus activatie
- Verify: correcte knoppen verschijnen, bulk actie updates alle taken, lijst reload werkt
- Staging first: test op dev.tickedify.com voordat productie deployment

**Test scenarios**:
1. Maandag 09:00 → bulk modus → verify 7 weekdag knoppen (vandaag t/m zondag)
2. Vrijdag 15:00 → bulk modus → verify 3 weekdag knoppen (vandaag, morgen, zondag)
3. Zondag 20:00 → bulk modus → verify 2 knoppen (vandaag, morgen) - geen weekdagen
4. Selecteer 5 taken → klik "Donderdag" → verify alle 5 taken hebben donderdag datum
5. Na bulk actie → verify bulk modus gedeactiveerd, lijst herladen, taken op juiste positie

**Alternatives considered**:
- Unit tests voor datum logica → Afgewezen: geen test framework setup in Tickedify
- Jest + jsdom voor frontend testing → Afgewezen: te veel setup overhead voor kleine feature
- Manual testing only → Afgewezen: regressions detection vereist automation

## Technical Dependencies

### Bestaande Code Locaties

**File**: `public/app.js` (~11,900 regels)

**Functies om te wijzigen**:
- `getBulkVerplaatsKnoppen()` (regel 11900) - weekdag knoppen toevoegen
- Hergebruik weekdag berekening logica van `toonActiesMenu()` (regel 4309)

**Functies om te hergebruiken**:
- `bulkDateAction(dagOffset)` - bestaande bulk datum handler
- `bulkUpdateDates(dagenOffset)` - bestaande bulk update implementatie
- `stelDatumIn(taakId, dagenOffset)` - individuele datum update (reference)

**Geen nieuwe dependencies**: Pure vanilla JavaScript, geen libraries nodig

### Browser Compatibility

**Target browsers**:
- Chrome/Edge 90+ (primair development browser)
- Safari 14+ (macOS/iOS)
- Firefox 88+

**JavaScript features gebruikt**:
- `Date()` object - universeel ondersteund
- Template literals - ES6, goed ondersteund
- Array methods - standaard
- DOM manipulation - standaard

**Geen compatibility issues verwacht** - alle gebruikte features zijn breed ondersteund

## Performance Considerations

### Rendering Performance

**Analyse**:
- Weekdag knoppen generatie: O(7) max iterations (maandag scenario)
- String concatenation voor HTML: negligible performance impact
- DOM insertion: bulk toolbar is al in DOM, alleen innerHTML update
- Geen re-renders van hele lijst: bulk toolbar is geïsoleerd component

**Expected impact**: <5ms extra rendering tijd voor bulk toolbar

### Network Impact

**Analyse**: Geen - dit is pure frontend UI wijziging
- Geen extra API calls
- Geen database queries
- Bestaande bulk update API blijft ongewijzigd

### Memory Impact

**Analyse**: Negligible
- 5-7 extra DOM button elements (max 50 bytes elk)
- Geen nieuwe event listeners (onclick inline attributes)
- Geen nieuwe data structures in JavaScript

## Implementation Approach

### Code Reuse Strategy

**Extract weekdag logica naar herbruikbare functie**:

```javascript
// Nieuwe helper functie in Taakbeheer class
getWeekdagKnoppen(dagenOffset = 0, onclickCallback) {
    const vandaag = new Date();
    const weekdag = vandaag.getDay();
    const dagenVanDeWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

    let weekdagenHTML = '';
    const dagenTotZondag = weekdag === 0 ? 0 : (7 - weekdag);

    for (let i = 2; i <= dagenTotZondag; i++) {
        const datum = new Date(vandaag);
        datum.setDate(datum.getDate() + i);
        const dagNaam = dagenVanDeWeek[datum.getDay()];
        weekdagenHTML += `<button ${onclickCallback(i)} class="menu-item">${dagNaam}</button>`;
    }

    return weekdagenHTML;
}
```

**Update getBulkVerplaatsKnoppen()**:
```javascript
getBulkVerplaatsKnoppen() {
    if (this.huidigeLijst === 'acties') {
        const weekdagenHTML = this.getWeekdagKnoppen(0, (i) =>
            `onclick="window.bulkDateAction(${i})"`
        );

        return `
            <button onclick="window.bulkDateAction(0)" class="bulk-action-btn">Vandaag</button>
            <button onclick="window.bulkDateAction(1)" class="bulk-action-btn">Morgen</button>
            ${weekdagenHTML}
            <button onclick="window.bulkVerplaatsNaar('opvolgen')" class="bulk-action-btn">Opvolgen</button>
            ...
        `;
    }
    ...
}
```

**Update toonActiesMenu()** om dezelfde helper te gebruiken:
```javascript
// app.js:4324-4329 - refactor to use getWeekdagKnoppen()
const weekdagenHTML = this.getWeekdagKnoppen(0, (i) =>
    `onclick="app.stelDatumIn('${taakId}', ${i})"`
);
```

### Testing Strategy Details

**Manual test protocol**:
1. Checkout branch `005-in-het-acties`
2. Deploy naar dev.tickedify.com (staging)
3. Login met jan@buskens.be credentials
4. Navigeer naar Acties lijst
5. Activeer bulk modus
6. Verify weekdag knoppen correct voor huidige dag
7. Test alle scenarios (zie Q4)
8. Verify geen regressions in individuele taak menu

**Playwright automation script** (via tickedify-testing agent):
```javascript
// Test: Maandag bulk weekdag knoppen
test('Bulk modus toont alle weekdagen op maandag', async ({ page }) => {
    // Mock Date to Monday
    await page.addInitScript(() => {
        Date = class extends Date {
            constructor() { return new Date('2025-10-06T10:00:00'); } // Monday
        };
    });

    await page.goto('https://dev.tickedify.com/app');
    await page.click('[data-lijst="acties"]');
    await page.click('#bulk-mode-toggle');

    // Verify 7 weekdag knoppen
    await expect(page.locator('.bulk-action-btn:has-text("Vandaag")')).toBeVisible();
    await expect(page.locator('.bulk-action-btn:has-text("Morgen")')).toBeVisible();
    await expect(page.locator('.bulk-action-btn:has-text("Woensdag")')).toBeVisible();
    await expect(page.locator('.bulk-action-btn:has-text("Donderdag")')).toBeVisible();
    await expect(page.locator('.bulk-action-btn:has-text("Vrijdag")')).toBeVisible();
    await expect(page.locator('.bulk-action-btn:has-text("Zaterdag")')).toBeVisible();
    await expect(page.locator('.bulk-action-btn:has-text("Zondag")')).toBeVisible();
});
```

## Risks & Mitigations

### Risk 1: Code refactoring breekt bestaande functionaliteit

**Impact**: Individuele taak menu stopt met werken
**Probability**: Medium
**Mitigation**:
- Thorough testing van individuele taak menu na refactoring
- Keep refactoring minimal - extract helper function only
- Regression test alle weekdag scenarios

### Risk 2: Edge case niet correct afgehandeld

**Impact**: Verkeerde knoppen tonen op specifieke dagen
**Probability**: Low (logica is getest in bestaande menu)
**Mitigation**:
- Test matrix met alle 7 weekdagen
- Playwright automation catches edge cases
- Staging deployment first

### Risk 3: Deployment breaks production

**Impact**: Beta user experience degraded
**Probability**: Very Low
**Mitigation**:
- Mandatory staging test op dev.tickedify.com
- Explicit approval required voor productie deployment
- Feature is additive - geen breaking changes

## Research Conclusion

**All technical unknowns resolved** ✅

**No NEEDS CLARIFICATION remaining** ✅

**Ready for Phase 1 (Design & Contracts)** ✅

**Key findings**:
1. Bestaande weekdag logica is solid en herbruikbaar
2. Minimal code changes vereist - extract helper function + update getBulkVerplaatsKnoppen
3. Geen nieuwe dependencies of architectuur wijzigingen
4. Playwright testing via tickedify-testing agent is adequate strategie
5. Frontend-only wijziging - geen backend/database impact
