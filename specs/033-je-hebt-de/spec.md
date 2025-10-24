# Feature Specification: "Volgend Bezoek Aan Pagina" Bericht Trigger (Correctie)

**Feature Branch**: `033-je-hebt-de`
**Created**: 2025-10-24
**Status**: Ready for Planning - Clarifications Resolved
**Input**: User description: "Je hebt de vorige opdracht niet goed begrepen. Bij het maken van een nieuw bericht heb je nu 'Volgende keer' toegevoegd, maar dat is eigenlijk hetzelfde als 'Direct'. Het was de bedoeling dat het 'Volgend bezoek aan pagina' was. Is dat duidelijk?"

## Execution Flow (main)
```
1. Parse user description from Input
    Feature: Correct implementation of page-specific "next visit" trigger
    Problem: Feature 032 was incorrect - triggered on ANY page visit
    Correction needed: Trigger on next visit to SPECIFIC page only
2. Extract key concepts from description
    Actors: Admin (creating messages), Users (viewing messages)
    Actions: Select page-specific trigger, message shows on next visit to THAT page
    Data: Page identifier, user page visit tracking
    Constraints: Page-specific (not global)
3. For each unclear aspect:
   ✓ RESOLVED: Abandon Feature 032, start fresh with new trigger type
   ✓ RESOLVED: First visit after message creation counts as "next visit"
4. Fill User Scenarios & Testing section
    Clear user flow identified
5. Generate Functional Requirements
    Requirements testable
6. Identify Key Entities
    Page identifier, user_page_visits tracking
7. Run Review Checklist
   � WARN "Spec has uncertainties about migration from 032"
8. Return: SUCCESS (spec ready after clarifications)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
Als admin wil ik een bericht kunnen instellen dat ALLEEN verschijnt bij het volgende bezoek van een gebruiker aan een **SPECIFIEKE pagina** (bijv. /planning of /taken). Dit is anders dan "Direct" die bij ELK pagina bezoek triggert.

**Use Case**: Admin voegt nieuwe filter functionaliteit toe aan de dagelijkse planning pagina. Admin wil dat gebruikers een bericht zien bij hun **volgende bezoek aan /planning**, maar NIET als ze andere pagina's bezoeken.

**Verschil met "Direct"**:
- **"Direct"**: Bericht verschijnt bij ELK page load (ongeacht welke pagina)
- **"Volgend bezoek aan pagina"**: Bericht verschijnt ALLEEN bij volgend bezoek aan SPECIFIEKE pagina

### Acceptance Scenarios

1. **Given** admin heeft bericht aangemaakt met trigger "Volgend bezoek aan pagina: /planning", **When** gebruiker navigeert naar /taken, **Then** verschijnt het bericht NIET.

2. **Given** admin heeft bericht aangemaakt met trigger "Volgend bezoek aan pagina: /planning", **When** gebruiker navigeert naar /planning, **Then** verschijnt het bericht.

3. **Given** gebruiker heeft bericht gezien op /planning en dismissed, **When** gebruiker later opnieuw naar /planning gaat, **Then** verschijnt het bericht NIET meer.

4. **Given** admin heeft bericht aangemaakt met trigger "Volgend bezoek aan pagina: /taken", **When** gebruiker bezoekt /planning (andere pagina), **Then** verschijnt het bericht NIET (page-specific).

5. **Given** gebruiker heeft pagina /planning nog nooit bezocht, **When** admin maakt bericht voor "Volgend bezoek aan pagina: /planning" en gebruiker bezoekt /planning voor eerste keer, **Then** verschijnt het bericht (eerste bezoek telt als "volgend bezoek").

6. **Given** admin heeft TWO berichten: ��n met "Direct" trigger en ��n met "Volgend bezoek aan pagina: /planning", **When** gebruiker bezoekt /planning, **Then** verschijnen BEIDE berichten (triggers zijn onafhankelijk).

### Edge Cases

- **Meerdere pagina berichten**: Als er 2 berichten zijn voor "Volgend bezoek /planning" en 1 voor "Volgend bezoek /taken", toont /planning alleen de /planning berichten.

- **Page identifier format**: Hoe wordt pagina ge�dentificeerd? Door URL path (/planning), route naam, of page ID?

- **Subpagina's**: Als bericht is voor "/planning", geldt dit ook voor "/planning/edit" of "/planning/history"?

- **Browser refresh**: Als gebruiker /planning bezoekt, bericht ziet, en refresht ZONDER dismiss - verschijnt bericht opnieuw? (Waarschijnlijk ja, want nog niet dismissed)

- **First visit**: Telt de eerste visit ooit aan een pagina als "volgend bezoek"? (Waarschijnlijk ja, want het is technisch gezien het "volgende" bezoek na message creation)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MOET bij het aanmaken van een bericht met trigger "Volgend bezoek aan pagina" een pagina selectie veld tonen waar admin de specifieke pagina kan kiezen (bijv. dropdown met /planning, /taken, /actielijst, etc.).

- **FR-002**: System MOET het bericht ALLEEN tonen wanneer gebruiker de SPECIFIEK geselecteerde pagina bezoekt, NIET bij bezoek aan andere pagina's.

- **FR-003**: System MOET het bericht tonen bij de eerste visit aan de specifieke pagina NA message creation, ongeacht of gebruiker die pagina eerder heeft bezocht. Als user /planning bezocht op dag 1, admin maakt bericht op dag 2, user bezoekt /planning op dag 3 - dan is dag 3 het "volgend bezoek".

- **FR-004**: System MOET bijhouden welke gebruiker het bericht al gezien heeft op die specifieke pagina via dismiss tracking.

- **FR-005**: System MOET het bericht blijven tonen bij elk bezoek aan die pagina totdat gebruiker op "Got it" klikt.

- **FR-006**: System MOET een nieuwe trigger type naam gebruiken voor deze feature (bijv. "next_page_visit"). Feature 032 branch wordt abandoned (niet gemerged naar main). Geen backwards compatibility nodig omdat 032 nooit naar productie is gegaan (BÈTA FREEZE).

- **FR-007**: System MOET admin interface pagina selectie dropdown vullen met beschikbare pagina's in de app.

- **FR-008**: System MOET de geselecteerde pagina identifier opslaan bij het bericht (bijv. in trigger_value veld).

- **FR-009**: Admin interface MOET duidelijk maken dat deze trigger PAGE-SPECIFIC is, bijv. via label "=� Volgend bezoek aan pagina" met pagina dropdown eronder.

### Key Entities

- **Bericht (Message)**: Bevat trigger type + page identifier voor "next page visit" trigger.

- **Page Identifier**: Identificatie van specifieke pagina (bijv. URL path zoals "/planning" of route naam).

- **User Page Visit**: Tracking van welke gebruiker welke pagina's heeft bezocht (bestaande user_page_visits tabel kan mogelijk hergebruikt worden).

- **Message Interaction**: Dismiss tracking per gebruiker per bericht (bestaande message_interactions tabel).

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved (2 clarifications answered)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed (all checks complete)

---

## Clarifications RESOLVED ✅

### 1. Visit Timing Definition ✅ RESOLVED

**Question**: Moet "volgend bezoek" de eerste visit NA message creation zijn, of elke visit NA de LAATSTE visit vóór message creation?

**Scenario**:
- Dag 1: User bezoekt /planning (laatste visit)
- Dag 2: Admin maakt bericht "Volgend bezoek aan pagina: /planning"
- Dag 3: User bezoekt /planning

Is dag 3 visit het "volgend bezoek"?

**✅ DECISION**: **Option A - Eerste visit NA creation**
- Ja, eerste visit aan die specifieke pagina NA message creation telt
- Simpeler implementatie, consistent met "volgende keer" concept
- Geen dependency op eerdere visit geschiedenis
- Zelfs eerste visit ooit aan die pagina telt als "volgend bezoek"

---

### 2. Migration Strategy voor Feature 032 ✅ RESOLVED

**Question**: Wat doen we met de incorrecte Feature 032 implementatie?

**Current State**:
- Feature 032 heeft "next_time" trigger type toegevoegd
- Triggert bij ELK page visit (globaal, niet page-specific)
- Code is al gecommit en gepusht naar branch 032-bij-het-maken
- Nog NIET gemerged naar main (BÈTA FREEZE actief)

**✅ DECISION**: **Option A - Abandon 032, Start Fresh**
- Delete/abandon branch 032-bij-het-maken (niet mergen naar main)
- Implementeer correcte versie volledig opnieuw in branch 033-je-hebt-de
- Use nieuwe trigger type naam "next_page_visit" (niet "next_time")
- Voordelen:
  - Clean slate, geen confusion over trigger naam
  - Geen backwards compatibility issues (032 nooit in productie)
  - Git history blijft duidelijk (033 = correct implementation)
  - Geen tech debt door incorrecte implementatie
- Feature 032 kan eventueel later verwijderd worden of blijft als referentie

---

## Dependencies & Assumptions

**Bestaande Systemen** (te hergebruiken):
- user_page_visits tabel: Tracks welke user welke pagina's heeft bezocht
- message_interactions tabel: Dismiss tracking
- Page routing systeem: Page identification

**Aannames**:
- Page identifier is URL path (bijv. "/planning", "/taken")
- Bestaande page visit tracking is accuraat
- Admin kent de page identifiers (of we tonen dropdown)
- Trigger naam wordt "next_page_visit" (niet "next_time" van Feature 032)

**Feature 032 Status**:
- � Incorrecte implementatie (globaal ipv page-specific)
- � Branch exists maar NIET gemerged (B�TA FREEZE)
- � Decision needed: abandon, fix, of rename

---

## Verschil met Bestaande Triggers

| Trigger Type | Wanneer Toont Bericht | Page-Specific? |
|--------------|----------------------|----------------|
| **Direct (immediate)** | Bij elke page load | L Nee (globaal) |
| **X dagen na signup** | X dagen na account creatie | L Nee (globaal) |
| **Eerste bezoek aan pagina** | Eerste keer op specifieke pagina |  Ja |
| **Na N bezoeken aan pagina** | Na N visits aan specifieke pagina |  Ja |
| **Feature 032: "Volgende keer" (INCORRECT)** | Bij eerstvolgende page load (ELKE pagina) | L Nee (globaal) - INCORRECT |
| **Feature 033: "Volgend bezoek aan pagina" (CORRECT)** | Bij volgend bezoek aan SPECIFIEKE pagina |  Ja - CORRECT |

**Key Insight**: Feature 032 was een duplicaat van "Direct" trigger, terwijl de bedoeling een page-specific variant was zoals "Eerste bezoek" maar dan "Volgend bezoek".

---

**Status**: ✅ Ready for Planning - All Clarifications Resolved
**Next Step**: Run `/plan` command to generate implementation plan
**Decisions Made**:
- Visit timing: Eerste visit NA message creation (simpel en consistent)
- Migration: Abandon Feature 032, fresh start met "next_page_visit" trigger
