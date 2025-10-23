# Quickstart: Real-time Bericht Notificatie bij Navigatie Testing

**Feature**: 028-wanneer-ik-in
**Date**: 2025-10-23
**Purpose**: Validate dat scheduled messages verschijnen bij navigatie zonder page refresh

---

## Prerequisites

### Required Access
- ✅ Admin toegang tot admin2.html voor bericht aanmaken
- ✅ User toegang tot tickedify.com/app voor message ontvangst
- ✅ Browser Developer Console voor debugging

### Test Credentials
- **Email**: jan@buskens.be
- **Password**: qyqhut-muDvop-fadki9

### Required URLs
- **Admin Panel**: https://tickedify.com/admin2.html
- **Main App**: https://tickedify.com/app (NIET tickedify.com - dat is landing page)
- **Staging** (optioneel): https://dev.tickedify.com/app

---

## Test Scenario 1: Scheduled Message verschijnt bij Navigatie

**Duration**: 5 minuten
**Validates**: FR-001, FR-002, FR-003

### Step 1: Create Scheduled Message (Admin)

1. Open browser → Navigate to `https://tickedify.com/admin2.html`
2. Log in met test credentials
3. Click **"📢 Nieuw Bericht"** button
4. Fill form:
   ```
   Title: "Test Navigation Message"
   Message: "This message should appear on navigation"
   Type: Information
   Display At: [NOW + 2 minutes]  ⚡ KEY: Set 2 minutes in future
   Target: All users
   Dismissible: ✓
   ```
5. Click **"📢 Bericht Aanmaken"**
6. **Verify**: Message appears in berichten lijst met status "scheduled"

**Expected**: Message created successfully

### Step 2: Login as User (Before Scheduled Time)

1. Open **new browser tab** (of incognito window)
2. Navigate to `https://tickedify.com/app`
3. Log in met **same credentials** (jan@buskens.be)
4. **Wait on current page** - DO NOT navigate yet
5. Open Developer Console (F12)
6. Watch for console logs: `"📢 Message modal system initialized"`

**Expected**:
- ✅ Page loads successfully
- ✅ Console shows: `"📢 No unread messages"` (because display_at not reached yet)
- ❌ NO modal shown (correct - scheduled time not reached)

### Step 3: Wait for Scheduled Time

1. **Stay on same page** - DO NOT refresh
2. Check current time vs scheduled time
3. **Wait 2+ minutes** until scheduled time passes

**Expected**: Nothing happens yet (correct - no auto-polling, waiting for navigation)

### Step 4: Navigate to Trigger Message Check

1. **After scheduled time passed**, click navigation:
   - Click **"Actions"** in sidebar, OR
   - Click **"Dagelijkse Planning"** in sidebar, OR
   - Navigate to any other page
2. **Watch Developer Console** for:
   ```
   📢 Message modal system initialized
   📢 1 unread message(s) found
   📢 Showing message: "Test Navigation Message" (information)
   ```
3. **Watch page** for modal appearance

**Expected**:
- ✅ Modal appears automatically WITHOUT page refresh
- ✅ Title: "Test Navigation Message"
- ✅ Content: "This message should appear on navigation"
- ✅ Information icon (blue i-circle)
- ✅ "Got it" dismiss button visible

**PASS**: ✅ Message verschijnt automatisch bij navigatie
**FAIL**: ❌ If no modal appears → bug confirmed

---

## Test Scenario 2: Geen Duplicate na Dismiss

**Duration**: 2 minuten
**Validates**: FR-004

### Continuation from Scenario 1

**Starting State**: Modal is currently displayed from Scenario 1

### Step 1: Dismiss Message

1. Click **"Got it"** button in modal
2. **Watch Developer Console** for:
   ```
   📢 Message 123 dismissed
   ```
3. **Watch page**: Modal disappears

**Expected**:
- ✅ Modal closes smoothly
- ✅ Console confirms dismiss
- ✅ No error messages

### Step 2: Navigate to Another Page

1. Click **different navigation** item in sidebar
2. Navigate to 2-3 different pages
3. **Watch for modal** - should NOT appear

**Expected**:
- ✅ Pages load normally
- ✅ Console shows: `"📢 No unread messages"`
- ❌ Modal does NOT appear (dismissed message excluded)

**PASS**: ✅ Dismissed message NIET meer getoond
**FAIL**: ❌ If modal appears again → duplicate prevention broken

---

## Test Scenario 3: Multiple Scheduled Messages

**Duration**: 5 minuten
**Validates**: FR-003, Carousel functionality

### Step 1: Create 3 Scheduled Messages

1. Return to **admin2.html** tab
2. Create **Message A**:
   ```
   Title: "First Message"
   Display At: [NOW + 1 minute]
   ```
3. Create **Message B**:
   ```
   Title: "Second Message"
   Display At: [NOW + 1 minute]  (same time as A)
   ```
4. Create **Message C**:
   ```
   Title: "Third Message"
   Display At: [NOW + 10 minutes]  (much later)
   ```

**Expected**: 3 messages created successfully

### Step 2: Wait and Navigate

1. Switch to **user app tab** (tickedify.com/app)
2. **Wait 1+ minute** for A and B scheduled time
3. **Navigate** to trigger check
4. **Watch modal** for carousel indicator

**Expected**:
- ✅ Modal shows **"1 / 2"** indicator (A and B ready, C not yet)
- ✅ Can click **"→ Next"** to see Message B
- ✅ Can click **"← Previous"** to return to Message A
- ❌ Message C NOT shown (display_at not reached)

**PASS**: ✅ Only ready messages shown in carousel
**FAIL**: ❌ If wrong count or C appears → scheduling filter broken

---

## Test Scenario 4: Message NOT Ready Yet

**Duration**: 2 minuten
**Validates**: FR-002 (only show when display_at <= NOW)

### Step 1: Create Future Message

1. In **admin2.html**, create message:
   ```
   Title: "Future Message"
   Display At: [NOW + 20 minutes]
   ```

### Step 2: Navigate Immediately

1. Switch to **user app tab**
2. **Navigate** between pages multiple times
3. **Watch console** and page

**Expected**:
- ✅ Console: `"📢 No unread messages"`
- ❌ NO modal appears (correct - display_at not reached)

**PASS**: ✅ Future messages NOT shown prematurely
**FAIL**: ❌ If modal appears → timing filter broken

---

## Test Scenario 5: Page Refresh Behavior (Baseline)

**Duration**: 2 minuten
**Validates**: Existing functionality still works

### Step 1: Create Immediate Message

1. In **admin2.html**, create:
   ```
   Title: "Refresh Test"
   Display At: [NOW]  (immediate)
   ```

### Step 2: Refresh Page

1. In **user app tab**, press **F5** (full page refresh)
2. **Watch for modal**

**Expected**:
- ✅ Modal appears immediately after refresh
- ✅ No regression in existing behavior

**PASS**: ✅ Page refresh still triggers message check
**FAIL**: ❌ If no modal → regression bug

---

## Debugging Guide

### Console Logs to Watch For

**Success Path**:
```
📢 Message modal system initialized
📢 1 unread message(s) found
📢 Showing message: "Title" (type)
```

**No Messages Path** (correct when none scheduled):
```
📢 Message modal system initialized
📢 No unread messages
```

**Error Path** (investigate if seen):
```
Check messages error: [error details]
No messages or auth required
```

### Common Issues

**Issue 1: "No unread messages" maar message zou ready moeten zijn**
- **Check**: Admin2.html - is display_at correct ingesteld?
- **Check**: Browser time vs server time (timezone difference?)
- **Check**: Message "active" flag is TRUE
- **Check**: User is logged in (session active)

**Issue 2: Modal appears on refresh but NOT on navigation**
- **Check**: Is message-modal.js script loaded on navigated page?
- **Check**: Console shows "Message modal system initialized"?
- **Root Cause**: DOMContentLoaded not firing = script missing

**Issue 3: Dismissed message appears again**
- **Check**: Network tab - was POST /api/messages/{id}/dismiss successful?
- **Check**: Database - is dismissed = TRUE in message_interactions?
- **Root Cause**: Dismiss API call failed or DB update failed

**Issue 4: Wrong messages in carousel**
- **Check**: display_at timestamps in admin panel lijst
- **Check**: Current server time (may differ from browser time)
- **Check**: expires_at - any messages expired?

---

## Verification Checklist

Before marking feature complete, verify:

- [ ] **Scenario 1 PASS**: Scheduled message appears on navigation
- [ ] **Scenario 2 PASS**: Dismissed message does NOT reappear
- [ ] **Scenario 3 PASS**: Multiple messages show correctly in carousel
- [ ] **Scenario 4 PASS**: Future messages NOT shown prematurely
- [ ] **Scenario 5 PASS**: Page refresh still works (no regression)
- [ ] **Console logs**: No JavaScript errors
- [ ] **Network tab**: GET /api/messages/unread returns 200
- [ ] **Database**: message_interactions records created correctly
- [ ] **User experience**: Modal appears smoothly, no flicker/delay

---

## Acceptance Criteria Mapping

**From Feature Spec (spec.md)**:

### Acceptance Scenario 1
✅ **Given** bericht met display_at over 2 min
✅ **When** user navigeert na 2 min
✅ **Then** bericht verschijnt direct
**Test**: Scenario 1 validates this

### Acceptance Scenario 2
✅ **Given** bericht met display_at over 2 min
✅ **When** user blijft op pagina terwijl tijd verstrijkt
✅ **Then** bericht verschijnt automatisch
**Note**: NIET gevalideerd in deze test - vereist polling/websocket
**Current**: Verschijnt op VOLGENDE navigatie (acceptable)

### Acceptance Scenario 3
✅ **Given** meerdere berichten gepland
✅ **When** user navigeert met 1 bericht ready
✅ **Then** alleen ready berichten verschijnen
**Test**: Scenario 3 validates this

### Acceptance Scenario 4
✅ **Given** bericht gepland over 10 min
✅ **When** user navigeert nu
✅ **Then** bericht verschijnt NIET
**Test**: Scenario 4 validates this

### Acceptance Scenario 5
✅ **Given** user heeft bericht dismissed
✅ **When** user navigeert later
✅ **Then** bericht verschijnt NIET opnieuw
**Test**: Scenario 2 validates this

---

## Edge Cases to Test (Optional Advanced Testing)

### Edge Case 1: Timezone Differences
**Test**: Set display_at in different timezone
**Expected**: PostgreSQL TIMESTAMP handles UTC correctly

### Edge Case 2: Clock Skew
**Test**: Set browser time 5 minutes ahead
**Expected**: Backend server time is source of truth

### Edge Case 3: Slow Network
**Test**: Throttle network to 3G in DevTools
**Expected**: Modal appears after API response (may delay slightly)

### Edge Case 4: Simultaneous Navigation
**Test**: Click navigation rapidly multiple times
**Expected**: Only 1 modal instance (not duplicated)

---

## Performance Validation

**Timing Expectations**:
- DOMContentLoaded → checkForMessages() call: **<10ms**
- API /api/messages/unread response: **<200ms**
- Modal render and display: **<50ms**
- Total navigation → modal visible: **<300ms**

**How to Measure**:
1. Open Developer Tools → Network tab
2. Filter for `/api/messages/unread`
3. Check **Time** column
4. Performance tab → Record during navigation
5. Verify no long tasks blocking UI

---

## Cleanup After Testing

After all tests complete:

1. **Admin2.html**: Delete all test messages
   - Select test messages in lijst
   - Click "🗑️ Delete" button
   - Confirm deletion
2. **Browser**: Clear cookies/localStorage if needed
3. **Database** (optional): Verify message_interactions cleaned up
   ```sql
   DELETE FROM message_interactions WHERE user_id = <test_user_id>;
   ```

---

## Success Criteria Summary

**Feature is COMPLETE when**:
- ✅ All 5 test scenarios PASS
- ✅ No console errors
- ✅ No regression in existing functionality
- ✅ Performance within expected ranges
- ✅ User experience is smooth and intuitive

**Feature needs WORK if**:
- ❌ Any scenario FAILS
- ❌ JavaScript errors in console
- ❌ Page refresh works but navigation doesn't
- ❌ Dismissed messages reappear
- ❌ Performance >500ms navigation delay

---

**Quickstart Guide Complete** ✅

Ready for implementation and validation testing.
