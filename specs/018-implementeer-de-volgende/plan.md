
# Implementation Plan: Admin Dashboard v2

**Branch**: `018-implementeer-de-volgende` | **Date**: 2025-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-implementeer-de-volgende/spec.md`

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
Build a comprehensive admin dashboard (admin2.html) to replace/supplement the existing admin.html with 10 organized screens for monitoring system health, managing users, viewing statistics, configuring system settings, performing database operations, and managing payment configurations. The dashboard will provide 19 statistical metrics and 15 admin actions organized across multiple screens for clarity and usability.

## Technical Context
**Language/Version**: Node.js 16+, Vanilla JavaScript (ES6+)
**Primary Dependencies**: Express.js 4.18.2, PostgreSQL (pg 8.11.3), bcryptjs 3.0.2, express-session 1.18.1
**Storage**: PostgreSQL (Neon) - existing database with users, tasks, email_imports, payment_configurations, system_settings tables
**Testing**: Manual testing via Playwright browser automation (tickedify-testing agent), API endpoint testing with curl
**Target Platform**: Web application (Vercel deployment), browser-based admin interface
**Project Type**: Web application (existing monolithic structure with public/ frontend and server.js backend)
**Performance Goals**: <500ms page load, <200ms API response for statistics endpoints, real-time data refresh
**Constraints**: Must not interfere with existing admin.html, requires admin authentication via existing session system, must use existing Tickedify UI patterns (macOS-style design from style.css)
**Scale/Scope**: 10 dashboard screens, 19 statistics endpoints, 15 admin action endpoints, support for ~100 users initially (beta phase)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: No project-specific constitution exists yet. Using general development best practices:

- ✅ **Code Reuse**: Leverage existing admin.html patterns, style.css, and server.js API structure
- ✅ **Separation of Concerns**: Frontend (admin2.html + admin2.js) separate from backend (API endpoints in server.js)
- ✅ **Security**: Admin authentication required via existing session middleware, SQL injection prevention, input validation
- ✅ **Testing**: Integration tests via Playwright, API endpoint testing with curl
- ✅ **Maintainability**: Clear screen structure, modular JavaScript, consistent naming conventions
- ✅ **No Breaking Changes**: Existing admin.html remains functional, new dashboard is additive

**Initial Assessment**: PASS - No constitutional violations detected

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

**Structure Decision**: Existing monolithic web application structure

```
public/
├── admin2.html           # New dashboard HTML
├── admin2.js             # New dashboard JavaScript
├── style.css             # Existing shared styles
└── [existing files...]

server.js                 # Backend API (add new endpoints)
├── /api/admin2/stats/*   # Statistics endpoints
├── /api/admin2/users/*   # User management endpoints
├── /api/admin2/system/*  # System configuration endpoints
└── /api/admin2/debug/*   # Debug tools endpoints

specs/018-implementeer-de-volgende/
├── plan.md               # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 API contracts
└── tasks.md              # Phase 2 output (created by /tasks)
```

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
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 artifacts:
  - API contracts → endpoint implementation tasks
  - Data model → database query optimization tasks
  - Quickstart → testing verification tasks
- Group tasks by domain:
  - Statistics endpoints (FR-001 through FR-042)
  - User management endpoints (FR-051 through FR-057)
  - System configuration endpoints (FR-066, FR-NEW-001)
  - Debug tools endpoints (FR-072, FR-073, FR-081, FR-101)
  - Frontend implementation (admin2.html, admin2.js)
  - Integration testing (Playwright scenarios)

**Ordering Strategy**:
1. **Backend First** (API endpoints before frontend)
   - Statistics endpoints [P] - can be implemented in parallel
   - User management endpoints [P] - can be implemented in parallel
   - System config endpoints [P] - can be implemented in parallel
   - Debug tools endpoints [P] - can be implemented in parallel
2. **Database Optimization**
   - Create recommended indexes for performance
3. **Frontend Implementation**
   - admin2.html structure (screens, navigation)
   - admin2.js API integration
   - Chart.js integration for user growth graph
4. **Testing & Validation**
   - Manual testing per quickstart.md
   - Playwright automated tests
   - Performance verification
5. **Documentation & Deployment**
   - Update changelog.html
   - Version bump
   - Deploy and verify

**Dependency Management**:
- Mark [P] for parallel execution where no dependencies exist
- Backend endpoints can be implemented in any order (all independent)
- Frontend depends on backend endpoints being deployed
- Testing depends on both frontend and backend complete

**Estimated Output**: 40-50 numbered, ordered tasks in tasks.md
- ~20 backend endpoint tasks
- ~5 database optimization tasks
- ~10 frontend implementation tasks
- ~10 testing tasks
- ~5 documentation/deployment tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No Complexity Violations** - This feature follows existing Tickedify patterns:
- Reuses existing monolithic structure (public/ + server.js)
- Leverages existing authentication and session management
- Uses familiar vanilla JavaScript approach (no new frameworks)
- Follows existing admin.html patterns for consistency
- No new infrastructure dependencies


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
- [x] Complexity deviations documented (none - no deviations)

**Artifacts Generated**:
- [x] research.md - 10 technical decisions documented
- [x] data-model.md - Database schema and statistics queries
- [x] contracts/api-admin2-stats.md - 6 statistics endpoints
- [x] contracts/api-admin2-users.md - 8 user management endpoints
- [x] contracts/api-admin2-system.md - 4 system configuration endpoints
- [x] contracts/api-admin2-debug.md - 4 debug tool endpoints
- [x] quickstart.md - Manual testing guide with 15-minute workflow
- [x] CLAUDE.md updated with new feature context
- [x] tasks.md - 53 numbered, ordered implementation tasks

**Tasks Overview**:
- Setup: 3 tasks (T001-T003)
- Backend Statistics: 6 tasks [P] (T004-T009)
- Backend User Management: 8 tasks (T010-T017)
- Backend System Config: 4 tasks (T018-T021)
- Backend Debug Tools: 4 tasks (T022-T025)
- Database Optimization: 1 task [P] (T026)
- Frontend Home: 2 tasks (T027-T028)
- Frontend Statistics Screens: 4 tasks [P] (T029-T032)
- Frontend User Management: 4 tasks (T033-T036)
- Frontend System Config: 2 tasks (T037-T038)
- Frontend Debug Tools: 3 tasks (T039-T041)
- Frontend Polish: 3 tasks (T042-T044)
- Testing: 5 tasks (T045-T049)
- Documentation & Deployment: 4 tasks (T050-T053)

**Parallel Execution Opportunities**:
- 6 statistics endpoints can run in parallel (saves ~2.5 hours)
- 4 frontend statistics screens can run in parallel (saves ~1.5 hours)
- Database optimization independent of most work
- Estimated timeline: 12-15 hours with parallelization vs 20-23 hours sequential

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
