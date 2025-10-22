# Feature Specification: Sidebar Taak Tellers

**Feature Branch**: `022-voeg-de-volgende`
**Created**: 2025-10-22
**Status**: Ready for Planning
**Input**: User description: "Voeg de volgende functionaliteit toe: in de sidebar aan de linkerkant moet het aantal taken tussen haakjes worden weergegeven bij Inbox, Acties, Projecten, Opvolgen en Uitgesteld. Alleen bij die. Het is ook heel belangrijk dat die altijd juist zijn. Dus na elke actie moeten de getallen herberekend worden."

## Execution Flow (main)
```
1. Parse user description from Input
   � SUCCESS: Clear requirement for task counters in sidebar
2. Extract key concepts from description
   � Actors: Users viewing sidebar
   � Actions: Display task counts, update counts after actions
   � Data: Task counts for specific categories
   � Constraints: Only 5 specific categories, must always be accurate
3. For each unclear aspect:
   � No major ambiguities identified
4. Fill User Scenarios & Testing section
   � SUCCESS: Clear user flow defined
5. Generate Functional Requirements
   � Each requirement testable and specific
6. Identify Key Entities
   � Tasks with category classifications
7. Run Review Checklist
   � SUCCESS: No implementation details, all requirements clear
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a Tickedify user, when I look at the sidebar navigation, I want to immediately see how many tasks are in each category (Inbox, Acties, Projecten, Opvolgen, Uitgesteld) so that I can quickly assess my workload without having to click into each section.

### Acceptance Scenarios
1. **Given** I am logged into Tickedify and viewing any page, **When** I look at the sidebar, **Then** I see task counts in parentheses next to Inbox, Acties, Projecten, Opvolgen, and Uitgesteld (e.g., "Inbox (5)")
2. **Given** I have 3 tasks in Inbox and I move one to Acties, **When** the action completes, **Then** the Inbox counter shows (2) and the Acties counter increases by 1
3. **Given** I create a new task in the Inbox category, **When** the task is saved, **Then** the Inbox counter immediately increments by 1
4. **Given** I delete a task from the Projecten list, **When** the deletion completes, **Then** the Projecten counter immediately decrements by 1
5. **Given** I mark a task as completed, **When** the completion is processed, **Then** the relevant category counter updates to reflect the removed task
6. **Given** I bulk-move 5 tasks from Inbox to Acties, **When** the bulk action completes, **Then** both counters update correctly (Inbox -5, Acties +5)
7. **Given** I am viewing the sidebar, **When** any task-related action occurs (create, delete, move, complete, bulk action), **Then** all affected counters update within 1 second

### Edge Cases
- What happens when a category has 0 tasks? Display "(0)" or hide the counter?
- How does the system handle rapid successive actions (e.g., user creates 3 tasks quickly)?
- What if a task is moved between two displayed categories (e.g., Inbox � Acties)?
- How are tasks with recurring properties counted (only the current instance or future instances)?
- What happens when the initial page loads - are counters immediately visible or do they load with a delay?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST display task count in parentheses next to the following sidebar items: Inbox, Acties, Projecten, Opvolgen, and Uitgesteld
- **FR-002**: System MUST NOT display task counts for other sidebar items (e.g., Dagelijkse Planning, Wachten Op, Misschien, etc.)
- **FR-003**: Task counts MUST reflect the actual number of tasks currently in each category
- **FR-004**: Task counts MUST update automatically and immediately after any action that changes task quantities (create, delete, move, complete, bulk operations)
- **FR-005**: System MUST recalculate all affected counters after each task operation completes
- **FR-006**: Task counts MUST be accurate at all times - no stale or cached values that don't match reality
- **FR-007**: When a task is moved from one displayed category to another (e.g., Inbox � Acties), both counters MUST update correctly
- **FR-008**: When multiple tasks are affected by a single action (bulk operations), all relevant counters MUST update to reflect the changes
- **FR-009**: Task counters MUST be visible immediately when the page loads (no delayed loading)
- **FR-010**: System MUST count only active/incomplete tasks - completed tasks are excluded from all counters

### Key Entities *(include if feature involves data)*
- **Task**: Represents individual tasks with category classification (Inbox, Acties, Projecten, Opvolgen, Uitgesteld)
- **Sidebar Category**: Navigation items that display task counts - specifically the 5 categories mentioned

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
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and resolved
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
