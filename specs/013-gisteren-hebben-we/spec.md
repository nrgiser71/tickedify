# Feature Specification: Premium Plus Abonnement met Ongelimiteerde Bijlages

**Feature Branch**: `013-gisteren-hebben-we`
**Created**: 2025-10-12
**Status**: Ready for Planning
**Input**: User description: "Gisteren hebben we ingebouwd dat b�ta gebruikers op het einde van de b�ta periode naar een betalende versie moeten overschakelen. Daarvoor hebben we een pagina gemaakt waar ze kunnen kiezen voor een gratis trial van 14 dagen en een betalend abonnement van 7/maand of 70/jaar. Ik wil nog een extra optie. Een abonnement van 8/maand of 80/jaar. Wat ze daarvoor krijgen is ongelimiteerde bijlages. Voor de andere versie is het beperkt tot max 5MB per bijlage, max 1 bijlage per taak en een totaal van 100Mb aan bijlages over alle taken heen. Pas de subscription.html aan. Je zal ook de admin pagina moeten aanpassen om de url voor de betaalpagina voor dit abonnement te kunnen instellen. Kijk ook nog even de code aan om te zien of je nog iets anders moet aanpassen."

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Add Premium Plus subscription tier (€8/maand, €80/jaar)
   → Focus: Unlimited attachments vs Standard tier limits
2. Extract key concepts from description
   → Actors: Beta users, subscription system, admin users
   → Actions: Add new subscription tier, configure payment URLs, enforce storage limits
   → Data: Subscription plans, storage limits, payment configurations
   → Constraints: Storage limits apply to Standard tier only
3. Identify existing implementations
   → Storage usage indicator (45 MB / 100 MB) - already exists
   → Upload validation (5MB, 1 per task, 100MB total) - already implemented
   → Upgrade prompt at 80% usage - already shows, needs text update
4. Fill User Scenarios & Testing section
   → Clear user flow: View plans → Select Premium Plus → Complete payment → Unlimited storage
5. Generate Functional Requirements
   → 10 requirements, all testable via UI and API verification
6. Identify Key Entities (subscription plans, storage configuration, payment config, user tier)
7. Clarify ambiguities with user
   → Downgrade policy: out of scope
   → Notification: use existing upgrade prompt
   → Upgrade flow: out of scope
8. Return: SUCCESS (spec complete and ready for planning phase)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
Een b�ta gebruiker die de limiet van 100MB totale opslag nadert, wil upgraden naar een abonnement met ongelimiteerde bijlages. De gebruiker bezoekt de abonnementspagina, ziet drie opties (�7/maand Standard, �8/maand Premium Plus, �70/jaar Standard, �80/jaar Premium Plus), selecteert Premium Plus vanwege de ongelimiteerde bijlages, voltooit de betaling via Plug&Pay, en kan daarna onbeperkt bijlagen uploaden zonder size restricties.

### Acceptance Scenarios

1. **Given** een b�ta gebruiker op de subscription pagina, **When** de gebruiker de plannen bekijkt, **Then** ziet de gebruiker vier betaalopties:
   - 14 dagen gratis trial (huidige features, met Standard tier limieten)
   - �7/maand Standard (100MB totaal, max 5MB per file, max 1 bijlage per taak)
   - �70/jaar Standard (100MB totaal, max 5MB per file, max 1 bijlage per taak)
   - �8/maand Premium Plus (ongelimiteerde bijlages, geen size restricties)
   - �80/jaar Premium Plus (ongelimiteerde bijlages, geen size restricties)

2. **Given** een gebruiker met Standard abonnement, **When** de gebruiker probeert een 6MB bestand te uploaden, **Then** krijgt de gebruiker een foutmelding "Maximum 5MB per bijlage voor Standard plan. Upgrade naar Premium Plus voor ongelimiteerde bijlages"

3. **Given** een gebruiker met Premium Plus abonnement, **When** de gebruiker een bestand van elke grootte upload, **Then** wordt het bestand succesvol geupload zonder size restricties

4. **Given** een admin gebruiker in het admin dashboard, **When** de admin de subscription configuratie opent, **Then** ziet de admin configuratievelden voor:
   - trial_14_days (bestaand)
   - monthly_7 (bestaand)
   - yearly_70 (bestaand)
   - monthly_8 (nieuw - Premium Plus)
   - yearly_80 (nieuw - Premium Plus)

5. **Given** een gebruiker die de trial heeft gebruikt, **When** de trial periode afloopt, **Then** ziet de gebruiker alle vier de betaalopties (Standard en Premium Plus, maandelijks en jaarlijks)

### Edge Cases
- **Downgrade Policy**: Wat gebeurt er als een gebruiker van Premium Plus downgradet naar Standard en al meer dan 100MB opgeslagen heeft? → Out of scope voor nu (later te implementeren)
- **Notification Strategy**: Hoe worden bestaande Standard gebruikers geïnformeerd? → **Reeds geïmplementeerd**: Bij >80% storage usage verschijnt automatisch een upgrade prompt (`index.html` regel 460-469, `app.js` regel 14171-14174). Deze tekst moet worden aangepast om Premium Plus te promoten.
- **Upgrade Flow**: Kunnen Standard gebruikers upgraden naar Premium Plus? → Out of scope voor nu (later te implementeren)

## Requirements

### Functional Requirements

- **FR-001**: Systeem MOET twee nieuwe abonnementsplannen toevoegen: Premium Plus Maandelijks (�8/maand) en Premium Plus Jaarlijks (�80/jaar)

- **FR-002**: Systeem MOET voor Premium Plus plannen ongelimiteerde bijlage opslag bieden (geen restricties op totaal volume, bestandsgrootte, of aantal per taak)

- **FR-003**: Systeem MOET voor Standard plannen (�7/maand, �70/jaar) en Trial plan de volgende limieten handhaven:
  - Maximum 100MB totale opslag voor alle bijlagen
  - Maximum 5MB per individueel bestand
  - Maximum 1 bijlage per taak

- **FR-004**: Subscription pagina MOET alle vijf plannen tonen met duidelijke vergelijking van features:
  - 14 dagen gratis trial (met Standard tier limieten)
  - �7/maand Standard (limieten zichtbaar)
  - �70/jaar Standard (limieten zichtbaar, "Bespaar �14" badge)
  - �8/maand Premium Plus (ongelimiteerde bijlages gemarkeerd)
  - �80/jaar Premium Plus (ongelimiteerde bijlages gemarkeerd, savings badge)

- **FR-005**: Admin configuratie pagina MOET twee nieuwe velden tonen voor Premium Plus checkout URLs:
  - monthly_8: Plug&Pay URL voor �8/maand plan
  - yearly_80: Plug&Pay URL voor �80/jaar plan

- **FR-006**: Systeem MOET bij bijlage upload de gebruiker subscription tier controleren:
  - Standard/Trial: Apply size, count, and total storage limits
  - Premium Plus: Allow unlimited uploads

- **FR-007**: Systeem MOET duidelijke foutmeldingen tonen aan Standard gebruikers bij het bereiken van limieten met verwijzing naar Premium Plus upgrade optie

- **FR-008**: Systeem MOET de subscription tier opslaan in de gebruiker account na succesvolle betaling van Premium Plus

- **FR-009**: Systeem MOET bestaande upgrade prompt tekst aanpassen om Premium Plus te promoten (huidige tekst: "Upgrade naar Premium" → nieuwe tekst moet beide opties tonen: Standard en Premium Plus)

- **FR-010**: Upgrade flow van Standard naar Premium Plus is out of scope voor deze feature (later te implementeren)

### Key Entities

- **Subscription Plans**: Twee nieuwe plannen toegevoegd aan bestaande drie plannen
  - `monthly_8`: Premium Plus Maandelijks (�8/maand, billing_cycle: 'monthly', unlimited storage)
  - `yearly_80`: Premium Plus Jaarlijks (�80/jaar, billing_cycle: 'yearly', unlimited storage)
  - Features: Alle Standard features + "Ongelimiteerde bijlages" + "Geen restricties op bestandsgrootte"

- **Storage Limits Configuration**: Differentieert tussen Standard en Premium Plus tiers
  - Standard tier: FREE_TIER_LIMIT (100MB), MAX_FILE_SIZE_FREE (5MB), MAX_ATTACHMENTS_PER_TASK_FREE (1)
  - Premium Plus tier: No limits (null values for all restrictions)

- **Payment Configuration**: Admin-beheerde checkout URLs per plan
  - Nieuwe entries: `monthly_8` en `yearly_80` met Plug&Pay checkout URLs
  - Status: is_active boolean om plannen te publiceren/verbergen

- **User Subscription Tier**: Gebruiker account bevat subscription tier indicator
  - Determines storage limit enforcement during bijlage operations
  - Values: 'trial', 'standard', 'premium_plus'

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs (unlimited storage for power users)
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all clarifications resolved)
- [x] Requirements are testable and unambiguous (can verify via API and UI)
- [x] Success criteria are measurable (storage limits, plan visibility, payment flow)
- [x] Scope is clearly bounded (new tier addition, no major architectural changes)
- [x] Dependencies and assumptions identified (existing payment system, storage manager, upgrade prompt)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities clarified with user
- [x] User scenarios defined
- [x] Requirements generated (10 functional requirements)
- [x] Entities identified (4 key entities)
- [x] Review checklist passed
- [x] Specification complete and ready for planning phase

---

## Clarification Resolutions

**User feedback verwerkt:**

1. **Downgrade Policy**: Out of scope - "daar gaan we voorlopig niet van wakker liggen"

2. **Notification Strategy**: **Reeds geïmplementeerd** - Er is al een upgrade prompt die verschijnt bij >80% storage gebruik. Deze tekst moet alleen worden aangepast om Premium Plus te promoten naast Standard.

3. **Upgrade Flow**: Out of scope - "voorlopig even zo laten, later toevoegen"

**Scope vastgesteld**: Feature focust op het toevoegen van Premium Plus tier met ongelimiteerde bijlages, zonder downgrade/upgrade flows te implementeren.
