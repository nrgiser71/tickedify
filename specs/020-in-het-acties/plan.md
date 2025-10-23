# Implementation Plan: Fix Drag & Drop Popup Week Display Bug

**Branch**: `020-in-het-acties` | **Date**: 2025-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-in-het-acties/spec.md`

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

**Bug**: Drag & drop popup in Acties screen shows incorrect weeks on Sunday. When user drags a task on Sunday, the popup displays next week + week after instead of current week + next week.

**Root Cause**: Week calculation in `generateActiesWeekDays()` (app.js:11245) uses formula `vandaag.getDate() - vandaag.getDay() + 1` which calculates next Monday instead of current week Monday when `getDay()` returns 0 (Sunday).

**Fix**: Implement ternary operator to handle Sunday as special case: `dagVanWeek === 0 ? -6 : -(dagVanWeek - 1)` to correctly calculate days back to Monday of current week.

**Impact**: Frontend-only fix, no API/database changes, single line modification, backward compatible.

## Technical Context
**Language/Version**: JavaScript ES6+ (Vanilla JavaScript, no frameworks)
**Primary Dependencies**: None (native JavaScript Date API only)
**Storage**: N/A (frontend-only bugfix)
**Testing**: Manual testing + Playwright browser automation
**Target Platform**: Modern browsers (Chrome, Safari, Firefox, Edge)
**Project Type**: Web application (frontend component fix)
**Performance Goals**: < 1ms for date calculation, 60 fps UI responsiveness
**Constraints**: Must work on all modern browsers, no external libraries, maintain backward compatibility
**Scale/Scope**: Single function modification (~3 lines), affects 1 UI component (drag & drop popup)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: No constitution file found at `.specify/memory/constitution.md` - constitution template is placeholder only.

### Tickedify Development Principles (from CLAUDE.md)

✅ **PASS**: All deployment rules followed
- Working on feature branch `020-in-het-acties` (not main)
- Will follow staging → production workflow
- No unauthorized production deployments

✅ **PASS**: Changelog maintenance
- Will update `public/changelog.html` with bugfix entry
- Will increment version in `package.json`

✅ **PASS**: Testing requirements
- Manual testing plan defined in quickstart.md
- Playwright automated test strategy documented
- All 6 test scenarios identified (Sun-Sat, boundaries)

✅ **PASS**: Frontend-only change
- No database migrations required
- No API endpoint changes
- No backend logic modifications
- Single function modification in app.js

**Constitution Status**: ✅ PASS - All Tickedify development rules satisfied

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

**Structure Decision**: Option 1 (Single project) - Tickedify uses monolithic structure with `public/` for frontend and `server.js` for backend. Bug fix affects only `public/app.js`.

## Phase 0: Outline & Research

✅ **COMPLETED** - See [research.md](./research.md)

**Key Findings**:
1. **Bug Location**: `public/app.js:11245` - Function `generateActiesWeekDays()`
2. **Root Cause**: Formula `vandaag.getDate() - vandaag.getDay() + 1` fails on Sunday (getDay() = 0)
3. **Solution**: Ternary operator `dagVanWeek === 0 ? -6 : -(dagVanWeek - 1)`
4. **Testing**: 6 test scenarios identified (Sunday through Saturday, plus boundaries)
5. **Risk**: LOW - Single line change, pure calculation, no side effects
6. **Effort**: ~1 hour total (5 min code, 30 min testing, 15 min docs)

**No unknowns remain** - All technical context clarified through research.

## Phase 1: Design & Contracts

✅ **COMPLETED** - See generated artifacts below

### Artifacts Generated

1. ✅ **data-model.md** - See [data-model.md](./data-model.md)
   - No new entities (frontend bugfix only)
   - Documented UI component structure (Day Zone DOM elements)
   - Defined week calculation logic and edge cases
   - Validation rules for date calculations

2. ✅ **contracts/week-calculation.contract.md** - See [contracts/week-calculation.contract.md](./contracts/week-calculation.contract.md)
   - Function signature for `berekenHuidigeWeekStart()`
   - Input/output contracts with behavioral guarantees
   - 6 test case specifications with assertions
   - Performance contract (O(1) time/space)
   - Integration points and side effects documented

3. ✅ **quickstart.md** - See [quickstart.md](./quickstart.md)
   - 2-minute quick validation steps
   - 15-minute comprehensive test suite
   - Playwright automated test code
   - Manual regression checklist
   - Rollback procedure
   - Success criteria and troubleshooting

4. ⏭️ **Agent context update** - Skipped (not needed for single-function bugfix)
   - No new architecture patterns introduced
   - No new dependencies added
   - Existing CLAUDE.md already covers development workflow

### Design Decisions

**No API Contracts**: This is a frontend-only bugfix with no API changes
**No Database Schema**: No persistence layer modifications required
**No Integration Tests**: Pure calculation fix, covered by unit tests
**Contract Testing**: Function contract defines expected behavior for all scenarios

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

Since this is a **simple bugfix** (not a complex feature), tasks will be minimal and focused:

1. **Fix Implementation Task**
   - Modify `public/app.js:11245` in `generateActiesWeekDays()`
   - Replace buggy calculation with ternary operator fix
   - Add inline comment explaining Sunday edge case

2. **Version & Changelog Tasks**
   - Increment version in `package.json`
   - Add changelog entry to `public/changelog.html`

3. **Testing Tasks** (based on quickstart.md scenarios)
   - Manual test: Sunday scenario (primary bug case)
   - Manual test: Monday-Saturday scenarios
   - Manual test: Month boundary scenario
   - Manual test: Year boundary scenario
   - Optional: Playwright automated test

4. **Deployment Tasks**
   - Commit changes to feature branch
   - Push to staging (develop branch)
   - Verify staging deployment
   - Test on staging environment
   - Create PR for production (main branch)

### Ordering Strategy

**Sequential Execution** (no parallelization needed for simple fix):
1. Code fix → 2. Version bump → 3. Testing → 4. Deployment

**Estimated Output**: 8-10 tasks in tasks.md (much simpler than typical 25-30 task features)

### Complexity Note

This is a **LOW complexity bugfix** with minimal task breakdown needed. The /tasks command will generate a streamlined task list appropriate for a single-function fix rather than a multi-component feature implementation.

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - This bugfix follows all Tickedify development principles:
- ✅ Simple, focused change (single function modification)
- ✅ No unnecessary abstraction or complexity
- ✅ No new dependencies or libraries
- ✅ Follows existing code patterns
- ✅ Maintains backward compatibility


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅ - See research.md
- [x] Phase 1: Design complete (/plan command) ✅ - See data-model.md, contracts/, quickstart.md
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅ - Strategy documented above
- [x] Phase 3: Tasks generated (/tasks command) ✅ - See tasks.md
- [x] Phase 4: Implementation complete ✅ - Deployed to production v0.19.96
- [x] Phase 5: Validation passed ✅ - Production deployment verified

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅ - All Tickedify principles followed
- [x] Post-Design Constitution Check: PASS ✅ - No new violations introduced
- [x] All NEEDS CLARIFICATION resolved ✅ - No unknowns remain
- [x] Complexity deviations documented ✅ - None (simple bugfix)

**Artifacts Generated**:
- [x] research.md - Bug analysis and solution strategy
- [x] data-model.md - UI component structure and validation rules
- [x] contracts/week-calculation.contract.md - Function behavioral contract
- [x] quickstart.md - Testing and validation guide
- [x] plan.md (this file) - Complete implementation plan
- [x] tasks.md - Task breakdown and execution tracking

**Implementation Complete** ✅
**Deployed to Production**: 2025-10-19T20:40:33.734Z
**Version**: 0.19.96
**Commit**: 79079cd

---
*Based on Tickedify Development Principles - See CLAUDE.md*
