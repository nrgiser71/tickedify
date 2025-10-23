# Feature Specification: Bijlage Limiet Enforcement voor Premium Standard & Zichtbaarheid Fix

**Feature Branch**: `016-nu-ben-ik`
**Created**: 2025-10-18
**Status**: Draft
**Input**: User description: "Nu ben ik de bijlages aan het testen. Daar heb ik ineens 2 problemen ontdekt:
1. Ik heb 2 bijlages kunnen toevoegen (al slepend vanaf de finder van mijn mac). Dat is niet OK. Het is een abonnement van 7 euro en dan mag er maximum 1 bijlage per taak toegevoegd worden
2. Ik heb die taak opgeslagen en als ik in het acties scherm de taak open dan zie ik de bijlages heel even staan, maar dan verdwijnen ze van het scherm. De bijlages moeten natuurlijk zichtbaar zijn.

Onderzoek deze problemen en los ze op."

## Execution Flow (main)
```
1. Parse user description from Input 
   ’ Identified: 2 distinct bugs in attachments system
2. Extract key concepts from description 
   ’ Actors: Premium Standard users (¬7/month subscription)
   ’ Actions: Upload multiple attachments, view attachments after save
   ’ Data: Attachment count per task, subscription tier validation
   ’ Constraints: Max 1 attachment per task for Standard plan
3. For each unclear aspect: 
   ’ All requirements clear from user description
4. Fill User Scenarios & Testing section 
5. Generate Functional Requirements 
6. Identify Key Entities 
7. Run Review Checklist
   ’ No [NEEDS CLARIFICATION] markers
   ’ All requirements testable
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
Een gebruiker met een Premium Standard abonnement (¬7/maand) probeert meerdere bijlagen aan een taak toe te voegen. Het systeem moet dit voorkomen omdat het Standard plan beperkt is tot 1 bijlage per taak. Daarnaast moet de gebruiker bijlagen kunnen zien nadat een taak is opgeslagen en opnieuw geopend.

### Acceptance Scenarios

**Scenario 1: Bijlage limiet voor Premium Standard (Bug #1)**
1. **Given** een gebruiker heeft een Premium Standard abonnement (¬7/maand of ¬70/jaar)
   **When** de gebruiker 1 bijlage aan een taak toevoegt
   **Then** de upload moet succesvol zijn

2. **Given** een gebruiker heeft een Premium Standard abonnement
   **And** de taak heeft al 1 bijlage
   **When** de gebruiker probeert een tweede bijlage te uploaden (via drag & drop of file picker)
   **Then** het systeem moet de upload blokkeren met een duidelijke foutmelding: "Maximum 1 bijlage per taak voor Standard plan. Upgrade naar Premium Plus voor onbeperkte bijlagen."

3. **Given** een gebruiker heeft een Premium Plus abonnement (¬8/maand of ¬80/jaar)
   **When** de gebruiker meerdere bijlagen aan een taak toevoegt
   **Then** alle uploads moeten succesvol zijn (onbeperkt aantal bijlagen)

**Scenario 2: Bijlagen zichtbaarheid na opslaan (Bug #2)**
1. **Given** een taak heeft 1 of meer bijlagen
   **When** de gebruiker de taak opslaat en sluit
   **And** de gebruiker dezelfde taak opnieuw opent in het acties scherm
   **Then** alle bijlagen moeten zichtbaar blijven in de bijlagen sectie
   **And** bijlagen mogen niet verdwijnen of flikkeren

2. **Given** een taak heeft bijlagen
   **When** de gebruiker de taak bewerkt (andere velden wijzigt)
   **And** de gebruiker de wijzigingen opslaat
   **Then** de bijlagen lijst moet intact blijven zonder visuele glitches

### Edge Cases
- Wat gebeurt er als een gebruiker downgradet van Premium Plus naar Standard terwijl taken meer dan 1 bijlage hebben?
  ’ Bestaande bijlagen blijven behouden (geen data verlies), maar nieuwe uploads worden beperkt tot 1 per taak

- Wat gebeurt er als de upload limiet check faalt tijdens een drag & drop operatie?
  ’ Duidelijke foutmelding tonen zonder de UI te blokkeren

- Wat gebeurt er als bijlagen API call faalt tijdens het openen van een taak?
  ’ Graceful error handling: toon een melding maar block de rest van de taak UI niet

## Requirements

### Functional Requirements

**Bug #1: Bijlage Limiet Enforcement**
- **FR-001**: Systeem MUST onderscheid maken tussen Premium Standard (¬7) en Premium Plus (¬8) abonnementen voor bijlage limieten
- **FR-002**: Systeem MUST Premium Standard gebruikers beperken tot maximaal 1 bijlage per taak
- **FR-003**: Systeem MUST Premium Plus gebruikers onbeperkt aantal bijlagen per taak toestaan
- **FR-004**: Systeem MUST gratis/trial gebruikers beperken tot maximaal 1 bijlage per taak
- **FR-005**: Systeem MUST een duidelijke foutmelding tonen wanneer bijlage limiet wordt bereikt, met vermelding van upgrade optie naar Premium Plus
- **FR-006**: Bijlage limiet check MUST plaatsvinden voordat de upload naar de storage backend wordt geïnitieerd (om onnodige uploads te voorkomen)
- **FR-007**: Systeem MUST de limiet check uitvoeren voor zowel drag & drop als file picker uploads

**Bug #2: Bijlagen Zichtbaarheid**
- **FR-008**: Bijlagen lijst MUST zichtbaar blijven nadat een taak wordt opgeslagen en opnieuw geopend
- **FR-009**: Bijlagen lijst MUST niet verdwijnen of flikkeren tijdens het opslaan van taak wijzigingen
- **FR-010**: Bijlagen lijst MUST correct worden geïnitialiseerd wanneer een taak popup wordt geopend
- **FR-011**: DOM elementen voor bijlagen MUST behouden blijven tijdens form updates of re-renders
- **FR-012**: Systeem MUST bijlagen API call uitvoeren elke keer dat een taak wordt geopend (om actuele staat te tonen)

### Key Entities

- **Premium Standard Subscription**: Abonnement van ¬7/maand of ¬70/jaar, beperkt tot 1 bijlage per taak
- **Premium Plus Subscription**: Abonnement van ¬8/maand of ¬80/jaar, onbeperkt aantal bijlagen per taak
- **Task Attachment**: Bestand gekoppeld aan een taak, met limiet afhankelijk van subscription tier
- **Attachment Limit**: Maximaal aantal bijlagen per taak gebaseerd op gebruiker's subscription tier
- **Bijlagen Liste UI**: Visuele component die bijlagen toont in de taak popup

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

## Technical Context (for implementation phase)

**Bug #1 Root Cause:**
- Server-side check in `server.js:3325-3333` treats ALL premium users (Standard + Plus) as having unlimited attachments
- `database.js:2196` returns `isPremium = true` for both `monthly_7/yearly_70` (Standard) AND `monthly_8/yearly_80` (Plus)
- Solution needs to differentiate between Standard and Plus tiers

**Bug #2 Root Cause:**
- Bijlagen lijst (`#bijlagen-lijst` DOM element) disappears after task save
- Possible causes: DOM re-render, popup reset logic, or timing issue in `BijlagenManager.initializeForTask()`
- Requires investigation of task popup save flow and DOM persistence

**Subscription Plan IDs:**
- Premium Standard: `monthly_7`, `yearly_70` (¬7/month, ¬70/year)
- Premium Plus: `monthly_8`, `yearly_80` (¬8/month, ¬80/year)
- Free/Trial: no selected_plan or trial_end_date

**Key Files:**
- `server.js`: Upload endpoint (line 3292), storage stats endpoint (line 3927)
- `database.js`: Premium status check (line 2175)
- `storage-manager.js`: Storage limits config (line 4-7)
- `public/app.js`: BijlagenManager class (line 14144-14700)
- `public/index.html`: Bijlagen UI (line 445-474)
