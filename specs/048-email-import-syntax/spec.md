# Feature Specification: Email Import Syntax Uitbreiding

**Feature Branch**: `048-email-import-syntax`
**Created**: 2025-10-31
**Status**: Draft
**Input**: User description: "Email import syntax uitbreiding met @t instructies voor project, context, due date, prioriteit, duur en defer codes"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature duidelijk: uitbreiding van bestaande email import met gestructureerde syntax
2. Extract key concepts from description
   ’ Actors: Tickedify gebruikers die emails doorsturen
   ’ Actions: Email doorsturen met instructieregel, velden instellen via codes
   ’ Data: Project, Context, Due Date, Prioriteit, Duur, Defer status
   ’ Constraints: Backwards compatible, foutentolerant, geen bevestigingsmails
3. For each unclear aspect:
   ’ Geen onduidelijkheden - volledige PRD beschikbaar in MailSyntax.md
4. Fill User Scenarios & Testing section
   ’ User flow helder: email doorsturen ’ instructie parsen ’ taak aanmaken
5. Generate Functional Requirements
   ’ Alle requirements zijn testbaar en afgeleid van PRD
6. Identify Key Entities
   ’ Project, Context, Task fields (priority, due, duration, defer)
7. Run Review Checklist
   ’ Geen implementatie details, focus op WHAT en WHY
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
Gebruikers ontvangen emails die ze willen omzetten naar taken met specifieke eigenschappen (project, context, deadline, etc.). Door een korte instructieregel bovenaan de doorgestuurde email te plaatsen, kunnen ze deze velden direct instellen zonder handmatige nabewerking in Tickedify. Dit verlaagt de drempel om emails naar taken te converteren en verhoogt de kwaliteit van geïmporteerde taken.

### Acceptance Scenarios

#### Basis instructie parsing
1. **Given** een gebruiker stuurt een email door naar hun Tickedify importadres, **When** de eerste regel van de body start met "@t p: Klant X; c: Werk; d: 2025-11-03; p1; t: 30", **Then** wordt een taak aangemaakt met project "Klant X", context "Werk", due date 3 november 2025, prioriteit High, en duur 30 minuten

2. **Given** een gebruiker stuurt een email door zonder @t instructie, **When** de email wordt verwerkt, **Then** werkt het systeem exact zoals het nu werkt (backwards compatible)

#### Defer functionaliteit
3. **Given** een gebruiker plaatst "@t dm; p: Project Y; c: Werk" als eerste regel, **When** de email wordt verwerkt, **Then** wordt de taak naar de "Defer to Monthly" lijst gestuurd en worden alle andere codes (project, context) genegeerd

4. **Given** een gebruiker plaatst "@t p: Project Z; dw; c: Thuis", **When** de email wordt verwerkt, **Then** wordt de taak naar "Defer to Weekly" gestuurd omdat defer codes absolute voorrang hebben

#### Automatische entiteit creatie
5. **Given** een gebruiker gebruikt "@t p: Nieuw Project; c: Nieuwe Context" waarbij beide niet bestaan, **When** de email wordt verwerkt, **Then** worden het project en de context automatisch aangemaakt en aan de taak gekoppeld

#### Prioriteit normalisatie
6. **Given** een gebruiker gebruikt "@t p0; d: 2025-12-01", **When** de email wordt verwerkt, **Then** wordt prioriteit gezet op High (p0 wordt genormaliseerd naar High)

7. **Given** een gebruiker gebruikt "@t p4; c: Werk", **When** de email wordt verwerkt, **Then** wordt prioriteit gezet op Low (p4 en hoger worden genormaliseerd naar Low)

#### Body truncatie met --end--
8. **Given** een gebruiker stuurt een email met body tekst gevolgd door "--END--" en daarna handtekening, **When** de email wordt verwerkt, **Then** bevat de taak notities alleen de tekst vóór "--END--" (case-insensitive), ongeacht of @t werd gebruikt

#### Foutentolerantie
9. **Given** een gebruiker gebruikt "@t d: 03/11/2025; c: Werk" met verkeerd datum formaat, **When** de email wordt verwerkt, **Then** wordt de due date genegeerd maar de context wel toegepast, en wordt de taak succesvol aangemaakt

10. **Given** een gebruiker gebruikt "@t p: A; p: B; c: C" met dubbele project codes, **When** de email wordt verwerkt, **Then** wordt project A gebruikt, project B genegeerd, en context C toegepast

### Edge Cases
- **Wat gebeurt er wanneer alleen "@t" wordt gebruikt zonder parameters?** Het systeem activeert geen parsing en gebruikt standaard gedrag (backwards compatible).
- **Hoe gaat het systeem om met ongeldige duur waardes?** Niet-numerieke waardes voor duur worden stil genegeerd, de taak wordt aangemaakt met andere geldige velden.
- **Wat als meerdere prioriteit codes worden gebruikt?** De eerste prioriteit code telt, alle volgende worden genegeerd.
- **Kunnen defer codes worden gecombineerd?** Nee, de eerste defer code die wordt gedetecteerd zorgt ervoor dat alle andere codes (inclusief andere defer codes) worden genegeerd.
- **Wordt de instructieregel zelf opgenomen in de taak notities?** Nee, de @t instructieregel wordt niet in de notities opgenomen.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Instructie Detectie & Parsing
- **FR-001**: Systeem MOET de eerste niet-lege regel van de email body scannen op een @t trigger
- **FR-002**: Systeem MOET parsing alleen activeren wanneer de eerste regel start met "@t" gevolgd door een spatie of parameters
- **FR-003**: Systeem MOET "@t" zonder parameters interpreteren als geen instructie (standaard gedrag)
- **FR-004**: Systeem MOET instructie parameters scheiden op basis van puntkomma (;)
- **FR-005**: Systeem MOET spaties voor en na sleutels en waardes negeren (trimmen)
- **FR-006**: Systeem MOET case-insensitive werken voor alle sleutels en codes

#### Ondersteunde Codes
- **FR-007**: Systeem MOET "p:" code ondersteunen voor project naam
- **FR-008**: Systeem MOET "c:" code ondersteunen voor context naam
- **FR-009**: Systeem MOET "d:" code ondersteunen voor due date in ISO formaat YYYY-MM-DD
- **FR-010**: Systeem MOET "t:" code ondersteunen voor duur in minuten (alleen gehele getallen)
- **FR-011**: Systeem MOET "p1", "p2", "p3" codes ondersteunen voor prioriteit (respectievelijk High, Medium, Low)
- **FR-012**: Systeem MOET "p0" normaliseren naar High prioriteit
- **FR-013**: Systeem MOET "p4" en hogere waardes normaliseren naar Low prioriteit
- **FR-014**: Systeem MOET defer shortcuts ondersteunen: "df" (Follow-up), "dw" (Weekly), "dm" (Monthly), "d3m" (Quarterly), "d6m" (Bi-annual), "dy" (Yearly)

#### Defer Voorrang Logica
- **FR-015**: Systeem MOET bij aanwezigheid van een defer code ALLE andere codes negeren (inclusief project, context, due, prioriteit, duur)
- **FR-016**: Systeem MOET de taak naar de juiste postponed lijst sturen op basis van de defer code

#### Duplicaat Handling
- **FR-017**: Systeem MOET bij meerdere voorkomens van dezelfde code alleen de eerste waarde gebruiken
- **FR-018**: Systeem MOET duplicaat codes stil negeren zonder foutmelding

#### Body Verwerking
- **FR-019**: Systeem MOET case-insensitive zoeken naar "--end--" marker in de email body
- **FR-020**: Systeem MOET alle tekst na de eerste "--end--" marker verwijderen uit de taak notities
- **FR-021**: Systeem MOET de "--end--" marker zelf ook verwijderen (niet opnemen in notities)
- **FR-022**: Systeem MOET "--end--" verwerking toepassen ongeacht of @t werd gebruikt
- **FR-023**: Systeem MOET de @t instructieregel zelf NIET opnemen in de taak notities

#### Entiteit Beheer
- **FR-024**: Systeem MOET niet-bestaande projecten automatisch aanmaken wanneer opgegeven via "p:" code
- **FR-025**: Systeem MOET niet-bestaande contexten automatisch aanmaken wanneer opgegeven via "c:" code
- **FR-026**: Systeem MOET de taak koppelen aan bestaande projecten/contexten als ze al bestaan
- **FR-027**: Systeem MOET spaties in project en context namen behouden (niet strippen)

#### Validatie & Foutentolerantie
- **FR-028**: Systeem MOET alleen ISO datum formaat YYYY-MM-DD accepteren voor due dates
- **FR-029**: Systeem MOET ongeldige datum formaten stil negeren en de taak aanmaken met andere geldige velden
- **FR-030**: Systeem MOET alleen numerieke waardes accepteren voor duur (minuten)
- **FR-031**: Systeem MOET negatieve of niet-numerieke duur waardes negeren
- **FR-032**: Systeem MOET onbekende of ongeldige codes stil negeren
- **FR-033**: Systeem MOET parsing fouten NIET resulteren in foutmeldingen naar de gebruiker
- **FR-034**: Systeem MOET GEEN email bevestigingen sturen na verwerking

#### Subject & Titel
- **FR-035**: Systeem MOET de email subject regel exact overnemen als taak titel
- **FR-036**: Systeem MOET GEEN prefix stripping of token parsing toepassen op het subject

#### Backwards Compatibility
- **FR-037**: Systeem MOET exact hetzelfde werken als voorheen wanneer geen @t instructie aanwezig is
- **FR-038**: Systeem MOET bestaande email import functionaliteit volledig behouden

#### Gebruikersinterface
- **FR-039**: Systeem MOET een helpfile beschikbaar maken in Markdown formaat die de volledige syntax documenteert
- **FR-040**: Systeem MOET een clickable help icoon (vraagteken) tonen naast het copy-to-clipboard icoon bij het import adres
- **FR-041**: Help icoon MOET de gebruiker naar de helpfile leiden met volledige syntax voorbeelden

### Key Entities

- **Project**: Een bestaande of nieuwe projectcategorie waartoe een taak behoort. Wordt automatisch aangemaakt als deze niet bestaat.
- **Context**: Een bestaande of nieuwe context label voor de taak. Wordt automatisch aangemaakt als deze niet bestaat.
- **Priority**: Genormaliseerde prioriteit waarde (High, Medium, Low) afgeleid van p0-p9+ codes.
- **Due Date**: Deadline voor de taak in ISO formaat YYYY-MM-DD.
- **Duration**: Geschatte tijdsduur voor de taak in minuten (gehele getallen).
- **Defer Status**: Postponed lijst categorie (Follow-up, Weekly, Monthly, Quarterly, Bi-annual, Yearly) waar de taak naartoe wordt gestuurd.

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
- [x] Ambiguities marked (none - volledige PRD beschikbaar)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
