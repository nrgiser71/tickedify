
# Implementation Plan: Context Management Titel Bug Fix

**Branch**: `051-als-ik-in` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/051-als-ik-in/spec.md`

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
**Bug**: De pagina titel "Contexten Beheer" blijft persistent staan wanneer gebruiker navigeert van Context Management naar een ander menu item in de sidebar.

**Root Cause**: Context Management gebruikt `data-tool="contextenbeheer"` attribute en `openTool()` functie, terwijl andere lijst items `data-lijst` gebruiken en `navigeerNaarLijst()` aanroepen. De titel update logica in `navigeerNaarLijst()` wordt geblokeerd door de `titleAlreadySet` flag wanneer `restoreNormalContainer()` wordt aangeroepen, maar deze container restore update de titel niet altijd correct.

**Fix Approach**: Consistente titel management door expliciete titel clear/update bij navigatie vanuit Context Management (en andere tool sections) naar reguliere lijst items.

## Technical Context
**Language/Version**: Vanilla JavaScript (ES6+), Node.js 18+ (backend)
**Primary Dependencies**: None (frontend is vanilla JS), Express.js (backend niet relevant voor deze fix)
**Storage**: N/A (geen database wijzigingen voor UI bug fix)
**Testing**: Playwright browser automation voor UI testing
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend only voor deze fix)
**Performance Goals**: Instant visual update (<16ms, single frame)
**Constraints**: Geen regressie in andere menu items, backwards compatible met huidige navigatie flow
**Scale/Scope**: Single file wijziging (`public/app.js`), ~5-10 regels code aanpassing

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Research)
- ✅ **Beta Freeze Compliance**: Bug fix op staging branch, geen productie deployment tijdens freeze
- ✅ **Staging-First**: Alle testing op dev.tickedify.com via staging branch
- ✅ **Sub-Agent Usage**: `tickedify-bug-hunter` voor debugging, `tickedify-testing` voor verificatie
- ✅ **Version & Changelog**: Patch version bump + changelog entry verplicht
- ✅ **Test-First via API**: N/A (UI bug, Playwright testing vereist)
- ✅ **Deployment Verification**: `curl -s -L -k https://dev.tickedify.com/api/version` voor staging check
- ✅ **Simplicity First**: Minimale code change, geen architecturale wijzigingen
- ✅ **No Complexity Justification Needed**: Bug fix in bestaande code, geen nieuwe patterns

**Status**: PASS - Geen constitutional violations

### Post-Design Check (After Phase 1)
- ✅ **Beta Freeze Compliance**: Design vereist geen productie deployment
- ✅ **Staging-First**: Quickstart.md focust op dev.tickedify.com testing
- ✅ **Sub-Agent Usage**: Research documenteert agent usage voor implementation
- ✅ **Version & Changelog**: Workflow in Phase 2 planning
- ✅ **Test-First via API**: N/A (UI testing via Playwright in quickstart.md)
- ✅ **Deployment Verification**: Quickstart.md bevat curl verification steps
- ✅ **Simplicity First**: Research confirms minimale fix approach (Option A)
- ✅ **No New Complexity**: Geen nieuwe patterns, architecturale wijzigingen, of dependencies

**Status**: PASS - Design adheres to constitutional principles

**Risk Assessment**: ✅ **LOW RISK**
- Single function modification in isolated area
- No database, API, or architectural changes
- Comprehensive testing strategy documented
- Backwards compatible (no breaking changes)

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

**Structure Decision**: Option 2 (Web application) - Tickedify heeft backend/ en frontend/ (public/) structuur. Deze fix is frontend-only in `public/app.js`

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
- Generate tasks from Phase 1 design docs (quickstart scenarios, research fix approach)
- **No contract tests** (geen API changes)
- **No model creation** (geen data model changes)
- Focus on implementation + verification tasks

**Task Breakdown Strategy**:
1. **Code Analysis Tasks**: Locate exact code sections that need fixing
2. **Implementation Task**: Apply fix in `restoreNormalContainer()` function
3. **Version & Changelog Tasks**: Bump version + update changelog
4. **Deployment Tasks**: Merge to staging, push, verify deployment
5. **Testing Tasks**:
   - Manual testing via quickstart.md scenarios
   - Playwright automated tests (optional)
   - Regression testing (verify other menu items werk)

**Ordering Strategy**:
- Sequential execution (niet parallel - single file wijziging)
- Order: Code analysis → Implementation → Version bump → Deployment → Testing
- No [P] markers (alle tasks hebben dependencies)

**Estimated Output**: 8-12 numbered, ordered tasks in tasks.md

**Testing Strategy**:
- Manual testing via quickstart.md (6 test scenarios)
- Playwright voor automated regression testing
- Staging deployment verification via curl API check

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations detected** - Geen complexity justification nodig voor deze bug fix.


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ research.md created
- [x] Phase 1: Design complete (/plan command) - ✅ data-model.md, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ Strategy documented
- [x] Phase 3: Tasks generated (/tasks command) - ✅ tasks.md created with 22 sequential tasks
- [x] Phase 4: Implementation complete - ✅ All 22 tasks executed successfully
- [x] Phase 5: Validation passed - ✅ User verified fix works correctly on staging

**Gate Status**:
- [x] Initial Constitution Check: PASS - No violations
- [x] Post-Design Constitution Check: PASS - No new violations
- [x] All NEEDS CLARIFICATION resolved - None in Technical Context
- [x] Complexity deviations documented - None required

**Artifacts Generated**:
- ✅ `specs/051-als-ik-in/spec.md` (existing)
- ✅ `specs/051-als-ik-in/plan.md` (this file)
- ✅ `specs/051-als-ik-in/research.md`
- ✅ `specs/051-als-ik-in/data-model.md`
- ✅ `specs/051-als-ik-in/quickstart.md`
- ✅ `CLAUDE.md` (updated with feature context)
- ✅ `specs/051-als-ik-in/tasks.md` (22 sequential tasks for implementation)

**Constitution Compliance**:
- ✅ Beta Freeze: Staging deployment only, geen productie tijdens freeze
- ✅ Staging-First: Testing op dev.tickedify.com verplicht
- ✅ Sub-Agents: tickedify-bug-hunter + tickedify-testing usage gepland
- ✅ Version & Changelog: Bump + update in tasks.md workflow
- ✅ Deployment Verification: curl API checks in quickstart.md
- ✅ Simplicity First: Minimale fix, geen architecturale wijzigingen

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
