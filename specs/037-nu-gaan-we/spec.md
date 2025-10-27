# Feature Specification: Archive Tabel voor Afgewerkte Taken

**Feature Branch**: `037-nu-gaan-we`
**Created**: 2025-10-27
**Status**: Ready for Planning
**Input**: User description: "Nu gaan we een ingrijpende maar heel belangrijke aanpassing doen. Taken die afgewerkt zijn blijven gewoon in de taken tabel staan (ik ken de juiste naam van de tabel niet) en blijven daar voor eeuwig staan. Hoe meer gebruikers hoe meer records daar voor eeuwig gaan blijven staan en dat gaat die tabel verschrikkelijk groot maken en de belangrijkste gegegevens, de taken, zeer traag maken. Daarom denk ik dat het noodzakelijk is dat afgewerkte taken in een aparte tabel komen. Dus wanneer een taak afgewerkt wordt, moet die naar een andere tabel verplaatst worden. Dat wil zeggen dat ook het scherm met de afgewerkte taken naar die nieuwe tabel moet verwijzen. heb je daar nog vragen over? Dan mag je die stellen."

## Execution Flow (main)
```
1. Parse user description from Input
   ✓ Feature geïdentificeerd: Database performance optimalisatie via archive strategie
2. Extract key concepts from description
   ✓ Actors: Gebruikers, System (automated archiving)
   ✓ Actions: Complete taken, view completed tasks
   ✓ Data: Active tasks, archived tasks
   ✓ Constraints: Performance at scale, data integrity
3. For each unclear aspect:
   ✓ All clarifications resolved through user questions
4. Fill User Scenarios & Testing section
   ✓ Clear user flow identified
5. Generate Functional Requirements
   ✓ All requirements testable and complete
6. Identify Key Entities
   ✓ Data entities identified
7. Run Review Checklist
   ✓ All items passed
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
Een gebruiker werkt gedurende maanden of jaren met Tickedify en voltooit honderden of duizenden taken. Het systeem moet snel blijven presteren ongeacht het aantal voltooide taken. Wanneer een gebruiker een taak afwerkt, wordt deze automatisch en onmiddellijk gearchiveerd naar een aparte opslag, zodat de actieve taken tabel klein en snel blijft. De gebruiker kan nog steeds zijn afgewerkte taken bekijken via het "Afgewerkt" scherm zonder enig verschil te merken.

### Acceptance Scenarios

1. **Given** een gebruiker heeft 1000 actieve taken en 10,000 afgewerkte taken, **When** de gebruiker opent de dagelijkse planning, **Then** moet de applicatie binnen 2 seconden laden zonder vertragingen

2. **Given** een gebruiker werkt een taak af, **When** de taak wordt gemarkeerd als voltooid, **Then** wordt de taak onmiddellijk (real-time) verplaatst naar de archive tabel

3. **Given** een gebruiker opent het "Afgewerkt" scherm, **When** de lijst wordt geladen, **Then** worden alle afgewerkte taken uit de archive tabel getoond met dezelfde informatie als voorheen (project, context, datum, opmerkingen)

4. **Given** een herhalende taak wordt afgewerkt, **When** de taak completion wordt verwerkt, **Then** wordt de voltooide instantie naar archive verplaatst EN wordt onmiddellijk een nieuwe instantie aangemaakt in de actieve taken tabel met dezelfde recurring definitie

5. **Given** een taak met 5 subtaken wordt afgewerkt, **When** de parent taak wordt gearchiveerd, **Then** worden alle 5 subtaken samen met de parent taak gearchiveerd (cascade)

6. **Given** een gebruiker stopt zijn abonnement, **When** account deletion wordt uitgevoerd, **Then** worden ALLE gearchiveerde taken van die gebruiker permanent verwijderd samen met actieve taken

7. **Given** het systeem gaat live met archive functionaliteit om 00:00, **When** de migratie draait tijdens maintenance window, **Then** worden alle bestaande afgewerkte taken binnen 15-30 minuten gemigreerd naar archive zonder data verlies

### Edge Cases

- Wat gebeurt er als archivering van een taak faalt door database error? → Taak blijft in actieve tabel, error wordt gelogd, retry mechanisme
- Hoe worden taken met 50+ subtaken efficiënt gearchiveerd? → Batch operatie binnen transaction
- Wat als gebruiker een bulk actie uitvoert en 100 taken tegelijk afwerkt? → Archivering per taak, maar binnen enkele seconden
- Wat gebeurt er met relaties naar projecten en contexten bij gearchiveerde taken? → Foreign keys blijven intact, projecten/contexten blijven in originele tabellen
- Kan een gearchiveerde taak opnieuw geactiveerd worden? → Nee, archive is permanent (behalve bij bugs/support requests)

## Requirements

### Functional Requirements

**Performance & Scalability**
- **FR-001**: Systeem MOET de actieve taken tabel klein houden (ideaal < 5000 records per gebruiker) door voltooide taken automatisch te archiveren
- **FR-002**: Systeem MOET queries op actieve taken snel houden (< 200ms response time) ongeacht het aantal gearchiveerde taken
- **FR-003**: Systeem MOET dagelijkse planning en acties lijst binnen 2 seconden kunnen laden, ook bij gebruikers met 10,000+ voltooide taken

**Archiving Behavior - Real-time**
- **FR-004**: Systeem MOET een taak onmiddellijk (real-time) naar de archive verplaatsen zodra deze gemarkeerd wordt als voltooid
- **FR-005**: Systeem MOET ALLE data van de voltooide taak behouden in de archive (naam, lijst, status, datum, verschijndatum, project_id, context_id, duur, opmerkingen, top_prioriteit, prioriteit_datum, herhaling velden, user_id)
- **FR-006**: Systeem MOET het originele taak ID behouden in de archive voor referentie integriteit en troubleshooting
- **FR-007**: Systeem MOET een timestamp toevoegen aan gearchiveerde taken met exact moment van archivering (created_at/archived_at)

**Recurring Tasks Integration**
- **FR-008**: Wanneer een herhalende taak wordt afgewerkt, MOET het systeem de voltooide instantie naar archive verplaatsen
- **FR-009**: Onmiddellijk na archivering MOET het systeem een nieuwe taak instantie aanmaken met dezelfde recurring definitie (herhaling_type, herhaling_actief)
- **FR-010**: De nieuwe recurring instantie MOET in de actieve taken tabel blijven voor toekomstige completion cycles

**Subtaken Integration - Cascade Archiving**
- **FR-011**: Wanneer een parent taak wordt gearchiveerd, MOETEN alle subtaken samen met de parent gearchiveerd worden (cascade delete + insert)
- **FR-012**: Systeem MOET een aparte `subtaken_archief` tabel gebruiken voor gearchiveerde subtaken
- **FR-013**: Gearchiveerde subtaken MOETEN hun relatie naar de parent taak behouden via parent_taak_id (refereert naar archive taak id)
- **FR-014**: Subtaken archivering MOET atomair gebeuren (binnen zelfde transaction als parent) voor data consistency

**User Interface**
- **FR-015**: Gebruikers MOETEN toegang hebben tot hun gearchiveerde taken via het bestaande "Afgewerkt" scherm
- **FR-016**: Het "Afgewerkt" scherm MOET taken uit archive tabel tonen met exact dezelfde informatie en layout als voorheen (zero UI changes)
- **FR-017**: Systeem MOET gearchiveerde taken kunnen filteren op datum, project, context (zelfde functionaliteit als huidige afgewerkt lijst)
- **FR-018**: Gebruikers MOETEN gearchiveerde taken kunnen zoeken met dezelfde search functionaliteit

**Data Migration - Maintenance Window**
- **FR-019**: Systeem MOET bestaande afgewerkte taken uit de taken tabel kunnen migreren naar de archive tabel
- **FR-020**: Migratie MOET plaats vinden tijdens geplande maintenance window om 00:00 's nachts
- **FR-021**: Migratie MOET binnen 15-30 minuten voltooid zijn (acceptabele downtime voor 10 weinig-actieve gebruikers)
- **FR-022**: Migratie MOET veilig gebeuren zonder data verlies - elke record verified
- **FR-023**: Na succesvolle migratie MOETEN gemigreerde taken uit de actieve taken tabel verwijderd worden

**Data Retention - Subscription Linked**
- **FR-024**: Gearchiveerde taken MOETEN onbeperkt bewaard worden zolang gebruiker actief abonnement heeft
- **FR-025**: Wanneer een gebruiker zijn abonnement stopt/account verwijdert, MOETEN alle gearchiveerde taken (+ subtaken) van die gebruiker permanent verwijderd worden
- **FR-026**: Data deletion MOET compleet zijn (GDPR compliance) - geen orphaned records

**Error Handling & Reliability**
- **FR-027**: Als archivering faalt (database error, constraint violation), MOET de taak in de actieve tabel blijven staan
- **FR-028**: Systeem MOET archivering fouten loggen met volledige context (taak id, user id, error message) voor monitoring
- **FR-029**: Systeem MOET transactionele integriteit garanderen - als subtaken archivering faalt, moet parent archivering ook gefailed worden (rollback)
- **FR-030**: Bij migratie errors MOET systeem stoppen en admin notificatie sturen - geen partial migrations

### Key Entities

**Actieve Taak (taken tabel)**
- Huidige taken die nog niet voltooid zijn
- Bevat alle actieve taken, inbox items, uitgestelde taken, opvolgen items
- Moet klein blijven voor performance (target < 5000 records per user)
- Bevat recurring task definities die nog instanties moeten genereren

**Gearchiveerde Taak (taken_archief tabel)**
- Voltooide taken die uit de actieve tabel verplaatst zijn
- Bevat exact dezelfde velden als taken tabel PLUS archived_at timestamp
- Mag onbeperkt groeien zonder performance impact op actieve queries
- Read-only voor gebruikers (alleen via "Afgewerkt" scherm)

**Gearchiveerde Subtaak (subtaken_archief tabel)**
- Subtaken van gearchiveerde parent taken
- Bevat exact dezelfde velden als subtaken tabel PLUS archived_at timestamp
- Relatie naar parent via parent_taak_id (verwijst naar taken_archief)
- Cascade gearchiveerd wanneer parent wordt gearchiveerd

**Relaties**
- Gearchiveerde taken behouden foreign keys naar projecten en contexten tabellen (deze tabellen blijven unchanged)
- Gearchiveerde subtaken hebben foreign key naar taken_archief (parent_taak_id)
- User ownership blijft via user_id kolom (nodig voor deletion bij subscription stop)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain - **ALL RESOLVED**
- [x] Requirements are testable and unambiguous (30 functional requirements)
- [x] Success criteria are measurable (performance targets, timing specifics)
- [x] Scope is clearly bounded (archive strategy for completed tasks)
- [x] Dependencies and assumptions identified (recurring, subtaken, migration, retention)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved through user Q&A
- [x] User scenarios defined
- [x] Requirements generated (30 FRs)
- [x] Entities identified
- [x] Review checklist passed

---

## Clarifications Resolved

**1. Archivering Timing:** Real-time archivering - taken worden onmiddellijk bij completion naar archive verplaatst

**2. Herhalende Taken:** Voltooide instantie wordt gearchiveerd, nieuwe instantie wordt onmiddellijk aangemaakt met dezelfde recurring definitie

**3. Subtaken Archivering:** Cascade archivering - subtaken gaan samen met parent taak naar archive (subtaken_archief tabel)

**4. Data Retention:** Gearchiveerde taken blijven bewaard zolang abonnement actief is, worden verwijderd bij subscription stop

**5. Migratie Strategie:** Maintenance window om 00:00 's nachts, 15-30 minuten downtime acceptabel voor 10 weinig-actieve gebruikers

---

## Deployment Strategy

**Branch Strategy:** Feature ontwikkeld op `037-nu-gaan-we` vanaf clean `main` branch - volledig geïsoleerd van andere pending features (messaging system, translations op branch 036)

**Testing:** Staging environment (dev.tickedify.com) voor volledige feature test

**Go-Live:** Geplande deployment om 00:00 tijdens maintenance window
- Downtime: 15-30 minuten
- User impact: Minimal (10 gebruikers, laag actief 's nachts)
- Rollback plan: Database backup pre-migration, branch revert mogelijk

**Post-Deployment:** Monitor archivering errors in logs, verify performance gains op dagelijkse planning queries
