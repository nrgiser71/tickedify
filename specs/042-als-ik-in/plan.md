
# Implementation Plan: Keyboard Shortcuts Blijven Werken Na Focus Wijziging

**Branch**: `042-als-ik-in` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/042-als-ik-in/spec.md`

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
**Probleem**: Keyboard shortcuts werken niet meer in de taak bewerkingspopup na het klikken op "Project toevoegen" of "Context toevoegen" knoppen. Dit komt doordat de focus verschuift naar deze UI elementen en de keyboard event listeners niet meer triggeren.

**Oplossing**: Wijzig de keyboard shortcut implementatie zodat shortcuts worden gedetecteerd op popup-niveau in plaats van op specifieke elementen, waardoor shortcuts blijven werken ongeacht welk element focus heeft binnen de popup.

## Technical Context
**Language/Version**: JavaScript (ES6+), Vanilla JS (geen frameworks)
**Primary Dependencies**: Geen externe libraries - pure DOM API
**Storage**: N/A (geen data persistence voor deze bugfix)
**Testing**: Manual testing via Playwright browser automation (dev.tickedify.com)
**Target Platform**: Web browsers (Chrome, Firefox, Safari)
**Project Type**: Web application - single page (public/app.js)
**Performance Goals**: <50ms shortcut response tijd
**Constraints**: Alleen taak bewerkingspopup (niet andere popups), geen breaking changes aan bestaande shortcuts
**Scale/Scope**: Bestaande codebase (~13,000 regels app.js), impacteert alleen keyboard event handling logica (app.js:2856-3075, app.js:13633-13700)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No constitutional violations

Dit is een bugfix in bestaande functionaliteit zonder nieuwe architecturale beslissingen. Geen constitution in het project aanwezig, dus geen specifieke regels om te checken. De fix volgt bestaande patterns in de codebase.

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

**Structure Decision**: Bestaande Tickedify structuur - geen nieuwe directories nodig
```
public/
├── app.js              # Hoofdbestand met alle functionaliteit
├── index.html          # Main app HTML met planningPopup element
└── app.css             # Styling (indien nodig voor debugging)
```

Dit is een bugfix in bestaand public/app.js bestand. Geen nieuwe files of directories nodig.

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
Dit is een gerichte UI bugfix met minimale scope. Tasks zullen worden gegenereerd op basis van:
- Research findings (research.md) → Implementation approach
- Quickstart scenarios (quickstart.md) → Test tasks
- Geen contracts (N/A voor UI fix), geen data model wijzigingen

**Geplande tasks**:
1. **Code wijziging**: Update `initPlanningKeyboardShortcuts()` functie
   - Wijzig event listener naar capture phase
   - File: public/app.js (app.js:2856-3075)
   - Duration: ~15 minuten

2. **Version bump & commit**: Update package.json en commit
   - Standard Tickedify workflow
   - Duration: ~5 minuten

3. **Deploy naar staging**: Push naar staging branch
   - Automatische Vercel deployment
   - Duration: ~2 minuten (wait time)

4. **Manual testing**: Execute quickstart.md test scenarios
   - Test alle 11 shortcuts met focus wijzigingen
   - Test edge cases
   - Duration: ~10 minuten

5. **Regression testing**: Verify geen breaking changes
   - Test bestaande popup functionaliteit
   - Check console voor errors
   - Duration: ~5 minuten

6. **Update changelog**: Document de bugfix
   - public/changelog.html
   - Duration: ~5 minuten

**Ordering Strategy**:
- Sequential execution (geen parallelization mogelijk voor dit type fix)
- Deploy → wait → test → verify → document

**Estimated Output**: 6-7 genummerde, sequentiële tasks in tasks.md

**Total estimated time**: ~45 minuten including deployment wait time

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
- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, quickstart.md generated (no contracts needed for UI bugfix)
- [x] Phase 2: Task planning approach described (/plan command - 6-7 tasks estimated)
- [x] Phase 3: Tasks generated (/tasks command) - 7 sequential tasks (T001-T007)
- [x] Phase 4: Implementation complete - All tasks T001-T007 executed successfully
- [x] Phase 5: Validation passed - Manual testing confirmed shortcuts work correctly

**Gate Status**:
- [x] Initial Constitution Check: PASS - No constitution violations
- [x] Post-Design Constitution Check: PASS - UI fix follows existing patterns
- [x] All NEEDS CLARIFICATION resolved - All technical details identified
- [x] Complexity deviations documented - N/A (no deviations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
