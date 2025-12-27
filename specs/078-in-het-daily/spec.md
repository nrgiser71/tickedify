# Feature Specification: Task Detail Popup in Daily Planning

**Feature Branch**: `078-in-het-daily`
**Created**: 2025-12-27
**Status**: Draft
**Input**: User description: "In het daily planning scherm moet het ook mogelijk zijn om een taak te openen in de detail popup. Het wel mogelijk blijven om taken te kunnen slepen. Dus misschien moeten we een edit icoon toevoegen? Zowel in het acties scherm als in de calender view. Wat denk jij dat de beste oplossing is? Ik zta open voor andere ideeën."

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Problem Statement

Currently in the Daily Planning screen:
- **Actions sidebar (left)**: Tasks can only be dragged, completed via checkbox, or starred for priority. There is NO way to open a task to view/edit its full details.
- **Calendar view (right)**: Tasks can be expanded to show details (project, context, notes, subtasks), but users cannot EDIT these details. They can only complete, delete, or expand/collapse.

**User Pain Point**: When users want to edit a task's properties (project, context, duration, notes, recurrence, etc.) while in the Daily Planning view, they must navigate away to the Actions screen, find the task, and edit it there. This breaks their planning workflow.

---

## Design Decision: Edit Icon (✏️)

After analyzing multiple options (double-click, long-press, click on text), the chosen approach is a **dedicated edit icon** because:

1. **No conflicts**: Click on text conflicts with expand in calendar view, and drag in sidebar
2. **Discoverable**: Users immediately see how to edit
3. **Direct access**: No extra clicks needed (vs. putting it in expanded section)

### Implementation

**Actions Sidebar (left):**
```
☐ ⭐ ✏️  Task name here...
```
- Edit icon (✏️) placed directly next to the star icon
- Uses existing icon spacing/styling for consistency

**Calendar View (right):**
```
▶ ☐ 📋 ⭐ Task name           [✏️] [×]
```
- Edit icon placed next to the delete button in the header
- Directly accessible without expanding the task

### Why This Works

1. **No conflict with drag & drop**: Icon is a separate click target
2. **No conflict with expand**: Icon is separate from chevron click area
3. **Consistent placement**: Both views have edit icon near other action icons (right side)
4. **Direct access**: One click to edit in both views

---

## User Scenarios & Testing

### Primary User Story
As a user in the Daily Planning view, I want to click an edit icon on a task to open its detail popup so I can edit its properties without leaving the planning screen.

### Acceptance Scenarios

1. **Given** I am on the Daily Planning screen viewing the Actions sidebar, **When** I click the edit icon (✏️) next to a task, **Then** the detail popup opens showing all task properties.

2. **Given** I am on the Daily Planning screen viewing the Calendar, **When** I click the edit icon (✏️) in a task's header, **Then** the detail popup opens for editing.

3. **Given** I am on the Daily Planning screen, **When** I drag a task from the sidebar to the calendar, **Then** the drag & drop works as before (edit icon does not interfere).

4. **Given** I have the detail popup open from the Daily Planning, **When** I save my changes, **Then** both the sidebar and calendar view update immediately to reflect the changes.

5. **Given** I click the edit icon, **When** I change my mind, **Then** I can close the popup without saving and return to planning.

### Edge Cases
- What happens when clicking the checkbox? → Completes task (unchanged)
- What happens when clicking the star icon? → Toggles priority (unchanged)
- What happens when clicking the expand chevron? → Expands/collapses details (unchanged)
- What happens when clicking the delete button? → Removes from planning (unchanged)
- What happens if task was just deleted? → Graceful error handling, no popup

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST display an edit icon (✏️) next to the star icon in the Actions sidebar
- **FR-002**: System MUST display an edit icon (✏️) next to the delete button in the Calendar view header
- **FR-003**: Clicking the edit icon MUST open the task detail popup
- **FR-004**: The detail popup MUST show all editable task properties (project, context, priority, duration, notes, recurrence settings, subtasks, attachments)
- **FR-005**: Changes saved in the popup MUST immediately reflect in both sidebar and calendar views
- **FR-006**: Existing interactions MUST remain functional:
  - Checkbox: completes task
  - Star icon: toggles top priority
  - Expand chevron (calendar): expands/collapses details
  - Delete button (calendar): removes from planning
  - Drag & drop: unchanged behavior
- **FR-007**: The edit icon MUST show hover feedback (cursor pointer, subtle highlight)
- **FR-008**: The popup MUST use the existing planning popup design for consistency

### Key Entities

- **Task**: The core entity being edited. Properties include name, project, context, priority, duration, notes, recurrence settings, subtasks, and attachments.
- **Planning Item**: Represents a task scheduled in the calendar. Links to a Task entity.
- **Detail Popup**: The modal interface for viewing and editing task properties.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (resolved via design options analysis)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
