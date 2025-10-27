# Implementation Plan: Archive Tabel voor Afgewerkte Taken

**Branch**: `037-nu-gaan-we` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-nu-gaan-we/spec.md`

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
Database performance optimalisatie via archive strategie: Afgewerkte taken worden real-time verplaatst van `taken` tabel naar nieuwe `taken_archief` en `subtaken_archief` tabellen. Dit houdt de actieve taken tabel klein (< 5000 records per user) voor snelle queries (< 200ms). Het "Afgewerkt" scherm leest transparant uit archive zonder UI changes. Cascade archivering voor subtaken, recurring task support, en migration script voor bestaande data tijdens 00:00 maintenance window.

## Technical Context
**Language/Version**: Node.js (backend) + Vanilla JavaScript (frontend)
**Primary Dependencies**: Express.js, PostgreSQL (Neon hosted), Vercel deployment
**Storage**: PostgreSQL database - adding `taken_archief` en `subtaken_archief` tabellen
**Testing**: Manual staging testing (dev.tickedify.com), API testing via curl
**Target Platform**: Web application (Vercel serverless functions + static hosting)
**Project Type**: web (backend + frontend structure)
**Performance Goals**: < 200ms query response time, < 2 sec page load voor dagelijkse planning
**Constraints**: Real-time archivering zonder user-perceived latency, transactionele integriteit (rollback on failure), zero downtime deployment behalve migratie window
**Scale/Scope**: 10 bèta gebruikers (currently), designed for 1000+ users, ~10,000 afgewerkte taken per user verwacht

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Tickedify Architecture Principles:**
- ✅ **Database Normalization**: Archive tables follow existing schema structure (mirroring `taken` en `subtaken`)
- ✅ **Zero Breaking Changes**: UI blijft identical, API endpoints backwards compatible
- ✅ **Performance First**: Explicit performance targets (< 200ms queries, < 2sec page load)
- ✅ **Transaction Safety**: Rollback on failure, geen partial states
- ✅ **User Impact Minimal**: 15-30 min maintenance window acceptabel voor 10 users
- ✅ **Staging Testing**: dev.tickedify.com test environment voor validatie pre-productie
- ✅ **BÈTA FREEZE Compatible**: Feature op eigen branch vanaf clean main, deploybaar zonder andere changes

**Initial Check: PASS** - Geen constitutional violations, design volgt Tickedify patterns

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

**Structure Decision**: [DEFAULT to Option 1 unless Technical Context indicates web/mobile app]

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
- Generate tasks from Phase 1 design docs (data-model.md, api-endpoints.md, quickstart.md)
- **Database tasks**: Create taken_archief en subtaken_archief tables with indexes
- **Backend tasks**: Modify PUT /api/taak/:id, GET /api/lijst/afgewerkt, GET /api/subtaken/:parentId endpoints
- **Migration tasks**: Create migration script, dry-run test, actual migration
- **Testing tasks**: Manual testing per quickstart.md scenarios, performance validation
- **Documentation tasks**: Update ARCHITECTURE.md with archive table details

**Ordering Strategy**:
1. **Database First**: Create tables + indexes (blocking voor all other tasks)
2. **Backend Implementation**: API endpoint modifications (sequential - shared code)
3. **Testing**: Manual testing scenarios (can run parallel)
4. **Migration**: Dry-run eerst, dan actual migration (sequential)
5. **Documentation**: Final step, update ARCHITECTURE.md

**Estimated Output**: 15-20 numbered, dependency-ordered tasks in tasks.md

**Task Categories**:
- Database (2 tasks): Schema creation, index setup
- Backend (5 tasks): PUT endpoint, GET afgewerkt, GET subtaken, admin endpoints, error handling
- Migration (3 tasks): Script creation, dry-run, actual migration
- Testing (6 tasks): Simple archiving, subtaken cascade, recurring, UI verification, performance, rollback test
- Documentation (2 tasks): ARCHITECTURE.md update, deployment notes

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
- [x] Phase 1: Design complete (/plan command) - data-model.md, api-endpoints.md, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - Strategy documented above
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md with 18 numbered tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - Follows Tickedify architecture principles
- [x] Post-Design Constitution Check: PASS - No new violations introduced
- [x] All NEEDS CLARIFICATION resolved - Technical Context fully specified
- [x] Complexity deviations documented - None (straightforward archive pattern)

**Artifacts Generated**:
- ✅ specs/037-nu-gaan-we/research.md (7 research decisions)
- ✅ specs/037-nu-gaan-we/data-model.md (2 archive tables, relationships, validation)
- ✅ specs/037-nu-gaan-we/contracts/api-endpoints.md (5 endpoint contracts)
- ✅ specs/037-nu-gaan-we/quickstart.md (7-step developer guide)
- ✅ specs/037-nu-gaan-we/tasks.md (18 numbered, dependency-ordered tasks)
- ✅ CLAUDE.md updated (archive context added)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
