# Quickstart: Admin2 Timezone Bug Fix Verification

**Feature**: Admin2 Bericht Tijdstip Correctie
**Date**: 2025-10-24
**Testing Environment**: dev.tickedify.com (staging)

## Prerequisites

- Admin access to Tickedify staging environment
- Login credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Modern browser (Chrome, Firefox, Safari)
- Timezone: CET/CEST (Belgium/Netherlands)

## Quick Verification (5 minutes)

### Test 1: Basic Timezone Round-Trip

**Goal**: Verify 10:00 stays 10:00 after save/reload

1. **Login to Admin2**
   - Navigate to: https://dev.tickedify.com/admin2.html
   - Email: jan@buskens.be
   - Password: qyqhut-muDvop-fadki9

2. **Navigate to Messages**
   - Click "📢 Berichten" in left sidebar
   - Click "📢 Nieuw Bericht" button

3. **Create Test Message**
   - Title: `Timezone Test - 10:00`
   - Message: `Testing timezone fix - should show 10:00`
   - Target: "Alle gebruikers"
   - Trigger: "Direct"

4. **Set Scheduled Time**
   - Click "Publiceren op" field
   - Select today's date
   - Set time to: **10:00**
   - Leave expiration empty

5. **Save Message**
   - Click "📢 Bericht Aanmaken"
   - Wait for success confirmation
   - Click "Annuleren" to close modal

6. **Verify Fix**
   - Find "Timezone Test - 10:00" in messages list
   - Click on row to edit
   - **CHECK**: "Publiceren op" field shows **10:00** ✅
   - **NOT** 08:00 or any other time ❌

**Expected Result**: Time displays exactly as entered (10:00)
**Bug Behavior**: Time displays 2 hours earlier (08:00)

---

### Test 2: Afternoon Time

**Goal**: Verify 14:30 stays 14:30

1. Create new message: "Timezone Test - 14:30"
2. Set publish time to **14:30** today
3. Save and reload
4. **CHECK**: Shows **14:30** ✅

---

### Test 3: Evening Time (Midnight Boundary)

**Goal**: Verify 23:00 doesn't roll to next day

1. Create new message: "Timezone Test - 23:00"
2. Set publish time to **23:00** today
3. Save and reload
4. **CHECK**: Shows **23:00** on same date ✅
5. **CHECK**: Date hasn't changed to tomorrow ✅

---

### Test 4: Early Morning (Day Boundary)

**Goal**: Verify 01:00 doesn't show previous day

1. Create new message: "Timezone Test - 01:00"
2. Set publish time to **01:00** tomorrow
3. Save and reload
4. **CHECK**: Shows **01:00** on tomorrow's date ✅
5. **CHECK**: Date hasn't changed to today ✅

---

## Detailed Verification (15 minutes)

### Test Suite: Complete Timezone Handling

| Test | Input Time | Expected Display | Bug Display | Status |
|------|-----------|------------------|-------------|---------|
| 1 | 00:00 | 00:00 | 22:00 (prev day) | ⬜ |
| 2 | 01:00 | 01:00 | 23:00 (prev day) | ⬜ |
| 3 | 08:00 | 08:00 | 06:00 | ⬜ |
| 4 | 10:00 | 10:00 | 08:00 | ⬜ |
| 5 | 12:00 | 12:00 | 10:00 | ⬜ |
| 6 | 14:30 | 14:30 | 12:30 | ⬜ |
| 7 | 18:00 | 18:00 | 16:00 | ⬜ |
| 8 | 23:00 | 23:00 | 21:00 | ⬜ |
| 9 | 23:59 | 23:59 | 21:59 | ⬜ |

**How to Test**:
1. For each row, create a message with the Input Time
2. Save and reload the message
3. Verify display matches Expected Display column
4. Mark status: ✅ Pass / ❌ Fail

---

### Test Suite: Expiration Time

**Goal**: Verify `expires_at` field also handles timezones correctly

1. **Create Message with Expiration**
   - Title: "Expiration Timezone Test"
   - Set publish time: 10:00 today
   - Set expiration time: **18:00** tomorrow

2. **Save and Reload**
   - **CHECK**: Publish shows 10:00 ✅
   - **CHECK**: Expiration shows 18:00 tomorrow ✅

---

### Test Suite: Edit Existing Messages

**Goal**: Verify fix works for messages created before the fix

1. **Find Old Message** (if available)
   - Look for messages created before this fix
   - Click to edit

2. **Current Behavior** (before fix)
   - Time likely shows 2 hours earlier than intended

3. **After Fix**
   - Edit the message
   - Set publish time to 10:00
   - Save and reload
   - **CHECK**: Shows 10:00 ✅

---

## Automated Testing (Playwright)

### Run E2E Test

```bash
# From repository root
npm run test:playwright -- admin-message-timezone.spec.js

# Or via tickedify-testing agent
# Request: "Run Playwright test for admin message timezone handling"
```

**Expected Output**:
```
✓ admin message timezone displays correctly after edit (5s)
  - Created message with 10:00
  - Verified field shows 10:00 after reload
  - Not showing 08:00 (bug behavior)
```

---

## Regression Testing

**Goal**: Ensure fix doesn't break other admin2 functionality

### Quick Smoke Tests

1. **Message Creation**
   - ✅ Can create message without scheduled time
   - ✅ Can create message with only publish time
   - ✅ Can create message with publish + expiration
   - ✅ Immediate trigger still works

2. **Message Editing**
   - ✅ Can edit message title/content
   - ✅ Can change target type
   - ✅ Can toggle active/inactive
   - ✅ Can clear scheduled times (delete value)

3. **Message Display**
   - ✅ Messages list shows correct data
   - ✅ Preview function still works
   - ✅ Analytics page loads

---

## Known Issues & Limitations

### Expected Behavior
- ✅ Times display in user's local timezone (CET/CEST)
- ✅ Database stores UTC (not visible to user)
- ✅ API transmits UTC ISO strings (not visible to user)

### Not Affected by This Fix
- ⚠️ Server-side timezone handling (unchanged, correct)
- ⚠️ Database storage format (unchanged, correct)
- ⚠️ User-facing message delivery (unchanged)

### Future Considerations
- 🔮 International admins in different timezones
  - Current: All times display in browser's local timezone
  - Future: May need timezone selector in admin UI

---

## Troubleshooting

### Issue: Still seeing 2-hour difference
**Cause**: Browser cache, old JavaScript loaded
**Solution**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Time off by 1 hour instead of 2
**Cause**: Daylight Saving Time transition
**Solution**: Expected during DST transitions, verify UTC storage correct

### Issue: Times correct in staging but wrong in production
**Cause**: Fix not yet deployed to production (BÈTA FREEZE active)
**Solution**: Wait for BÈTA FREEZE lift and production deployment

---

## Success Criteria

**Minimum Requirements**:
- ✅ Test 1-4 pass (10:00, 14:30, 23:00, 01:00)
- ✅ No regression in message creation/editing
- ✅ Playwright E2E test passes

**Full Verification**:
- ✅ All 9 time slots in Detailed Verification table pass
- ✅ Expiration time handling correct
- ✅ Edit existing messages works
- ✅ Smoke tests all pass

---

## Rollback Plan

**If critical issues found**:

1. **Identify Issue**
   - Document exact failure scenario
   - Screenshot showing incorrect behavior

2. **Emergency Rollback** (staging only)
   ```bash
   git revert <commit-hash>
   git push origin develop
   # Vercel auto-deploys within 2 minutes
   ```

3. **Production Rollback** (if needed after BÈTA FREEZE lift)
   - Same process but requires explicit approval
   - Notify all admins before rollback

---

## Contact & Support

**Issues Found?**
- Document in GitHub: https://github.com/janbuskens/tickedify/issues
- Tag: `bug`, `admin2`, `timezone`
- Include: Steps to reproduce, expected vs actual behavior

**Questions?**
- Email: jan@buskens.be
- Slack: #tickedify-dev (if applicable)
