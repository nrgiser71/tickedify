# Tasks: Abonnement Selectie Scherm voor Bèta Overgang

**Input**: Design documents from `/specs/001-wanneer-de-b/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Node.js, Express.js, PostgreSQL, vanilla JS frontend
   → Structure: Web application (backend + frontend)
2. Load design documents:
   → data-model.md: SubscriptionPlan, User extensions
   → contracts/: 3 API endpoints (plans, select, status)
   → research.md: Database migration, UI patterns, integration approach
   → quickstart.md: Testing scenarios and validation steps
3. Generate tasks by category:
   → Setup: Database migration
   → Tests: Contract tests for 3 API endpoints
   → Core: API implementation, frontend UI
   → Integration: Beta transition hook, URL routing
   → Polish: Manual testing, validation
4. Applied task rules:
   → Contract tests [P] (different files)
   → API endpoints [P] (different endpoints)
   → Frontend files [P] (HTML, CSS, JS independent)
   → Database migration sequential (schema dependency)
5. Tasks numbered T001-T017
6. TDD order: Tests before implementation
7. SUCCESS: 17 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths relative to repository root

## Path Conventions
- **Web app structure**: Existing Express.js backend + vanilla frontend
- **Backend**: `server.js` (existing file, add endpoints)
- **Frontend**: `public/` directory (existing structure)
- **Database**: PostgreSQL via existing connection

## Phase 3.1: Setup
- [x] T001 Create database migration script for subscription columns in `database.js`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T002 [P] Contract test GET /api/subscription/plans in `specs/001-wanneer-de-b/contracts/test_plans_endpoint.js`
- [x] T003 [P] Contract test POST /api/subscription/select in `specs/001-wanneer-de-b/contracts/test_select_endpoint.js`
- [x] T004 [P] Contract test GET /api/subscription/status in `specs/001-wanneer-de-b/contracts/test_status_endpoint.js`
- [x] T005 [P] Integration test beta user subscription flow in `specs/001-wanneer-de-b/contracts/test_beta_flow.js`
- [x] T006 [P] Integration test new user subscription flow in `specs/001-wanneer-de-b/contracts/test_new_user_flow.js`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Backend API Implementation
- [ ] T007 [P] GET /api/subscription/plans endpoint in `server.js`
- [ ] T008 [P] POST /api/subscription/select endpoint in `server.js`
- [ ] T009 [P] GET /api/subscription/status endpoint in `server.js`
- [ ] T010 [P] Subscription plans data model in `public/js/subscription-data.js`

### Frontend Implementation
- [ ] T011 [P] Subscription selection HTML page in `public/subscription.html`
- [ ] T012 [P] Subscription selection JavaScript logic in `public/js/subscription.js`
- [ ] T013 [P] Subscription page CSS styling in `public/css/subscription.css`
- [ ] T014 [P] Form handling and API integration in `public/js/subscription-api.js`

## Phase 3.4: Integration
- [ ] T015 Update beta transition logic in `public/app.js` showUpgradeMessage() function
- [ ] T016 Add subscription page routing and URL parameter handling

## Phase 3.5: Polish
- [ ] T017 Execute manual testing scenarios from `specs/001-wanneer-de-b/quickstart.md`

## Dependencies
- T001 (migration) must complete before all other tasks
- Tests (T002-T006) before API implementation (T007-T009)
- API endpoints (T007-T009) before frontend API integration (T014)
- Frontend core files (T011-T013) can run parallel with API development
- Integration (T015-T016) requires both API and frontend completion
- Manual testing (T017) requires all implementation complete

## Parallel Example
```
# After T001 completes, launch contract tests together:
Task: "Contract test GET /api/subscription/plans in specs/001-wanneer-de-b/contracts/test_plans_endpoint.js"
Task: "Contract test POST /api/subscription/select in specs/001-wanneer-de-b/contracts/test_select_endpoint.js"
Task: "Contract test GET /api/subscription/status in specs/001-wanneer-de-b/contracts/test_status_endpoint.js"
Task: "Integration test beta user subscription flow in specs/001-wanneer-de-b/contracts/test_beta_flow.js"
Task: "Integration test new user subscription flow in specs/001-wanneer-de-b/contracts/test_new_user_flow.js"

# After tests fail, launch API implementations:
Task: "GET /api/subscription/plans endpoint in server.js"
Task: "POST /api/subscription/select endpoint in server.js"
Task: "GET /api/subscription/status endpoint in server.js"
Task: "Subscription plans data model in public/js/subscription-data.js"

# Parallel frontend development:
Task: "Subscription selection HTML page in public/subscription.html"
Task: "Subscription selection JavaScript logic in public/js/subscription.js"
Task: "Subscription page CSS styling in public/css/subscription.css"
```

## Detailed Task Specifications

### T001: Database Migration
**File**: `database.js`
**Description**: Add subscription selection columns to users table
**Requirements**:
- Add `selected_plan VARCHAR(20)` column
- Add `plan_selected_at TIMESTAMP` column
- Add `selection_source VARCHAR(20)` column
- Create index on `selected_plan` for performance
- Include migration check (IF NOT EXISTS)

### T002-T004: Contract Tests (API Endpoints)
**Files**: `specs/001-wanneer-de-b/contracts/test_*.js`
**Description**: Verify API contract compliance with OpenAPI spec
**Requirements**:
- Use existing contract test structure from `subscription-api.test.js`
- Tests must FAIL initially (no implementation)
- Validate request/response schemas
- Test error scenarios (400, 401, 500)
- Include authentication requirement checks

### T005-T006: Integration Tests (User Flows)
**Files**: `specs/001-wanneer-de-b/contracts/test_*_flow.js`
**Description**: End-to-end user scenario validation
**Requirements**:
- Beta user: expired beta → subscription screen → plan selection
- New user: registration flow → subscription screen → plan selection
- Verify data persistence across flow
- Test URL parameters and routing

### T007-T009: API Implementation
**File**: `server.js`
**Description**: Express.js endpoint implementation
**Requirements**:
- Follow existing server.js patterns for auth and error handling
- Use existing database connection pool
- Implement validation for plan_id and source parameters
- Return JSON responses matching OpenAPI spec
- Add proper error logging

### T010: Subscription Data Model
**File**: `public/js/subscription-data.js`
**Description**: Static subscription plans configuration
**Requirements**:
- Export SUBSCRIPTION_PLANS array with 3 plans
- Include all fields from data-model.md specification
- Add plan validation functions
- Make data accessible to frontend JavaScript

### T011-T014: Frontend Implementation
**Files**: `public/subscription.html`, `public/js/subscription.js`, etc.
**Description**: User interface for plan selection
**Requirements**:
- Responsive design matching existing app styling
- Three plan options with clear pricing display
- Visual selection feedback (highlight, checkmark)
- Form validation before API submission
- Error handling and loading states
- URL parameter support for entry source

### T015-T016: Integration
**Files**: `public/app.js`, routing logic
**Description**: Connect subscription feature to existing flows
**Requirements**:
- Modify `showUpgradeMessage()` to redirect to subscription page
- Add URL parameter handling for different entry sources
- Ensure seamless user experience from beta transition
- Maintain existing authentication flow

### T017: Manual Testing
**File**: `specs/001-wanneer-de-b/quickstart.md`
**Description**: Execute validation scenarios
**Requirements**:
- Follow all testing steps in quickstart.md
- Verify browser compatibility (Chrome, Safari, Firefox)
- Test responsive design on different screen sizes
- Validate API responses match expected schemas
- Confirm database updates are persisted

## Notes
- [P] tasks = different files, no dependencies between them
- All tests must fail before implementation begins (TDD requirement)
- Commit after each completed task for version control
- Database migration (T001) is prerequisite for all other work
- Frontend can be developed in parallel with backend APIs
- Integration tasks require both frontend and backend completion

## Task Generation Rules Applied

1. **From Contracts**: 3 contract files → 3 contract test tasks [P] + 3 implementation tasks [P]
2. **From Data Model**: SubscriptionPlan entity → data model task [P], User extensions → migration task
3. **From User Stories**: 2 user flows → 2 integration test tasks [P]
4. **From Quickstart**: Testing scenarios → manual validation task
5. **Ordering**: Migration → Tests → Implementation → Integration → Validation

## Validation Checklist
*GATE: Checked before task execution*

- [x] All 3 contracts have corresponding test tasks (T002-T004)
- [x] SubscriptionPlan entity has model task (T010)
- [x] User entity extensions have migration task (T001)
- [x] All tests (T002-T006) come before implementation (T007-T016)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] tasks modify the same file (verified)
- [x] Database migration precedes all dependent tasks
- [x] TDD ordering maintained (tests fail before implementation)