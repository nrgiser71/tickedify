# Feature Specification: Replace "Due Date" with "Appear Date"

**Feature Branch**: `068-vervang-overal-waar`
**Created**: 2025-11-19
**Status**: Draft
**Input**: User description: "Vervang overal waar 'Due Date' staat of gebruikt wordt, door 'Appear Date'"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature request: terminology change from "Due Date" to "Appear Date"
2. Extract key concepts from description
   ’ Actors: all users
   ’ Actions: viewing date field labels
   ’ Data: no schema changes (field name remains verschijndatum)
   ’ Constraints: must be consistent across entire UI
3. For each unclear aspect:
   ’ All aspects are clear - simple UI label replacement
4. Fill User Scenarios & Testing section
   ’ User flow: existing users see new terminology
5. Generate Functional Requirements
   ’ Each requirement is testable via UI inspection
6. Identify Key Entities
   ’ No data model changes required
7. Run Review Checklist
   ’ No implementation details, all requirements testable
8. Return: SUCCESS (spec ready for planning)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a Tickedify user, when I create or edit a task, I see "Appear Date" as the label for the date field instead of "Due Date". This terminology better reflects the Baas Over Je Tijd methodology where dates indicate when tasks appear on the daily planning, not when they're due.

### Acceptance Scenarios
1. **Given** I open the task creation modal, **When** I view the date field, **Then** the label reads "Appear Date" instead of "Due Date"
2. **Given** I edit an existing task, **When** I view the date field, **Then** the label reads "Appear Date" instead of "Due Date"
3. **Given** I view tasks in any list (inbox, actions, postponed), **When** I see date information, **Then** it's labeled as "Appear Date" instead of "Due Date"
4. **Given** I view help text or tooltips mentioning dates, **When** I read the text, **Then** it uses "Appear Date" terminology
5. **Given** I use voice mode, **When** the system speaks about dates, **Then** it says "Appear Date" instead of "Due Date"

### Edge Cases
- What happens when users have bookmarks or documentation referencing "Due Date"? ’ Documentation should be updated, but this is a UI-only change
- How does the system handle error messages mentioning dates? ’ All error messages must use "Appear Date" terminology
- What about email notifications and confirmations? ’ Email templates must use "Appear Date" terminology

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST display "Appear Date" as the label for date fields in the task creation modal
- **FR-002**: System MUST display "Appear Date" as the label for date fields in the task editing modal
- **FR-003**: System MUST display "Appear Date" in all task list views (inbox, actions, postponed, daily planning)
- **FR-004**: System MUST use "Appear Date" terminology in all help text and tooltips
- **FR-005**: System MUST use "Appear Date" terminology in all error messages related to dates
- **FR-006**: System MUST use "Appear Date" terminology in voice mode audio responses
- **FR-007**: System MUST use "Appear Date" terminology in email templates and notifications
- **FR-008**: System MUST maintain consistency - no instances of "Due Date" should remain visible to users
- **FR-009**: System MUST update changelog with this terminology change
- **FR-010**: System MUST NOT change the underlying database field name (verschijndatum) as this is an internal implementation detail

### Key Entities
- **Task Date Field**: Represents when a task should appear on the daily planning. Currently labeled as "Due Date" in English UI, needs to be relabeled as "Appear Date". The database field name (verschijndatum) remains unchanged as it already means "appear date" in Dutch.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (all instances replaced)
- [x] Scope is clearly bounded (UI text only, no database changes)
- [x] Dependencies and assumptions identified (changelog update)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Additional Context

### Why This Change?
The term "Due Date" implies a deadline, which doesn't align with the Baas Over Je Tijd methodology. In this system, dates represent when tasks should *appear* on the daily planning, not when they must be completed. "Appear Date" more accurately reflects this concept.

### Scope Boundary
This is a UI/UX terminology change only:
-  All user-facing text (labels, help text, tooltips, messages)
-  Voice mode audio responses
-  Email templates and notifications
-  Documentation and changelog
- L Database schema (field names remain unchanged)
- L API endpoint names (internal naming remains unchanged)
- L Code variable names (internal naming remains unchanged)
