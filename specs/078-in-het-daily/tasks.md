# Tasks: Edit Icons in Daily Planning

**Input**: Design documents from `/specs/078-in-het-daily/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

## Summary
Add edit icons (✏️) to tasks in the Daily Planning screen:
1. Actions sidebar: Next to star icon
2. Calendar view: Next to delete button

**Tech Stack**: Vanilla JavaScript, CSS
**Files to modify**: `public/app.js`, `public/style.css`
**Estimated changes**: ~50 lines

---

## Phase 3.1: Implementation

- [x] T001 Add CSS styling for edit icons in `public/style.css`
  - Add `.actie-edit` container styles (opacity, flex, margin)
  - Add `.actie-edit .edit-button` styles (transparent bg, hover effects)
  - Add `.edit-planning` button styles (match delete button pattern)
  - Location: After `.actie-star` styles (~line 4750)

- [x] T002 Add edit icon to Actions sidebar in `public/app.js`
  - Locate `renderActiesVoorPlanning()` at ~line 11217
  - Add edit icon HTML after `.actie-star` div, before `.actie-tekst`
  - HTML: `<div class="actie-edit"><button class="edit-button" onclick="app.bewerkActie('${actie.id}')" title="Edit task">✏️</button></div>`
  - Ensure onclick calls existing `bewerkActie(id)` function

- [x] T003 Add edit icon to Calendar view in `public/app.js`
  - Locate `renderPlanningItem()` at ~line 11296
  - Add edit button before `.delete-planning` in header
  - HTML: `<button class="edit-planning" onclick="app.bewerkActie('${planningItem.actieId}'); event.stopPropagation();" title="Edit task">✏️</button>`
  - Use `event.stopPropagation()` to prevent expand toggle

---

## Phase 3.2: Version & Deploy

- [x] T004 Update version number in `package.json`
  - Increment patch version (e.g., 1.0.x → 1.0.x+1)

- [x] T005 Update changelog in `public/changelog.html`
  - Add new entry with version, date, description
  - Category: 🎯 Improvements
  - Description: "Added edit icons to Daily Planning for quick task editing"

- [x] T006 Commit and push to staging
  - `git add -A`
  - `git commit -m "🎯 Add edit icons to Daily Planning"`
  - `git push origin staging`

- [ ] T007 Verify deployment on staging (USER TESTING)
  - Wait 15-30 seconds for Vercel deployment
  - Check `curl -s -L -k https://dev.tickedify.com/api/version`
  - Confirm version matches package.json

---

## Phase 3.3: Testing

- [ ] T008 Test sidebar edit icon click
  - Navigate to dev.tickedify.com/app → Dagelijkse Planning
  - Click edit icon (✏️) next to star on any task in sidebar
  - Verify: popup opens, task data populated, cancel works

- [ ] T009 Test calendar edit icon click
  - Schedule a task in calendar if needed
  - Click edit icon (✏️) next to delete button in task header
  - Verify: popup opens, can edit and save

- [ ] T010 [P] Test drag & drop still works
  - Drag task from sidebar to calendar
  - Verify: task schedules correctly, no popup interference

- [ ] T011 [P] Test existing interactions unchanged
  - Checkbox: complete task
  - Star: toggle priority
  - Chevron: expand/collapse
  - Delete: remove from planning
  - All should work as before

- [ ] T012 Test save changes reflect in both views
  - Edit task via calendar edit icon
  - Change project or notes
  - Save and verify both sidebar and calendar update

---

## Dependencies

```
T001 (CSS) ─┬─→ T002 (Sidebar) ─┬─→ T004-T007 (Deploy) ─→ T008-T012 (Test)
            └─→ T003 (Calendar) ─┘
```

- T002 and T003 depend on T001 (CSS must exist first)
- T004-T007 are sequential (version → changelog → commit → verify)
- T008-T012 depend on T007 (must be deployed first)
- T010 and T011 can run in parallel [P]

## Parallel Execution Examples

**CSS and both JS changes could theoretically be parallel, but they share dependencies:**
```
# Not recommended - CSS should be first for visual consistency
```

**Testing tasks that can run in parallel:**
```
# Launch T010 and T011 together after T009:
Task: "Test drag & drop still works on staging"
Task: "Test existing interactions (checkbox, star, chevron, delete) unchanged"
```

---

## Validation Checklist
*Verify before marking feature complete*

- [ ] Edit icon visible in sidebar (next to star)
- [ ] Edit icon visible in calendar (next to delete)
- [ ] Click edit → popup opens with task data
- [ ] Save changes → both views update
- [ ] Cancel → no changes
- [ ] Drag & drop still works
- [ ] Expand/collapse still works
- [ ] Checkbox still works
- [ ] Star priority still works
- [ ] Delete button still works
- [ ] Version deployed matches package.json
- [ ] Changelog updated

---

## Notes
- This is a UI-only feature, no API changes needed
- Reuses existing `bewerkActie(id)` function
- All changes in 2 files: app.js and style.css
- Commit after implementation complete (T001-T003)
- Test on staging before considering production
