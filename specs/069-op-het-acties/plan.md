# Implementation Plan: Select All in Bulk Edit Mode

**Branch**: `069-op-het-acties` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/069-op-het-acties/spec.md`

## Summary

Add a "Select All" checkbox to the bulk edit toolbar on the Acties screen. When bulk edit mode is activated, the checkbox appears in the toolbar header and allows users to quickly select or deselect all visible tasks. The checkbox supports three states: unchecked (none selected), checked (all selected), and indeterminate (partial selection).

**Technical Approach**: Frontend-only enhancement using existing `selecteerAlleTaken()` and `deselecteerAlleTaken()` functions with a new tri-state checkbox component.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES6+)
**Primary Dependencies**: None (pure DOM manipulation)
**Storage**: N/A (frontend-only feature, no database changes)
**Testing**: Manual + Playwright automation
**Target Platform**: Web (desktop + tablet responsive)
**Project Type**: Web application (existing Tickedify codebase)
**Performance Goals**: <50ms UI update for selection operations
**Constraints**: No external libraries, consistent with existing macOS-inspired styling
**Scale/Scope**: Single screen feature (Acties screen only)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Beta Freeze - Production Stability | ✅ PASS | Feature branch, staging deployment only |
| II. Staging-First Deployment | ✅ PASS | Will deploy to dev.tickedify.com first |
| III. Gespecialiseerde Sub-Agents | ✅ PASS | tickedify-feature-builder for implementation |
| IV. Versioning & Changelog Discipline | ✅ PASS | Version bump + changelog required |
| V. Deployment Verification Workflow | ✅ PASS | Standard verification protocol applies |
| VI. Test-First via API | ⚠️ N/A | Frontend-only feature - UI testing required |

**Initial Constitution Check**: PASS ✅
**Post-Design Constitution Check**: PASS ✅

## Project Structure

### Documentation (this feature)
```
specs/069-op-het-acties/
├── plan.md              # This file (/plan command output) ✅
├── research.md          # Phase 0 output (/plan command) ✅
├── data-model.md        # Phase 1 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
├── contracts/           # Phase 1 output - empty (no API changes)
└── tasks.md             # Phase 2 output (/tasks command - pending)
```

### Source Code (modifications)
```
public/
├── app.js               # Add checkbox HTML, toggle logic, state management
└── style.css            # Add checkbox styling
```

**Structure Decision**: Existing web application structure - modify only frontend files

## Phase 0: Outline & Research ✅

**Status**: Complete - see [research.md](./research.md)

### Key Findings:

1. **Existing Infrastructure**:
   - `selecteerAlleTaken()` at app.js:15222 - already handles filter skipping
   - `deselecteerAlleTaken()` at app.js:15244 - clears all selections
   - `updateBulkToolbar()` at app.js:15252 - updates selection count

2. **Checkbox Placement**:
   - Add to `.bulk-controls-container` (app.js:5200)
   - Hidden by default, shown when `bulkModus === true`

3. **Tri-State Implementation**:
   - Use native HTML5 `indeterminate` property
   - Calculate state based on `geselecteerdeTaken.size` vs visible task count

4. **Toggle Behavior**:
   - None selected → Click → All selected
   - Partial selected → Click → All selected
   - All selected → Click → None selected

**Output**: research.md with all questions resolved ✅

## Phase 1: Design & Contracts ✅

**Status**: Complete

### 1. Data Model ([data-model.md](./data-model.md))
- Frontend-only feature
- No database changes required
- Uses existing `geselecteerdeTaken` Set and `bulkModus` boolean

### 2. API Contracts
- No API changes required
- No new endpoints
- `/contracts/` directory empty (intentional)

### 3. UI Contract

**New Element**: Select All Checkbox
```html
<input type="checkbox"
       id="bulk-select-all"
       class="bulk-select-all-checkbox"
       onclick="window.toggleSelectAll()">
```

**States**:
| State | `checked` | `indeterminate` | `disabled` | Visual |
|-------|-----------|-----------------|------------|--------|
| None selected | `false` | `false` | `false` | ☐ |
| Partial selected | `false` | `true` | `false` | ☒ |
| All selected | `true` | `false` | `false` | ☑ |
| No visible tasks | `false` | `false` | `true` | ☐ (grayed) |

### 4. Test Scenarios ([quickstart.md](./quickstart.md))
10 test scenarios defined covering:
- Basic visibility toggle
- Select all / deselect all
- Indeterminate state
- Filter integration
- Edge cases (empty list, keyboard navigation)

### 5. Agent Context Update
- Ran `.specify/scripts/bash/update-agent-context.sh claude` ✅

**Output**: data-model.md ✅, quickstart.md ✅, agent context updated ✅

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Frontend-only implementation - no model/API tasks
- Focus on JavaScript functions and CSS styling
- Include test verification tasks from quickstart.md

**Estimated Tasks**:
1. Add checkbox HTML to `showActiesScherm()` template
2. Add `toggleSelectAll()` method to TaskManager
3. Add `updateSelectAllCheckbox()` for tri-state management
4. Modify `updateBulkToolbar()` to call checkbox update
5. Modify `toggleBulkModus()` to show/hide checkbox
6. Add window binding for `toggleSelectAll`
7. Add CSS styling for `.bulk-select-all-checkbox`
8. Add CSS for disabled state
9. Manual testing per quickstart.md scenarios
10. Version bump and changelog update
11. Deploy to staging and verify

**Ordering Strategy**:
- HTML first, then JavaScript logic, then CSS styling
- All implementation tasks can be done in sequence (single file modifications)
- Testing after all implementation complete

**Estimated Output**: ~12 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Complexity Tracking

*No complexity deviations required - feature is straightforward*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
