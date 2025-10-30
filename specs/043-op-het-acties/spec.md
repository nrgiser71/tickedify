# Feature Specification: Bulk Eigenschappen Bewerking Acties Scherm

**Feature Branch**: `043-op-het-acties`
**Created**: 2025-10-30
**Status**: Ready for Planning
**Clarifications Completed**: 2025-10-30
**Input**: User description: "Op het acties scherm wil ik bij het bulkbewerken een extra mogelijkheid toevoegen. Ik wil dat mensen een aantal acties kunnen aanduiden en voor alle geselecteerde taken één of meerdere eigenschappen de waardes invullen. Ik geef een voorbeeld om het toe te lichten. De gebruiker selecteert 10 taken en wil de context voor deze 10 taken instellen op 'Thuis' en de 'Estimated time duration' instellen op 15 minuten. De eigenschappen die aangepast moeten kunnen worden zijn Project, Datum, Context en Priority. Hoe pakken we dit het beste aan? Ik dacht aan een extra knop onderaan het scherm wanneer we in bulk mode zijn. Die knop zou dan een popup tonen met de eigenschappen die aangepast kunnen worden. Maar dat is maar een eerste idee. Misschien kan het beter. Denk even mee hoe wet dit volgens jou het beste visueel kunnen oplossen."

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature identified: Bulk property editing for multiple tasks
2. Extract key concepts from description
   → Actors: Users selecting multiple tasks (minimum 2)
   → Actions: Select tasks, set properties in bulk, confirm changes, apply
   → Data: Task properties (Project, Datum, Context, Priority, Estimated time duration)
   → Constraints: Only modify selected tasks, preserve unmodified properties
3. Clarifications resolved:
   ✓ Estimated time duration: INCLUDED in scope
   ✓ UI approach: Button onderaan scherm tijdens bulk mode
   ✓ Interface: Modal popup (consistent met recurring/priority popups)
   ✓ Properties: Optional fields (partial updates allowed)
   ✓ Cancellation: Discard all changes, keep selection intact
   ✓ Minimum selection: 2+ taken required
   ✓ Confirmation: JavaScript confirm() dialog before applying
   ✓ Feedback: Toast success message (like existing bulk actions)
   ✓ Post-apply: Exit bulk mode + reload list (selection cleared)
   ✓ Mixed values: Show empty field (no placeholder text)
4. Fill User Scenarios & Testing section
   → Main flow: Select 2+ tasks → Click bulk edit button → Fill properties → Confirm → Apply
5. Generate Functional Requirements
   → All requirements testable and unambiguous
6. Identify Key Entities
   → Task properties that can be bulk-edited
7. Run Review Checklist
   → All clarifications resolved
8. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines
- Focus on WHAT users need and WHY
- Avoid HOW to implement (no tech stack, APIs, code structure)
- Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
Als gebruiker wil ik meerdere taken tegelijk selecteren (minimum 2) en voor al deze taken dezelfde eigenschappen kunnen instellen (zoals Context, Project, Datum, Priority, Estimated time duration), zodat ik niet elke taak individueel hoef te bewerken. Dit bespaart tijd bij het organiseren van groepen taken die dezelfde eigenschappen delen.

**Voorbeeld**: Gebruiker heeft 10 taken die allemaal thuis uitgevoerd moeten worden en elk ongeveer 15 minuten duren. In plaats van 10 keer dezelfde waarden in te voeren, selecteert de gebruiker alle 10 taken, klikt op de bulk eigenschappen knop, stelt Context op "Thuis" en Estimated time op "15 minuten" in, bevestigt de wijziging, en alle taken worden in één keer aangepast.

### Acceptance Scenarios

1. **Given** gebruiker heeft bulk-bewerken modus geactiveerd en heeft 5 taken geselecteerd
   **When** gebruiker klikt op bulk eigenschappen button, stelt Context in op "Kantoor" en Priority op "Hoog", en bevestigt de wijziging
   **Then** alle 5 geselecteerde taken krijgen Context "Kantoor" en Priority "Hoog" toegewezen, terwijl andere eigenschappen ongewijzigd blijven, daarna wordt bulk mode uitgeschakeld en lijst herlaad

2. **Given** gebruiker heeft 3 taken geselecteerd in bulk-bewerken modus
   **When** gebruiker opent bulk eigenschappen popup en stelt alleen Project in op "Website vernieuwing" (laat andere velden leeg), en bevestigt
   **Then** alleen het Project wordt aangepast voor de 3 taken, alle andere eigenschappen blijven ongewijzigd

3. **Given** gebruiker heeft bulk eigenschappen popup geopend met 8 geselecteerde taken en heeft enkele velden ingevuld
   **When** gebruiker annuleert de popup (Escape of Cancel button)
   **Then** geen enkele taak wordt aangepast, gebruiker keert terug naar bulk-bewerken modus met selectie intact

4. **Given** gebruiker heeft 15 taken geselecteerd waarvan sommige al een Project hebben en andere niet
   **When** gebruiker opent bulk eigenschappen popup
   **Then** alle velden tonen lege waarden (geen "Mixed" indicator), gebruiker kan nieuwe waarden invullen

5. **Given** gebruiker heeft 15 taken geselecteerd en bulk eigenschappen popup ingevuld
   **When** gebruiker klikt op Opslaan/Apply
   **Then** systeem toont JavaScript confirm() dialog met bericht "15 taken aanpassen met deze eigenschappen?", gebruiker moet bevestigen voordat wijzigingen worden toegepast

6. **Given** gebruiker is in bulk-bewerken modus maar heeft slechts 1 taak geselecteerd
   **When** gebruiker probeert bulk eigenschappen button te klikken
   **Then** button is disabled of toont waarschuwing "Selecteer minimaal 2 taken voor bulk bewerking"

7. **Given** gebruiker is in normale weergave (niet bulk-bewerken modus)
   **When** gebruiker bekijkt het acties scherm
   **Then** bulk eigenschappen bewerking optie is niet zichtbaar

8. **Given** gebruiker heeft succesvol bulk eigenschappen aangepast voor 7 taken
   **When** de wijzigingen zijn toegepast
   **Then** systeem toont toast success message "7 taken aangepast", bulk mode wordt uitgeschakeld, lijst wordt herlaad (selectie gewist)

### Edge Cases

- Wat gebeurt er wanneer gebruiker 0 taken heeft geselecteerd? Button moet disabled zijn
- Hoe handelt het systeem een situatie af waarbij gebruiker enorm veel taken selecteert (bijvoorbeeld 100+)? Progress indicator tonen tijdens processing
- Wat als gebruiker een Datum instelt die in het verleden ligt? Validatie: waarschuwing maar toch toestaan (flexibiliteit)
- Wat als gebruiker alle velden leeg laat en op Opslaan klikt? Validatie: waarschuwing "Geen eigenschappen geselecteerd" en popup blijft open
- Wat gebeurt er bij network error tijdens bulk update? Toast error message, taken die wel succesvol waren blijven aangepast, geen reload
- Moeten taken die al voltooid zijn kunnen worden geselecteerd? Ja, voltooid zijn kunnen ook bulk bewerkt worden (datum aanpassen voor history bijvoorbeeld)

## Requirements

### Functional Requirements

- **FR-001**: Systeem MOET in bulk-bewerken modus een button onderaan het scherm tonen met label "Edit Properties" (of NL: "Eigenschappen Bewerken") waarmee gebruiker bulk eigenschappen bewerking kan activeren
- **FR-002**: Systeem MOET bulk eigenschappen button ALLEEN enabled maken wanneer minstens 2 taken zijn geselecteerd
- **FR-003**: Gebruikers MOETEN via bulk eigenschappen bewerking de volgende eigenschappen kunnen instellen: Project, Datum, Context, Priority, Estimated time duration
- **FR-004**: Systeem MOET alle property velden als optioneel behandelen - gebruiker kan kiezen welke properties te wijzigen
- **FR-005**: Systeem MOET eigenschappen die niet worden ingevuld in de bulk bewerking ongewijzigd laten voor alle geselecteerde taken
- **FR-006**: Gebruikers MOETEN de bulk bewerking kunnen annuleren via Cancel button of Escape toets zonder dat wijzigingen worden toegepast
- **FR-007**: Systeem MOET na invullen en klikken op Save/Apply button een JavaScript confirm() dialog tonen met bericht "[X] taken aanpassen met deze eigenschappen?"
- **FR-008**: Systeem MOET alleen wijzigingen toepassen als gebruiker de confirm() dialog bevestigt (OK klikt)
- **FR-009**: Systeem MOET visuele feedback geven via toast success message in formaat "[X] taken aangepast" na succesvolle bulk bewerking
- **FR-010**: Systeem MOET na succesvolle bulk bewerking de bulk mode uitschakelen en de takenlijst herladen (selectie wordt gewist door reload)
- **FR-011**: Systeem MOET gedrag na bulk eigenschappen bewerking consistent houden met bestaande bulk acties (verplaatsen, datum wijzigen): toast feedback, bulk mode uit, lijst reload
- **FR-012**: Systeem MOET validatie toepassen op ingevulde waarden (geldig Project uit lijst, geldige Datum format, geldige Context uit lijst, geldige Priority uit opties)
- **FR-013**: Systeem MOET waarschuwing tonen als gebruiker probeert op te slaan zonder enkel veld in te vullen: "Geen eigenschappen geselecteerd"
- **FR-014**: Systeem MOET bij network errors tijdens bulk update een toast error message tonen en lijst niet herladen (behoud partial state)

### UI/UX Requirements

- **UX-001**: Toegang tot bulk eigenschappen bewerking via button onderaan scherm tijdens bulk mode, naast bestaande bulk action buttons (consistent positionering)
- **UX-002**: Bulk eigenschappen interface als modal popup overlay (consistent met recurring task popup, priority popup patterns)
- **UX-003**: Popup MOET duidelijke header tonen met aantal te bewerken taken: "Eigenschappen bewerken voor [X] taken"
- **UX-004**: Alle property velden in popup MOETEN leeg zijn bij openen (geen "Mixed" placeholders of pre-filled waarden)
- **UX-005**: Popup MOET volgende velden bevatten in deze volgorde:
  1. Project dropdown (alle bestaande projecten + "Geen project")
  2. Datum date picker
  3. Context dropdown (alle bestaande contexten + "Geen context")
  4. Priority dropdown (Laag, Normaal, Hoog)
  5. Estimated time duration input (minuten)
- **UX-006**: Popup MOET action buttons onderaan tonen: "Annuleren" (links) en "Opslaan" (rechts, primary styling)
- **UX-007**: Popup MOET keyboard navigatie ondersteunen: Tab tussen velden, Enter op Save button = opslaan workflow, Escape = annuleren
- **UX-008**: Popup MOET centered positioning hebben met semi-transparent backdrop (consistent met bestaande Tickedify popups)
- **UX-009**: Button "Eigenschappen Bewerken" MOET disabled appearance hebben wanneer minder dan 2 taken geselecteerd zijn
- **UX-010**: Save button in popup MOET disabled zijn totdat minstens 1 veld is ingevuld

### Performance Requirements

- **PR-001**: Bij selectie van 100+ taken MOET systeem progress indicator tonen tijdens bulk update processing
- **PR-002**: Bulk update MOET max 500ms per taak nemen bij normale network condities

### Key Entities

- **Taak (Task)**: Centrale entiteit waarvan eigenschappen worden bewerkt
  - Eigenschappen die bulk bewerkt kunnen worden: Project, Datum, Context, Priority, Estimated time duration
  - Heeft huidige waarden die behouden moeten blijven als niet gewijzigd in bulk actie
  - Validatie: Project moet bestaan in database, Datum moet valid format zijn, Context moet bestaan, Priority moet Laag/Normaal/Hoog zijn

- **Selectie (Selection)**: Tijdelijke groepering van taken in bulk-bewerken modus
  - Minimum: 2 taken
  - Bevat referenties naar geselecteerde taken (Set van taak IDs)
  - Blijft actief tijdens bulk eigenschappen popup
  - Wordt gewist na succesvolle bulk bewerking (door lijst reload)
  - Blijft intact na annuleren van popup

- **Bulk Eigenschappen Opdracht (Bulk Property Update Command)**: Representeert de gebruiker actie
  - Bevat: object met property keys en nieuwe waarden (alleen ingevulde velden)
  - Bevat: lijst van taak IDs die beïnvloed worden
  - Validatie: controleert geldigheid van waarden voor elk property type
  - Confirmatie: vereist gebruiker bevestiging via JavaScript confirm() voordat execution

---

## Design Decisions Made

### UI Pattern Choice: Button + Modal Popup
**Rationale**:
- Button onderaan scherm: Consistent met bestaande bulk action buttons (verplaatsen, datum), visueel gegroepeerd
- Modal popup: Consistent met bestaande Tickedify patterns (recurring tasks, priority setting), focused editing experience
- Rejected alternatives: Toolbar button (te ver van bulk actions), side panel (te complex voor deze use case), inline editing (visueel rommelig)

### Confirmation Dialog
**Rationale**:
- Bulk eigenschappen bewerking heeft meer impact dan bestaande bulk acties (meerdere properties tegelijk)
- Extra veiligheidslaag voorkomt accidentele bulk wijzigingen
- Gebruik JavaScript confirm(): Simpel, consistent met bestaande Tickedify patterns, geen extra UI component nodig

### Mixed Values Handling: Empty Fields
**Rationale**:
- Lege velden zijn intuïtiever: gebruiker ziet duidelijk dat niets wordt aangepast tenzij ingevuld
- "Mixed" placeholders kunnen verwarrend zijn: suggereert bestaande waarde die er niet echt is
- Simpelere implementatie: geen logica nodig om huidige waarden te detecteren en tonen

### Minimum 2 Tasks
**Rationale**:
- "Bulk" operatie impliceert meerdere items
- Voor 1 taak kan gebruiker normale edit functie gebruiken (sneller, directere feedback)
- Voorkomt verwarring: duidelijk onderscheid tussen single edit vs bulk edit

### Post-Apply: Exit Bulk Mode
**Rationale**:
- Consistent met bestaande bulk acties
- Clean state: voorkomt accidentele dubbele bulk acties
- Gebruiker ziet direct resultaat van bulk bewerking in normale lijst view

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain - **All clarifications resolved**
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and resolved (9 clarifications completed)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Technical Context (for Planning Phase)

### Existing Bulk Actions Pattern
Based on codebase analysis (app.js:12300-12484):
- Current bulk actions: `bulkDateAction()`, `bulkVerplaatsNaar()`
- Feedback: `toast.success('[X] tasks moved/updated')`
- Post-action: `toggleBulkModus()` + `preserveActionsFilters(() => laadHuidigeLijst())`
- No confirmation dialogs in current bulk actions
- Progress tracking: `loading.showWithProgress()` + `loading.updateProgress()`

### Consistency Requirements
New bulk eigenschappen feature MUST follow existing patterns:
- Button styling: `class="bulk-action-btn"`
- Toast feedback: `toast.success()` format
- Loading: `loading.showWithProgress()` for large selections
- Post-action: Same cleanup as existing bulk actions

---

## Ready for Planning

Deze specification is **compleet en ready voor de planning fase**. Alle requirements zijn duidelijk, testbaar en unambiguous.

**Next step**: Run `/plan` command om implementation planning te starten.
