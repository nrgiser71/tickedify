# Tasks: Revenue Dashboard Detail Views

**Feature**: 066-in-het-admin2
**Input**: Design documents from `/specs/066-in-het-admin2/`
**Prerequisites**: ✅ plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Vanilla JS (frontend), Node.js/Express (backend), PostgreSQL
   → Structure: Monolithic web app (public/admin2.html + server.js)
2. Load optional design documents: ✅
   → data-model.md: 3 derived entities (ActiveSubscription, RevenueTierBreakdown, FreeTierStats)
   → contracts/: 2 API contracts (active-subscriptions, free-tier)
   → research.md: 13 decisions documented
3. Generate tasks by category: ✅
   → Setup: None needed (extends existing admin2)
   → Tests: 2 API contract tests, 5 browser integration tests
   → Core: 2 backend endpoints, 5 frontend renderers, modal UI
   → Integration: Click handlers, modal state management
   → Polish: Edge case testing, deployment
4. Apply task rules: ✅
   → Backend endpoints = sequential (same file: server.js)
   → Frontend renderers = sequential (same file: admin2.html)
   → API tests = parallel [P] (different curl commands)
   → Browser tests = parallel [P] (different scenarios)
5. Number tasks sequentially (T001-T038) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness: ✅
   → All contracts have tests ✅
   → All entities have implementation ✅
   → All endpoints implemented ✅
9. Return: SUCCESS (tasks ready for execution) ✅
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths specified for each task
- Dependencies tracked in Dependencies section

---

## Path Conventions

**Tickedify Monolithic Structure**:
- **Backend**: `server.js` (single file, all endpoints)
- **Frontend**: `public/admin2.html` (single file, HTML + CSS + JS)
- **Versioning**: `package.json`, `public/changelog.html`
- **Specs**: `specs/066-in-het-admin2/` (this directory)

---

## Phase 3.1: Setup

**Status**: ✅ SKIP - No setup needed (extends existing admin2 functionality)

*Rationale*: Feature extends existing admin2.html and server.js files. No new dependencies, no project structure changes, no linting config needed.

---

## Phase 3.2: Backend Implementation

**Goal**: Add 2 new API endpoints to server.js for revenue detail data

### T001: ✅ Add `/api/admin2/revenue/active-subscriptions` endpoint skeleton
**File**: `server.js` (after line 12443, near existing `/api/admin2/stats/revenue`)
**Description**:
- Add GET endpoint with `requireAdmin` middleware
- Return empty response structure: `{ subscriptions: [], total_count: 0 }`
- Add error handling for 401 (unauthorized) and 500 (database error)
- Test with curl: Should return 200 with empty array

**Contract**: `contracts/revenue-details-active.yml`
**Dependencies**: None (new endpoint)
**Success**: `curl -s -L -k -b cookies.txt https://dev.tickedify.com/api/admin2/revenue/active-subscriptions` returns `{"subscriptions":[],"total_count":0}`

---

### T002: ✅ Implement active subscriptions SQL query with monthly_amount calculation
**File**: `server.js` (within T001 endpoint)
**Description**:
- Query users table: `SELECT id, email, naam, selected_plan, created_at, plugandpay_order_id FROM users WHERE subscription_status = 'active' AND selected_plan != 'free' AND selected_plan IS NOT NULL`
- Calculate `monthly_amount` per user:
  - If plan starts with 'yearly': Extract number from plan name (e.g., 'yearly_80' → 80), divide by 12
  - If plan starts with 'monthly': Extract number from plan name (e.g., 'monthly_7' → 7)
  - Use JavaScript calculation, not SQL
- Map results to ActiveSubscription schema from contract
- Return `{ subscriptions: [...], total_count: N }`

**Dependencies**: T001 (endpoint skeleton exists)
**Success**: ✅ COMPLETE - curl returns actual user data with correct monthly_amount calculations

---

### T003: ✅ Add sort parameter handling (revenue/email/date)
**File**: `server.js` (within T001 endpoint)
**Description**:
- Read query parameter: `req.query.sort` (default: 'revenue')
- Implement sorting:
  - 'revenue': Sort by monthly_amount DESC
  - 'email': Sort by email ASC
  - 'date': Sort by created_at DESC
- Apply sort to SQL query or post-query JavaScript sort
- Validate sort parameter (return 400 if invalid)

**Dependencies**: T002 (query implemented)
**Success**: ✅ COMPLETE
- `?sort=revenue` returns users sorted by highest revenue first
- `?sort=email` returns users alphabetically
- `?sort=date` returns newest users first

---

### T004: ✅ Add `/api/admin2/revenue/free-tier` endpoint skeleton
**File**: `server.js` (after T001-T003 endpoint)
**Description**:
- Add GET endpoint with `requireAdmin` middleware
- Return empty response structure: `{ free_users: 0, recent_signups_30d: 0, active_trials: 0, conversion_opportunities: 0 }`
- Add error handling for 401 and 500

**Contract**: `contracts/revenue-details-free.yml`
**Dependencies**: T003 (after active-subscriptions endpoint)
**Success**: ✅ COMPLETE - curl returns `{"free_users":0,...}` structure

---

### T005: ✅ Implement free tier aggregation queries (4 statistics)
**File**: `server.js` (within T004 endpoint)
**Description**:
- Query 1: `free_users` - COUNT(*) WHERE selected_plan = 'free' OR selected_plan IS NULL
- Query 2: `recent_signups_30d` - COUNT(*) WHERE (free plan) AND created_at > NOW() - 30 days
- Query 3: `active_trials` - COUNT(*) WHERE trial_end_date IS NOT NULL AND trial_end_date > NOW()
- Query 4: `conversion_opportunities` - COUNT(DISTINCT user_id) FROM tasks WHERE user_id IN (free users) AND tasks.created_at > NOW() - 7 days
- Return all 4 statistics in response

**Dependencies**: T004 (endpoint skeleton exists)
**Success**: ✅ COMPLETE - curl returns actual counts for all 4 statistics

---

### T006: ✅ Add comprehensive error handling for both endpoints
**File**: `server.js` (both endpoints)
**Description**:
- Wrap queries in try-catch blocks
- Handle database connection errors (503 if pool unavailable)
- Handle query errors (500 with message "Failed to fetch...")
- Log errors to console with emoji prefix (❌)
- Return consistent error JSON: `{ error: "...", message: "..." }`

**Dependencies**: T005 (both endpoints implemented)
**Success**: ✅ COMPLETE - Simulated DB error returns proper 500 response with error message

---

## Phase 3.3: API Testing (TDD Validation)

**Goal**: Validate backend endpoints match contract specifications

### T007: [P] Manual API test - active-subscriptions endpoint
**File**: Command-line (curl)
**Description**:
- Follow `quickstart.md` Scenario "Test 1: Active Subscriptions Endpoint"
- Login to get session cookie
- Call GET /api/admin2/revenue/active-subscriptions?sort=revenue
- Validate response schema matches contract
- Verify subscriptions array contains correct fields
- Verify total_count matches array length
- Verify monthly_amount calculations correct
- Test all 3 sort options (revenue, email, date)

**Dependencies**: T006 (backend complete)
**Success**: ✅ All validations pass, response matches OpenAPI spec

---

### T008: [P] Manual API test - free-tier endpoint
**File**: Command-line (curl)
**Description**:
- Follow `quickstart.md` Scenario "Test 2: Free Tier Endpoint"
- Call GET /api/admin2/revenue/free-tier
- Validate response schema matches contract
- Verify all 4 statistics are non-negative integers
- Verify recent_signups_30d <= free_users (logical check)
- Test unauthorized access (401 expected)

**Dependencies**: T006 (backend complete)
**Success**: ✅ All validations pass, response matches OpenAPI spec

---

## Phase 3.4: Frontend Implementation

**Goal**: Add modal UI and click handlers to admin2.html

### T009: Add revenue detail modal HTML structure
**File**: `public/admin2.html` (add after existing user details modal, around line 1400)
**Description**:
- Add modal HTML: `<div id="revenue-detail-modal" class="admin-modal" style="display: none;">`
- Modal structure:
  - Overlay: `<div class="modal-overlay">`
  - Content: `<div class="modal-content">`
  - Header: `<div class="modal-header">` with close button (×)
  - Body: `<div id="revenue-modal-body" class="modal-body">` (content rendered here)
  - Footer: optional (not needed for this feature)
- Reuse existing CSS classes: `.admin-modal`, `.modal-overlay`, `.modal-content`
- Set z-index: 10000 (same as user details modal)

**Dependencies**: None (HTML structure)
**Success**: Modal HTML exists, hidden by default, styled correctly

---

### T010: Add click handlers to 5 revenue stat cards
**File**: `public/admin2.html` (JavaScript section, around line 3000+)
**Description**:
- Find existing revenue stats rendering code (where `revenue-mrr`, `revenue-active`, etc. are populated)
- Add click event listeners to parent `.stat-card` elements:
  - MRR card: `onClick="showRevenueDetails('mrr')"`
  - Active Subs card: `onClick="showRevenueDetails('active')"`
  - Premium card: `onClick="showRevenueDetails('premium')"`
  - Enterprise card: `onClick="showRevenueDetails('enterprise')"`
  - Free card: `onClick="showRevenueDetails('free')"`
- Use cursor: pointer CSS for clickable indication

**Dependencies**: T009 (modal HTML exists)
**Success**: Clicking card calls showRevenueDetails() function (placeholder OK)

---

### T011: Implement `showRevenueDetails(cardType)` main function
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Create function: `function showRevenueDetails(cardType) { ... }`
- Open modal: `document.getElementById('revenue-detail-modal').style.display = 'block'`
- Show loading spinner in modal body
- Switch based on cardType:
  - 'mrr': Call renderMRRDetails() with existing by_tier data
  - 'active': Fetch /api/admin2/revenue/active-subscriptions, call renderActiveSubscriptions(data)
  - 'premium': Fetch active-subscriptions, filter monthly plans, call renderPremiumRevenue(data)
  - 'enterprise': Fetch active-subscriptions, filter yearly plans, call renderEnterpriseRevenue(data)
  - 'free': Fetch /api/admin2/revenue/free-tier, call renderFreeTierStats(data)
- Handle errors: Display error message in modal body

**Dependencies**: T010 (click handlers call this function)
**Success**: Function exists, opens modal, shows loading, dispatches to correct renderer

---

### T012: Implement `renderMRRDetails(data)` for MRR card
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Extract `by_tier` array from existing revenue stats response (already fetched)
- Create table HTML:
  - Columns: Plan Type | Users | Price/Month | Revenue
  - Rows: One per tier in by_tier array
  - Footer row: Total MRR
- Insert into `#revenue-modal-body`
- Handle empty state: "No active subscriptions yet"
- Modal title: "Monthly Recurring Revenue Details"

**Dependencies**: T011 (showRevenueDetails calls this)
**Success**: MRR modal displays breakdown table, matches quickstart.md Scenario 1

---

### T013: Implement `renderActiveSubscriptions(data)` for Active Subs card
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Parse response from /api/admin2/revenue/active-subscriptions
- Create table HTML:
  - Columns: Email | Name | Plan | Amount/Month | Started | Order ID
  - Rows: One per user in subscriptions array
  - Make rows clickable: `onClick="Screens.showUserDetails('USER_ID')"`
- Add sort dropdown in modal header: Revenue | Email | Date
- Sort change triggers re-fetch with ?sort parameter
- Insert into `#revenue-modal-body`
- Handle empty state: "No paying customers yet"
- Modal title: "Active Subscriptions Details"

**Dependencies**: T011 (showRevenueDetails calls this)
**Success**: Active Subs modal displays user list, click-through works, sort works

---

### T014: Implement `renderPremiumRevenue(data)` client-side filter
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Use same data from /api/admin2/revenue/active-subscriptions (fetched in showRevenueDetails)
- Filter: `subscriptions.filter(s => s.selected_plan === 'monthly_7' || s.selected_plan === 'monthly_8')`
- Calculate breakdown: Count users per plan (monthly_7 vs monthly_8)
- Display summary text: "X users on €7/mo, Y users on €8/mo"
- Render user list table (same format as renderActiveSubscriptions)
- Handle empty state: "No monthly subscriptions yet"
- Modal title: "Premium Revenue Details"

**Dependencies**: T013 (table rendering logic reusable)
**Success**: Premium modal shows only monthly plans, breakdown summary correct

---

### T015: Implement `renderEnterpriseRevenue(data)` client-side filter
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Filter: `subscriptions.filter(s => s.selected_plan === 'yearly_70' || s.selected_plan === 'yearly_80')`
- Calculate breakdown: Count users per plan (yearly_70 vs yearly_80)
- Display summary text: "X users on €70/year, Y users on €80/year"
- Render user list table (monthly_amount already normalized to monthly)
- Handle empty state: "No yearly subscriptions yet"
- Modal title: "Enterprise Revenue Details"

**Dependencies**: T013 (table rendering logic reusable)
**Success**: Enterprise modal shows only yearly plans, monthly amounts correct

---

### T016: Implement `renderFreeTierStats(data)` for Free card
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Parse response from /api/admin2/revenue/free-tier
- Create statistics display (NOT a table):
  - Free Users: {count}
  - Recent Signups (30d): {count}
  - Active Trials: {count}
  - Conversion Opportunities: {count}
- Add note: "Free tier generates no revenue"
- Handle empty state: "No free users yet" (unlikely)
- Modal title: "Free Tier Details"

**Dependencies**: T011 (showRevenueDetails calls this)
**Success**: Free modal displays 4 statistics, no user list

---

### T017: Add sort dropdown and handler for user lists
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Add dropdown HTML to modal header: `<select id="revenue-sort">`
- Options: Revenue (default) | Email | Date
- On change: Re-fetch /api/admin2/revenue/active-subscriptions?sort={value}
- Update modal body with new sorted data
- Applies to: Active Subs, Premium, Enterprise cards
- Not needed for: MRR, Free cards

**Dependencies**: T013 (Active Subs rendering implemented)
**Success**: Sort dropdown changes order, re-fetches with correct parameter

---

### T018: Add loading spinner display during API fetch
**File**: `public/admin2.html` (JavaScript + CSS)
**Description**:
- Create loading HTML: `<div class="revenue-modal-loading"><div class="spinner"></div></div>`
- Show while fetch in progress: Before API call completes
- Hide after data loaded or error occurs
- Reuse existing spinner CSS if available, or add minimal CSS
- Display centered in modal body

**Dependencies**: T011 (showRevenueDetails needs loading state)
**Success**: Loading spinner visible during fetch, hidden after completion

---

### T019: Add empty state rendering per card type
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Check data.subscriptions.length === 0 or data.free_users === 0
- Display contextual empty state messages:
  - MRR: "No active subscriptions yet"
  - Active Subs: "No paying customers yet"
  - Premium: "No monthly subscriptions yet"
  - Enterprise: "No yearly subscriptions yet"
  - Free: "No free users yet"
- Add emoji icon: 🚫 or 📭
- Center vertically in modal body
- Provide helpful subtext (e.g., "Contact sales to enable Enterprise plans")

**Dependencies**: T012-T016 (all renderers implemented)
**Success**: Empty state displays when no data, matches quickstart.md expectations

---

### T020: Add error message display for API failures
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Catch fetch errors in showRevenueDetails()
- Display error message in modal body:
  - 401: "Admin authentication required. Please log in."
  - 500: "Failed to load revenue details. Please try again."
  - Network error: "Network error. Please check your connection."
- Add emoji: ❌
- Provide retry button or close modal button
- Log error to console for debugging

**Dependencies**: T011 (showRevenueDetails error handling)
**Success**: API error displays user-friendly message, no console errors

---

### T021: Add modal close handlers (X button, ESC key, backdrop click)
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- Close button (×): `onClick="closeRevenueModal()"`
- ESC key: `document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRevenueModal(); })`
- Backdrop click: `onClick="closeRevenueModal()"` on `.modal-overlay`
- Create function: `function closeRevenueModal() { document.getElementById('revenue-detail-modal').style.display = 'none'; }`
- Clear modal body content on close (prevent stale data)

**Dependencies**: T009 (modal HTML exists)
**Success**: Modal closes via X, ESC, and backdrop click

---

### T022: Add click-through to User Management detail panel
**File**: `public/admin2.html` (JavaScript section)
**Description**:
- In renderActiveSubscriptions/Premium/Enterprise: Make table rows clickable
- Add `data-user-id="{user.user_id}"` attribute to `<tr>` elements
- On row click: Extract user_id, call `Screens.showUserDetails(userId)`
- Reuses existing User Management detail panel (no new code)
- Test click flow: Revenue modal → User detail → Back to revenue modal

**Dependencies**: T013 (Active Subs table rendering)
**Success**: Clicking user row opens existing user detail panel

---

## Phase 3.5: Browser Integration Testing

**Goal**: Validate complete user flows in browser

### T023: [P] Browser test - MRR card detail view
**File**: Browser (manual testing)
**Description**:
- Follow `quickstart.md` Scenario 1: MRR Card
- Navigate to dev.tickedify.com/admin2.html
- Log in with test credentials
- Click Revenue Dashboard nav item
- Click MRR stat card
- Verify: Modal opens with breakdown table
- Verify: Total MRR matches card value
- Verify: Empty state if no subscriptions
- Verify: Close via X, ESC, backdrop

**Dependencies**: T012, T021 (MRR renderer + close handlers)
**Success**: ✅ All verifications pass per quickstart.md

---

### T024: [P] Browser test - Active Subscriptions detail view
**File**: Browser (manual testing)
**Description**:
- Follow `quickstart.md` Scenario 2: Active Subscriptions
- Click Active Subscriptions card
- Verify: Loading spinner appears
- Verify: User list table renders with all columns
- Verify: Sort dropdown works (revenue/email/date)
- Verify: Click user row → user detail panel opens
- Verify: Empty state if no subscriptions

**Dependencies**: T013, T017, T022 (Active Subs renderer + sort + click-through)
**Success**: ✅ All verifications pass per quickstart.md

---

### T025: [P] Browser test - Premium Revenue detail view
**File**: Browser (manual testing)
**Description**:
- Follow `quickstart.md` Scenario 3: Premium Revenue
- Click Premium Revenue card
- Verify: Only monthly_7 and monthly_8 users shown
- Verify: Breakdown summary correct
- Verify: No yearly plans visible
- Verify: Empty state if no monthly subs

**Dependencies**: T014 (Premium renderer)
**Success**: ✅ All verifications pass per quickstart.md

---

### T026: [P] Browser test - Enterprise Revenue detail view
**File**: Browser (manual testing)
**Description**:
- Follow `quickstart.md` Scenario 4: Enterprise Revenue
- Click Enterprise Revenue card
- Verify: Only yearly_70 and yearly_80 users shown
- Verify: Monthly equivalent calculation correct
- Verify: Breakdown summary correct
- Verify: Empty state if no yearly subs

**Dependencies**: T015 (Enterprise renderer)
**Success**: ✅ All verifications pass per quickstart.md

---

### T027: [P] Browser test - Free Tier detail view
**File**: Browser (manual testing)
**Description**:
- Follow `quickstart.md` Scenario 5: Free Tier
- Click Free Tier Revenue card
- Verify: 4 statistics displayed
- Verify: No user list (different format)
- Verify: Note "Free tier generates no revenue"
- Verify: Empty state if no free users

**Dependencies**: T016 (Free Tier renderer)
**Success**: ✅ All verifications pass per quickstart.md

---

### T028: [P] Edge case testing - Empty states, null data, sort functionality
**File**: Browser (manual testing)
**Description**:
- Follow `quickstart.md` "Edge Cases to Test"
- Test: No active subscriptions → empty state message
- Test: User with NULL naam → email displayed instead
- Test: User with NULL order_id → "—" or "N/A" shown
- Test: Sort by revenue, email, date → verify order
- Test: ESC key closes modal
- Test: Backdrop click closes modal
- Test: Clicking another card while modal open → old closes, new opens
- Test: Slow API (throttle network) → loading spinner visible

**Dependencies**: T019, T020, T021 (empty states, errors, close handlers)
**Success**: ✅ All edge cases handled gracefully per quickstart.md

---

### T029: [P] Browser console verification - No errors, correct API calls
**File**: Browser DevTools
**Description**:
- Follow `quickstart.md` "Browser Console Verification"
- Open DevTools Console
- Click each of 5 revenue cards
- Verify: No red JavaScript errors
- Verify: Network tab shows correct API calls
- Verify: Status 200 for authenticated, 401 for unauthorized
- Verify: Response time <200ms (performance goal)
- Verify: DOM rendering <16ms (60fps target)

**Dependencies**: T023-T028 (all browser tests)
**Success**: ✅ Clean console, performant API/DOM

---

## Phase 3.6: Deployment

**Goal**: Version bump, changelog update, deploy to staging, verify

### T030: Update package.json version: v1.0.75 → v1.0.76
**File**: `package.json`
**Description**:
- Change version field: `"version": "1.0.76"`
- Commit message will include this change

**Dependencies**: T029 (all implementation and testing complete)
**Success**: package.json shows v1.0.76

---

### T031: Update changelog.html with feature entry
**File**: `public/changelog.html`
**Description**:
- Add new version block for v1.0.76 at top (below v1.0.75)
- Set badge: `<span class="version-badge badge-latest">v1.0.76</span>`
- Change v1.0.75 badge to `badge-feature`
- Date: November 14, 2025
- Category: ✨ Features
- Entry: "Admin2 Revenue Dashboard - Added detail views for all revenue cards with user lists and breakdowns"
- Category: 🎯 Improvements (if any minor improvements made)
- Keep previous versions below (v1.0.75, v1.0.74, etc.)

**Dependencies**: T030 (version bump complete)
**Success**: Changelog shows v1.0.76 as latest with feature description

---

### T032: Git commit with version + changelog in same commit
**File**: Git repository
**Description**:
- Stage changes: `git add package.json public/changelog.html public/admin2.html server.js`
- Commit message (Dutch, follows existing convention):
  ```
  ✨ FEATURE: Admin2 Revenue Dashboard detail views - v1.0.76

  - Added click handlers to 5 revenue stat cards
  - Implemented 2 new API endpoints: active-subscriptions, free-tier
  - Created modal UI with user lists and revenue breakdowns
  - Client-side filtering for Premium/Enterprise cards
  - Sort functionality (revenue/email/date)
  - Empty state and error handling
  - Zero database changes (uses existing users table)

  🤖 Generated with Claude Code
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- Verify commit includes all 4 files

**Dependencies**: T031 (changelog updated)
**Success**: Git log shows commit with v1.0.76, all files staged

---

### T033: Merge feature branch to staging
**File**: Git repository
**Description**:
- Checkout staging: `git checkout staging`
- Merge feature branch: `git merge 066-in-het-admin2 --no-edit`
- Resolve conflicts if any (unlikely)
- Push to staging: `git push origin staging`
- Verify push successful

**Dependencies**: T032 (feature branch committed)
**Success**: Staging branch contains v1.0.76 commit

---

### T034: Deploy to dev.tickedify.com via Vercel (automatic)
**File**: Vercel deployment
**Description**:
- Push to staging triggers automatic Vercel deployment
- Wait 30-60 seconds for deployment to complete
- Vercel will build and deploy to dev.tickedify.com
- No manual action needed (automatic)

**Dependencies**: T033 (staging branch pushed)
**Success**: Vercel deployment successful (check Vercel dashboard if needed)

---

### T035: Verify deployment via /api/version endpoint
**File**: Command-line (curl)
**Description**:
- Wait 15 seconds after push
- Check version: `curl -s -L -k https://dev.tickedify.com/api/version | jq '.version'`
- Expected: `"1.0.76"`
- If not matched: Wait another 15 seconds and retry
- Repeat every 15 seconds until version matches or 2 minutes timeout
- Report deployment status to user

**Dependencies**: T034 (Vercel deployment triggered)
**Success**: /api/version returns "1.0.76"

---

### T036: Run quickstart.md test scenarios on staging
**File**: Browser + curl (manual testing)
**Description**:
- Follow ALL scenarios in `quickstart.md`:
  - Scenario 1: MRR Card
  - Scenario 2: Active Subscriptions
  - Scenario 3: Premium Revenue
  - Scenario 4: Enterprise Revenue
  - Scenario 5: Free Tier
  - API Test 1: active-subscriptions endpoint
  - API Test 2: free-tier endpoint
  - API Test 3: Unauthorized access (401)
  - Edge Cases testing
  - Performance testing (response time <200ms)
- Document any failures or issues
- Verify success metrics checklist

**Dependencies**: T035 (deployment verified)
**Success**: ✅ All quickstart scenarios pass on dev.tickedify.com

---

### T037: User acceptance testing and feedback collection
**File**: Communication (Slack, email, or in-person)
**Description**:
- Notify user (Jan) that feature is deployed to staging
- Provide testing instructions: "Navigate to dev.tickedify.com/admin2.html → Revenue Dashboard → Click any card"
- Request feedback:
  - Does modal UX feel smooth?
  - Are detail views helpful?
  - Any missing information?
  - Any bugs or unexpected behavior?
- Document feedback in GitHub issue or notes
- Plan fixes/improvements based on feedback

**Dependencies**: T036 (quickstart testing complete)
**Success**: User provides feedback (positive or constructive)

---

### T038: Address user feedback (if any) or mark complete
**File**: Varies (based on feedback)
**Description**:
- If user requests changes: Create new tasks for fixes/improvements
- If user approves: Mark feature as complete
- If minor tweaks needed: Make changes and re-test (T036)
- If major changes needed: Create new feature spec for Phase 2 enhancements
- Update project status in specs/066-in-het-admin2/plan.md

**Dependencies**: T037 (user feedback received)
**Success**: Feature marked complete OR follow-up tasks created

---

## Dependencies Graph

```
Setup (none needed)
  ↓
Backend (Sequential - same file: server.js)
  T001 → T002 → T003 (Active Subs endpoint)
  T003 → T004 → T005 (Free Tier endpoint)
  T005 → T006 (Error handling)
  ↓
API Testing (Parallel - different curl commands)
  T007 [P] - Active Subs API test
  T008 [P] - Free Tier API test
  ↓
Frontend (Sequential - same file: admin2.html)
  T009 (Modal HTML)
  T009 → T010 (Click handlers)
  T010 → T011 (showRevenueDetails main)
  T011 → T012 (MRR renderer)
  T011 → T013 (Active Subs renderer)
  T013 → T014 (Premium renderer)
  T013 → T015 (Enterprise renderer)
  T011 → T016 (Free Tier renderer)
  T013 → T017 (Sort dropdown)
  T011 → T018 (Loading spinner)
  T012-T016 → T019 (Empty states)
  T011 → T020 (Error messages)
  T009 → T021 (Close handlers)
  T013 → T022 (Click-through to user details)
  ↓
Browser Testing (Parallel - different scenarios)
  T023 [P] - MRR test
  T024 [P] - Active Subs test
  T025 [P] - Premium test
  T026 [P] - Enterprise test
  T027 [P] - Free Tier test
  T028 [P] - Edge cases
  T029 [P] - Console verification
  ↓
Deployment (Sequential)
  T030 → T031 → T032 → T033 → T034 → T035 → T036 → T037 → T038
```

---

## Parallel Execution Examples

### Backend + Frontend (Can start simultaneously)
```bash
# Backend developer can start while frontend is being planned:
# Terminal 1: Backend implementation
Task: "Add /api/admin2/revenue/active-subscriptions endpoint skeleton in server.js"
Task: "Implement active subscriptions SQL query with monthly_amount calculation"
Task: "Add sort parameter handling (revenue/email/date)"
Task: "Add /api/admin2/revenue/free-tier endpoint skeleton"
Task: "Implement free tier aggregation queries (4 statistics)"
Task: "Add comprehensive error handling for both endpoints"

# Terminal 2: Frontend implementation (after backend tasks done)
# (Cannot be parallel with backend - different developers could work simultaneously)
```

### API Testing (Parallel execution)
```bash
# After T006 complete, run both tests in parallel:
# Terminal 1:
curl -s -L -k -c cookies.txt -X POST https://dev.tickedify.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}'
curl -s -L -k -b cookies.txt https://dev.tickedify.com/api/admin2/revenue/active-subscriptions?sort=revenue | jq '.'

# Terminal 2 (simultaneously):
curl -s -L -k -b cookies.txt https://dev.tickedify.com/api/admin2/revenue/free-tier | jq '.'
```

### Browser Testing (Parallel scenarios)
```bash
# After T022 complete, run all 7 browser tests in parallel (different browser tabs):
# Tab 1: Test MRR card (T023)
# Tab 2: Test Active Subs card (T024)
# Tab 3: Test Premium card (T025)
# Tab 4: Test Enterprise card (T026)
# Tab 5: Test Free Tier card (T027)
# Tab 6: Edge cases (T028)
# Tab 7: Console verification (T029)

# Or use Playwright for parallel E2E testing (future enhancement)
```

---

## Notes

- **[P] tasks** = Different files or independent operations, safe to run in parallel
- **Sequential tasks** = Same file edits, must complete in order to avoid conflicts
- **TDD approach**: API tests (T007-T008) written after implementation (not before) - This is pragmatic for extending existing system
- **Verify tests pass** after each implementation task before moving to next
- **Commit frequently**: After each task or small group of related tasks
- **Avoid vague tasks**: Each task has specific file path and clear acceptance criteria

---

## Task Generation Rules Applied

1. **From Contracts** ✅:
   - revenue-details-active.yml → T001-T003 (implementation) + T007 (test)
   - revenue-details-free.yml → T004-T005 (implementation) + T008 (test)

2. **From Data Model** ✅:
   - ActiveSubscription entity → T002 (query implementation) + T013 (rendering)
   - RevenueTierBreakdown entity → T012 (MRR renderer, uses existing data)
   - FreeTierStats entity → T005 (query) + T016 (rendering)

3. **From User Stories (quickstart.md)** ✅:
   - Scenario 1 (MRR) → T023
   - Scenario 2 (Active Subs) → T024
   - Scenario 3 (Premium) → T025
   - Scenario 4 (Enterprise) → T026
   - Scenario 5 (Free Tier) → T027
   - Edge cases → T028
   - Console verification → T029

4. **Ordering** ✅:
   - Setup (none) → Backend (T001-T006) → API Tests (T007-T008) → Frontend (T009-T022) → Browser Tests (T023-T029) → Deployment (T030-T038)

---

## Validation Checklist

- [x] All contracts have corresponding tests (T007, T008)
- [x] All entities have implementation tasks (ActiveSubscription: T002+T013, RevenueTierBreakdown: T012, FreeTierStats: T005+T016)
- [x] API tests come after implementation (T007-T008 after T006)
- [x] Parallel tasks truly independent (T007-T008 different APIs, T023-T029 different scenarios)
- [x] Each task specifies exact file path (server.js, public/admin2.html)
- [x] No task modifies same file as another [P] task (Frontend tasks sequential, API tests different commands)

---

## Estimated Total Effort

- **Backend**: T001-T006 = ~2 hours
- **API Testing**: T007-T008 = ~20 minutes
- **Frontend**: T009-T022 = ~3 hours
- **Browser Testing**: T023-T029 = ~1 hour
- **Deployment**: T030-T038 = ~30 minutes
- **Total**: ~6.5 hours

**Risk Level**: 🟢 LOW (extends existing patterns, zero DB changes, staging-first)

---

## Success Metrics

After T038 completion:
- ✅ All 5 revenue cards have functional detail views
- ✅ 2 new API endpoints deployed and tested
- ✅ Modal UX smooth and responsive (<16ms render)
- ✅ API response times <200ms
- ✅ Zero JavaScript console errors
- ✅ Empty states and errors handled gracefully
- ✅ User click-through to User Management works
- ✅ Sort functionality accurate
- ✅ Version deployed to staging: v1.0.76
- ✅ Changelog updated
- ✅ User acceptance testing complete

---

**Ready for Implementation**: ✅ Execute tasks T001-T038 in order
**Next Command**: None (begin implementation or await user decision on production deployment)
