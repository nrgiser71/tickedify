# Feature Specification: MIT Maximum Telling Bug Fix

**Feature Branch**: `015-in-het-scherm`
**Created**: 2025-10-15
**Status**: Draft
**Input**: User description: "In het scherm Dagelijkse Planning kan je bij elke actie op het sterretje klikken om aan te duiden dat het een taak is die vandaag MOET afgewerkt worden. Een zogezegde MIT (Most Important Task). We hebben er ook voor gezorgd dat je er maximum 3 kan aanduiden. Daar heb ik nog een fout ontdekt. Als er vandaag nog taken instaan die ik gisteren als MIT heb aangeduid, maar niet afgewerkt heb, dan kan ik toch nog 3 extra MIT's toevoegen. Dus bij de controle van maximum 3 MIT's wordt er geen rekening gehouden met de MIT's die er nog instaan van voordien. Ik heb nog een beetje verder getest en het is geen probleem als ik vandaag 3 MIT's aanduid, uitlog, terug inlog en nog MIT's probeer toe te voegen. Dan wordt de controle wel correct uitgevoerd. Het lijkt erop dat MIT's uit het verleden niet mee worden geteld."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature type: Bug fix voor MIT (Most Important Task) maximum limiet
2. Extract key concepts from description
   ’ Actors: Gebruiker in Dagelijkse Planning scherm
   ’ Actions: MIT sterretje klikken, maximum 3 MITs aanduiden
   ’ Data: MIT's van vandaag, MIT's van vorige dagen
   ’ Constraints: Maximum 3 MITs per dag
3. For each unclear aspect:
   ’ GEEN - bug is duidelijk beschreven met testgevallen
4. Fill User Scenarios & Testing section
   ’ Bug scenario: MIT's van gisteren worden niet meegeteld
   ’ Correct scenario: Na uitlog/inlog werkt het wel
5. Generate Functional Requirements
   ’ FR-001: Systeem moet ALLE MIT's in dagelijkse planning tellen (ook uit verleden)
   ’ FR-002: Maximum limiet moet voorkomen dat meer dan 3 MIT's totaal gemarkeerd zijn
6. Identify Key Entities
   ’ Taak met MIT status en datum
7. Run Review Checklist
   ’ GEEN [NEEDS CLARIFICATION] markers
   ’ GEEN implementation details
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
Een gebruiker werkt in het Dagelijkse Planning scherm en heeft gisteren 2 taken als MIT (Most Important Task) gemarkeerd die nog niet zijn afgewerkt. Deze taken staan vandaag nog steeds in de dagelijkse planning. De gebruiker wil vandaag 2 nieuwe taken als MIT markeren, maar het systeem moet dit voorkomen omdat er dan in totaal 4 MITs zouden zijn (2 van gisteren + 2 nieuw), wat meer is dan de maximale 3.

### Acceptance Scenarios

1. **Given** er staan 2 MIT's van gisteren in de dagelijkse planning die nog niet afgewerkt zijn, **When** gebruiker klikt op het sterretje van een nieuwe taak om deze als MIT te markeren, **Then** moet het systeem dit toestaan (totaal = 3 MITs)

2. **Given** er staan 2 MIT's van gisteren in de dagelijkse planning die nog niet afgewerkt zijn en gebruiker heeft al 1 nieuwe MIT toegevoegd vandaag (totaal = 3), **When** gebruiker probeert een vierde taak als MIT te markeren, **Then** moet het systeem dit weigeren met een melding "Maximum 3 Most Important Tasks bereikt"

3. **Given** er staan 3 MIT's van gisteren in de dagelijkse planning, **When** gebruiker probeert een nieuwe taak als MIT te markeren, **Then** moet het systeem dit weigeren

4. **Given** gebruiker heeft 3 MIT's gemarkeerd in de dagelijkse planning, **When** gebruiker logt uit en weer in, **Then** moeten de 3 MIT's nog steeds gemarkeerd zijn EN moet het toevoegen van een vierde MIT nog steeds geblokkeerd worden

5. **Given** er staan 2 MIT's in de dagelijkse planning, **When** gebruiker markeert één van deze MIT's als afgewerkt, **Then** moet het systeem toestaan dat er 2 nieuwe MIT's worden toegevoegd (totaal 3 inclusief de overgebleven MIT)

### Edge Cases
- Wat gebeurt er als een gebruiker een MIT van gisteren vandaag afwerkt? Telt deze nog mee voor de limiet?
- Wat gebeurt er als een MIT meerdere dagen in de planning staat (niet afgewerkt)?
- Wat gebeurt er bij het verplaatsen van een MIT naar een andere datum?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Systeem MOET ALLE taken in de dagelijkse planning tellen die als MIT gemarkeerd zijn, ongeacht de originele aanmaakdatum of markeerdatum van de MIT status

- **FR-002**: Systeem MOET voorkomen dat gebruiker meer dan 3 taken als MIT kan markeren binnen dezelfde dagelijkse planning view

- **FR-003**: Systeem MOET een duidelijke foutmelding tonen wanneer gebruiker probeert een vierde MIT toe te voegen

- **FR-004**: Systeem MOET de MIT telling consistent houden tussen verschillende sessies (na uitloggen en inloggen)

- **FR-005**: Systeem MOET de MIT limiet controleren op het moment dat gebruiker op het sterretje klikt, VOORDAT de MIT status wordt toegepast

- **FR-006**: Systeem MOET MIT's die afgewerkt zijn NIET meer meetellen voor de maximum limiet

### Key Entities

- **Taak (MIT)**: Een taak in de dagelijkse planning met MIT status, heeft eigenschappen:
  - MIT status (aan/uit)
  - Aanmaakdatum taak
  - Datum waarop MIT gemarkeerd werd
  - Afgewerkt status
  - Huidige positie in dagelijkse planning (datum van vandaag)

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
- [x] Entities identified
- [x] Review checklist passed

---
