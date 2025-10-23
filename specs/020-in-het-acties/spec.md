# Feature Specification: Fix Drag & Drop Popup Week Display Bug

**Feature Branch**: `020-in-het-acties`
**Created**: 2025-10-19
**Status**: ✅ Completed & Deployed to Production
**Deployed**: 2025-10-19T20:40:33.734Z
**Version**: 0.19.96
**Commit**: 79079cd
**Input**: User description: "In het acties scherm kan je taken draggen en dan verschijnt er een popup waar je de taak kan droppen om het onder andere naar een andere datum te plannen. Daarvoor worden 2 weken aan dagen getoond. De huidige week en de volgende week. Vandaag zijn we zondag en de huidige week wordt niet getoond. Alleen de volgende week en de week erna. Dat is niet OK. Los dat op."

## Execution Flow (main)
```
1. Parse user description from Input
   � Bug identified: Week display in drag & drop popup incorrect on Sundays
2. Extract key concepts from description
   � Actors: Users dragging tasks in action screen
   � Actions: Drag task, view week options in popup
   � Data: Current week, next week display
   � Constraints: Should show current week + next week (2 weeks total)
3. For each unclear aspect:
   � No significant clarifications needed - bug is well-defined
4. Fill User Scenarios & Testing section
   � Clear user flow: drag task on Sunday and see correct weeks
5. Generate Functional Requirements
   � Each requirement testable with specific day scenarios
6. Identify Key Entities
   � No new data entities - UI bug fix only
7. Run Review Checklist
   � No [NEEDS CLARIFICATION] markers
   � No implementation details in requirements
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
Als gebruiker wil ik een taak kunnen slepen in het acties scherm en deze kunnen plannen naar een datum in de komende twee weken. Wanneer ik dit doe op een zondag (laatste dag van de week), moet ik de huidige week (inclusief zondag) EN de volgende week kunnen zien in de popup, zodat ik mijn taken kan plannen zonder beperking.

**Huidige probleem**: Op zondag worden alleen week 2 en week 3 getoond, waardoor de huidige week (week 1 met zondag) niet zichtbaar is.

**Gewenst gedrag**: Op elke dag van de week, inclusief zondag, moeten de huidige week en de volgende week zichtbaar zijn.

### Acceptance Scenarios

1. **Given** het is zondag 19 januari 2025, **When** gebruiker sleept een taak in het acties scherm, **Then** toont de popup dagen van de huidige week (maandag 13 jan t/m zondag 19 jan) EN de volgende week (maandag 20 jan t/m zondag 26 jan)

2. **Given** het is maandag 20 januari 2025, **When** gebruiker sleept een taak in het acties scherm, **Then** toont de popup dagen van de huidige week (maandag 20 jan t/m zondag 26 jan) EN de volgende week (maandag 27 jan t/m zondag 2 feb)

3. **Given** het is woensdag 22 januari 2025, **When** gebruiker sleept een taak in het acties scherm, **Then** toont de popup dagen van de huidige week (maandag 20 jan t/m zondag 26 jan) EN de volgende week (maandag 27 jan t/m zondag 2 feb)

4. **Given** het is zaterdag 25 januari 2025, **When** gebruiker sleept een taak in het acties scherm, **Then** toont de popup dagen van de huidige week (maandag 20 jan t/m zondag 26 jan) EN de volgende week (maandag 27 jan t/m zondag 2 feb)

### Edge Cases

- **Weekovergang**: Op zondag moet de huidige week nog steeds zichtbaar zijn (niet alleen volgende en daaropvolgende week)
- **Maandovergang**: Wanneer de twee weken over een maandgrens heen gaan, moeten beide maanden correct getoond worden
- **Jaarovergang**: Wanneer de twee weken over een jaargrens heen gaan (bijv. eind december), moeten datums correct getoond worden

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Systeem MOET altijd exact 2 weken tonen in de drag & drop popup: de huidige week waarin vandaag valt, en de daaropvolgende week

- **FR-002**: Systeem MOET op zondag de huidige week (inclusief die zondag) als eerste week tonen, niet de volgende week

- **FR-003**: Systeem MOET op elke dag van de week (maandag t/m zondag) consequent dezelfde logica toepassen: huidige week + volgende week

- **FR-004**: Systeem MOET weken defini�ren als maandag t/m zondag, waarbij zondag de laatste dag van een week is

- **FR-005**: Systeem MOET correct omgaan met maandovergangen binnen de getoonde twee weken (bijv. 27-31 januari + 1-2 februari)

- **FR-006**: Systeem MOET correct omgaan met jaarovergangen binnen de getoonde twee weken (bijv. 29 december 2025 t/m 11 januari 2026)

- **FR-007**: Wanneer gebruiker een taak sleept, MOET de popup direct de correcte twee weken tonen zonder vertraging of herberekening

### Key Entities

Geen nieuwe data entities - dit is een bugfix in de bestaande drag & drop popup logica.

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
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified (none - UI bug fix)
- [x] Review checklist passed

---
