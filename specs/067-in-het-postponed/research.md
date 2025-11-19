# Research: Clickable Tasks in Postponed Screen

**Feature**: 067-in-het-postponed
**Date**: 2025-01-18

## Research Questions

### 1. Current Implementation Analysis

**Question**: How do other task lists (inbox, actions, follow-up) implement clickable tasks?

**Findings**:
- **Location**: `/public/app.js` - Various render functions
- **Pattern**: Inline `onclick` handler on `.taak-content` or `.taak-item` elements
- **Example from Actions list** (line 5244):
  ```javascript
  <div class="taak-content"
       data-taak-id="${taak.id}"
       onclick="app.bewerkActieWrapper('${taak.id}')"
       style="cursor: pointer;"
       title="${taak.opmerkingen ? this.escapeHtml(taak.opmerkingen) : 'Klik om te bewerken'}">
      ${taak.tekst}${recurringIndicator}
  </div>
  ```

**Decision**: Use the same `onclick="app.bewerkActieWrapper('${taak.id}')"` pattern for consistency

**Rationale**:
- Proven pattern already working across multiple list types
- Reuses existing `bewerkActieWrapper()` and `bewerkActie()` functions
- No new code needed, just apply existing pattern to postponed screen
- Maintains code consistency across codebase

**Alternatives Considered**:
- Event delegation with `addEventListener()` - More modern but inconsistent with existing codebase
- Separate modal for postponed tasks - Unnecessary complexity, existing modal already handles all task types
- Hover-based UI instead of click - Less intuitive, doesn't match user expectations

---

### 2. Postponed Screen Rendering Function

**Question**: Where and how are postponed tasks currently rendered?

**Findings**:
- **Function**: `renderUitgesteldSectieRows(categoryKey, taken)` at line 13369 in app.js
- **Current behavior**: Creates `<li>` elements with:
  - Delete button: `onclick="app.verwijderTaak('${taak.id}', '${categoryKey}')"`
  - Drag & drop event listeners
  - NO click handler for opening details
- **Task item structure**:
  ```javascript
  li.innerHTML = `
      <div class="taak-content">
          <span class="taak-tekst" title="${tooltipContent}">${taak.tekst}${recurringIndicator}</span>
      </div>
      <div class="taak-acties">
          <button class="delete-btn-small" onclick="app.verwijderTaak('${taak.id}', '${categoryKey}')" title="Taak verwijderen">×</button>
      </div>
  `;
  ```

**Decision**: Add `onclick` handler to the `<div class="taak-content">` element, same as other lists

**Rationale**:
- `.taak-content` is the logical clickable area (main task text)
- Delete button remains separate for explicit deletion
- Drag & drop should not conflict (different mouse events)
- Cursor change (`cursor: pointer`) provides visual affordance

**Alternatives Considered**:
- Click on entire `<li>` - Would conflict with drag & drop
- Click on `.taak-tekst` span - Too small, harder to click on mobile
- Add separate "edit" button - Clutters UI, inconsistent with other lists

---

### 3. Task Details Modal Compatibility

**Question**: Can the existing planningPopup modal handle postponed tasks without modifications?

**Findings**:
- **Modal ID**: `#planningPopup` defined in `/public/index.html` at line 353
- **Opener function**: `bewerkActie(id)` at line 8125 in app.js
- **Functionality**:
  - Loads task by ID from `this.taken` array
  - Populates all form fields (name, project, context, due date, priority, duration, recurrence, notes)
  - Shows subtasks and attachments
  - Provides "Create action" button to save changes
  - Provides defer buttons to move to other lists
  - Provides delete button
- **List-specific logic**: None found - modal is list-agnostic

**Decision**: No modal modifications needed, use existing modal as-is

**Rationale**:
- Modal already handles all task properties
- No hardcoded list-specific behavior found
- Defer buttons already allow moving tasks between lists (including back to postponed categories)
- Delete functionality works for all lists

**Alternatives Considered**:
- Create postponed-specific modal - Unnecessary code duplication
- Hide certain fields for postponed tasks - No business requirement for this
- Special styling for postponed context - Not needed, visual consistency is better

---

### 4. Drag & Drop Interaction Concerns

**Question**: Will adding onclick handlers conflict with existing drag & drop functionality?

**Findings**:
- **Drag events**: `dragstart` and `dragend` listeners added to `<li>` element
- **Click events**: Would be added to child `<div class="taak-content">`
- **Browser behavior**:
  - Click fires on mousedown + mouseup at same location
  - Drag starts after mousedown + mouse movement threshold (~5px)
  - Click event is NOT fired if drag occurred
- **Testing**: Other lists (e.g., daily planning) have both click and drag without conflicts

**Decision**: No special handling needed - browser naturally distinguishes click from drag

**Rationale**:
- Browser event model prevents click firing after drag
- Existing lists prove this works reliably
- No user complaints about accidental opens during drag

**Alternatives Considered**:
- Add click delay to distinguish from drag start - Adds lag, poor UX
- Disable drag when hovering over clickable area - Confusing interaction model
- Track drag state with flag - Unnecessary complexity, browser handles this

---

### 5. Visual Feedback (Hover State)

**Question**: How should we indicate that tasks are clickable?

**Findings**:
- **Current styling**: `.uitgesteld-taak-item:hover` changes background color
- **Other lists**: Use `cursor: pointer` on clickable elements
- **CSS location**: `/public/style.css` at line 7515+

**Decision**: Add `cursor: pointer` style to `.taak-content` div in postponed tasks

**Rationale**:
- Matches existing pattern in other lists
- Clear visual affordance for clickability
- No CSS changes needed if added inline via style attribute

**Alternatives Considered**:
- Underline on hover - Too prominent, looks like a link
- Icon indicator - Clutters compact list view
- Tooltip only - Not discoverable enough

---

### 6. Critical Constraint: No Auto-Move Between Lists

**Question**: How do we ensure tasks stay in postponed list when due date is changed?

**Findings**:
- **Current save logic**: `bewerkActie()` → updates task via PUT `/api/taak/${id}`
- **Backend endpoint**: Updates task fields but does NOT auto-reassign list based on date
- **List assignment**: Only changes when user clicks defer buttons or "Create action" button
- **Verified in**: server.js - PUT /api/taak/:id endpoint does not include list reassignment logic

**Decision**: No changes needed - backend already respects list assignment regardless of due date

**Rationale**:
- Backend doesn't implement auto-move logic
- User's clarification confirms this is required behavior
- List changes only via explicit button clicks in modal

**Alternatives Considered**:
- Add backend validation to prevent list moves - Already the default behavior
- Add frontend warning when date changed - Not needed, tasks stay put automatically

---

## Technical Decisions Summary

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| Click handler pattern | `onclick="app.bewerkActieWrapper(id)"` | Consistency with existing lists |
| Click target element | `.taak-content` div | Logical clickable area, doesn't conflict with delete button |
| Modal reuse | Use existing `#planningPopup` | Already handles all task types, no modifications needed |
| Drag & drop conflict | No special handling | Browser naturally distinguishes click from drag |
| Visual feedback | Add `cursor: pointer` inline style | Matches existing pattern, clear affordance |
| List preservation | No changes needed | Backend already preserves list assignment |
| Code location | `renderUitgesteldSectieRows()` in app.js | Function that renders postponed tasks |
| Testing approach | Playwright E2E tests | UI interaction testing required |

---

## Implementation Complexity Assessment

**Estimated Changes**:
- 1 function modification (`renderUitgesteldSectieRows()`)
- ~5 lines of code added (onclick handler + cursor style)
- 0 new functions needed
- 0 CSS changes needed (inline styles sufficient)
- 0 backend changes needed

**Risk Level**: LOW
- Simple pattern replication
- No new logic, just applying existing pattern
- Well-understood browser behavior
- No database changes
- No API changes

**Testing Scope**: MODERATE
- Manual testing: Click to open, edit fields, save, verify task stays in postponed list
- Playwright E2E: Automated click, modal open, edit, save scenarios
- Regression: Ensure drag & drop still works, delete still works

---

## Dependencies & Prerequisites

**Required Knowledge**:
- ✅ Vanilla JavaScript event handling
- ✅ Existing `bewerkActieWrapper()` function behavior
- ✅ DOM manipulation for inline attributes
- ✅ Tickedify task modal workflow

**Required Access**:
- ✅ `/public/app.js` file write access
- ✅ Staging environment (dev.tickedify.com) for testing
- ✅ Playwright test framework

**Blockers**: None identified

---

## Open Questions & Risks

**Open Questions**: None - all research complete

**Risks**:
1. **Low Risk**: Click handler might not fire due to event bubbling issues
   - **Mitigation**: Test thoroughly, use same pattern as other lists which work
2. **Low Risk**: Mobile touch events might behave differently than mouse clicks
   - **Mitigation**: Test on mobile devices, existing lists already work on mobile

---

**Research Complete**: ✅ All NEEDS CLARIFICATION items resolved, ready for Phase 1
