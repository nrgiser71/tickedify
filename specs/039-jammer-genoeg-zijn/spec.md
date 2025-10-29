# Feature Specification: Complete Remaining English UI Translations

**Feature Branch**: `039-jammer-genoeg-zijn`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "Jammer genoeg zijn niet alle vertalingen in orde. Ik som op wat er nog moet gebeuren:
1. Actions scherm: filter bar is volledig in het Nederlands
2. Actions scherm: knop 'Bulk bewerken' is Nederlands
3. Actions scherm: als bulk mlodus actief is, zijn alle knoppen onderaan het scherm met alle mogelijke lijsten en dagen waar de taak naartoe kan gestuurd worden, in het Nederlands
4. Projects scherm: de groene knop bovenaan '+ nieuwe project' is in het Nederlands
5. Project scherm: de informatie per project, zoals aan open en aantal afgewerkt zijn in het Nederlands
6. Projects scherm: als je een project open klapt staat er 'OPEN ACTIES'. Dat moet nog vertaald worden
7. Postponed scherm: Titel bovenaan is 'Uitgesteld'. Moet vertaald worden
8. Postponed scherm: de 5 lijsten zijn in het Nederlands
9. Daily planning scherm: Heel het scherm is Nederlands (titel, filterbar, datum, knoppen, er staat nog ergens 'Acties'
10. Context Manegement scherm: er staat nog 'Contexten beheer', '+ Nieuwe Context', 'Aangemaakt'
11. Search scherm is volledig in het Nederlands. Maar echt alles."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ 11 specific screen areas identified with Dutch text
2. Extract key concepts from description
   ’ Actors: End users viewing all screens
   ’ Actions: Viewing UI text, interacting with buttons/filters
   ’ Data: UI text strings only (no data model changes)
   ’ Constraints: Must translate ALL remaining Dutch text
3. No unclear aspects - user provided exhaustive list
4. Fill User Scenarios & Testing section
   ’ Test each of 11 screens for complete English translation
5. Generate Functional Requirements
   ’ 11 functional requirements (one per screen area)
6. No key entities (text-only translation task)
7. Run Review Checklist
   ’ No [NEEDS CLARIFICATION] - all requirements clear
   ’ No implementation details - spec is user-focused
8. Return: SUCCESS (spec ready for planning)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As an English-speaking user of Tickedify, I want ALL user interface text to display in English so that I can understand and use every feature without confusion. Currently, many screens still show Dutch text even after the initial translation effort (v0.20.9), making the application inconsistent and harder to use.

### Acceptance Scenarios

#### Scenario 1: Actions Screen - Complete English UI
1. **Given** I am viewing the Actions screen
2. **When** I look at the filter bar, bulk edit button, and all action buttons
3. **Then** ALL text displays in English:
   - Filter bar labels and options
   - "Bulk bewerken" button shows "Bulk Edit"
   - All list/day move buttons show English labels

#### Scenario 2: Projects Screen - Complete English UI
1. **Given** I am viewing the Projects screen
2. **When** I look at the top button, project statistics, and expanded project details
3. **Then** ALL text displays in English:
   - "+ nieuwe project" shows "+ New Project"
   - Project statistics (open/completed counts) show English labels
   - Expanded projects show "OPEN ACTIONS" instead of "OPEN ACTIES"

#### Scenario 3: Postponed Screen - Complete English UI
1. **Given** I am viewing the Postponed screen
2. **When** I look at the page title and list names
3. **Then** ALL text displays in English:
   - Page title "Uitgesteld" shows "Postponed"
   - All 5 postponed list names display in English

#### Scenario 4: Daily Planning Screen - Complete English UI
1. **Given** I am viewing the Daily Planning screen
2. **When** I look at the title, filter bar, date display, buttons, and any references to "Acties"
3. **Then** ENTIRE screen displays in English with no Dutch text remaining

#### Scenario 5: Context Management Screen - Complete English UI
1. **Given** I am viewing the Context Management screen
2. **When** I look at the page title, add button, and column headers
3. **Then** ALL text displays in English:
   - "Contexten beheer" shows "Context Management"
   - "+ Nieuwe Context" shows "+ New Context"
   - "Aangemaakt" column shows "Created"

#### Scenario 6: Search Screen - Complete English UI
1. **Given** I am viewing the Search screen
2. **When** I look at ALL elements on the screen
3. **Then** EVERY piece of text displays in English with absolutely no Dutch remaining

### Edge Cases
- What happens when new UI elements are added? (Ensure translation pattern is documented)
- How does system handle date formatting? (Should remain DD/MM/YYYY but with English labels)
- Are there any dynamically generated labels that might still be in Dutch?

## Requirements

### Functional Requirements

#### Actions Screen
- **FR-001**: System MUST display filter bar labels and options in English on Actions screen
- **FR-002**: System MUST display "Bulk Edit" button instead of "Bulk bewerken" on Actions screen
- **FR-003**: System MUST display all bulk mode list/day move buttons in English (e.g., "Weekly", "Monthly", not "Wekelijks", "Maandelijks")

#### Projects Screen
- **FR-004**: System MUST display "+ New Project" button instead of "+ nieuwe project" on Projects screen
- **FR-005**: System MUST display project statistics labels in English (e.g., "open", "completed" counts)
- **FR-006**: System MUST display "OPEN ACTIONS" instead of "OPEN ACTIES" when project is expanded

#### Postponed Screen
- **FR-007**: System MUST display "Postponed" as page title instead of "Uitgesteld"
- **FR-008**: System MUST display all 5 postponed list names in English

#### Daily Planning Screen
- **FR-009**: System MUST display ENTIRE Daily Planning screen in English including:
  - Page title
  - Filter bar and all filter options
  - Date display labels
  - All buttons and action labels
  - Any references to "Acties" must show "Actions"

#### Context Management Screen
- **FR-010**: System MUST display "Context Management" instead of "Contexten beheer" as page title
- **FR-011**: System MUST display "+ New Context" instead of "+ Nieuwe Context" for add button
- **FR-012**: System MUST display "Created" instead of "Aangemaakt" for creation date column header

#### Search Screen
- **FR-013**: System MUST display Search screen COMPLETELY in English with absolutely no Dutch text remaining anywhere

### Translation Consistency Requirements
- **FR-014**: System MUST use consistent English terminology across all screens (e.g., "Actions" everywhere, not mixed with "Acties")
- **FR-015**: System MUST maintain existing English translations from v0.20.9 (sidebar, modals, toast messages)

### Key Entities
*No data entities involved - this is a pure UI text translation task*

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all 11 areas clearly specified)
- [x] Requirements are testable and unambiguous (can verify each screen visually)
- [x] Success criteria are measurable (all Dutch text must be gone)
- [x] Scope is clearly bounded (11 specific screen areas)
- [x] Dependencies and assumptions identified (builds on v0.20.9 translations)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed (11 screen areas with Dutch text)
- [x] Key concepts extracted (UI translation, no data/logic changes)
- [x] Ambiguities marked (none - user was explicit)
- [x] User scenarios defined (6 scenarios covering all 11 requirements)
- [x] Requirements generated (15 functional requirements)
- [x] Entities identified (none - pure UI task)
- [x] Review checklist passed (all quality gates met)

---

## Notes

**Context**: This is a continuation of translation work that began on October 22 (v0.19.113) but was partially reverted on October 25 by hotfix merge d83a29d. Version 0.20.9 restored many translations, but these 11 specific areas were missed and remain in Dutch.

**User Impact**: Currently inconsistent UI language creates confusion and reduces usability for English-speaking users. Complete translation will provide professional, consistent English experience across entire application.

**Scope Boundary**: This spec covers ONLY remaining Dutch UI text. It does NOT include:
- Backend error messages or logs
- Database content or data
- Comments in code
- Configuration files
- Any new features or functionality changes
