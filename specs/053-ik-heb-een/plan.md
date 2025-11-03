
# Implementation Plan: Fix Laatste Werkdag Maandelijkse Herhaling

**Branch**: `053-ik-heb-een` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/053-ik-heb-een/spec.md`

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
Bug fix voor maandelijkse herhalende taken met "laatste werkdag" patroon. Het systeem slaat momenteel een maand over bij het aanmaken van de volgende instantie (31/10 → 31/12 i.p.v. 30/11). De bug zit in de JavaScript datum berekening logica in server.js waar `setMonth(targetMonth + 1)` een extra maand toevoegt bovenop de `interval` die al was toegepast.

## Technical Context
**Language/Version**: Node.js 18.x, Vanilla JavaScript (ES6+)
**Primary Dependencies**: Express.js 4.x, PostgreSQL client (pg package)
**Storage**: PostgreSQL (Neon cloud database) - `taken` table met `herhaling_type` en `verschijndatum` kolommen
**Testing**: Direct API testing via curl, regression testing op staging (dev.tickedify.com)
**Target Platform**: Vercel serverless functions (Node.js runtime)
**Project Type**: Web (frontend: Vanilla JS, backend: Express.js API)
**Performance Goals**: Instant date calculation (<1ms), no user-facing latency
**Constraints**: Must maintain backwards compatibility met alle bestaande herhalingspatronen, geen database schema changes
**Scale/Scope**: Single function fix in server.js (2 locaties), affects ALL users met monthly-weekday recurring tasks

**Bug Locations Identified**:
- `server.js:7946-7954` - `monthly-weekday-last-workday` pattern in test endpoint
- `server.js:7642-7649` - `laatste-werkdag-maand` Dutch pattern (same bug)
- Both use `setMonth(targetMonth + 1)` which adds +1 month AFTER interval was already applied

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze - Production Stability ✅ PASS
- ✅ No direct push to main branch planned
- ✅ Development op feature branch `053-ik-heb-een`
- ✅ Testing via staging branch → dev.tickedify.com
- ✅ No live database wijzigingen (pure business logic fix)
- ✅ Merge naar main ALLEEN na expliciete gebruiker approval

### Staging-First Deployment ✅ PASS
- ✅ Feature branch development
- ✅ Merge naar staging voor testing
- ✅ Automatische deployment naar dev.tickedify.com
- ✅ Full regression testing voordat productie overwogen wordt

### Gespecialiseerde Sub-Agents ✅ PASS
- ✅ Planning fase: Main agent (dit document)
- ✅ Implementation: **tickedify-bug-hunter** agent (dit is een bug fix)
- ✅ Testing: **tickedify-testing** agent (regression tests na fix)

### Versioning & Changelog Discipline ✅ PASS
- ✅ Version bump vereist: patch level (bijvoorbeeld 0.21.33 → 0.21.34)
- ✅ Changelog update: 🔧 FIX categorie met duidelijke beschrijving
- ✅ Commit message format: beschrijvend met bug beschrijving

### Deployment Verification Workflow ✅ PASS
- ✅ 15-seconden iteratieve check van `/api/version` endpoint
- ✅ curl flags: `curl -s -L -k` voor alle API calls
- ✅ Staging verificatie op dev.tickedify.com
- ✅ Regression test suite uitvoeren na deployment

### Test-First via API ✅ PASS
- ✅ Direct API testing via test endpoints (bijv. `/api/test-recurring-next/:pattern/:baseDate`)
- ✅ Test scenarios: 31/10→30/11, 30/11→31/12, 31/12→31/01, 28/02→31/03
- ✅ Edge case testing: schrikkeljaren, maanden met 28/29/30/31 dagen
- ✅ No UI testing nodig (pure backend business logic)

### Complexity Justification ✅ PASS
- ✅ Simple bug fix: 2 regel wijziging in bestaande functie
- ✅ No new dependencies of architectuur changes
- ✅ No additional complexity introduced
- ✅ Backwards compatible met alle bestaande patterns

**GATE STATUS**: ✅ ALL GATES PASSED - Ready for Phase 0

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

**Structure Decision**: [DEFAULT to Option 1 unless Technical Context indicates web/mobile app]

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
- Contract tests: API endpoint verification tasks
- Implementation: 2 code fixes in server.js (Location 1 & Location 2)
- Regression tests: Run quickstart.md test suite
- Version & changelog updates

**Ordering Strategy**:
- Test setup first: Prepare test environment
- Implementation: Fix bug at both locations [P] (can be done in parallel or sequence)
- Version bump: Update package.json
- Changelog: Document fix with 🔧 FIX category
- Git commit: Descriptive message
- Deploy to staging: Push to staging branch
- Verification: Run regression test suite
- User acceptance: Final approval

**Estimated Output**: 12-15 numbered, ordered tasks in tasks.md

**Complexity Note**: This is a simple bug fix, so task count is LOW compared to new features.

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
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none required - simple bug fix)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
