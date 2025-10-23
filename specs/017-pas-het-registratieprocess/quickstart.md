# Quickstart: Sterke Wachtwoord Validatie Testing

**Feature**: 017-pas-het-registratieprocess
**Date**: 2025-10-18
**Purpose**: Manual testing scenario voor wachtwoord validatie feature

## Prerequisites

- ✅ Tickedify staging environment accessible (dev.tickedify.com of local)
- ✅ Browser with developer tools (Chrome/Firefox/Safari)
- ✅ Clean test email addresses (not previously registered)

## Test Scenario 1: Visual Requirements Display

**Objective**: Verify dat wachtwoord vereisten zichtbaar zijn bij pagina load

### Steps

1. **Open registratie pagina**
   ```
   URL: https://tickedify.com (of dev.tickedify.com voor staging)
   Click: "Gratis starten" of "Registreer" button
   ```

2. **Verify requirements zijn zichtbaar**
   - [ ] Zie je een lijst met wachtwoord vereisten?
   - [ ] Staat er "Minimaal 8 tekens"?
   - [ ] Staat er "Minimaal 1 hoofdletter"?
   - [ ] Staat er "Minimaal 1 cijfer"?
   - [ ] Staat er "Minimaal 1 speciaal teken"?

3. **Verify initial state**
   - [ ] Zijn alle vereisten in neutrale staat (grijs)?
   - [ ] Zijn er nog geen vinkjes of kruisjes?

**Expected Result**: ✅ Alle vereisten zichtbaar in neutrale staat

---

## Test Scenario 2: Real-Time Validation Feedback

**Objective**: Verify dat validatie real-time werkt tijdens typen

### Steps

1. **Open registratie pagina**

2. **Type zwak wachtwoord (incrementeel)**
   ```
   Type: "t"
   ```
   - [ ] Zie je ❌ bij "Minimaal 8 tekens"? (4 karakters te kort)
   - [ ] Zie je ❌ bij "Minimaal 1 hoofdletter"?
   - [ ] Zie je ❌ bij "Minimaal 1 cijfer"?
   - [ ] Zie je ❌ bij "Minimaal 1 speciaal teken"?

3. **Voeg hoofdletter toe**
   ```
   Type: "Test"
   ```
   - [ ] Zie je nu ✅ bij "Minimaal 1 hoofdletter"?
   - [ ] Blijven andere vereisten ❌?

4. **Voeg cijfer toe**
   ```
   Type: "Test1"
   ```
   - [ ] Zie je nu ✅ bij "Minimaal 1 hoofdletter"?
   - [ ] Zie je nu ✅ bij "Minimaal 1 cijfer"?
   - [ ] Blijven "8 tekens" en "speciaal teken" ❌?

5. **Voeg speciaal teken toe**
   ```
   Type: "Test1!"
   ```
   - [ ] Zie je nu ✅ bij "Minimaal 1 speciaal teken"?
   - [ ] Blijft "8 tekens" nog ❌? (6 karakters)

6. **Bereik 8 tekens**
   ```
   Type: "Test1!23"
   ```
   - [ ] Zie je nu ✅ bij alle vier de vereisten?
   - [ ] Is de submit button nu enabled?

**Expected Result**: ✅ Real-time feedback werkt, alle statussen correct

---

## Test Scenario 3: Submit Met Geldig Wachtwoord

**Objective**: Verify dat registratie lukt met sterk wachtwoord

### Steps

1. **Open registratie pagina**

2. **Vul geldig formulier in**
   ```
   Email: test-[timestamp]@example.com  (gebruik unique email!)
   Wachtwoord: Welkom2025!
   Naam: Test User
   ```

3. **Verify wachtwoord validatie**
   - [ ] Zie je ✅ bij alle vier de vereisten?

4. **Submit formulier**
   - [ ] Click "Registreer" button
   - [ ] Wacht op response

5. **Verify success**
   - [ ] Zie je succesbericht?
   - [ ] Word je doorgestuurd naar /app?
   - [ ] Zie je je naam in de interface?

**Expected Result**: ✅ Registratie succesvol, user is ingelogd

---

## Test Scenario 4: Submit Met Zwak Wachtwoord (Client-Side Blocked)

**Objective**: Verify dat submit button disabled blijft bij zwak wachtwoord

### Steps

1. **Open registratie pagina**

2. **Vul formulier in met zwak wachtwoord**
   ```
   Email: test2@example.com
   Wachtwoord: test
   Naam: Test User
   ```

3. **Verify button state**
   - [ ] Is de submit button disabled?
   - [ ] Zie je ❌ bij meerdere vereisten?

4. **Probeer te submitten**
   - [ ] Button click doet niets (disabled)

**Expected Result**: ✅ Client-side validatie voorkomt submit

---

## Test Scenario 5: Server-Side Validation (Fallback)

**Objective**: Verify dat server-side validatie werkt als client-side omzeild wordt

### Steps

1. **Open browser Developer Tools**
   - Chrome/Firefox: F12 of Cmd+Option+I (Mac)

2. **Navigate to Console tab**

3. **Voer direct POST request uit (omzeilt client-side validatie)**
   ```javascript
   fetch('https://tickedify.com/api/registreer', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'test-server-' + Date.now() + '@example.com',
       wachtwoord: 'weak',  // ZWAK WACHTWOORD
       naam: 'Server Test'
     })
   })
   .then(r => r.json())
   .then(data => console.log('Response:', data));
   ```

4. **Verify server response**
   - [ ] Zie je `success: false`?
   - [ ] Zie je `error: "Wachtwoord voldoet niet aan de beveiligingseisen"`?
   - [ ] Zie je `passwordErrors` array met 4 items?
   - [ ] Bevat array: "Wachtwoord moet minimaal 8 tekens bevatten"?
   - [ ] Bevat array: "Wachtwoord moet minimaal 1 hoofdletter bevatten"?
   - [ ] Bevat array: "Wachtwoord moet minimaal 1 cijfer bevatten"?
   - [ ] Bevat array: "Wachtwoord moet minimaal 1 speciaal teken bevatten"?

**Expected Result**: ✅ Server weigert zwak wachtwoord met duidelijke errors

---

## Test Scenario 6: Edge Cases

**Objective**: Verify edge case handling

### Test 6.1: Alleen Spaties
```
Wachtwoord: "        " (8 spaties)
```
- [ ] Real-time validatie toont fouten (geen hoofdletter, geen cijfer)?
- [ ] Submit wordt geblokkeerd of server weigert?

### Test 6.2: Speciaal Teken Variaties
Test verschillende speciale tekens:
```
Test@123  → Should work (@ is special)
Test!123  → Should work (! is special)
Test#123  → Should work (# is special)
Test-123  → Should work (- is special)
Test 123  → Should work (space is special)
```
- [ ] Alle variaties accepteren het speciaal teken?

### Test 6.3: Unicode Hoofdletter
```
Wachtwoord: Tëst@123 (ë is geen ASCII hoofdletter)
```
- [ ] Wordt dit geweigerd (ë telt niet als A-Z hoofdletter)?

### Test 6.4: Zeer Lang Wachtwoord
```
Wachtwoord: "VeryLongPassword123!" + "x".repeat(100)
```
- [ ] Wordt dit geaccepteerd door server?
- [ ] Werkt registratie normaal?

**Expected Result**: ✅ Edge cases worden correct afgehandeld

---

## Test Scenario 7: Show/Hide Password Toggle

**Objective**: Verify password visibility toggle werkt

### Steps

1. **Open registratie pagina**

2. **Type wachtwoord**
   ```
   Wachtwoord: Welkom2025!
   ```
   - [ ] Zie je bullets/asterisks (wachtwoord is hidden)?

3. **Click "eye" icon** (of "Toon wachtwoord" toggle)
   - [ ] Wordt het wachtwoord nu zichtbaar als plain text?
   - [ ] Zie je "Welkom2025!" leesbaar?

4. **Click icon nogmaals**
   - [ ] Wordt wachtwoord weer hidden?

**Expected Result**: ✅ Toggle werkt in beide richtingen

---

## Test Scenario 8: Backwards Compatibility

**Objective**: Verify dat bestaande gebruikers kunnen inloggen

### Steps

1. **Login met bestaand account** (aangemaakt voor deze feature)
   ```
   Email: jan@buskens.be
   Wachtwoord: qyqhut-muDvop-fadki9
   ```

2. **Verify login werkt**
   - [ ] Login succesvol?
   - [ ] Wordt er GEEN wachtwoord validatie getoond bij login?
   - [ ] Toegang tot app.html?

**Expected Result**: ✅ Bestaande accounts werken normaal

---

## Test Scenario 9: Error Messages in Nederlands

**Objective**: Verify dat alle foutmeldingen in correct Nederlands zijn

### Steps

1. **Test verschillende validatie fouten**

2. **Verify Nederlandse teksten**
   - [ ] "Minimaal 8 tekens" (niet "minimum 8 characters")
   - [ ] "Minimaal 1 hoofdletter" (niet "uppercase letter")
   - [ ] "Minimaal 1 cijfer" (niet "digit" of "number")
   - [ ] "Minimaal 1 speciaal teken" (niet "special character")

3. **Verify server error messages**
   - [ ] "Wachtwoord voldoet niet aan de beveiligingseisen"
   - [ ] "Account succesvol aangemaakt"
   - [ ] Alle errors in Nederlands?

**Expected Result**: ✅ Alle teksten in correct Nederlands

---

## Test Scenario 10: Mobile Responsive

**Objective**: Verify dat validatie werkt op mobile devices

### Steps

1. **Open in mobile browser** (of Chrome DevTools mobile emulation)
   - Chrome DevTools: Cmd+Shift+M (Mac) of F12 → Toggle device toolbar

2. **Emulate iPhone/Android**
   - Device: iPhone 12 Pro of Samsung Galaxy S20

3. **Test registratie flow**
   - [ ] Wachtwoord vereisten zichtbaar?
   - [ ] Real-time validatie werkt?
   - [ ] Show/hide toggle werkt?
   - [ ] Submit button correct enabled/disabled?
   - [ ] Touch targets groot genoeg?

**Expected Result**: ✅ Feature werkt correct op mobile

---

## Automated Testing Command (Playwright)

Voor geautomatiseerde testing via tickedify-testing agent:

```bash
# Run via Claude Code tickedify-testing agent
# Test scenario: Complete registration flow met wachtwoord validatie

1. Navigate to https://tickedify.com
2. Click "Gratis starten" button
3. Verify password requirements visible
4. Type weak password "test"
5. Verify validation errors shown
6. Type strong password "Welkom2025!"
7. Verify all requirements met
8. Fill email and name
9. Submit form
10. Verify success redirect to /app
```

---

## Success Criteria Checklist

**Feature is volledig werkend als**:

- [x] Wachtwoord vereisten zijn zichtbaar bij pagina load
- [x] Real-time validatie werkt tijdens typen
- [x] Visuele feedback (✅/❌) update correct
- [x] Submit button is disabled bij zwak wachtwoord
- [x] Submit button is enabled bij sterk wachtwoord
- [x] Server-side validatie weigert zwakke wachtwoorden
- [x] Server retourneert duidelijke `passwordErrors` array
- [x] Registratie lukt met sterk wachtwoord
- [x] Show/hide password toggle werkt
- [x] Alle teksten zijn in Nederlands
- [x] Edge cases worden correct afgehandeld
- [x] Bestaande gebruikers kunnen nog steeds inloggen
- [x] Mobile responsive werkt correct

---

## Rollback Scenario

**Als feature issues heeft in productie**:

1. **Identify issue**
   - Gebruikers kunnen niet registreren?
   - Validatie te streng?
   - Server errors?

2. **Quick rollback**
   ```bash
   git revert [commit-hash]
   git push origin main
   ```

3. **Vercel auto-deploys** rollback binnen 60 seconden

4. **Verify rollback**
   - Test registratie zonder wachtwoord validatie
   - Bevestig users kunnen registreren

---

## Performance Benchmarks

**Client-Side Validatie**:
- Target: <10ms per keystroke
- Measure: Browser DevTools Performance tab

**Server-Side Validatie**:
- Target: <100ms total request time
- Measure: Network tab timing

**Page Load**:
- Target: No impact op initial load time
- Measure: Lighthouse score should remain same

---

## Next Steps After Testing

1. ✅ Complete manual test scenarios 1-10
2. ✅ Verify all success criteria met
3. ✅ Document any issues found
4. ✅ Test on staging before production
5. ✅ Get user approval for production deployment
6. ✅ Deploy to production
7. ✅ Monitor error logs for 24 hours
8. ✅ Update changelog with version bump

---

## Testing Notes

**Test Email Pattern**:
Use timestamps to ensure unique emails:
```javascript
const testEmail = `test-${Date.now()}@example.com`;
```

**Clean Test Data**:
If testing on staging, you may need to clean test users from database after testing.

**Browser Compatibility**:
Test in at least:
- Chrome (primary)
- Safari (Mac users)
- Firefox (validation)

---

**Testing Completed**: [ ] Yes / [ ] No
**Issues Found**: [ ] None / [ ] See issues log
**Ready for Production**: [ ] Yes / [ ] No
