# Quickstart: Testing Bulk Edit Prioriteit Fix

**Feature**: 045-afgelopen-nacht-hebben
**Version**: 0.20.41
**Environment**: dev.tickedify.com (staging)

## Prerequisites

1. **Login Credentials**:
   - Email: `jan@buskens.be`
   - Password: `qyqhut-muDvop-fadki9`
   - URL: https://dev.tickedify.com/app

2. **Browser Requirements**:
   - Chrome/Firefox met Developer Tools
   - Console tab open voor error monitoring

3. **Test Data**:
   - Minimaal 3 taken op het "Acties" scherm
   - Taken mogen diverse huidige prioriteiten hebben

## Test Procedure

### Test 1: Bulk Edit Prioriteit - Happy Path

**Objective**: Verify bulk edit met prioriteit 'gemiddeld' (voorheen 'normaal') werkt correct

**Steps**:
1. Navigate naar https://dev.tickedify.com/app
2. Login met test credentials
3. Ga naar "Acties" scherm (lijst weergave)
4. Selecteer 3 taken door op checkboxes te klikken
5. Klik op "Bulk Bewerken" knop
6. In bulk edit popup:
   - Laat Project dropdown op "-- Geen wijziging --"
   - Laat Datum veld leeg
   - Laat Context dropdown op "-- Geen wijziging --"
   - **Selecteer "Normaal" in Prioriteit dropdown**
   - Laat Geschatte tijd leeg
7. Klik "Opslaan"

**Expected Results**:
- ✅ Console toont GEEN 404 errors
- ✅ Console toont: `✅ DB: Query successful, rowCount: 1` (voor elke taak)
- ✅ Popup sluit automatisch
- ✅ Taken blijven geselecteerd in lijst (of deselecteren afhankelijk van UX)
- ✅ Taken tonen oranje prioriteit indicator (🟠)
- ✅ Bij hover over taak: prioriteit toont "Gemiddeld"

**Failure Indicators**:
- ❌ Console toont: `PUT /api/taak/xxx 404 (Not Found)`
- ❌ Error popup: "Taak niet gevonden" of "Partial failure"
- ❌ Taken blijven oude prioriteit indicator tonen

### Test 2: Bulk Edit Prioriteit - All Values

**Objective**: Verify alle prioriteit waarden werken (regression test)

**Test 2A: Prioriteit "Laag"**
1. Selecteer 2 taken
2. Open bulk edit popup
3. Selecteer "Laag" in Prioriteit dropdown
4. Klik "Opslaan"
5. **Expected**: ✅ Success, taken tonen witte indicator (⚪)

**Test 2B: Prioriteit "Hoog"**
1. Selecteer 2 taken
2. Open bulk edit popup
3. Selecteer "Hoog" in Prioriteit dropdown
4. Klik "Opslaan"
5. **Expected**: ✅ Success, taken tonen rode indicator (🔴)

**Test 2C: Geen Prioriteit Wijziging**
1. Selecteer 1 taak
2. Open bulk edit popup
3. Laat Prioriteit dropdown op "-- Geen wijziging --"
4. Verander alleen Datum naar morgen
5. Klik "Opslaan"
6. **Expected**: ✅ Success, prioriteit blijft ongewijzigd, datum is geüpdatet

### Test 3: API Direct Testing

**Objective**: Verify API endpoint accepts 'gemiddeld' waarde zonder errors

**Prerequisites**:
- Get session token from browser DevTools:
  1. Open DevTools → Application tab → Cookies
  2. Find `session` cookie value
  3. Copy value (format: `s%3A...`)

**Test 3A: Single Task Update via API**
```bash
# Set variables
SESSION_TOKEN="<paste-session-token-here>"
TASK_ID="<use-actual-task-id-from-acties-screen>"

# Test API call
curl -s -L -k -X PUT \
  "https://dev.tickedify.com/api/taak/${TASK_ID}" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=${SESSION_TOKEN}" \
  -d '{"prioriteit": "gemiddeld"}' \
  | jq .

# Expected output:
# {
#   "success": true
# }

# Verify in database
curl -s -L -k -X GET \
  "https://dev.tickedify.com/api/lijst/acties" \
  -H "Cookie: session=${SESSION_TOKEN}" \
  | jq ".[] | select(.id == \"${TASK_ID}\") | {id, tekst, prioriteit}"

# Expected:
# {
#   "id": "task_...",
#   "tekst": "...",
#   "prioriteit": "gemiddeld"
# }
```

**Test 3B: Verify Other Values**
```bash
# Test 'laag'
curl -s -L -k -X PUT \
  "https://dev.tickedify.com/api/taak/${TASK_ID}" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=${SESSION_TOKEN}" \
  -d '{"prioriteit": "laag"}' \
  | jq .

# Expected: {"success": true}

# Test 'hoog'
curl -s -L -k -X PUT \
  "https://dev.tickedify.com/api/taak/${TASK_ID}" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=${SESSION_TOKEN}" \
  -d '{"prioriteit": "hoog"}' \
  | jq .

# Expected: {"success": true}
```

### Test 4: Edge Cases

**Test 4A: Empty Bulk Edit (No Changes)**
1. Selecteer 1 taak
2. Open bulk edit popup
3. Laat ALLE velden op "-- Geen wijziging --" of leeg
4. Klik "Opslaan"
5. **Expected**: ✅ Popup sluit, geen errors, taak ongewijzigd

**Test 4B: Multiple Fields Changed**
1. Selecteer 2 taken
2. Open bulk edit popup
3. Wijzig Project naar een specifiek project
4. Wijzig Prioriteit naar "Hoog"
5. Wijzig Datum naar morgen
6. Klik "Opslaan"
7. **Expected**: ✅ Alle 3 velden succesvol geüpdatet

**Test 4C: Large Batch (10+ taken)**
1. Selecteer 10-15 taken (indien beschikbaar)
2. Open bulk edit popup
3. Wijzig Prioriteit naar "Normaal"
4. Klik "Opslaan"
5. **Expected**: ✅ Alle taken succesvol geüpdatet zonder timeout

### Test 5: UI Consistency Check

**Objective**: Verify prioriteit display is consistent across app

**Test 5A: Task List View**
1. Na bulk edit, scroll door acties lijst
2. **Verify**: Prioriteit indicators tonen correcte kleuren:
   - Laag = ⚪ wit/grijs
   - Normaal/Gemiddeld = 🟠 oranje
   - Hoog = 🔴 rood

**Test 5B: Task Edit Form**
1. Open een taak die bulk edit kreeg
2. Bekijk prioriteit dropdown
3. **Expected**: Dropdown toont correcte geselecteerde waarde
   - "Laag", "Normaal", of "Hoog"

**Test 5C: Filter Bar**
1. Gebruik prioriteit filter in acties scherm
2. Select "Gemiddeld" filter
3. **Expected**: Taken met prioriteit='gemiddeld' worden getoond
4. Includes taken die via bulk edit 'Normaal' kregen (nu 'gemiddeld' in DB)

## Regression Tests

**Critical**: Verify context fix (v0.20.39) blijft werken

**Test 6A: Bulk Edit Context**
1. Selecteer 2 taken
2. Open bulk edit popup
3. Wijzig Context naar een specifieke context
4. Klik "Opslaan"
5. **Expected**: ✅ Context succesvol geüpdatet (geen 404)

**Test 6B: Bulk Edit Project**
1. Selecteer 2 taken
2. Open bulk edit popup
3. Wijzig Project naar een specifiek project
4. Klik "Opslaan"
5. **Expected**: ✅ Project succesvol geüpdatet (geen 404)

## Success Criteria

### Must Pass (Blockers)
- [ ] Test 1: Bulk edit prioriteit "Normaal" succeeds zonder 404
- [ ] Test 2: Alle prioriteit waarden (laag/normaal/hoog) werken
- [ ] Test 3A: API direct test met 'gemiddeld' succeeds
- [ ] Test 5A: UI toont correcte prioriteit indicators

### Should Pass (Important)
- [ ] Test 3B: API accepts alle geldige waarden
- [ ] Test 4B: Multiple fields bulk edit werkt correct
- [ ] Test 5B: Task edit form toont correcte prioriteit
- [ ] Test 6: Regression tests voor context/project passed

### Nice to Have
- [ ] Test 4C: Large batch (10+ taken) performs well
- [ ] Test 4A: Empty bulk edit handled gracefully

## Troubleshooting

### Issue: Still Getting 404 Errors

**Check 1**: Verify HTML fix is deployed
```bash
curl -s -L -k https://dev.tickedify.com/index.html | grep -A 3 "bulkEditPriority"
# Should show: <option value="gemiddeld">Normaal</option>
```

**Check 2**: Clear browser cache
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Or: DevTools → Network tab → Disable cache checkbox

**Check 3**: Verify version deployed
```bash
curl -s -L -k https://dev.tickedify.com/api/version
# Should return: {"version":"0.20.41"}
```

### Issue: Wrong Prioriteit Indicator Color

**Check**: Database value vs UI config mismatch
1. Open DevTools Console
2. Inspect taak object: `console.log(taak)`
3. Verify `prioriteit` property = 'gemiddeld', 'laag', or 'hoog'
4. If different → data inconsistency in database

**Fix**: Manual database update (only if necessary):
```sql
-- Check for invalid values
SELECT id, tekst, prioriteit FROM taken WHERE prioriteit NOT IN ('laag', 'gemiddeld', 'hoog');

-- Fix if found (rare edge case)
UPDATE taken SET prioriteit = 'gemiddeld' WHERE prioriteit = 'normaal';
```

### Issue: Session Token Expired

**Symptom**: API tests return 401 Unauthorized

**Fix**:
1. Login again in browser
2. Get fresh session token from DevTools
3. Retry API tests with new token

## Deployment Verification

After deployment to dev.tickedify.com:

1. **Version Check**:
   ```bash
   curl -s -L -k https://dev.tickedify.com/api/version | jq .
   # Expected: {"version": "0.20.41"}
   ```

2. **HTML Source Check**:
   ```bash
   curl -s -L -k https://dev.tickedify.com/index.html | grep "bulkEditPriority" -A 5
   # Expected: Shows 'gemiddeld' not 'normaal'
   ```

3. **Changelog Verify**:
   - Navigate to https://dev.tickedify.com/changelog.html
   - Verify v0.20.41 entry exists with 🔧 FIX badge

✅ **Ready for Testing!**

If all tests pass → Feature is production-ready (after bèta freeze lift).
