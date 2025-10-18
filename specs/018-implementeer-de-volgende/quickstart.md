# Quickstart: Admin Dashboard v2

**Feature**: Admin Dashboard v2
**Date**: 2025-10-18
**Purpose**: Manual testing guide for admin dashboard functionality

## Prerequisites

- Admin account credentials: `jan@buskens.be` / `qyqhut-muDvop-fadki9`
- Access to https://tickedify.com/admin2.html
- Browser: Modern browser (Chrome, Firefox, Safari, Edge)
- Tools: Browser DevTools, optional Playwright for automated testing

## Quick Test Workflow

This workflow tests all major features in ~15 minutes:

### 1. Access & Authentication (2 min)

```bash
# Navigate to dashboard
open https://tickedify.com/admin2.html

# Should redirect to login if not authenticated
# Login with admin credentials
# Should land on Home Dashboard screen
```

**✅ Success Criteria**:
- Dashboard loads without errors
- Navigation menu visible on left
- Home screen shows user statistics
- Console has no JavaScript errors

### 2. Home Dashboard Statistics (3 min)

**Test FR-001 through FR-011**: Verify all home dashboard statistics display correctly.

**Actions**:
1. Observe "Total Users" stat - should show number > 0
2. Observe "Active Users (7d)" and "Active Users (30d)"
3. Observe "New Registrations" (Today/Week/Month)
4. Observe "Subscription Distribution" (Free/Premium/Enterprise counts)
5. Observe "Active Trials" count
6. Observe "User Growth Graph" - should show line chart
7. Observe "Recent Registrations" table - should show last 10 users
8. Observe "Inactive Users" counts (30d/60d/90d)

**✅ Success Criteria**:
- All stats display numeric values (not "undefined" or errors)
- User growth graph renders as Chart.js line chart
- Recent registrations table shows user emails and dates
- Page loads in <500ms (check Network tab)

### 3. User Search & Details (3 min)

**Test FR-051, FR-052**: Search functionality and user details view.

**Actions**:
```bash
# In browser:
1. Navigate to "User Management" screen (click nav menu)
2. Enter "jan" in search box
3. Wait for results to appear (should debounce)
4. Click on first search result
5. Observe user details panel
```

**✅ Success Criteria**:
- Search returns results matching "jan"
- Results show email, name, tier, status
- Clicking result loads detailed view
- Details include: account info, task summary, email summary, subscription

**Test curl**:
```bash
# Login first to get session cookie
curl -c cookies.txt -X POST https://tickedify.com/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}'

# Test search
curl -b cookies.txt "https://tickedify.com/api/admin2/users/search?q=jan"

# Test user details (replace 1 with actual user ID)
curl -b cookies.txt https://tickedify.com/api/admin2/users/1
```

### 4. User Management Actions (3 min)

**Test FR-053, FR-054**: Change subscription tier and extend trial.

**Actions**:
1. Find a test user (not your own admin account!)
2. Change subscription tier from Free → Premium
3. Verify tier update in UI
4. Extend trial date to 2025-11-01
5. Verify trial date update in UI

**Test curl**:
```bash
# Change tier (replace 123 with test user ID)
curl -b cookies.txt -X PUT -H "Content-Type: application/json" \
  -d '{"tier":"premium"}' \
  https://tickedify.com/api/admin2/users/123/tier

# Extend trial
curl -b cookies.txt -X PUT -H "Content-Type: application/json" \
  -d '{"trial_end_date":"2025-11-01"}' \
  https://tickedify.com/api/admin2/users/123/trial
```

**✅ Success Criteria**:
- Tier change reflected immediately in UI
- Trial date updated correctly
- Confirmation/success message shown
- No errors in console or API response

### 5. Task & Email Statistics (2 min)

**Test FR-013, FR-017, FR-018, FR-023, FR-024, FR-026**: Task and email stats.

**Actions**:
1. Navigate to "Task Analytics" screen
2. Observe total tasks, completion rate, tasks created today/week/month
3. Navigate to "Email Analytics" screen
4. Observe total imports, recent imports, users with email import

**Test curl**:
```bash
# Task stats
curl -b cookies.txt https://tickedify.com/api/admin2/stats/tasks

# Email stats
curl -b cookies.txt https://tickedify.com/api/admin2/stats/emails
```

**✅ Success Criteria**:
- Task statistics display valid percentages and counts
- Email statistics show import counts and user percentage
- Page transitions smooth (<100ms)

### 6. Database Monitor (1 min)

**Test FR-029, FR-030, FR-031, FR-032**: Database statistics.

**Actions**:
1. Navigate to "Database Monitor" screen
2. Observe database size in MB/GB
3. Observe table sizes and row counts
4. Verify largest tables appear first

**Test curl**:
```bash
curl -b cookies.txt https://tickedify.com/api/admin2/stats/database
```

**✅ Success Criteria**:
- Database size shows human-readable format (e.g., "245 MB")
- Tables sorted by size descending
- Row counts match expected volumes

### 7. Payment Configuration (1 min)

**Test FR-089, FR-NEW-001**: View and edit payment configurations.

**Actions**:
1. Navigate to "Revenue Dashboard" screen
2. Observe MRR and revenue by tier
3. Navigate to "System Settings" screen
4. Find payment configurations section
5. Edit checkout URL for one plan (use test URL)
6. Verify URL validation (try invalid URL)

**Test curl**:
```bash
# View revenue stats
curl -b cookies.txt https://tickedify.com/api/admin2/stats/revenue

# Update checkout URL (replace ID)
curl -b cookies.txt -X PUT -H "Content-Type: application/json" \
  -d '{"checkout_url":"https://pay.mollie.com/checkout/test123"}' \
  https://tickedify.com/api/admin2/system/payments/1/checkout-url
```

**✅ Success Criteria**:
- MRR calculated correctly (tier counts × prices)
- Checkout URL updates successfully
- Invalid URLs rejected with error message

## Detailed Feature Testing

### User Search (FR-051)

**Test Cases**:
```
1. Search by email: "jan@" → should find jan@buskens.be
2. Search by name: "jan" → should find users with "Jan" in name
3. Search by ID: "1" → should find user with ID 1
4. Partial match: "bus" → should find "Buskens"
5. Case insensitive: "JAN" → same results as "jan"
6. No results: "zzz999" → empty results with message
7. Short query: "a" → validation error (min 2 chars)
```

### Subscription Tier Change (FR-053)

**Test Cases**:
```
1. Free → Premium: Verify tier updates in database
2. Premium → Enterprise: Verify tier updates
3. Enterprise → Free: Verify downgrade works
4. Invalid tier: "platinum" → validation error
5. Same tier: "premium" → "premium" → should succeed (idempotent)
```

### Trial Extension (FR-054)

**Test Cases**:
```
1. Valid future date: "2025-11-01" → success
2. Past date: "2025-01-01" → validation error
3. Invalid format: "tomorrow" → validation error
4. Very far future: "2030-01-01" → should warn but allow
5. Same date: Update to current trial_end_date → success (idempotent)
```

### Block/Unblock Account (FR-055)

**Test Cases**:
```
1. Block normal user → actief=false, sessions deleted
2. Unblock user → actief=true
3. Block self (admin) → should be rejected with 403
4. Block already blocked → idempotent success
5. Verify user cannot login when blocked
```

### Delete Account (FR-056)

**Test Cases**:
```
1. Delete normal user → cascade deletes tasks, emails
2. Delete self (admin) → rejected with 403
3. Delete last admin → rejected with 403
4. Delete non-existent user → 404 error
5. Verify cascade: tasks deleted, email_imports deleted
```

### Password Reset (FR-057)

**Test Cases**:
```
1. Reset for normal user → new password generated
2. Verify new password works for login
3. Verify old password no longer works
4. Reset for admin → success (but use carefully!)
5. Check password strength: 12 chars, alphanumeric
```

### System Settings Update (FR-066)

**Test Cases**:
```
1. Update onboarding_video_url with YouTube URL → success
2. Update with Vimeo URL → success
3. Update with invalid URL → validation error
4. Update with non-video URL → validation error
5. Verify new URL applies to new users
```

### SQL Query Execution (FR-072)

**Test Cases**:
```
1. SELECT query: "SELECT * FROM users LIMIT 5" → returns 5 rows
2. UPDATE without confirm → rejected, requires confirmation
3. UPDATE with confirm → executes, returns rows_affected
4. DROP TABLE → blocked entirely, not allowed
5. TRUNCATE → blocked, not allowed
6. Syntax error → returns SQL error message
7. Query timeout → aborts after 10 seconds
```

### Database Cleanup (implied in FR-073)

**Test Cases**:
```
1. Preview mode → shows what will be deleted, doesn't delete
2. Execute mode → deletes orphaned data
3. No orphaned data → returns "nothing to clean"
4. Expired sessions → deleted
5. Orphaned planning entries → deleted
```

### User Data Inspector (FR-081)

**Test Cases**:
```
1. View active user → shows full data
2. View inactive user → shows data with "inactive" flag
3. View deleted user → 404 error
4. Check task breakdown by project/context
5. Check email import history
6. Verify subscription details accuracy
```

### Force Logout (FR-101)

**Test Cases**:
```
1. Force logout active user → all sessions deleted
2. Verify user's next request requires re-login
3. Force logout user with no sessions → success (0 deleted)
4. Force logout self → allowed (but you'll be logged out!)
5. Multiple sessions → all deleted
```

## Performance Testing

### Statistics Endpoints
```bash
# Measure response time
time curl -b cookies.txt https://tickedify.com/api/admin2/stats/home

# Target: <200ms
# Accept: <500ms
# Investigate if: >1000ms
```

### User Search
```bash
# Measure search performance
time curl -b cookies.txt "https://tickedify.com/api/admin2/users/search?q=jan"

# Target: <300ms
# Accept: <500ms
# Investigate if: >1000ms
```

### Database Operations
```bash
# Database stats
time curl -b cookies.txt https://tickedify.com/api/admin2/stats/database

# Target: <500ms
# Accept: <1000ms
```

## Browser Testing

### Cross-Browser Compatibility
Test in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (macOS/iOS)

**Check**:
- Layout renders correctly
- Navigation works
- Forms submit correctly
- Charts display (Chart.js)
- No console errors

### Responsive Design
Test at breakpoints:
- 📱 Mobile: 375px width
- 📱 Tablet: 768px width
- 💻 Desktop: 1440px width

**Check**:
- Navigation collapses on mobile
- Tables scroll horizontally if needed
- Charts resize appropriately
- Forms remain usable

## Security Testing

### Authentication
```bash
# Access without login → redirect to login
curl -c cookies.txt https://tickedify.com/admin2.html

# Access with non-admin account → 403 forbidden
# (Create normal user account first)
curl -b cookies-normal.txt https://tickedify.com/api/admin2/stats/home
```

### Authorization
```
1. Try to delete own account → 403 forbidden
2. Try to delete last admin → 403 forbidden
3. Try destructive SQL without confirm → 400 error
4. Try DROP TABLE query → 400 blocked
```

### Input Validation
```
1. Invalid tier: "platinum" → 400 error
2. Invalid date: "not-a-date" → 400 error
3. Invalid URL: "not-a-url" → 400 error
4. SQL injection attempt: "'; DROP TABLE users; --" → safely escaped
```

## Regression Testing

After each deployment, run this checklist:

- [ ] Admin can login and access dashboard
- [ ] Home statistics load correctly
- [ ] User search returns results
- [ ] User details view works
- [ ] Tier change updates user
- [ ] Trial extension updates user
- [ ] Task statistics display
- [ ] Email statistics display
- [ ] Database monitor loads
- [ ] Payment configs display
- [ ] System settings can be updated
- [ ] User data inspector works
- [ ] No console errors
- [ ] All API endpoints return 200 OK (or expected error)

## Automated Testing (Playwright)

### Run Full Test Suite
```bash
# Use tickedify-testing agent
# Example test script location: tests/admin-dashboard-e2e.spec.js

npx playwright test tests/admin-dashboard-e2e.spec.js
```

### Example Playwright Test
```javascript
test('Admin can search users and view details', async ({ page }) => {
  // Login as admin
  await page.goto('https://tickedify.com/admin2.html');
  await page.fill('[name="email"]', 'jan@buskens.be');
  await page.fill('[name="password"]', 'qyqhut-muDvop-fadki9');
  await page.click('button[type="submit"]');

  // Navigate to User Management
  await page.click('text=User Management');

  // Search for user
  await page.fill('[placeholder="Search users..."]', 'jan');
  await page.waitForSelector('.search-results');

  // Click first result
  await page.click('.search-results .user-item:first-child');

  // Verify details loaded
  await expect(page.locator('.user-details')).toBeVisible();
  await expect(page.locator('.user-email')).toContainText('@');
});
```

## Troubleshooting

### Dashboard Not Loading
```
1. Check browser console for errors
2. Verify admin authentication (check cookies)
3. Check Network tab for failed API calls
4. Verify server.js is running
5. Check Vercel deployment logs
```

### Statistics Show Wrong Values
```
1. Verify database connection
2. Check SQL queries in server.js
3. Test endpoints with curl
4. Verify indexes exist (performance)
5. Check for data inconsistencies
```

### User Actions Fail
```
1. Check request payload in Network tab
2. Verify admin session is valid
3. Check server logs for errors
4. Verify database constraints
5. Check audit logging output
```

### Charts Not Rendering
```
1. Verify Chart.js CDN loaded (check Network tab)
2. Check console for Chart.js errors
3. Verify data format matches Chart.js expected format
4. Test with hardcoded data
5. Check canvas element exists in DOM
```

## Success Metrics

After testing, dashboard should meet:

- ✅ All 19 statistics display correctly
- ✅ All 15 admin actions work as expected
- ✅ Page load <500ms
- ✅ API responses <200ms (stats), <500ms (actions)
- ✅ Zero console errors
- ✅ Cross-browser compatible
- ✅ Mobile responsive
- ✅ All security checks pass
- ✅ Audit logging works

## Next Steps

After successful quickstart testing:
1. Run full regression test suite
2. Perform load testing (if needed)
3. Update changelog.html with new feature
4. Deploy to production
5. Monitor error rates and performance
6. Gather feedback from other admins
