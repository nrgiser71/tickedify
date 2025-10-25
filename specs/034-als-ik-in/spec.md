# Feature Specification: Admin2 Bericht Edit Weergave Bug Fix

**Feature Branch**: `034-als-ik-in`
**Created**: 2025-10-24
**Status**: Draft
**Input**: User description: "Als ik in het admin2 scherm een bericht open waar een specifieke gebruiker is aangeduid en als trigger "volgend bezoek aan pagina" is aangeduid, dan kan ik zowel de gekozen gebruiker als de gekozen pagina niet zien. Ze zijn wel in de database opgenomen, maar ze worden niet weergegeven in het editscherm van het bericht."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature beschrijving is duidelijk: bug fix voor admin2 bericht edit weergave
2. Extract key concepts from description
   ’ Actors: admin gebruiker
   ’ Actions: bericht openen in admin2 scherm
   ’ Data: gebruiker selectie, pagina selectie, trigger type
   ’ Constraints: data bestaat in database maar wordt niet getoond in UI
3. For each unclear aspect:
   ’ Geen onduidelijkheden - concrete bug met reproduceerbare stappen
4. Fill User Scenarios & Testing section
   ’ Scenario helder: open bestaand bericht, verwacht data te zien
5. Generate Functional Requirements
   ’ Elk requirement is testbaar met concrete verwachte output
6. Identify Key Entities (if data involved)
   ’ Berichten met trigger configuratie en gebruiker targeting
7. Run Review Checklist
   ’ Geen [NEEDS CLARIFICATION] markers
   ’ Geen implementatie details, focus op verwacht gedrag
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
Als admin gebruiker wil ik bestaande berichten kunnen bewerken en daarbij de huidige configuratie (gekozen gebruiker, trigger type, pagina selectie) kunnen zien, zodat ik correcte wijzigingen kan aanbrengen zonder eerst de database te raadplegen.

### Acceptance Scenarios
1. **Given** een bericht bestaat met trigger type "volgend bezoek aan pagina", specifieke gebruiker selectie, en specifieke pagina selectie, **When** de admin het bericht opent in het admin2 editscherm, **Then** worden alle drie configuratie elementen correct weergegeven in de interface (gebruikersnaam zichtbaar, trigger type "volgend bezoek aan pagina" geselecteerd, paginanaam zichtbaar)

2. **Given** een bericht met gebruiker "jan@buskens.be" en pagina "/app/dagelijkse-planning" is opgeslagen in database, **When** de admin het bericht opent voor bewerking, **Then** toont het editscherm "jan@buskens.be" in het gebruiker veld en "/app/dagelijkse-planning" in het pagina veld

3. **Given** een bericht met trigger "volgend bezoek aan pagina", **When** de admin het editscherm opent, **Then** is de radio button of dropdown voor "volgend bezoek aan pagina" pre-selected met de juiste visuele status

### Edge Cases
- Wat gebeurt er wanneer een gebruiker in de database staat maar niet meer bestaat als actieve gebruiker?
- Hoe toont het systeem een pagina selectie die mogelijk niet meer in de huidige pagina lijst voorkomt?
- Wordt een bericht zonder gebruiker selectie (broadcast bericht) correct weergegeven als "alle gebruikers"?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Systeem MOET bij het openen van een bestaand bericht in admin2 editscherm alle opgeslagen velden uit de database laden
- **FR-002**: Systeem MOET de geselecteerde gebruiker weergeven in het gebruiker selectie veld wanneer een bericht een specifieke gebruiker target bevat
- **FR-003**: Systeem MOET het trigger type "volgend bezoek aan pagina" pre-selecteren in de trigger type selector wanneer dit het opgeslagen trigger type is
- **FR-004**: Systeem MOET de geselecteerde pagina weergeven in het pagina selectie veld wanneer een "volgend bezoek aan pagina" trigger is geconfigureerd
- **FR-005**: Systeem MOET duidelijk onderscheid maken tussen lege velden (nog niet ingevuld) en geladen velden met waarden uit de database
- **FR-006**: Systeem MOET consistent gedrag tonen voor alle trigger types bij het laden van bestaande berichten (niet alleen "volgend bezoek aan pagina")
- **FR-007**: Admin gebruikers MOETEN kunnen verifiëren dat de getoonde configuratie overeenkomt met de database waarden zonder externe tools te gebruiken

### Key Entities *(include if feature involves data)*
- **Bericht**: Admin communicatie met configuratie voor targeting (specifieke gebruiker of broadcast), trigger type (onmiddellijk, volgend bezoek, specifieke pagina), en inhoud
- **Trigger Configuratie**: Definieert wanneer een bericht wordt getoond, inclusief trigger type en gerelateerde parameters (zoals pagina URL voor "volgend bezoek aan pagina")
- **Gebruiker Targeting**: Specificeert of bericht naar alle gebruikers gaat of naar een specifieke gebruiker

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
