# Quickstart: Alfabetische Contexten Sortering Testen

**Feature**: 040-in-de-popup
**Date**: 2025-10-30
**Environment**: dev.tickedify.com (staging)

## Pre-requisites

✅ **Login Credentials**:
- Email: `jan@buskens.be`
- Wachtwoord: `qyqhut-muDvop-fadki9`

✅ **Test Environment**:
- Staging URL: https://dev.tickedify.com/app
- Vercel Authentication: Use Vercel MCP tools or browser with auth

✅ **Required Test Data**:
Zorg dat de test account minimaal deze contexten heeft:
- "Werk"
- "Thuis"
- "Administratie"
- "Hobby"

---

## Quick Test (5 minuten)

### Stap 1: Setup Test Data (Optioneel)

Als de test account nog geen gevarieerde contexten heeft:

```bash
# Via API (met authentication cookie)
curl -X POST https://dev.tickedify.com/api/lijst/contexten \
     -H "Cookie: connect.sid=..." \
     -H "Content-Type: application/json" \
     -d '{"naam": "Administratie"}'

curl -X POST https://dev.tickedify.com/api/lijst/contexten \
     -H "Cookie: connect.sid=..." \
     -H "Content-Type: application/json" \
     -d '{"naam": "Hobby"}'
```

**Of via UI**:
1. Ga naar Settings → Contexten
2. Voeg contexten toe: "Werk", "Thuis", "Administratie", "Hobby"

---

### Stap 2: Visuele Verificatie in Browser

#### 2.1 Open Taak-Aanpas Popup

1. **Navigeer**: https://dev.tickedify.com/app
2. **Login**: jan@buskens.be / wachtwoord
3. **Open popup**: Klik op bestaande taak → "Bewerk" knop
   - OF: Klik op "Nieuwe Taak" knop

#### 2.2 Controleer Context Dropdown

1. **Klik op**: "Context" dropdown veld
2. **Visuele check**: Zijn contexten alfabetisch gesorteerd?

**Expected Result** ✅:
```
Select context...
Administratie
Hobby
Thuis
Werk
```

**NOT Expected** ❌ (oude sortering op aanmaakdatum):
```
Select context...
Hobby         (nieuwste)
Werk          (2e nieuwste)
Thuis         (3e nieuwste)
Administratie (oudste)
```

---

### Stap 3: API Verificatie

Test direct via API endpoint:

```bash
# Haal contexten op (met jq voor pretty print)
curl -s -L -k https://dev.tickedify.com/api/lijst/contexten \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     | jq '.[].naam'
```

**Expected Output**:
```json
"Administratie"
"Hobby"
"Thuis"
"Werk"
```

**Verification**: Namen zijn alfabetisch gesorteerd (A-Z)

---

## Comprehensive Test (15 minuten)

### Test Scenario 1: Basis Alfabetische Sortering

**Setup**: Zorg voor deze contexten (in willekeurige aanmaak volgorde):
- "Zebra"
- "Apple"
- "Mango"
- "Banaan"

**Test**:
1. Open taak-aanpas popup
2. Open context dropdown

**Expected**: "Apple" → "Banaan" → "Mango" → "Zebra" (alfabetisch)

---

### Test Scenario 2: Case-Insensitive Sortering

**Setup**: Contexten met mixed case:
- "PROJECTEN"
- "admin"
- "Context"
- "hobby"

**Test**:
1. Open context dropdown in popup

**Expected Order**:
```
admin        (lowercase eerst, maar case-insensitive sort)
Context
hobby
PROJECTEN
```

**Verification**: Sortering negeert hoofdletters/kleine letters

---

### Test Scenario 3: Nederlandse Accenten

**Setup**: Contexten met accenten:
- "École"
- "Context"
- "Café"
- "Admin"

**Test**:
1. Open context dropdown

**Expected Order**:
```
Admin
Café         (é wordt gesorteerd als e variant)
Context
École        (É wordt gesorteerd als E variant)
```

**Verification**: Accenten worden correct behandeld door PostgreSQL collation

---

### Test Scenario 4: Cijfers en Speciale Tekens

**Setup**: Edge case contexten:
- "2024 Budget"
- "Admin"
- "@Urgent"
- "Werk"

**Expected Order** (PostgreSQL ASCII sortering):
```
@Urgent          (ASCII 64 - speciale tekens eerst)
2024 Budget      (ASCII 48-57 - cijfers na speciale tekens)
Admin            (ASCII 97 - letters na cijfers)
Werk
```

**Verification**: Edge cases worden logisch gesorteerd (specials → numbers → letters)

---

### Test Scenario 5: Lege Lijst

**Setup**: Test account zonder contexten

**Test**:
1. Login met nieuw account (of verwijder alle contexten)
2. Open taak-aanpas popup
3. Open context dropdown

**Expected**:
```
Select context...
(geen andere opties)
```

**Verification**: Geen error, dropdown toont alleen placeholder

---

### Test Scenario 6: Consistency Check

**Test**: Controleer dat sortering consistent is in alle popups

**Locations to Check**:
1. **Nieuwe Taak Popup**: Klik "Nieuwe Taak" → open context dropdown
2. **Bewerk Taak Popup**: Klik bestaande taak → "Bewerk" → open context dropdown
3. **Bulk Edit**: (als beschikbaar) Selecteer meerdere taken → open context dropdown

**Expected**: Alle drie locaties tonen **identieke alfabetische volgorde**

---

## Automated Testing (Optioneel)

### Playwright Test Script

Save als `tests/context-sortering.spec.js`:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Context Dropdown Alfabetische Sortering', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('https://dev.tickedify.com/app');
        await page.fill('input[type="email"]', 'jan@buskens.be');
        await page.fill('input[type="password"]', 'qyqhut-muDvop-fadki9');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/app');
    });

    test('Contexten zijn alfabetisch gesorteerd in nieuwe taak popup', async ({ page }) => {
        // Open nieuwe taak popup
        await page.click('button:has-text("Nieuwe Taak")');

        // Open context dropdown
        await page.click('#contextSelect');

        // Haal alle opties op (skip eerste placeholder)
        const options = await page.$$eval(
            '#contextSelect option',
            opts => opts.slice(1).map(o => o.textContent)
        );

        // Sorteer verwachte array alfabetisch
        const sorted = [...options].sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase(), 'nl')
        );

        // Verify
        expect(options).toEqual(sorted);
    });

    test('Contexten zijn alfabetisch gesorteerd in bewerk popup', async ({ page }) => {
        // Klik op eerste taak in lijst
        await page.click('.taak-item:first-child button:has-text("Bewerk")');

        // Open context dropdown
        await page.click('#contextSelect');

        // Haal opties op
        const options = await page.$$eval(
            '#contextSelect option',
            opts => opts.slice(1).map(o => o.textContent)
        );

        // Sorteer expected
        const sorted = [...options].sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase(), 'nl')
        );

        // Verify
        expect(options).toEqual(sorted);
    });

    test('API endpoint returned alfabetisch gesorteerde data', async ({ page }) => {
        // Fetch API direct
        const response = await page.request.get(
            'https://dev.tickedify.com/api/lijst/contexten'
        );

        const data = await response.json();
        const names = data.map(c => c.naam);

        // Expected sort
        const sorted = [...names].sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase(), 'nl')
        );

        expect(names).toEqual(sorted);
    });
});
```

**Run Tests**:
```bash
npx playwright test tests/context-sortering.spec.js
```

---

## Rollback Procedure

Als de feature problemen veroorzaakt:

### Stap 1: Code Rollback

**Bestand**: `database.js` regel 584

**Revert naar oude query**:
```javascript
// OLD query (chronologisch)
query = 'SELECT * FROM contexten WHERE user_id = $1 ORDER BY aangemaakt DESC';
```

### Stap 2: Deployment

```bash
# Commit rollback
git add database.js
git commit -m "🔧 ROLLBACK: Revert context sortering naar chronologisch"

# Push naar staging
git push origin staging

# Wacht op Vercel deployment (~30 seconden)
```

### Stap 3: Verificatie

```bash
# Check deployed versie
curl -s -L -k https://dev.tickedify.com/api/version
```

**Risk**: 🟢 LOW - Single line change, instant rollback mogelijk

---

## Success Criteria Checklist

### Visual Tests
- [ ] Context dropdown in nieuwe taak popup is alfabetisch gesorteerd
- [ ] Context dropdown in bewerk taak popup is alfabetisch gesorteerd
- [ ] Sortering is case-insensitive ("admin" == "Admin")
- [ ] Nederlandse accenten correct gesorteerd ("Café" komt voor "Context")

### API Tests
- [ ] GET /api/lijst/contexten returned alfabetisch gesorteerde array
- [ ] Response structure unchanged (geen breaking changes)
- [ ] Empty array voor gebruiker zonder contexten

### Edge Cases
- [ ] Cijfers worden correct gesorteerd (voor letters)
- [ ] Speciale tekens (@, _, etc.) worden gehandeld
- [ ] Geen errors bij lege contextenlijst

### Performance
- [ ] Dropdown laadt instant (<100ms)
- [ ] Geen merkbare performance degradatie
- [ ] API response tijd <100ms

### Consistency
- [ ] Sortering is identiek in alle popups (nieuwe/bewerk)
- [ ] Client-side fallback zorgt voor consistentie
- [ ] Geen regressie in andere features

---

## Troubleshooting

### Issue: Dropdown niet alfabetisch

**Diagnose**:
```bash
# Check database query result direct
curl -s -L -k https://dev.tickedify.com/api/lijst/contexten | jq
```

**Mogelijke oorzaken**:
1. Database query niet gewijzigd → Check database.js:584
2. Caching issue → Clear browser cache, hard refresh
3. Vercel deployment niet compleet → Check deployment status

**Fix**: Force deployment of correcte versie

---

### Issue: Accenten niet correct gesorteerd

**Diagnose**: PostgreSQL locale configuratie

**Check**:
```sql
SHOW lc_collate;  -- Should be en_US.UTF-8 or nl_NL.UTF-8
```

**Workaround**: Client-side fallback in `vulContextSelect()` met `localeCompare('nl')`

---

### Issue: Performance problemen

**Diagnose**: Te veel contexten (>100)?

**Check**:
```bash
# Count contexten voor user
curl -s -L -k https://dev.tickedify.com/api/lijst/contexten | jq 'length'
```

**Fix**: Indien >50 contexten, overweeg paginatie of index op naam kolom

---

## Estimated Testing Time

| Test Type | Time |
|-----------|------|
| Quick Visual Test | 5 min |
| Comprehensive Manual | 15 min |
| Automated Playwright | 10 min (setup) + 2 min (run) |
| **Total** | **20-30 min** |

---

## Next Steps After Testing

1. ✅ **All tests pass**: Merge naar staging, wait for user approval
2. ❌ **Tests fail**: Debug, fix, re-test
3. 📝 **Document findings**: Update changelog met test resultaten
4. 🚀 **Production deployment**: (GEBLOKKEERD door bèta freeze - wacht op approval)

---

**Quickstart Status**: ✅ READY FOR EXECUTION
**Last Updated**: 2025-10-30
