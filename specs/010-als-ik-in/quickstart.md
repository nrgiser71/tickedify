# Quickstart: Ctrl-toets uitbreiding voor extra week in drag popup

**Feature**: 010-als-ik-in
**Date**: 2025-10-10
**Purpose**: Handmatige test scenario's voor feature validatie

## Prerequisite Setup

**Environment**: Productie (tickedify.com/app)
**Browser**: Chrome, Firefox, of Safari (desktop)
**Test Account**: jan@buskens.be / qyqhut-muDvop-fadki9

**Initial State**:
1. Log in op Tickedify productie
2. Navigeer naar **Acties** lijst (sidebar)
3. Zorg dat er minimaal 3 acties in de lijst staan
4. Acties moeten draggable zijn (check dat drag handle zichtbaar is)

---

## Test Scenario 1: Basic Ctrl Toggle tijdens Drag

**Acceptance Criteria**: FR-001, FR-002, FR-003

**Steps**:
1. Open Acties lijst
2. Klik en sleep een actie (drag operatie start)
3. **Expected**: Floating panel verschijnt met 2 rijen dagen (huidige week + volgende week)
4. **Tijdens drag**: Druk Ctrl-toets in en houd vast
5. **Expected**: Derde rij met 7 dagen verschijnt onder de bestaande 2 rijen
6. **Tijdens drag**: Laat Ctrl-toets los
7. **Expected**: Derde rij verdwijnt, alleen 2 rijen blijven zichtbaar
8. Laat drag los (cancel of drop op lijst)

**Success Criteria**:
- ✅ Derde week rij verschijnt smooth (geen flicker) bij Ctrl indrukken
- ✅ Derde week rij verdwijnt smooth bij Ctrl loslaten
- ✅ Panel layout blijft stabiel (geen jumps of size changes in week 1 en 2)
- ✅ Dag labels zijn correct (weekdag afkorting + datum nummer)

---

## Test Scenario 2: Meerdere Ctrl Toggles tijdens Eén Drag

**Acceptance Criteria**: FR-007 (real-time reactie), Edge Case handling

**Steps**:
1. Start drag operatie van een actie
2. Druk Ctrl in → derde week verschijnt
3. Laat Ctrl los → derde week verdwijnt
4. Druk Ctrl in → derde week verschijnt
5. Laat Ctrl los → derde week verdwijnt
6. Herhaal 2-3x snel achter elkaar
7. Laat drag los

**Success Criteria**:
- ✅ Elke Ctrl toggle triggert immediate UI update (<50ms response)
- ✅ Geen visual glitches bij rapid toggling
- ✅ Derde week datums blijven consistent bij elke toggle
- ✅ Drag operatie blijft intact (niet onderbroken door keyboard events)

---

## Test Scenario 3: Drop op Derde Week Datum

**Acceptance Criteria**: FR-005 (drop functionaliteit op week 3)

**Steps**:
1. Start drag operatie van een actie
2. Druk Ctrl in → derde week verschijnt
3. Sleep muiscursor over een dag in de derde week rij
4. **Expected**: Dag zone highlight (hover effect)
5. Laat actie los op die dag
6. **Expected**: Actie wordt gepland voor die datum, popup sluit
7. Verifieer in acties lijst: actie heeft correcte datum (ISO format check)

**Success Criteria**:
- ✅ Dag zones in week 3 zijn interactive (hover state werkt)
- ✅ Drop event wordt correct afgehandeld
- ✅ Actie krijgt datum toegewezen van week 3 dag (14-20 dagen in toekomst)
- ✅ Floating panel sluit na succesvolle drop

**Date Calculation Verification**:
- Week 3 dag 1 (maandag) = vandaag + 14 dagen
- Week 3 dag 7 (zondag) = vandaag + 20 dagen
- Controleer via browser console of database query:
  ```sql
  SELECT naam, datum FROM taken WHERE naam = '[test actie naam]';
  ```

---

## Test Scenario 4: Backward Compatibility zonder Ctrl

**Acceptance Criteria**: FR-008 (bestaande functionaliteit behouden)

**Steps**:
1. Start drag operatie **zonder** Ctrl in te drukken
2. **Expected**: Alleen 2 weken zichtbaar (huidige + volgende)
3. Sleep over dag in week 1 en drop
4. **Expected**: Actie gepland voor die dag, normale workflow
5. Start nieuwe drag operatie
6. Sleep over dag in week 2 en drop
7. **Expected**: Actie gepland voor die dag
8. Start nieuwe drag operatie
9. Sleep over een lijst (Opvolgen, Uitgesteld, etc.) en drop
10. **Expected**: Actie verplaatst naar die lijst

**Success Criteria**:
- ✅ Alle bestaande drag & drop functionaliteit werkt identiek aan voor feature
- ✅ Geen onverwachte UI wijzigingen
- ✅ Lijsten zijn nog steeds drop targets
- ✅ Week 1 en 2 blijven functioneel zonder Ctrl

---

## Test Scenario 5: Edge Cases - Maand en Jaar Overgangen

**Acceptance Criteria**: FR-004 (correcte datum berekening), Edge Case handling

**Steps**:
1. **Setup**: Wijzig systeem datum naar einde van maand (bijv. 28 oktober)
2. Start drag operatie + druk Ctrl in
3. **Expected**: Week 3 toont datums in volgende maand (bijv. 11-17 november)
4. Verifieer dag labels: weekdag + datum nummer correct
5. **Setup**: Wijzig systeem datum naar einde van jaar (bijv. 23 december)
6. Start drag operatie + druk Ctrl in
7. **Expected**: Week 3 toont datums in volgend jaar (bijv. 6-12 januari 2026)

**Success Criteria**:
- ✅ Datums worden correct berekend over maandgrenzen
- ✅ Datums worden correct berekend over jaargrenzen
- ✅ Dag labels tonen correcte datum nummers (1-31)
- ✅ ISO string formaat is correct (YYYY-MM-DD)

---

## Test Scenario 6: Layout Responsiveness (Visual QA)

**Acceptance Criteria**: FR-006, FR-009 (visuele consistentie)

**Steps**:
1. Start drag operatie + druk Ctrl in
2. **Visual Check**: Meet/inspecteer derde week rij
   - Dag zones hebben zelfde width als week 1 en 2
   - Dag zones hebben zelfde height als week 1 en 2
   - Font size en styling zijn identiek
   - Spacing tussen dagen is consistent
3. **Browser DevTools**: Inspecteer CSS classes
   - Derde week zones hebben `.week-day-zone` class
   - Derde week zones hebben `.drop-zone-item` class
   - Current day highlight werkt ook in week 3 (indien vandaag valt in week 3 range)

**Success Criteria**:
- ✅ Derde week rij is visueel identiek aan week 1 en 2 (behalve datums)
- ✅ Layout is symmetrisch en balanced
- ✅ Geen CSS override issues of styling glitches
- ✅ Transitions zijn smooth (no choppy animations)

---

## Playwright Automated Test (Future Implementation)

**Location**: `tests/feature-010-ctrl-week-toggle.spec.js`

**Test Cases**:
```javascript
test('Ctrl key toggles third week visibility', async ({ page }) => {
    // Navigate to acties page
    // Start drag operation
    // Press Ctrl key
    // Assert third week container is visible
    // Release Ctrl key
    // Assert third week container is hidden
});

test('Drop on third week day updates task date', async ({ page }) => {
    // Start drag operation
    // Press Ctrl key
    // Drop on specific day in week 3
    // Verify task date in database matches week 3 day
});

test('Backward compatibility without Ctrl', async ({ page }) => {
    // Start drag without Ctrl
    // Assert only 2 weeks visible
    // Drop on week 1 day
    // Verify normal behavior
});
```

---

## Regression Testing Checklist

**Critical Paths** (must still work after feature implementation):

- [ ] Drag actie naar dag in week 1 (huidige week)
- [ ] Drag actie naar dag in week 2 (volgende week)
- [ ] Drag actie naar lijst (Opvolgen, Uitgesteld, etc.)
- [ ] Keyboard shortcuts tijdens drag (Esc om te cancelen)
- [ ] Mobile drag & drop (indien supported)
- [ ] Floating panel show/hide animatie (fade-in/out)
- [ ] Multiple simultaneous users (geen race conditions)

---

## Performance Benchmarks

**Target Metrics**:
- Ctrl key → UI update: <50ms
- DOM rendering derde week: <100ms
- CSS transition completion: 200ms (matching existing fade duration)
- Memory usage: No leaks after 100+ drag operations

**Measurement Method**:
```javascript
// Browser console test
console.time('ctrl-toggle');
// Press Ctrl during drag
console.timeEnd('ctrl-toggle');
// Should log <50ms
```

---

## Known Limitations

1. **Desktop Only**: Feature werkt alleen op desktop browsers (muis + keyboard)
2. **Ctrl Key Specifiek**: Cmd key op Mac wordt NIET ondersteund (alleen Ctrl)
3. **Browser Support**: Moderne browsers only (Chrome 90+, Firefox 88+, Safari 14+)

---

**Quickstart Ready** ✅ - Use deze scenarios voor handmatige en geautomatiseerde testing
