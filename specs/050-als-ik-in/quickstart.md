# Quickstart: Filter Persistentie Test Scenarios

## Doel
Verifieer dat filter state behouden blijft wanneer taken worden afgevinkt in de dagelijkse planning acties lijst.

## Prerequisites
- Tickedify staging environment (dev.tickedify.com/app) toegankelijk
- Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Minimaal 5+ taken in de acties lijst met verschillende projecten en contexten

## Test Setup

### Stap 1: Prepare Test Data
1. Navigeer naar dev.tickedify.com/app
2. Login met test credentials
3. Ga naar dagelijkse planning scherm
4. Zorg voor minimaal 5 taken in acties lijst met:
   - Taken van minimaal 2 verschillende projecten (bijv. "Project A", "Project B")
   - Taken van minimaal 2 verschillende contexten (bijv. "Werk", "Privé")
   - Mix van prioriteiten (hoog, gemiddeld, laag)

### Stap 2: Locate Filter Controls
Identificeer filter elementen in de acties lijst sectie:
- `#taakFilter` - Tekstuele zoekfilter
- `#projectFilter` - Project dropdown
- `#contextFilter` - Context dropdown
- `#datumFilter` - Datum filter
- `#prioriteitFilter` - Prioriteit filter

## Test Scenarios

### Scenario 1: Single Project Filter + Taak Completion
**Doel**: Verifieer dat een enkele project filter actief blijft na taak afvinken

**Steps**:
1. Selecteer "Project A" in project filter dropdown
2. Verifieer dat alleen taken van "Project A" zichtbaar zijn
3. Vink één zichtbare taak af (klik checkbox)
4. Wacht op taak completion (toast: "Task completed!")

**Expected Result**:
- ✅ Filter dropdown toont nog steeds "Project A" geselecteerd
- ✅ Taken lijst toont ALLEEN taken van "Project A" (niet alle taken)
- ✅ Afgevinkte taak is verwijderd uit lijst
- ✅ Geen scroll position jump
- ✅ Geen full page refresh

**Failure Indicators**:
- ❌ Taken lijst toont alle taken (filter visueel wel actief)
- ❌ Taken van andere projecten verschijnen
- ❌ Filter dropdown is gereset naar "Alle"

---

### Scenario 2: Multiple Filters (Project + Context) + Taak Completion
**Doel**: Verifieer dat meerdere gecombineerde filters actief blijven

**Steps**:
1. Selecteer "Project A" in project filter
2. Selecteer "Werk" in context filter
3. Verifieer dat alleen taken die voldoen aan BEIDE criteria zichtbaar zijn
4. Vink één zichtbare taak af
5. Wacht op completion

**Expected Result**:
- ✅ Beide filters blijven actief (visueel EN functioneel)
- ✅ Taken lijst toont alleen taken met Project A + Werk context
- ✅ Taken die niet aan beide criteria voldoen blijven verborgen
- ✅ Afgevinkte taak verwijderd

**Failure Indicators**:
- ❌ Taken van andere projecten verschijnen
- ❌ Taken van andere contexten verschijnen
- ❌ Filter dropdowns gereset

---

### Scenario 3: Last Filtered Task Completion
**Doel**: Verifieer gedrag wanneer de laatste gefilterde taak wordt afgevinkt

**Steps**:
1. Filter op een project met slechts 1 taak
2. Vink de enige zichtbare taak af
3. Wacht op completion

**Expected Result**:
- ✅ Filter blijft actief (dropdown selectie behouden)
- ✅ Taken lijst toont lege state
- ✅ Geen andere taken verschijnen automatisch
- ✅ Filter moet handmatig gereset worden door gebruiker

**Failure Indicators**:
- ❌ Alle taken verschijnen na laatste taak completion
- ❌ Filter wordt automatisch gereset

---

### Scenario 4: Multiple Sequential Completions
**Doel**: Verifieer filter persistentie bij meerdere opeenvolgende completions

**Steps**:
1. Filter op project met 3+ taken
2. Vink eerste taak af → wacht op completion
3. Vink tweede taak af → wacht op completion
4. Vink derde taak af → wacht op completion

**Expected Result**:
- ✅ Na elke completion blijft filter actief
- ✅ Alleen gefilterde taken blijven zichtbaar na elke removal
- ✅ Geen "flicker" of tijdelijke weergave van alle taken
- ✅ Filter state is stabiel tussen completions

**Failure Indicators**:
- ❌ Na eerste completion verschijnen alle taken
- ❌ Filter reset na tweede of derde completion
- ❌ Inconsistent gedrag tussen completions

---

### Scenario 5: Text Filter + Completion
**Doel**: Verifieer tekstuele zoekfilter persistentie

**Steps**:
1. Type "vergadering" in `#taakFilter` tekstveld
2. Verifieer dat alleen taken met "vergadering" in naam zichtbaar zijn
3. Vink één zichtbare taak af

**Expected Result**:
- ✅ Tekst "vergadering" blijft in filter veld
- ✅ Alleen taken met "vergadering" blijven zichtbaar
- ✅ Taken zonder "vergadering" blijven verborgen

**Failure Indicators**:
- ❌ Tekstveld leeg na completion
- ❌ Alle taken verschijnen

---

### Scenario 6: Priority Filter + Recurring Task Completion
**Doel**: Verifieer filter met recurring task instantie creatie

**Steps**:
1. Filter op "hoog" prioriteit
2. Vink een herhalende taak af (🔄 indicator)
3. Wacht op toast: "Task completed! Next recurrence scheduled for..."

**Expected Result**:
- ✅ Filter blijft op "hoog" prioriteit
- ✅ Nieuwe recurring instantie verschijnt ALLEEN als deze ook "hoog" prioriteit heeft
- ✅ Als nieuwe instantie andere prioriteit heeft, blijft deze verborgen
- ✅ Filter logic wordt toegepast op nieuwe taken

**Failure Indicators**:
- ❌ Filter reset na recurring completion
- ❌ Nieuwe recurring instantie verschijnt altijd, ongeacht filter

---

## Playwright Automation Script Reference

Voor automated testing met tickedify-testing agent:

```javascript
// Scenario 1: Project filter + completion
await page.goto('https://dev.tickedify.com/app');
await page.fill('#login-email', 'jan@buskens.be');
await page.fill('#login-password', 'qyqhut-muDvop-fadki9');
await page.click('button[type="submit"]');

// Navigate to daily planning
await page.click('text=Dagelijkse Planning');

// Apply project filter
await page.selectOption('#projectFilter', { label: 'Project A' });

// Count visible tasks before completion
const tasksBeforeCount = await page.locator('.actie-row:visible, .taak-item:visible').count();

// Complete first visible task
await page.locator('.actie-row:visible input[type="checkbox"], .taak-item:visible input[type="checkbox"]').first().check();

// Wait for completion
await page.waitForSelector('text=Task completed!');

// Verify filter still active
const filterValue = await page.inputValue('#projectFilter');
expect(filterValue).toBe('Project A ID'); // Verify dropdown value

// Count visible tasks after completion
const tasksAfterCount = await page.locator('.actie-row:visible, .taak-item:visible').count();
expect(tasksAfterCount).toBe(tasksBeforeCount - 1); // One task removed

// Verify only Project A tasks visible (no other projects)
const visibleTasks = await page.locator('.actie-row:visible, .taak-item:visible').all();
for (const task of visibleTasks) {
  const projectId = await task.getAttribute('data-project-id');
  expect(projectId).toBe('Project A ID');
}
```

## Success Criteria
Alle 6 scenarios slagen zonder failure indicators. Filter state blijft 100% persistent tijdens taak completions in alle scenario's.

## Regression Testing
Na fix implementatie, ook verifiëren dat bestaande functionaliteit blijft werken:
- ✅ Filter reset button werkt nog steeds
- ✅ Manual lijst refresh (F5) reset filters correct
- ✅ Switching tussen lijsten reset filters
- ✅ Bulk mode filter clearing blijft werken (Feature 043)
