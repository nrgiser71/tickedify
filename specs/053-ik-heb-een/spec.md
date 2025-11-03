# Feature Specification: Fix Laatste Werkdag Maandelijkse Herhaling

**Feature Branch**: `053-ik-heb-een`
**Created**: 2025-11-03
**Status**: Draft
**Input**: User description: "Ik heb een taak met een datum van 31/10/2025 en een herhaling op elke laatste werkdag van de maand. Als ik deze taak afvinkt, dan maakt hij een nieuwe taak op 31/12/2025. Dat is een maand te laat. Dat moest 30/11/2025 zijn. Kijk dat na en los het op."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Bug: recurring task with "last workday of month" pattern creates next instance 2 months later instead of 1 month
2. Extract key concepts from description
   ’ Actors: User with recurring task
   ’ Actions: Complete task, trigger next instance creation
   ’ Data: Task with date 31/10/2025, recurrence pattern "monthly-weekday-last-workday-1"
   ’ Constraints: Next instance MUST be in next month (November 30, 2025), NOT two months later (December 31, 2025)
3. For each unclear aspect:
   ’  User scenario is clear: complete task ’ expect next instance next month
   ’  Expected behavior is unambiguous: monthly pattern = next month, not skip a month
4. Fill User Scenarios & Testing section
   ’ Scenario 1: Complete task on 31/10 ’ new task on 30/11
   ’ Scenario 2: Complete task on 30/11 ’ new task on 31/12
   ’ Edge cases: months with varying last workdays
5. Generate Functional Requirements
   ’ FR-001: System MUST calculate next instance as exactly 1 month later
   ’ FR-002: System MUST find last workday of target month
   ’ FR-003: System MUST NOT skip months in monthly recurrence patterns
6. Identify Key Entities
   ’ Task entity with herhaling_type field
7. Run Review Checklist
   ’  No implementation details (focused on behavior)
   ’  Clear, testable requirements
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
Een gebruiker heeft een taak met een maandelijkse herhaling op de laatste werkdag van de maand. Wanneer de gebruiker deze taak afvinkt (op bijvoorbeeld 31 oktober 2025), verwacht de gebruiker dat de volgende taakinstantie wordt aangemaakt voor de laatste werkdag van de **volgende maand** (30 november 2025), niet voor een maand later (31 december 2025).

Het huidige systeem slaat blijkbaar een maand over bij het aanmaken van de volgende instantie, wat resulteert in gemiste maandelijkse taken.

### Acceptance Scenarios

1. **Given** een taak met datum 31/10/2025 en herhaling_type "monthly-weekday-last-workday-1"
   **When** de gebruiker de taak afvinkt als voltooid
   **Then** wordt een nieuwe taakinstantie aangemaakt met datum 30/11/2025 (laatste werkdag van november)

2. **Given** een taak met datum 30/11/2025 en herhaling_type "monthly-weekday-last-workday-1"
   **When** de gebruiker de taak afvinkt als voltooid
   **Then** wordt een nieuwe taakinstantie aangemaakt met datum 31/12/2025 (laatste werkdag van december)

3. **Given** een taak met datum 31/12/2025 en herhaling_type "monthly-weekday-last-workday-1"
   **When** de gebruiker de taak afvinkt als voltooid
   **Then** wordt een nieuwe taakinstantie aangemaakt met datum 31/01/2026 (laatste werkdag van januari)

4. **Given** een taak met datum 28/02/2025 (vrijdag, laatste werkdag februari in niet-schrikkeljaar)
   **When** de gebruiker de taak afvinkt als voltooid
   **Then** wordt een nieuwe taakinstantie aangemaakt met datum 31/03/2025 (laatste werkdag van maart)

### Edge Cases

- **Wat gebeurt er met de laatste werkdag berekening in maanden met verschillende lengtes?**
  Verwachting: Systeem moet correct de laatste werkdag bepalen ongeacht maandlengte (28/29/30/31 dagen)

- **Wat gebeurt er als de laatste dag van de maand in het weekend valt?**
  Verwachting: Systeem moet teruggaan naar de laatste vrijdag van die maand

- **Wat gebeurt er met feestdagen die op de laatste werkdag vallen?**
  Huidige scope: Systeem houdt GEEN rekening met feestdagen (alleen weekend check), dit blijft ongewijzigd

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Systeem MOET bij het aanmaken van een volgende instantie van een maandelijkse "laatste werkdag" herhaling precies 1 maand vooruit rekenen vanaf de huidige taakdatum

- **FR-002**: Systeem MOET de laatste werkdag van de doelmaand correct bepalen door:
  - De laatste dag van die maand te vinden
  - Terug te gaan naar de laatste vrijdag als die dag in het weekend valt
  - GEEN rekening te houden met feestdagen (buiten scope)

- **FR-003**: Systeem MOET NIET maanden overslaan bij maandelijkse herhalingspatronen met interval 1

- **FR-004**: Systeem MOET de bug fix toepassen op het herhalingspatroon `monthly-weekday-last-workday-1` (elke maand, laatste werkdag)

- **FR-005**: Systeem MOET ook correcte berekening toepassen op varianten zoals:
  - `monthly-weekday-last-workday-2` (elke 2 maanden, laatste werkdag)
  - `monthly-weekday-last-workday-3` (elke 3 maanden, laatste werkdag)
  - Etc. voor alle intervals

### Key Entities

- **Task (Taak)**: Een taak entiteit met herhalingseigenschappen
  - Heeft een verschijndatum (datum)
  - Heeft een herhaling_type veld met waarde zoals "monthly-weekday-last-workday-1"
  - Heeft een herhaling_actief boolean
  - Wanneer voltooid en herhaling_actief = true, wordt een nieuwe instantie aangemaakt
  - Nieuwe instantie moet correcte volgende datum hebben volgens het herhalingspatroon

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
- [x] Ambiguities marked (none found - bug report is clear)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
