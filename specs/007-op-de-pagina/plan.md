
# Implementation Plan: Verberg Uitklapbare Blokken Dagelijkse Planning

**Branch**: `007-op-de-pagina` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-op-de-pagina/spec.md`

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
Verberg twee uitklapbare blokken ("⏰ Tijd" en "🔒 Geblokkeerd & Pauzes") op de dagelijkse planning pagina door middel van CSS visibility hiding. De blokken bevinden zich in de planning-sidebar (links) en worden dynamisch gegenereerd in `app.js` `renderDagelijksePlanning()` functie. Code blijft intact voor toekomstige heractivering.

## Technical Context
**Language/Version**: JavaScript ES6+, Node.js 16+
**Primary Dependencies**: Vanilla JavaScript (frontend), Express.js (backend), CSS3
**Storage**: N/A (geen data wijzigingen)
**Testing**: Manual browser testing op tickedify.com/app
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web (frontend only voor deze feature)
**Performance Goals**: N/A (pure CSS styling change)
**Constraints**: Moet responsive blijven, geen JavaScript nodig voor hiding
**Scale/Scope**: Eenvoudige CSS wijziging, 2 UI elementen, ~5 regels CSS
**Identified Elements**:
- `#tijd-sectie` (regel 8004-8015 in app.js) - Tijd instellingen block
- `#templates-sectie` (regel 8018-8039 in app.js) - Geblokkeerd & Pauzes block

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **PASS** - Constitution file is currently a template placeholder. No specific principles to violate.

**Analysis**:
- Simple CSS styling change (display: none)
- No new architecture, no new libraries, no new patterns
- No data model changes, no API changes
- Minimal complexity, easily reversible
- Follows existing Tickedify patterns for UI modifications

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

**Structure Decision**: Web application (Option 2) - Tickedify heeft public/ (frontend) en server.js (backend), maar deze feature raakt alleen frontend CSS

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
- Generate tasks from quickstart.md test scenarios
- Geen contract tests nodig (geen API changes)
- Geen model creation nodig (geen data changes)
- Pure CSS implementation task
- Visual verification tasks from quickstart

**Ordering Strategy**:
1. CSS Implementation task (add 2 rules to styles.css)
2. Manual testing task (visual verification)
3. Responsive testing task (mobile/tablet/desktop)
4. Code integrity verification task (check DOM elements still exist)
5. Deployment task (commit, push, verify)

**Estimated Output**: 5-7 simple, ordered tasks in tasks.md

**Simplicity Note**: Deze feature is zo eenvoudig dat de task list zeer minimaal zal zijn:
- 1 CSS implementation task
- 4-5 verification/testing tasks
- Totaal ~10 minuten werk

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
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 4: Implementation complete (v0.16.32)
- [x] Phase 5: Validation passed (productie testing geslaagd)

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - geen deviations)

**Artifacts Generated**:
- [x] spec.md (feature specification)
- [x] plan.md (this file)
- [x] research.md (technical decisions)
- [x] data-model.md (N/A for CSS feature)
- [x] contracts/README.md (N/A for CSS feature)
- [x] quickstart.md (user story validation)
- [x] CLAUDE.md updated (agent context)
- [x] tasks.md (5 implementation tasks)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
