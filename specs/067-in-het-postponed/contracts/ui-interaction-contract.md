# UI Interaction Contract: Postponed Tasks Clickability

**Feature**: 067-in-het-postponed
**Date**: 2025-01-18
**Type**: Frontend UI Contract (No API changes)

## Overview

This contract defines the expected UI behavior when users interact with tasks in the postponed screen. Unlike typical API contracts, this is a **UI interaction contract** since the feature involves no new backend endpoints.

---

## User Interactions

### 1. Click on Postponed Task

**Trigger**: User clicks anywhere on the `.taak-content` div of a postponed task item

**Preconditions**:
- User is viewing the postponed screen (route: `/app#uitgesteld`)
- At least one postponed category section is expanded (e.g., Weekly, Monthly)
- Task list contains one or more tasks

**Expected Behavior**:
1. Task details modal (`#planningPopup`) appears with `display: flex`
2. Modal overlay darkens the background
3. Modal is centered on screen
4. Modal form is populated with task data:
   - Task name input field contains task text
   - Project dropdown shows current project (or empty if none)
   - Context dropdown shows current context
   - Due date picker shows current `verschijndatum`
   - Priority dropdown shows current priority level
   - Duration input shows current duration in minutes
   - Recurrence display shows current recurrence pattern
   - Notes textarea shows current notes
   - Subtasks section loaded (if any exist)
   - Attachments section loaded (if any exist)
5. Focus is set to task name input field
6. "Create action" button is visible and enabled
7. Defer buttons are visible for all postponed categories
8. Delete button is visible

**Visual Feedback**:
- Cursor changes to `pointer` when hovering over task content
- Task background color changes on hover (existing `.uitgesteld-taak-item:hover` style)
- No visual change while modal is open (background dimmed by overlay)

**Performance Expectations**:
- Modal opens within 50ms of click
- All form fields populated within 100ms
- No visible lag or flicker

---

### 2. Modify Task Properties in Modal

**Trigger**: User edits any field in the task details modal

**Allowed Modifications**:
- Task name (text input)
- Project (dropdown selection)
- Context (dropdown selection)
- Due date (date picker)
- Priority (dropdown: hoog/gemiddeld/laag)
- Duration (number input, positive integers only)
- Recurrence pattern (via separate recurrence modal)
- Notes (textarea)
- Subtasks (add/edit/delete)
- Attachments (add/delete)

**Expected Behavior**:
1. Changes are held in form state (not yet saved to backend)
2. Form validation applies:
   - Task name cannot be empty
   - Duration must be positive integer
   - Due date must be valid ISO format
3. "Create action" button remains enabled
4. No automatic list reassignment based on field changes
5. Modal remains open for further edits

**Critical Constraint**: Changing the due date does NOT trigger automatic list reassignment. Task remains in current postponed category.

---

### 3. Save Task Changes

**Trigger**: User clicks "Create action" button in modal

**Preconditions**:
- Form validation passes (required fields filled)
- At least one field was modified (or no changes, still valid to save)

**Expected Behavior**:
1. Modal closes (`display: none`)
2. PUT request sent to `/api/taak/:id` with updated fields
3. Backend updates task in database
4. Task `lijst` field remains unchanged (stays in same postponed category)
5. Frontend refreshes postponed section via `loadUitgesteldSectieData(categoryKey)`
6. Updated task appears in same category with new values
7. Success toast notification (optional, if implemented)

**API Contract** (existing endpoint, no changes):
```
PUT /api/taak/:id
Content-Type: application/json

Request Body:
{
  "tekst": "Updated task name",
  "projectId": 123,
  "contextId": 456,
  "verschijndatum": "2025-02-15",
  "prioriteit": "hoog",
  "duur": 60,
  "opmerkingen": "Updated notes",
  "herhaling_type": "weekly-1-1,3,5",
  "herhaling_actief": true
  // lijst field is NOT included - backend preserves existing value
}

Response: 200 OK
{
  "success": true,
  "task": { /* updated task object */ }
}
```

---

### 4. Move Task to Different List

**Trigger**: User clicks a defer button (e.g., "Monthly", "Weekly") in modal

**Expected Behavior**:
1. Task `lijst` field updated to corresponding value:
   - "Weekly" → `uitgesteld-wekelijks`
   - "Monthly" → `uitgesteld-maandelijks`
   - "Quarterly" → `uitgesteld-3maandelijks`
   - "Bi-annual" → `uitgesteld-6maandelijks`
   - "Yearly" → `uitgesteld-jaarlijks`
   - "Follow-up" → `opvolgen`
2. PUT request sent with new `lijst` value
3. Modal closes
4. Task disappears from current postponed category
5. Task appears in target category (if that section is expanded)
6. If moving to same category, task stays visible with updated position

---

### 5. Delete Postponed Task

**Trigger**: User clicks delete button in modal OR delete button (×) on task item

**Expected Behavior**:
1. Confirmation dialog appears (if implemented)
2. DELETE request sent to `/api/taak/:id`
3. Task removed from database
4. Modal closes (if delete was from modal)
5. Task disappears from postponed list
6. List refreshes to show remaining tasks

---

### 6. Cancel Without Saving

**Trigger**: User clicks "Cancel" button or clicks outside modal overlay

**Expected Behavior**:
1. Modal closes (`display: none`)
2. No API requests sent
3. Task data unchanged in backend
4. Postponed list remains unchanged
5. Focus returns to postponed screen

---

## Drag & Drop Interaction (Existing, Must Not Break)

**Trigger**: User drags a postponed task to a different category section

**Expected Behavior** (existing functionality, must remain working):
1. Drag cursor appears during drag
2. Drop target highlights when task is dragged over it
3. Task moves to target category on drop
4. PUT request updates task `lijst` field
5. UI refreshes to show task in new category

**Critical Test**: Ensure click handler does NOT interfere with drag & drop. Browser should distinguish:
- Click = mousedown → mouseup at same location
- Drag = mousedown → mousemove → dragstart

---

## Edge Cases

### 1. Task Modified by Another User

**Scenario**: Task is modified by another user/session while modal is open

**Expected Behavior**:
- Current implementation: Last write wins (no conflict detection)
- User's save overwrites other changes
- No error shown

**Future Enhancement**: Could add optimistic locking with `updated_at` timestamp

---

### 2. Task Deleted While Modal Open

**Scenario**: Task is deleted by another user/session while modal is open

**Expected Behavior**:
- Save attempt fails with 404 error
- Error message shown to user
- Modal remains open for user to copy data if needed

---

### 3. Network Error During Save

**Scenario**: PUT request fails due to network issue

**Expected Behavior**:
- Error toast shown to user
- Modal remains open with user's edits preserved
- User can retry save

---

### 4. Rapid Click

**Scenario**: User double-clicks or triple-clicks task item

**Expected Behavior**:
- Only one modal instance opens
- Subsequent clicks while modal is open have no effect
- No duplicate modals or errors

---

## Visual Regression Tests

### 1. Hover State
**Test**: Hover over postponed task
**Expected**: Background color changes, cursor becomes pointer

### 2. Modal Appearance
**Test**: Click task, verify modal appears
**Expected**: Modal centered, overlay visible, form populated

### 3. Mobile Responsive
**Test**: Click task on mobile device
**Expected**: Modal appears full-screen or properly scaled, touch events work

---

## Performance Benchmarks

| Action | Target | Measurement |
|--------|--------|-------------|
| Click to modal open | <50ms | Time from click to modal `display: flex` |
| Form population | <100ms | Time from modal open to all fields populated |
| Save and refresh | <300ms | Time from save click to updated task visible |
| Drag start delay | >150ms | Prevent accidental drag during click |

---

## Accessibility Requirements

### Keyboard Navigation
- **Tab**: Move focus between form fields
- **Enter**: Submit form (save task)
- **Escape**: Close modal without saving

### Screen Reader
- Modal has `role="dialog"` and `aria-labelledby` pointing to heading
- Form fields have associated `<label>` elements
- Button text is descriptive ("Create action", "Cancel", "Delete")

### Focus Management
- Focus trapped within modal when open
- Focus returns to clicked task item after modal closes
- Task items are keyboard-focusable (add `tabindex="0"` if not already)

---

## Test Scenarios (Contract Tests)

### Scenario 1: Basic Click and Edit
```
GIVEN postponed screen with weekly tasks
WHEN user clicks first task
THEN modal opens with task data populated
WHEN user changes task name to "Updated Task"
AND clicks "Create action"
THEN modal closes
AND task appears in weekly list with "Updated Task" name
```

### Scenario 2: Date Change Does Not Move Task
```
GIVEN postponed task in monthly category with due date 2025-02-15
WHEN user clicks task to open modal
AND changes due date to today (2025-01-18)
AND clicks "Create action"
THEN task remains in monthly category
AND task due date is updated to 2025-01-18
```

### Scenario 3: Explicit List Move
```
GIVEN postponed task in weekly category
WHEN user clicks task to open modal
AND clicks "Monthly" defer button
THEN task disappears from weekly category
AND task appears in monthly category
```

### Scenario 4: Drag Still Works
```
GIVEN postponed task in weekly category
WHEN user drags task to monthly section
THEN task moves to monthly category
AND no modal opens
```

---

**Contract Status**: ✅ DEFINED - Ready for implementation and testing
