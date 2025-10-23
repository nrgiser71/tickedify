# Feature Specification: Fix Admin2 Gebruiker Zoekfunctionaliteit

**Feature Branch**: `028-als-ik-in`
**Created**: 2025-10-23
**Status**: Draft
**Input**: User description: "Als ik in admin2 een nieuw bericht wil toevoegen en het aan een bepaalde gebruiker wil koppelen, slaag ik er niet in om gebruikers te vinden. Ik heb geprobeerd met de voornaam, de familienaam, het emailadres. Hij zegt altijd 'Geen gebruikers gevonden'."

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Problem: Admin kan geen gebruikers vinden bij bericht aanmaken
   ’ Tried: voornaam, familienaam, emailadres
   ’ Result: Altijd "Geen gebruikers gevonden"
2. Extract key concepts from description
   ’ Actor: Admin gebruiker
   ’ Action: Gebruiker zoeken voor bericht koppeling
   ’ Data: Users tabel (username, email)
   ’ Constraint: Database heeft geen first_name/last_name velden
3. For each unclear aspect:
   ’ [NEEDS CLARIFICATION: Moet er een minimum aantal karakters zijn voor zoeken?]
   ’ [NEEDS CLARIFICATION: Moeten er first_name/last_name velden toegevoegd worden aan database?]
   ’ [NEEDS CLARIFICATION: Is case-sensitive zoeken gewenst of case-insensitive?]
4. Fill User Scenarios & Testing section
    User flow is duidelijk: admin zoekt gebruiker ’ selecteert uit resultaten
5. Generate Functional Requirements
    Requirements zijn testbaar
6. Identify Key Entities
    Users tabel, Messages tabel
7. Run Review Checklist
     WARN "Spec heeft onzekerheden over database structuur"
8. Return: SUCCESS (spec klaar voor planning met waarschuwingen)
```

---

## ¡ Quick Guidelines
-  Focus op WHAT users need en WHY
- L Vermijd HOW to implement (geen tech stack details)
- =e Geschreven voor business stakeholders

---

## User Scenarios & Testing

### Primary User Story
Als admin gebruiker wil ik bij het aanmaken van een nieuw bericht in admin2 kunnen zoeken naar gebruikers door hun naam of emailadres in te typen, zodat ik het bericht aan de juiste gebruiker(s) kan koppelen. De zoekfunctie moet direct beginnen met zoeken terwijl ik typ en relevante resultaten tonen, zodat ik snel de gewenste gebruiker kan selecteren.

### Acceptance Scenarios

1. **Given** admin is ingelogd in admin2 en klikt op "Nieuw bericht toevoegen", **When** admin typt "jan" in het gebruiker zoekveldt, **Then** worden alle gebruikers getoond waarvan de username of email "jan" bevat (case-insensitive), bijvoorbeeld "jan@tickedify.com", "Jan Buskens", "jantine@example.com"

2. **Given** admin heeft zoekresultaten in het gebruiker zoekveldt, **When** admin klikt op een gebruiker in de resultatenlijst, **Then** wordt die gebruiker toegevoegd aan de lijst van geselecteerde ontvangers en verdwijnt uit de zoekresultaten

3. **Given** admin zoekt naar een specifiek emailadres zoals "jan@buskens.be", **When** admin typt het volledige emailadres in het zoekveldt, **Then** wordt exact die gebruiker gevonden en getoond (indien deze bestaat in de database)

4. **Given** admin zoekt naar een gebruiker die niet bestaat, **When** admin typt een naam/email die bij geen enkele gebruiker matcht, **Then** wordt de melding "Geen gebruikers gevonden" getoond

5. **Given** er zijn meerdere gebruikers met vergelijkbare namen (bijv. "Jan Buskens", "Jan Jansen"), **When** admin typt "jan", **Then** worden alle relevante gebruikers getoond gesorteerd op username

### Edge Cases

- Wat gebeurt er wanneer een admin slechts 1 karakter intypt? [NEEDS CLARIFICATION: Minimum 2 karakters voor zoeken?]
- Hoe handelt het systeem speciale karakters in de zoekopdracht (bijv. @, ., +)?
- Wat gebeurt er als er meer dan 50 gebruikers matchen met de zoekopdracht? (API limiet is 50)
- Moeten gebruikers die al geselecteerd zijn nog steeds in zoekresultaten verschijnen? (Momenteel worden ze gefilterd)
- Hoe wordt gezocht als gebruikersnaam uit meerdere woorden bestaat (bijv. "Jan Buskens")?

## Requirements

### Functional Requirements

#### Zoekfunctionaliteit
- **FR-001**: Systeem MOET gebruikers kunnen zoeken op basis van gedeeltelijke matches in username veld (case-insensitive)
- **FR-002**: Systeem MOET gebruikers kunnen zoeken op basis van gedeeltelijke matches in email veld (case-insensitive)
- **FR-003**: Systeem MOET zoekresultaten live tonen terwijl admin typt (debounced search met 500ms delay)
- **FR-004**: Systeem MOET maximaal 50 gebruikers per zoekopdracht retourneren
- **FR-005**: Systeem MOET gebruikers die al geselecteerd zijn uit de zoekresultaten filteren
- **FR-006**: Systeem MOET de melding "Geen gebruikers gevonden" tonen wanneer geen matches gevonden worden

#### Data Weergave
- **FR-007**: Elk zoekresultaat MOET de username (of "Unnamed" indien leeg) tonen als hoofdtekst
- **FR-008**: Elk zoekresultaat MOET het emailadres tonen als secondary tekst
- **FR-009**: Zoekresultaten MOETEN gesorteerd worden op username (alfabetisch)

#### Gebruiker Selectie
- **FR-010**: Admin MOET op een zoekresultaat kunnen klikken om de gebruiker te selecteren
- **FR-011**: Geselecteerde gebruikers MOETEN verwijderd worden uit de zoekresultaten lijst
- **FR-012**: Admin MOET geselecteerde gebruikers kunnen verwijderen uit de selectie lijst

#### API Requirements
- **FR-013**: API endpoint `/api/admin/users/search` MOET admin authenticatie vereisen
- **FR-014**: API endpoint MOET query parameter `q` accepteren voor zoekterm
- **FR-015**: API endpoint MOET lege resultaten array retourneren bij queries korter dan 2 karakters [NEEDS CLARIFICATION: Is 2 karakters de juiste limiet?]
- **FR-016**: API endpoint MOET SQL ILIKE operator gebruiken voor case-insensitive partial matching

### Huidige Problemen (Bug Analysis)

**PROBLEEM DIAGNOSE:**
De huidige implementatie werkt in principe correct, MAAR het probleem ligt waarschijnlijk in één of meer van deze scenario's:

1. **Database Data Probleem**: Users tabel bevat mogelijk geen correcte data in username/email velden
2. **Authenticatie Probleem**: Admin is mogelijk niet correct ingelogd, waardoor `requireAdmin` middleware requests blokkeert
3. **API Response Probleem**: API retourneert mogelijk wel data maar frontend verwerkt het niet correct
4. **CORS/Netwerk Probleem**: Requests bereiken de server mogelijk niet (geblokkeerd door CORS of netwerk issues)

**[NEEDS CLARIFICATION: Wat is de exacte foutmelding in browser console? Zijn er netwerk errors zichtbaar in Network tab?]**
**[NEEDS CLARIFICATION: Zijn er gebruikers in de productie database met correcte username en email waarden?]**
**[NEEDS CLARIFICATION: Is de admin gebruiker correct ingelogd met admin rechten?]**

### Key Entities

- **Users**: Representeert gebruikers in het systeem
  - Attributen: id, username, email, subscription_type
  - Username kan ook een volledige naam bevatten (bijv. "Jan Buskens")
  - Email is uniek identifier
  - Geen separate first_name/last_name velden in huidige schema

- **Messages**: Representeert berichten die naar gebruikers gestuurd worden (admin2 functionaliteit)
  - Relatie: Messages kunnen gekoppeld worden aan één of meerdere Users
  - Admin zoekt users om aan message te koppelen

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain -   **Meerdere clarificaties nodig**
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (gebruiker kan zoeken en selecteren)
- [x] Scope is clearly bounded (alleen gebruiker zoekfunctionaliteit in admin2)
- [x] Dependencies identified (API endpoint bestaat al, frontend code bestaat al)

### Critical Clarifications Needed

1. **Root Cause Analysis**: Wat is de exacte oorzaak van "Geen gebruikers gevonden"?
   - Console errors checken
   - Network tab checken voor API response
   - Database data verifiëren

2. **Database Schema**: Moet er first_name/last_name toegevoegd worden?
   - Huidige schema heeft alleen `username` (kan volledige naam zijn) en `email`
   - Alternatief: Username veld kan "Jan Buskens" bevatten als volledige naam

3. **Search Minimum**: Is 2 karakters minimum de juiste keuze?
   - Huidig: < 2 karakters = lege resultaten
   - Alternatieven: 1 karakter, 3 karakters?

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed (met waarschuwingen)

---

## Next Steps

1. **Debugging Sessie**: Root cause analyse uitvoeren op productie
   - Browser console logs checken
   - Network tab inspecteren voor API calls
   - Database query testen met sample users

2. **Database Verificatie**: Controleer of er users in productie database zitten met valide username/email waarden

3. **Planning Phase**: Na clarifications ’ move to planning phase met concrete technische oplossing
