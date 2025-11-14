# Implementation Plan: Revenue Dashboard Detail Views

**Branch**: `066-in-het-admin2` | **Date**: 2025-11-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/066-in-het-admin2/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✅ SUCCESS - Spec loaded with 13 NEEDS CLARIFICATION markers
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✅ SUCCESS - Identified: Vanilla JS frontend, Node.js backend, PostgreSQL
   ✅ Project Type: Web application (frontend + backend in single codebase)
3. Fill the Constitution Check section
   ✅ SUCCESS - Beta Freeze compliance checked
4. Evaluate Constitution Check section
   ✅ PASS - No violations, staging-first workflow applies
5. Execute Phase 0 → research.md
   🔄 IN PROGRESS - Resolving NEEDS CLARIFICATION markers
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   ⏸️ PENDING - Awaits Phase 0 completion
7. Re-evaluate Constitution Check
   ⏸️ PENDING - Awaits Phase 1 completion
8. Plan Phase 2 → Describe task generation approach
   ⏸️ PENDING
9. STOP - Ready for /tasks command
   ⏸️ PENDING
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Add interactive detail views to the existing Admin2 Revenue Dashboard stat cards. When an admin clicks on any of the 5 revenue metric cards (MRR, Active Subscriptions, Free/Premium/Enterprise Revenue), a modal or panel will display detailed breakdowns including user lists, revenue composition, and subscription details. This enhances admin visibility into revenue composition without disrupting the existing dashboard layout.

**Technical Approach**: Extend existing `/api/admin2/stats/revenue` endpoint with new detail endpoints, add click handlers to stat cards in admin2.html, implement modal UI component with loading states and empty state handling.

## Technical Context

**Language/Version**: JavaScript ES6+ (frontend), Node.js 16+ (backend)
**Primary Dependencies**: Express.js 4.x, PostgreSQL via pg 8.x, Vanilla JavaScript (no frameworks)
**Storage**: PostgreSQL (Neon cloud database), users table with subscription data
**Testing**: Manual API testing via curl, browser DevTools console, Playwright (via tickedify-testing agent)
**Target Platform**: Web browsers (Chrome, Firefox, Safari), responsive design
**Project Type**: Web application (monolithic - frontend + backend in single codebase)
**Performance Goals**: <200ms API response for detail queries, smooth modal animations
**Constraints**: Beta freeze active (deploy to staging only), must work with existing admin2.html architecture, no external UI libraries
**Scale/Scope**: ~10-50 active subscriptions (current beta scale), 5 detail view variations, 3-4 new API endpoints

**Existing Architecture Context**:
- Admin2 dashboard uses vanilla JavaScript, no build step
- Revenue data fetched from `/api/admin2/stats/revenue` endpoint (server.js:12362)
- Stat cards use `id` selectors: `revenue-mrr`, `revenue-active`, `revenue-premium`, `revenue-enterprise`, `revenue-free`
- Current response structure: `{ mrr, arr, by_tier: [{tier, user_count, price_monthly, revenue}], payment_configs }`
- Authentication via `requireAdmin` middleware
- Subscription data in `users` table: `selected_plan`, `subscription_status`, `email`, `naam`, `plugandpay_order_id`

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze Compliance ✅
- **Status**: PASS
- **Verification**:
  - ✅ No production deployments planned (staging-first workflow)
  - ✅ All testing on dev.tickedify.com
  - ✅ No git push to main branch
  - ✅ Feature branch `066-in-het-admin2` created

### Staging-First Deployment ✅
- **Status**: PASS
- **Workflow**:
  - ✅ Feature development on `066-in-het-admin2` branch
  - ✅ Merge to `staging` branch when complete
  - ✅ Automatic Vercel deployment to dev.tickedify.com
  - ✅ User testing and approval before any production consideration

### Gespecialiseerde Sub-Agents Usage ✅
- **Status**: WILL COMPLY
- **Planned Usage**:
  - `tickedify-bug-hunter`: For debugging any modal z-index issues, API errors
  - `tickedify-testing`: For end-to-end Playwright testing of modal interactions
  - `tickedify-feature-builder`: Not needed (main agent handles feature implementation)

### Versioning & Changelog Discipline ✅
- **Status**: WILL COMPLY
- **Planned**:
  - Version bump from v1.0.75 → v1.0.76 (patch increment)
  - Changelog entry: "✨ Features: Admin2 Revenue Dashboard - Added detail views for all revenue cards with user lists and breakdowns"
  - Commit includes version + changelog in same commit

### Deployment Verification Workflow ✅
- **Status**: WILL COMPLY
- **Planned**:
  - Check dev.tickedify.com/api/version every 15 seconds
  - Verify version match before testing
  - Use `curl -s -L -k` flags to avoid macOS prompts

### Test-First via API ✅
- **Status**: WILL COMPLY
- **Planned**:
  - Direct API testing via curl for new endpoints
  - Manual browser testing for modal UI interactions
  - Playwright tests for complete user flow

## Project Structure

### Documentation (this feature)
```
specs/066-in-het-admin2/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── revenue-details-mrr.yml
│   ├── revenue-details-active.yml
│   ├── revenue-details-tier.yml
│   └── revenue-details-free.yml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Tickedify uses monolithic web app structure
public/
├── admin2.html          # Frontend: Add modal HTML, click handlers, detail rendering
├── app.js               # Not modified (user-facing app)
└── changelog.html       # Update with v1.0.76 entry

server.js                # Backend: Add detail API endpoints (~line 12400+)

# No new directories needed - extends existing admin2 functionality
```

**Structure Decision**: Monolithic web app (Tickedify-specific) - All code in public/admin2.html (frontend) and server.js (backend)

## Phase 0: Outline & Research

**Objective**: Resolve all 13 NEEDS CLARIFICATION markers from spec.md through research and design decisions.

### Research Areas

#### 1. UI/UX Pattern Decision
**Question**: Should details open as modal popup, side panel, or inline expansion?

**Research**:
- **Modal Dialog** (recommended):
  - ✅ Familiar pattern in admin2.html (used for user details)
  - ✅ Focuses attention, dims background
  - ✅ Easy to close (X button, ESC key, backdrop click)
  - ✅ Can show loading spinner during fetch
  - ❌ Requires overlay z-index management

- **Side Panel**:
  - ✅ Keeps context visible
  - ❌ Complex responsive behavior on mobile
  - ❌ Requires horizontal space management
  - ❌ Not used elsewhere in admin2 (inconsistent)

- **Inline Expansion**:
  - ✅ Simplest implementation
  - ❌ Disrupts grid layout
  - ❌ Hard to manage multiple open cards
  - ❌ Poor UX for long lists

**Decision**: Modal Dialog (matches existing admin2 user details pattern)
**Rationale**: Consistency with existing UX, better for focused data views, proven z-index approach

#### 2. Detail Content Per Card
**Questions**: What specific details should each card show?

**MRR Card Details**:
- Breakdown by plan type (monthly_7, yearly_80, monthly_8, yearly_70)
- User count per plan
- Revenue per plan
- Total MRR calculation explanation
- **Decision**: Show `by_tier` data from existing API in table format

**Active Subscriptions Card Details**:
- List of all paying customers
- Columns: Email, Name, Plan, Monthly Amount, Start Date (from created_at), Order ID
- Sort by: Revenue (highest first)
- **Decision**: Fetch users with `subscription_status = 'active' AND selected_plan != 'free'`

**Premium Revenue Card Details**:
- List of Premium users (monthly_7, monthly_8 plans)
- Breakdown: monthly_7 vs monthly_8 counts
- Revenue contribution per user
- **Decision**: Filter users where `selected_plan IN ('monthly_7', 'monthly_8')`

**Enterprise Revenue Card Details**:
- List of Enterprise users (yearly_70, yearly_80 plans)
- Breakdown: yearly_70 vs yearly_80 counts
- Revenue contribution per user (normalized to monthly)
- **Decision**: Filter users where `selected_plan IN ('yearly_70', 'yearly_80')`

**Free Tier Revenue Card Details**:
- Count of free users
- Recent signups (last 30 days)
- Conversion opportunities (users in trial, users with tasks but no subscription)
- **Decision**: Show free user statistics, no revenue data (€0)

#### 3. Pagination Strategy
**Question**: Should user lists be paginated? How many per page?

**Research**:
- Current scale: ~10-50 beta users
- Expected scale: 100-500 users within 6 months
- Modal space constraints: 400-600px height

**Decision**:
- **No pagination initially** (simple scrollable list)
- **Max 100 rows** displayed with scroll
- **Future**: Add pagination when >100 users per tier
- **Rationale**: Current scale doesn't justify complexity, vertical scroll is sufficient

#### 4. Available Actions in Detail Views
**Question**: What actions should be available? View user details? Export? Filter/sort?

**Phase 1 Scope** (MVP):
- ✅ View user list
- ✅ Click user row → open User Management detail (reuse existing functionality)
- ✅ Sort by Revenue (default), Email, Date
- ❌ No export (future feature)
- ❌ No inline filters (keep simple)

**Decision**: Click-through to user details + basic sort options
**Rationale**: Leverage existing user detail view, avoid feature creep

#### 5. Trial Users Handling
**Question**: Are trial users included in "Active Subscriptions"?

**Research**: Check users table schema for trial status
- `trial_end_date` column indicates trial period
- `subscription_status = 'trial'` vs `'active'`

**Decision**:
- **Active Subscriptions**: Only `subscription_status = 'active'` AND paid plans
- **Trials**: Excluded from revenue metrics (no revenue yet)
- **Future**: Add separate "Active Trials" detail view

#### 6. Cancelled Subscriptions
**Question**: How are cancelled subscriptions shown?

**Decision**: Not shown in revenue detail views (only active subscriptions count)
**Rationale**: Revenue dashboard shows current state, not historical

### All NEEDS CLARIFICATION Resolutions

| Marker # | Question | Resolution |
|----------|----------|------------|
| 1 | MRR card details | Show by_tier breakdown table with plan/count/revenue |
| 2 | Active Subs card details | User list: email, name, plan, amount, date |
| 3 | Premium card details | Premium user list filtered by monthly plans |
| 4 | Enterprise card details | Enterprise user list filtered by yearly plans |
| 5 | Free card details | Free user count + recent signups (no revenue) |
| 6 | Display format | Modal dialog (consistent with existing admin2 UX) |
| 7 | Pagination strategy | Scrollable list, no pagination (current scale <100 users) |
| 8 | Available actions | Click user → user details, sort by revenue/email/date |
| 9 | User field selection | email, naam, selected_plan, created_at, plugandpay_order_id |
| 10 | Revenue breakdown attributes | by_tier data: tier, user_count, price_monthly, revenue |
| 11 | Trial users in Active Subs | Excluded (only subscription_status='active' AND paid) |
| 12 | Cancelled subscriptions | Not shown (revenue dashboard = active only) |
| 13 | Empty state handling | "No {tier} subscriptions yet" message with icon |

**Output**: ✅ research.md created with all decisions documented

---

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

### Generated Artifacts

#### 1. Data Model ✅
**File**: `data-model.md`
**Content**:
- User entity schema (existing, no changes)
- ActiveSubscription derived entity
- RevenueTierBreakdown derived entity
- FreeTierStats derived entity
- Data flow diagrams for each card click
- Pricing lookup table documentation
- Validation rules per entity
- Performance considerations
- **Conclusion**: Zero database changes required (all data derived from existing users table)

#### 2. API Contracts ✅
**Directory**: `contracts/`
**Files**:
- `revenue-details-active.yml` - Active Subscriptions endpoint contract (OpenAPI 3.0.3)
- `revenue-details-free.yml` - Free Tier endpoint contract (OpenAPI 3.0.3)

**Contract Highlights**:
- RESTful endpoint design
- Request/response schemas with examples
- Error handling (401, 500)
- Security: requireAdmin middleware
- Query parameters: sort (revenue/email/date), limit (pagination support)

**No Contract Tests Yet**: Contracts define the API spec, tests will be generated in Phase 2 (tasks.md)

#### 3. Quickstart Testing Guide ✅
**File**: `quickstart.md`
**Content**:
- 5 manual test scenarios (one per card)
- curl API testing commands
- Edge case testing (empty states, null data, sort functionality)
- Browser console verification steps
- Playwright E2E test template (future)
- Performance testing guidelines
- Rollback plan
- Success metrics checklist

#### 4. Agent Context Update ✅
**File**: Repository root `CLAUDE.md`
**Changes**:
- Added JavaScript ES6+ / Node.js 16+ to language context
- Added Express.js 4.x, PostgreSQL, Vanilla JS to framework context
- Added users table and subscription data to database context
- Preserved manual additions between markers
- Kept file under 150 lines (token efficiency)

### Phase 1 Review

**Constitution Re-check**:
- ✅ Beta Freeze: Still compliant (staging-first, no production)
- ✅ Staging Deployment: Workflow unchanged
- ✅ Sub-Agents: Planned usage documented
- ✅ Versioning: v1.0.76 planned with changelog
- ✅ API Testing: curl commands in quickstart.md
- ✅ No new complexity violations

**Complexity Tracking**: Empty (no violations)

**All Artifacts Generated**: ✅
- research.md ✅
- data-model.md ✅
- contracts/ (2 files) ✅
- quickstart.md ✅
- CLAUDE.md updated ✅

---

## Phase 2: Task Planning Approach

**Status**: DESCRIBED (NOT EXECUTED - awaits /tasks command)

### Task Generation Strategy

**Input Sources**:
1. API contracts (2 endpoints to implement)
2. Data model entities (3 derived entities)
3. Quickstart test scenarios (5 user flows)
4. Frontend requirements (modal UI, click handlers, table rendering)
5. Backend requirements (2 new endpoints, query logic)

**Task Categories**:

**A. Backend Implementation** (TDD Order)
1. ✅ Add `/api/admin2/revenue/active-subscriptions` endpoint skeleton
2. ✅ Implement active subscriptions SQL query with monthly_amount calculation
3. ✅ Add sort parameter handling (revenue/email/date)
4. ✅ Add `/api/admin2/revenue/free-tier` endpoint skeleton
5. ✅ Implement free tier aggregation queries (4 statistics)
6. ✅ Add error handling for both endpoints (401, 500)
7. ✅ Test endpoints via curl (match quickstart.md test commands)

**B. Frontend Implementation** (UI → Logic)
8. ✅ Add modal HTML structure to admin2.html (reuse existing .admin-modal CSS)
9. ✅ Add click handlers to 5 stat cards (event listeners)
10. ✅ Implement `showRevenueDetails(cardType)` function
11. ✅ Implement `renderMRRDetails(data)` for MRR card (table from by_tier)
12. ✅ Implement `renderActiveSubscriptions(data)` for Active Subs card
13. ✅ Implement `renderPremiumRevenue(data)` client-side filter
14. ✅ Implement `renderEnterpriseRevenue(data)` client-side filter
15. ✅ Implement `renderFreeTierStats(data)` for Free card (no table)
16. ✅ Add sort dropdown and handler for user lists
17. ✅ Add loading spinner display during API fetch
18. ✅ Add empty state rendering per card type
19. ✅ Add error message display for API failures
20. ✅ Add modal close handlers (X button, ESC key, backdrop click)
21. ✅ Add click-through to User Management detail (reuse Screens.showUserDetails)

**C. Testing & Validation**
22. ✅ Manual API testing via curl (active-subscriptions endpoint)
23. ✅ Manual API testing via curl (free-tier endpoint)
24. ✅ Browser testing: MRR card detail view
25. ✅ Browser testing: Active Subscriptions card detail view
26. ✅ Browser testing: Premium Revenue card detail view
27. ✅ Browser testing: Enterprise Revenue card detail view
28. ✅ Browser testing: Free Tier card detail view
29. ✅ Edge case testing: Empty states, null data, sort functionality
30. ✅ Browser console verification: No errors, correct API calls

**D. Deployment**
31. ✅ Update package.json version: v1.0.75 → v1.0.76
32. ✅ Update changelog.html with feature entry
33. ✅ Commit with version + changelog in same commit
34. ✅ Merge feature branch to staging
35. ✅ Deploy to dev.tickedify.com via Vercel
36. ✅ Verify deployment via /api/version endpoint
37. ✅ Run quickstart.md test scenarios on staging
38. ✅ User acceptance testing and feedback

### Task Ordering Principles

**Parallelizable Tasks** [P]:
- Tasks 1-6 (backend endpoints) can be done in parallel to tasks 8-21 (frontend)
- Tasks 22-30 (testing) must wait for implementation completion

**Sequential Dependencies**:
1. Backend endpoints (1-7) → API testing (22-23)
2. Frontend implementation (8-21) → Browser testing (24-30)
3. All testing complete (22-30) → Deployment (31-38)

**Estimated Effort**:
- Backend: ~2 hours (simple SQL queries, RESTful endpoints)
- Frontend: ~3 hours (modal UI, 5 card renderers, click handlers)
- Testing: ~1 hour (quickstart manual run-through)
- Deployment: ~30 minutes (version bump, git workflow, verification)
- **Total**: ~6.5 hours

### Output Format (tasks.md)

The `/tasks` command will generate:
```markdown
# Tasks: Revenue Dashboard Detail Views

## Backend Implementation
- [ ] **Task 1**: Add /api/admin2/revenue/active-subscriptions endpoint [P]
- [ ] **Task 2**: Implement SQL query for active subscriptions [P]
...

## Frontend Implementation
- [ ] **Task 8**: Add modal HTML structure [P]
- [ ] **Task 9**: Add click handlers to stat cards [P]
...

## Testing & Validation
- [ ] **Task 22**: Manual API testing - active-subscriptions
- [ ] **Task 23**: Manual API testing - free-tier
...

## Deployment
- [ ] **Task 31**: Version bump to v1.0.76
- [ ] **Task 32**: Update changelog.html
...
```

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`

---

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (`/tasks` command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

---

## Complexity Tracking

*No complexity violations detected*

This feature:
- ✅ Uses existing admin2 modal pattern (no new UI framework)
- ✅ Extends existing revenue API (no architectural changes)
- ✅ Zero database changes (all data from existing users table)
- ✅ Follows Tickedify conventions (vanilla JS, server.js endpoints)
- ✅ Complies with beta freeze (staging-first workflow)

**Table**: Empty (no justifications needed)

---

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - approach described) ✅
- [ ] Phase 3: Tasks generated (/tasks command) ⏸️ NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented ✅ (none)

**Execution Flow Status**:
```
1. Load feature spec ✅
2. Fill Technical Context ✅
3. Fill Constitution Check ✅
4. Evaluate Constitution Check ✅ PASS
5. Execute Phase 0 → research.md ✅
6. Execute Phase 1 → contracts, data-model, quickstart, CLAUDE.md ✅
7. Re-evaluate Constitution Check ✅ PASS
8. Plan Phase 2 → Task generation approach described ✅
9. STOP - Ready for /tasks command ✅
```

---

## Summary

**Feature**: Revenue Dashboard Detail Views
**Scope**: Add interactive detail modals to 5 revenue stat cards in Admin2
**Approach**: Modal dialogs with user lists, API-driven, zero DB changes
**Effort**: ~6.5 hours estimated
**Risk Level**: LOW (extends existing patterns, no architectural changes)

**Key Decisions**:
- ✅ Modal dialog pattern (consistent with admin2 UX)
- ✅ 2 new API endpoints (active-subscriptions, free-tier)
- ✅ Client-side filtering for Premium/Enterprise (reuse active-subscriptions data)
- ✅ No pagination (scrollable list, current scale <100 users)
- ✅ Click-through to existing User Management detail panel

**Ready for**:
- ⏸️ `/tasks` command to generate tasks.md with 38 numbered tasks
- ⏸️ Implementation phase with TDD approach
- ⏸️ Staging deployment and testing on dev.tickedify.com

---

*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
