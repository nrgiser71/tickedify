# Feature Specification: Fix Bulk Edit Prioriteit 404 Errors

**Feature Branch**: `045-afgelopen-nacht-hebben`
**Created**: 2025-10-31
**Status**: Draft
**Input**: User description: "Afgelopen nacht hebben we een probleem opgelost op het acties scherm, waar er een probleem was als we een bulk edit deden van de context. Er was een probleem dat je een onbestaand veld wou updaten. Ik denk dat we hetzelfde probleem hebben met een bulk edit van prioriteit. Ik krijg dezelfde foutmeldingen"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature is about fixing bulk edit for priority field
2. Extract key concepts from description
   ’ Actors: gebruiker die bulk edit uitvoert
   ’ Actions: bulk edit van prioriteit veld
   ’ Data: taken met prioriteit property
   ’ Constraints: dezelfde bug als context field fix
3. For each unclear aspect:
   ’ Context fix was related to onbestaand veld update
   ’ Same pattern appears in priority bulk edit
4. Fill User Scenarios & Testing section
   ’ User selects multiple tasks and changes priority
5. Generate Functional Requirements
   ’ Bulk edit must use correct field names
   ’ API must accept valid task updates
6. Identify Key Entities
   ’ Taken with prioriteit field
7. Run Review Checklist
   ’ Bug fix scope is clear
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
Gebruiker wil meerdere taken tegelijk van prioriteit kunnen veranderen via bulk edit functionaliteit. Momenteel faalt dit met 404 errors ("Taak niet gevonden") voor alle geselecteerde taken, terwijl de taken wel bestaan in het systeem.

### Acceptance Scenarios
1. **Given** gebruiker heeft 3 taken geselecteerd op het acties scherm, **When** gebruiker opent bulk edit popup en wijzigt prioriteit naar "normaal", **Then** alle 3 taken worden succesvol geüpdatet met de nieuwe prioriteit
2. **Given** bulk edit popup toont het prioriteit veld met opties, **When** gebruiker selecteert een prioriteit en bevestigt, **Then** het systeem verstuurt correcte data naar de update API
3. **Given** taken zijn succesvol geüpdatet, **When** gebruiker sluit de popup, **Then** de actielijst toont de taken met hun nieuwe prioriteit

### Edge Cases
- Wat gebeurt er als een taak niet bestaat? Het systeem moet een duidelijke foutmelding tonen
- Wat gebeurt er als de prioriteit niet wijzigt (gebruiker selecteert huidige waarde)? Update moet wel doorgaan zonder fouten
- Wat gebeurt er bij network errors tijdens update? Gebruiker moet foutmelding zien, geselecteerde taken blijven geselecteerd

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Systeem MOET bij bulk edit van prioriteit het correcte veldnaam gebruiken dat overeenkomt met de database kolom
- **FR-002**: Systeem MOET valide task IDs versturen naar de update API endpoint
- **FR-003**: Systeem MOET de prioriteit waarde correct formatteren voor de API (bijv. "normaal", "hoog", "laag")
- **FR-004**: Systeem MOET succesvolle updates bevestigen aan de gebruiker
- **FR-005**: Systeem MOET bij falen van individuele taken duidelijke feedback geven welke taken niet geüpdatet konden worden
- **FR-006**: Systeem MOET dezelfde fix pattern toepassen als gebruikt voor de context field bug (field name mapping correctie)

### Key Entities
- **Taak**: Heeft een prioriteit property die via bulk edit aangepast kan worden
- **Prioriteit**: Mogelijke waarden zijn "hoog", "normaal", "laag" [NEEDS CLARIFICATION: zijn dit de exacte waarden of zijn er meer opties?]
- **Bulk Edit Updates**: Collectie van geselecteerde taken met nieuwe prioriteit waarde

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (1 blijft: prioriteit waarden)
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
- [ ] Review checklist passed (1 clarification needed)

---

## Error Details from Console Logs

### Symptoom
Alle 3 geselecteerde taken falen met:
- HTTP 404 (Not Found)
- Response: `{"error":"Taak niet gevonden"}`
- URL pattern: `PUT /api/taak/{task_id}`
- Updates payload: `{prioriteit: 'normaal'}`

### Vergelijking met Context Fix
De gebruiker vermeldt dat "afgelopen nacht" een vergelijkbaar probleem werd opgelost voor context field, waarbij "een onbestaand veld" werd geüpdatet. Dit suggereert dat:
- De frontend een verkeerde field name gebruikt bij het verzenden van updates
- Of de API een verkeerde field name verwacht bij mapping naar database
- De fix voor context moet als referentie dienen voor priority fix

### Validatie Checks
- Snapshot creatie:  SUCCESVOL (3 taken correct geïdentificeerd)
- Task IDs:  CORRECT (taken bestaan in data source van 36 taken)
- Popup form:  CORRECT (alle velden gevonden en getoond)
- API calls: L FALEN (404 errors voor alle taken)

Dit bevestigt dat het probleem zich bevindt in de API update logica of field name mapping, niet in de task selectie of popup UI.
