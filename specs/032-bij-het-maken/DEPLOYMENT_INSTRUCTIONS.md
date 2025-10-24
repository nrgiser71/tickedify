# Deployment Instructies: "Volgende Keer" Trigger Feature

**Feature**: 032-bij-het-maken
**Version**: v0.19.174
**Branch**: `032-bij-het-maken`
**Status**: ✅ Code Implementation Complete - Ready for Manual Testing & Deployment

---

## 📦 Wat is Geïmplementeerd

### Backend (server.js)
- ✅ **GET /api/messages/unread** (regel ~13571): Next_time trigger logica toegevoegd
  - OR clause in WHERE condition: `OR m.trigger_type = 'next_time'`
  - Console logging: `"📢 Evaluating messages for user ${userId}"`
  - Backwards compatible met existing triggers

- ✅ **POST /api/admin/messages** (regel ~13251): Documentatie comment toegevoegd
  - `// Trigger types: immediate, days_after_signup, first_page_visit, nth_page_visit, next_time`

### Frontend (public/admin2.html)
- ✅ **Radio Button** (regel ~1703): Nieuwe "Volgende keer" optie toegevoegd
  - Value: `next_time`
  - Label: `🔄 Volgende keer`
  - Positie: Tussen "Direct" en "X dagen na signup"
  - No JavaScript changes needed

### Documentation
- ✅ **DATABASE_NOTES.md**: Complete database schema documentatie + SQL voorbeelden
- ✅ **Changelog** (public/changelog.html): v0.19.174 entry toegevoegd
- ✅ **Package.json**: Version bumped 0.19.173 → 0.19.174

### Git Commit
- ✅ Commit hash: `92385d0`
- ✅ Message: "⚡ FEAT: 'Volgende Keer' Bericht Trigger - v0.19.174"
- ✅ Files changed: 12 files, 2465 insertions(+)

---

## ⚠️ BÈTA FREEZE COMPLIANCE

**BELANGRIJK**: Deze feature mag NIET naar productie (main branch) tijdens de bèta freeze periode.

**✅ TOEGESTAAN**:
- Push naar feature branch `032-bij-het-maken`
- Deploy naar staging (dev.tickedify.com)
- Pull Request aanmaken voor code review
- Manual testing op staging

**❌ GEBLOKKEERD TOT FREEZE LIFT**:
- Merge naar `main` branch
- Productie deployment (tickedify.com)

---

## 🚀 Deployment Workflow (Manual)

### Stap 1: Push Feature Branch naar GitHub

```bash
cd /Users/janbuskens/Library/CloudStorage/Dropbox/To\ Backup/Baas\ Over\ Je\ Tijd/Software/Tickedify

# Check huidige status
git status
git branch  # Verify je bent op 032-bij-het-maken

# Push naar GitHub
git push origin 032-bij-het-maken
```

**Expected**: GitHub toont nieuwe commit `92385d0` op feature branch

---

### Stap 2: Wacht op Vercel Auto-Deploy

Vercel detecteert automatisch de push en start deployment naar staging:
- **Staging URL**: dev.tickedify.com (note: exacte URL kan variëren per deploy)
- **Deployment time**: ~30-60 seconden
- **Monitor**: https://vercel.com/tickedify dashboard

**WAARSCHUWING**: Omdat Vercel URL's kunnen wijzigen per deployment, moet je handmatig de deployment URL checken in de Vercel dashboard.

---

### Stap 3: Verify Deployment (Manual)

#### 3.1 Check Version Endpoint

```bash
# Replace {staging-url} with actual Vercel staging URL from dashboard
curl -s https://{staging-url}/api/version
```

**Expected Output**:
```json
{
  "version": "0.19.174",
  "environment": "production",
  "timestamp": "2025-10-24T..."
}
```

#### 3.2 Check Admin Interface

1. Navigate to: `https://{staging-url}/admin2.html`
2. Login met admin credentials
3. Click "Nieuw Bericht"
4. **VERIFY**: "🔄 Volgende keer" radio button is zichtbaar tussen "Direct" en "X dagen na signup"

#### 3.3 Create Test Message

1. In admin interface, fill form:
   - **Titel**: "Test: Next Time Trigger"
   - **Bericht**: "Dit test de nieuwe volgende keer trigger"
   - **Trigger**: Select **"🔄 Volgende keer"**
   - **Doelgroep**: "Alle gebruikers"
   - **Dismissible**: Yes

2. Click "Bericht Aanmaken"

3. **VERIFY**: Success message appears, bericht ID returned

---

### Stap 4: Test User Experience (Manual)

#### 4.1 Login as Test User

1. Open NEW INCOGNITO window
2. Navigate to: `https://{staging-url}/app`
3. Login met test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
4. Wait 5-10 seconds for page load + polling

**VERIFY**: Message modal appears with:
- Title: "Test: Next Time Trigger"
- Content visible
- "Got it" button present

#### 4.2 Test Dismiss Behavior

1. Click "Got it" button
2. **VERIFY**: Modal closes
3. Refresh page (F5)
4. Wait 5-10 seconds
5. **VERIFY**: Message does NOT reappear

#### 4.3 Test Multiple Messages (Optional)

1. As admin, create 2-3 more "next_time" messages
2. Clear browser session (logout + clear cookies)
3. Login again as test user
4. **VERIFY**: All undismissed messages show in carousel

---

### Stap 5: Backwards Compatibility Check (Manual)

#### 5.1 Test Existing Triggers

1. As admin, create message with **"⚡ Direct"** trigger
2. As test user, refresh page
3. **VERIFY**: Immediate message shows (existing behavior)

4. As admin, create message with **"📅 X dagen na signup"** trigger (e.g., 0 days)
5. As test user, refresh page
6. **VERIFY**: Days after signup message shows (existing behavior)

#### 5.2 Verify No Conflicts

1. **VERIFY**: Both immediate AND next_time messages can coexist
2. **VERIFY**: No console errors in browser DevTools
3. **VERIFY**: No 500 errors in Network tab

---

### Stap 6: Database Verification (Optional)

#### 6.1 Via Neon Console

1. Navigate to: https://console.neon.tech
2. Select Tickedify database
3. SQL Editor → Run queries from `specs/032-bij-het-maken/DATABASE_NOTES.md`:

**Query 1**: Verify next_time messages exist
```sql
SELECT id, title, trigger_type, created_at
FROM admin_messages
WHERE trigger_type = 'next_time'
ORDER BY created_at DESC
LIMIT 5;
```

**Query 2**: Check interaction records
```sql
SELECT m.title, mi.dismissed, mi.first_shown_at
FROM admin_messages m
LEFT JOIN message_interactions mi ON m.id = mi.message_id
WHERE m.trigger_type = 'next_time'
  AND mi.user_id = 'your-test-user-id';
```

---

## ✅ Success Criteria

Feature deployment is successful if:

- [x] Version endpoint returns `0.19.174`
- [x] Admin interface shows "🔄 Volgende keer" radio button
- [x] Admin can create next_time messages without errors
- [x] User sees next_time message on next page visit
- [x] Dismiss works correctly (message doesn't reappear)
- [x] Existing triggers (immediate, days_after_signup) still work
- [x] No console errors or 500 API errors
- [x] No database errors in Neon logs

---

## 🐛 Troubleshooting

### Issue: Radio button niet zichtbaar in admin
**Check**:
- Browser cache cleared? (Ctrl+Shift+R / Cmd+Shift+R)
- Correct staging URL? (check Vercel dashboard)
- admin2.html deployed? (check Vercel deployment logs)

### Issue: Message verschijnt niet bij page load
**Check**:
- Message is `active = true`? (check admin interface or database)
- Message `publish_at` is in past? (check message details)
- User heeft niet al gedismissed? (check message_interactions table)
- Console logging in Network tab: "📢 Evaluating messages for user X"?

### Issue: Message blijft verschijnen na dismiss
**Check**:
- Dismiss API call succeeded? (check Network tab, look for POST /api/messages/:id/dismiss)
- Database record has `dismissed = TRUE`? (check message_interactions table)
- Browser cookies enabled? (session needed for user_id)

### Issue: 500 Error bij message creation
**Check**:
- Server.js deployed correct? (check git commit hash in deployment)
- Database connection OK? (check Neon status)
- Server logs in Vercel dashboard voor error details

---

## 📊 Performance Verification (Optional)

### API Response Time Test

```bash
# Test /api/messages/unread performance
time curl -s https://{staging-url}/api/messages/unread \
  -H "Cookie: session=..." > /dev/null
```

**Expected**: < 200ms (baseline: ~50-100ms without new trigger)
**Acceptable**: < 300ms (< 5% overhead target met)

---

## 📝 Testing Checklist

Copy deze checklist en vink af tijdens manual testing:

### Basic Functionality
- [ ] Admin interface toont "🔄 Volgende keer" radio button
- [ ] Admin kan next_time message aanmaken zonder errors
- [ ] User ziet next_time message bij page load
- [ ] Dismiss functie werkt (message verdwijnt na "Got it")
- [ ] Multiple next_time messages tonen allemaal

### Backwards Compatibility
- [ ] Immediate trigger werkt nog steeds
- [ ] Days_after_signup trigger werkt nog steeds
- [ ] First_page_visit trigger werkt nog steeds
- [ ] Nth_page_visit trigger werkt nog steeds
- [ ] No conflicts tussen verschillende trigger types

### Edge Cases
- [ ] Message edit gedrag correct (dismissed users zien update niet)
- [ ] Session persistence (dismiss blijft na logout/login)
- [ ] Browser refresh zonder dismiss (message verschijnt opnieuw)
- [ ] Geen console errors in DevTools
- [ ] Geen 500 errors in Network tab

### Database
- [ ] next_time messages aanwezig in admin_messages table
- [ ] message_interactions records correct (dismissed flags)
- [ ] No orphan records of constraint violations

---

## 🚦 Next Steps After Successful Testing

### If All Tests Pass ✅

1. **Document Results**:
   - Create `specs/032-bij-het-maken/TEST_RESULTS.md`
   - Vink alle checklist items af
   - Note any observations or minor issues

2. **Create Pull Request**:
   ```bash
   # Via GitHub UI:
   # - Navigate to repository
   # - Click "Pull Requests" → "New Pull Request"
   # - Base: main | Compare: 032-bij-het-maken
   # - Title: "⚡ FEAT: Volgende Keer Bericht Trigger - v0.19.174"
   # - Description: Paste from commit message
   # - Create Pull Request (DO NOT MERGE YET - BÈTA FREEZE)
   ```

3. **Wait for BÈTA FREEZE Lift**:
   - PR blijft open voor code review
   - NO merge tot expliciete "BÈTA FREEZE IS OPGEHEVEN" bericht
   - Feature blijft beschikbaar op staging voor verder testen

### If Tests Fail ❌

1. **Document Issues**:
   - Note specific failing test case
   - Screenshot errors (console, Network tab)
   - Database query results if relevant

2. **Debug & Fix**:
   - Create new branch: `032-bij-het-maken-fix`
   - Fix issues
   - Recommit and redeploy to staging
   - Rerun test checklist

3. **Update Documentation**:
   - Add KNOWN_ISSUES.md if needed
   - Update TEST_RESULTS.md with findings

---

## 🔒 BÈTA FREEZE Reminder

**Deze feature is COMPLEET GEÏMPLEMENTEERD maar mag NIET naar productie:**
- ✅ Code changes committed (commit `92385d0`)
- ✅ Ready for staging deployment
- ✅ Ready for manual testing
- ⏸️ **GEBLOKKEERD** voor productie merge
- ⏸️ **WACHT OP** "BÈTA FREEZE IS OPGEHEVEN" signal

**Reden**: Productie stabiliteit tijdens bèta gebruiker testing periode heeft prioriteit.

---

## 📞 Support

**Developer**: Jan Buskens (jan@buskens.be)
**Testing Environment**: dev.tickedify.com (staging)
**Database**: Neon Console (console.neon.tech)
**Deployment**: Vercel Dashboard (vercel.com/tickedify)

**Documentation**:
- Feature Spec: `specs/032-bij-het-maken/spec.md`
- Implementation Plan: `specs/032-bij-het-maken/plan.md`
- Database Notes: `specs/032-bij-het-maken/DATABASE_NOTES.md`
- Quickstart Testing: `specs/032-bij-het-maken/quickstart.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
**Status**: Ready for Manual Deployment & Testing
