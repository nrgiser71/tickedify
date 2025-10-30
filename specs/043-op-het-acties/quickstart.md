# Quickstart: Bulk Eigenschappen Bewerking Testing

**Feature**: 043-op-het-acties | **Date**: 2025-10-30

## Purpose
End-to-end test scenario voor bulk eigenschappen bewerking feature. Deze guide kan door developers EN testers gebruikt worden om de feature te valideren.

---

## Prerequisites

### Environment Setup
1. **Staging environment**: dev.tickedify.com (Vercel staging deployment)
2. **Test account**: jan@buskens.be / [known password]
3. **Browser**: Chrome/Firefox/Safari (latest versions)
4. **Test data**: Minimaal 5 taken in Acties lijst

### Before Testing
1. Login op dev.tickedify.com/app
2. Navigeer naar Acties lijst
3. Verifieer dat er minimaal 5 taken zichtbaar zijn
4. Indien nodig: Maak enkele test taken aan

---

## Test Scenario 1: Basic Bulk Edit (Happy Path)

### Goal
Verifieer dat bulk eigenschappen bewerking werkt voor standaard use case.

### Steps

1. **Activeer bulk mode**
   - [ ] Klik op "Bulk" knop rechtsboven
   - [ ] Verifieer: Checkboxes verschijnen naast taken
   - [ ] Verifieer: Bulk actions knoppenrij verschijnt onderaan scherm

2. **Selecteer taken**
   - [ ] Selecteer 3 taken door op checkboxes te klikken
   - [ ] Verifieer: Geselecteerde taken hebben blauwe achtergrond
   - [ ] Verifieer: "Eigenschappen Bewerken" knop is enabled onderaan

3. **Open bulk edit popup**
   - [ ] Klik op "Eigenschappen Bewerken" knop
   - [ ] Verifieer: Modal popup opent centered op scherm
   - [ ] Verifieer: Header toont "Eigenschappen bewerken voor 3 taken"
   - [ ] Verifieer: Alle velden zijn leeg (geen placeholders)
   - [ ] Verifieer: Dropdowns bevatten "-- Geen wijziging --" als eerste optie

4. **Vul eigenschappen in**
   - [ ] Context: Selecteer "Kantoor" (of andere bestaande context)
   - [ ] Prioriteit: Selecteer "Hoog"
   - [ ] Laat Project, Datum en Tijd leeg
   - [ ] Verifieer: "Opslaan" knop is enabled (minimaal 1 veld ingevuld)

5. **Bevestig wijzigingen**
   - [ ] Klik op "Opslaan"
   - [ ] Verifieer: JavaScript confirm() dialog verschijnt
   - [ ] Verifieer: Bericht toont "3 taken aanpassen met deze eigenschappen?"
   - [ ] Klik op "OK"

6. **Monitor uitvoering**
   - [ ] Verifieer: Loading indicator verschijnt met progress
   - [ ] Verifieer: Progress toont "Eigenschappen aanpassen 1/3", "2/3", "3/3"
   - [ ] Verifieer: Progress indicator verdwijnt na completion

7. **Verifieer resultaat**
   - [ ] Verifieer: Toast success message toont "3 taken aangepast"
   - [ ] Verifieer: Bulk mode is uitgeschakeld (checkboxes weg)
   - [ ] Verifieer: Takenlijst is herladen
   - [ ] Open 1 van de 3 bewerkte taken
   - [ ] Verifieer: Context is "Kantoor"
   - [ ] Verifieer: Prioriteit is "Hoog"
   - [ ] Verifieer: Project is ongewijzigd (wat het was vóór bulk edit)
   - [ ] Verifieer: Datum is ongewijzigd

**Expected Outcome**: ✅ All checks passed

---

## Test Scenario 2: Multiple Properties Update

### Goal
Verifieer dat meerdere eigenschappen tegelijk kunnen worden aangepast.

### Steps

1. **Setup**
   - [ ] Activeer bulk mode
   - [ ] Selecteer 5 taken

2. **Open popup en vul alle velden**
   - [ ] Klik "Eigenschappen Bewerken"
   - [ ] Project: Selecteer een bestaand project
   - [ ] Datum: Selecteer morgen's datum
   - [ ] Context: Selecteer "Thuis"
   - [ ] Prioriteit: Selecteer "Laag"
   - [ ] Geschatte tijd: Vul "30" in (minuten)

3. **Bevestig en verifieer**
   - [ ] Klik "Opslaan" → Confirm OK
   - [ ] Verifieer: Toast toont "5 taken aangepast"
   - [ ] Open 1 van de taken
   - [ ] Verifieer: Alle 5 eigenschappen zijn correct aangepast

**Expected Outcome**: ✅ All properties updated correctly

---

## Test Scenario 3: Minimum Selection Validation

### Goal
Verifieer dat minimum 2 taken vereist zijn.

### Steps

1. **Setup**
   - [ ] Activeer bulk mode
   - [ ] Selecteer slechts 1 taak

2. **Verifieer button state**
   - [ ] Verifieer: "Eigenschappen Bewerken" knop is disabled
   - [ ] Verifieer: Button heeft grijze/disabled appearance

3. **Test warning (optioneel)**
   - [ ] Probeer knop te klikken (if not truly disabled)
   - [ ] Verifieer: Toast warning "Selecteer minimaal 2 taken"

**Expected Outcome**: ✅ Feature properly disabled for single task

---

## Test Scenario 4: Empty Form Validation

### Goal
Verifieer dat minimaal 1 veld moet worden ingevuld.

### Steps

1. **Setup**
   - [ ] Activeer bulk mode, selecteer 3 taken
   - [ ] Open bulk edit popup

2. **Probeer opslaan zonder wijzigingen**
   - [ ] Laat alle velden leeg (default "-- Geen wijziging --")
   - [ ] Klik "Opslaan"

3. **Verifieer validatie**
   - [ ] Verifieer: Confirm dialog verschijnt NIET
   - [ ] Verifieer: Toast warning "Geen eigenschappen geselecteerd"
   - [ ] Verifieer: Popup blijft open (niet gesloten)

4. **Fix en verifieer**
   - [ ] Vul 1 veld in (bijvoorbeeld Context)
   - [ ] Klik "Opslaan" → Confirm OK
   - [ ] Verifieer: Update succesvol

**Expected Outcome**: ✅ Validation prevents empty updates

---

## Test Scenario 5: Cancel Workflow

### Goal
Verifieer dat annuleren geen wijzigingen toepast.

### Steps

1. **Setup**
   - [ ] Activeer bulk mode, selecteer 3 taken
   - [ ] Noteer huidige eigenschappen van geselecteerde taken

2. **Open en vul popup**
   - [ ] Open bulk edit popup
   - [ ] Vul meerdere velden in (Context, Prioriteit)

3. **Test Escape key cancel**
   - [ ] Druk Escape toets
   - [ ] Verifieer: Popup sluit
   - [ ] Verifieer: Bulk mode blijft actief
   - [ ] Verifieer: Selectie blijft intact
   - [ ] Verifieer: Taken zijn NIET aangepast (check 1 taak)

4. **Test Cancel button**
   - [ ] Open popup opnieuw
   - [ ] Vul velden in
   - [ ] Klik "Annuleren" knop
   - [ ] Verifieer: Popup sluit, geen wijzigingen

5. **Test Confirm cancel**
   - [ ] Open popup, vul velden, klik "Opslaan"
   - [ ] In confirm dialog: Klik "Cancel"
   - [ ] Verifieer: Popup gesloten, geen wijzigingen

**Expected Outcome**: ✅ All cancel methods work without side effects

---

## Test Scenario 6: Large Selection Performance

### Goal
Verifieer performance met grote selectie (100+ taken indien mogelijk).

### Steps

1. **Setup**
   - [ ] Zorg voor 50-100 taken in Acties lijst (of maximaal beschikbaar)
   - [ ] Activeer bulk mode

2. **Select All**
   - [ ] Gebruik "Select All" functie (indien beschikbaar)
   - [ ] OF: Selecteer handmatig 50+ taken

3. **Execute bulk edit**
   - [ ] Open popup, vul Context in
   - [ ] Klik Opslaan → Confirm OK

4. **Monitor performance**
   - [ ] Verifieer: Progress indicator toont tijdens execution
   - [ ] Verifieer: Progress update op elke taak
   - [ ] Verifieer: Geen browser freeze/hang
   - [ ] Verifieer: Completion binnen redelijke tijd (~500ms/taak)

5. **Verifieer resultaat**
   - [ ] Verifieer: Toast toont correct aantal
   - [ ] Sample check: Open 3 willekeurige taken, verifieer Context

**Expected Outcome**: ✅ Handles large selections gracefully with progress feedback

---

## Test Scenario 7: Error Handling (Optional - Advanced)

### Goal
Verifieer graceful degradation bij partial failures.

### Steps

**Note**: Dit scenario vereist artificiële error conditions - gebruik development tools.

1. **Simulate network failure**
   - [ ] Open browser DevTools → Network tab
   - [ ] Enable "Offline" mode na 2e taak update
   - [ ] Execute bulk edit voor 5 taken
   - [ ] Verifieer: Toast error "2 taken aangepast, 3 fouten"
   - [ ] Verifieer: Bulk mode blijft actief (geen reload)
   - [ ] Verifieer: 2 taken zijn wel aangepast

2. **Invalid data (if testable)**
   - [ ] Probeer invalid project_id via DevTools
   - [ ] Verifieer: Error message in toast

**Expected Outcome**: ✅ Graceful error handling with partial success tracking

---

## Test Scenario 8: Keyboard Navigation

### Goal
Verifieer keyboard accessibility.

### Steps

1. **Setup**
   - [ ] Activeer bulk mode, selecteer 3 taken
   - [ ] Open bulk edit popup

2. **Tab navigation**
   - [ ] Druk Tab toets
   - [ ] Verifieer: Focus gaat naar Project dropdown
   - [ ] Druk Tab → Datum, Tab → Context, Tab → Prioriteit, Tab → Tijd
   - [ ] Verifieer: Tab order is logisch (top-to-bottom)
   - [ ] Laatste Tab → Focus op "Annuleren" button
   - [ ] Tab → Focus op "Opslaan" button

3. **Enter key**
   - [ ] Vul Context in
   - [ ] Focus op "Opslaan" button (via Tab)
   - [ ] Druk Enter
   - [ ] Verifieer: Confirm dialog verschijnt
   - [ ] Enter → Confirm accepted
   - [ ] Verifieer: Update uitgevoerd

4. **Escape key**
   - [ ] Open popup opnieuw
   - [ ] Druk Escape (focus anywhere)
   - [ ] Verifieer: Popup sluit

**Expected Outcome**: ✅ Full keyboard accessibility

---

## Test Scenario 9: Edge Cases

### Goal
Verifieer edge cases uit spec.

### Steps

1. **Past date validation**
   - [ ] Open bulk edit popup
   - [ ] Datum: Selecteer datum in het verleden
   - [ ] Klik Opslaan → Confirm OK
   - [ ] Verifieer: Werkt (geen blokkade) - per spec flexibiliteit

2. **"Geen project" option**
   - [ ] Open popup
   - [ ] Project: Selecteer "Geen project"
   - [ ] Opslaan → Confirm OK
   - [ ] Verifieer: project_id is NULL in database

3. **"Geen context" option**
   - [ ] Open popup
   - [ ] Context: Selecteer "Geen context"
   - [ ] Opslaan → Confirm OK
   - [ ] Verifieer: context is NULL in database

4. **Zero minutes**
   - [ ] Geschatte tijd: Vul "0" in
   - [ ] Verifieer: Geaccepteerd (>= 0)

5. **Negative minutes (optional)**
   - [ ] Probeer negatief getal
   - [ ] Verifieer: HTML5 input prevente (min="0")

**Expected Outcome**: ✅ Edge cases handled correctly

---

## Test Scenario 10: UI Consistency Check

### Goal
Verifieer visuele consistentie met bestaande Tickedify patterns.

### Steps

1. **Modal appearance**
   - [ ] Open bulk edit popup
   - [ ] Verifieer: Centered positioning
   - [ ] Verifieer: Semi-transparent backdrop
   - [ ] Verifieer: White modal content box
   - [ ] Verifieer: Consistent met recurring task popup styling

2. **Button styling**
   - [ ] Verifieer: "Eigenschappen Bewerken" button heeft `bulk-action-btn` class
   - [ ] Verifieer: Consistent met andere bulk action buttons
   - [ ] Verifieer: "Opslaan" button heeft primary styling (blue)
   - [ ] Verifieer: "Annuleren" button heeft secondary styling

3. **Toast notifications**
   - [ ] Execute bulk edit
   - [ ] Verifieer: Toast success heeft groene styling
   - [ ] Verifieer: Toast format "[X] taken aangepast" consistent met bestaande
   - [ ] Test error toast (indien mogelijk)
   - [ ] Verifieer: Toast error heeft rode styling

**Expected Outcome**: ✅ Visual consistency with existing UI patterns

---

## Automated Test Script (Playwright)

### For Developer/CI Use

```javascript
// Playwright test scenario - can be run via tickedify-testing agent
test('Bulk edit properties - happy path', async ({ page }) => {
    // Login
    await page.goto('https://dev.tickedify.com/app');
    await page.fill('#email', 'jan@buskens.be');
    await page.fill('#password', 'qyqhut-muDvop-fadki9');
    await page.click('button[type="submit"]');

    // Navigate to Actions
    await page.waitForLoadState('networkidle');
    await page.click('text=Acties');

    // Activate bulk mode
    await page.click('button:has-text("Bulk")');
    await page.waitForSelector('.task-checkbox');

    // Select 3 tasks
    const checkboxes = await page.locator('.task-checkbox').all();
    await checkboxes[0].check();
    await checkboxes[1].check();
    await checkboxes[2].check();

    // Open bulk edit popup
    await page.click('button:has-text("Eigenschappen Bewerken")');
    await page.waitForSelector('#bulkEditModal');

    // Fill context and priority
    await page.selectOption('#bulkEditContext', { label: 'Kantoor' });
    await page.selectOption('#bulkEditPriority', 'hoog');

    // Save
    await page.click('button:has-text("Opslaan")');

    // Handle confirm dialog
    page.once('dialog', dialog => {
        expect(dialog.message()).toContain('3 taken');
        dialog.accept();
    });

    // Wait for completion
    await page.waitForSelector('text=3 taken aangepast');

    // Verify bulk mode exited
    await expect(page.locator('.task-checkbox')).toHaveCount(0);
});
```

---

## Success Criteria

Feature is ready for production deployment wanneer:

- ✅ All 10 manual test scenarios pass
- ✅ Automated Playwright test passes
- ✅ No console errors during execution
- ✅ Performance acceptable for 100+ tasks (if testable)
- ✅ Visual consistency verified
- ✅ Keyboard accessibility verified
- ✅ Error handling graceful

---

## Rollback Plan

Indien kritieke issues gevonden:

1. **Staging**: Feature is alleen on staging - geen productie impact
2. **Rollback**: Revert feature branch merge, redeploy previous staging commit
3. **Fix**: Address issues in feature branch
4. **Re-test**: Run quickstart scenarios again
5. **Re-deploy**: Merge to staging when ready

---

## Next Steps After Validation

1. **Changelog Update**: Add entry in public/changelog.html
2. **ARCHITECTURE.md Update**: Add function locations and regelnummers
3. **Version Bump**: Update package.json version
4. **Staging Deployment**: Merge to staging branch, push to Vercel
5. **Beta User Communication**: Notify beta users of new feature (post-freeze lift)

---

## Support & Debugging

**Common Issues**:

| Issue | Solution |
|-------|----------|
| Button blijft disabled | Check selectie >= 2 taken |
| Popup opent niet | Check console errors, verify modal HTML exists |
| Confirm dialog verschijnt niet | Check browser popup blockers |
| Updates worden niet opgeslagen | Check network tab voor API errors |
| Progress indicator blijft hangen | Hard refresh (Cmd+Shift+R) |

**Debug Commands**:
```javascript
// In browser console
window.taskManager.geselecteerdeTaken  // Check selection
window.taskManager.contexten           // Check contexts loaded
window.taskManager.projecten           // Check projects loaded
```

---

**Status**: ✅ Quickstart ready for testing
**Last Updated**: 2025-10-30
