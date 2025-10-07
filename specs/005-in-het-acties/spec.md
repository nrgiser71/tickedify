# Feature Specification: Bulk Actie Datum Knoppen Uitbreiden

**Feature Branch**: `005-in-het-acties`
**Created**: 2025-10-06
**Status**: Draft
**Input**: User description: "In het Acties scherm kan je bulk modus activeren. Van zodra je dat doet verschijnen er onderaan een reeks van knoppen om de geselecteerde acties naar een andere datum te verplaatsen of naar een andere lijst te verplaatsen. Momenteel is het enkel mogelijk om naar vandaag en morgen te verplaatsen en andere lijsten. De bedoeling is dat je niet alleen vandaag en morgen kan kiezen maar ook de resterende dagen van deze week. Dus als we in bulk modus gaan op maandag, dan moet er vandaag en morgen en woensdag, donderdag, vrijdag, zaterdag en zondag staan. Als we op vrijdag in bulk modus gaan, dan moet er vandaag, morgen en zondag getoond worden. De logica van welke knoppen moeten getoon worden kan je terugvinden wanneer je bij een taak op de knop met de 3 puntjes klikt. Dan worden de juiste dagen wel al getoond. Ga dus zeker naar die code kijken."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Bulk modus: uitbreiding datumknoppen voor resterende weekdagen
2. Extract key concepts from description
   ’ Actors: Gebruikers in Acties lijst
   ’ Actions: Bulk selecteren, datum knoppen gebruiken
   ’ Data: Taken met datum, bulk selectie
   ’ Constraints: Alleen resterende dagen van huidige week
3. For each unclear aspect:
   ’ Geen onduidelijkheden - logica bestaat al in 3-puntjes menu
4. Fill User Scenarios & Testing section
   ’ Verschillende weekdagen scenario's (maandag vs vrijdag)
5. Generate Functional Requirements
   ’ Consistentie tussen bulk en individuele taak menu's
6. Identify Key Entities
   ’ Geen nieuwe entities - bestaande taken
7. Run Review Checklist
   ’ Geen [NEEDS CLARIFICATION] tags - alles is duidelijk
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
Als gebruiker wil ik in bulk modus van het Acties scherm dezelfde datum opties zien als bij individuele taken, zodat ik geselecteerde taken efficiënt naar alle dagen van de lopende week kan verplaatsen.

### Acceptance Scenarios

1. **Given** het is maandag en gebruiker activeert bulk modus in Acties scherm
   **When** gebruiker selecteert één of meerdere taken
   **Then** bulk toolbar toont knoppen: "Vandaag", "Morgen", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag" + uitgesteld opties

2. **Given** het is vrijdag en gebruiker activeert bulk modus in Acties scherm
   **When** gebruiker selecteert één of meerdere taken
   **Then** bulk toolbar toont knoppen: "Vandaag", "Morgen", "Zondag" + uitgesteld opties

3. **Given** het is zondag en gebruiker activeert bulk modus in Acties scherm
   **When** gebruiker selecteert één of meerdere taken
   **Then** bulk toolbar toont alleen knoppen: "Vandaag", "Morgen" + uitgesteld opties (geen resterende weekdagen)

4. **Given** gebruiker klikt op weekdag knop (bv. "Donderdag") in bulk modus
   **When** actie wordt uitgevoerd
   **Then** alle geselecteerde taken krijgen datum van die donderdag en worden verplaatst naar juiste positie in Acties lijst

5. **Given** gebruiker opent 3-puntjes menu van individuele taak
   **When** gebruiker bekijkt datum opties
   **Then** exact dezelfde weekdag knoppen zijn zichtbaar als in bulk modus voor dezelfde dag

### Edge Cases

- Wat gebeurt er als gebruiker bulk modus activeert op zaterdag? ’ Toont "Vandaag", "Morgen" (zondag), geen verdere weekdagen
- Wat gebeurt er bij wisseling van dag tijdens actieve sessie? ’ Knoppen blijven consistent met moment van activatie bulk modus
- Hoe werkt consistentie tussen bulk en individueel menu? ’ Beide gebruiken identieke logica voor weekdag berekening

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Systeem MOET in bulk modus van Acties scherm alle resterende dagen van de huidige week tonen als datum knoppen
- **FR-002**: Systeem MOET "Vandaag" en "Morgen" knoppen altijd tonen als eerste twee datum opties
- **FR-003**: Systeem MOET weekdag knoppen tonen met Nederlandse naam (Woensdag, Donderdag, etc.)
- **FR-004**: Systeem MOET weekdag knoppen dynamisch berekenen op basis van huidige dag van de week
- **FR-005**: Systeem MOET weekdag knoppen stoppen bij zondag (laatste dag van week)
- **FR-006**: Systeem MOET op zondag alleen "Vandaag" en "Morgen" tonen (geen resterende weekdagen)
- **FR-007**: Systeem MOET bij klik op weekdag knop alle geselecteerde taken naar die datum verplaatsen
- **FR-008**: Systeem MOET na bulk datum wijziging de taken automatisch op juiste chronologische positie plaatsen in Acties lijst
- **FR-009**: Systeem MOET dezelfde weekdag logica gebruiken als bestaande 3-puntjes menu van individuele taken
- **FR-010**: Systeem MOET na bulk datum actie bulk modus automatisch deactiveren en lijst herladen
- **FR-011**: Systeem MOET bestaande uitgesteld opties ("Opvolgen", "Wekelijks", etc.) behouden na weekdag knoppen
- **FR-012**: Systeem MOET success feedback tonen met aantal bijgewerkte taken en gekozen datum

### Key Entities

- **Taak**: Actie item met eigenschappen zoals datum, lijst, prioriteit
  - Bestaande entiteit - geen wijzigingen aan schema
  - Bulk selectie is tijdelijke UI state (Set van taak IDs)
  - Datum wordt bijgewerkt bij bulk actie

- **Bulk Toolbar**: UI component met actieknoppen
  - Toont dynamisch gegenereerde weekdag knoppen
  - Behoudt bestaande uitgesteld en lijst knoppen

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
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
