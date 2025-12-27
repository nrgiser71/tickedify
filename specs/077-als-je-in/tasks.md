# Tasks: Search Loading Indicator

**Input**: Design documents from `/specs/077-als-je-in/`
**Prerequisites**: plan.md (required), research.md, quickstart.md

## Feature Summary
Add a loading indicator to the search screen that appears immediately when clicking the search button in the sidebar, providing clear visual feedback that the system is preparing the search interface.

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All tasks modify a single file (app.js), so most are sequential

## Phase 3.1: Implementation

- [ ] T001 Add initial loading state to `showZoekInterface()` in `public/app.js`
  - Location: Lines 9413-9464
  - Action: Modify the search interface HTML to show the results container immediately with an inline loading indicator ("Preparing search..." with spinner)
  - Show `#zoek-resultaten` with `display: block` initially
  - Add loading content: `<div class="loading-inline"><div class="loading-spinner-small"></div><span>Preparing search...</span></div>`
  - After `bindZoekEvents()` completes (~line 9467), hide the loading state or replace with ready state

- [ ] T002 Verify CSS classes exist in `public/style.css`
  - Location: Check lines ~5090-5105
  - Action: Confirm `.loading-inline` and `.loading-spinner-small` classes exist and work for this use case
  - If needed, add minor styling adjustments for search-specific loading

## Phase 3.2: Version & Changelog

- [ ] T003 Bump version in `package.json`
  - Action: Increment patch version (e.g., 1.0.203 → 1.0.204)
  - Must be done before commit

- [ ] T004 Update changelog in `public/changelog.html`
  - Action: Add entry for "Search Loading Indicator" feature
  - Category: 🔧 Fix or 🎯 Improvement
  - Description: "Added loading indicator when opening search screen for better user feedback"

## Phase 3.3: Deploy & Test

- [ ] T005 Commit and push to staging branch
  - Action: Merge feature branch to staging, push to origin
  - Wait for Vercel deployment (check dev.tickedify.com/api/version)

- [ ] T006 Test on staging using tickedify-testing agent
  - Environment: dev.tickedify.com
  - Execute all 5 scenarios from quickstart.md:
    1. Direct search icon click → expect loading indicator
    2. Sidebar search with pre-filled term → loading transitions to results
    3. Manual search execution → loading during search
    4. Empty search submission → no loading (rejected immediately)
    5. Filter toggle during search → loading shows while filtering
  - Validate checklist items from quickstart.md

## Dependencies
- T001 before T002 (need to verify changes work)
- T001-T002 before T003-T004 (implementation before versioning)
- T003-T004 before T005 (version bump before commit)
- T005 before T006 (deploy before test)

## No Parallel Tasks
All tasks modify the same codebase in sequence. The feature is simple enough that parallelization provides no benefit.

## Validation Checklist
*GATE: Checked before marking feature complete*

- [ ] Loading indicator appears immediately when search screen opens
- [ ] Loading indicator uses existing `.loading-inline` CSS pattern
- [ ] Loading text is user-friendly ("Preparing search...")
- [ ] Loading clears when interface is ready
- [ ] Existing search loading ("Searching...") still works during actual search
- [ ] No visual flickering or jarring transitions
- [ ] Version bumped in package.json
- [ ] Changelog updated
- [ ] All 5 quickstart scenarios pass on staging

## Notes
- This is a UI-only change, no API or database modifications
- Uses existing LoadingManager patterns for consistency
- Single file change (app.js) with possible minor CSS adjustment
- Commit after completing T001-T004 together
