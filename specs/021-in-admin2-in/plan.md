# Implementation Plan: Admin2 Delete User Account Bug Fix

**Branch**: `021-in-admin2-in` | **Date**: 2025-10-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-in-admin2-in/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✅
   → Project Type: web (frontend + backend)
   → All technical context determined from existing codebase
3. Fill the Constitution Check section ✅
   → Constitution is template-based, no specific constraints apply
4. Evaluate Constitution Check section ✅
   → No violations - simple bugfix aligns with all principles
   → Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md ✅
   → Root cause identified in server.js:10112
   → Solution approach determined
6. Execute Phase 1 → contracts, data-model.md, quickstart.md ✅
   → API contract defined in contracts/delete-user.yml
   → Data model documented (no schema changes)
   → Test scenarios created in quickstart.md
7. Re-evaluate Constitution Check section ✅
   → No new violations
   → Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Task generation approach described ✅
9. STOP - Ready for /tasks command ✅
```

## Summary
Bug fix for Admin2 User Management DELETE endpoint that incorrectly validates string-format user IDs as integers. The endpoint attempts to parse user IDs using `parseInt()` when they should be handled as strings (format: `user_[timestamp]_[alphanumeric]`). Fix aligns validation with existing GET endpoint pattern (server.js:9561).

**Technical Approach**: Replace integer parsing validation with string validation, matching the pattern used in GET `/api/admin2/users/:id` endpoint.

## Technical Context
**Language/Version**: Node.js (Express.js server)
**Primary Dependencies**: Express.js, PostgreSQL (via pg driver), express-session
**Storage**: PostgreSQL (Neon) - existing schema, no changes required
**Testing**: Manual testing via Admin2 UI + curl API testing
**Target Platform**: Vercel serverless deployment (production: tickedify.com)
**Project Type**: web - frontend (public/admin2.js, public/admin2.html) + backend (server.js)
**Performance Goals**: < 2 seconds for DELETE operation including cascade deletes
**Constraints**: Must maintain backward compatibility, preserve all security checks
**Scale/Scope**: Single endpoint fix in server.js (lines 10112-10121)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: The project does not have a specific constitution file with defined principles. Using general best practices:

✅ **Simplicity**: Single-line validation change, no architectural complexity
✅ **Consistency**: Aligns with existing GET endpoint pattern
✅ **Security**: Maintains all existing security checks (admin-only, no self-delete)
✅ **Testing**: Comprehensive test scenarios defined in quickstart.md
✅ **No Breaking Changes**: API contract unchanged, only internal validation logic

**Result**: PASS - No constitutional violations

## Project Structure

### Documentation (this feature)
```
specs/021-in-admin2-in/
├── plan.md              # This file
├── research.md          # Root cause analysis and solution approach
├── data-model.md        # Existing data model documentation
├── quickstart.md        # Test scenarios and validation steps
├── contracts/
│   └── delete-user.yml  # OpenAPI contract for DELETE endpoint
└── tasks.md             # Created by /tasks command
```

### Source Code (repository root)
```
public/
├── admin2.html          # Admin2 UI (no changes required)
└── admin2.js            # Admin2 frontend (no changes required - line 67 already correct)

server.js                # Express server - FIX LOCATION: line 10112
```

**Structure Decision**: Web application (Option 2) - public/ for frontend, server.js for backend API

## Phase 0: Outline & Research ✅

### Root Cause Analysis
**Problem**: DELETE `/api/admin2/users/:id` endpoint (server.js:10112) uses `parseInt(req.params.id)` which fails for string-format user IDs.

**Current Code** (server.js:10112-10121):
```javascript
const userId = parseInt(req.params.id);  // ❌ Fails for "user_1760531416053_qwljhrwxp"

if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a positive number'  // Error from bug report
    });
}
```

**Correct Pattern** (server.js:9561 - GET endpoint):
```javascript
const userId = req.params.id; // ✅ Accepts string IDs

if (!userId || userId.trim() === '') {
    return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must not be empty'
    });
}
```

### Research Findings
- **User ID Format**: Current system uses `user_[timestamp]_[alphanumeric]` (e.g., `user_1760531416053_qwljhrwxp`)
- **Inconsistency**: GET endpoint handles strings correctly, DELETE does not
- **Database**: PostgreSQL parameterized queries work with both formats, no changes needed
- **Security**: All security checks must be preserved (requireAdmin middleware, self-delete prevention)

**Decision**: Use string validation pattern from GET endpoint
**Rationale**: Maintains consistency, supports current ID format, no database changes
**Alternatives Considered**: Dual format support (rejected - unnecessary complexity), numeric migration (rejected - breaks existing data)

**Output**: research.md complete ✅

## Phase 1: Design & Contracts ✅

### API Contract
**File**: `contracts/delete-user.yml`
**Format**: OpenAPI 3.0.0

**Key Contract Elements**:
- Endpoint: `DELETE /api/admin2/users/{id}`
- Parameter: `id` (string, pattern: `^user_[0-9]{13}_[a-z0-9]+$`)
- Responses: 200 (success), 400 (invalid ID), 401/403 (auth), 404 (not found), 500/503 (errors)
- Success schema: `{ success, user_id, cascade_deleted: { tasks, email_imports, sessions } }`

### Data Model
**File**: `data-model.md`

**No Schema Changes**:
- Existing `users` table uses string `id` column
- Cascade deletes configured via foreign keys (tasks, email_imports, sessions)
- PostgreSQL handles string IDs correctly in parameterized queries

**ID Validation Rules**:
- Valid: Non-empty, non-whitespace string matching `user_[timestamp]_[suffix]`
- Invalid: Empty string, whitespace-only, null/undefined

### Test Scenarios
**File**: `quickstart.md`

**Test Coverage**:
1. **UI Workflow**: Complete delete flow through Admin2 interface
2. **API Direct**: curl testing with string IDs
3. **Edge Cases**: Empty ID, whitespace, non-existent user, self-delete, non-admin
4. **Endpoint Consistency**: Verify other admin2 endpoints accept string IDs
5. **Regression**: Ensure security checks and cascade deletes still work

**Critical Path Tests**:
- Delete user with string ID → 200 success
- Verify cascade deletion counts in response
- Confirm user removed from user list
- No console errors

**Output**:
- ✅ contracts/delete-user.yml created
- ✅ data-model.md created
- ✅ quickstart.md created

## Phase 2: Task Planning Approach

**Task Generation Strategy**:
The `/tasks` command will generate a simple task list for this bugfix:

1. **Verification Tasks** [P - Parallel]:
   - Verify GET endpoint validation pattern (server.js:9561)
   - Check other admin2 endpoints (trial, block, logout) for consistency
   - Review security middleware (requireAdmin) implementation

2. **Implementation Task**:
   - Fix DELETE endpoint validation (server.js:10112-10121)
   - Replace `parseInt()` with string validation
   - Update error message to match pattern

3. **Testing Tasks**:
   - Test via Admin2 UI (delete user workflow)
   - Test via curl API (string ID validation)
   - Test edge cases (empty, whitespace, non-existent)
   - Verify security checks (self-delete, admin-only)
   - Regression test cascade deletions

4. **Deployment Tasks**:
   - Update version in package.json
   - Commit and push to git
   - Deploy to staging (dev.tickedify.com)
   - Verify deployment via /api/version
   - Test on staging environment
   - Deploy to production (after approval)

**Ordering Strategy**:
- Verification first (understand current state)
- Implementation (single file change)
- Testing (comprehensive validation)
- Deployment (staged rollout)

**Estimated Output**: ~10-12 tasks in tasks.md

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (fix server.js:10112, test, deploy)
**Phase 5**: Validation (run quickstart.md test scenarios, verify production)

## Complexity Tracking
*No complexity violations - simple bugfix*

This fix introduces no additional complexity:
- Single validation change in one file
- No new dependencies or architectural patterns
- Aligns with existing codebase patterns
- No database migrations or schema changes

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning approach described ✅
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented: N/A (no deviations) ✅

---
*Ready for `/tasks` command to generate implementation task list*
