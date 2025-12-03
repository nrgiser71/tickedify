# Feature Specification: Backup Strategie met Point-in-Time Recovery

**Feature Branch**: `071-de-backup-strategie`
**Created**: 2025-12-03
**Status**: Draft
**Input**: User description: "de backup strategie met alles erop en eraan"

---

## Quick Guidelines
- Focus on WHAT users need and WHY
- Avoid HOW to implement (no tech stack, APIs, code structure)
- Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
Als systeembeheerder wil ik automatische backups van alle gebruikersdata zodat ik bij problemen (bug, dataverlies, per ongeluk verwijderde data) kan herstellen naar een recent punt met minimaal dataverlies.

### Acceptance Scenarios

1. **Given** het systeem draait normaal, **When** 4 uur verstrijken, **Then** wordt automatisch een backup gemaakt en opgeslagen

2. **Given** een backup is beschikbaar in de admin interface, **When** beheerder klikt op "Download", **Then** wordt de backup als bestand gedownload

3. **Given** er is een probleem met de data, **When** beheerder selecteert een backup en klikt "Restore", **Then** wordt de database hersteld naar die staat met minimale onderbreking

4. **Given** een gebruiker verwijdert per ongeluk een taak, **When** beheerder bekijkt de transaction log, **Then** kan de specifieke verwijdering ongedaan gemaakt worden

5. **Given** backups ouder dan 24 uur bestaan, **When** de cleanup job draait, **Then** worden oude backups automatisch verwijderd

6. **Given** de app draait, **When** gebruikers taken aanmaken/wijzigen/verwijderen, **Then** worden deze acties gelogd met voor- en na-data

### Edge Cases
- Wat gebeurt er als een backup faalt? ’ Beheerder krijgt notificatie, vorige backup blijft beschikbaar
- Wat als restore halverwege faalt? ’ Systeem keert terug naar pre-restore staat
- Wat bij zeer grote databases (1000+ users)? ’ Backup moet binnen 30 seconden compleet zijn
- Wat als B2 storage niet bereikbaar is? ’ Backup wordt lokaal gecached en later geuploaded

---

## Requirements *(mandatory)*

### Functional Requirements

#### Automatische Backups
- **FR-001**: System MUST automatisch elke 4 uur een volledige database backup maken (6x per dag)
- **FR-002**: System MUST backups opslaan in externe cloud storage (onafhankelijk van database provider)
- **FR-003**: System MUST backups bewaren voor minimaal 24 uur
- **FR-004**: System MUST automatisch backups ouder dan 24 uur verwijderen

#### Transaction Logging
- **FR-005**: System MUST elke INSERT, UPDATE en DELETE operatie loggen op kritieke tabellen
- **FR-006**: System MUST bij elke log entry de oude EN nieuwe data opslaan
- **FR-007**: System MUST transaction logs bewaren voor minimaal 24 uur
- **FR-008**: System MUST automatisch logs ouder dan 24 uur opruimen

#### Admin Interface
- **FR-009**: Beheerders MUST een overzicht kunnen zien van beschikbare backups
- **FR-010**: Beheerders MUST een specifieke backup kunnen downloaden
- **FR-011**: Beheerders MUST een backup kunnen restoren via de admin interface
- **FR-012**: Beheerders MUST handmatig een backup kunnen triggeren
- **FR-013**: Beheerders MUST de transaction log kunnen doorzoeken (per tijdstip, per user, per tabel)
- **FR-014**: Beheerders MUST specifieke operaties kunnen terugdraaien ("undo")

#### Restore Functionaliteit
- **FR-015**: System MUST bij restore automatisch de applicatie in maintenance mode zetten
- **FR-016**: System MUST na backup restore de transaction log entries replaying voor minimaal dataverlies
- **FR-017**: System MUST na succesvolle restore automatisch uit maintenance mode komen
- **FR-018**: System MUST bij gefaalde restore terugkeren naar de originele staat

#### Performance & Betrouwbaarheid
- **FR-019**: Backup proces MUST binnen 30 seconden compleet zijn
- **FR-020**: Transaction logging MUST minder dan 10ms overhead toevoegen per operatie
- **FR-021**: System MUST geen merkbare impact hebben op normale gebruikerservaring

### Key Entities

- **Backup**: Een snapshot van de volledige database op een specifiek moment
  - Unieke identifier
  - Aanmaakdatum/-tijd
  - Type (automatisch/handmatig)
  - Grootte
  - Status (voltooid/mislukt)
  - Vervaldatum

- **Transaction Log Entry**: Een record van een database wijziging
  - Timestamp
  - Gebruiker die de actie uitvoerde
  - Type operatie (INSERT/UPDATE/DELETE)
  - Betreffende tabel
  - Record ID
  - Oude waarden (bij UPDATE/DELETE)
  - Nieuwe waarden (bij INSERT/UPDATE)

- **Kritieke Tabellen**: De tabellen die gebackupt en gelogd moeten worden
  - Gebruikersaccounts
  - Taken
  - Projecten
  - Contexten
  - Dagelijkse planning
  - Subtaken
  - Bijlagen (metadata)
  - Gebruikersvoorkeuren

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
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Dependencies & Assumptions

### Dependencies
- Bestaande Backblaze B2 integratie (al aanwezig voor bijlagen)
- Admin authenticatie systeem (al aanwezig)
- Vercel Cron ondersteuning voor scheduled jobs

### Assumptions
- Database groeit niet sneller dan verwacht (max 1GB bij 1000 users)
- B2 storage blijft beschikbaar met huidige pricing
- 24 uur retentie is voldoende voor disaster recovery
- Beheerder heeft voldoende technische kennis voor restore operaties

### Out of Scope
- Backup encryptie (data is al beveiligd via B2)
- Multi-regio replicatie
- Automatische alerts bij anomalieën
- Backup verificatie/integrity checks
