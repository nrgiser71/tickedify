# Implementation Plan: Edit Icons in Daily Planning

**Branch**: `078-in-het-daily` | **Date**: 2025-12-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/078-in-het-daily/spec.md`

## Summary
Add edit icons (✏️) to tasks in the Daily Planning screen to allow users to open the detail popup directly, without leaving the planning workflow. Icons will be added in two locations:
1. **Actions sidebar**: Next to the star icon (☐ ⭐ ✏️ Taak naam)
2. **Calendar view**: Next to the delete button in header (▶ ☐ Naam [✏️] [×])

## Technical Context
**Language/Version**: Vanilla JavaScript (ES6+), Node.js 18+
**Primary Dependencies**: Express.js, PostgreSQL (Neon)
**Storage**: PostgreSQL via Neon cloud database
**Testing**: Manual testing via staging (dev.tickedify.com), API testing via curl
**Target Platform**: Web (Desktop/Tablet/Mobile responsive)
**Project Type**: Web application (monolithic - frontend in /public, backend in server.js)
**Performance Goals**: Immediate response (<100ms) for edit icon click
**Constraints**: No conflicts with existing drag & drop, expand, checkbox interactions
**Scale/Scope**: Single feature addition, ~50 lines of code changes

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Beta Freeze | ✅ PASS | Feature branch only, no main push |
| II. Staging-First | ✅ PASS | Will deploy to staging branch for testing |
| III. Sub-Agents | ✅ PASS | Using Explore agent for research |
| IV. Versioning | ✅ PASS | Will bump version + changelog on implementation |
| V. Deployment Verification | ✅ PASS | Will verify via /api/version |
| VI. Test-First via API | ⚠️ N/A | UI feature, requires visual testing |

**Initial Constitution Check**: ✅ PASS

## Project Structure

### Documentation (this feature)
```
specs/078-in-het-daily/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - no new entities)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (existing files to modify)
```
public/
├── app.js               # renderActiesVoorPlanning() ~11217, renderPlanningItem() ~11296
└── style.css            # New .edit-actie and .edit-planning classes

No new files needed - pure modification of existing code.
```

**Structure Decision**: Existing web application structure (Option 2 variant - monolithic frontend/backend)

## Phase 0: Outline & Research
1. **Technical Context resolved** - All items filled from codebase analysis:
   - Language: Vanilla JavaScript ✅
   - Dependencies: Express.js ✅
   - Existing edit function: `bewerkActie(id)` ✅
   - CSS patterns: `.actie-star`, `.delete-planning` ✅

2. **Research completed via Explore agent**:
   - Actions sidebar: `renderActiesVoorPlanning()` at app.js:11217-11268
   - Calendar view: `renderPlanningItem()` at app.js:11296-11445
   - Edit function: `bewerkActie(id)` at app.js:8458-8657 (reusable!)
   - Star styling: style.css:4712-4747
   - Delete button styling: style.css:4148-4169

3. **Key findings**:
   - Existing `bewerkActie(id)` function can be called directly
   - No new API endpoints needed
   - No database changes needed
   - Pure frontend modification

**Output**: research.md ✅

## Phase 1: Design & Contracts

### Data Model
**No new entities** - This feature uses existing Task entity and reuses existing `bewerkActie()` function.

### API Contracts
**No new endpoints** - Existing endpoints are sufficient:
- `GET /api/taak/:id` - Already used by `bewerkActie()` if task not in memory
- `PUT /api/taak/:id` - Already used by planning popup save

### UI Component Design

**Actions Sidebar Edit Icon:**
```html
<div class="actie-edit">
    <button class="edit-button" onclick="app.bewerkActie('${actie.id}')" title="Edit task">
        ✏️
    </button>
</div>
```
Position: After `.actie-star`, before `.actie-tekst`

**Calendar View Edit Icon:**
```html
<button class="edit-planning" onclick="app.bewerkActie('${planningItem.actieId}', event)" title="Edit task">
    ✏️
</button>
```
Position: Before `.delete-planning` in header

### CSS Design
```css
/* Actions sidebar edit icon */
.actie-edit {
    display: flex;
    align-items: center;
    margin-right: 8px;
}

.actie-edit .edit-button {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 16px;
    opacity: 0.5;
    transition: all 0.2s ease;
    padding: 0;
}

.actie-edit .edit-button:hover {
    opacity: 1;
    transform: scale(1.1);
}

/* Calendar view edit button */
.edit-planning {
    background: transparent;
    color: var(--macos-text-secondary);
    border: none;
    width: 24px;
    height: 24px;
    border-radius: var(--macos-radius-small);
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.edit-planning:hover {
    background: var(--macos-gray-5);
    color: var(--macos-blue);
    transform: scale(1.1);
}
```

### Test Scenarios (from spec)
1. Click edit icon in sidebar → popup opens with task data
2. Click edit icon in calendar → popup opens with task data
3. Drag task from sidebar → drag works (no popup)
4. Save changes in popup → both views update
5. Cancel popup → returns to planning unchanged

**Output**: data-model.md (minimal), quickstart.md ✅

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Simple feature = fewer tasks
- Focus on code changes, not infrastructure
- TDD not applicable (UI visual changes)

**Estimated Tasks**:
1. Add edit icon HTML to `renderActiesVoorPlanning()` in app.js
2. Add edit icon HTML to `renderPlanningItem()` in app.js
3. Add CSS styling for `.actie-edit` and `.edit-planning`
4. Test on staging: sidebar edit icon click
5. Test on staging: calendar edit icon click
6. Test on staging: verify drag & drop still works
7. Update version + changelog
8. Deploy to staging and verify

**Estimated Output**: ~8 tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Complexity Tracking
*No violations - simple feature with minimal changes*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | - | - |

## Progress Tracking

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
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none needed)

---
*Based on Constitution v1.0.1 - See `/memory/constitution.md`*
