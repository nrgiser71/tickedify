
# Implementation Plan: Bulk Edit Filter Compatibiliteit Fix

**Branch**: `044-in-het-volgende` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/044-in-het-volgende/spec.md`

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
**Probleem**: Bulk edit operations op gefilterde taken genereren 404 errors voor task IDs die niet in de database bestaan, waaronder test task IDs met pattern `test-{timestamp}-{random}`.

**Root Cause Analyse**:
- Bestaande v0.20.33 code heeft al meerdere defensive checks (regel 6874-6881, 12411-12414, 12718)
- 404 errors wijzen op test/placeholder task IDs in `geselecteerdeTaken` Set die nooit naar database zijn geschreven
- `filterActies()` wijzigt `this.taken` array NIET - gebruikt alleen CSS `display: none`
- Mogelijk race condition tussen UI rendering en data loading waardoor test IDs in selectie komen

**Technical Approach**:
- Identificeer hoe test task IDs in `geselecteerdeTaken` Set terechtkomen
- Verifieer of task IDs consistent zijn tussen UI rendering en database state
- Versterk validatie bij task selectie om alleen database-backed tasks toe te staan
- Voeg debugging logging toe om root cause te bevestigen

## Technical Context
**Language/Version**: JavaScript (Vanilla ES6+), Node.js 18+
**Primary Dependencies**: Express.js (backend), PostgreSQL (Neon), Vercel (hosting)
**Storage**: PostgreSQL database met `taken` tabel (id VARCHAR(50) PRIMARY KEY)
**Testing**: Manual browser testing op dev.tickedify.com (staging), Playwright automation capability
**Target Platform**: Web application (desktop/mobile browsers), Progressive Web App
**Project Type**: Web (frontend: public/app.js 13,736 regels + backend: server.js 6,253 regels)
**Performance Goals**: <500ms UI response, realtime filter feedback, geen blocking operations
**Constraints**: Vanilla JavaScript (geen frameworks), bestaande codebase pattern, backwards compatibility
**Scale/Scope**: Bèta gebruikers actief sinds oktober 2025, ~200 taken per gebruiker typical load

**Relevante Code Locaties**:
- `public/app.js` regel 6864-6955: `filterActies()` - Filter logica met CSS display toggle
- `public/app.js` regel 12410-12431: `toggleTaakSelectie()` - Task selectie met hidden check
- `public/app.js` regel 12701-12793: `bulkEditProperties()` - Bulk edit met validIds filter (v0.20.33)
- `public/app.js` regel 3915: Task rendering met selectie circles
- `server.js` regel ~2,400: `PUT /api/taak/:id` - Backend update endpoint

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Geen constitution.md gevonden - gebruikt Tickedify development practices uit CLAUDE.md:

**Tickedify Development Principles**:
- ✅ **Staging First**: Deploy naar `staging` branch, test op dev.tickedify.com
- ✅ **Bèta Freeze Active**: Main branch GEBLOKKEERD - geen productie deployments
- ✅ **Version Tracking**: Elke wijziging vereist package.json version bump
- ✅ **Changelog Updates**: Verplicht bij elke code change
- ✅ **Autonomous Staging**: Volledige autonomie binnen staging environment
- ✅ **Vanilla JavaScript**: Geen frameworks, bestaande patterns volgen
- ✅ **Backwards Compatibility**: Bestaande functionaliteit mag niet breken

**This Fix Compliance**:
- ✅ Bug fix op staging (geen nieuwe features tijdens bèta freeze)
- ✅ Bestaande code patterns worden gevolgd (defensive programming)
- ✅ Geen breaking changes - alleen versterkte validatie
- ✅ Testing op dev.tickedify.com staging environment
- ✅ Changelog entry bij implementatie

**Constitution Status**: PASS - Bug fix aligned met bèta freeze en staging-first approach

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

**Structure Decision**: **Option 2 (Web application)** - Tickedify heeft frontend (public/) en backend (server.js) scheiding

**Actual Tickedify Structure**:
```
public/
├── app.js              # 13,736 regels - Frontend logic
├── style.css           # 6,542 regels - UI styling
├── index.html          # Landing page
└── app.html            # Main application UI

server.js               # 6,253 regels - Express backend met PostgreSQL
package.json            # Dependencies en version tracking
CLAUDE.md               # Development guidelines
ARCHITECTURE.md         # Codebase documentatie
public/changelog.html   # User-facing changelog

specs/044-in-het-volgende/
├── spec.md             # Feature specification (completed)
├── plan.md             # This file (in progress)
├── research.md         # Phase 0 (pending)
├── data-model.md       # Phase 1 (pending)
├── quickstart.md       # Phase 1 (pending)
└── contracts/          # Phase 1 (pending)
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
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Focus: Client-side validation enhancement (geen database/server changes)
- Minimal implementation scope: 1 nieuwe functie + 2 functie wijzigingen

**Task Categories**:

1. **Implementation Tasks** (3-4 tasks):
   - Task 1: Implement `validateTaskId()` utility function (app.js)
   - Task 2: Enhance `toggleTaakSelectie()` with validation call
   - Task 3: Enhance `selecteerAlleTaken()` with validation filtering
   - Task 4: Add debug logging voor rejected IDs

2. **Testing Tasks** (2-3 tasks):
   - Task 5: Manual test via quickstart.md (Scenario 1-6)
   - Task 6: Playwright automation test (optional - if time allows)
   - Task 7: Verify geen regression in bulk delete/move

3. **Deployment Tasks** (3 tasks):
   - Task 8: Update package.json version (patch bump)
   - Task 9: Update changelog.html met fix description
   - Task 10: Deploy to staging + verification

**Ordering Strategy**:
- Sequential implementation (Task 1 → 2 → 3 → 4)
- Testing after implementation complete
- Deployment as final phase
- No parallel tasks (single file modification - app.js)

**Estimated Output**: **10 numbered tasks** in tasks.md

**Implementation Simplicity**:
- Alle wijzigingen in 1 bestand: `public/app.js`
- Code insertion points al geïdentificeerd via research.md
- Defensive programming - bestaande lagen blijven intact
- Testing workflow al gedocumenteerd in quickstart.md

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
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [x] Phase 4: Implementation complete (/implement command) ✅
- [ ] Phase 5: Validation passed (manual testing required via quickstart.md)

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅ (Technical Context fully specified)
- [x] Complexity deviations documented ✅ (N/A - no deviations, aligns met principles)

**Artifacts Generated**:
- ✅ specs/044-in-het-volgende/spec.md
- ✅ specs/044-in-het-volgende/plan.md (this file)
- ✅ specs/044-in-het-volgende/research.md
- ✅ specs/044-in-het-volgende/data-model.md
- ✅ specs/044-in-het-volgende/contracts/client-validation.contract.md
- ✅ specs/044-in-het-volgende/quickstart.md
- ✅ specs/044-in-het-volgende/tasks.md (10 tasks generated)
- ✅ CLAUDE.md updated with feature context

---
*Based on Tickedify Development Principles - See CLAUDE.md*
