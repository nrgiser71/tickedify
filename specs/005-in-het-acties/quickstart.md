# Quickstart: Bulk Actie Datum Knoppen Uitbreiden

**Feature**: 005-in-het-acties
**Branch**: `005-in-het-acties`
**Date**: 2025-10-06

## Purpose

Deze quickstart guide valideert dat de bulk weekdag knoppen feature correct werkt op alle dagen van de week en consistent is met het individuele taak menu.

## Prerequisites

- [x] Branch `005-in-het-acties` is uitge-checked
- [x] Code wijzigingen zijn geïmplementeerd in `public/app.js`
- [x] Deployed naar dev.tickedify.com (staging environment)
- [x] User account: jan@buskens.be met credentials
- [x] Acties lijst heeft minstens 5 taken om te testen

## Quick Validation Steps

### 1. Visual Verification (2 minuten)

**Doel**: Verify weekdag knoppen verschijnen correct in bulk modus

**Steps**:
```bash
1. Open browser naar https://dev.tickedify.com/app
2. Login met jan@buskens.be / qyqhut-muDvop-fadki9
3. Navigeer naar Acties lijst (sidebar)
4. Klik "Bulk bewerken" knop (rechtsboven)
5. Observeer bulk toolbar onderaan scherm
```

**Expected result**:
- ✅ Bulk toolbar verschijnt met knoppen
- ✅ "Vandaag" en "Morgen" knoppen zijn zichtbaar
- ✅ Weekdag knoppen voor resterende dagen van week zijn zichtbaar
- ✅ Aantal weekdag knoppen klopt voor huidige dag:
  - Maandag: 5 extra knoppen (wo, do, vr, za, zo)
  - Vrijdag: 1 extra knop (zondag)
  - Zondag: 0 extra knoppen (alleen vandaag/morgen)

**If fails**: Check console errors (F12) en verify app.js deployed correct

---

### 2. Functional Test: Bulk Datum Update (3 minuten)

**Doel**: Verify bulk weekdag actie updates alle geselecteerde taken

**Steps**:
```bash
1. In bulk modus (zie stap 1)
2. Selecteer 3 taken door erop te klikken
3. Verify "3 taken geselecteerd" text onderaan
4. Klik één van de weekdag knoppen (bv. "Donderdag")
5. Wacht op toast success message
6. Observeer dat bulk modus automatisch uitschakelt
7. Check dat taken nieuwe datum hebben in lijst
```

**Expected result**:
- ✅ Toast message: "3 taken bijgewerkt naar [datum]"
- ✅ Bulk modus deactiveert automatisch
- ✅ Taken hebben nieuwe verschijndatum zichtbaar in lijst
- ✅ Taken staan op correcte chronologische positie
- ✅ Geen console errors

**If fails**:
- Check Network tab (F12) voor API errors
- Verify `/api/taak/:id` PUT calls succeeded
- Check database: `SELECT id, tekst, verschijndatum FROM taken WHERE gebruiker_id = '...' ORDER BY verschijndatum`

---

### 3. Consistency Test: Individual vs Bulk Menu (2 minuten)

**Doel**: Verify individueel taak 3-puntjes menu toont zelfde weekdagen

**Steps**:
```bash
1. Exit bulk modus (klik Annuleren als nog actief)
2. Klik 3-puntjes knop (⋮) bij willekeurige taak in Acties lijst
3. Observeer "Plan op" sectie met weekdag knoppen
4. Vergelijk weekdag knoppen met bulk modus (stap 1)
```

**Expected result**:
- ✅ Exact dezelfde weekdag namen in beide menus
- ✅ Zelfde aantal knoppen (bv. maandag = 7 totaal in beide)
- ✅ Zelfde volgorde: Vandaag, Morgen, [weekdagen...]
- ✅ Individueel menu werkt nog steeds correct

**If fails**:
- Verify `getWeekdagKnoppen()` helper function gebruikt door beide menus
- Check code refactoring niet individueel menu broken heeft

---

### 4. Edge Case Test: Sunday Scenario (2 minuten)

**Doel**: Verify correcte behavior op zondag (geen resterende weekdagen)

**Steps**:
```bash
1. Open browser developer console (F12)
2. Inject date override code:
   > originalDate = Date;
   > Date = class extends originalDate {
       constructor() { return new originalDate('2025-10-12T10:00:00'); }
     };
3. Refresh page (F5)
4. Navigeer naar Acties lijst
5. Activeer bulk modus
6. Observeer bulk toolbar knoppen
```

**Expected result**:
- ✅ Alleen "Vandaag" en "Morgen" knoppen zichtbaar
- ✅ Geen weekdag knoppen (wo, do, vr, za, zo)
- ✅ Uitgesteld knoppen (Opvolgen, Wekelijks, etc.) nog steeds zichtbaar
- ✅ Bulk modus werkt normaal met alleen 2 datum knoppen

**Cleanup**:
```bash
> Date = originalDate;  // Restore normal Date
> location.reload();    // Refresh to normal date
```

**If fails**: Check `dagenTotZondag` berekening in `getWeekdagKnoppen()`

---

### 5. Mobile Responsive Test (1 minuut)

**Doel**: Verify bulk toolbar werkt op mobiele viewport

**Steps**:
```bash
1. Open Chrome DevTools (F12)
2. Enable device emulation (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" of vergelijkbaar
4. Navigeer naar Acties lijst
5. Activeer bulk modus
6. Observeer bulk toolbar layout
```

**Expected result**:
- ✅ Bulk toolbar zichtbaar onderaan scherm
- ✅ Knoppen zijn klikbaar (niet te klein)
- ✅ Tekst is leesbaar
- ✅ Geen horizontal scroll nodig
- ✅ Knoppen wrappen naar volgende regel indien nodig

**If fails**: Check CSS `.bulk-action-btn` responsive styling

---

## Comprehensive Test Matrix

Test alle weekdag combinaties voor thoroughness:

| Dag van Week | Vandaag/Morgen | Weekdag Knoppen | Totaal Datum Knoppen |
|-------------|----------------|-----------------|---------------------|
| Maandag     | ✅ (2)         | Wo, Do, Vr, Za, Zo | 7 |
| Dinsdag     | ✅ (2)         | Do, Vr, Za, Zo | 6 |
| Woensdag    | ✅ (2)         | Vr, Za, Zo | 5 |
| Donderdag   | ✅ (2)         | Za, Zo | 4 |
| Vrijdag     | ✅ (2)         | Zo | 3 |
| Zaterdag    | ✅ (2)         | - | 2 |
| Zondag      | ✅ (2)         | - | 2 |

**Validation**: Voor elke dag, verify dat aantal knoppen klopt

---

## Performance Validation

### Loading Time Test

**Steps**:
```bash
1. Open Chrome DevTools Performance tab
2. Start recording
3. Navigeer naar Acties lijst
4. Klik "Bulk bewerken"
5. Stop recording
6. Analyze bulk toolbar rendering
```

**Expected metrics**:
- ✅ Bulk toolbar render < 100ms
- ✅ `getBulkVerplaatsKnoppen()` execution < 5ms
- ✅ No layout thrashing
- ✅ No forced reflows

### Bulk Update Performance

**Steps**:
```bash
1. Create 20 taken in Acties lijst (bulk test data)
2. Activeer bulk modus
3. Selecteer alle 20 taken
4. Start Network tab monitoring
5. Klik weekdag knop
6. Observe API call waterfall
```

**Expected metrics**:
- ✅ 20 PUT requests to `/api/taak/:id`
- ✅ Total time < 2 seconds (20 × ~50ms avg)
- ✅ Success rate 100% (geen failures)
- ✅ Loading indicator zichtbaar tijdens bulk update
- ✅ UI blijft responsive (geen freeze)

---

## Regression Checks

Verify geen bestaande functionaliteit is broken:

### ✅ Individuele Taak Datum Wijziging
- Klik 3-puntjes bij taak → selecteer weekdag → datum updated correct

### ✅ Bulk Modus Annuleren
- Activeer bulk modus → selecteer taken → klik Annuleren → selecties cleared

### ✅ Bulk Verplaats naar Uitgesteld
- Bulk selectie → klik "Wekelijks" → taken verplaatst naar uitgesteld lijst

### ✅ Normaal Taak Afwerken (non-bulk)
- Checkbox klikken werkt normaal buiten bulk modus

### ✅ Drag & Drop Functionaliteit
- Taken slepen werkt nog steeds in non-bulk modus

---

## Success Criteria

Feature is **ready for production** wanneer:

- [x] Alle 5 quickstart tests slagen (visual, functional, consistency, edge case, mobile)
- [x] Test matrix gevalideerd voor minstens 3 verschillende weekdagen
- [x] Performance metrics voldoen aan targets (<100ms render, <2s bulk update)
- [x] Alle regression checks slagen
- [x] Geen console errors tijdens normale workflow
- [x] Playwright automation tests slagen (indien geïmplementeerd)

## Troubleshooting

### Issue: Weekdag knoppen verschijnen niet

**Debug steps**:
```javascript
// Browser console
> app.huidigeLijst  // Should be 'acties'
> app.bulkModus     // Should be true
> new Date().getDay()  // Check current weekday (0-6)
```

**Possible causes**:
- Bulk modus niet op 'acties' lijst
- `getWeekdagKnoppen()` niet correct aangeroepen
- Weekdag berekening edge case (zondag)

### Issue: Bulk update faalt voor sommige taken

**Debug steps**:
```javascript
// Network tab: inspect failed PUT requests
// Check response: likely authentication or validation error
```

**Possible causes**:
- Session expired (401 Unauthorized)
- Invalid taak ID (404 Not Found)
- Database constraint violation (500 Internal Server Error)

### Issue: Verschillende knoppen tussen bulk en individueel menu

**Root cause**: `getWeekdagKnoppen()` niet gedeeld of verschillende parameters

**Fix**: Verify beide menus gebruiken exact dezelfde helper function call

---

## Next Steps

Na succesvolle quickstart validation:

1. ✅ **Staging approval**: Jan valideert op dev.tickedify.com
2. ✅ **Changelog update**: Voeg feature toe aan changelog.html
3. ✅ **Version bump**: Update package.json naar nieuwe versie
4. ✅ **Production deployment**:
   - Create Pull Request van `005-in-het-acties` naar `main`
   - Wacht op expliciete approval: "JA, DEPLOY NAAR PRODUCTIE"
   - Merge en deploy naar tickedify.com
5. ✅ **Production verification**: Herhaal quickstart tests op live environment
6. ✅ **Monitor**: Check for errors in production logs eerste 24 uur

---

**Quickstart Complete** ✅

Feature is klaar voor productie deployment wanneer alle tests slagen!
