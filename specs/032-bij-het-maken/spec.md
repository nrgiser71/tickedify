# Feature Specification: "Volgende Keer" Bericht Trigger Optie

**Feature Branch**: `032-bij-het-maken`
**Created**: 2025-10-24
**Status**: Ready for Planning
**Input**: User description: "Bij het maken van een nieuw bericht kan je instellen dat een bericht verschijnt wanneer een gebruiker de eerste keer een bepaalde pagina bezoekt of bijvoorbeeld de 5e keer. Ik zou nog een optie willen toevoegen: 'de volgende keer'. Dat zou ik dan gebruiken als ik een nieuwe feature heb toegevoegd aan een pagina en ik wil de gebruikers dat laten weten de volgende keer dat ze die pagina bezoeken."

## Execution Flow (main)
```
1. Parse user description from Input
   ✓ Feature: Add "next time" trigger option to message system
2. Extract key concepts from description
   ✓ Actors: Admin (creating messages), Users (viewing messages)
   ✓ Actions: Select "next time" option, trigger message on next visit
   ✓ Data: Message trigger configuration, dismiss tracking
   ✓ Constraints: Show until dismissed via "Got it" button
3. Clarifications resolved:
   ✓ Message edits: Only new users see updates
   ✓ Multiple messages: All shown simultaneously
   ✓ Target audience: Uses existing doelgroep system
   ✓ Persistence: Via dismiss tracking (not session-based)
   ✓ Help text: Not needed, label is clear
4. Fill User Scenarios & Testing section
   ✓ Clear user flow identified
5. Generate Functional Requirements
   ✓ All requirements testable and unambiguous
6. Identify Key Entities
   ✓ Message trigger configuration entity
7. Run Review Checklist
   ✓ All checks passed
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
Als admin wil ik een nieuwe feature kunnen aankondigen aan gebruikers door een bericht te maken dat automatisch verschijnt de volgende keer dat een gebruiker een specifieke pagina bezoekt. Dit is nuttig wanneer ik een nieuwe functionaliteit heb toegevoegd en alle actieve gebruikers hiervan op de hoogte wil stellen bij hun eerstvolgende bezoek aan die pagina.

**Use Case**: Admin voegt een nieuwe filter functionaliteit toe aan de dagelijkse planning pagina. De admin maakt een "volgende keer" bericht aan met uitleg over deze feature. Alle gebruikers zien dit bericht bij hun volgende bezoek aan de dagelijkse planning, ongeacht wanneer ze de pagina eerder bezochten.

### Acceptance Scenarios
1. **Given** een admin heeft een nieuw bericht aangemaakt met trigger "volgende keer" voor pagina "/planning", **When** een gebruiker die deze pagina eerder al bezocht heeft navigeert naar "/planning", **Then** verschijnt het bericht direct bij het laden van de pagina.

2. **Given** een admin heeft een nieuw bericht aangemaakt met trigger "volgende keer" voor pagina "/taken", **When** een gebruiker die deze pagina nog nooit bezocht heeft navigeert naar "/taken", **Then** verschijnt het bericht direct bij het laden van de pagina (bestaand doelgroep systeem bepaalt of bericht voor nieuwe gebruikers geldt).

3. **Given** een gebruiker heeft een "volgende keer" bericht gezien en op "Got it" geklikt, **When** de gebruiker opnieuw naar dezelfde pagina navigeert, **Then** verschijnt het bericht NIET meer.

4. **Given** een gebruiker heeft een "volgende keer" bericht gezien maar NIET op "Got it" geklikt (bijv. pagina gesloten), **When** de gebruiker later terugkeert naar dezelfde pagina, **Then** verschijnt het bericht opnieuw tot de gebruiker op "Got it" klikt.

5. **Given** er zijn meerdere actieve "volgende keer" berichten voor pagina "/planning", **When** een gebruiker naar "/planning" navigeert, **Then** verschijnen ALLE berichten die de gebruiker nog niet heeft gedismissed.

6. **Given** een admin bewerkt een bestaand "volgende keer" bericht (wijzigt tekst of instellingen), **When** een gebruiker die het originele bericht al gezien en gedismissed heeft naar de pagina navigeert, **Then** verschijnt de update NIET (alleen gebruikers die het origineel nog niet zagen krijgen de update).

### Edge Cases
- **Meerdere berichten**: Als er 3 "volgende keer" berichten zijn voor dezelfde pagina, worden deze allemaal getoond (niet gelimiteerd). Admin moet zelf beheren dat er niet te veel actieve berichten zijn.

- **Browser refresh zonder dismiss**: Als gebruiker de pagina refresht zonder "Got it" te klikken, verschijnt het bericht opnieuw (gewenst gedrag).

- **Doelgroep filtering**: Het bestaande doelgroep systeem blijft volledig functioneren. Als een "volgende keer" bericht is ingesteld voor "Alleen admins", zien alleen admins het bericht bij hun volgende bezoek.

- **Bericht verwijdering**: Als admin een bericht verwijdert, verdwijnt het voor alle gebruikers en wordt het nooit meer getoond.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Systeem MOET een nieuwe trigger optie "Volgende keer" toevoegen aan het bericht aanmaak formulier, naast bestaande opties zoals "Eerste keer" en "5e keer".

- **FR-002**: Systeem MOET "volgende keer" berichten triggeren op basis van het aanmaak tijdstip van het bericht: het bericht moet verschijnen bij het EERSTVOLGENDE pagina bezoek van een gebruiker NA het aanmaken van het bericht.

- **FR-003**: Systeem MOET voor elk "volgende keer" bericht bijhouden welke gebruikers het bericht al gedismissed hebben via de "Got it" knop.

- **FR-004**: Systeem MOET een "volgende keer" bericht blijven tonen bij elk pagina bezoek totdat de gebruiker op "Got it" klikt (persistence via dismiss tracking, niet via sessie).

- **FR-005**: Systeem MOET meerdere actieve "volgende keer" berichten voor dezelfde pagina allemaal tegelijk kunnen tonen (geen limitering op aantal).

- **FR-006**: Admin interface MOET de trigger optie "Volgende keer" tonen zonder extra help text of tooltip (het label is duidelijk genoeg).

- **FR-007**: Systeem MOET wanneer een admin een "volgende keer" bericht bewerkt, de update ALLEEN tonen aan gebruikers die het originele bericht nog niet gezien/gedismissed hebben. Gebruikers die het origineel al gedismissed hebben zien de update NIET.

- **FR-008**: Systeem MOET het bestaande doelgroep filter systeem intact laten werken met "volgende keer" trigger. De trigger bepaalt WANNEER (bij volgende bezoek), de doelgroep bepaalt WIE het ziet.

- **FR-009**: Systeem MOET "volgende keer" berichten consistent behandelen over sessies heen: dismiss status blijft behouden bij logout/login, browser herstart, of andere sessie wissels.

### Key Entities
- **Bericht (Message)**: Bevat trigger type configuratie, waaronder nieuwe "volgende keer" optie. Gekoppeld aan een specifieke pagina/route. Heeft aanmaak tijdstip om "volgende" bezoek te kunnen bepalen.

- **Bericht Dismiss Tracking**: Registreert welke gebruiker welk bericht heeft gedismissed via "Got it" knop, inclusief tijdstip van dismiss. Relatie: één-op-veel tussen Bericht en Gebruikers. Dit mechanisme bestaat al en wordt hergebruikt voor "volgende keer" berichten.

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
- [x] Ambiguities resolved via user clarification
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Clarifications Resolution Summary

Alle ambiguïteiten zijn opgelost via gebruiker feedback:

1. **Bericht Updates**: ✅ RESOLVED - Updates worden NIET opnieuw getoond aan gebruikers die het origineel al gedismissed hebben. Alleen gebruikers die het origineel nog niet zagen krijgen de update.

2. **Meerdere Berichten**: ✅ RESOLVED - Alle actieve "volgende keer" berichten voor dezelfde pagina worden tegelijk getoond. Geen limitering of prioritering.

3. **Doelgroep**: ✅ RESOLVED - Bestaand doelgroep systeem blijft intact. "Volgende keer" is alleen een trigger timing, niet een doelgroep filter. Doelgroep en trigger werken onafhankelijk.

4. **Persistence**: ✅ RESOLVED - Dismiss status is gekoppeld aan "Got it" actie en blijft behouden over sessies, logins en browser restarts. Bericht verschijnt tot gebruiker dismiss klikt.

5. **Help Text**: ✅ RESOLVED - Geen extra tooltip of help text nodig. Het label "Volgende keer" is duidelijk genoeg in de admin interface.

---

## Dependencies & Assumptions

**Bestaande Systemen** (blijven ongewijzigd):
- Doelgroep filter systeem voor berichten
- "Got it" dismiss tracking mechanisme
- Pagina routing en identificatie systeem
- Admin bericht aanmaak interface

**Aannames**:
- Admin is verantwoordelijk voor het beheren van aantal actieve "volgende keer" berichten per pagina
- Bestaande dismiss tracking database structuur kan hergebruikt worden
- Pagina identificatie gebeurt via bestaand routing systeem
- Bericht weergave logica ondersteunt meerdere simultane berichten

**Scope Grenzen**:
- Geen nieuwe doelgroep opties (bestaand systeem blijft)
- Geen nieuwe dismiss mechanismes (bestaande "Got it" blijft)
- Geen automatische cleanup van oude berichten
- Geen admin waarschuwing bij te veel berichten per pagina
