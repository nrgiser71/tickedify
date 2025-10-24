# Feature Specification: Admin Message Display Debug & Validatie Verbetering

**Feature Branch**: `031-ik-heb-in`
**Created**: 2025-10-24
**Status**: Draft
**Input**: User description: "Ik heb in admin2 een nieuw bericht gemaakt dat voor info@baasoverjetijd.be moet getoond worden als hij de eerste keer op de Actions pagina komt. Maar het bericht verschijnt niet. Is het bericht correct geregistreerd? Is er een ander probleem?"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Bug report: bericht aangemaakt maar verschijnt niet
2. Extract key concepts from description
   ’ Actors: admin, gebruiker (info@baasoverjetijd.be)
   ’ Actions: bericht aanmaken, bericht weergeven
   ’ Constraints: eerste keer op Actions pagina
3. Debug analyse uitgevoerd (via bug-hunter agent)
   ’ Oorzaak: email mismatch (info@baasoverjetijd.be vs jan@buskens.be)
4. Fill User Scenarios & Testing section
   ’ Scenario: admin maakt bericht maar gebruikt verkeerd email
5. Generate Functional Requirements
   ’ Validatie, UX verbeteringen, preventieve maatregelen
6. Identify Key Entities
   ’ admin_messages, users, message_interactions
7. Run Review Checklist
   ’ Spec compleet en implementeerbaar
8. Return: SUCCESS (spec ready for planning)
```

---

## ¡ Quick Guidelines
-  Focus op WHAT users need en WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
Een admin wil een bericht aanmaken in admin2 voor een specifieke gebruiker. De admin zoekt de gebruiker op via email adres, selecteert deze, maakt het bericht aan, en verwacht dat de gebruiker het bericht ziet wanneer deze de Actions pagina bezoekt.

**Huidige probleem**: Admin zocht op `info@baasoverjetijd.be` maar de daadwerkelijke bèta gebruiker heeft email `jan@buskens.be` in het systeem. Het bericht werd aangemaakt maar verschijnt niet omdat de verkeerde gebruiker (of geen gebruiker) werd geselecteerd.

### Acceptance Scenarios

1. **Given** admin zoekt gebruiker op incorrect email adres in admin2, **When** admin maakt bericht aan voor deze "niet-gevonden" gebruiker, **Then** systeem moet valideren dat er geen gebruiker is geselecteerd en een foutmelding tonen voordat het bericht wordt opgeslagen

2. **Given** admin heeft gebruiker correct geselecteerd via zoekfunctie, **When** admin bekijkt de "Geselecteerde Gebruikers" lijst, **Then** systeem moet duidelijk de email adressen tonen van geselecteerde gebruikers zodat admin kan verifiëren

3. **Given** admin wil bericht aanmaken voor specifieke gebruiker, **When** admin klikt op "Preview", **Then** systeem moet tonen welke gebruikers dit bericht exact zullen ontvangen (met emails en namen)

4. **Given** bericht is aangemaakt met correcte gebruiker selectie, **When** de gebruiker de Actions pagina bezoekt, **Then** bericht moet verschijnen volgens de ingestelde trigger (immediate, days after signup, etc.)

5. **Given** admin maakt bericht aan, **When** admin vergeet "Actief" toggle aan te zetten, **Then** systeem moet waarschuwen dat het bericht niet zichtbaar zal zijn

6. **Given** admin maakt bericht aan, **When** publish date ligt in de toekomst, **Then** systeem moet duidelijk maken dat het bericht pas vanaf die datum zichtbaar wordt

### Edge Cases
- Wat gebeurt er als admin zoekt op gedeeltelijk email adres? (bijv. "baas" zoekt naar "@baasoverjetijd.be")
- Wat als er meerdere gebruikers met vergelijkbare emails zijn? (selectie duidelijkheid)
- Wat als een gebruiker meerdere berichten tegelijk heeft (hoe worden deze getoond?)
- Wat als bericht wordt aangemaakt maar database transactie faalt?
- Wat als gebruiker email adres verandert na bericht aanmaak?

---

## Requirements

### Functional Requirements

**Validatie & Data Integriteit**
- **FR-001**: Systeem MOET valideren dat bij target_type 'specific_users' minimaal één gebruiker is geselecteerd voordat bericht wordt opgeslagen
- **FR-002**: Systeem MOET foutmelding tonen als admin probeert bericht aan te maken voor specifieke gebruikers zonder gebruiker selectie
- **FR-003**: Systeem MOET verifiëren dat geselecteerde user IDs valide zijn en bestaan in de database

**User Experience & Feedback**
- **FR-004**: Admin interface MOET duidelijk tonen welke gebruikers zijn geselecteerd, inclusief hun email adressen en namen
- **FR-005**: Systeem MOET waarschuwen als "Actief" toggle niet is aangezet bij bericht aanmaken
- **FR-006**: Systeem MOET duidelijk maken wanneer publish date in de toekomst ligt en het bericht nog niet zichtbaar is
- **FR-007**: Preview functie MOET tonen welke gebruikers het bericht exact zullen ontvangen (met emails en namen)

**Zoekfunctionaliteit**
- **FR-008**: User search MOET zoeken op gedeeltelijke matches van email adres, naam en andere relevante velden
- **FR-009**: Search results MOETEN duidelijk email adres EN naam tonen om juiste selectie te faciliteren
- **FR-010**: Systeem MOET feedback geven als zoekopdracht geen resultaten oplevert

**Debugging & Logging**
- **FR-011**: Backend MOET loggen welke berichten worden opgehaald voor welke gebruiker (voor debugging)
- **FR-012**: Frontend MOET loggen of berichten worden ontvangen en getoond (console logging)
- **FR-013**: Admin interface MOET laten zien hoeveel gebruikers een bericht zullen ontvangen bij "Preview"

**Testing & Verificatie**
- **FR-014**: Systeem MOET test functie bieden waarmee admin kan verifiëren of bericht correct is opgeslagen
- **FR-015**: Systeem MOET admin kunnen laten inloggen als specifieke gebruiker om bericht weergave te testen

### Key Entities

- **admin_messages**: Berichten aangemaakt door admins met targeting criteria (target_type, target_users array, publish_at, active status, trigger settings)
- **users**: Gebruikers in het systeem met email adres, naam, subscription type, signup datum
- **message_interactions**: Tracking van welke gebruiker welke berichten heeft gezien, dismissed of snoozed

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
- [x] Ambiguities marked (none - problem is clear)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Root Cause Analysis

**Geïdentificeerde Oorzaak**: Email adres mismatch tussen gezochte gebruiker (`info@baasoverjetijd.be`) en werkelijke bèta gebruiker (`jan@buskens.be` volgens CLAUDE.md testing credentials).

**Impact**: Bericht werd opgeslagen met lege of incorrecte target_users array, waardoor database query de gebruiker niet match en bericht niet wordt getoond.

**Preventie**: Betere validatie, duidelijkere UX feedback, en preview functionaliteit om admin te helpen verifiëren dat correcte gebruikers zijn geselecteerd.

---

## Success Criteria

1. Admin kan niet langer een bericht aanmaken voor specifieke gebruikers zonder daadwerkelijk gebruikers te selecteren
2. Admin ziet duidelijk welke gebruikers zijn geselecteerd (emails + namen) tijdens bericht aanmaak
3. Preview functie toont exact welke gebruikers het bericht zullen ontvangen
4. Waarschuwingen verschijnen als bericht niet zichtbaar zal zijn (inactive, toekomstige publish date)
5. Zoekfunctionaliteit vindt gebruikers op gedeeltelijke email matches
6. Debugging logs maken het mogelijk om te verifiëren waarom een bericht wel/niet verschijnt
