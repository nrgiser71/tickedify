# Research: Filter Persistentie Fix voor Herhalende Taken

**Date**: 2025-11-03
**Feature**: 052-daarstraks-hebben-we

## Research Questions

### 1. Waar wordt de filter vergeten bij herhalende taken?

**Decision**: De filter wordt vergeten op regel 10762 in `completePlanningTask()` functie wanneer `renderPlanningActies()` wordt aangeroepen zonder `filterPlanningActies()` te callen.

**Rationale**:
- Code analyse toont dat op regel 10746-10768 een herhalende taak flow bestaat
- Na het toevoegen van nieuwe herhalende taak wordt `renderPlanningActies()` aangeroepen (regel 10762)
- Deze call re-rendert de acties lijst ZONDER filter toe te passen
- Later wordt op regel 10778-10782 de lijst opnieuw gerenderd MET filter
- Dit veroorzaakt een race condition of dubbele render waarbij filter state verloren gaat

**Alternatives Considered**:
- Alternatief 1: Filter toepassen in `renderPlanningActies()` zelf → Verworpen (functie bestaat niet, is een no-op)
- Alternatief 2: Filter toepassen na regel 10762 → Gekozen als meest directe fix
- Alternatief 3: Volledige refactor van herhalende taken flow → Verworpen (te groot voor bug fix)

### 2. Waar is de eerdere filter fix (Feature 050) toegepast?

**Decision**: Feature 050 fix is toegepast op regel 10781-10782 in `completePlanningTask()`, maar alleen voor de tweede render flow (regel 10770-10785), niet voor de herhalende taak specific flow (regel 10746-10768).

**Rationale**:
- Git log toont commit aefc04c: "FINAL FIX: Filter persistentie in dagelijkse planning - v0.21.25"
- Fix voegt `this.filterPlanningActies()` toe na `bindDragAndDropEvents()` op regel 10782
- Deze fix werkt voor normale taken omdat die alleen door regel 10770-10785 flow gaan
- Herhalende taken hebben EXTRA flow op regel 10746-10768 die GEEN filter call heeft

**Alternatives Considered**:
- Alternatief 1: Verwijder regel 10762 call volledig → Verworpen (mogelijk nodig voor UI feedback)
- Alternatief 2: Voeg filter call toe na regel 10762 → Gekozen als consistent met Feature 050 pattern
- Alternatief 3: Consolidate beide flows → Verworpen (te complex voor bug fix scope)

### 3. Zijn er andere plekken waar herhalende taken worden afgevinkt?

**Decision**: Ja, er zijn 3 plekken:
1. `completePlanningTask()` - dagelijkse planning scherm (regel 10630) - **PROBLEEM LOCATIE**
2. `taakAfwerken()` - standalone acties scherm (regel 4102) - **AL GEFIXED** (regel 4237-4241)
3. `taakAfwerkenVanuitProject()` - project overzicht (regel 2547) - **NIET DAGELIJKSE PLANNING**, geen filter

**Rationale**:
- Grep search naar `createNextRecurringTask` toont alle 3 locaties
- `taakAfwerken()` heeft al filter fix op regel 4239-4241: `this.filterActies()`
- `completePlanningTask()` mist deze fix voor de herhalende taken flow
- `taakAfwerkenVanuitProject()` is niet in dagelijkse planning context, geen filter vereist

**Alternatives Considered**:
- Alternatief 1: Fix alle 3 plekken → Verworpen (2 plekken zijn al OK of niet relevant)
- Alternatief 2: Fix alleen `completePlanningTask()` → Gekozen (enige probleem locatie)

### 4. Wat is de correcte timing voor filter call?

**Decision**: Filter call moet DIRECT na `renderPlanningActies()` op regel 10762, voordat de tweede render flow (regel 10770-10785) start.

**Rationale**:
- Feature 050 pattern: filter call direct na render + bindDragAndDropEvents
- Regel 10762 rendert de lijst met de nieuwe herhalende taak
- Filter moet toegepast worden voordat gebruiker de lijst ziet
- Tweede render flow (regel 10770-10785) heeft al eigen filter call op regel 10782
- Door filter toe te voegen na regel 10762 voorkom je flicker en state loss

**Alternatives Considered**:
- Alternatief 1: Filter call na regel 10768 (na hele herhalende taak block) → Verworpen (te laat)
- Alternatief 2: Filter call direct na regel 10762 → Gekozen (consistent met Feature 050)
- Alternatief 3: Filter call vervang regel 10762 → Verworpen (`renderPlanningActies()` doet niks)

### 5. Moet `renderPlanningActies()` call verwijderd worden?

**Decision**: JA, regel 10762 `this.renderPlanningActies()` moet verwijderd worden omdat de functie niet bestaat en niets doet.

**Rationale**:
- Grep search toont dat `renderPlanningActies()` alleen op regel 10762 wordt aangeroepen
- Er is GEEN functie definitie voor `renderPlanningActies()` in de codebase
- Dit betekent dat de call een no-op is (doet niks)
- De eigenlijke render gebeurt op regel 10778 via `renderActiesVoorPlanning()`
- Regel 10762 is legacy code die niet opgeruimd is

**Alternatives Considered**:
- Alternatief 1: Laat regel 10762 staan en voeg alleen filter toe → Verworpen (dead code)
- Alternatief 2: Verwijder regel 10762 volledig → Gekozen (code cleanup)
- Alternatief 3: Implementeer `renderPlanningActies()` functie → Verworpen (niet nodig, duplicatie)

## Technical Decisions Summary

**Fix Locatie**: `public/app.js`, functie `completePlanningTask()`, regel 10762-10763

**Wijziging**:
```javascript
// VERWIJDER regel 10762-10763:
// Update the actions list UI to show the new task with recurring indicator
const actiesLijst = document.getElementById('planningActiesLijst');
if (actiesLijst) {
    this.renderPlanningActies();  // ← VERWIJDEREN (functie bestaat niet)
}

// Geen vervanging nodig - de volgende render flow (regel 10770-10785)
// met filter call (regel 10782) handelt alles correct af
```

**Verwachte Impact**:
- Filter blijft actief na afvinken herhalende taak in dagelijkse planning
- Geen dubbele render meer (voorheen 2x: regel 10762 + regel 10778)
- Performance verbetering (1 render ipv 2)
- Consistentie met Feature 050 fix pattern
- Code cleanup (dead code verwijderd)

## Testing Strategy

**Playwright Test Scenarios**:
1. Filter op project → vink herhalende taak af → verify filter actief blijft
2. Filter op context → vink herhalende taak af → verify filter actief blijft
3. Filter op prioriteit → vink herhalende taak af → verify filter actief blijft
4. Meerdere filters → vink herhalende taak af → verify alle filters actief blijven
5. Event-based herhalende taak → popup → vink af → verify filter actief blijft

**Manual Test Checklist**:
1. Dagelijkse planning openen
2. Filter toepassen (bijv. project "Verbouwing")
3. Herhalende taak afvinken die aan filter voldoet
4. Verify: filter blijft actief (checkboxes/dropdowns behouden state)
5. Verify: nieuwe instantie verschijnt (als aan filter voldoet)
6. Verify: afgevinkte taak verdwijnt

## Dependencies & Constraints

**Dependencies**:
- Feature 050 filter implementatie (al live in productie)
- `filterPlanningActies()` functie (regel 12027-12080)
- `completePlanningTask()` functie (regel 10630-10829)

**Constraints**:
- GEEN wijzigingen aan filter logica zelf
- GEEN wijzigingen aan herhalende taken creation logica
- ALLEEN dead code removal + consistent application van bestaande filter pattern
- Backend ongewijzigd (pure frontend fix)

**Risk Assessment**:
- **Risk**: Verwijderen regel 10762-10763 breekt iets → **Mitigatie**: Code doet niets, geen impact
- **Risk**: Filter call timing te vroeg/laat → **Mitigatie**: Bestaande flow op regel 10770-10785 blijft bestaan
- **Risk**: Event-based taken flow anders → **Mitigatie**: Testing scenario 5 verifieert dit

## Conclusion

De fix is simpel en elegant:
1. **Verwijder dead code** (regel 10762-10763) - `renderPlanningActies()` bestaat niet
2. **Vertrouw op bestaande flow** (regel 10770-10785) die al filter call heeft op regel 10782

Dit is de minimale wijziging die consistent is met Feature 050 fix pattern en alle constitution checks PASS.
