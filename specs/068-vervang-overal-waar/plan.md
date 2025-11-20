
# Implementation Plan: Replace "Due Date" with "Appear Date"

**Branch**: `068-vervang-overal-waar` | **Date**: 2025-11-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/068-vervang-overal-waar/spec.md`

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
Replace all user-facing occurrences of "Due Date" with "Appear Date" throughout the Tickedify application. This is a UI/UX terminology change to better reflect the Baas Over Je Tijd methodology where dates indicate when tasks appear on daily planning, not when they're due. No database schema or API changes required - only frontend text, voice responses, and email templates.

## Technical Context
**Language/Version**: Node.js 16+ (backend), Vanilla JavaScript ES6+ (frontend)
**Primary Dependencies**: Express.js (backend), No frontend frameworks (vanilla JS)
**Storage**: PostgreSQL via Neon (no schema changes for this feature)
**Testing**: Playwright for browser automation, manual API testing
**Target Platform**: Web application (desktop, tablet, mobile responsive)
**Project Type**: Web (frontend + backend, but only frontend changes needed)
**Performance Goals**: N/A (text replacement only, no performance impact)
**Constraints**:
  - MUST NOT change database field names (verschijndatum remains)
  - MUST NOT change API property names (internal naming unchanged)
  - MUST NOT change code variable names (internal naming unchanged)
  - MUST maintain backwards compatibility (no breaking changes)
**Scale/Scope**: ~10 HTML files, ~5 JS files, 2-3 email templates, voice mode responses

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Beta Freeze - Production Stability ✅ PASS
- No changes to main branch (feature branch only)
- Will deploy to staging first (dev.tickedify.com)
- No production database changes
- No live deployment without explicit approval

### II. Staging-First Deployment ✅ PASS
- Feature branch: 068-vervang-overal-waar
- Will merge to staging for testing on dev.tickedify.com
- Main branch remains stable for beta users

### III. Gespecialiseerde Sub-Agents ✅ PASS
- Will use tickedify-testing for UI verification
- Simple text replacement, no complex debugging needed

### IV. Versioning & Changelog Discipline ✅ PASS
- Will increment version in package.json
- Will update changelog with terminology change
- Clear communication to users about the change

### V. Deployment Verification Workflow ✅ PASS
- Will use automated verification after 15 seconds
- Will check /api/version endpoint
- Will use curl -s -L -k flags

### VI. Test-First via API ⚠️ PARTIAL
- This is primarily a UI/text change
- Will verify via browser inspection (Playwright)
- No API changes needed, so API testing not applicable

**Overall Constitution Check**: ✅ PASS (all applicable requirements met)

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

**Structure Decision**: Tickedify uses a flat structure (not Option 1, 2, or 3):
- Root level: server.js (backend), public/ (frontend static files)
- No src/ directory - direct file organization
- Frontend: public/index.html, public/app.js, public/style.css
- Backend: server.js, database.js in root
- Email templates: Inline in server.js or separate template files

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
- [x] Phase 2: Task planning approach described (ready for /tasks command)
- [x] Phase 3: Tasks generated (/tasks command) - 15 tasks in tasks.md
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (re-evaluated after Phase 1)
- [x] All NEEDS CLARIFICATION resolved (none existed - straightforward text change)
- [x] Complexity deviations documented (none - simple feature)

**Artifacts Generated**:
- [x] research.md - All locations identified, testing strategy defined
- [x] data-model.md - Confirmed no data changes required
- [x] contracts/ui-text-contract.md - UI text specification with testing checklist
- [x] quickstart.md - 15-minute manual verification guide
- [x] CLAUDE.md updated - Agent context incremented with feature tech stack

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
