
# Implementation Plan: Bulk Edit Translation to English

**Branch**: `046-bij-een-bulk` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/046-bij-een-bulk/spec.md`

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
Translate remaining Dutch text in bulk edit interface to English. Specifically: "Opvolgen" button and day-of-week names. This is a simple text translation task requiring only frontend changes to maintain consistent English UI across the application.

## Technical Context
**Language/Version**: JavaScript (Vanilla JS, ES6+)
**Primary Dependencies**: None (existing Tickedify frontend code)
**Storage**: N/A (text-only changes)
**Testing**: Browser-based UI verification on dev.tickedify.com
**Target Platform**: Web browser (Chrome, Firefox, Safari)
**Project Type**: Web application (single structure: public/ for frontend, server.js for backend)
**Performance Goals**: N/A (instant text display)
**Constraints**: Must preserve all existing button functionality
**Scale/Scope**: Very small - 2 translation items (1 button label + day names)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Beta Freeze - Production Stability**: ✅ PASS
- No main branch changes during freeze
- All testing via staging branch (dev.tickedify.com)
- No production deployment until freeze lifted

**II. Staging-First Deployment**: ✅ PASS
- Feature branch → staging → testing on dev.tickedify.com
- No direct production deployment

**III. Gespecialiseerde Sub-Agents**: ⚠️ RECOMMENDED
- Consider tickedify-testing agent for UI verification after implementation
- Not strictly required for this simple translation task

**IV. Versioning & Changelog Discipline**: ✅ PASS
- Version bump required (patch level)
- Changelog update required with 🎯 improvement category

**V. Deployment Verification Workflow**: ✅ PASS
- Check /api/version endpoint after staging deployment
- Verify version match before UI testing

**VI. Test-First via API**: N/A
- This is UI-only text change, no API logic involved
- Visual verification on staging sufficient

**Result**: No constitution violations. Feature compliant with all applicable principles.

## Project Structure

### Documentation (this feature)
```
specs/046-bij-een-bulk/
├── spec.md              # Feature specification (user requirements)
├── plan.md              # This file (/plan command output) ✅
├── research.md          # Phase 0 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
├── data-model.md        # NOT NEEDED (no entities)
├── contracts/           # NOT NEEDED (no API changes)
└── tasks.md             # Phase 2 output (/tasks command - NOT created yet)
```

### Source Code (repository root)
```
Tickedify uses a web application structure:

public/
├── app.js               # Main application file (TARGET FILE for changes)
│   ├── Line 4757: dagenVanDeWeek array (Dutch → English)
│   └── Line 12667: "Opvolgen" button (Dutch → English)
├── index.html
├── style.css
└── changelog.html       # TARGET FILE for version documentation

server.js                # Backend (NO CHANGES needed)
package.json            # TARGET FILE for version bump
```

**Structure Decision**: Web application with single structure (public/ for frontend, server.js for backend)

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
This is a simple translation feature with minimal implementation tasks:
1. Version bump in package.json (mandatory per constitution)
2. Update day-of-week array in app.js (line 4757)
3. Update "Opvolgen" button text in app.js (line 12667)
4. Update changelog with improvement entry
5. Visual verification on staging

**No Tests Required**:
- No API endpoints changed (no contract tests)
- No database schema changes (no model tests)
- No new functionality (no integration tests)
- Visual verification via quickstart.md sufficient

**Ordering Strategy**:
Sequential execution (all changes in same file):
1. Version bump (blocks deployment verification)
2. Code changes in app.js
3. Changelog update
4. Git commit and push to staging
5. Deployment verification
6. UI testing via quickstart.md

**Estimated Output**: 5-7 numbered, sequential tasks in tasks.md

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
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none - feature is compliant)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
