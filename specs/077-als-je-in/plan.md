# Implementation Plan: Search Loading Indicator

**Branch**: `077-als-je-in` | **Date**: 2025-12-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/077-als-je-in/spec.md`

## Summary
Add a clear loading indicator to the search screen when it opens from the sidebar click. Currently when clicking the search button in the sidebar, the search screen opens but it's not clear that the system is actively searching/loading the task lists. The solution is to immediately show a loading state in the search results area when the search interface opens.

## Technical Context
**Language/Version**: JavaScript (Vanilla JS), CSS3
**Primary Dependencies**: Existing LoadingManager class (`app.js:1915-2172`)
**Storage**: N/A (UI-only change)
**Testing**: Manual UI testing + Playwright via tickedify-testing agent
**Target Platform**: Web browser (desktop + mobile responsive)
**Project Type**: Web application (single repo, frontend in `/public`)
**Performance Goals**: Loading indicator must appear within 100ms of user click
**Constraints**: Must use existing LoadingManager patterns for consistency
**Scale/Scope**: Single UI component enhancement

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Beta Freeze Compliance | ✅ PASS | Feature branch → staging deployment only |
| Staging-First Deployment | ✅ PASS | Will deploy to dev.tickedify.com via staging branch |
| Version/Changelog Discipline | ✅ PASS | Will bump version and update changelog |
| Simplicity Principle | ✅ PASS | Single UI enhancement, minimal code changes |
| No Production Push | ✅ PASS | All changes stay on feature/staging branches |

## Project Structure

### Documentation (this feature)
```
specs/077-als-je-in/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (affected files)
```
public/
├── app.js               # showZoekInterface() function (~line 9383-9467)
└── style.css            # .zoek-* and .loading-* classes
```

**Structure Decision**: Existing web application structure (Option 2 variant - single public folder serves all frontend)

## Phase 0: Outline & Research

### Research Findings

**Current Implementation Analysis:**
1. `showZoekInterface()` at `app.js:9383-9467` creates the search UI
2. Loading indicator currently only shows in `performSearch()` at line 9514
3. The loading text "Zoeken..." appears AFTER user submits a search query
4. When sidebar search triggers auto-search (lines 2844-2857), there's a 150ms delay before `performSearch()` is called

**Problem Identified:**
- When clicking sidebar search icon: Screen opens → no visual feedback → search may start (if pre-filled)
- User doesn't know the system is ready/working until they interact with the search form

**Existing Loading Patterns (LoadingManager class):**
1. `loading.show()` / `loading.hide()` - Global overlay (too heavy for this use case)
2. `loading.setSectionLoading(element, true)` - Inline spinner for sections
3. `loading.showSkeleton(container, itemCount)` - Skeleton placeholders for lists
4. CSS class `.loading` with centered text styling

**Decision**: Use inline loading indicator in the search results container
**Rationale**: Matches existing patterns, non-blocking, clearly visible
**Alternatives Rejected**:
- Global overlay: Too intrusive for a simple search screen load
- Skeleton loaders: Overkill for search results that don't exist yet

**Output**: research.md with all NEEDS CLARIFICATION resolved ✅

## Phase 1: Design & Contracts

### Implementation Design

**Approach**: Show a "Preparing search..." loading state immediately when the search interface opens, then clear it once the interface is fully loaded and ready for user input.

**UI Change:**
1. Modify `showZoekInterface()` to show the search results container with a loading indicator immediately
2. The loading indicator uses existing `.loading` CSS class with a spinner
3. When search form is rendered and events are bound, hide the loading indicator
4. If sidebar search auto-triggers `performSearch()`, the loading state transitions seamlessly

**Code Changes Required:**
1. **app.js:9413-9464**: Modify search interface HTML to include initial loading state
2. **app.js:9467**: After `bindZoekEvents()`, clear the initial loading state
3. **style.css**: Minor adjustment if needed for search loading animation

### Quickstart Test Scenario

**Manual Validation Steps:**
1. Navigate to tickedify.com/app and login
2. Click the search icon in the sidebar
3. **Expected**: See a loading indicator ("Preparing search..." with spinner) immediately
4. **Expected**: Loading indicator disappears when search form is ready
5. Type a search term and press Enter
6. **Expected**: Loading indicator appears while searching
7. **Expected**: Results appear and loading indicator disappears

**Output**: quickstart.md (embedded above)

### Data Model
N/A - This is a UI-only enhancement, no data model changes needed.

### Contracts
N/A - This is a frontend-only change, no API contract changes.

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy:**
- 2-3 simple tasks based on the design above
- Tasks ordered by dependency (UI changes → testing)
- No parallel tasks needed (changes are sequential in single file)

**Estimated Output:**
1. Modify `showZoekInterface()` to show initial loading state
2. Update CSS if needed for loading animation styling
3. Test via tickedify-testing agent on staging

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Complexity Tracking
*No violations - feature is simple and follows existing patterns*

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
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none needed)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
