# Implementation Plan: Alfabetisch Gesorteerde Contexten in Taak-Aanpas Popup

**Branch**: `040-in-de-popup` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/040-in-de-popup/spec.md`

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
De contexten dropdown in de taak-aanpas popup is momenteel gesorteerd op aanmaakdatum (nieuwste eerst). Deze feature voegt alfabetische sortering (A-Z, case-insensitive) toe om de vindbaarheid te verbeteren. De implementatie wijzigt de database query in `database.js` van `ORDER BY aangemaakt DESC` naar `ORDER BY LOWER(naam) ASC` voor Nederlandse locale-aware sortering.

## Technical Context
**Language/Version**: JavaScript (ES6+), Node.js Express backend, Vanilla JavaScript frontend
**Primary Dependencies**: PostgreSQL (Neon database), Express.js server, Vanilla JS (geen frameworks)
**Storage**: PostgreSQL database - tabel `contexten` met kolommen: id, naam, aangemaakt, user_id
**Testing**: Browser-based manual testing op dev.tickedify.com (staging) en tickedify.com (productie)
**Target Platform**: Web application - modern browsers, responsive design
**Project Type**: Web (frontend + backend, maar monolitische structuur in één repo)
**Performance Goals**: N/A (eenvoudige UI wijziging, geen performance impact verwacht)
**Constraints**: Case-insensitive sortering, Nederlandse locale ondersteuning voor accenten/speciale tekens
**Scale/Scope**: Kleine feature - 1 database query wijziging, mogelijk client-side fallback voor edge cases

**Implementation Locations Identified**:
- **Primary**: `database.js` regel 584 - Database query sortering
- **Secondary**: `app.js` regel 4356-4367 - `vulContextSelect()` client-side fallback
- **Testing**: `index.html` regel 354-361 - Context dropdown HTML element

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Tickedify project heeft geen constitution.md met specifieke principes gedefinieerd. De template toont placeholder principes. Voor dit project gelden de standaard development practices uit CLAUDE.md:

✅ **Staging First Deployment**: Feature wordt eerst getest op dev.tickedify.com (staging branch)
✅ **Bèta Freeze Respect**: Geen productie deployment naar main branch zonder expliciete approval
✅ **Changelog Maintenance**: Elke wijziging wordt gedocumenteerd in changelog.html
✅ **Version Tracking**: Package.json versie wordt ge-increment bij elke deployment
✅ **Test-Before-Merge**: Feature wordt getest op staging voordat merge overwogen wordt

**Applicable Gates voor deze feature**:
- [ ] Database query wijziging is backward compatible (geen schema changes)
- [ ] Sortering werkt correct voor edge cases (accenten, cijfers, lege strings)
- [ ] Performance impact is minimaal (sortering in database is efficient)
- [ ] Client-side fallback aanwezig voor consistentie

**Complexity Assessment**: EENVOUDIG - Single query wijziging, geen nieuwe dependencies of architectuur changes

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
- Focus on implementation simplicity (single query change)
- Testing tasks focus on manual verification + optional automation

**Proposed Task Breakdown**:

1. **[P] Update database query** - Wijzig ORDER BY in database.js:584
2. **[P] Add client-side fallback** - Sorteer in vulContextSelect() als backup
3. **Manual test on staging** - Visuele verificatie via browser
4. **API contract test** - Verify endpoint returned sorted data
5. **Edge case testing** - Test accenten, cijfers, case-insensitive
6. **Consistency verification** - Check alle popups (nieuwe/bewerk)
7. **Update changelog** - Documenteer feature in changelog.html
8. **Version bump** - Increment package.json version
9. **Deploy to staging** - Push naar staging branch, verify deployment
10. **Regression testing** - Ensure geen side-effects in andere features

**Ordering Strategy**:
- Implementation first (database + client-side)
- Testing second (manual → automated)
- Documentation third (changelog)
- Deployment last (staging → wait for production approval)

**Estimated Output**: ~10 numbered, ordered tasks in tasks.md

**Complexity**: 🟢 LOW - Simple implementation, straightforward testing

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
- [x] Phase 3: Tasks generated (/tasks command) ✅ 2025-10-30 - 10 numbered tasks in tasks.md
- [ ] Phase 4: Implementation complete - READY TO EXECUTE
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅ (Tickedify development practices followed)
- [x] Post-Design Constitution Check: PASS ✅ (No complexity issues)
- [x] All NEEDS CLARIFICATION resolved ✅ (None found)
- [x] Complexity deviations documented ✅ (None - simple feature)

**Artifacts Generated**:
- [x] research.md (Phase 0) - Database sortering research
- [x] data-model.md (Phase 1) - Contexten entity documentation
- [x] contracts/api-contexten.md (Phase 1) - API contract with tests
- [x] quickstart.md (Phase 1) - Comprehensive testing guide
- [x] CLAUDE.md updated (Phase 1) - Agent context updated
- [x] tasks.md (Phase 3) - 10 numbered implementation tasks

**Ready for Next Phase**: ✅ YES - Execute tasks T001-T010 in tasks.md

---
*Based on Tickedify development practices - See `CLAUDE.md`*
