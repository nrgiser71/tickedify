# Feature Specification: Ctrl-toets uitbreiding voor extra week in drag popup

**Feature Branch**: `010-als-ik-in`
**Created**: 2025-10-10
**Status**: Draft
**Input**: User description: "Als ik in het acties scherm een actie begin te slepen, verschijnt er een popup waar ik de actie kan loslaten. In die popup staan er bovenaan de dagen van deze en volgende week. En daaronder staan de lijsten. Wanneer ik aan het slepen ben en op mijn toetsenbord de ctrl-toets ingedrukt houd, dan wil ik dat er onder de dagen van deze en volgende week, nog een extra rij met dagen van de week daarna zichtbaar wordt."

## Execution Flow (main)
```
1. Parse user description from Input
   � Feature description is complete and clear
2. Extract key concepts from description
   � Actors: gebruiker die taak sleept
   � Actions: slepen van actie, Ctrl-toets indrukken
   � Data: dagen van huidige week, volgende week, week daarna
   � Constraints: alleen tijdens drag operatie, conditie op Ctrl-toets
3. For each unclear aspect:
   � Geen onduidelijkheden gevonden
4. Fill User Scenarios & Testing section
   � Duidelijke user flow: sleep actie � popup verschijnt � Ctrl indrukken � extra week verschijnt
5. Generate Functional Requirements
   � Elk requirement is testbaar
6. Identify Key Entities (if data involved)
   � Geen nieuwe data entities, alleen UI gedrag
7. Run Review Checklist
   � Geen [NEEDS CLARIFICATION] markers
   � Geen implementatie details in spec
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
Een gebruiker werkt in het acties scherm en wil een actie plannen voor een datum verder in de toekomst (meer dan 2 weken vooruit). Momenteel toont de drag popup alleen de huidige week en volgende week (14 dagen). Door tijdens het slepen de Ctrl-toets ingedrukt te houden, verschijnt er een extra rij met de 7 dagen van de derde week, waardoor de gebruiker gemakkelijk toegang heeft tot 21 dagen vooruit zonder extra navigatie of klikken.

### Acceptance Scenarios
1. **Given** een gebruiker bevindt zich in het acties scherm met meerdere acties, **When** de gebruiker begint een actie te slepen, **Then** verschijnt de drag popup met bovenaan 2 rijen dagen (huidige week + volgende week) en daaronder de lijsten

2. **Given** de drag popup is zichtbaar tijdens een sleep operatie, **When** de gebruiker de Ctrl-toets indrukt en ingedrukt houdt, **Then** verschijnt er een derde rij met de 7 dagen van de week daarna (week 3) onder de bestaande 2 rijen

3. **Given** de derde week rij is zichtbaar in de drag popup, **When** de gebruiker de Ctrl-toets loslaat, **Then** verdwijnt de derde week rij en blijven alleen de originele 2 weken zichtbaar

4. **Given** de drag popup toont 3 weken (Ctrl ingedrukt), **When** de gebruiker de actie loslaat op een dag in de derde week, **Then** wordt de actie gepland voor die datum en de popup sluit

5. **Given** de gebruiker sleept een actie zonder Ctrl in te drukken, **When** de gebruiker de actie loslaat op een lijst of dag in week 1-2, **Then** werkt het slepen normaal zoals voorheen (backward compatibility)

### Edge Cases
- Wat gebeurt er als de gebruiker Ctrl indrukt en loslaat meerdere keren tijdens ��n sleep operatie?
  - De derde week rij verschijnt en verdwijnt responsief volgens de Ctrl-toets status
- Hoe gedraagt het systeem zich aan het einde van een maand/jaar wanneer week 3 dagen in een volgende maand/jaar bevat?
  - De datums worden correct berekend en getoond met dag + datum formaat (bijv. "Ma 3 nov")
- Wat als de gebruiker per ongeluk Ctrl indrukt maar niet naar week 3 wil slepen?
  - Geen probleem: gewoon Ctrl loslaten en de derde rij verdwijnt weer
- Werkt de Ctrl-toets op alle besturingssystemen?
  - Ja, de Ctrl-toets bestaat zowel op Windows als Mac toetsenborden

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Systeem MOET tijdens drag operatie van een actie detecteren wanneer de Ctrl-toets wordt ingedrukt
- **FR-002**: Systeem MOET een derde rij met 7 dagen (week 3) tonen in de drag popup wanneer Ctrl is ingedrukt
- **FR-003**: Systeem MOET de derde week rij verbergen wanneer Ctrl wordt losgelaten tijdens een actieve drag operatie
- **FR-004**: Systeem MOET de datums voor week 3 correct berekenen (7 dagen vanaf het einde van week 2)
- **FR-005**: Systeem MOET toestaan dat acties worden gesleept en losgelaten op dagen in de derde week rij
- **FR-006**: Systeem MOET de derde week rij visueel consistent tonen met de bestaande week 1 en week 2 rijen (zelfde formaat, styling, layout)
- **FR-007**: Systeem MOET real-time reageren op Ctrl toets events (indrukken/loslaten) tijdens het slepen zonder de drag operatie te onderbreken
- **FR-008**: Systeem MOET de bestaande functionaliteit (slepen naar week 1, week 2, en lijsten) behouden wanneer Ctrl niet is ingedrukt (backward compatibility)
- **FR-009**: Systeem MOET de popup layout dynamisch aanpassen aan 2 of 3 weken zonder visuele glitches of layout problemen

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
- [x] Ambiguities marked (geen)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified (geen nieuwe entities)
- [x] Review checklist passed

---
