# Quickstart: Admin2 Bericht Edit Weergave Bug Fix

**Feature**: 034-als-ik-in
**Date**: 2025-10-24
**Environment**: dev.tickedify.com (staging)

## Doel
Verifieer dat de bug fix werkt: gebruiker selectie en pagina selectie worden correct getoond bij het bewerken van berichten.

## Prerequisites

- Admin toegang tot dev.tickedify.com
- Login credentials: jan@buskens.be / [password from CLAUDE.md]
- Browser: Chrome, Safari, of Firefox (recente versie)
- Test berichten in database met:
  - `target_type: 'specific_users'`
  - `trigger_type: 'next_page_visit'` (of andere page-based trigger)

## Test Scenario 1: Specifieke Gebruiker Selectie

### Setup
1. Navigeer naar dev.tickedify.com/admin2.html
2. Login als admin
3. Klik op "Messages" in sidebar

### Preparation (alleen eerste keer)
Als er nog geen test bericht bestaat met specifieke gebruiker:
1. Klik "➕ Nieuw Bericht"
2. Vul in:
   - Titel: "TEST: User Selection Bug Fix"
   - Bericht: "Dit is een test bericht voor specifieke gebruiker"
   - Type: Information
3. Bij "Doelgroep", selecteer: **Specifieke gebruikers**
4. Zoek en selecteer: jan@buskens.be
5. Verificatie: Zie user badge "Jan Buskens (jan@buskens.be)"
6. Trigger: "Onmiddellijk"
7. Klik "Bericht Aanmaken"
8. Noteer bericht ID uit de lijst

### Test Execution
1. Zoek het test bericht in de lijst
2. Klik op **✏️ Bewerken** knop
3. **VERWACHT RESULTAAT**:
   - Modal opent met titel "✏️ Bericht Bewerken"
   - Radio button "Specifieke gebruikers" is geselecteerd
   - User search sectie is zichtbaar
   - ✅ **USER BADGE WORDT GETOOND**: "Jan Buskens (jan@buskens.be)"
   - Geselecteerde gebruikers teller toont: "(1)"

4. **BUG REPRODUCTIE (voordat fix)**:
   - ❌ Geen user badges getoond
   - Toont: "Geen gebruikers geselecteerd"
   - Data is WEL in database (verifieer via console: `selectedUserIds` is leeg)

### Verification
```javascript
// Open browser console (F12)
// Check state:
console.log('selectedUserIds:', selectedUserIds);
// Should show: [42] (of andere user ID)

console.log('selectedUsersData:', selectedUsersData);
// Should show: {42: {naam: "Jan Buskens", email: "jan@buskens.be"}}
```

### Acceptance Criteria
- [ ] User badge(s) worden getoond met naam en email
- [ ] Geselecteerde gebruikers teller is correct (bijv. "(1)")
- [ ] User kan extra gebruikers toevoegen via search
- [ ] User kan bestaande gebruiker verwijderen via × knop
- [ ] Bij save blijven selected users behouden

---

## Test Scenario 2: Volgend Bezoek Aan Pagina Trigger

### Setup
1. Zelfde navigatie als Scenario 1
2. Bereid test bericht voor met page-based trigger

### Preparation (alleen eerste keer)
1. Klik "➕ Nieuw Bericht"
2. Vul in:
   - Titel: "TEST: Page Selection Bug Fix"
   - Bericht: "Test voor pagina selectie"
   - Type: Information
3. Doelgroep: "Alle gebruikers"
4. Bij "Trigger", selecteer: **Volgend bezoek aan pagina**
5. Kies pagina: "/app/dagelijkse-planning" (Dagelijkse Planning)
6. Verificatie: Zie dropdown waarde is correct geselecteerd
7. Klik "Bericht Aanmaken"
8. Noteer bericht ID

### Test Execution
1. Zoek het test bericht in de lijst
2. Klik op **✏️ Bewerken** knop
3. **VERWACHT RESULTAAT**:
   - Radio button "Volgend bezoek aan pagina" is geselecteerd
   - Next page visit sectie is zichtbaar
   - ✅ **PAGINA DROPDOWN TOONT CORRECT**: "Dagelijkse Planning" (of juiste pagina)

4. **BUG REPRODUCTIE (voordat fix)**:
   - ❌ Dropdown toont eerste optie (leeg of verkeerde pagina)
   - ❌ Database waarde wordt niet weergegeven
   - Trigger type IS correct (radio button klopt)

### Verification
```javascript
// Browser console check
const nextPageSelect = document.getElementById('nextPageSelect'); // of firstPageSelect/nthPageSelect
console.log('Selected value:', nextPageSelect.value);
// Should match: "/app/dagelijkse-planning"

console.log('Expected value from DB:', /* from network tab */ );
// Verify ze matchen
```

### Acceptance Criteria
- [ ] Pagina dropdown toont correct de opgeslagen pagina
- [ ] Dropdown value matcht database trigger_value
- [ ] User kan pagina wijzigen naar andere optie
- [ ] Bij save wordt nieuwe pagina correct opgeslagen

---

## Test Scenario 3: Gecombineerd (Edge Case)

### Setup
Test bericht met BEIDE: specifieke gebruiker + page-based trigger

### Preparation
1. Nieuw bericht aanmaken
2. Titel: "TEST: Combined User + Page"
3. Doelgroep: **Specifieke gebruikers** → selecteer jan@buskens.be
4. Trigger: **Eerste bezoek aan pagina** → selecteer "/app/dagelijkse-planning"
5. Aanmaken

### Test Execution
1. Bewerk het bericht
2. **VERWACHT RESULTAAT**:
   - ✅ User badge wordt getoond
   - ✅ Pagina dropdown is correct geselecteerd
   - ✅ Beide sections zijn zichtbaar en correct ingevuld

### Acceptance Criteria
- [ ] Gebruiker EN pagina selectie beide correct getoond
- [ ] Kan beide wijzigen onafhankelijk
- [ ] Save behoudt beide settings correct

---

## Test Scenario 4: Edge Cases

### 4A: Meerdere Gebruikers
1. Maak bericht met 3 specifieke gebruikers
2. Bewerk bericht
3. Verwacht: Alle 3 user badges getoond
4. Acceptatie: Teller toont "(3)"

### 4B: Niet-Bestaande Gebruiker (Database Cleanup)
1. Zoek bericht met user ID die niet meer bestaat
2. Bewerk bericht
3. Verwacht: User ID wordt getoond (geen crash)
4. Acceptatie: Graceful degradation - toont ID ipv naam

### 4C: Nth Page Visit met Count
1. Maak bericht: "3e bezoek aan /app/dagelijkse-planning"
2. Bewerk bericht
3. Verwacht:
   - Count input toont "3"
   - Page dropdown toont "Dagelijkse Planning"

---

## Rollback Procedure

Als de fix problemen veroorzaakt op staging:

1. **Immediate rollback**:
   ```bash
   git revert HEAD
   git push origin 034-als-ik-in
   ```

2. **Vercel auto-deploys** de revert naar dev.tickedify.com

3. **Rapporteer issue** met:
   - Welk scenario faalde
   - Console errors (F12 → Console tab)
   - Network tab (F12 → Network) response data
   - Screenshot van bug

---

## Success Criteria

**Alle tests MOETEN slagen voordat merge naar main:**

- [ ] Scenario 1: User selection PASS
- [ ] Scenario 2: Page selection PASS
- [ ] Scenario 3: Combined PASS
- [ ] Scenario 4A: Multiple users PASS
- [ ] Scenario 4B: Deleted user PASS (no crash)
- [ ] Scenario 4C: Nth visit PASS
- [ ] Geen nieuwe console errors
- [ ] Create nieuwe berichten werkt nog steeds (regression test)

**Testing time**: ~15 minuten voor complete suite

---

## Troubleshooting

### Issue: User badges niet getoond
**Check:**
- Browser console: `selectedUserIds` en `selectedUsersData` variabelen
- Network tab: `/api/admin/messages/{id}` response bevat `target_users` array?
- Fix applied: Code toegevoegd na regel ~2213 in admin2.html?

### Issue: Pagina dropdown leeg
**Check:**
- Console: `document.getElementById('nextPageSelect').value`
- Network tab: `trigger_value` in response
- Dropdown HTML: Bestaan de `<option>` elementen?
- Timing: Is dropdown al gebouwd voordat value wordt gezet?

### Issue: Opslaan werkt niet
**Check:**
- Console errors bij submit
- Network tab: PUT request body bevat correct `target_users` / `trigger_value`?
- Dit zou NIET moeten falen (save logic ongewijzigd)

---

## Manual Test Checklist

**Pre-deployment** (development):
- [ ] Code review: Wijzigingen in admin2.html gecontroleerd
- [ ] Changelog: Entry toegevoegd voor v0.19.179

**Staging deployment** (dev.tickedify.com):
- [ ] Deploy succesvol
- [ ] All 6 test scenarios uitgevoerd
- [ ] Regression: Create new message nog steeds werkt
- [ ] Cross-browser: Getest in Chrome EN Safari

**Production deployment** (tickedify.com):
- [ ] 🔒 BÈTA FREEZE CHECK: Is freeze opgeheven?
- [ ] Staging tests volledig geslaagd
- [ ] Changelog finalized
- [ ] Version bump in package.json
- [ ] User communicatie: Vermelding in changelog voldoende (silent fix)

---

**Test uitvoering door**: Jan Buskens (of Claude via Playwright indien geautomatiseerd)
**Geschatte test tijd**: 15 minuten handmatig, 5 minuten geautomatiseerd
**Test frequency**: Eenmalig na implementatie, regression tests bij toekomstige message systeem wijzigingen
