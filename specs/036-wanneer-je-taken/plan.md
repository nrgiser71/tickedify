
# Implementation Plan: Real-time Sidebar Counter Updates

**Branch**: `036-wanneer-je-taken` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-wanneer-je-taken/spec.md`

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
Sidebar task counters (Inbox, Actions, Uitgesteld, Opvolgen, Projecten) are not updating automatically after task operations. Users must refresh the page to see accurate counts. This feature adds automatic counter updates after every task operation (process inbox, complete tasks, move tasks between lists) by consistently calling the existing `updateSidebarCounters()` function which already fetches fresh counts from the backend `/api/counts/sidebar` endpoint.

**Problem**: Existing code has commented-out counter update calls (`// await this.laadTellingen(); // Disabled - tellers removed from sidebar`) but `updateSidebarCounters()` function exists and works - it's just not being called consistently.

**Solution**: Replace all commented-out `laadTellingen()` calls with `updateSidebarCounters()` calls and add counter updates to any missing locations.

## Technical Context
**Language/Version**: JavaScript ES6+, Node.js 16+
**Primary Dependencies**: Express.js 4.18.2, PostgreSQL (via pg 8.11.3), Vanilla JavaScript (no frontend framework)
**Storage**: PostgreSQL (Neon) - Database schema includes: `taken`, `projecten`, `contexten` tables
**Testing**: Manual testing on staging (dev.tickedify.com), production testing after deployment
**Target Platform**: Web application - Chrome/Firefox/Safari, desktop and mobile
**Project Type**: Web (frontend public/ + backend server.js)
**Performance Goals**: Counter update < 100ms, no perceptible UI lag
**Constraints**: Must work with existing debounced update mechanism (300ms debounce), updates only after successful operations
**Scale/Scope**: ~10,500 lines in app.js, ~6,200 lines in server.js, beta users in production

**Existing Implementation**:
- `updateSidebarCounters()` - app.js:3163 - Fetches counts from `/api/counts/sidebar` and updates DOM
- `debouncedUpdateCounters()` - app.js:3154 - 300ms debounce wrapper
- `GET /api/counts/sidebar` - server.js:4821 - Backend endpoint that returns counts for all 5 lists
- Problem locations (commented-out updates):
  - `verplaatsNaarInbox()` - app.js:4868
  - `stelDatumIn()` - app.js:4926
  - `verplaatsNaarUitgesteld()` - app.js:4963
  - `verplaatsNaarOpvolgen()` - app.js:4995
  - Multiple other task operation functions

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check**: ✅ PASS

This feature does not introduce new architectural complexity:
- ✅ Uses existing `updateSidebarCounters()` function (already implemented in app.js:3163)
- ✅ Uses existing `/api/counts/sidebar` endpoint (already implemented in server.js:4821)
- ✅ No new database tables or schema changes required
- ✅ No new dependencies or libraries
- ✅ Simple fix: add function calls to existing operations
- ✅ Follows existing patterns (async/await, loading states, error handling)
- ✅ No breaking changes to public APIs
- ✅ Maintains backward compatibility

**Complexity**: Extremely low - this is a bug fix that enables existing infrastructure, not a new feature.

## Project Structure

### Documentation (this feature)
```
specs/036-wanneer-je-taken/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Tickedify uses a simple web app structure:
public/
├── app.js              # Main frontend application (10,500+ lines)
├── style.css           # Styling (6,500+ lines)
├── index.html          # Application shell
└── admin.html          # Admin interface

server.js               # Express backend (6,200+ lines)
package.json            # Dependencies
.env                    # Environment configuration
```

**Structure Decision**: Simple web application (single backend file, single frontend file)

**Files to Modify**:
- `public/app.js` - Add `updateSidebarCounters()` calls after task operations
- No backend changes required - `/api/counts/sidebar` endpoint already exists and works

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
This is a simple integration task, not a full feature development:

1. **Search Tasks** - Find all locations with commented `laadTellingen()` calls
2. **Replace Tasks** - For each location, replace with `updateSidebarCounters()`
3. **Verification Tasks** - Test each operation type (14+ locations)
4. **Deployment Tasks** - Version bump, changelog, staging, production

**Estimated Tasks**:
- T001: Grep search for all commented counter update locations (2 min)
- T002-T015: Replace each commented call with active call (1 min each = 14 min)
- T016: Local testing - all operation types (10 min)
- T017: Commit and push changes (3 min)
- T018: Version bump package.json (2 min)
- T019: Update changelog (3 min)
- T020: Deploy to staging and verify (10 min)
- T021: Create PR (DO NOT MERGE - beta freeze) (5 min)

**Total Estimated Time**: 45-50 minutes

**Ordering Strategy**:
- Sequential execution (each depends on previous)
- No parallel tasks (single file modification)
- Test after all replacements complete
- Deploy only after testing passes

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
- [x] Phase 2: Task planning approach documented (awaiting /tasks command)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 27 tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no new complexity)
- [x] Post-Design Constitution Check: PASS (simple integration only)
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none - uses existing infrastructure)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
