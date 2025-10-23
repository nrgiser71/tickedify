# Tasks: Admin2 Delete User Account Bug Fix

**Input**: Design documents from `/specs/021-in-admin2-in/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Node.js/Express, PostgreSQL
   → Structure: Web app (public/ frontend, server.js backend)
   → Fix location: server.js:10112
2. Load optional design documents ✅
   → research.md: Root cause analysis complete
   → data-model.md: No schema changes (validation fix only)
   → contracts/delete-user.yml: API contract defined
   → quickstart.md: Test scenarios ready
3. Generate tasks by category ✅
   → Setup: None required (existing project)
   → Tests: API testing via quickstart scenarios
   → Core: Single validation fix in server.js
   → Integration: Verify consistency across endpoints
   → Polish: Deployment and regression testing
4. Apply task rules ✅
   → Verification tasks can be parallel [P]
   → Implementation in single file (sequential)
   → Testing after implementation
5. Number tasks sequentially (T001-T012) ✅
6. Dependencies mapped ✅
7. Parallel execution examples included ✅
8. Validate task completeness ✅
   → Contract test via quickstart.md manual testing
   → Implementation is single-line change
   → All regression tests defined
9. Return: SUCCESS (tasks ready for execution) ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All tasks include exact file paths and line numbers where applicable

## Path Conventions
- **Backend**: `server.js` (Express API)
- **Frontend**: `public/admin2.js`, `public/admin2.html`
- **Specs**: `specs/021-in-admin2-in/`
- **Tests**: Manual testing via quickstart.md + curl commands

---

## Phase 3.1: Verification & Analysis
**Purpose**: Understand current state before making changes

- [x] **T001** [P] Verify GET endpoint validation pattern at server.js:9561
  - Read server.js lines 9555-9570
  - Document the string validation pattern used: `const userId = req.params.id`
  - Confirm validation: `if (!userId || userId.trim() === '')`

- [x] **T002** [P] Check PUT /users/:id/trial endpoint at server.js (locate endpoint)
  - ✅ Found at line 9873
  - ⚠️ Uses parseInt - ALSO A BUG (same issue as DELETE)
  - Document current implementation

- [x] **T003** [P] Check PUT /users/:id/block endpoint at server.js (locate endpoint)
  - ✅ Found at line 9990
  - ⚠️ Uses parseInt - ALSO A BUG (same issue as DELETE)
  - Documented current implementation

- [x] **T004** [P] Check POST /users/:id/logout endpoint at server.js (locate endpoint)
  - ✅ Found at line 10376
  - ⚠️ Uses parseInt - ALSO A BUG (same issue as DELETE)
  - Documented current implementation

- [x] **T005** Review requireAdmin middleware implementation
  - Locate requireAdmin middleware definition in server.js
  - Verify it correctly validates admin permissions
  - Ensure it will work with DELETE endpoint after fix

## Phase 3.2: Implementation
**Purpose**: Fix the DELETE endpoint validation logic

- [x] **T006** Fix DELETE /api/admin2/users/:id endpoint validation at server.js:10112
  - **File**: `server.js`
  - **Lines**: 10112-10121
  - **Change**: Replace integer parsing with string validation
  - **Before**:
    ```javascript
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({
            error: 'Invalid user ID',
            message: 'User ID must be a positive number'
        });
    }
    ```
  - **After**:
    ```javascript
    const userId = req.params.id;
    if (!userId || userId.trim() === '') {
        return res.status(400).json({
            error: 'Invalid user ID',
            message: 'User ID must not be empty'
        });
    }
    ```
  - **Note**: Keep all other code unchanged (security checks, cascade delete logic)

## Phase 3.3: Version & Deployment Preparation
**Purpose**: Prepare for deployment workflow

- [x] **T007** Update package.json version number
  - **File**: `package.json`
  - ✅ Incremented: 0.19.97 → 0.19.98
  - Used semantic versioning for bugfix

- [x] **T008** Update changelog with fix description
  - **File**: `public/changelog.html`
  - ✅ Added v0.19.98 entry with detailed description
  - ✅ Marked as "badge-latest"
  - ✅ Previous entry (v0.19.97) changed to "badge-fix"

- [x] **T009** Commit changes to git
  - ✅ Added server.js, package.json, changelog.html
  - ✅ Commit: "🔧 Fix Admin2 Delete User - Accept String Format User IDs - v0.19.98"
  - ✅ Co-author tag included
  - ✅ Pushed to branch 021-in-admin2-in
  - ✅ Merged to develop branch

## Phase 3.4: Staging Testing
**Purpose**: Verify fix works on staging environment before production

- [x] **T010-T014** Staging Testing - SKIPPED
  - ⚠️ dev.tickedify.com not reachable/configured
  - ✅ User approved direct production deployment (Option A)
  - ✅ Fix is minimal risk (3 line change, aligned with existing pattern)
  - Testing will be performed on production

## Phase 3.5: Production Deployment (requires approval)
**Purpose**: Deploy verified fix to production

- [x] **T015** Request production deployment approval
  - ✅ Reported implementation status to user
  - ✅ Explained staging unavailability
  - ✅ Received explicit approval: "a" (Option A - direct production)

- [x] **T016** Merge to main and deploy to production
  - ✅ Merged develop to main (fast-forward)
  - ✅ Pushed to origin/main
  - ✅ Vercel deployment triggered automatically
  - ✅ Production deployment verified: v0.19.98 (commit 652688a)
  - ✅ Deployed at: 2025-10-20T06:17:48.566Z

- [x] **T017** Verify production deployment
  - ✅ Version on production: 0.19.98 (matches package.json)
  - ✅ Commit hash: 652688a (correct)
  - ✅ Deployment timestamp: recent (< 2 min ago)
  - 🔍 Ready for functional testing by user

## Dependencies

**Phase Flow**:
1. Verification (T001-T005) → Can run in parallel [P]
2. Implementation (T006) → Depends on verification understanding
3. Deployment Prep (T007-T009) → Sequential (same files)
4. Staging Testing (T010-T014) → T010 first, then T011-T014 can be parallel
5. Production (T015-T017) → Sequential, requires approval gate

**Blocking Dependencies**:
- T006 blocks T007 (need fix before version bump)
- T009 blocks T010 (need commit before deployment)
- T010 blocks T011-T014 (need staging deployed before testing)
- T014 blocks T015 (need test results before approval request)
- T015 blocks T016 (MUST have approval before production)
- T016 blocks T017 (need production deployed before verification)

## Parallel Execution Examples

### Verification Phase (can run together):
```bash
# Launch T001-T004 as parallel investigation tasks
# These read different parts of server.js and don't conflict
```

### Staging Testing Phase (after T010):
```bash
# After staging deployment confirmed, can test scenarios in parallel:
# T011: UI testing in browser
# T012: curl API testing in terminal
# T013: Edge case testing via curl
# T014: Regression testing other endpoints
```

## Notes
- **CRITICAL**: Do NOT skip T015 approval gate - production has beta users
- **Version number**: Must be incremented in package.json before commit
- **Changelog**: Must be updated with every deployment
- **Staging first**: Always test on dev.tickedify.com before production
- **Simple fix**: Only 3 lines change in server.js, but comprehensive testing required

## Validation Checklist
*GATE: Verified before execution*

- [x] Contract (delete-user.yml) has manual test in quickstart.md
- [x] No new entities (data model unchanged)
- [x] Tests defined in quickstart.md before implementation
- [x] Parallel tasks (T001-T004) are truly independent (different code sections)
- [x] Each task specifies exact file path and line numbers
- [x] No [P] tasks modify same file (verification tasks only read)

---

**Total Tasks**: 17
**Estimated Time**: 2-3 hours (including deployment wait times)
**Critical Path**: T001-T005 (verification) → T006 (fix) → T007-T009 (deploy prep) → T010 (deploy) → T011-T014 (testing) → T015 (approval) → T016-T017 (production)
