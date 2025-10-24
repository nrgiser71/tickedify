# Quickstart: Admin Message Validation Testing

**Feature**: 031-ik-heb-in
**Branch**: `031-ik-heb-in`
**Test Environment**: Staging (dev.tickedify.com)

## Prerequisites

1. Feature deployed to staging environment
2. Admin credentials voor dev.tickedify.com/admin2.html
3. Test user account: `jan@buskens.be` (bèta user)
4. Browser met developer console enabled

## Test Scenario 1: Backend Validation - Empty target_users (Core Validation)

**Goal**: Verify backend blokkeert berichten zonder gebruiker selectie

### Steps:
1. Open `dev.tickedify.com/admin2.html`
2. Log in met admin credentials
3. Navigate to "Messages" sectie
4. Click "Nieuw Bericht"
5. Fill in:
   - Title: "Test Validatie"
   - Message: "Dit bericht moet geblokkeerd worden"
   - Target Type: Select "Specifieke Gebruikers"
6. **DO NOT select any users** (leave selectedUserIds empty)
7. Click "Bericht Aanmaken"

### Expected Result:
- ❌ Request fails with 400 status
- Error message shown: "Geen gebruikers geselecteerd. Selecteer minimaal één gebruiker voor dit bericht."
- Message is NOT created in database
- Form stays open (doesn't close)

### Verification:
```bash
# Check that no new message was created with empty target_users
# (Run in browser console on admin2.html)
fetch('/api/admin/messages')
  .then(r => r.json())
  .then(data => {
    const emptyTargetMessages = data.messages.filter(m =>
      m.target_type === 'specific_users' &&
      (!m.target_users || m.target_users.length === 0)
    );
    console.log('Messages with empty target_users:', emptyTargetMessages.length);
    // Should be 0 (or same as before test)
  });
```

## Test Scenario 2: UX Improvement - User Email Display

**Goal**: Verify admin ziet email adressen van geselecteerde gebruikers

### Steps:
1. Open `dev.tickedify.com/admin2.html`
2. Navigate to "Messages" → "Nieuw Bericht"
3. Select "Specifieke Gebruikers"
4. In user search box, type: `buskens`
5. Observe search results

### Expected Result:
- ✅ Search results tonen gebruiker met **email zichtbaar**: "jan@buskens.be"
- ✅ Email is duidelijk leesbaar (niet enkel user ID)
- ✅ Naam EN email beide getoond voor duidelijke identificatie

### Verification:
- Click op een user in search results
- User wordt toegevoegd aan "Geselecteerde Gebruikers" lijst
- In geselecteerde lijst moet email address ZICHTBAAR zijn
- Format: "Jan Buskens (jan@buskens.be)" of vergelijkbaar

## Test Scenario 3: Complete Workflow - Valid Message Creation

**Goal**: Verify volledige flow werkt met correcte gebruiker selectie

### Steps:
1. Open `dev.tickedify.com/admin2.html`
2. Click "Nieuw Bericht"
3. Fill in:
   - Title: "Test Bericht voor Jan"
   - Message: "Dit is een test bericht na de fix"
   - Target Type: "Specifieke Gebruikers"
4. Search for user: `jan@buskens.be` (of `buskens`)
5. Select user from results (verify email is shown)
6. Verify user appears in "Geselecteerde Gebruikers" met email
7. Check "Actief" toggle is ON
8. Click "Bericht Aanmaken"

### Expected Result:
- ✅ Request succeeds with 201 status
- ✅ Success message: "Bericht succesvol aangemaakt! (ID: xxx)"
- ✅ Form closes automatically na 1 second
- ✅ Message appears in messages list

### Verification - Frontend:
```bash
# Open dev.tickedify.com/app en log in als jan@buskens.be
# Expected: Message popup appears with test message
```

### Verification - Database:
```bash
# In browser console op admin2.html:
fetch('/api/admin/messages')
  .then(r => r.json())
  .then(data => {
    const testMessage = data.messages.find(m => m.title === 'Test Bericht voor Jan');
    console.log('Created message:', testMessage);
    console.log('target_users:', testMessage.target_users);
    // Should show array with valid user ID(s)
  });
```

## Test Scenario 4: Warning - Inactive Message

**Goal**: Verify warning verschijnt als admin "Actief" toggle uitzet

### Steps:
1. Open admin2.html → "Nieuw Bericht"
2. Fill in basic info (title, message, target all)
3. **Turn OFF** "Actief" toggle
4. Observe UI

### Expected Result:
- ⚠️ Warning badge appears: "Bericht is niet actief - gebruikers zullen dit niet zien"
- ⚠️ Warning is prominently displayed (oranje/geel kleur)
- ✅ Submit is STILL allowed (warning, niet blocker)

### Verification:
- Submit the message
- Message is created in database with `active = false`
- Message does NOT appear for users on tickedify.com/app
- Admin can later edit and enable it

## Test Scenario 5: Warning - Future Publish Date

**Goal**: Verify warning voor toekomstige publish dates

### Steps:
1. Open admin2.html → "Nieuw Bericht"
2. Fill in basic info
3. Set "Publiceer op" to toekomstige datum (bijv. morgen)
4. Observe UI

### Expected Result:
- 📅 Warning appears: "Bericht wordt pas zichtbaar vanaf {datum}"
- ✅ Submit is allowed (correct gebruik case)

## Test Scenario 6: User Search - Partial Match

**Goal**: Verify zoeken op gedeeltelijk email adres werkt

### Test Cases:
```
Search query: "buskens"     → Should find: jan@buskens.be ✅
Search query: "jan"         → Should find: jan@buskens.be ✅
Search query: "@buskens"    → Should find: jan@buskens.be ✅
Search query: "baasoverje"  → Should find: info@baasoverjetijd.be ✅ (if exists)
Search query: "nonexistent" → Should show: "Geen resultaten" ℹ️
```

### Verification:
- All partial matches werk correctly
- Email en naam beide worden doorzocht
- Results zijn sorted (meestal by created_at DESC)

## Test Scenario 7: Regression - Existing Functionality

**Goal**: Verify bestaande message targeting types nog steeds werken

### Test Cases:

**7a. Target Type: All Users**
- Create message met target_type = 'all'
- Should work without user selection ✅

**7b. Target Type: Filtered (Subscription)**
- Create message met target_type = 'filtered'
- Select subscription: 'free'
- Should work without user selection ✅

**7c. Existing Messages Display**
- Open tickedify.com/app
- Login als jan@buskens.be
- Verify oude berichten nog steeds verschijnen ✅

## Performance Validation

### Timing Benchmarks:
```bash
# Browser console - measure API response time
console.time('message-creation');
fetch('/api/admin/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    title: 'Perf Test',
    message: 'Test',
    target_type: 'all'
  })
})
.then(r => r.json())
.then(() => console.timeEnd('message-creation'));

// Expected: <500ms (typically 50-200ms on staging)
```

## Success Criteria

Feature is VALIDATED when:
- [x] Test 1: Backend validation blokkeert empty target_users
- [x] Test 2: Email adressen zichtbaar in user selection
- [x] Test 3: Complete workflow werkt met correcte data
- [x] Test 4: Warning verschijnt voor inactive berichten
- [x] Test 5: Warning verschijnt voor toekomstige publish dates
- [x] Test 6: Partial user search werkt correct
- [x] Test 7: Bestaande functionality ongewijzigd (backwards compatible)
- [x] Performance: API response <500ms

## Rollback Procedure

Als feature bugs bevat:

1. **Immediate**: Git revert commit op staging branch
2. Deploy vorige versie naar dev.tickedify.com
3. Notify tester dat feature tijdelijk is teruggedraaid
4. Debug en fix issues
5. Re-deploy en re-test

**Git commands**:
```bash
# Find commit hash
git log --oneline | head -5

# Revert specific commit
git revert <commit-hash>

# Push revert to staging
git push origin develop
```

## Known Limitations

1. **No automated tests**: Manual testing required (no Jest/Playwright setup yet)
2. **No user ID validation**: Optional feature niet geïmplementeerd (bewuste keuze)
3. **No cleanup tool**: Oude berichten met lege target_users blijven bestaan (manueel cleanup mogelijk)

## Troubleshooting

### Issue: Validatie error verschijnt niet
**Check**:
- Is feature deployed to staging? Verify version in /api/version
- Is admin logged in? Check browser console for 401 errors
- Is target_type set to 'specific_users'? Other types don't require users

### Issue: Email niet zichtbaar in user selection
**Check**:
- Inspect HTML in browser devtools
- Verify user.email field is populated in database
- Check CSS niet hiding email span elements

### Issue: Message verschijnt niet voor gebruiker
**Check**:
- Is `active = true`?
- Is `publish_at <= NOW()`?
- Is gebruiker ID in target_users array?
- Check message_interactions table (dismissed?)
- Browser console logs in tickedify.com/app (📢 emoji)

## Support

**Documentatie**:
- Spec: `specs/031-ik-heb-in/spec.md`
- Data Model: `specs/031-ik-heb-in/data-model.md`
- API Contract: `specs/031-ik-heb-in/contracts/api-validation.md`

**Code Locaties**:
- Backend validation: `server.js:13243-13248`
- Frontend form: `public/admin2.html:2200-2300`
- Message display: `public/js/message-modal.js`

**Contact**: Rapporteer issues tijdens testing terug naar Claude voor fixes
