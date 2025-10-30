
# Implementation Plan: Bulk Eigenschappen Bewerking

**Branch**: `043-op-het-acties` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/043-op-het-acties/spec.md`

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
Implementeer bulk eigenschappen bewerking voor het Acties scherm: gebruikers kunnen 2+ taken selecteren in bulk mode en via een modal popup meerdere eigenschappen tegelijk aanpassen (Project, Datum, Context, Priority, Estimated time duration). Button onderaan scherm activeert popup, JavaScript confirm() dialog voor bevestiging, toast feedback na toepassing, consistent met bestaande bulk acties patterns.

## Technical Context
**Language/Version**: JavaScript (ES6+) frontend, Node.js backend, vanilla JavaScript (no framework)
**Primary Dependencies**: Express.js backend, PostgreSQL (Neon), Vercel hosting, existing toast/loading utilities
**Storage**: PostgreSQL database - existing `taken` table with columns: project_id, verschijndatum, context, prioriteit, estimated_time_minutes
**Testing**: Playwright for browser automation testing (via tickedify-testing agent)
**Target Platform**: Web application (Chrome/Firefox/Safari), responsive design
**Project Type**: Web (frontend + backend integrated in single codebase)
**Performance Goals**: <500ms per task update (FR-002), handle 100+ tasks with progress indicator
**Constraints**: Must maintain consistency with existing bulk actions patterns, no framework dependencies (vanilla JS)
**Scale/Scope**: Beta users (since October 2025), ~10k tasks database scale, single-page app architecture
**Existing Patterns**:
- Bulk actions: `bulkDateAction()`, `bulkVerplaatsNaar()` in app.js:12300-12484
- Modal popups: recurring task popup, priority popup (existing patterns)
- Toast feedback: `toast.success()`, `toast.warning()`, `toast.error()`
- Loading: `loading.showWithProgress()`, `loading.updateProgress()`
- API: REST endpoints `/api/taak/:id` (PUT for updates)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No constitution file found, using Tickedify development principles from CLAUDE.md

**Tickedify Principles Applied**:
- ✅ Staging-first deployment: Feature developed on `043-op-het-acties` branch, tested on staging before any production consideration
- ✅ Beta freeze respected: No production deployment, all development stays on staging environment
- ✅ Autonomous development: Feature can be developed and tested independently on staging
- ✅ Changelog maintenance: Will update changelog with every code change
- ✅ Architecture documentation: Will update ARCHITECTURE.md with new function locations
- ✅ Sub-agent usage: Will use tickedify-testing agent for browser testing, tickedify-feature-builder for implementation

**No Constitutional Violations Detected**

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

**Structure Decision**: Tickedify uses integrated web structure (not Option 1, 2, or 3):
```
public/
├── app.js              # Main application logic (TaskManager class)
├── style.css           # Styles including modal/popup patterns
├── index.html          # SPA entry point
└── changelog.html      # Version history

server.js               # Express backend with REST API
db.js                   # PostgreSQL connection (Neon)
ARCHITECTURE.md         # Codebase structure documentation

specs/043-op-het-acties/
├── plan.md            # This file
├── research.md        # Phase 0 output
├── data-model.md      # Phase 1 output
├── quickstart.md      # Phase 1 output
├── contracts/         # Phase 1 output (API contracts)
└── tasks.md           # Phase 2 output (created by /tasks command)
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
1. **Frontend HTML/CSS**: Modal popup structure in index.html + styles
2. **Frontend JavaScript**:
   - `showBulkEditPopup()` modal handling
   - `populateBulkEditDropdowns()` data loading
   - `collectBulkEditUpdates()` form collection
   - `bulkEditProperties()` main execution function
3. **Integration**: Add button to bulk actions row in `getBulkVerplaatsKnoppen()`
4. **Testing**: Playwright E2E test scenarios (via tickedify-testing agent)
5. **Documentation**: Update ARCHITECTURE.md, changelog.html
6. **Validation**: Run quickstart.md test scenarios

**Ordering Strategy**:
1. HTML structure first (popup markup)
2. CSS styling (modal styling)
3. JavaScript helpers (popup, dropdowns, collection) [P]
4. Main bulk edit function (orchestration)
5. Integration with bulk actions (button)
6. E2E tests (validation)
7. Documentation updates [P]

**Dependencies**:
- HTML before JavaScript
- Helper functions before main function
- Integration before testing
- No backend changes needed (reuses existing API)

**Estimated Output**: ~15-20 numbered, ordered tasks in tasks.md

**Key Simplification**: No API changes, no database schema changes - purely frontend enhancement.

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
- [x] Phase 0: Research complete (/plan command) ✅ 2025-10-30
- [x] Phase 1: Design complete (/plan command) ✅ 2025-10-30
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅ 2025-10-30
- [ ] Phase 3: Tasks generated (/tasks command) - Ready to execute
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented: N/A (no deviations) ✅

**Artifacts Created**:
- [x] research.md - All decisions documented
- [x] data-model.md - BulkEditCommand and BulkEditResult entities
- [x] contracts/api-contract.md - API usage patterns and contract tests
- [x] quickstart.md - 10 test scenarios + Playwright automation
- [x] CLAUDE.md updated - Agent context synchronized

**Next Command**: `/tasks` - Generate implementation tasks from design artifacts

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
