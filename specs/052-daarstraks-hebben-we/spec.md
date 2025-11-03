# Feature Specification: Filter Persistentie Fix voor Herhalende Taken

**Feature Branch**: `052-daarstraks-hebben-we`
**Created**: 2025-11-03
**Status**: Draft
**Input**: User description: "Daarstraks hebben we een aanpassing gedaan omdat de filter op het dagelijkse planning scherm vergeten werd na het afvinken van een taak. Dat is opgelost, maar ik merk nu net dat het probleem zich nog steeds voordoet als je een taak met een herhaling afvinkt. Doe dezelfde aanpassing om deze edge case op te lossen."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Issue: Filter wordt vergeten bij afvinken herhalende taak in dagelijkse planning
2. Extract key concepts from description
   ’ Actors: Gebruiker die taken afvinkt
   ’ Actions: Herhalende taak afvinken, filter actief houden
   ’ Data: Dagelijkse planning acties lijst, actieve filters
   ’ Constraints: Moet consistent zijn met eerdere filter fix voor normale taken
3. For each unclear aspect:
   ’ Geen onduidelijkheden - probleem is duidelijk beschreven en context is bekend
4. Fill User Scenarios & Testing section
   ’ User flow: Filter toepassen ’ herhalende taak afvinken ’ filter blijft actief
5. Generate Functional Requirements
   ’ Filter moet blijven werken na afvinken herhalende taak
6. Identify Key Entities
   ’ Herhalende taken, dagelijkse planning filter state
7. Run Review Checklist
   ’ Spec bevat geen implementatie details
   ’ Requirements zijn testbaar
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
Een gebruiker werkt in het dagelijkse planning scherm en heeft een filter actief (bijv. filter op specifiek project). De gebruiker vinkt een **herhalende taak** af. Na het afvinken moet de filter actief blijven, zodat de gebruiker door kan werken met dezelfde gefilterde weergave zonder de filter opnieuw te moeten instellen.

### Acceptance Scenarios

1. **Given** dagelijkse planning scherm is geopend en gebruiker heeft een project filter actief (bijv. "Verbouwing")
   **When** gebruiker vinkt een **herhalende taak** af die binnen het filter valt
   **Then** de herhalende taak verdwijnt uit de lijst EN de nieuwe instantie verschijnt (als deze aan het filter voldoet) EN de filter blijft actief

2. **Given** dagelijkse planning scherm is geopend en gebruiker heeft een context filter actief (bijv. "Werk")
   **When** gebruiker vinkt een **herhalende taak** af die binnen het filter valt
   **Then** de herhalende taak verdwijnt EN de volgende instantie wordt aangemaakt EN de filter blijft actief op "Werk"

3. **Given** dagelijkse planning scherm is geopend en gebruiker heeft een prioriteit filter actief (bijv. "Hoog")
   **When** gebruiker vinkt een **herhalende taak** af met hoge prioriteit
   **Then** de taak wordt afgewerkt EN de nieuwe instantie verschijnt (indien hoge prioriteit) EN de filter blijft actief

4. **Given** dagelijkse planning scherm is geopend en gebruiker heeft meerdere filters actief (project + context)
   **When** gebruiker vinkt een **herhalende taak** af
   **Then** beide filters blijven actief na het afvinken en opnieuw renderen van de lijst

### Edge Cases
- Wat gebeurt er als een herhalende taak wordt afgevinkt en de nieuwe instantie NIET aan het actieve filter voldoet? (Filter moet actief blijven, nieuwe taak verschijnt niet in lijst)
- Wat gebeurt er bij event-based herhalende taken waarbij de gebruiker een datum moet invoeren? (Filter moet ook na de event datum popup actief blijven)
- Wat gebeurt er als er geen filter actief is? (Normale werking, geen filter hoeft behouden te worden)

## Requirements

### Functional Requirements
- **FR-001**: Systeem MOET actieve filters behouden na het afvinken van een herhalende taak in dagelijkse planning scherm
- **FR-002**: Systeem MOET filters opnieuw toepassen na het aanmaken van een nieuwe instantie van een herhalende taak
- **FR-003**: Systeem MOET filters behouden bij alle types herhalende taken (dagelijks, wekelijks, maandelijks, yearly, event-based)
- **FR-004**: Gebruikers MOETEN kunnen blijven werken met hun actieve filters zonder deze opnieuw in te stellen na het afvinken van herhalende taken
- **FR-005**: Systeem MOET dezelfde filter persistentie logica gebruiken als bij normale taken (consistency requirement)

### Key Entities
- **Herhalende Taak**: Een taak met herhaling_actief=true en een herhaling_type. Bij afvinken wordt automatisch een nieuwe instantie aangemaakt voor de volgende datum.
- **Dagelijkse Planning Filter State**: De actieve filter instellingen (project, context, prioriteit) die de gebruiker heeft geselecteerd in het dagelijkse planning scherm.
- **Filter Persistentie**: De capaciteit van het systeem om filter state te behouden over UI updates heen, specifiek na het afvinken en opnieuw renderen van de acties lijst.

---

## Context: Eerdere Fix

In Feature 050 is een fix geïmplementeerd voor filter persistentie bij **normale taken**. De fix voegde een `filterPlanningActies()` call toe na het opnieuw renderen van de acties lijst. Deze fix werkt correct voor normale taken, maar blijkt niet te werken voor herhalende taken.

**Waarom werkt de huidige fix niet voor herhalende taken?**

Bij herhalende taken is er een extra complexiteit:
1. De afgevinkte taak wordt verwijderd
2. Een nieuwe instantie wordt aangemaakt via de API
3. De nieuwe instantie wordt opgehaald en toegevoegd aan de lokale arrays
4. De acties lijst wordt opnieuw gerenderd

Ergens in deze flow wordt de filter state niet correct behouden of niet opnieuw toegepast.

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
- [x] Success criteria are measurable (filter blijft actief = visueel verifieerbaar)
- [x] Scope is clearly bounded (alleen dagelijkse planning, alleen herhalende taken)
- [x] Dependencies and assumptions identified (builds on Feature 050 fix)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (geen ambiguïteiten)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
