
# Implementation Plan: Uitbreiding Planning Uren 05:00-22:00

**Branch**: `041-in-de-dagelijkse` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/041-in-de-dagelijkse/spec.md`

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
Uitbreiding van de dagelijkse planning tijdvenster van 08:00-18:00 naar 05:00-22:00 om gebruikers met niet-standaard werkuren te ondersteunen. Dit is een configuratie wijziging in de bestaande planning functionaliteit - geen nieuwe features, alleen meer flexibiliteit in beschikbare uren.

## Technical Context
**Language/Version**: JavaScript (ES6+), Node.js (Express backend), Vanilla JavaScript (frontend)
**Primary Dependencies**: Express.js, PostgreSQL (Neon), Tabler Icons
**Storage**: PostgreSQL database - `dagelijkse_planning` tabel (database.js:192-205), LocalStorage voor uren config
**Testing**: Manual browser testing op staging (dev.tickedify.com), Playwright voor end-to-end testing
**Target Platform**: Web application (desktop/tablet/mobile responsive)
**Project Type**: Web application (frontend + backend in single repository)
**Performance Goals**: Drag & drop response < 50ms (throttled), API response < 200ms
**Constraints**: Must support bestaande geplande items (08:00-18:00), backwards compatible met database schema
**Scale/Scope**: Bèta gebruikers, ~10,000 regels frontend code, 1,500 regels planning code

**Huidige Implementatie Locaties**:
- Frontend: `public/app.js` regels 8230-9249 (planning rendering + drag & drop)
- Backend: `server.js` regels 5966-6181 (dagelijkse planning API endpoints)
- Database: `database.js` regels 192-205 (schema), 1133-1615 (planning functies)
- Styling: `public/style.css` regels 2887-4140 (planning layout + drag styling)

**Huidige Uren Configuratie**:
- LocalStorage keys: `dagplanning-start-uur` (default: 8), `dagplanning-eind-uur` (default: 18)
- UI controls: `app.js:8296-8298` (number inputs min=0 max=24)
- Render loop: `app.js:8451-8475` (renderKalenderGrid loop van startUur tot eindUur)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Tickedify constitution is niet gedefinieerd (template placeholders in `.specify/memory/constitution.md`). Standaard development principes worden toegepast:

**✅ Simpliciteit**: Minimale code wijziging - alleen default waarden aanpassen
**✅ Backwards Compatibility**: Bestaande planning items blijven functioneel
**✅ User Safety**: Staging testing verplicht voordat productie (BÈTA FREEZE actief)
**✅ Testing**: Manual testing + Playwright verificatie op dev.tickedify.com
**✅ Code Kwaliteit**: Bestaande patterns volgen, geen nieuwe architectuur

**Geen Constitutional Violations**: Dit is een simpele configuratie wijziging zonder architectural impact.

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

**Structure Decision**: Tickedify gebruikt een **monolithische web structuur** (niet Option 1, 2 of 3):
- Root level: `public/` (frontend), `server.js` (backend), `database.js` (database layer)
- Geen aparte src/tests directories - alles in root
- Frontend JavaScript in `public/app.js` (~10,000 regels)
- CSS in `public/style.css` (~4,000 regels)
- Backend in `server.js` (~8,000 regels)
- Database queries in `database.js` (~3,000 regels)

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

**Simplified Approach voor Deze Feature**:
Dit is een simpele configuratie wijziging - geen complexe task breakdown nodig.

**Task Generation Strategy**:
1. **Code wijziging**: Update default waarden in app.js (1 task)
2. **Versioning**: Package.json en changelog updates (1 task)
3. **Deployment**: Git commit + staging deployment (1 task)
4. **Testing**: Manual verification op staging (1 task)
5. **Optioneel**: Playwright tests schrijven (1 task)

**Geschatte Taken**: 4-5 lineaire taken (geen parallellisatie nodig)

**Rationale voor Simpliciteit**:
- Geen database wijzigingen
- Geen API wijzigingen
- Geen nieuwe componenten
- Alleen 2 getallen wijzigen (8→5, 18→22)
- Bestaande tests blijven geldig

**Implementation kan direct vanuit quickstart.md** - tasks.md is optioneel voor deze feature.

**IMPORTANT**: Dit is een uitzondering op normale workflow vanwege extreme simpliciteit.

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
- [x] Phase 2: Task planning complete (/plan command - simplified approach described)
- [ ] Phase 3: Tasks generated (/tasks command) - OPTIONAL voor deze feature
- [ ] Phase 4: Implementation complete - Kan direct via quickstart.md
- [ ] Phase 5: Validation passed - Staging testing

**Gate Status**:
- [x] Initial Constitution Check: PASS (geen violations - simpele config change)
- [x] Post-Design Constitution Check: PASS (geen nieuwe violations)
- [x] All NEEDS CLARIFICATION resolved (geen unknowns - alle tech bekend)
- [x] Complexity deviations documented (N/A - geen deviations)

**Artifacts Generated**:
- [x] `/specs/041-in-de-dagelijkse/spec.md` - Feature specification
- [x] `/specs/041-in-de-dagelijkse/plan.md` - Dit document
- [x] `/specs/041-in-de-dagelijkse/research.md` - Technische research
- [x] `/specs/041-in-de-dagelijkse/data-model.md` - Data model analyse
- [x] `/specs/041-in-de-dagelijkse/contracts/NO_CHANGES.md` - API contracts verificatie
- [x] `/specs/041-in-de-dagelijkse/quickstart.md` - Implementation guide

**Ready for Implementation**: ✅ Ja - volg quickstart.md voor directe implementatie

---
*Based on Tickedify Development Principles - See `CLAUDE.md` and `ARCHITECTURE.md`*
