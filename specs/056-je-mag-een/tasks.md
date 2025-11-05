# Tasks: Settings Screen Infrastructure

**Feature**: 056-je-mag-een (Settings Screen)
**Input**: Design documents from `/specs/056-je-mag-een/`
**Prerequisites**: ✅ plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Summary

This task list implements Settings screen infrastructure with:
- Database migration for `user_settings` table
- RESTful API endpoints (GET/POST) with session authentication
- Frontend sidebar navigation with gear icon and extra spacing
- Empty Settings screen with Save button infrastructure
- Comprehensive testing via API-first approach

**Tech Stack**: Node.js + Express.js backend, Vanilla JavaScript frontend, PostgreSQL (Neon)
**Repository Structure**: Monorepo with server.js (backend) + public/ (frontend)

---

## Phase 3.1: Setup & Database

**CRITICAL**: Database migration MUST complete before all other tasks

- [x] **T001** Create database migration file `migrations/20251105_add_user_settings_table.sql`
  - SQL: CREATE TABLE user_settings with JSONB column
  - Columns: id, user_id (FK to gebruikers), settings (JSONB), created_at, updated_at
  - Constraints: UNIQUE(user_id), CASCADE delete
  - Index: idx_user_settings_user_id
  - See: `specs/056-je-mag-een/data-model.md` (Migration Script section)

- [ ] **T002** Run database migration on staging database (dev.tickedify.com)
  - Execute migration SQL via psql or database admin tool
  - Verify table exists: `\d user_settings`
  - Verify constraints: UNIQUE on user_id, FK to gebruikers
  - Run verification queries from quickstart.md test 1
  - **BLOCKS**: All tasks T003-T020 depend on this

---

## Phase 3.2: Backend API - Contract Tests First (TDD)

**IMPORTANT**: Write these tests BEFORE implementing API endpoints. Tests MUST FAIL initially.

- [x] **T003** [P] Create contract test script `test-api-get-settings.sh`
  - Test: GET /api/user-settings returns 200 with null for new user
  - Test: GET /api/user-settings returns 401 without authentication
  - Use curl with `-s -L -k` flags
  - Assert JSON response structure matches contract
  - See: `specs/056-je-mag-een/contracts/user-settings-api.yml` (GET endpoint)
  - See: `specs/056-je-mag-een/quickstart.md` (Tests 2, 7)

- [x] **T004** [P] Create contract test script `test-api-post-settings.sh`
  - Test: POST /api/user-settings creates new settings (returns 200 with settings object)
  - Test: POST /api/user-settings updates existing settings (same id, updated_at changes)
  - Test: POST /api/user-settings rejects invalid JSON (returns 400)
  - Use curl with `-s -L -k` flags
  - See: `specs/056-je-mag-een/contracts/user-settings-api.yml` (POST endpoint)
  - See: `specs/056-je-mag-een/quickstart.md` (Tests 3, 5, 8)

---

## Phase 3.3: Backend API - Implementation

**Prerequisites**: T002 complete (database exists), T003-T004 written and failing

- [x] **T005** Implement GET /api/user-settings endpoint in `server.js`
  - Add route: `app.get('/api/user-settings', requireLogin, async (req, res) => { ... })`
  - Query: `SELECT * FROM user_settings WHERE user_id = $1`
  - Response: `{ success: true, settings: result || null }`
  - Error handling: catch and return `{ success: false, error: message }`
  - Location: Add after existing API routes (~line 2000+)
  - See: `specs/056-je-mag-een/data-model.md` (Read Pattern section)
  - See: `specs/056-je-mag-een/contracts/user-settings-api.yml` (GET responses)

- [x] **T006** Implement POST /api/user-settings endpoint in `server.js`
  - Add route: `app.post('/api/user-settings', requireLogin, async (req, res) => { ... })`
  - Validate: req.body.settings exists and is valid JSON
  - Query: INSERT ... ON CONFLICT (user_id) DO UPDATE (upsert pattern)
  - Update: updated_at timestamp automatically
  - Response: RETURNING * to return full settings object
  - Error handling: validation errors (400), database errors (500)
  - Location: Add after T005 endpoint in server.js
  - See: `specs/056-je-mag-een/data-model.md` (Write Pattern section)
  - See: `specs/056-je-mag-een/contracts/user-settings-api.yml` (POST request/response)

- [ ] **T007** Verify contract tests now pass
  - Run test-api-get-settings.sh → all tests pass ✅
  - Run test-api-post-settings.sh → all tests pass ✅
  - Fix any failing tests (implementation bugs)
  - Commit: "feat: Settings API endpoints (GET/POST user settings)"

---

## Phase 3.4: Frontend - Sidebar Navigation

**Note**: Frontend tasks can run in parallel with backend (T005-T006) if desired

- [x] **T008** Add Settings navigation item HTML in `public/index.html`
  - Locate sidebar navigation section (search for "search-link" or similar)
  - Add after Search item: `<a href="#" id="settings-link" class="nav-item">`
  - Icon: Add gear icon (⚙️ emoji or SVG: `<svg>...</svg>`)
  - Text: "Settings"
  - CSS class: Add `nav-section-gap` for extra spacing (to be styled in T009)
  - Structure: Match existing nav items (Inbox, Trash, Daily Planning patterns)
  - See: `specs/056-je-mag-een/research.md` (Frontend Navigation Pattern)

- [x] **T009** Add Settings navigation CSS styling in `public/style.css`
  - Create `.nav-section-gap` class with `margin-top: 20px` (extra spacing)
  - Apply to #settings-link for Search → Settings gap
  - Match active state styling: `.nav-item.active` (existing pattern)
  - Icon styling: Size and alignment with gear icon
  - Responsive: Verify mobile/tablet breakpoints work
  - Visual: Match spec requirement (extra gap like Trash → Daily Planning)
  - See: `specs/056-je-mag-een/spec.md` (FR-003)

- [x] **T010** Add Settings click handler in `public/app.js`
  - Find navigation event listeners (search for "daily-planning-link" pattern)
  - Add: `document.getElementById('settings-link').addEventListener('click', showSettings)`
  - Function signature: `function showSettings() { ... }`
  - Implementation: Call `hideAllScreens()`, show settings screen, update active nav
  - Active state: `setActiveNavItem('settings')` (if function exists, else inline)
  - URL hash: Update to `#settings` (if hash routing exists)
  - See: `specs/056-je-mag-een/research.md` (Frontend Navigation Pattern)

---

## Phase 3.5: Frontend - Settings Screen

- [x] **T011** [P] Create Settings screen HTML structure in `public/app.html`
  - Add after existing screens (daily-planning-screen, inbox-screen, etc.)
  - Container: `<div id="settings-screen" class="main-content" style="display:none">`
  - Header: `<h1>⚙️ Settings</h1>` or with SVG icon
  - Content: `<div class="settings-content"><p>Settings will be available here</p></div>`
  - Footer: `<button id="save-settings-btn" class="btn-primary">Save</button>`
  - Structure: Match existing screen layouts (daily-planning-screen structure)
  - See: `specs/056-je-mag-een/spec.md` (FR-005, FR-006, FR-009)

- [x] **T012** [P] Add Settings screen CSS styling in `public/app.css`
  - Style `.settings-content` container (padding, max-width, etc.)
  - Style placeholder text (center, gray, large font)
  - Style #save-settings-btn button (match existing button styles)
  - Disabled state: `.btn-primary:disabled` (for future use)
  - Responsive: Mobile breakpoints for settings screen
  - Consistency: Match Daily Planning screen layout patterns
  - See: `specs/056-je-mag-een/research.md` (Settings Screen Layout)

- [x] **T013** Implement Settings screen logic in `public/app.js`
  - Global state: `let userSettings = { loaded: false, data: {}, dirty: false }`
  - Function `showSettings()`: Hide other screens, show settings-screen, load settings
  - Function `loadUserSettings()`: GET /api/user-settings, populate userSettings global
  - Function `saveUserSettings()`: POST /api/user-settings with userSettings.data
  - Toast notifications: Success ("Settings saved") / Error ("Failed to save")
  - Button handler: `#save-settings-btn` click → call saveUserSettings()
  - Load on init: Call loadUserSettings() when app initializes (if needed)
  - See: `specs/056-je-mag-een/data-model.md` (Runtime Data Model)
  - See: `specs/056-je-mag-een/research.md` (State Management)

---

## Phase 3.6: Integration Testing

**Prerequisites**: All implementation tasks (T005-T013) complete

- [ ] **T014** Run quickstart test suite (Tests 1-8: API validation)
  - Environment: dev.tickedify.com staging
  - Login: jan@buskens.be / qyqhut-muDvop-fadki9
  - Run: Tests 2-8 from quickstart.md (API tests via curl)
  - Expected: All API tests pass ✅
  - Document: Any failures in test results table
  - See: `specs/056-je-mag-een/quickstart.md` (Tests 2-8)

- [ ] **T015** Run quickstart test suite (Tests 9-12: UI validation)
  - Browser: Open dev.tickedify.com/app (logged in)
  - Test 9: Verify Settings in sidebar with correct spacing and icon
  - Test 10: Click Settings → navigates to Settings screen
  - Test 11: Verify Settings screen structure (header, placeholder, Save button)
  - Test 12: Verify active nav highlight on Settings item
  - Expected: All UI tests pass ✅
  - Document: Screenshot if any visual issues
  - See: `specs/056-je-mag-een/quickstart.md` (Tests 9-12)

- [ ] **T016** Run quickstart test suite (Tests 13-14: Performance & Regression)
  - Test 13: Verify API response time <200ms (curl with `time`)
  - Test 14: Verify existing features unaffected (Inbox, Daily Planning, Search, Trash)
  - Check: No console errors in browser DevTools
  - Check: No layout issues or broken navigation
  - Expected: Performance met, no regressions ✅
  - See: `specs/056-je-mag-een/quickstart.md` (Tests 13-14)

---

## Phase 3.7: Deployment & Documentation

- [x] **T017** Update package.json version
  - Increment patch version (e.g., 1.0.50 → 1.0.51)
  - Format: Semantic versioning (patch for feature infrastructure)
  - Commit: Include in same commit as T018 (changelog)

- [x] **T018** Update changelog in `public/changelog.html`
  - Add new version entry at top (v1.0.51 or next version)
  - Category: ⚡ Features
  - Description: "Added Settings screen infrastructure with database persistence and API endpoints"
  - Badge: `badge-latest` for newest version
  - Format: English, grouped per day, no security details
  - See: `CLAUDE.md` (Changelog Format Rules)

- [ ] **T019** Commit and push to feature branch
  - Commit message: "feat: Settings screen infrastructure - v1.0.51"
  - Body: "- Database: user_settings table with JSONB\n- API: GET/POST /api/user-settings\n- UI: Sidebar navigation + empty Settings screen\n- Tests: 14 quickstart scenarios validated"
  - Push: `git push origin 056-je-mag-een`
  - Verify: No uncommitted changes remain

- [ ] **T020** Merge to staging and deploy
  - Checkout staging: `git checkout staging`
  - Merge: `git merge 056-je-mag-een --no-edit`
  - Push: `git push origin staging`
  - Wait: 30-60 seconds for Vercel deployment
  - Verify: Check https://dev.tickedify.com/api/version (version matches)
  - See: `CLAUDE.md` (Default Deployment Target: Staging Branch)

---

## Dependencies

### Blocking Dependencies
- **T002** (database migration) BLOCKS all other tasks (T003-T020)
- **T003-T004** (contract tests) BLOCK T005-T006 (API implementation)
- **T005-T013** (all implementation) BLOCK T014-T016 (integration tests)
- **T014-T016** (testing) BLOCK T017-T020 (deployment)

### Parallel Opportunities
- **T003, T004** can run in parallel (different test scripts)
- **T005, T006** are sequential (same file: server.js)
- **T008, T009, T010** are sequential (interrelated: HTML → CSS → JS)
- **T011, T012** can run in parallel (different concerns: HTML vs CSS)
- **T014, T015, T016** are sequential (logical test progression)

### File Conflicts (No Parallel)
- **server.js**: T005, T006 (sequential)
- **app.html**: T008, T011 (sequential)
- **app.css**: T009, T012 (sequential)
- **app.js**: T010, T013 (sequential)

---

## Parallel Execution Examples

### Example 1: Contract Tests Together
```bash
# After T002 complete, run T003 and T004 in parallel:
# Terminal 1:
bash test-api-get-settings.sh

# Terminal 2:
bash test-api-post-settings.sh
```

### Example 2: HTML Structure Tasks (if truly independent)
```bash
# T011 and T012 CAN run parallel IF:
# - T011 only adds HTML structure
# - T012 only modifies CSS (different files)

# But T008 and T011 CANNOT run parallel (both modify app.html)
```

---

## Task Checklist Summary

**Phase 3.1: Setup** (2 tasks)
- T001: Migration file creation
- T002: Migration execution ⚠️ BLOCKS ALL

**Phase 3.2: Tests** (2 tasks, parallel possible)
- T003: [P] GET contract tests
- T004: [P] POST contract tests

**Phase 3.3: Backend** (3 tasks, sequential)
- T005: GET endpoint implementation
- T006: POST endpoint implementation
- T007: Verify tests pass

**Phase 3.4: Frontend Nav** (3 tasks, sequential)
- T008: Sidebar HTML
- T009: Sidebar CSS
- T010: Sidebar JavaScript

**Phase 3.5: Frontend Screen** (3 tasks, mixed)
- T011: [P with T012] Screen HTML
- T012: [P with T011] Screen CSS
- T013: Screen JavaScript (depends on T011)

**Phase 3.6: Testing** (3 tasks, sequential)
- T014: API tests
- T015: UI tests
- T016: Performance & regression

**Phase 3.7: Deploy** (4 tasks, sequential)
- T017: Version bump
- T018: Changelog update
- T019: Commit and push
- T020: Merge to staging

**TOTAL: 20 tasks**

---

## Validation Checklist

- [x] All contracts have corresponding tests (T003-T004 cover API contract)
- [x] All entities have model tasks (user_settings via migration T001-T002)
- [x] All tests come before implementation (T003-T004 before T005-T006)
- [x] Parallel tasks truly independent (T003||T004, T011||T012 verified)
- [x] Each task specifies exact file path (✅ all tasks have file paths)
- [x] No task modifies same file as another [P] task (✅ verified)

---

## Notes

**TDD Approach**: Contract tests (T003-T004) MUST fail before implementation (T005-T006). Verify tests actually fail with 404/500 errors before building endpoints.

**Constitutional Compliance**:
- ✅ Beta Freeze: Feature branch → staging only (T020)
- ✅ Test-First: API tests before implementation (T003-T004 before T005-T006)
- ✅ Staging-First: Deploy to dev.tickedify.com for testing (T020)
- ✅ Versioning: Version bump + changelog required (T017-T018)

**File Paths**: All paths are relative to repository root:
- Backend: `/server.js` (monorepo structure)
- Frontend: `/public/app.html`, `/public/app.css`, `/public/app.js`
- Database: `/migrations/20251105_add_user_settings_table.sql`
- Tests: Test scripts in repo root or specs directory

**Agent Recommendations**:
- Use `tickedify-feature-builder` for T001-T013 (implementation tasks)
- Use `tickedify-testing` for T014-T016 (testing tasks)
- Use `tickedify-bug-hunter` if any tests fail (debugging)

---

## Quick Start

To execute this task list:

1. **Database First**: Complete T001-T002 (database migration)
2. **Tests First**: Write T003-T004 (contract tests) - verify they FAIL
3. **Backend**: Implement T005-T006 (API endpoints) - verify tests PASS
4. **Frontend**: Build T008-T013 (UI components and navigation)
5. **Test**: Run T014-T016 (integration and regression tests)
6. **Deploy**: Execute T017-T020 (version, changelog, staging deployment)

**Estimated Time**: 4-6 hours for complete implementation and testing

---

## References

- Feature Spec: `specs/056-je-mag-een/spec.md`
- Implementation Plan: `specs/056-je-mag-een/plan.md`
- Research: `specs/056-je-mag-een/research.md`
- Data Model: `specs/056-je-mag-een/data-model.md`
- API Contract: `specs/056-je-mag-een/contracts/user-settings-api.yml`
- Test Guide: `specs/056-je-mag-een/quickstart.md`
