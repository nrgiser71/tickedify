# Feature Specification: In-App Admin-to-User Messaging System

**Feature Branch**: `026-lees-messaging-system`
**Created**: 2025-01-23
**Status**: Draft
**Input**: User description: "Lees MESSAGING_SYSTEM_SPEC.md voor de volgende feature"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Feature gebaseerd op complete technische specificatie in MESSAGING_SYSTEM_SPEC.md
2. Extract key concepts from description
   ’ Actors: Admin (message creator), Users (message receivers)
   ’ Actions: Create messages, target users, trigger display, track interactions
   ’ Data: Messages, user interactions, page visits, analytics
   ’ Constraints: One-way communication only, phase-based implementation
3. For each unclear aspect:
   ’ Technische details zijn volledig gespecificeerd in MESSAGING_SYSTEM_SPEC.md
4. Fill User Scenarios & Testing section
   ’ User flows: Admin creates message, users receive and interact
5. Generate Functional Requirements
   ’ Requirements extracted from 4-phase implementation plan
6. Identify Key Entities
   ’ Messages, Interactions, Page Visits, Users
7. Run Review Checklist
   ’ Spec compleet en implementatie-ready
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
**Als admin** wil ik belangrijke berichten kunnen sturen naar gebruikers van Tickedify, zodat ik ze kan informeren over updates, nieuwe features, onderhoud, of educatieve content over het effectief gebruiken van de applicatie.

**Als gebruiker** wil ik relevante berichten van de admin zien wanneer ik Tickedify gebruik, zodat ik op de hoogte blijf van belangrijke informatie en nieuwe mogelijkheden, waarbij ik de flexibiliteit heb om berichten te sluiten of uit te stellen.

### Acceptance Scenarios

#### Scenario 1: Broadcast Message naar Alle Gebruikers
1. **Given** admin wil een algemene aankondiging maken
2. **When** admin creëert bericht "App gaat Engels-only op 1 februari"
3. **And** admin selecteert "Iedereen" als doelgroep
4. **And** admin publiceert het bericht
5. **Then** alle gebruikers zien het bericht bij hun volgende app load
6. **When** gebruiker klikt op "Got it"
7. **Then** bericht verdwijnt en wordt niet meer getoond aan die gebruiker

#### Scenario 2: Onboarding Bericht voor Nieuwe Gebruikers
1. **Given** nieuwe gebruiker meldt zich aan voor Tickedify
2. **When** gebruiker bezoekt dagelijkse planning voor de eerste keer
3. **Then** gebruiker ziet educatief bericht "Welcome to Daily Planning"
4. **And** bericht bevat uitleg over drag-and-drop functionaliteit
5. **When** gebruiker klikt op actieknop "Try it now"
6. **Then** bericht wordt afgehandeld en verdwijnt

#### Scenario 3: Gerichte Feature Aankondiging
1. **Given** admin wil premium feature promoten
2. **When** admin creëert bericht voor "Premium gebruikers" alleen
3. **Then** alleen gebruikers met premium subscription zien het bericht
4. **And** gratis gebruikers zien het bericht niet

#### Scenario 4: Progressieve Tutorial Berichten
1. **Given** admin wil gebruikers stapsgewijs trainen
2. **When** admin creëert bericht met trigger "5e bezoek aan edit task modal"
3. **Then** bericht verschijnt pas na 5 keer openen van de modal
4. **And** niet eerder of later

#### Scenario 5: Snooze Functionaliteit
1. **Given** gebruiker ziet een bericht maar is nu niet geïnteresseerd
2. **When** gebruiker klikt op "Snooze 1 uur"
3. **Then** bericht verdwijnt direct
4. **And** bericht verschijnt niet opnieuw binnen 1 uur
5. **When** 1 uur is verstreken
6. **Then** bericht verschijnt opnieuw bij volgende page load

#### Scenario 6: Meerdere Berichten Carousel
1. **Given** admin heeft 3 actieve berichten gepubliceerd
2. **When** gebruiker laadt de app
3. **Then** gebruiker ziet eerste bericht met indicator "1 / 3"
4. **And** gebruiker kan navigeren met "Previous" en "Next" knoppen
5. **And** belangrijke berichten verschijnen eerst
6. **When** gebruiker dismisses een bericht
7. **Then** carousel toont resterende berichten

#### Scenario 7: Analytics Tracking
1. **Given** admin heeft bericht verstuurd naar 245 gebruikers
2. **When** admin bekijkt analytics dashboard
3. **Then** admin ziet aantal getoonde berichten (198)
4. **And** admin ziet aantal dismissed berichten (156)
5. **And** admin ziet aantal snoozed berichten (42)
6. **And** admin ziet individuele user interactions
7. **And** admin ziet percentages (seen rate, dismiss rate, etc.)

### Edge Cases
- **Wat gebeurt er** wanneer een bericht een vervaldatum heeft en die datum wordt bereikt terwijl een gebruiker de app open heeft?
  - Bericht blijft zichtbaar tot gebruiker page reload doet
- **Wat gebeurt er** wanneer admin een bericht deactiveert terwijl het nog open staat bij een gebruiker?
  - Gebruiker kan huidige view afmaken, bericht verdwijnt bij volgende check
- **Wat gebeurt er** wanneer gebruiker meerdere tabs/devices open heeft?
  - Interacties zijn user-scoped, dismiss in één tab geldt voor alle tabs
- **Wat gebeurt er** wanneer gebruiker subscription type verandert?
  - Berichten worden opnieuw geëvalueerd bij volgende page load
- **Wat gebeurt er** wanneer een bericht niet dismissible is?
  - Gebruiker moet bericht lezen, geen close knop beschikbaar (tenzij actieknop)
- **Wat gebeurt er** wanneer er geen nieuwe berichten zijn?
  - Geen modal wordt getoond, app laadt normaal
- **Wat gebeurt er** bij een bericht met externe link knop?
  - Link opent in nieuw browser tab/window, bericht blijft open

---

## Requirements *(mandatory)*

### Functional Requirements - Phase 1: Core Foundation

#### Message Creation
- **FR-001**: Systeem MOET admins toestaan om berichten aan te maken met titel en message content
- **FR-002**: Systeem MOET message types ondersteunen (information, educational, warning, important, feature, tip)
- **FR-003**: Systeem MOET berichten kunnen activeren/deactiveren zonder te verwijderen

#### Message Display
- **FR-004**: Systeem MOET nieuwe berichten tonen als modal popup bij app load
- **FR-005**: Modal MOET title, icon, content en action buttons tonen
- **FR-006**: Systeem MOET hoogste prioriteit bericht eerst tonen bij meerdere berichten

#### User Interaction
- **FR-007**: Gebruikers MOETEN berichten kunnen dismissen (sluiten)
- **FR-008**: Dismissed berichten MOGEN NIET opnieuw verschijnen voor die gebruiker
- **FR-009**: Systeem MOET track bijhouden welke gebruiker welk bericht heeft gezien

### Functional Requirements - Phase 2: Targeting & Triggers

#### Targeting
- **FR-010**: Systeem MOET targeting ondersteunen: "Iedereen", "Gefilterd op subscription", "Specifieke gebruikers"
- **FR-011**: Admin MOET kunnen filteren op subscription types (free, premium, trial)
- **FR-012**: Admin MOET kunnen zoeken naar specifieke gebruikers op naam/email
- **FR-013**: Systeem MOET preview tonen van aantal targeted users vóór publicatie

#### Triggers
- **FR-014**: Systeem MOET immediate trigger ondersteunen (direct na publicatie)
- **FR-015**: Systeem MOET trigger "X dagen na signup" ondersteunen
- **FR-016**: Systeem MOET trigger "Eerste bezoek aan pagina X" ondersteunen
- **FR-017**: Systeem MOET trigger "Nde bezoek aan pagina X" ondersteunen
- **FR-018**: Systeem MOET page visits automatisch tracken per gebruiker per pagina

#### Scheduling
- **FR-019**: Admin MOET publish date kunnen instellen (toekomstig of direct)
- **FR-020**: Admin MOET expiration date kunnen instellen (optioneel)
- **FR-021**: Verlopen berichten MOGEN NIET meer getoond worden

### Functional Requirements - Phase 3: Rich Content & UX

#### Message Types & Styling
- **FR-022**: Elk message type MOET unieke icon en kleur hebben
- **FR-023**: Systeem MOET priority volgorde hanteren: important > warning > feature > educational > tip > information

#### Markdown Support
- **FR-024**: Message content MOET markdown links ondersteunen [text](url)
- **FR-025**: Links MOETEN correct renderen en klikbaar zijn

#### Action Buttons
- **FR-026**: Berichten KUNNEN optionele actieknop bevatten
- **FR-027**: Acties MOETEN twee types ondersteunen: "navigate" (intern) en "external" (nieuwe tab)
- **FR-028**: Systeem MOET button clicks tracken voor analytics

#### Snooze Functionality
- **FR-029**: Gebruikers MOETEN berichten kunnen snoozen voor 1 uur, 4 uur of 1 dag
- **FR-030**: Snoozed berichten MAGEN NIET verschijnen tot snooze periode voorbij is
- **FR-031**: Na snooze periode MOET bericht opnieuw verschijnen

#### Multiple Messages
- **FR-032**: Bij meerdere berichten MOET systeem carousel UI tonen
- **FR-033**: Gebruikers MOETEN kunnen navigeren tussen berichten met prev/next knoppen
- **FR-034**: Carousel MOET indicator tonen (bijv. "2 / 5")

#### Dismissible Control
- **FR-035**: Admin MOET kunnen instellen of bericht dismissible is (optioneel sluiten)
- **FR-036**: Non-dismissible berichten MOETEN geen close knop tonen
- **FR-037**: Non-dismissible berichten MET actieknop MOETEN alsnog te sluiten zijn na actie

### Functional Requirements - Phase 4: Analytics & Admin UI

#### Analytics Dashboard
- **FR-038**: Admin MOET lijst zien van alle berichten met summary stats
- **FR-039**: Admin MOET per bericht kunnen zien: targeted, shown, dismissed, snoozed counts
- **FR-040**: Systeem MOET percentages berekenen: seen rate, dismiss rate, snooze rate, button click rate

#### Detailed Analytics
- **FR-041**: Admin MOET gedetailleerde analytics kunnen bekijken per bericht
- **FR-042**: Analytics MOET lijst tonen van individuele user interactions
- **FR-043**: Per user MOET zichtbaar zijn: first_shown, dismissed, snoozed, button_clicked

#### Message Management
- **FR-044**: Admin MOET berichten kunnen activeren/deactiveren via toggle
- **FR-045**: Admin MOET berichten kunnen preview-en vóór publicatie
- **FR-046**: Admin MOET search kunnen doen in user database voor targeting

#### Target Preview
- **FR-047**: Systeem MOET live preview tonen van aantal users tijdens message creatie
- **FR-048**: Preview MOET sample users tonen (eerste 5) die targeted worden

### Non-Functional Requirements

#### Performance
- **NFR-001**: Message check MOET minder dan 500ms toevoegen aan page load time
- **NFR-002**: Page visit tracking MOET async gebeuren zonder user blocking
- **NFR-003**: Analytics queries MOETEN binnen 2 seconden resultaat geven

#### Security
- **NFR-004**: Alleen admins MOGEN berichten aanmaken en beheren
- **NFR-005**: Alle admin endpoints MOETEN authorization check hebben
- **NFR-006**: User input MOET gevalideerd worden tegen injection attacks

#### Usability
- **NFR-007**: Modal MOET responsive zijn op mobile, tablet en desktop
- **NFR-008**: Message content MOET maximum lengte hebben (10,000 karakters)
- **NFR-009**: Snooze knoppen MOETEN duidelijk gelabeld zijn met tijdsduur

#### Data Integrity
- **NFR-010**: Database MOET foreign key constraints hanteren
- **NFR-011**: Bij user delete MOETEN interactions ook verwijderd worden (CASCADE)
- **NFR-012**: Bij message delete MOETEN interactions ook verwijderd worden (CASCADE)

---

## Key Entities *(include if feature involves data)*

### Admin Message
Representeert een bericht dat admin naar gebruikers stuurt
- **Attributes**: titel, content, type (information/educational/etc), active status
- **Targeting**: doelgroep type, subscription filters, specifieke user IDs
- **Triggering**: trigger type (immediate/days_after_signup/page_visit), trigger waarde
- **Scheduling**: publish datum, expiration datum (optioneel)
- **Behavior**: dismissible flag, snoozable flag, snooze durations
- **Action Button**: label, actie type (navigate/external), target URL/path
- **Timestamps**: created_at, updated_at

### Message Interaction
Representeert hoe een specifieke gebruiker met een bericht heeft geïnterageerd
- **Relationship**: Koppelt één message aan één user (composite primary key)
- **Status**: dismissed boolean, snoozed_until timestamp
- **Tracking**: first_shown_at, last_shown_at, shown_count
- **Button**: button_clicked boolean, button_clicked_at timestamp
- **Cascade**: Verwijderd bij delete van message of user

### User Page Visit
Representeert hoeveel keer een gebruiker een specifieke pagina heeft bezocht
- **Relationship**: Koppelt user aan page identifier
- **Counting**: visit_count (geïncrementeerd bij elk bezoek)
- **Timestamps**: first_visit_at, last_visit_at
- **Purpose**: Gebruikt voor trigger logica (first visit, nth visit)

### User (Existing Entity - Extended)
Bestaande users tabel wordt uitgebreid voor messaging functionaliteit
- **Existing Attributes**: id, email, name, created_at
- **Subscription**: subscription_type (free/premium/trial) - gebruikt voor targeting
- **Relationships**: Heeft vele interactions, heeft vele page visits

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
  - Spec focust op WHAT en WHY, technische details staan in separaat MESSAGING_SYSTEM_SPEC.md
- [x] Focused on user value and business needs
  - Alle requirements zijn user-centric: admin management, user experience
- [x] Written for non-technical stakeholders
  - Scenarios beschrijven business flows, geen code references
- [x] All mandatory sections completed
  - User Scenarios, Requirements, Key Entities zijn compleet

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
  - Alle requirements zijn duidelijk gespecificeerd
- [x] Requirements are testable and unambiguous
  - Elk requirement heeft "MOET" met meetbare outcome
- [x] Success criteria are measurable
  - Analytics percentages, response times, user counts zijn kwantificeerbaar
- [x] Scope is clearly bounded
  - 4 phases, elk met duidelijke deliverables, one-way communication only
- [x] Dependencies and assumptions identified
  - Vereist: users tabel met subscription_type, admin authorization systeem

---

## Execution Status

- [x] User description parsed
  - Parsed from MESSAGING_SYSTEM_SPEC.md reference
- [x] Key concepts extracted
  - Admin messaging, user targeting, triggers, analytics
- [x] Ambiguities marked
  - Geen ambiguïteiten - complete tech spec beschikbaar
- [x] User scenarios defined
  - 7 hoofdscenarios + edge cases gedocumenteerd
- [x] Requirements generated
  - 48 functional requirements + 12 non-functional requirements
- [x] Entities identified
  - 4 entities: Admin Message, Message Interaction, User Page Visit, User (extended)
- [x] Review checklist passed
  - All checks completed successfully

---

## Implementation Approach (High-Level)

### Phase-Based Delivery
Feature wordt geleverd in 4 onafhankelijke, testbare phases:

1. **Phase 1 (Core Foundation ~4 uur)**
   - Basic text messages van admin naar alle users
   - Simple dismiss functionaliteit
   - Foundation voor toekomstige uitbreiding

2. **Phase 2 (Targeting & Triggers ~4 uur)**
   - Advanced user targeting (subscription, specific users)
   - Conditional triggers (signup days, page visits)
   - Scheduled en expiring messages

3. **Phase 3 (Rich Content & UX ~4 uur)**
   - Message types met icons en kleuren
   - Markdown support, action buttons
   - Snooze functionality, message carousel
   - Priority sorting

4. **Phase 4 (Analytics & Admin UI ~4-5 uur)**
   - Complete analytics dashboard
   - Detailed user interaction tracking
   - Message preview functionaliteit
   - Admin management features

### Success Metrics
- **Engagement**: > 70% van users dismisses berichten (gelezen)
- **Performance**: < 500ms extra page load time
- **Admin Efficiency**: < 5 minuten om targeted message te creëren
- **User Satisfaction**: < 5% van users klaagt over message intrusiveness

### Constraints
- **One-way communication**: Users kunnen NIET antwoorden op berichten
- **No notifications**: Berichten verschijnen alleen in-app, geen email/push
- **Admin only**: Reguliere users kunnen geen berichten sturen
- **No attachments**: Alleen text content + markdown links + action buttons

---

## Dependencies

### Existing System Requirements
- Users tabel met `subscription_type` kolom
- Admin authorization systeem (user_id = 1 check of proper admin role)
- Session management voor user identification

### New Database Tables
- `admin_messages` (berichten storage)
- `message_interactions` (user interaction tracking)
- `user_page_visits` (page visit tracking voor triggers)

### Frontend Integration Points
- app.html (message modal inclusion)
- admin.html (admin dashboard voor message management)
- All app pages (page visit tracking)

---

## Future Enhancements (Out of Scope)
Deze features zijn NIET onderdeel van deze spec, maar kunnen later toegevoegd worden:
- Rich media (images, videos) in berichten
- Email notificaties voor berichten
- Two-way messaging (user replies)
- Message templates en saved drafts
- A/B testing voor message content
- Automated message scheduling gebaseerd op user behavior
- Integration met externe notification services
- Message translation/multi-language support
