# Tasks: Page Help Icons with Admin-Configurable Content

**Input**: Design documents from `/specs/062-je-mag-voor/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/page-help-api.yml, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: JavaScript (ES6+), Node.js, Express, PostgreSQL, Marked.js
   → Project type: Web (frontend + backend)
2. Load design documents:
   → data-model.md: PageHelp entity (page_help table)
   → contracts/: page-help-api.yml (4 RESTful endpoints)
   → research.md: 11 eligible pages, localStorage caching strategy
   → quickstart.md: 10 test scenarios
3. Generate tasks by category:
   → Setup: Database migration, dependency checks
   → Tests: API contract tests, UI interaction tests
   → Core: Backend endpoints, frontend UI, admin interface
   → Integration: Markdown rendering, caching
   → Polish: Default content, documentation, deployment
4. Applied task rules:
   → Different files = [P] for parallel
   → Same file (server.js, app.js) = sequential
   → Tests before implementation (TDD)
5. Tasks numbered T001-T024
6. Dependencies documented below
7. Parallel execution examples provided
8. Validation: All contracts tested, all entities implemented
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths specified for each task

## Path Conventions
**Tickedify Structure** (Single Page App with separate backend):
- Backend: `server.js` (Express API endpoints)
- Frontend: `public/app.js`, `public/admin2.html`, `public/style.css`
- Database: PostgreSQL migrations
- Tests: Manual via Playwright + curl API testing

---

## Phase 3.1: Setup & Database

### T001 - Create page_help database table
**File**: Database migration (execute via psql or Neon dashboard)
**Description**: Create `page_help` table with schema from data-model.md
**SQL**:
```sql
CREATE TABLE page_help (
  page_id VARCHAR(50) PRIMARY KEY,
  content TEXT NOT NULL,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_by VARCHAR(50)
);

CREATE INDEX idx_page_help_modified ON page_help(modified_at DESC);
```
**Validation**: Query table structure, verify PRIMARY KEY and index exist
**Dependency**: None (can be first task)

### T002 [P] - Verify Marked.js library availability
**File**: Check `public/` for Marked.js CDN or npm package
**Description**: Verify markdown rendering library is available. If not, add Marked.js CDN script tag to necessary HTML files.
**Validation**: Test markdown rendering in browser console: `marked("# Test")`
**Dependency**: None (parallel with T001)

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T003 [P] - Contract test GET /api/page-help/:pageId
**File**: Create test script `tests/api-contracts/test-get-page-help.sh`
**Description**: Write curl-based contract test for GET endpoint
**Test cases**:
- Valid page_id (e.g., 'inbox') returns 200 with content
- Invalid page_id returns 404
- Response includes pageId, content, isDefault, modifiedAt, modifiedBy
- Unauthenticated request returns 401
**Expected**: All tests FAIL (endpoints not implemented yet)
**Dependency**: None (parallel test writing)

### T004 [P] - Contract test PUT /api/page-help/:pageId
**File**: Create test script `tests/api-contracts/test-put-page-help.sh`
**Description**: Write curl-based contract test for PUT endpoint (admin only)
**Test cases**:
- Valid update with admin auth returns 200
- Empty content returns 400
- Invalid page_id returns 404
- Non-admin user returns 403
**Expected**: All tests FAIL (endpoints not implemented yet)
**Dependency**: None (parallel test writing)

### T005 [P] - Contract test DELETE /api/page-help/:pageId
**File**: Create test script `tests/api-contracts/test-delete-page-help.sh`
**Description**: Write curl-based contract test for DELETE endpoint (admin only)
**Test cases**:
- Valid delete with admin auth returns 200
- Non-existent page_id returns 404
- Non-admin user returns 403
**Expected**: All tests FAIL (endpoints not implemented yet)
**Dependency**: None (parallel test writing)

### T006 [P] - Contract test GET /api/page-help (list all)
**File**: Create test script `tests/api-contracts/test-list-page-help.sh`
**Description**: Write curl-based contract test for list endpoint (admin only)
**Test cases**:
- Admin auth returns 200 with array of pages
- Response includes all 11 eligible pages
- Shows custom vs. default indicator
- Non-admin user returns 403
**Expected**: All tests FAIL (endpoints not implemented yet)
**Dependency**: None (parallel test writing)

---

## Phase 3.3: Core Implementation (Backend)

**ONLY proceed after T003-T006 are failing**

### T007 - Create DEFAULT_PAGE_HELP content object
**File**: `server.js` or new file `public/js/default-help-content.js`
**Description**: Write default English help content for all 11 eligible pages
**Content**: Based on research.md page list and Baas Over Je Tijd methodology
**Pages**: inbox, acties, opvolgen, dagelijkse-planning, uitgesteld-wekelijks, uitgesteld-maandelijks, uitgesteld-3maandelijks, uitgesteld-6maandelijks, uitgesteld-jaarlijks, afgewerkt, email-import
**Format**: Markdown with headings, lists, bold/italic, links (no images)
**Validation**: Each page has 200-500 words of helpful, clear English content
**Dependency**: None

### T008 - Implement GET /api/page-help/:pageId endpoint
**File**: `server.js` (add new endpoint)
**Description**: Create endpoint to fetch help content for specific page
**Logic**:
1. Validate page_id against whitelist (11 eligible pages)
2. Query database: `SELECT * FROM page_help WHERE page_id = $1`
3. If row exists → return database content with isDefault=false
4. If no row → return DEFAULT_PAGE_HELP[pageId] with isDefault=true
5. Return 404 if invalid page_id
**Response format**: Per contracts/page-help-api.yml
**Authentication**: Required (session cookie)
**Dependency**: T001 (database), T007 (default content)

### T009 - Implement PUT /api/page-help/:pageId endpoint
**File**: `server.js` (add new endpoint)
**Description**: Create endpoint to update/create help content (admin only)
**Logic**:
1. Validate admin authentication (existing middleware)
2. Validate page_id against whitelist
3. Validate content is not empty
4. UPSERT: `INSERT ... ON CONFLICT (page_id) DO UPDATE`
5. Set modified_at to CURRENT_TIMESTAMP
6. Set modified_by to admin user identifier
**Response format**: Per contracts/page-help-api.yml
**Authentication**: Admin only (existing admin middleware)
**Dependency**: T001 (database), T008 (validates patterns work)

### T010 - Implement DELETE /api/page-help/:pageId endpoint
**File**: `server.js` (add new endpoint)
**Description**: Create endpoint to delete custom content (admin only)
**Logic**:
1. Validate admin authentication
2. Validate page_id against whitelist
3. DELETE FROM page_help WHERE page_id = $1
4. Return success even if no rows deleted (idempotent)
**Response format**: Per contracts/page-help-api.yml
**Authentication**: Admin only
**Dependency**: T001 (database), T009 (validates admin auth works)

### T011 - Implement GET /api/page-help (list all) endpoint
**File**: `server.js` (add new endpoint)
**Description**: Create endpoint to list all page help content (admin only)
**Logic**:
1. Validate admin authentication
2. Query all custom content from database
3. Merge with DEFAULT_PAGE_HELP to show all 11 pages
4. Return array with hasCustomContent indicator
**Response format**: Per contracts/page-help-api.yml
**Authentication**: Admin only
**Dependency**: T001 (database), T007 (default content)

---

## Phase 3.4: Core Implementation (Frontend - Main App)

### T012 - Create page help icon component
**File**: `public/app.js` (add helper function)
**Description**: Create reusable function to add help icon next to page titles
**Function**: `addPageHelpIcon(pageId, titleElement)`
**Logic**:
1. Create help icon element (❓ emoji or SVG)
2. Add CSS class for styling (hover effects)
3. Attach click event listener → show help popup
4. Append icon next to title element
**Styling**: Icon should be 16-18px, muted color, hover to blue
**Dependency**: None (frontend work)

### T013 - Create help popup modal component
**File**: `public/app.js` (add modal functions)
**Description**: Create modal to display markdown help content
**Functions**: `showHelpPopup(content)`, `closeHelpPopup()`
**UI**: Reuse existing information message modal styling (per research.md)
**Features**:
- Blur backdrop overlay
- White content box with border-radius
- Close button (X) in top-right
- Scrollable content area (max-height with overflow-y)
- Markdown rendering via Marked.js
**Dependency**: T002 (Marked.js available)

### T014 - Implement help content fetching with caching
**File**: `public/app.js` (add API client functions)
**Description**: Fetch help content from API with localStorage caching
**Function**: `async getPageHelp(pageId)`
**Logic**:
1. Check localStorage cache for `help-content-${pageId}`
2. If cached AND < 24 hours old → return cached content
3. Else: fetch from `/api/page-help/${pageId}`
4. Cache response in localStorage with timestamp
5. Return content
**Cache TTL**: 24 hours (per research.md)
**Dependency**: T008 (backend endpoint)

### T015 - Integrate help icons on all eligible pages
**File**: `public/app.js` (modify page rendering functions)
**Description**: Add help icons to all 11 eligible page titles
**Pages to modify**:
- Inbox page title
- Acties page title
- Opvolgen page title
- Dagelijkse Planning page title
- Uitgesteld pages (5 variations) titles
- Afgewerkt page title
- Email Import page title
**Excludes**: CSV Import, Settings (per requirements)
**Logic**: Call `addPageHelpIcon(pageId, titleElement)` for each page
**Dependency**: T012 (icon component), T013 (popup modal), T014 (fetching)

---

## Phase 3.5: Core Implementation (Frontend - Admin2)

### T016 - Add "Page Help" menu item to admin2 sidebar
**File**: `public/admin2.html` (modify sidebar navigation)
**Description**: Add new menu item for Page Help configuration
**Location**: After "Berichten" menu item (around line 995)
**HTML**:
```html
<li class="admin-nav-item">
    <a href="#page-help" class="admin-nav-link" data-screen="page-help">
        <span class="admin-nav-icon">❓</span>
        <span>Page Help</span>
    </a>
</li>
```
**Dependency**: None (HTML change only)

### T017 - Create page help admin screen HTML
**File**: `public/admin2.html` (add new section)
**Description**: Create admin screen for managing page help content
**Location**: After messages screen (around line 1617)
**Structure**:
- Screen container with `id="screen-page-help"`
- Header with title "Page Help Configuration"
- Page selector dropdown (11 eligible pages)
- Content editor (textarea with markdown support)
- Preview area (rendered markdown)
- Save button, Revert to Default button, Delete button
- Status indicators (custom vs. default content)
**Styling**: Reuse existing admin2 screen patterns
**Dependency**: T016 (menu navigation)

### T018 - Implement page help admin JavaScript
**File**: `public/admin2.html` (add <script> section or separate JS file)
**Description**: Add JavaScript for admin interface functionality
**Functions**:
- `loadPageHelpList()` - Fetch all pages via GET /api/page-help
- `loadPageHelpContent(pageId)` - Load content for selected page
- `savePageHelpContent()` - PUT /api/page-help/:pageId
- `revertToDefault(pageId)` - DELETE /api/page-help/:pageId
- `previewMarkdown(content)` - Render markdown in preview pane
**UI Updates**:
- Populate page selector with 11 pages
- Show loading states
- Toast notifications on save/delete
- Enable/disable buttons based on state
**Dependency**: T011 (list endpoint), T009 (PUT), T010 (DELETE), T017 (HTML structure)

---

## Phase 3.6: Integration & Polish

### T019 [P] - Add help icon CSS styling
**File**: `public/style.css` (add new styles)
**Description**: Style help icons and popup modal
**CSS Classes**:
- `.page-help-icon` - Icon styling (size, color, hover effects)
- `.page-help-popup` - Modal overlay and content box
- `.page-help-content` - Markdown content styling
- `.page-help-close` - Close button styling
**Responsive**: Ensure popup works on mobile (max-width adjustments)
**Dependency**: None (parallel with other tasks)

### T020 [P] - Write comprehensive default help content
**File**: Expand T007 content
**Description**: Review and enhance all 11 default help content entries
**Quality criteria**:
- Clear English language (per UI policy)
- Explains page purpose and Baas Over Je Tijd methodology
- Includes practical usage tips
- 200-500 words per page
- Proper markdown formatting (headings, lists, bold)
**Validation**: Review by product owner or native English speaker
**Dependency**: T007 (initial content exists)

### T021 - Implement cache invalidation on content update
**File**: `public/app.js` (modify T014 caching logic)
**Description**: Invalidate localStorage cache when content is updated
**Strategy**:
- Compare `modifiedAt` timestamp from API with cached timestamp
- If API timestamp newer → invalidate cache and fetch fresh content
- Admin save triggers immediate cache clear for that pageId
**Logic**: Add `invalidateHelpCache(pageId)` function
**Dependency**: T014 (caching implemented), T018 (admin save triggers)

### T022 - Update ARCHITECTURE.md with feature locations
**File**: `ARCHITECTURE.md`
**Description**: Document page help feature code locations
**Sections to add**:
- Database schema: page_help table
- API endpoints: /api/page-help/* (server.js line numbers)
- Frontend components: help icon, popup modal (app.js line numbers)
- Admin interface: Page Help screen (admin2.html line numbers)
- CSS styling: help icon classes (style.css line numbers)
**Dependency**: T008-T021 (all implementation complete)

### T023 - Update package.json version and changelog
**File**: `package.json`, `public/changelog.html`
**Description**: Bump version and document feature in changelog
**Version bump**: Increment patch version (e.g., 0.21.127 → 0.21.128)
**Changelog entry**:
```
## v0.21.128 - 2025-11-09

### ✨ Features
- **Page Help Icons**: Added help icons to all main pages with admin-configurable content
  - Help icons appear next to page titles (excluding CSV Import and Settings)
  - Click icon to view helpful information about each page
  - Admin can customize help content via Admin Dashboard → Page Help
  - Default English content provided for all pages
```
**Dependency**: All implementation complete

### T024 - Manual testing via quickstart.md scenarios
**File**: Execute all test scenarios from `quickstart.md`
**Description**: Run all 10 test scenarios to validate feature
**Scenarios**:
1. View default help content on all pages
2. Admin configuration workflow
3. View custom help content
4. Revert to default
5. Long content scrolling
6. Empty content handling
7. Invalid page ID handling
8. Multiple page configuration
9. Concurrent editing (edge case)
10. Cache invalidation
**Validation**: All scenarios pass, no errors in console
**Dependency**: All tasks T001-T023 complete

---

## Dependencies

### Sequential Dependencies:
```
T001 (database) → T008, T009, T010, T011 (backend endpoints)
T007 (default content) → T008, T011 (endpoints need defaults)
T008 (GET endpoint) → T009, T014 (PUT/frontend depend on GET working)
T002 (Marked.js) → T013 (popup needs markdown rendering)
T012, T013, T014 (components) → T015 (integration)
T011 (list endpoint) → T018 (admin JS needs API)
T017 (HTML) → T018 (JS needs DOM structure)
T016, T017, T018 (admin UI) → T024 (testing)
T001-T018 (all impl) → T022 (ARCHITECTURE.md)
T001-T023 (everything) → T024 (final testing)
```

### Parallel Opportunities:
```
Phase 3.1: T001 ∥ T002 (database ∥ dependency check)
Phase 3.2: T003 ∥ T004 ∥ T005 ∥ T006 (all contract tests)
Phase 3.3: T007 can start early (independent content writing)
Phase 3.4: T012 ∥ T013 can start before backend (UI prototyping)
Phase 3.6: T019 ∥ T020 (CSS ∥ content writing)
```

---

## Parallel Execution Examples

### Example 1: Contract Tests (T003-T006)
```bash
# All tests can run in parallel (different files):
Task(description="Contract test GET endpoint",
     prompt="Write curl-based test for GET /api/page-help/:pageId per contracts/page-help-api.yml")

Task(description="Contract test PUT endpoint",
     prompt="Write curl-based test for PUT /api/page-help/:pageId per contracts/page-help-api.yml")

Task(description="Contract test DELETE endpoint",
     prompt="Write curl-based test for DELETE /api/page-help/:pageId per contracts/page-help-api.yml")

Task(description="Contract test LIST endpoint",
     prompt="Write curl-based test for GET /api/page-help per contracts/page-help-api.yml")
```

### Example 2: Frontend Components (T012 ∥ T013)
```bash
# Can prototype UI components in parallel:
Task(description="Create help icon component",
     prompt="Build reusable help icon function in app.js")

Task(description="Create help popup modal",
     prompt="Build markdown popup modal reusing information message styling")
```

### Example 3: Polish Tasks (T019 ∥ T020)
```bash
# Independent polish work:
Task(description="Add CSS styling",
     prompt="Style help icons and popup modal in style.css")

Task(description="Enhance default content",
     prompt="Review and improve all 11 English help content entries")
```

---

## Notes

- **[P] tasks** = Different files, no dependencies, safe to parallelize
- **Sequential tasks** = Same file (server.js, app.js) or logical dependencies
- **TDD approach**: Tests T003-T006 MUST fail before implementing T008-T011
- **Commit strategy**: Commit after each task completion
- **Testing**: API tests via curl, UI tests via Playwright or manual, admin tests manual
- **Deployment**: Staging-first via dev.tickedify.com before production

---

## Task Generation Rules Applied

1. ✅ **From Contracts**: page-help-api.yml → T003-T006 (4 contract tests)
2. ✅ **From Data Model**: page_help entity → T001 (database), T007 (default content)
3. ✅ **From User Stories**: quickstart.md → T024 (10 test scenarios)
4. ✅ **Ordering**: Setup → Tests → Backend → Frontend → Admin → Polish
5. ✅ **Parallel marking**: Different files get [P], same file sequential

---

## Validation Checklist

- [x] All contracts have corresponding tests (T003-T006 cover all 4 endpoints)
- [x] Entity (page_help) has implementation tasks (T001, T007-T011)
- [x] All tests come before implementation (T003-T006 before T008-T011)
- [x] Parallel tasks are truly independent (verified file conflicts)
- [x] Each task specifies exact file path (server.js, app.js, admin2.html, etc.)
- [x] No [P] task modifies same file as another [P] task (verified)

---

## Success Criteria

Feature complete when:
- ✅ All 24 tasks completed
- ✅ All contract tests pass (T003-T006)
- ✅ All quickstart scenarios pass (T024)
- ✅ Help icons visible on 11 eligible pages
- ✅ Admin interface fully functional
- ✅ Database migration applied
- ✅ Version bumped and changelog updated
- ✅ No console errors, no API errors
- ✅ Staging deployment successful
- ✅ ARCHITECTURE.md updated

**Ready for staging testing and user acceptance!**
