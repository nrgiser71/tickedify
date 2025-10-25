
# Implementation Plan: Fix Duplicate Toast Berichten Bij Postponed Weekly Drag & Drop

**Branch**: `035-wanneer-ik-in` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/035-wanneer-ik-in/spec.md`

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
**Bug**: Duplicate toast notificaties ("Task Moved To Uitgesteld Wekelijks") verschijnen bij drag & drop van taken naar postponed weekly lijst - 7-10+ berichten voor oudere taken, maar correct slechts 1 bericht voor nieuwe taken.

**Root Cause**: Event listener accumulation bug - `setupUitgesteldDropZones()` voegt bij elke render nieuwe event listeners toe zonder oude te verwijderen, waardoor meerdere drop handlers simultaan worden getriggerd bij een drop actie.

**Fix Approach**: Implementeer cleanup van oude event listeners voordat nieuwe worden toegevoegd, zodat precies 1 toast bericht verschijnt per drag & drop actie.

## Technical Context
**Language/Version**: Vanilla JavaScript (ES6+), geen framework
**Primary Dependencies**: Geen - pure DOM API's
**Storage**: N/A (frontend-only bug)
**Testing**: Manual browser testing + regression testing via Playwright
**Target Platform**: Web browsers (Chrome, Firefox, Safari)
**Project Type**: Web (frontend bugfix in public/app.js)
**Performance Goals**: 1 toast bericht per drag & drop actie (< 100ms response time)
**Constraints**: Geen breaking changes aan bestaande drag & drop UX, backwards compatible
**Scale/Scope**: Betreft 5 uitgesteld categories (wekelijks, maandelijks, 3-maandelijks, 6-maandelijks, jaarlijks)

**Bug Locaties**:
- `public/app.js:10981-11001` - `setupUitgesteldDropZones()` (roept setup aan)
- `public/app.js:11003-11046` - `setupDropZone()` (voegt listeners toe ZONDER cleanup)
- `public/app.js:11048-11103` - `handleUitgesteldDrop()` (triggert toast op regel 11089)
- `public/app.js:10796-10861` - `renderUitgesteldConsolidated()` (roept setup aan bij render)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution template is not populated for this project. Skipping constitutional checks.

**Project-Specific Constraints** (from CLAUDE.md):
- ✅ **Bèta Freeze**: Development op feature branch, geen productie deployment
- ✅ **Staging Testing**: Alle changes testen op dev.tickedify.com
- ✅ **Changelog Update**: Verplicht bij elke code wijziging
- ✅ **Version Bump**: package.json versie verhogen bij deployment
- ✅ **No Breaking Changes**: Backwards compatible bugfix

**Gate Status**: PASS - Bugfix voldoet aan project constraints

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

**Structure Decision**: Tickedify gebruikt een custom monolith structuur - geen standaard src/ structuur. Bugfix betreft alleen `public/app.js` (frontend code).

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
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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


## Phase 2: Task Planning Approach

**Task Generation Strategy**:
Deze bugfix is relatief eenvoudig - geen complexe dependencies of TDD cycle nodig.

**Geplande Tasks** (voor /tasks command):
1. **Add cleanupEventListeners() method** [P]
   - Helper method voor element cloning
   - Location: TakenBeheer class in public/app.js
   - ~5 lines code

2. **Update setupUitgesteldDropZones()** [depends on 1]
   - Roep cleanupEventListeners() aan voor elke drop zone
   - Location: public/app.js:10981-11001
   - ~10 lines code wijziging

3. **Manual testing op staging** [depends on 2]
   - Volg quickstart.md test protocol
   - Test op dev.tickedify.com
   - Verify 1 toast per drag & drop

4. **Changelog update** [P]
   - Add bugfix entry to public/changelog.html
   - Version bump in package.json

5. **Git commit & push naar feature branch** [depends on 4]
   - Commit changes op 035-wanneer-ik-in branch
   - Push naar origin

**Ordering Strategy**:
- Linear flow: 1 → 2 → 3 → 4 → 5
- Alleen task 1 en 4 kunnen parallel (marked [P])
- Rest is sequential vanwege dependencies

**Estimated Output**: 5 tasks total in tasks.md

---

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning described (/plan command)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 4: Implementation complete (/implement command)
- [x] Phase 5: Validation passed (manual testing successful)

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (via codebase research)
- [x] Complexity deviations documented (N/A - straightforward fix)

**Artifacts Generated**:
- [x] research.md - Event listener cleanup patterns research
- [x] data-model.md - DOM component state analysis
- [x] quickstart.md - Comprehensive testing protocol
- [x] tasks.md - 5 sequential implementation tasks (T001-T005)
- [ ] contracts/ - N/A (geen API wijzigingen)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
