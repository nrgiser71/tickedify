
# Implementation Plan: Remove Feedback & Support Block from Sidebar

**Branch**: `061-verwijder-in-de` | **Date**: 2025-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/061-verwijder-in-de/spec.md`

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
Remove the Feedback & Support block from the application sidebar while retaining the instructional video link. This is a UI simplification change that requires no data model modifications or API changes - only frontend HTML/CSS/JavaScript adjustments. The change streamlines the sidebar interface by removing infrequently used UI elements while maintaining access to essential instructional resources.

## Technical Context
**Language/Version**: Vanilla JavaScript (ES6+), HTML5, CSS3
**Primary Dependencies**: None (frontend-only change, no external libraries)
**Storage**: N/A (no data model changes)
**Testing**: Manual UI testing via Playwright on dev.tickedify.com (staging)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge) - responsive design
**Project Type**: Web application (frontend modification only)
**Performance Goals**: Instant UI update, no page reload required
**Constraints**: Must preserve all other sidebar functionality, maintain responsive design across all viewport sizes
**Scale/Scope**: Single HTML file modification (public/app/index.html), CSS cleanup if needed

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Beta Freeze - Production Stability
✅ **PASS** - No production deployment planned. Changes will be:
- Developed on feature branch `061-verwijder-in-de`
- Merged to `staging` branch for testing on dev.tickedify.com
- Main branch remains frozen (no merge until freeze lifted)

### II. Staging-First Deployment
✅ **PASS** - Workflow compliant:
- Feature branch → staging merge → dev.tickedify.com deployment
- Testing on staging environment before any production consideration
- No main branch involvement during development

### III. Gespecialiseerde Sub-Agents
✅ **PASS** - Appropriate agent usage:
- tickedify-testing for UI validation on dev.tickedify.com
- No bug fixes or new features (simple removal operation)

### IV. Versioning & Changelog Discipline
✅ **PASS** - Will be followed:
- package.json version bump (patch increment)
- public/changelog.html update with 🎯 improvement category
- Commit includes both version and changelog updates

### V. Deployment Verification Workflow
✅ **PASS** - Standard verification applies:
- Check /api/version endpoint after staging deployment
- 15-second intervals, 2-minute timeout
- Use `curl -s -L -k` flags

### VI. Test-First via API
✅ **PASS** - UI-only change, visual testing appropriate:
- Playwright browser testing for sidebar visibility
- No API endpoints involved
- Visual verification is the correct testing method for this feature

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

**Structure Decision**: Web application - frontend modification only. Files affected:
- `public/app/index.html` (sidebar HTML structure)
- Possibly `public/app/styles.css` if orphaned styles need cleanup

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


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 16 tasks
- [x] Phase 4: Implementation complete (/implement command) - All tasks executed successfully
- [x] Phase 5: Validation passed - User verified on dev.tickedify.com

**Gate Status**:
- [x] Initial Constitution Check: PASS (all gates green)
- [x] Post-Design Constitution Check: PASS (no design violations)
- [x] All NEEDS CLARIFICATION resolved (none present)
- [x] Complexity deviations documented (none - simple UI change)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
