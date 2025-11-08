
# Implementation Plan: Settings Screen

**Branch**: `056-je-mag-een` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/056-je-mag-een/spec.md`

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
Implement a Settings screen infrastructure for Tickedify with sidebar navigation (gear icon, positioned below Search with extra spacing), empty settings page initially, and database-backed persistence for future user preferences. Manual save workflow with explicit Save button. Foundation for extensible settings system following "Baas Over Je Tijd" methodology.

## Technical Context
**Language/Version**: Node.js (backend), Vanilla JavaScript (frontend)
**Primary Dependencies**: Express.js (backend), PostgreSQL via Neon (database)
**Storage**: PostgreSQL (Neon cloud database) for user_settings table
**Testing**: Direct API testing via curl, manual UI testing on dev.tickedify.com
**Target Platform**: Web application hosted on Vercel
**Project Type**: Web (frontend + backend in monorepo structure)
**Performance Goals**: <200ms API response time, instant UI navigation
**Constraints**: Vanilla JS only (no frameworks), responsive design, database-backed persistence
**Scale/Scope**: Beta users (growing), simple CRUD operations, extensible settings schema

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze - Production Stability ✅ PASS
- Feature develops on `056-je-mag-een` branch (not main)
- Will merge to `staging` branch for testing on dev.tickedify.com
- No production deployment until explicit "BÈTA FREEZE IS OPGEHEVEN"
- Compliant with frozen main branch policy

### Staging-First Deployment ✅ PASS
- Development on feature branch → merge to staging → test on dev.tickedify.com
- Vercel automatic deployment configured for staging
- Testing via Vercel Authentication on dev.tickedify.com
- Main branch remains untouched during development

### Gespecialiseerde Sub-Agents ✅ PASS
- Implementation will use **tickedify-feature-builder** for feature development
- Testing will use **tickedify-testing** for regression and UI testing
- Bug fixes will use **tickedify-bug-hunter** if issues arise
- Token efficiency maintained through appropriate agent selection

### Versioning & Changelog Discipline ✅ PASS
- Version bump required in package.json with each commit
- Changelog update required (⚡ Features category for Settings screen)
- Format: English changelog entries, grouped per day
- Badge-latest for newest version

### Deployment Verification Workflow ✅ PASS
- Verification via `/api/version` endpoint every 15 seconds
- curl with `-s -L -k` flags to prevent macOS security prompts
- Max 2 minute timeout for deployment verification
- Automated iterative checking pattern

### Test-First via API ✅ PASS
- Settings endpoints tested via direct API calls (GET/POST user settings)
- Database state verification via API endpoints
- UI testing only for navigation and visual spacing verification
- API-first validation for business logic

**Initial Assessment**: ✅ NO VIOLATIONS - All constitutional principles satisfied

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

**Structure Decision**: Tickedify uses a monorepo structure with:
- `server.js` - Express backend with all API routes
- `public/` - Frontend HTML/CSS/JS files served statically
- Database schema managed via SQL migrations
- No separate backend/frontend directories (all in root)

**Existing Files to Modify**:
- `server.js` - Add Settings API endpoints (GET/POST /api/user-settings)
- `public/app.html` - Add Settings navigation in sidebar
- `public/app.css` - Add Settings screen styling and spacing
- `public/app.js` - Add Settings screen rendering and navigation logic
- Database: Add `user_settings` table via migration

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
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Database migration → task 1 (blocking task)
- API endpoints → GET and POST implementation tasks [P after migration]
- Frontend UI → Sidebar navigation, Settings screen, styling tasks [P with backend]
- Contract tests → API testing tasks for each endpoint
- Integration tests → End-to-end user flow tests

**Ordering Strategy**:
1. **Database First** (blocking): Migration must complete before API work
2. **Backend & Frontend Parallel**: API and UI can be developed simultaneously
3. **Testing Last**: Contract tests after implementation
4. **TDD Pattern**: Some tests can be written first (contract tests)

**Task Categories**:
- **Infrastructure** (1-2 tasks): Database migration, environment setup
- **Backend** (3-5 tasks): API endpoints (GET/POST), error handling
- **Frontend** (5-8 tasks): Sidebar navigation, Settings screen, routing, styling
- **Testing** (4-6 tasks): API contract tests, UI tests, regression tests
- **Documentation** (1-2 tasks): Changelog update, version bump

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**Dependencies**:
- Tasks 2-5 depend on task 1 (migration)
- Tasks 6-10 can run parallel (backend and frontend independent)
- Tasks 11-15 depend on tasks 2-10 (tests need implementation)

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
- [x] Phase 0: Research complete (/plan command) ✅ 2025-11-05
- [x] Phase 1: Design complete (/plan command) ✅ 2025-11-05
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅ 2025-11-05
- [x] Phase 3: Tasks generated (/tasks command) ✅ 2025-11-05 - 20 tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅ All principles satisfied
- [x] Post-Design Constitution Check: PASS ✅ No violations introduced
- [x] All NEEDS CLARIFICATION resolved ✅ No unknowns remain
- [x] Complexity deviations documented ✅ No deviations (simple design)

**Artifacts Generated**:
- [x] research.md - Technical decisions and patterns
- [x] data-model.md - Database schema and API data structures
- [x] contracts/user-settings-api.yml - OpenAPI specification
- [x] quickstart.md - 14 test scenarios for validation
- [x] CLAUDE.md updated - Agent context includes Settings feature
- [x] tasks.md - 20 implementation tasks with dependencies

**Ready for implementation** ✅ (Use /implement or tickedify-feature-builder agent)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
