
# Implementation Plan: Bulk Actie Datum Knoppen Uitbreiden

**Branch**: `005-in-het-acties` | **Date**: 2025-10-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-in-het-acties/spec.md`

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
Uitbreiding van bulk modus functionaliteit in Acties scherm om alle resterende dagen van de huidige week te tonen als datum knoppen, niet alleen "Vandaag" en "Morgen". De implementatie hergebruikt de bestaande weekdag logica uit het individuele taak 3-puntjes menu (app.js:4309-4322) om consistentie te garanderen tussen bulk acties en individuele taak acties.

## Technical Context
**Language/Version**: JavaScript (ES6+) - Vanilla JS frontend, Node.js 16+ backend
**Primary Dependencies**: Express.js 4.18, PostgreSQL (pg 8.11), Vercel deployment
**Storage**: PostgreSQL (Neon) - geen schema wijzigingen nodig voor deze feature
**Testing**: Manual browser testing + Playwright automation via tickedify-testing agent
**Target Platform**: Web browsers (desktop + mobile responsive), hosted op Vercel (tickedify.com)
**Project Type**: Web application - frontend (public/) + backend (server.js)
**Performance Goals**: <100ms UI response tijd voor bulk toolbar rendering, geen API latency impact
**Constraints**: Code hergebruik vereist - bulk modus MOET exact dezelfde weekdag logica gebruiken als 3-puntjes menu
**Scale/Scope**: Single-user beta, ~10,000 regels code in app.js, frontend-only wijziging (geen backend impact)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - Constitution template is placeholder only, geen specifieke projectregels gedefinieerd

**Analysis**:
- Geen constitutional violations - dit is een straightforward UI enhancement
- Code hergebruik pattern wordt gevolgd (DRY principe)
- Geen nieuwe dependencies of architecturale wijzigingen
- Consistentie met bestaande patterns is expliciet vereist in spec
- Deployment workflow volgt bestaande Tickedify development regels (develop → staging → main)

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

**Structure Decision**: Option 2 (Web application) - Tickedify heeft frontend (public/) en backend (server.js) structuur. Voor deze feature: alleen frontend wijzigingen in public/app.js.

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
Deze feature heeft geen nieuwe API contracts of data models - het is een frontend refactoring + enhancement.

**Tasks worden gegenereerd uit**:
1. **Research.md findings**: Extract helper function, refactor getBulkVerplaatsKnoppen
2. **Quickstart.md test scenarios**: Validatie tests voor alle weekdagen
3. **Code refactoring**: DRY principe - extract getWeekdagKnoppen helper
4. **Integration testing**: Playwright tests voor edge cases

**Task categories**:
- **Refactoring tasks**: Extract weekdag logica naar herbruikbare functie
- **Implementation tasks**: Update getBulkVerplaatsKnoppen met weekdag knoppen
- **Testing tasks**: Manual quickstart + Playwright automation
- **Deployment tasks**: Version bump, changelog, staging/prod deployment

**Ordering Strategy**:
1. Code refactoring eerst (extract helper) - voorkomt code duplication
2. Update bulk toolbar implementatie - gebruikt nieuwe helper
3. Manual testing op staging - verify alle scenarios
4. Playwright automation - regression prevention
5. Deployment workflow - staging → approval → productie

**Estimated Output**:
- ~10-12 tasks totaal (kleine feature, frontend-only)
- 3 refactoring tasks [P] - kunnen parallel
- 4 implementation tasks (sequential - dependencies)
- 3 testing tasks (manual, automation, regression)
- 2 deployment tasks (staging, production - requires approval)

**No TDD approach**: Geen unit tests framework in Tickedify - manual + Playwright e2e testing

**Dependencies**:
- Task 1 (extract helper) moet compleet voordat Task 2 (update bulk toolbar)
- Testing taken vereisen deployed code op staging
- Productie deployment vereist expliciete user approval

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - Constitution template is placeholder, geen specifieke regels.

Deze feature volgt bestaande Tickedify patterns:
- ✅ Code hergebruik (DRY principe)
- ✅ Consistentie met bestaande UI patterns
- ✅ Geen nieuwe dependencies
- ✅ Frontend-only wijziging (geen architectuur impact)


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [x] Phase 4: Implementation complete (/implement command) ✅
- [x] Phase 5: Validation passed (production deployment verified) ✅

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented (N/A - no violations) ✅

**Artifacts Generated**:
- [x] research.md - All technical decisions documented ✅
- [x] data-model.md - Frontend state and existing entities documented ✅
- [x] contracts/README.md - API contracts and UI contracts defined ✅
- [x] quickstart.md - Comprehensive validation guide created ✅
- [x] CLAUDE.md - Agent context updated with feature info ✅
- [x] tasks.md - 15 implementation tasks with dependencies generated ✅
- [x] Implementation complete - v0.16.30 deployed to production ✅

**Production Deployment**:
- Version: 0.16.30
- Commit: 4daa39c (merge commit on main)
- Deployed: 2025-10-06T18:52:15.931Z
- Status: ✅ LIVE and verified
- URL: https://tickedify.com

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
