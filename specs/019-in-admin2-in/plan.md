
# Implementation Plan: Admin2 User Details 500 Error Fix

**Branch**: `019-in-admin2-in` | **Date**: 2025-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-in-admin2-in/spec.md`

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

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
**Primary Requirement**: Fix 500 server error that occurs when admin clicks on a user in the admin2 user management screen to view user details.

**Error Context**:
- Endpoint: `GET /api/admin2/users/:id`
- Symptom: Server responds with 500 error and message "Failed to get user details"
- Impact: Admin cannot view user details, task summaries, email imports, or subscription information for any user
- Example failing user ID: `user_1760528080063_08xf0g9r1`

**Technical Approach**: Debug the server-side endpoint to identify which database query is failing, ensure proper error handling, validate that all LEFT JOIN queries handle missing data gracefully, and add detailed error logging to identify the root cause.

## Technical Context
**Language/Version**: Node.js 16+ / JavaScript (ES6+)
**Primary Dependencies**: Express.js 4.18.2, pg (PostgreSQL driver) 8.11.3, bcryptjs, express-session
**Storage**: PostgreSQL (Neon hosted) - tables: users, subscriptions, payment_configurations, taken, email_imports
**Testing**: Manual API testing, curl commands for endpoint verification
**Target Platform**: Vercel serverless (Node.js runtime), production deployment at tickedify.com
**Project Type**: web (Express backend + vanilla JavaScript frontend in public/)
**Performance Goals**: API response <500ms p95, handle concurrent admin operations
**Constraints**: Production system with active beta users, zero-downtime deployment required, backward compatible with existing admin2.js frontend code
**Scale/Scope**: Single admin dashboard, ~10 database queries per user details request, current user base in beta phase

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: N/A - This is a bugfix for existing production code
**Rationale**: Constitution requirements apply to new features/libraries. This fix operates within established Tickedify architecture (Express + PostgreSQL + Vanilla JS). No new architectural patterns or libraries required.

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Tickedify uses a custom monolithic structure:
```
/
├── server.js                 # Express backend (9000+ lines)
├── public/
│   ├── admin2.js            # Admin dashboard frontend (1700+ lines)
│   ├── admin2.html          # Admin UI
│   └── app.js               # Main app frontend
├── specs/                   # Feature specifications and plans
└── package.json
```

**Bug Location**:
- Backend: `server.js` line ~9555-9767 (endpoint `/api/admin2/users/:id`)
- Frontend: `public/admin2.js` line ~1224-1255 (function `loadUserDetails`)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
This is a **bugfix** rather than a new feature, so task generation is simplified:

1. **Verification Tasks** (from contracts/api-response.md):
   - Create test script to verify current error state
   - Document exact SQL error messages

2. **Implementation Tasks** (from quickstart.md):
   - Fix Query 3: Tasks by Project (add AS aliasing)
   - Fix Query 4: Tasks by Context (add AS aliasing)
   - Add inline code comments explaining the fix

3. **Testing Tasks** (from quickstart.md verification checklist):
   - Test database queries directly
   - Test API endpoint returns 200 OK
   - Test admin2 UI loads user details without errors
   - Test edge cases (users with no tasks/projects/contexts)

4. **Deployment Tasks**:
   - Update version to 0.19.94
   - Update changelog with fix description
   - Commit with descriptive message
   - Deploy to staging (dev.tickedify.com)
   - Verify staging deployment
   - Deploy to production (tickedify.com)
   - Verify production deployment

**Ordering Strategy**:
1. Verification (understand current state)
2. Implementation (apply fixes)
3. Testing (verify fixes work)
4. Deployment (ship to production)

**Estimated Output**: 10-12 numbered, sequential tasks in tasks.md

**No Parallelization**: This is a small bugfix with dependencies between steps (must verify before fixing, must fix before testing, must test before deploying)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 12 sequential tasks
- [x] Phase 4: Implementation complete (/implement command) - All tasks executed successfully
- [x] Phase 5: Validation passed - Deployed to production (v0.19.94) and verified

**Gate Status**:
- [x] Initial Constitution Check: N/A (bugfix for existing code)
- [x] Post-Design Constitution Check: N/A (bugfix for existing code)
- [x] All NEEDS CLARIFICATION resolved: Yes (all technical context known)
- [x] Complexity deviations documented: None (simple SQL fix)

**Artifacts Generated**:
- [x] `/specs/019-in-admin2-in/plan.md` (this file)
- [x] `/specs/019-in-admin2-in/research.md` (root cause analysis)
- [x] `/specs/019-in-admin2-in/data-model.md` (schema mapping)
- [x] `/specs/019-in-admin2-in/contracts/api-response.md` (API contract)
- [x] `/specs/019-in-admin2-in/quickstart.md` (implementation guide)
- [x] `/specs/019-in-admin2-in/tasks.md` (12 sequential tasks for implementation)
- [x] `/CLAUDE.md` (updated with project context)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
