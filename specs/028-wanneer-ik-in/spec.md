# Feature Specification: Real-time Bericht Notificatie bij Navigatie

**Feature Branch**: `028-wanneer-ik-in`
**Created**: 2025-10-23
**Status**: Draft
**Input**: User description: "Wanneer ik in admin2 een bericht maak dat op een bepaald moment in de toekomst moet verschijnen, dan verschijnt dat niet als ik al ingelogd ben en navigeer tissen verschillende pagina's. Het verschijnt alleen als ik de pagina refresh. Zorg ervoor dat wanneer ik naar een andere pagina navigeer dat er gekeken wordt of er een bericht klaar staat en indien dat het geval is, toon het dan."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Description identifies: Admin creating scheduled messages, navigation behavior, display timing issue
2. Extract key concepts from description
   ’ Actors: Admin user
   ’ Actions: Create scheduled message, navigate between pages
   ’ Data: Scheduled messages with display times
   ’ Constraints: Message should appear without page refresh
3. For each unclear aspect:
   ’ [RESOLVED] Display timing is clear: when scheduled time arrives
   ’ [RESOLVED] Trigger is clear: navigation between pages
4. Fill User Scenarios & Testing section
   ’ User flow: Admin schedules message ’ User navigates ’ Message appears
5. Generate Functional Requirements
   ’ Each requirement is testable
6. Identify Key Entities (if data involved)
   ’ Message entity with display time property
7. Run Review Checklist
   ’ No implementation details included
   ’ Requirements are testable and unambiguous
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
Als beheerder maak ik een bericht aan in het admin panel dat gepland is om over 5 minuten te verschijnen voor eindgebruikers. Ik blijf ingelogd in de applicatie en navigeer tussen verschillende pagina's (bijv. van Lijst Acties naar Dagelijkse Planning). Op het moment dat het geplande tijdstip bereikt wordt, moet het bericht automatisch verschijnen, ongeacht op welke pagina ik ben, zonder dat ik de pagina hoef te refreshen.

### Acceptance Scenarios
1. **Given** een beheerder heeft een bericht aangemaakt met display_at tijd over 2 minuten, **When** de gebruiker na 2 minuten van pagina A naar pagina B navigeert, **Then** verschijnt het bericht direct na navigatie
2. **Given** een beheerder heeft een bericht aangemaakt met display_at tijd over 2 minuten, **When** de gebruiker op dezelfde pagina blijft en de display_at tijd wordt bereikt, **Then** verschijnt het bericht automatisch zonder actie van de gebruiker
3. **Given** meerdere berichten zijn gepland voor verschillende tijdstippen, **When** de gebruiker navigeert terwijl een bericht klaarstaat, **Then** verschijnen alleen de berichten waarvan de display_at tijd al verstreken is
4. **Given** een bericht is gepland voor over 10 minuten, **When** de gebruiker nu tussen pagina's navigeert, **Then** verschijnt het bericht nog niet
5. **Given** een gebruiker heeft een bericht al gezien en weggedrukt, **When** de gebruiker later navigeert, **Then** verschijnt dit bericht niet opnieuw

### Edge Cases
- Wat gebeurt er als een gebruiker tussen twee pagina's navigeert op exact het moment dat een bericht klaarstaat?
- Wat gebeurt er als er meerdere berichten tegelijk klaarstaan bij één navigatie?
- Wat gebeurt er als een gebruiker offline is op het moment dat een bericht gepland staat en later weer online komt?
- Wat gebeurt er als een bericht gepland staat terwijl de gebruiker niet ingelogd is, en later inlogt?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST controleren op nieuwe berichten elke keer dat een gebruiker naar een andere pagina navigeert binnen de applicatie
- **FR-002**: System MUST alleen berichten tonen waarvan de geplande display_at tijd al verstreken is op het moment van controle
- **FR-003**: System MUST berichten direct tonen bij navigatie zonder dat de gebruiker de pagina hoeft te refreshen
- **FR-004**: System MUST voorkomen dat hetzelfde bericht meerdere keren getoond wordt aan dezelfde gebruiker
- **FR-005**: System MUST berichten tonen in dezelfde modal/popup stijl als bij een pagina refresh
- **FR-006**: System MUST berichten controleren op alle pagina's binnen de applicatie waar gebruikers kunnen navigeren
- **FR-007**: System MUST de laatst getoonde berichten bijhouden per gebruiker om duplicaten te voorkomen

### Key Entities *(include if feature involves data)*
- **Bericht**: Een gecommuniceerde boodschap met een geplande weergave tijd (display_at), inhoud, titel, en tracking van welke gebruikers het al hebben gezien
- **Gebruiker**: De ingelogde persoon die berichten kan ontvangen, met tracking van welke berichten al getoond zijn
- **Navigatie Event**: Het moment waarop een gebruiker van de ene naar de andere pagina navigeert binnen de applicatie

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
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
