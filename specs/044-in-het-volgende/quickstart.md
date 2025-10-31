# Quickstart: Bulk Edit Filter Compatibiliteit Fix Testing

**Feature**: 044-in-het-volgende
**Purpose**: Verify bulk edit works correctly with filtered tasks zonder 404 errors
**Date**: 2025-10-30

---

## Prerequisites

### Environment Setup
- ✅ Staging environment: https://dev.tickedify.com/app
- ✅ Test account: jan@buskens.be / qyqhut-muDvop-fadki9
- ✅ Browser: Chrome/Firefox met Developer Tools open (Console tab visible)

### Required Test Data
Je hebt minstens **10 taken** nodig in "Acties" lijst met:
- Verschillende herhalings-types (dagelijks, wekelijks, maandelijks)
- Verschillende contexten (minimaal 2: bijv. "JB Thuis", "JB Werk")
- Verschillende projecten

**Als test data niet beschikbaar**:
```
1. Ga naar Inbox
2. Creëer 5 taken met herhaling "dagelijks"
3. Creëer 5 taken met herhaling "wekelijks"
4. Verplaats alle taken naar "Acties" lijst
```

---

## Test Scenario 1: Reproductie van Bug (Baseline)

**Doel**: Verificeer of de bug reproduceerbaar is op huidige versie.

**Steps**:
1. ✅ Login op dev.tickedify.com/app
2. ✅ Navigeer naar "Acties" scherm
3. ✅ Open browser Console (F12 → Console tab)
4. ✅ Klik op "Bulk Edit" knop (rechtsboven)
5. ✅ Filter taken op "dagelijks" (herhalings filter dropdown)
   - **VERIFY**: Lijst toont alleen dagelijkse taken (bijv. 5 taken)
6. ✅ Selecteer alle gefilterde taken (klik selectie circles)
   - **VERIFY**: Selectie count toont "5 geselecteerd"
7. ✅ Klik "Edit Properties" knop
8. ✅ Wijzig Context naar "JB Thuis"
9. ✅ Klik "Opslaan"
10. ✅ Bevestig in confirmation dialog
11. ✅ **CHECK CONSOLE**: Zijn er 404 errors?

**Expected Result (BEFORE fix)**:
```
❌ Console shows:
PUT https://dev.tickedify.com/api/taak/test-1752000171959-gjj7u1rf0 404 (Not Found)
Failed to update task test-1752000171959-gjj7u1rf0: {"error":"Taak niet gevonden"}
```

**Expected Result (AFTER fix)**:
```
✅ Console shows:
[VALIDATION] Test task ID rejected: test-1752000171959-gjj7u1rf0
✅ No 404 errors
✅ Success toast: "5 tasks updated"
```

---

## Test Scenario 2: Validatie van Test ID Rejection

**Doel**: Verificeer dat test IDs worden gedetecteerd en geweigerd.

**Steps**:
1. ✅ Open browser Console
2. ✅ Voer uit in Console:
   ```javascript
   // Simulate test ID selection attempt
   window.app.toggleTaakSelectie('test-123-abc');
   ```
3. ✅ **CHECK CONSOLE**: Warning gelogd?

**Expected Result**:
```
✅ Console shows:
[VALIDATION] Test task ID rejected: test-123-abc
✅ Test ID NOT in geselecteerdeTaken Set
```

---

## Test Scenario 3: Valid ID Acceptance

**Doel**: Verificeer dat valide IDs nog steeds werken.

**Steps**:
1. ✅ Bulk mode actief, geen filters
2. ✅ Klik selectie circle van een echte taak
3. ✅ **VERIFY**: Circle wordt blauw (geselecteerd state)
4. ✅ **VERIFY**: Selectie count +1
5. ✅ Check in Console:
   ```javascript
   console.log(window.app.geselecteerdeTaken);
   ```
6. ✅ **VERIFY**: Set bevat alleen valide task IDs (geen test- prefix)

**Expected Result**:
```
✅ Valid task IDs selected normally
✅ No validation warnings for valid IDs
✅ geselecteerdeTaken Set contains only valid IDs
```

---

## Test Scenario 4: Select All met Mixed IDs

**Doel**: Verificeer dat "Select All" alleen valide taken selecteert.

**Steps**:
1. ✅ Bulk mode actief
2. ✅ Open Console en inject een fake test task element (developer test):
   ```javascript
   // Optional: Inject test ID for testing (skip if not comfortable with Console)
   const testItem = document.querySelector('.actie-item').cloneNode(true);
   testItem.dataset.id = 'test-fake-123';
   document.querySelector('.acties-lijst').appendChild(testItem);
   ```
3. ✅ Klik "Select All" knop
4. ✅ **CHECK CONSOLE**: Validation warning voor test ID?
5. ✅ **VERIFY**: Alleen echte taken geselecteerd

**Expected Result**:
```
✅ Console shows:
[VALIDATION] Test task ID rejected: test-fake-123
✅ geselecteerdeTaken bevat alleen valid IDs
✅ Selectie count = aantal valid tasks (test ID niet meegeteld)
```

---

## Test Scenario 5: Filter Change Clears Selections

**Doel**: Verificeer dat selecties worden gewist bij filter wijziging (bestaand gedrag).

**Steps**:
1. ✅ Bulk mode actief, geen filter
2. ✅ Selecteer 3 taken
   - **VERIFY**: Selectie count = 3
3. ✅ Pas filter toe: selecteer "dagelijks" in herhaling filter
   - **VERIFY**: Lijst toont alleen dagelijkse taken
   - **VERIFY**: Selectie count = 0 (automatisch gewist)
4. ✅ Selecteer 2 nieuwe taken uit gefilterde lijst
   - **VERIFY**: Selectie count = 2
5. ✅ Wijzig filter naar "wekelijks"
   - **VERIFY**: Selectie count = 0 opnieuw

**Expected Result**:
```
✅ Selections cleared on every filter change
✅ No stale selections from previous filter state
✅ This prevents bulk editing invisible tasks
```

---

## Test Scenario 6: End-to-End Bulk Edit Success

**Doel**: Volledige workflow zonder errors.

**Steps**:
1. ✅ Ga naar Acties scherm
2. ✅ Bulk mode AAN
3. ✅ Filter op project "Verbouwing" (of ander project met 5+ taken)
4. ✅ Selecteer 5 taken
5. ✅ Edit Properties → wijzig Context naar "JB Werk"
6. ✅ Bevestig
7. ✅ Wacht op toast notification
8. ✅ **VERIFY**: Success toast "5 tasks updated"
9. ✅ **VERIFY**: Bulk mode automatisch UIT
10. ✅ **VERIFY**: Lijst herladen met nieuwe context zichtbaar
11. ✅ **CHECK CONSOLE**: Geen errors

**Expected Result**:
```
✅ All 5 tasks updated successfully
✅ No 404 errors
✅ Context changed to "JB Werk" for all selected tasks
✅ Bulk mode exited automatically
✅ List reloaded showing updated tasks
```

---

## Performance Verification

**Doel**: Verificeer geen performance regressie.

**Steps**:
1. ✅ Open browser Performance tab (F12 → Performance)
2. ✅ Start recording
3. ✅ Selecteer 20 taken individueel (klik alle circles)
4. ✅ Stop recording
5. ✅ **CHECK**: Validation overhead per click

**Expected Result**:
```
✅ Validation overhead: <1ms per task selection
✅ Total selection time: ~50-100ms for 20 tasks (UI rendering dominates)
✅ No noticeable lag or blocking
```

---

## Regression Tests

**Doel**: Verificeer dat bestaande functionaliteit niet is gebroken.

### Test: Bulk Delete Still Works
1. ✅ Bulk mode AAN
2. ✅ Selecteer 3 taken
3. ✅ Klik "Delete" knop
4. ✅ Bevestig
5. ✅ **VERIFY**: Taken verwijderd zonder errors

### Test: Bulk Move Still Works
1. ✅ Bulk mode AAN
2. ✅ Selecteer 4 taken
3. ✅ Klik "Move to Opvolgen"
4. ✅ **VERIFY**: Taken verplaatst naar Opvolgen lijst

### Test: Non-Bulk Actions Unaffected
1. ✅ Bulk mode UIT
2. ✅ Normal task interactions: edit, delete, drag & drop
3. ✅ **VERIFY**: All normal actions werk zoals voorheen

---

## Debugging Checklist

**Als tests falen**:

1. **Check browser version**:
   - Chrome 90+ or Firefox 88+ required

2. **Check console for errors**:
   - JavaScript errors before fix implementation?
   - Syntax errors in validation code?

3. **Check this.taken array**:
   ```javascript
   console.log('Loaded tasks:', window.app.taken);
   // Should show array of task objects
   ```

4. **Check geselecteerdeTaken state**:
   ```javascript
   console.log('Selected task IDs:', Array.from(window.app.geselecteerdeTaken));
   // Should show array of valid IDs, no test- prefix
   ```

5. **Check validateTaskId function exists**:
   ```javascript
   console.log(typeof window.app.validateTaskId);
   // Should output: "function"
   ```

---

## Success Criteria Summary

**All scenarios must pass**:
- ✅ Scenario 1: No 404 errors on filtered bulk edit
- ✅ Scenario 2: Test IDs rejected with warning
- ✅ Scenario 3: Valid IDs accepted normally
- ✅ Scenario 4: Select All skips invalid IDs
- ✅ Scenario 5: Filter changes clear selections
- ✅ Scenario 6: End-to-end workflow succeeds
- ✅ Performance: No noticeable overhead
- ✅ Regression: Existing features work

**Fix is READY FOR DEPLOYMENT if all ✅**

---

## Next Steps After Testing

1. **If all tests pass**:
   - ✅ Commit changes to staging branch
   - ✅ Update changelog with fix description
   - ✅ Increment package.json version (patch level)
   - ✅ Deploy to dev.tickedify.com
   - ✅ Verify deployment via /api/version endpoint

2. **If tests fail**:
   - ❌ Document failed scenario in issue
   - ❌ Debug with browser Developer Tools
   - ❌ Review validation logic implementation
   - ❌ Re-test after fixes

3. **Post-deployment**:
   - 📊 Monitor production console for validation warnings
   - 📊 Track if invalidCount > 0 still occurs in bulkEditProperties
   - 📊 Gebruiker feedback over bulk edit reliability
