# Tasks: Taak Afwerken vanuit Planning Popup

**Input**: Design documents from `/specs/002-wanneer-je-in/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: Node.js, Express.js, PostgreSQL, vanilla JavaScript
   → Structure: Web app (frontend public/ + backend server.js)
2. Load design documents ✓
   → data-model.md: Task entity (existing), Planning Popup Form (UI model)
   → contracts/: task-completion-api.md → PUT /api/taak/:id endpoint
   → research.md: Extend TestRunner system, leverage existing patterns
   → quickstart.md: 5 test scenarios + API testing
3. Generate tasks by category ✓
   → Setup: Test infrastructure extension
   → Tests: Contract tests, integration tests, UI behavior tests
   → Core: Backend API handling, frontend UI implementation
   → Integration: Form state management, validation bypass
   → Polish: Performance testing, documentation updates
4. Apply task rules ✓
   → Tests before implementation (TDD)
   → Frontend/backend can be parallel when different files
   → Form integration requires sequential execution
5. Tasks numbered T001-T018
6. Dependencies mapped
7. Parallel execution examples provided
8. Validation complete ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Backend**: `server.js`, `database.js`, `test-runner.js`
- **Frontend**: `public/app.js`, `public/index.html`, `public/style.css`
- **Tests**: Extend existing test dashboard and TestRunner system

## Phase 3.1: Setup & Test Infrastructure
- [x] T001 Extend TestRunner system in `test-runner.js` with UI interaction test categories
- [x] T002 Add checkbox completion test category to test dashboard in `public/test-dashboard.html`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Parallel - Different Test Categories)
- [x] T003 [P] API contract test for PUT /api/taak/:id completion in `test-runner.js` (TaskCompletionAPI category)
- [x] T004 [P] API contract test for recurring task creation in `test-runner.js` (RecurringTaskAPI category)
- [x] T005 [P] Error handling contract tests (404, 400, 500) in `test-runner.js` (ErrorHandlingAPI category)

### Integration Tests (Parallel - Different Scenarios)
- [x] T006 [P] Integration test: Normal planning baseline workflow in `test-runner.js` (UIIntegration category)
- [x] T007 [P] Integration test: Direct task completion workflow in `test-runner.js` (UIIntegration category)
- [x] T008 [P] Integration test: Checkbox toggle behavior in `test-runner.js` (UIIntegration category)
- [x] T009 [P] Integration test: Recurring task completion workflow in `test-runner.js` (UIIntegration category)

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Backend API Implementation
- [x] T010 Enhance PUT /api/taak/:id endpoint in `server.js` to handle checkbox completion mode
- [x] T011 Add completion validation logic in `server.js` (bypass planning validation for checkbox mode)
- [x] T012 Integrate recurring task creation for checkbox completions in `server.js`

### Frontend UI Implementation (Parallel - Different UI Files)
- [ ] T013 [P] Add checkbox HTML element to planning popup in `public/index.html`
- [ ] T014 [P] Add checkbox styling and button state styles in `public/style.css`

### Frontend JavaScript Implementation (Sequential - Same File)
- [ ] T015 Implement checkbox event handler and form state management in `public/app.js`
- [ ] T016 Add form submission logic for completion mode in `public/app.js`
- [ ] T017 Add validation bypass logic in `public/app.js`

## Phase 3.4: Integration & Polish
- [ ] T018 [P] Add performance testing for API response times (<300ms) in `test-runner.js`

## Dependencies
- **Setup** (T001-T002) before all tests
- **All Tests** (T003-T009) before any implementation (T010-T017)
- **T010-T012** (backend) can run parallel to **T013-T014** (UI files)
- **T015-T017** must run sequentially (same file: `public/app.js`)
- **T018** (performance) after core implementation complete

## Parallel Execution Examples

### Phase 3.2 Contract Tests (Launch Together)
```bash
# Launch T003-T005 together:
Task(description="API contract test PUT /api/taak/:id completion",
     prompt="Add TaskCompletionAPI test category to test-runner.js...")

Task(description="API contract test recurring task creation",
     prompt="Add RecurringTaskAPI test category to test-runner.js...")

Task(description="Error handling contract tests (404, 400, 500)",
     prompt="Add ErrorHandlingAPI test category to test-runner.js...")
```

### Phase 3.2 Integration Tests (Launch Together)
```bash
# Launch T006-T009 together:
Task(description="Integration test: Normal planning baseline workflow",
     prompt="Add UIIntegration test for normal planning workflow...")

Task(description="Integration test: Direct task completion workflow",
     prompt="Add UIIntegration test for checkbox completion...")

Task(description="Integration test: Checkbox toggle behavior",
     prompt="Add UIIntegration test for checkbox state changes...")

Task(description="Integration test: Recurring task completion workflow",
     prompt="Add UIIntegration test for recurring tasks via checkbox...")
```

### Phase 3.3 Backend + Frontend UI (Launch Together)
```bash
# Launch T010-T012 with T013-T014:
Task(description="Enhance PUT /api/taak/:id endpoint for checkbox completion",
     prompt="Modify server.js to handle completedViaCheckbox parameter...")

Task(description="Add checkbox HTML to planning popup",
     prompt="Modify public/index.html to add checkbox element...")

Task(description="Add checkbox styling and button states",
     prompt="Modify public/style.css to style checkbox and button states...")
```

## Task Details

### T001: Extend TestRunner System
**File**: `test-runner.js`
**Description**: Add new test categories for UI interaction testing
**Acceptance**: Test dashboard shows new categories for TaskCompletionAPI, RecurringTaskAPI, ErrorHandlingAPI, UIIntegration

### T003: API Contract Test - Task Completion
**File**: `test-runner.js`
**Description**: Test PUT /api/taak/:id with completion parameters
**Must Fail**: Test should fail because endpoint doesn't handle completedViaCheckbox parameter yet
**Acceptance**: Test creates inbox task, attempts completion, verifies response structure

### T010: Enhance API Endpoint
**File**: `server.js`
**Description**: Modify existing PUT /api/taak/:id to handle checkbox completion mode
**Acceptance**: API accepts completedViaCheckbox parameter, bypasses planning validation, sets completion timestamp

### T015: Checkbox Event Handler
**File**: `public/app.js`
**Description**: Implement checkbox change event to toggle form state
**Acceptance**: Checkbox changes button text, enables/disables validation, maintains form state

## Notes
- **[P] tasks** = different files, no dependencies
- **Verify all tests fail** before implementing (T003-T009)
- **Commit after each task** for granular rollback capability
- **Leverage existing patterns** from current Tickedify codebase
- **Maintain backward compatibility** - existing planning workflow unchanged

## Validation Checklist
*GATE: Checked before task execution*

- [x] All contracts have corresponding tests (T003-T005 cover task-completion-api.md)
- [x] All entities have model tasks (Task entity uses existing schema - no new model needed)
- [x] All tests come before implementation (T003-T009 before T010-T017)
- [x] Parallel tasks truly independent ([P] tasks use different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (T015-T017 are sequential for app.js)