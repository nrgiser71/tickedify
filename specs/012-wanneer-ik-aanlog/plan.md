# Implementation Plan: Admin Login Persistence

**Branch**: `012-wanneer-ik-aanlog` | **Date**: 2025-10-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-wanneer-ik-aanlog/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Admin page currently doesn't retain authentication state across page refreshes. Each refresh forces admin to re-enter credentials. Solution: Implement client-side session check that verifies existing server-side session on page load, maintaining login state for 24 hours across browser restarts.

## Technical Context
**Language/Version**: JavaScript (ES6+) - Frontend: Vanilla JS, Backend: Node.js with Express
**Primary Dependencies**: Express.js (already implemented), express-session (already configured in server.js:7958-7960)
**Storage**: Server-side sessions via express-session with session cookies
**Testing**: Manual testing via browser (tickedify.com/admin.html), API endpoint testing with curl
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application - existing single HTML page with JavaScript class
**Performance Goals**: Session check <100ms, no impact on page load performance
**Constraints**: 24-hour session expiry, must survive browser restart, graceful handling of expired sessions
**Scale/Scope**: Single admin user (Jan), simple authentication without complex role management

**Current Implementation Analysis**:
- Server-side: `/api/admin/auth` endpoint EXISTS (server.js:7947-7974)
- Server-side: Session management via `express-session` CONFIGURED
- Server-side: Sets `req.session.isAdmin` and `req.session.adminLoginTime` on successful login
- Server-side: `/api/admin/session` endpoint EXISTS for session validation (server.js:7977+)
- Client-side: `AdminDashboard` class in public/admin.js with `isAuthenticated` property
- Client-side: Login form handler `handleLogin()` (admin.js:30-62)
- **PROBLEM**: No client-side session check on page load - `isAuthenticated` always starts as `false` (admin.js:4)
- **PROBLEM**: No call to `/api/admin/session` endpoint to verify existing session

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file is a template placeholder - no actual project-specific constitutional principles defined. Proceeding with standard best practices:

✅ **Simplicity**: Leverage existing server-side session infrastructure, minimal client-side changes
✅ **No Breaking Changes**: Extends existing auth system without modifying core login flow
✅ **Security**: Uses existing express-session security, validates sessions server-side
✅ **Testability**: Clear test scenarios for session persistence and expiry
✅ **User Experience**: Addresses core UX issue (repeated login) with minimal complexity

## Project Structure

### Documentation (this feature)
```
specs/012-wanneer-ik-aanlog/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Existing structure - no new directories needed
public/
├── admin.html          # Existing - no changes needed
└── admin.js            # Modify: Add session check on page load

server.js               # Minimal/no changes - session endpoints already exist
```

**Structure Decision**: Existing single project structure - no new files or directories required

## Phase 0: Outline & Research

**Research Task 1**: Verify existing session configuration
- ✅ express-session is configured in server.js
- ✅ `/api/admin/auth` sets req.session.isAdmin and req.session.adminLoginTime
- ✅ `/api/admin/session` endpoint exists for session validation

**Research Task 2**: Analyze session cookie configuration
- Need to verify: Is express-session configured with persistent cookies?
- Need to verify: Cookie maxAge setting for 24-hour persistence
- Need to verify: secure and httpOnly flags for security

**Research Task 3**: Client-side session restoration patterns
- Best practice: Check session on page load before showing login form
- Pattern: Call session validation endpoint on DOMContentLoaded
- Pattern: Store minimal client state, rely on server for validation

**Output**: ✅ research.md created with session infrastructure analysis

---

## Phase 1: Design & Contracts

### API Contract Design

**Output**: `/contracts/api-session-check.md`

**Contract**: GET `/api/admin/session`
- **Purpose**: Validate existing admin session
- **Success Response (200)**: `{ authenticated: true, isAdmin: true, loginTime, sessionAge }`
- **Failure Response (401)**: `{ authenticated: false, message }`
- **Usage**: Called on page load to check session before showing login form

### Data Model

**Output**: `data-model.md`

**Entities**:
- **Session (Existing)**: PostgreSQL table managed by connect-pg-simple
  - Fields: `sid`, `sess` (JSON), `expire`
  - Custom session data: `isAdmin`, `adminAuthenticated`, `adminLoginTime`
  - No database migration needed - using existing table

- **AdminDashboard (Client State)**:
  - Property: `isAuthenticated` (boolean)
  - New Method: `checkExistingSession()` - calls GET `/api/admin/session`
  - State transitions: PageLoad → SessionCheck → ShowDashboard OR ShowLogin

- **Session Cookie**:
  - Name: `tickedify.sid`
  - Type: Persistent (survives browser restart)
  - Attributes: httpOnly, secure, sameSite, maxAge=24h

**Configuration Changes**:
- Update `cookie.maxAge` from 7 days to 24 hours in server.js:461

### Integration Tests

**Output**: Test scenarios in `quickstart.md`

**Test Scenarios**:
1. Session persists across page refresh
2. Session persists after browser restart
3. Session expires after 24 hours
4. Explicit logout destroys session
5. Invalid/missing session handled gracefully

**cURL Test Suite**:
- Session check without cookie (expects 401)
- Session check with valid cookie (expects 200)
- Session expiry validation
- Full automated test script provided

### Quickstart Guide

**Output**: `quickstart.md`

**Contents**:
- 5 manual test scenarios with step-by-step instructions
- API testing with cURL examples
- Browser DevTools verification steps
- Automated test script (Bash)
- Performance benchmarks (<100ms session check)
- Troubleshooting guide

### Agent Context Update

**Output**: CLAUDE.md updated

**Changes**:
- Added JavaScript/Express.js tech stack
- Added express-session dependency
- Added session-based authentication pattern
- Recent changes documented for feature 012

---

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

**From Contracts**:
1. Verify GET `/api/admin/session` endpoint implementation
2. Update endpoint response format to match contract
3. Test endpoint with cURL (contract validation)

**From Data Model**:
1. Update `cookie.maxAge` in server.js from 7 days to 24 hours
2. Add `checkExistingSession()` method to AdminDashboard class
3. Call `checkExistingSession()` in constructor on page load
4. Handle session check response (200 vs 401)
5. Update UI state based on session validity

**From Integration Tests**:
1. Test: Session persists across page refresh
2. Test: Session persists after browser restart
3. Test: Session expires after 24 hours
4. Test: Logout destroys session
5. Test: Invalid session handled gracefully
6. Test: cURL session check without cookie
7. Test: cURL session check with valid cookie

**From Quickstart**:
1. Manual testing: All 5 browser scenarios
2. Performance validation: Session check <100ms
3. DevTools verification: Cookie attributes correct
4. Automated test script execution

### Ordering Strategy

**Phase A - Server-Side (Critical Path)**:
1. Update cookie.maxAge to 24 hours [P]
2. Verify /api/admin/session endpoint exists and works [P]
3. Test endpoint with cURL [depends on 1,2]

**Phase B - Client-Side (Critical Path)**:
4. Add checkExistingSession() method to AdminDashboard [P]
5. Call checkExistingSession() in constructor [depends on 4]
6. Update UI based on session response [depends on 5]

**Phase C - Testing (Parallel)**:
7. Test: Page refresh persistence [depends on 6]
8. Test: Browser restart persistence [depends on 6]
9. Test: Session expiry [depends on 6]
10. Test: Logout functionality [depends on 6]
11. Test: Invalid session handling [depends on 6]
12. Performance validation [depends on 6]

**Phase D - Deployment**:
13. Update version in package.json [P]
14. Update CHANGELOG.md [P]
15. Commit changes to develop branch [depends on 13,14]
16. Deploy to staging [depends on 15]
17. User acceptance testing [depends on 16]

**Estimated Task Count**: 15-20 tasks
**Critical Path**: Tasks 1-6 (server + client implementation)
**Parallel Work**: Tasks 7-12 can run concurrently

### Complexity Assessment

**Implementation Complexity**: LOW
- Leverages existing infrastructure (express-session)
- Minimal code changes (2 files)
- No database migrations
- Clear API contract

**Testing Complexity**: MEDIUM
- 5 manual test scenarios
- Automated test suite provided
- Performance benchmarks required
- Edge case handling

**Deployment Risk**: LOW
- Backward compatible (existing sessions continue working)
- Gradual rollover (new logins use 24h maxAge)
- No breaking changes to API

---

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD approach)
**Phase 5**: Validation (run quickstart.md tests, deploy to staging)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No constitutional violations** - This feature follows all best practices:
- Simple solution leveraging existing infrastructure
- No new dependencies
- Minimal code changes
- Clear testing strategy


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A)

**Artifacts Generated**:
- [x] research.md - Session infrastructure analysis
- [x] contracts/api-session-check.md - GET /api/admin/session contract
- [x] data-model.md - Session entity and client state documentation
- [x] quickstart.md - Testing guide with 5 scenarios + cURL tests
- [x] CLAUDE.md - Agent context updated with tech stack
- [x] tasks.md - 18 implementation tasks (T001-T018)

**Ready for**: Implementation (manual or via `/implement`)

---
*Based on Constitution v2.1.1 - See `.specify/memory/constitution.md`*
