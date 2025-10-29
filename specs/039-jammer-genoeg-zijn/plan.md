# Implementation Plan: Complete Remaining English UI Translations

**Branch**: `039-jammer-genoeg-zijn` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/039-jammer-genoeg-zijn/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path → ✅ Loaded
2. Fill Technical Context → ✅ Completed (pure UI translation, no tech changes)
3. Fill the Constitution Check section → ✅ N/A (template constitution, but this is simple bugfix)
4. Evaluate Constitution Check → ✅ PASS (no violations - UI text only)
5. Execute Phase 0 → ✅ NO RESEARCH NEEDED (locations already identified by user)
6. Execute Phase 1 → ✅ MINIMAL (no contracts, no data model, quickstart only)
7. Re-evaluate Constitution Check → ✅ PASS (no new violations)
8. Plan Phase 2 → ✅ Describe task generation (simple translation tasks)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phase 2 will be executed by /tasks command.

## Summary
**Translation Bugfix**: 11 specific screen areas still display Dutch text after v0.20.9 translation fix. User provided exhaustive list of all remaining Dutch strings across Actions, Projects, Postponed, Daily Planning, Context Management, and Search screens. This is a continuation of translation work that was partially reverted by hotfix merge d83a29d on October 25.

**Technical Approach**: Locate and translate ALL remaining Dutch strings in public/app.js and public/index.html. No backend changes, no database changes, no new functionality - purely UI text replacement using patterns from successful v0.20.9 translation (commit 9743d39).

## Technical Context
**Language/Version**: JavaScript (Vanilla JS), HTML5 - existing Tickedify stack
**Primary Dependencies**: None (editing existing files only)
**Storage**: N/A (no data changes)
**Testing**: Manual visual verification on all 11 screens
**Target Platform**: Web application (browser-based)
**Project Type**: Web (frontend: public/app.js, public/index.html)
**Performance Goals**: Zero performance impact (text-only changes)
**Constraints**: Must maintain existing functionality, only change displayed text
**Scale/Scope**: ~10,500 lines in app.js, ~1,000 lines in index.html - searching for Dutch strings in specific screen rendering functions

**Translation Context from v0.20.9**:
- Previous successful translations: Title mappings, dropdown options, loading messages, modal titles
- Pattern established: Search for Dutch strings, replace with English equivalents
- Use `replace_all: true` for consistent replacements across file
- Already fixed: Sidebar, modals, toast messages, main navigation

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Project constitution not yet defined (template placeholders in .specify/memory/constitution.md)

**Translation Task Nature**: This is a pure UI bugfix, not a new feature
- ✅ No new architecture required
- ✅ No new dependencies or libraries
- ✅ Frontend-only changes (no backend API changes)
- ✅ No database schema changes
- ✅ No new functionality - only text display changes

**Applicable Principles** (based on CLAUDE.md project instructions):
- ✅ **BÈTA FREEZE compliance**: Only staging deployment, no production changes
- ✅ **Autonomous development**: Staging autonomy allowed, test on dev.tickedify.com
- ✅ **Changelog maintenance**: Update changelog.html with translation fix
- ✅ **Version tracking**: Increment package.json version to v0.20.10
- ✅ **Testing requirements**: Manual visual verification sufficient (no automated tests needed for text changes)
- ✅ **Architecture documentation**: No ARCHITECTURE.md update needed (no structure changes)

**Gate Result**: PASS - Simple UI text replacement following established patterns

## Project Structure

### Documentation (this feature)
```
specs/039-jammer-genoeg-zijn/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 - NOT NEEDED (user provided all locations)
├── data-model.md        # Phase 1 - NOT NEEDED (no data changes)
├── quickstart.md        # Phase 1 output (manual testing guide)
├── contracts/           # Phase 1 - NOT NEEDED (no API changes)
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
public/
├── app.js               # Main JavaScript file with screen rendering functions
├── index.html           # HTML with static screen elements
└── changelog.html       # Update with v0.20.10 translation fix

package.json             # Version bump to v0.20.10
```

**Structure Decision**: Web application (frontend-only) - Tickedify has public/ directory for frontend code

## Phase 0: Outline & Research
**SKIP THIS PHASE** - Research not needed because:
1. User provided exhaustive list of all 11 screen areas with Dutch text
2. Translation patterns already established in v0.20.9 (commit 9743d39)
3. File locations known: public/app.js and public/index.html
4. No technical unknowns - simple string replacement

**Rationale**: For UI translation tasks where all locations are specified, research phase adds no value. User has already done the research by manually testing all screens and documenting every Dutch string.

## Phase 1: Design & Contracts

### Artifacts to Generate

#### 1. quickstart.md (Testing Guide)
**Purpose**: Manual testing checklist for verifying all 11 screens display complete English
**Content**:
- Pre-requisites: Login to dev.tickedify.com with test credentials
- Test 1: Actions screen verification (3 areas)
- Test 2: Projects screen verification (3 areas)
- Test 3: Postponed screen verification (2 areas)
- Test 4: Daily Planning screen verification (complete screen)
- Test 5: Context Management screen verification (3 areas)
- Test 6: Search screen verification (complete screen)
- Expected results: NO Dutch text visible anywhere
- Regression tests: Verify v0.20.9 translations still work (sidebar, modals, toasts)

#### 2. data-model.md
**SKIP** - No data model changes (UI text only)

#### 3. contracts/
**SKIP** - No API contracts (frontend-only changes)

#### 4. Update CLAUDE.md
**Skip update** - No new architectural patterns, just applying existing translation approach

**Output**: quickstart.md with comprehensive visual testing guide

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy for Translation Bugfix**:
- Load `.specify/templates/tasks-template.md` as base
- Generate minimal task list (bugfix, not feature)
- Focus on: Locate → Translate → Test → Deploy

**Translation-Specific Tasks** (estimated 11-15 tasks):

### Preparation Tasks (2 tasks)
1. **Read existing code**: Examine screen rendering functions in app.js and index.html
2. **Create translation reference**: List all Dutch→English pairs needed

### Translation Tasks by Screen (11 tasks - one per screen area)
3. **T001 - Actions Filter Bar**: Translate filter labels/options in app.js
4. **T002 - Actions Bulk Button**: "Bulk bewerken" → "Bulk Edit"
5. **T003 - Actions Bulk Mode Buttons**: Translate all list/day move buttons
6. **T004 - Projects Add Button**: "+ nieuwe project" → "+ New Project"
7. **T005 - Projects Statistics**: Translate "open"/"afgewerkt" labels
8. **T006 - Projects Expanded View**: "OPEN ACTIES" → "OPEN ACTIONS"
9. **T007 - Postponed Title**: "Uitgesteld" → "Postponed"
10. **T008 - Postponed Lists**: Translate all 5 list names
11. **T009 - Daily Planning Screen**: Translate entire screen (title, filters, dates, buttons, "Acties")
12. **T010 - Context Management Title**: "Contexten beheer" → "Context Management"
13. **T011 - Context Management Add Button**: "+ Nieuwe Context" → "+ New Context"
14. **T012 - Context Management Column**: "Aangemaakt" → "Created"
15. **T013 - Search Screen**: Translate complete screen (all elements)

### Verification & Deployment Tasks (4 tasks)
16. **Manual testing**: Execute quickstart.md visual verification
17. **Version bump**: package.json → v0.20.10
18. **Update changelog**: Document all translations in changelog.html
19. **Deploy to staging**: Push to branch, verify on dev.tickedify.com

**Ordering Strategy**:
- Sequential by screen (Actions → Projects → Postponed → Daily Planning → Context → Search)
- Complete one screen before moving to next for easy testing
- Deploy after all translations complete

**Estimated Output**: 19 numbered, mostly sequential tasks in tasks.md

**Complexity**: Very Low - string replacements only, no logic changes

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/implement command or manual execution of tasks.md)
**Phase 4**: Validation (manual testing via quickstart.md, visual verification)
**Phase 5**: Deployment to staging (branch push, Vercel auto-deploy)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| N/A | N/A | N/A |

**No violations** - This is a simple UI text translation task with no architectural complexity.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research → SKIPPED (user provided all info) ✅
- [x] Phase 1: Design → MINIMAL (quickstart.md only) ✅
- [x] Phase 2: Task planning approach described (/plan command) ✅
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅ (no violations)
- [x] Post-Design Constitution Check: PASS ✅ (no new violations)
- [x] All NEEDS CLARIFICATION resolved ✅ (none - all clear from user input)
- [x] Complexity deviations documented ✅ (none - simple translation)

---

## Ready for /tasks Command

This plan is complete and ready for task generation. The /tasks command will:
1. Load this plan.md
2. Load .specify/templates/tasks-template.md
3. Generate 19 sequential translation tasks
4. Create tasks.md in specs/039-jammer-genoeg-zijn/

**Next command**: `/tasks` to generate the executable task list.

---
*Based on Constitution template (not yet project-specific) - Simple translation task requires minimal planning overhead*
