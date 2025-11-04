# Feature Specification: Soft Delete Implementatie voor Taken

**Feature Branch**: `055-soft-delete-implementatie`
**Created**: 2025-11-04
**Status**: Draft
**Input**: User description: "Ik wil een soft delete implementeren. Dat wil zeggen dat taken die verwijderd worden een extra status krijgen, dat alle queries die taken tonen, rekening moeten houden met deze nieuwe status en er moet een scherm bijkomen waar je de verwijderde taken kan zien en kan restoren. Verwijderde taken moeten een maand bijgehouden worden. Daarna moeten ze automatisch verdwijnen. Doe een voorstel om dit te implementeren. Ik wil geen cron job. Het moet per user gebeuren. Ik weet niet wat de meest elegante oplossing is."

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Soft delete system voor taken
2. Extract key concepts from description
   → Actors: Gebruikers
   → Actions: Delete taken, restore taken, automatische cleanup
   → Data: Taken met verwijder status, verwijder timestamp
   → Constraints: Per-user cleanup, 1 maand retentie, geen cron jobs
3. Clarifications resolved via user input:
   → Cleanup timing: Dagelijks per gebruiker bij eerste actie
   → Herhalende taken: Herhaling stoppen bij delete
   → Restore gedrag: Restore naar originele lijst
4. User Scenarios & Testing section: ✓ Completed
5. Functional Requirements: ✓ Generated
6. Key Entities identified: ✓ Taken met verwijder properties
7. Review Checklist: ✓ Passed
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

Een gebruiker kan taken verwijderen zonder dat deze direct permanent verloren gaan. De verwijderde taken worden 1 maand bewaard in een "prullenbak" scherm waar de gebruiker deze kan bekijken en eventueel herstellen. Na 1 maand worden verwijderde taken automatisch permanent verwijderd zonder tussenkomst van de gebruiker.

### Acceptance Scenarios

1. **Given** een gebruiker heeft een actieve taak in hun lijst, **When** de gebruiker kiest om de taak te verwijderen, **Then** verdwijnt de taak uit alle normale overzichten en wordt deze gemarkeerd als verwijderd met de huidige datum/tijd

2. **Given** een gebruiker heeft verwijderde taken in hun prullenbak, **When** de gebruiker opent het prullenbak scherm, **Then** ziet de gebruiker een lijst van alle verwijderde taken met informatie over wanneer deze verwijderd zijn en wanneer ze permanent worden verwijderd

3. **Given** een gebruiker bekijkt een verwijderde taak in de prullenbak, **When** de gebruiker kiest om de taak te herstellen, **Then** komt de taak terug in de originele lijst (actie/opvolgen/uitgesteld/etc) met alle originele eigenschappen behouden

4. **Given** een gebruiker heeft een herhalende taak verwijderd, **When** de taak wordt verwijderd, **Then** wordt de herhaling gestopt en worden er geen nieuwe instances meer aangemaakt

5. **Given** een gebruiker heeft verwijderde taken die ouder zijn dan 1 maand, **When** de gebruiker de volgende dag inlogt en een actie uitvoert, **Then** worden alle verwijderde taken ouder dan 1 maand automatisch permanent verwijderd

6. **Given** een gebruiker heeft verwijderde taken van verschillende leeftijden, **When** de gebruiker het prullenbak scherm bekijkt, **Then** ziet de gebruiker voor elke taak hoeveel dagen tot permanente verwijdering

7. **Given** alle lijstweergaven in de applicatie (actie lijst, dagelijkse planning, uitgestelde taken), **When** deze worden getoond, **Then** worden verwijderde taken niet getoond in deze overzichten

### Edge Cases

- **Wat gebeurt er als een taak wordt hersteld die verwijst naar een project/context die inmiddels ook verwijderd is?**
  De taak wordt hersteld met alle originele eigenschappen. Als project/context soft-deleted zijn, blijft de relatie bestaan. Als deze hard-deleted zijn, blijft de foreign key relatie behouden (tenzij project/context soft delete later wordt geïmplementeerd).

- **Wat gebeurt er als een herhalende taak wordt hersteld?**
  De taak komt terug in de originele lijst met herhaling_actief op false. Gebruiker kan via de normale herhalings-interface kiezen of en hoe de herhaling opnieuw moet starten.

- **Wat gebeurt er als gebruiker meerdere taken tegelijk probeert te verwijderen?**
  Alle geselecteerde taken krijgen de verwijderd status met dezelfde timestamp.

- **Wat gebeurt er als de cleanup moet draaien voor een gebruiker met duizenden verwijderde taken?**
  Cleanup werkt met een batch delete query per gebruiker (WHERE gebruiker_id = X AND verwijderd_op < datum). Performance moet getest worden met grote aantallen.

- **Kan een gebruiker een taak permanent verwijderen zonder te wachten op de 1 maand periode?**
  Niet in de eerste versie. Feature kan later worden toegevoegd als gebruikers erom vragen.

---

## Requirements

### Functional Requirements

**Verwijder Functionaliteit:**
- **FR-001**: System MUST markeren van taken als "verwijderd" wanneer gebruiker de verwijder actie uitvoert
- **FR-002**: System MUST de datum en tijd van verwijdering opslaan voor elke verwijderde taak
- **FR-003**: System MUST verwijderde taken uitsluiten van alle normale lijstweergaven (actie lijst, dagelijkse planning, uitgestelde taken, etc)
- **FR-004**: System MUST herhaling_actief op false zetten voor herhalende taken die worden verwijderd

**Prullenbak Scherm:**
- **FR-005**: Users MUST een nieuw scherm kunnen openen dat alle verwijderde taken toont
- **FR-006**: Prullenbak scherm MUST voor elke taak tonen: taak titel, originele lijst, project, context, verwijderdatum, en aantal dagen tot permanente verwijdering
- **FR-007**: Prullenbak scherm MUST taken sorteren met oudste verwijderde taken bovenaan
- **FR-008**: Users MUST individuele taken kunnen selecteren voor restore vanuit de prullenbak
- **FR-009**: Users MUST meerdere taken tegelijk kunnen selecteren voor restore vanuit de prullenbak

**Restore Functionaliteit:**
- **FR-010**: System MUST verwijderde taken kunnen herstellen naar hun originele lijst
- **FR-011**: System MUST alle originele eigenschappen behouden bij restore (verschijndatum, prioriteit, project, context, duur, etc)
- **FR-012**: System MUST herhaling_actief op false laten bij restore van herhalende taken
- **FR-013**: Restored taken MUST direct verschijnen in de relevante lijstweergaven na restore

**Automatische Cleanup:**
- **FR-014**: System MUST verwijderde taken automatisch permanent verwijderen die ouder zijn dan 30 dagen
- **FR-015**: Cleanup MUST per gebruiker gebeuren (niet global)
- **FR-016**: Cleanup MUST maximaal 1x per dag per gebruiker worden uitgevoerd
- **FR-017**: Cleanup MUST worden getriggered bij de eerste actie van een gebruiker op een nieuwe dag
- **FR-018**: System MUST bijhouden per gebruiker wanneer de laatste cleanup is uitgevoerd

**Query Aanpassingen:**
- **FR-019**: Alle bestaande queries die taken ophalen MUST gefilterd worden om verwijderde taken uit te sluiten
- **FR-020**: Queries voor prullenbak scherm MUST expliciet alleen verwijderde taken ophalen

### Key Entities

- **Taak (uitgebreid)**:
  - Krijgt twee nieuwe eigenschappen: een verwijder status indicator en een verwijder timestamp
  - Behoudt alle bestaande eigenschappen (titel, lijst, project, context, prioriteit, verschijndatum, duur, herhaling properties)
  - Relatie met gebruiker blijft ongewijzigd
  - Voor herhalende taken: herhaling_actief wordt op false gezet bij verwijdering

- **Gebruiker (uitgebreid)**:
  - Krijgt één nieuwe eigenschap: timestamp van laatste cleanup uitvoering
  - Nodig om dagelijkse cleanup per gebruiker te tracken
  - Voorkomt dat cleanup meerdere keren per dag wordt uitgevoerd

- **Prullenbak Weergave**:
  - Virtual entity (geen database tabel)
  - Toont verwijderde taken met berekende velden (dagen tot permanente verwijdering)
  - Gefilterde view op taken met verwijderd status

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
- [x] Ambiguities marked and resolved via user questions
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Dependencies & Assumptions

**Dependencies:**
- Bestaande taken database structuur moet uitbreidbaar zijn
- Bestaande queries voor taken ophalen moeten aanpasbaar zijn
- UI moet ruimte hebben voor nieuw prullenbak scherm (navigatie item)

**Assumptions:**
- Gebruikers willen een veiligheidsnet bij verwijderen van taken
- 1 maand retentie is voldoende voor meeste herstel scenario's
- Performance van dagelijkse cleanup is acceptabel voor verwachte aantal verwijderde taken per gebruiker
- Gebruikers begrijpen dat herhalende taken niet automatisch weer herhalen na restore
- Restore naar originele lijst is intuïtiever dan restore naar inbox

**Out of Scope (mogelijk latere features):**
- Soft delete voor projecten en contexten
- Handmatige permanente verwijdering voor specifieke taken
- Bulk permanent delete van alle taken in prullenbak
- Configureerbare retentie periode per gebruiker
- Notificaties voordat taken permanent worden verwijderd
- Undo functionaliteit (direct na verwijdering)
- Search/filter functionaliteit binnen prullenbak

---

## Success Criteria

De feature is succesvol als:
1. Gebruikers geen taken meer per ongeluk permanent verliezen
2. Verwijderde taken niet meer verschijnen in normale workflows
3. Prullenbak scherm duidelijk en intuïtief is
4. Restore functionaliteit werkt zonder data verlies
5. Automatische cleanup werkt zonder gebruiker interventie
6. Performance impact van query aanpassingen is verwaarloosbaar
7. Geen bestaande functionaliteit wordt gebroken door de implementatie
