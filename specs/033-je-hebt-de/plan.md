
# Implementation Plan: "Volgend Bezoek Aan Pagina" Bericht Trigger

**Branch**: `033-je-hebt-de` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/033-je-hebt-de/spec.md`

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
**Primary Requirement**: Implement page-specific message trigger "Volgend bezoek aan pagina" that shows admin messages ONLY when user visits a SPECIFIC page (e.g., /planning, /taken), not on any page visit. This corrects Feature 032 which incorrectly implemented a global trigger.

**Key Difference from Feature 032**:
- Feature 032 (INCORRECT): Triggered on ANY page visit (duplicate of "Direct" trigger)
- Feature 033 (CORRECT): Triggers ONLY on next visit to SPECIFIC page selected by admin

**Technical Approach**: Extend existing message system with new trigger type "next_page_visit" that requires page identifier stored in trigger_value field. Backend filters messages by matching current page to stored page identifier. Admin UI includes page selector dropdown.

## Technical Context
**Language/Version**: Node.js 16+ (backend), Vanilla JavaScript ES6 (frontend)
**Primary Dependencies**: Express.js 4.18, PostgreSQL driver (pg 8.11), Neon PostgreSQL hosting
**Storage**: PostgreSQL (Neon) - Tables: admin_messages, message_interactions, user_page_visits
**Testing**: Manual testing workflow (no automated test framework in project)
**Target Platform**: Web application hosted on Vercel
**Project Type**: Web (single codebase with server.js backend + public/ frontend)
**Performance Goals**: <200ms API response time for message queries, <5% overhead on existing trigger logic
**Constraints**: BÈTA FREEZE (no production deployment), backwards compatible with existing triggers (immediate, days_after_signup, first_page_visit, nth_page_visit), no database schema changes (use existing VARCHAR(50) trigger_type field)
**Scale/Scope**: Multi-user productivity app, ~10K+ lines codebase, 5 existing trigger types

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: N/A - Project constitution is template only, not ratified yet.

**General Software Principles Applied**:
- ✅ **Backwards Compatibility**: New trigger type doesn't break existing triggers
- ✅ **Minimal Changes**: Reuses existing database schema (no migrations)
- ✅ **Incremental Addition**: Extends existing messaging system, no refactoring needed
- ✅ **BÈTA FREEZE Compliance**: Development on feature branch only, no production deployment

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

**Structure Decision**: Custom web structure (Tickedify-specific)
```
Root directory structure:
- server.js           # Backend API endpoints (~13,000+ lines)
- public/             # Frontend files (HTML, JS, CSS)
  ├── admin2.html     # Admin interface for message management
  ├── app.html        # Main user application
  ├── changelog.html  # User-facing changelog
  └── [other assets]
- specs/              # Feature specifications and planning docs
- package.json        # Dependencies and version tracking
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

**Task Generation Strategy for Feature 033**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data-model.md, quickstart.md)
- **Setup tasks**: Documentation (DATABASE_NOTES.md with schema notes) [P]
- **Backend tasks**:
  - Modify GET /api/messages/unread endpoint (add page parameter + WHERE clause)
  - Add validation to POST /api/admin/messages endpoint (next_page_visit trigger)
- **Frontend tasks**:
  - Add page selector dropdown to admin2.html
  - Add page parameter to message polling in frontend
- **Testing tasks**: Execute quickstart.md scenarios 1-8 (manual testing)
- **Deployment tasks**: Update changelog, bump version, deploy to staging

**Ordering Strategy**:
1. **Documentation first**: Database notes (parallel-safe)
2. **Backend before frontend**: API changes must exist before UI can use them
3. **Frontend UI before polling**: Admin form before user message display
4. **Testing after implementation**: Manual testing via quickstart.md
5. **Deployment last**: Changelog, version bump, push to staging

**Task Categories**:
- Setup & Documentation: 1 task [P]
- Backend Implementation: 2 tasks (sequential, same file)
- Frontend Implementation: 2 tasks (sequential, same file)
- Manual Testing: 8 scenarios from quickstart.md (can be batched)
- Deployment: 3 tasks (sequential - changelog → version → deploy)

**Estimated Output**: ~10-12 numbered, ordered tasks in tasks.md

**Key Differences from Template**:
- ❌ No automated tests (Tickedify uses manual testing)
- ❌ No new entities (reuses existing database tables)
- ✅ Emphasis on manual testing scenarios from quickstart.md
- ✅ BÈTA FREEZE compliance (staging deployment only, no production)

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
- [x] Phase 0: Research complete (/plan command) - research.md created with 9 design decisions
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/api-contract.md, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - approach described below)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (N/A - template only, general principles applied)
- [x] Post-Design Constitution Check: PASS (no violations, additive change only)
- [x] All NEEDS CLARIFICATION resolved (none in Technical Context)
- [x] Complexity deviations documented (none - additive change only)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
