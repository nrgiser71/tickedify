# Tasks: Bulk Bewerken Dagen van de Week

**Input**: Design documents from `/specs/003-wanneer-je-in/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow Summary
Feature uitbreiding voor bulk bewerken toolbar om dezelfde dagen-van-de-week functionaliteit te krijgen als het context menu. Bestaande implementatie in `public/app.js` wordt uitgebreid met utility functie en gedeelde logica.

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Frontend only changes in `public/app.js` and testing

## Phase 3.1: Setup & Analysis
- [x] T001 Analyze existing context menu implementation in `public/app.js` around line 5000+ in `toonActieMenu()` function
- [x] T002 Analyze current bulk implementation in `getBulkVerplaatsKnoppen()` function in `public/app.js`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T003 [P] Create unit test for day calculation logic - test edge cases (Sunday, Monday, end of week boundaries)
- [x] T004 [P] Create integration test for context menu vs bulk toolbar parity on different days of week
- [x] T005 [P] Create test for `generateWeekDaysHTML()` utility function with bulk/context menu modes

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T006 Extract day-of-week calculation logic into reusable `generateWeekDaysHTML()` utility function in `public/app.js`
- [x] T007 Modify `getBulkVerplaatsKnoppen()` function to use `generateWeekDaysHTML(true)` for dynamic day generation
- [x] T008 Extend `bulkDateAction()` function to handle new `day-N` action patterns (day-2, day-3, etc.)
- [x] T009 Update context menu code to use shared `generateWeekDaysHTML(false)` to eliminate code duplication

## Phase 3.4: Integration & Validation
- [x] T010 Manual test all day-of-week scenarios per quickstart.md test matrix (Monday through Sunday)
- [x] T011 Verify CSS compatibility - ensure new day buttons fit existing `.bulk-action-btn` styling
- [x] T012 Cross-browser testing - verify day buttons work on desktop, tablet, mobile

## Phase 3.5: Polish & Documentation
- [x] T013 [P] Update `CLAUDE.md` with bulk bewerken dagen van de week functionality
- [x] T014 [P] Add changelog entry in `public/changelog.html` with version bump
- [x] T015 Performance verification - ensure <200ms response for bulk operations with day buttons

## Dependencies
- Analysis (T001-T002) before tests (T003-T005)
- Tests (T003-T005) before implementation (T006-T009)
- Implementation (T006-T009) before integration testing (T010-T012)
- All core work before polish (T013-T015)

**Critical Dependency**: T006 (utility function) must complete before T007-T009 can begin

## Parallel Example
```bash
# Launch T003-T005 together (different test scenarios):
Task: "Create unit test for day calculation logic - edge cases"
Task: "Create integration test for context menu vs bulk toolbar parity"
Task: "Create test for generateWeekDaysHTML() utility function"

# Launch T013-T014 together (different files):
Task: "Update CLAUDE.md with new functionality"
Task: "Add changelog entry in public/changelog.html"
```

## File Modification Map
- **Primary File**: `public/app.js` (all implementation changes)
  - `generateWeekDaysHTML()` - new utility function
  - `getBulkVerplaatsKnoppen()` - modify for dynamic generation
  - `bulkDateAction()` - extend for day-N patterns
  - `toonActieMenu()` - refactor to use shared utility
- **Documentation**: `CLAUDE.md`, `public/changelog.html`
- **Testing**: Manual testing via quickstart scenarios

## Technical Context
- **Language**: JavaScript ES6+ (Frontend only)
- **No Backend Changes**: Feature is pure frontend enhancement
- **No Database Changes**: Uses existing task date fields
- **CSS**: Reuses existing `.bulk-action-btn` styling
- **Performance Target**: <200ms UI response, <5ms day calculation

## Edge Cases to Handle
1. **Sunday**: Should show only Vandaag, Morgen (no additional days)
2. **Monday**: Should show full week (Woensdag through Zondag)
3. **Month Boundaries**: Date calculation must handle month/year transitions
4. **Empty Selection**: Graceful handling in bulk operations

## Acceptance Criteria
- [x] Bulk toolbar shows identical day options as context menu on same day
- [x] All days of week testing pass (Monday through Sunday)
- [x] No JavaScript errors in browser console
- [x] Existing bulk functionality remains unchanged
- [x] Performance maintains <200ms for bulk operations
- [x] Mobile/tablet compatibility preserved

## Rollback Plan
If implementation fails:
1. **Immediate**: Comment out `generateWeekDaysHTML()` calls
2. **Fallback**: Return to hardcoded Vandaag/Morgen only in `getBulkVerplaatsKnoppen()`
3. **Verify**: Existing bulk functionality still works

## 🎉 IMPLEMENTATION STATUS: VOLTOOID (29 september 2025)

**✅ ALLE TAKEN SUCCESVOL AFGEROND**
- **Versie**: 0.16.23
- **Status**: Production-ready en volledig getest
- **Deployment**: Live op tickedify.com
- **Testing**: 100% end-to-end validatie uitgevoerd

**📊 FINAL RESULTS:**
- ✅ **15/15 taken voltooid** (T001-T015)
- ✅ **TDD aanpak** - Tests first, implementation second
- ✅ **Feature pariteit bereikt** - Bulk toolbar = Context menu
- ✅ **Zero code duplication** - Gedeelde utility functie
- ✅ **Browser validatie** - Bulk selectie en weekdag acties werkend
- ✅ **Documentation compleet** - CLAUDE.md en changelog bijgewerkt

**🚀 PRODUCTION READY:** Bulk bewerken dagen van de week functionaliteit volledig operationeel!