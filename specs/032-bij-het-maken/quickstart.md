# Quickstart: "Volgende Keer" Trigger - Testing & Verification

**Feature**: 032-bij-het-maken
**Date**: 2025-10-24
**Environment**: Staging (dev.tickedify.com) → Production (tickedify.com)

## Prerequisites

- ✅ Feature branch `032-bij-het-maken` checked out
- ✅ Admin access to admin2.html interface
- ✅ Test user account credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- ✅ PostgreSQL access via Neon Console (for verification queries)

---

## Quick Test Flow (5 Minutes)

### Step 1: Create "Next Time" Message (2 min)

1. Navigate to staging admin interface:
   ```
   https://dev.tickedify.com/admin2.html
   ```

2. Login with admin password

3. Click "Nieuw Bericht" button

4. Fill in form:
   - **Titel**: "Test: Volgende Keer Trigger"
   - **Bericht**: "Dit bericht test de nieuwe 'volgende keer' trigger functionaliteit."
   - **Bericht Type**: "Feature"
   - **Doelgroep**: "Alle gebruikers"
   - **Trigger**: Select **"Volgende keer"** radio button ← NEW OPTION
   - **Dismissible**: Yes (checked)
   - **Snoozable**: No (unchecked)

5. Click "Bericht Aanmaken"

6. **Verify**: Success message appears, bericht ID getoond

**Expected Result**: ✅ Message created with `trigger_type = 'next_time'`

---

### Step 2: Verify Message Shows on "Next Visit" (2 min)

1. Open NEW BROWSER TAB or INCOGNITO window

2. Navigate to main app:
   ```
   https://dev.tickedify.com/app
   ```

3. Login as test user (jan@buskens.be)

4. **Wait 5 seconds** for page load + polling

5. **Verify**: Message modal appears with:
   - Title: "Test: Volgende Keer Trigger"
   - Message content visible
   - "Got it" button present

**Expected Result**: ✅ Message displays immediately on first page load after creation

---

### Step 3: Verify Dismiss Behavior (1 min)

1. Click "Got it" button in message modal

2. **Verify**: Modal closes

3. Refresh page (F5 or Cmd+R)

4. **Wait 5 seconds**

5. **Verify**: Message does NOT reappear

**Expected Result**: ✅ Message dismissed, doesn't show again on refresh

---

## Detailed Test Scenarios

### Scenario A: Multiple "Next Time" Messages

**Test**: Meerdere next_time berichten tonen allemaal

**Steps**:
1. Create 3 messages with `trigger_type = 'next_time'`
   - Message 1: "Feature Update 1"
   - Message 2: "Feature Update 2"
   - Message 3: "Feature Update 3"

2. Clear browser session (logout + clear cookies)

3. Login again and navigate to /app

4. **Verify**: All 3 messages show in carousel
   - Navigation dots show "1/3", "2/3", "3/3"
   - Can navigate between messages with arrow buttons

5. Dismiss all 3 messages

6. Refresh page

7. **Verify**: No messages appear

**Expected Result**: ✅ Multiple next_time messages work correctly

---

### Scenario B: Message Edit Behavior

**Test**: Edited message niet opnieuw tonen aan dismissed users

**Steps**:
1. Create message: "Original Message Text"
2. As test user: View and dismiss message
3. As admin: Edit message → "Updated Message Text"
4. As test user: Refresh page

5. **Verify**: Updated message does NOT appear (user already dismissed original)

6. Login as DIFFERENT user (or create new test user)

7. **Verify**: Updated message DOES appear (new user hasn't seen original)

**Expected Result**: ✅ Edit behavior werkt zoals gespecificeerd

---

### Scenario C: Backwards Compatibility Check

**Test**: Bestaande trigger types blijven werken

**Steps**:
1. Create message with `trigger_type = 'immediate'`
2. **Verify**: Shows immediately on page load (existing behavior)

3. Create message with `trigger_type = 'page_visit_count'`, `trigger_value = '1'` (first visit)
4. **Verify**: Shows on first visit to specific page (existing behavior)

5. **Verify**: Both messages coexist with next_time messages zonder conflicts

**Expected Result**: ✅ Bestaande triggers ongewijzigd functioneel

---

### Scenario D: Timing & Persistence

**Test**: "Next time" is relatief tot message creation time

**Steps**:
1. Note current time: 10:00 AM
2. Create message at 10:00 AM with `trigger_type = 'next_time'`
3. As test user who visited app at 9:50 AM (before message creation):
   - Refresh at 10:01 AM
   - **Verify**: Message appears (first visit AFTER message creation)

4. Dismiss message

5. Logout, wait 5 minutes, login again

6. **Verify**: Message does NOT appear (dismiss is persistent)

**Expected Result**: ✅ Timing logica en persistence correct

---

## Database Verification Queries

### Query 1: Verify Message Created with Correct Trigger

```sql
-- Run in Neon Console SQL Editor
SELECT id, title, trigger_type, trigger_value, created_at, active
FROM admin_messages
WHERE trigger_type = 'next_time'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**:
- `trigger_type = 'next_time'`
- `trigger_value = NULL` or empty
- `active = TRUE`
- `created_at` timestamp present

---

### Query 2: Check User Interaction Records

```sql
-- Replace $message_id and $user_id with actual values
SELECT *
FROM message_interactions
WHERE message_id = 123  -- Your test message ID
  AND user_id = 'your-user-id';
```

**Expected after dismiss**:
- `dismissed = TRUE`
- `first_shown_at` has timestamp
- `shown_count >= 1`

---

### Query 3: Verify Message Filtering Logic

```sql
-- This simulates /api/messages/unread query
SELECT m.id, m.title, m.trigger_type, mi.dismissed
FROM admin_messages m
LEFT JOIN message_interactions mi
  ON m.id = mi.message_id AND mi.user_id = 'your-user-id'
WHERE m.trigger_type = 'next_time'
  AND m.active = TRUE
  AND (mi.message_id IS NULL OR mi.dismissed = FALSE);
```

**Expected**:
- Returns rows for undismissed next_time messages
- Returns empty set after user dismisses all messages

---

## API Testing (cURL)

### Test 1: Create Message via API

```bash
curl -X POST https://dev.tickedify.com/api/admin/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session=..." \
  -d '{
    "title": "API Test: Next Time",
    "message": "Testing next_time trigger via API",
    "trigger_type": "next_time",
    "message_type": "information",
    "target_type": "all",
    "dismissible": true
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "messageId": 789,
  "message": "Message created successfully"
}
```

---

### Test 2: Fetch Unread Messages

```bash
curl https://dev.tickedify.com/api/messages/unread \
  -H "Cookie: session=..."
```

**Expected Response**:
```json
{
  "messages": [
    {
      "id": 789,
      "title": "API Test: Next Time",
      "trigger_type": "next_time",
      "created_at": "2025-10-24T10:00:00Z",
      ...
    }
  ]
}
```

---

### Test 3: Dismiss Message

```bash
curl -X POST https://dev.tickedify.com/api/messages/789/dismiss \
  -H "Cookie: session=..."
```

**Expected Response**:
```json
{
  "success": true
}
```

**Verify**: GET /api/messages/unread returns empty messages array

---

## Regression Testing Checklist

Run these tests to ensure existing functionality remains intact:

- [ ] **Immediate Trigger**: Message with trigger_type='immediate' shows instantly
- [ ] **Page Visit Count**: First visit trigger still works
- [ ] **Target Filtering**: target_type='specific_users' still filters correctly
- [ ] **Message Types**: Different message_type styles render correctly
- [ ] **Snooze Function**: Snoozable messages can still be snoozed
- [ ] **Button Actions**: Messages with buttons still trigger actions
- [ ] **Expiry**: Messages with expires_at stop showing after expiry
- [ ] **Admin Toggle**: Deactivating message hides it from users
- [ ] **Message Edit**: Existing message edit flow still works
- [ ] **Message Delete**: Deleting message removes from users

**All should pass** ✅

---

## Performance Verification

### Load Time Test

```bash
# Test API response time
time curl -s https://dev.tickedify.com/api/messages/unread \
  -H "Cookie: session=..." > /dev/null
```

**Expected**: < 200ms (no significant degradation from baseline)

### Database Query Performance

```sql
-- Run EXPLAIN ANALYZE on unread query
EXPLAIN ANALYZE
SELECT DISTINCT m.*
FROM admin_messages m
LEFT JOIN message_interactions mi ON m.id = mi.message_id AND mi.user_id = 'test-user'
WHERE m.active = TRUE
  AND (m.trigger_type = 'next_time' AND (mi.dismissed = FALSE OR mi.message_id IS NULL));
```

**Expected**: Query plan uses indexes, execution time < 50ms

---

## Rollback Plan

If critical issues found during testing:

### Option 1: Disable Next Time Messages (Soft Rollback)

```sql
-- Deactivate all next_time messages
UPDATE admin_messages
SET active = FALSE
WHERE trigger_type = 'next_time';
```

**Impact**: Next time messages hidden, code can stay deployed

### Option 2: Revert Code (Hard Rollback)

```bash
# On feature branch
git revert HEAD~N  # N = number of commits to revert
git push origin 032-bij-het-maken

# Vercel auto-deploys revert
```

**Impact**: Full rollback, no next_time support

### Option 3: Database Cleanup (if needed)

```sql
-- Delete all next_time messages (DESTRUCTIVE)
DELETE FROM admin_messages WHERE trigger_type = 'next_time';

-- Or rename trigger_type to disable
UPDATE admin_messages
SET trigger_type = 'next_time_disabled'
WHERE trigger_type = 'next_time';
```

**Note**: Only use if Option 1 insufficient

---

## Production Deployment Checklist

Before deploying to tickedify.com:

- [ ] All quickstart tests passed on dev.tickedify.com
- [ ] Regression tests passed (existing triggers work)
- [ ] Performance tests passed (< 200ms API response)
- [ ] Database queries verified (correct filtering logic)
- [ ] Multiple browser/device test completed
- [ ] Admin interface tested (can create next_time messages)
- [ ] User interface tested (messages display correctly)
- [ ] Dismiss behavior verified (doesn't reappear)
- [ ] Edge cases tested (multiple messages, edit behavior)
- [ ] Backwards compatibility confirmed (existing messages work)

**Once all checked** ✅ **→ Merge to main and deploy to production**

**IMPORTANT**: Feature is BÈTA FREEZE compliant:
- Simple additive change
- No database migrations
- Backwards compatible
- Low risk profile

---

## Success Criteria

**Feature is successful if**:

✅ Admin can create messages with "Volgende keer" trigger
✅ Messages appear on user's next page visit after creation
✅ Messages can be dismissed and don't reappear
✅ Multiple next_time messages show correctly
✅ Existing trigger types remain fully functional
✅ API response time impact < 10% (target: < 5%)
✅ No database schema changes required
✅ Zero breaking changes to existing features

---

## Support & Troubleshooting

### Common Issues

**Issue**: Message doesn't appear after creation
- **Check**: Is message active? `active = TRUE`
- **Check**: Is publish_at in past? `publish_at <= NOW()`
- **Check**: Has user already dismissed? Query message_interactions table

**Issue**: Message reappears after dismiss
- **Check**: Dismiss API call succeeded? Check browser network tab
- **Check**: Database record has dismissed=TRUE? Query message_interactions

**Issue**: Multiple messages don't show
- **Check**: Backend query returns all messages? Check /api/messages/unread response
- **Check**: Frontend carousel logic working? Check browser console for errors

---

## Contacts

**Developer**: Jan Buskens (jan@buskens.be)
**Testing**: Manual testing on dev.tickedify.com
**Database**: Neon Console (https://console.neon.tech)
**Hosting**: Vercel Dashboard (https://vercel.com/tickedify)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
**Status**: Ready for Testing
