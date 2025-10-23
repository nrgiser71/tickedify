
# Implementation Plan: Sidebar Taak Tellers

**Branch**: `022-voeg-de-volgende` | **Date**: 2025-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-voeg-de-volgende/spec.md`

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
Deze feature voegt taak tellers toe aan de sidebar voor 5 specifieke categorieën (Inbox, Acties, Projecten, Opvolgen, Uitgesteld). De tellers tonen het aantal actieve/incomplete taken tussen haakjes en worden real-time bijgewerkt na elke taak operatie (create, delete, move, complete, bulk operations). Dit geeft gebruikers direct inzicht in hun werkvoorraad zonder in elke categorie te hoeven klikken.

## Technical Context
**Language/Version**: JavaScript ES6+ (Vanilla JS), Node.js 18+ (backend)
**Primary Dependencies**: Express.js (backend), PostgreSQL (Neon), Vercel (hosting)
**Storage**: PostgreSQL database met 'taken' tabel (lijst, status kolommen)
**Testing**: Manual testing + Playwright (browser automation available)
**Target Platform**: Web application (responsive design)
**Project Type**: web (frontend: public/app.js + backend: server.js)
**Performance Goals**: <1 second counter update na taak operaties, geen merkbare UI lag
**Constraints**: Real-time updates vereist, geen stale cached values, counters direct zichtbaar bij page load
**Scale/Scope**: Single-user beta, ~10,000+ regels frontend code (app.js), 5 sidebar counters

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Template constitution not yet customized for Tickedify project
- No specific architectural principles defined yet
- Default to: simplicity, maintainability, existing patterns
- **Principle Applied**: Use existing Tickedify patterns (vanilla JS, direct DOM manipulation, Express API endpoints)
- **Principle Applied**: Minimize complexity - this is a UI enhancement, no new database schema needed
- **Assessment**: PASS - Feature follows existing architecture patterns, no new complexity introduced

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

**Structure Decision**: Option 2 - Web application (Tickedify heeft public/ frontend en server.js backend)
- Frontend: public/app.js (~10,507 regels), public/index.html, public/styles.css
- Backend: server.js (Express API endpoints)
- Database: PostgreSQL via Neon (taken, projecten, contexten tabellen)

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
- Backend API endpoint implementatie (GET /api/counts/sidebar)
- Frontend UI wijzigingen (sidebar HTML, CSS styling)
- Frontend JavaScript (updateSidebarCounters, debouncing, error handling)
- Integration testing (alle 10 quickstart scenarios)

**Ordering Strategy**:
1. Backend API endpoint + SQL query (testable via curl)
2. Frontend UI elements (span.task-count in HTML)
3. Frontend JavaScript logic (API call + DOM update)
4. Integration in bestaande operaties (create, delete, move, complete, bulk)
5. Error handling + debouncing
6. Styling en responsive design
7. Cross-browser testing
8. Regression testing

**Estimated Output**: 15-20 numbered, dependency-ordered tasks in tasks.md

**Key Dependencies**:
- Backend moet deployed zijn voordat frontend counter updates getest kunnen worden
- HTML structure moet bestaan voordat JavaScript kan targeten
- Basic functionaliteit moet werken voordat error handling toegevoegd wordt

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
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md with 30 detailed tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations, follows existing patterns)
- [x] Post-Design Constitution Check: PASS (simple design, no added complexity)
- [x] All NEEDS CLARIFICATION resolved (none in Technical Context)
- [x] Complexity deviations documented (none - straightforward UI enhancement)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
