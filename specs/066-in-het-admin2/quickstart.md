# Quickstart: Revenue Dashboard Detail Views Testing

**Feature**: 066-in-het-admin2
**Environment**: dev.tickedify.com (staging)
**Prerequisites**: Admin authentication, active subscriptions in database

---

## Test Credentials

```
URL: https://dev.tickedify.com/admin2.html
Email: jan@buskens.be
Password: qyqhut-muDvop-fadki9
```

---

## Quick Test Scenarios

### Scenario 1: MRR Card - Revenue Breakdown Table ✅

**Given**: Admin viewing Revenue Dashboard
**When**: I click on the "💰 Monthly Recurring Revenue" card
**Then**: Modal displays revenue breakdown by plan type

**Steps**:
1. Navigate to dev.tickedify.com/admin2.html
2. Log in with test credentials
3. Click navigation item "💰 Revenue Dashboard"
4. Click on the MRR stat card (should show total MRR value)
5. **Expected**: Modal opens with title "Monthly Recurring Revenue Details"
6. **Verify**: Table shows columns: Plan Type | Users | Price/Month | Revenue
7. **Verify**: Each row shows plan (e.g., "yearly_80"), user count, price, total
8. **Verify**: Bottom row shows total MRR matching card value
9. **Verify**: Empty state if no active subscriptions: "No active subscriptions yet"
10. Click X button or ESC to close modal

**Success Criteria**:
- ✅ Modal opens on click
- ✅ Revenue breakdown table renders correctly
- ✅ Total MRR matches card value
- ✅ Modal closes on X button / ESC / backdrop click

---

### Scenario 2: Active Subscriptions - User List ✅

**Given**: Admin viewing Revenue Dashboard
**When**: I click on the "👥 Active Subscriptions" card
**Then**: Modal displays list of all paying customers

**Steps**:
1. Navigate to Revenue Dashboard (as in Scenario 1)
2. Click on "👥 Active Subscriptions" card
3. **Expected**: Modal opens with title "Active Subscriptions Details"
4. **Verify**: Loading spinner appears briefly
5. **Verify**: Table shows columns: Email | Name | Plan | Amount/Month | Started | Order ID
6. **Verify**: Users sorted by revenue (highest first) by default
7. **Verify**: Sort dropdown allows: Revenue, Email, Date
8. **Verify**: Empty state if no subscriptions: "No paying customers yet"
9. Click on a user row
10. **Expected**: Modal switches to existing User Management detail panel
11. **Verify**: User details displayed (email, naam, subscription, tasks)

**Success Criteria**:
- ✅ API call successful: GET /api/admin2/revenue/active-subscriptions?sort=revenue
- ✅ User list renders with all columns
- ✅ Sort functionality works (revenue/email/date)
- ✅ Click user row → user details panel opens
- ✅ Back button returns to subscription list

---

### Scenario 3: Premium Revenue - Filtered User List ✅

**Given**: Admin viewing Revenue Dashboard
**When**: I click on the "⭐ Premium Revenue" card
**Then**: Modal displays only monthly plan subscribers

**Steps**:
1. Navigate to Revenue Dashboard
2. Click on "⭐ Premium Revenue" card
3. **Expected**: Modal opens with title "Premium Revenue Details"
4. **Verify**: Table shows same columns as Active Subscriptions
5. **Verify**: Only users with `monthly_7` or `monthly_8` plans shown
6. **Verify**: Summary text: "X users on €7/mo, Y users on €8/mo"
7. **Verify**: No yearly plans visible
8. **Verify**: Empty state if no monthly subs: "No monthly subscriptions yet"

**Success Criteria**:
- ✅ Same API call as Active Subscriptions (client-side filter)
- ✅ Only monthly plans displayed
- ✅ Plan breakdown summary correct
- ✅ Click user row → user details works

---

### Scenario 4: Enterprise Revenue - Yearly Plans ✅

**Given**: Admin viewing Revenue Dashboard
**When**: I click on the "💎 Enterprise Revenue" card
**Then**: Modal displays only yearly plan subscribers

**Steps**:
1. Navigate to Revenue Dashboard
2. Click on "💎 Enterprise Revenue" card
3. **Expected**: Modal opens with title "Enterprise Revenue Details"
4. **Verify**: Only users with `yearly_70` or `yearly_80` plans shown
5. **Verify**: Amount/Month column shows normalized monthly value (yearly/12)
  - yearly_70: €5.83/mo
  - yearly_80: €6.67/mo
6. **Verify**: Summary text: "X users on €70/year, Y users on €80/year"
7. **Verify**: Empty state if no yearly subs: "No yearly subscriptions yet"

**Success Criteria**:
- ✅ Same API call as Active Subscriptions (client-side filter)
- ✅ Only yearly plans displayed
- ✅ Monthly equivalent calculation correct
- ✅ Plan breakdown summary correct

---

### Scenario 5: Free Tier - Statistics View ✅

**Given**: Admin viewing Revenue Dashboard
**When**: I click on the "🆓 Free Tier Revenue" card
**Then**: Modal displays free user statistics (no user list)

**Steps**:
1. Navigate to Revenue Dashboard
2. Click on "🆓 Free Tier Revenue" card
3. **Expected**: Modal opens with title "Free Tier Details"
4. **Verify**: Display shows:
  - Total free users count
  - Recent signups (last 30 days)
  - Active trials count
  - Conversion opportunities
5. **Verify**: Note displayed: "Free tier generates no revenue"
6. **Verify**: Empty state if no free users: "No free users yet" (unlikely)

**Success Criteria**:
- ✅ API call successful: GET /api/admin2/revenue/free-tier
- ✅ All 4 statistics displayed correctly
- ✅ No user list (different format from other cards)
- ✅ Counts are non-negative integers

---

## API Testing (via curl)

### Test 1: Active Subscriptions Endpoint

```bash
# Login first to get session cookie
curl -s -L -k -c cookies.txt \
  -X POST https://dev.tickedify.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}'

# Fetch active subscriptions
curl -s -L -k -b cookies.txt \
  https://dev.tickedify.com/api/admin2/revenue/active-subscriptions?sort=revenue \
  | jq '.'

# Expected response:
# {
#   "subscriptions": [
#     {
#       "user_id": "user_...",
#       "email": "user@example.com",
#       "naam": "User Name",
#       "selected_plan": "yearly_80",
#       "monthly_amount": 6.67,
#       "created_at": "2025-10-15T10:30:00.000Z",
#       "plugandpay_order_id": "abc-123..."
#     }
#   ],
#   "total_count": 1
# }
```

**Validation**:
- ✅ 200 status code
- ✅ `subscriptions` is array
- ✅ `total_count` matches array length
- ✅ `monthly_amount` is positive number
- ✅ `selected_plan` is not 'free'

---

### Test 2: Free Tier Endpoint

```bash
# (Reuse cookies.txt from Test 1)

curl -s -L -k -b cookies.txt \
  https://dev.tickedify.com/api/admin2/revenue/free-tier \
  | jq '.'

# Expected response:
# {
#   "free_users": 42,
#   "recent_signups_30d": 8,
#   "active_trials": 3,
#   "conversion_opportunities": 5
# }
```

**Validation**:
- ✅ 200 status code
- ✅ All counts are non-negative integers
- ✅ `recent_signups_30d` <= `free_users` (logical)

---

### Test 3: Unauthorized Access (No Admin Session)

```bash
# Try accessing without login
curl -s -L -k https://dev.tickedify.com/api/admin2/revenue/active-subscriptions

# Expected response:
# {
#   "error": "Unauthorized",
#   "message": "Admin authentication required"
# }
# Status: 401
```

**Validation**:
- ✅ 401 status code
- ✅ Error message displayed

---

## Edge Cases to Test

### Empty States
1. **No Active Subscriptions**:
  - Create test scenario: Archive all subscriptions temporarily
  - Expected: "No paying customers yet" message in modal

2. **No Free Users**:
  - Unlikely scenario (most apps have free users)
  - Expected: All counts show 0, friendly message

### Null/Missing Data
1. **User with NULL `naam`**:
  - Expected: Email displayed instead of name in table
  - Graceful fallback, no errors

2. **User with NULL `plugandpay_order_id`**:
  - Expected: Order ID column shows "—" or "N/A"
  - No errors, handles legacy manual subscriptions

### Sort Functionality
1. **Sort by Revenue** (default):
  - Expected: Highest monthly_amount first

2. **Sort by Email**:
  - Expected: Alphabetical A-Z

3. **Sort by Date**:
  - Expected: Newest subscriptions first (created_at DESC)

### Modal Interactions
1. **ESC key closes modal**:
  - Expected: Modal closes, focus returns to dashboard

2. **Backdrop click closes modal**:
  - Expected: Modal closes

3. **Clicking another card while modal open**:
  - Expected: Old modal closes, new modal opens

### Loading States
1. **Slow API response**:
  - Simulate with network throttling in DevTools
  - Expected: Loading spinner visible until data loads

2. **API error (500)**:
  - Simulate by temporarily breaking endpoint
  - Expected: Error message displayed: "Failed to load details"

---

## Performance Testing

### Response Time
```bash
# Measure API response time
time curl -s -L -k -b cookies.txt \
  https://dev.tickedify.com/api/admin2/revenue/active-subscriptions \
  > /dev/null

# Target: <200ms
```

### Large Dataset (Future)
- Create 100 test subscriptions
- Verify scrollable list handles 100 rows smoothly
- Check for frame rate drops in DevTools Performance tab

---

## Browser Console Verification

Open DevTools Console and verify:

1. **No JavaScript Errors**:
  - Check Console for red errors after clicking cards
  - Expected: Clean console (warnings OK)

2. **Network Requests**:
  - Network tab shows correct API calls
  - Status: 200 for authenticated, 401 for unauthorized
  - Response time: <200ms

3. **DOM Rendering**:
  - Use Performance tab to measure modal render time
  - Expected: <16ms (60fps)

---

## Playwright E2E Test (Future)

**File**: `tests/e2e/revenue-dashboard-details.spec.js`

```javascript
test('Revenue Dashboard - Active Subscriptions Detail View', async ({ page }) => {
  // Login as admin
  await page.goto('https://dev.tickedify.com/admin2.html');
  await page.fill('input[name="email"]', 'jan@buskens.be');
  await page.fill('input[name="password"]', 'qyqhut-muDvop-fadki9');
  await page.click('button[type="submit"]');

  // Navigate to Revenue Dashboard
  await page.click('a[data-screen="revenue"]');

  // Click Active Subscriptions card
  await page.click('#revenue-active').closest('.stat-card');

  // Verify modal opened
  await expect(page.locator('.admin-modal')).toBeVisible();
  await expect(page.locator('.modal-title')).toHaveText(/Active Subscriptions/);

  // Verify table rendered
  const rows = await page.locator('table tbody tr').count();
  expect(rows).toBeGreaterThan(0);

  // Close modal with ESC
  await page.keyboard.press('Escape');
  await expect(page.locator('.admin-modal')).toBeHidden();
});
```

---

## Rollback Plan

If critical bugs found after deployment:

1. **Git Revert**:
```bash
git log --oneline | head -5  # Find commit hash
git revert <commit-hash>
git push origin staging
```

2. **Vercel Re-deploy**:
  - Automatic on push
  - Verify version rollback via /api/version

3. **User Communication**:
  - If users report bugs, acknowledge in Feedback section
  - Communicate fix timeline

---

## Success Metrics

After deployment to staging:
- ✅ All 5 card detail views functional
- ✅ API response times <200ms
- ✅ Zero JavaScript errors in console
- ✅ Modal UX smooth and responsive
- ✅ Empty states handled gracefully
- ✅ User click-through to User Management works
- ✅ Sort functionality accurate

---

## Next Steps After Quickstart Testing

1. ✅ Manual testing complete on dev.tickedify.com
2. ✅ User acceptance testing (Jan reviews)
3. ✅ Feedback incorporated
4. 🎯 Merge to staging (already there)
5. ⏸️ Production deployment (waiting for beta freeze lift)

**Estimated Testing Time**: 30-45 minutes for complete manual run-through
