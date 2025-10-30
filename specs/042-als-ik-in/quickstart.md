# Quickstart: Test Keyboard Shortcuts Na Focus Wijziging

**Feature**: Keyboard Shortcuts Blijven Werken Na Focus Wijziging
**Test Environment**: dev.tickedify.com (staging)
**Estimated Time**: 5-10 minuten

## Prerequisites

- ✅ Branch `042-als-ik-in` deployed to staging
- ✅ Browser with DevTools (Chrome/Firefox)
- ✅ Test account credentials: jan@buskens.be / qyqhut-muDvop-fadki9

## Test Scenario 1: Project Toevoegen + Shortcuts

**Doel**: Verifieer dat shortcuts werken na klikken op "Project toevoegen"

### Steps

1. **Open app**:
   ```
   Navigate to: https://dev.tickedify.com/app
   Login met test credentials
   ```

2. **Open taak popup**:
   ```
   - Klik op een bestaande taak in inbox/acties lijst
   - OF druk Shift+F12 voor nieuwe taak
   ```
   **Expected**: Popup opent met focus op naam veld

3. **Click Project button**:
   ```
   - Klik op "Project toevoegen" knop in popup
   - Selecteer een project uit de dropdown
   ```
   **Expected**: Project wordt toegewezen, focus op project element

4. **Test shortcuts MET focus op project element**:
   ```
   Test deze shortcuts (zonder eerst ergens anders te klikken):
   - Druk Escape → Popup moet sluiten
   - Open popup opnieuw, klik project button
   - Druk Enter → Popup moet opslaan en sluiten
   - Open popup opnieuw, klik project button
   - Druk F2 → Project moet wijzigen naar F2-project
   - Druk Shift+F9 → Prioriteit modal moet openen
   ```
   **Expected**: ✅ Alle shortcuts werken correct
   **Bug scenario (before fix)**: ❌ Shortcuts werken NIET

## Test Scenario 2: Context Toevoegen + Shortcuts

**Doel**: Verifieer dat shortcuts werken na klikken op "Context toevoegen"

### Steps

1. **Open taak popup** (zoals scenario 1)

2. **Click Context button**:
   ```
   - Klik op "Context toevoegen" knop
   - Selecteer een context uit dropdown
   ```
   **Expected**: Context wordt toegewezen, focus op context element

3. **Test shortcuts MET focus op context element**:
   ```
   - Druk F7 → Context moet wijzigen
   - Druk Escape → Popup moet sluiten
   - Open opnieuw, klik context, druk Enter → Moet opslaan
   ```
   **Expected**: ✅ Alle shortcuts werken

## Test Scenario 3: Schakelen Tussen Elementen

**Doel**: Verifieer shortcuts tijdens frequent focus wisseling

### Steps

1. **Open taak popup**

2. **Rapid element switching**:
   ```
   - Klik naam input veld
   - Klik project button
   - Klik context button
   - Klik datum veld
   - Druk F2 (project shortcut)
   ```
   **Expected**: ✅ Project wijzigt onmiddellijk

3. **Continue testing**:
   ```
   - Klik verschillende elementen snel achter elkaar
   - Test Escape, Enter, F-keys na elke click
   ```
   **Expected**: ✅ Shortcuts blijven consistent werken

## Test Scenario 4: Alle Shortcuts Comprehensive

**Doel**: Verifieer ALLE gedefinieerde shortcuts

### Keyboard Shortcuts to Test

| Shortcut | Action | Expected Result |
|----------|--------|-----------------|
| Enter | Opslaan taak | Popup sluit, taak opgeslagen |
| Escape | Annuleren | Popup sluit zonder opslaan |
| F2 | Project 1 | Project wijzigt naar eerste project |
| F3 | Project 2 | Project wijzigt naar tweede project |
| F4 | Project 3 | Project wijzigt naar derde project |
| F5 | Project 4 | Project wijzigt naar vierde project |
| F6 | Project 5 | Project wijzigt naar vijfde project |
| F7 | Context 1 | Context wijzigt naar eerste context |
| F8 | Context 2 | Context wijzigt naar tweede context |
| F9 | Context 3 | Context wijzigt naar derde context |
| Shift+F9 | Prioriteit modal | Prioriteit popup opent |

### Test Each Shortcut

Voor **ELKE** shortcut hierboven:
```
1. Open popup
2. Klik "Project toevoegen" (of "Context toevoegen")
3. Test de shortcut
4. Verify expected result
5. ✅ Mark as passed
```

## Test Scenario 5: Edge Cases

### Disabled Elements
```
1. Open popup met taak die geen project heeft
2. Disable project button (if applicable)
3. Focus on disabled element
4. Test shortcuts
```
**Expected**: ✅ Shortcuts werken ook bij disabled elements

### Rapid Key Presses
```
1. Open popup
2. Klik project button
3. Druk snel: F2, F3, F4, F5 (rapid fire)
```
**Expected**: ✅ Laatste shortcut wint, geen crashes

### Dropdowns Open
```
1. Open popup
2. Klik project dropdown → laat dropdown OPEN staan
3. Test F-key shortcuts
```
**Expected**: ✅ Shortcuts werken, dropdown kan sluiten of blijven open

## Validation Checklist

Before marking fix complete, verify:

- [ ] **Scenario 1**: Project button + alle shortcuts werken
- [ ] **Scenario 2**: Context button + alle shortcuts werken
- [ ] **Scenario 3**: Rapid switching + shortcuts blijven werken
- [ ] **Scenario 4**: Alle 11 shortcuts individueel getest
- [ ] **Scenario 5**: Edge cases passed
- [ ] **No regressions**: Bestaande functionaliteit nog steeds intact
- [ ] **Performance**: Shortcuts responsen < 50ms (feel instant)
- [ ] **Console**: Geen JavaScript errors in console

## Success Criteria

✅ **Fix is succesvol** wanneer:
1. Alle 11 shortcuts werken ongeacht welk element focus heeft
2. Geen breaking changes aan bestaand gedrag
3. Geen console errors
4. Performance blijft instant (<50ms)

❌ **Fix faalt** wanneer:
1. Shortcuts werken niet na focus wijziging
2. Bestaande functionaliteit is broken
3. Console errors verschijnen
4. Performance degradeert merkbaar

## Debugging Tools

Als test faalt:
```javascript
// Open browser console en run:
const popup = document.getElementById('planningPopup');
popup.addEventListener('keydown', (e) => {
    console.log('Popup keydown:', e.key, 'Phase:', e.eventPhase);
}, { capture: true });

// Check event phase:
// 1 = CAPTURING_PHASE ✅ (want we hebben dit)
// 2 = AT_TARGET
// 3 = BUBBLING_PHASE
```

## Rollback Plan

If critical bugs found:
```bash
git checkout staging
git revert HEAD
git push origin staging
# Vercel auto-deploys binnen 60 sec
```

---
**Quickstart Ready**: Test scenarios defined
**Next**: Implementation via tasks.md
