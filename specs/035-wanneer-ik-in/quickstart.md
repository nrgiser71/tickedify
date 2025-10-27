# Quickstart: Test Duplicate Toast Fix

**Feature**: Fix Duplicate Toast Berichten Bij Postponed Weekly Drag & Drop
**Date**: 2025-10-25

## Prerequisites
- Tickedify app deployed to staging (dev.tickedify.com)
- Test account credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Browser with DevTools (Chrome recommended)

---

## Quick Test (2 minutes)

### Test 1: Basic Drag & Drop
**Expected**: 1 toast bericht per drag & drop

```
1. Open https://tickedify.com/app
2. Login met jan@buskens.be / qyqhut-muDvop-fadki9
3. Navigate naar "Acties" scherm
4. Find any task in acties lijst
5. Drag task naar "Uitgesteld Wekelijks" lijst
6. ✅ VERIFY: Exact 1 toast "Task Moved To Uitgesteld Wekelijks"
7. ✅ VERIFY: Toast verdwijnt na ~4 seconden
```

**PASS Criteria**: 1 toast bericht, geen duplicates

---

## Comprehensive Test (10 minutes)

### Test 2: Navigation Stress Test
**Purpose**: Verify geen listener accumulation bij re-renders

```
1. Navigate naar "Acties" scherm
2. Open "Uitgesteld" sectie
3. Close "Uitgesteld" sectie
4. Repeat steps 2-3 vijf keer (5× open/close)
5. Drag een taak naar "Uitgesteld Wekelijks"
6. ✅ VERIFY: Still exact 1 toast (geen accumulation)
```

**PASS Criteria**: Nog steeds 1 toast na 5× re-renders

---

### Test 3: Multi-Screen Navigation Test
**Purpose**: Verify geen accumulation bij screen switches

```
1. Start in "Acties" scherm
2. Navigate naar "Planning" scherm
3. Navigate terug naar "Acties" scherm
4. Repeat steps 2-3 vijf keer (5× screen switch)
5. Drag een taak naar "Uitgesteld Wekelijks"
6. ✅ VERIFY: Still exact 1 toast
```

**PASS Criteria**: 1 toast ongeacht aantal navigaties

---

### Test 4: Multiple Drag & Drops
**Purpose**: Verify consistent behavior bij rapid actions

```
1. In "Acties" scherm
2. Drag taak #1 naar "Uitgesteld Wekelijks"
3. Wait for toast to disappear (~4 sec)
4. Drag taak #2 naar "Uitgesteld Maandelijks"
5. Wait for toast to disappear
6. Drag taak #3 naar "Uitgesteld 3-Maandelijks"
7. ✅ VERIFY: Elk kreeg exact 1 toast
8. ✅ VERIFY: Correct category name in toast
```

**PASS Criteria**: 1 toast per taak, correcte category namen

---

### Test 5: All Categories Test
**Purpose**: Verify fix werkt voor alle 5 uitgesteld categories

```
Drag 1 taak naar elk van deze lijsten:
1. Uitgesteld Wekelijks → ✅ 1 toast
2. Uitgesteld Maandelijks → ✅ 1 toast
3. Uitgesteld 3-Maandelijks → ✅ 1 toast
4. Uitgesteld 6-Maandelijks → ✅ 1 toast
5. Uitgesteld Jaarlijks → ✅ 1 toast
```

**PASS Criteria**: Alle 5 categories tonen exact 1 toast

---

### Test 6: Header vs Content Drop Zones
**Purpose**: Verify beide drop zones werken correct

```
1. Collapse "Uitgesteld Wekelijks" sectie (alleen header visible)
2. Drag taak naar header → ✅ 1 toast
3. Expand "Uitgesteld Wekelijks" sectie
4. Drag taak naar content area → ✅ 1 toast
```

**PASS Criteria**: Beide drop zones (header + content) tonen 1 toast

---

## Regression Tests

### Test 7: Drop Functionality
**Purpose**: Verify drop actually works (niet alleen toast)

```
1. Note taak ID before drag (bijv. "Taak XYZ")
2. Drag "Taak XYZ" naar "Uitgesteld Wekelijks"
3. ✅ VERIFY: Taak verdwijnt uit "Acties" lijst
4. ✅ VERIFY: Taak verschijnt in "Uitgesteld Wekelijks" lijst
5. Check database/API:
   curl https://tickedify.com/api/lijst/acties
6. ✅ VERIFY: Taak heeft lijst="uitgesteld-wekelijks"
```

**PASS Criteria**: Taak is daadwerkelijk verplaatst (niet alleen toast)

---

### Test 8: Visual Feedback
**Purpose**: Verify drag & drop visual feedback nog werkt

```
1. Start dragging een taak
2. ✅ VERIFY: Drag element wordt visible
3. Hover over "Uitgesteld Wekelijks" drop zone
4. ✅ VERIFY: Drop zone highlight/feedback verschijnt
5. Drop taak
6. ✅ VERIFY: Highlight verdwijnt
7. ✅ VERIFY: Toast verschijnt
```

**PASS Criteria**: Alle visual feedback werkt correct

---

## Performance Test

### Test 9: Memory Leak Check
**Purpose**: Verify geen listener accumulation in memory

```
1. Open Chrome DevTools → Memory tab
2. Take heap snapshot #1
3. Navigate 10× tussen schermen
4. Open/close uitgesteld 10×
5. Take heap snapshot #2
6. Compare snapshots
7. ✅ VERIFY: Geen significant groei van event listeners
```

**PASS Criteria**: Event listener count blijft constant

---

### Test 10: Console Errors
**Purpose**: Verify geen JavaScript errors

```
1. Open Chrome DevTools → Console tab
2. Clear console
3. Perform Tests 1-8
4. ✅ VERIFY: Geen errors in console
5. ✅ VERIFY: Geen warnings over event listeners
```

**PASS Criteria**: Clean console log

---

## Browser Compatibility

Test op minimaal deze browsers:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)

**PASS Criteria**: Alle tests slagen in alle browsers

---

## Automated Test Script (Optional)

Voor Playwright testing:

```javascript
test('should show exactly 1 toast on drag to postponed weekly', async ({ page }) => {
  // Login
  await page.goto('https://tickedify.com/app');
  await page.fill('input[type="email"]', 'jan@buskens.be');
  await page.fill('input[type="password"]', 'qyqhut-muDvop-fadki9');
  await page.click('button[type="submit"]');

  // Navigate to actions
  await page.click('text=Acties');

  // Setup toast counter
  let toastCount = 0;
  page.on('console', msg => {
    if (msg.text().includes('Task Moved To Uitgesteld')) {
      toastCount++;
    }
  });

  // Drag task
  const task = await page.locator('.taak-item').first();
  const dropZone = await page.locator('[data-category="uitgesteld-wekelijks"]');
  await task.dragTo(dropZone);

  // Wait for toast
  await page.waitForTimeout(1000);

  // Verify exactly 1 toast
  expect(toastCount).toBe(1);
});
```

---

## Test Results Template

```markdown
## Test Uitvoering: [DATUM]

### Environment
- URL: dev.tickedify.com of tickedify.com
- Browser: Chrome/Firefox/Safari [VERSION]
- Tester: [NAAM]

### Results
- [ ] Test 1: Basic Drag & Drop - PASS/FAIL
- [ ] Test 2: Navigation Stress - PASS/FAIL
- [ ] Test 3: Multi-Screen Navigation - PASS/FAIL
- [ ] Test 4: Multiple Drag & Drops - PASS/FAIL
- [ ] Test 5: All Categories - PASS/FAIL
- [ ] Test 6: Header vs Content - PASS/FAIL
- [ ] Test 7: Drop Functionality - PASS/FAIL
- [ ] Test 8: Visual Feedback - PASS/FAIL
- [ ] Test 9: Memory Leak Check - PASS/FAIL
- [ ] Test 10: Console Errors - PASS/FAIL

### Issues Found
[Beschrijf eventuele problemen]

### Overall Status
PASS / FAIL

### Notes
[Extra opmerkingen]
```

---

## Success Criteria Summary

✅ **Fix is succesvol als**:
1. Exactly 1 toast per drag & drop actie
2. Consistent gedrag na navigatie/re-renders
3. Alle 5 categories werken correct
4. Beide drop zones (header + content) werken
5. Taak wordt daadwerkelijk verplaatst
6. Geen console errors
7. Geen memory leak
8. Visual feedback werkt nog

❌ **Fix faalt als**:
- Nog steeds 2+ toasts verschijnen
- Toasts verdwijnen (0 toasts)
- Drop functionaliteit stopt met werken
- Console errors verschijnen

---

**Quickstart Complete**: Ready voor testing na implementation
