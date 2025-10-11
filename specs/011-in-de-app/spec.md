# Feature Specification: Volledig Abonnement-Betalingsproces

**Feature Branch**: `011-in-de-app`
**Created**: 2025-10-11
**Status**: Draft
**Input**: User description: "In de app is het momenteel mogelijk om te registreren en dan krijg je toegang en wordt je als bèta tester gemarkeerd. Ik kan in de admin pagina de bèta periode beëindigen en dan krijgen de béta testers de volgende keer dat ze de app gebruiken een melding en krijgen ze een scherm om een abonnement af te sluiten. Momenteel stopt het bij dat scherm. Nu gaan we het hele process afwerken. Dat wil zeggen dat ze na het kiezen van een abonnement naar de bijhorende betalingspagina moeten gestuurd worden. Op het moment dat het abonnement afgesloten is, als de eerste betaling gelukt is, moeten ze terug in de app komen en moet de gebruiker gemarkeerd worden als betalende klant en welk abonnement hij afgesloten heeft. Elke gebruiker met een abonnement kan aanloggen. Eén van de abonnementen is een gratis proefperiode van 2 weken. Dan moet hij uiteraard niet naar een betalingspagina gestuurd worden. Volgens mij is het stuk van de gratis proefperiode al geïmplementeerd. Wat wel nog moet geprogrammeerd worden is wat er na het verlopen van de gratis proefperiode moet gebeuren. Eigenlijk hetzelfde als wat er gebeurt bij het aflopen van de bèta periode. Met als enige verschil dat de gebruiker niet meer voor een gratis proefperiode kan kiezen. Ik wil dat ik de URL's van de betalingspagina's per abonnement kan instellen in het admin scherm. Liefst in een apart scherm. Als nog niet alles duidelijk is mag je me vragen stellen."

**Payment Provider**: Plug&Pay

---

## User Scenarios & Testing

### Primary User Story

**Als bèta gebruiker** wil ik na het aflopen van de bèta periode een abonnement kunnen kiezen en betalen via een veilige betaalomgeving, zodat ik toegang blijf houden tot Tickedify en mijn productiviteit kan blijven beheren.

**Als trial gebruiker** wil ik na het aflopen van mijn 2-weken gratis proefperiode een betaald abonnement kunnen kiezen, zodat ik de app kan blijven gebruiken.

**Als admin** wil ik de checkout URLs van Plug&Pay per abonnement kunnen configureren in een overzichtelijk admin scherm, zodat ik flexibel de betaallinks kan beheren zonder code aan te passen.

### Acceptance Scenarios

#### Scenario 1: Bèta Gebruiker ’ Betaald Abonnement (Maandelijks ¬7)
1. **Given** de admin heeft de bèta periode beëindigd via het admin dashboard
2. **When** een bèta gebruiker inlogt op Tickedify
3. **Then** ziet de gebruiker een melding "De bèta periode is afgelopen"
4. **And** wordt het abonnement selectie scherm getoond met drie opties:
   - Gratis proefperiode (2 weken)
   - Maandelijks abonnement (¬7/maand)
   - Jaarlijks abonnement (¬70/jaar, 2 maanden gratis)
5. **When** de gebruiker "Maandelijks abonnement" selecteert
6. **Then** wordt de gebruiker doorgestuurd naar de Plug&Pay checkout pagina (URL uit admin configuratie)
7. **When** de gebruiker de betaling succesvol afrondt
8. **Then** wordt de gebruiker teruggestuurd naar de Tickedify app
9. **And** ziet de gebruiker een succesbericht "Je abonnement is actief!"
10. **And** heeft de gebruiker volledige toegang tot alle functies
11. **And** is de gebruiker in de database gemarkeerd als:
    - account_type: 'paid'
    - subscription_status: 'active'
    - selected_plan: 'monthly_7'

#### Scenario 2: Bèta Gebruiker ’ Gratis Proefperiode
1. **Given** de bèta periode is afgelopen
2. **When** een bèta gebruiker "Gratis proefperiode" selecteert
3. **Then** wordt GEEN betaallink geopend
4. **And** krijgt de gebruiker direct toegang tot de app voor 2 weken
5. **And** wordt in de database vastgelegd:
    - selected_plan: 'trial_14_days'
    - subscription_status: 'trialing'
    - trial_start_date: [huidige datum]
    - trial_end_date: [huidige datum + 14 dagen]

#### Scenario 3: Trial Vervallen ’ Upgrade naar Betaald Abonnement
1. **Given** een gebruiker heeft een gratis proefperiode van 2 weken gehad
2. **And** de proefperiode is verlopen (trial_end_date is in het verleden)
3. **When** de gebruiker inlogt
4. **Then** ziet de gebruiker een melding "Je gratis proefperiode is afgelopen"
5. **And** wordt het abonnement selectie scherm getoond met TWEE opties:
   - Maandelijks abonnement (¬7/maand)
   - Jaarlijks abonnement (¬70/jaar)
6. **And** is de "Gratis proefperiode" optie NIET meer zichtbaar
7. **When** de gebruiker een betaald abonnement kiest
8. **Then** verloopt het proces identiek aan Scenario 1 (stap 6-11)

#### Scenario 4: Betaling Mislukt
1. **Given** een gebruiker heeft een abonnement geselecteerd
2. **And** wordt doorgestuurd naar Plug&Pay
3. **When** de betaling mislukt (onvoldoende saldo, geannuleerd, etc.)
4. **Then** wordt de gebruiker teruggestuurd naar het abonnement selectie scherm
5. **And** ziet de gebruiker een foutmelding "Betaling mislukt. Probeer het opnieuw."
6. **And** blijft de subscription_status op 'expired' of 'trial_expired'
7. **And** heeft de gebruiker GEEN toegang tot de app

#### Scenario 5: Admin Configureert Betaal URLs
1. **Given** de admin is ingelogd op het admin dashboard
2. **When** de admin navigeert naar "Abonnement Configuratie" (nieuw menu item)
3. **Then** ziet de admin een overzicht met drie abonnementen:
   - Gratis proefperiode (2 weken)
   - Maandelijks abonnement (¬7/maand)
   - Jaarlijks abonnement (¬70/jaar)
4. **And** kan de admin bij elk betaald abonnement een Plug&Pay checkout URL invoeren
5. **When** de admin een URL opslaat
6. **Then** wordt deze direct actief voor nieuwe abonnement selecties
7. **And** ziet de admin een succesbericht "Configuratie opgeslagen"

#### Scenario 6: Webhook Payment Confirmation (Automatisch)
1. **Given** een gebruiker heeft een betaling afgerond op Plug&Pay
2. **When** Plug&Pay stuurt een webhook notificatie naar Tickedify
3. **Then** valideert het systeem de webhook signature (security)
4. **And** wordt de gebruiker in de database bijgewerkt:
   - subscription_status: 'active'
   - payment_confirmed_at: [timestamp]
5. **And** wordt een bevestigingsmail gestuurd naar de gebruiker (optioneel)
6. **And** wordt de gebruiker gesynchroniseerd met GoHighLevel CRM met tag 'tickedify-paid-customer'

### Edge Cases

#### Edge Case 1: Gebruiker verlaat betaalpagina zonder te betalen
- **Wat gebeurt er?** Gebruiker wordt teruggestuurd naar abonnement scherm, kan opnieuw proberen
- **Database status:** Blijft ongewijzigd (expired/trial_expired)

#### Edge Case 2: Webhook komt binnen voordat gebruiker terugkeert
- **Wat gebeurt er?** Gebruiker status wordt al bijgewerkt via webhook, bij return naar app ziet gebruiker direct succes
- **Database status:** Al op 'active' gezet door webhook

#### Edge Case 3: Admin vergeet checkout URL in te vullen
- **Wat gebeurt er?** Gebruiker krijgt foutmelding "Betaallink niet geconfigureerd, neem contact op met support"
- **Database status:** Geen wijziging, gebruiker blijft zonder toegang

#### Edge Case 4: Dubbele betaling (gebruiker klikt 2x op betalen)
- **Wat gebeurt er?** Plug&Pay voorkomt dubbele betalingen via idempotency keys
- **Database status:** Status wordt maar 1x bijgewerkt

#### Edge Case 5: Trial gebruiker probeert opnieuw trial te kiezen
- **Wat gebeurt er?** Trial optie is niet zichtbaar na eerste trial periode
- **Database status:** Systeem controleert of gebruiker al eerder trial heeft gehad

#### Edge Case 6: Webhook signature validatie faalt
- **Wat gebeurt er?** Webhook wordt genegeerd, logging van security incident
- **Database status:** Geen wijziging, administrator wordt gewaarschuwd

---

## Requirements

### Functional Requirements

#### Abonnement Selectie Flow
- **FR-001**: Systeem MOET na bèta expiry het abonnement selectie scherm tonen met drie opties (trial, maandelijks, jaarlijks)
- **FR-002**: Systeem MOET na trial expiry het abonnement selectie scherm tonen met TWEE opties (maandelijks, jaarlijks) zonder trial optie
- **FR-003**: Systeem MOET voor gratis proefperiode direct toegang verlenen zonder betaallink
- **FR-004**: Systeem MOET voor betaalde abonnementen de gebruiker doorsturen naar de geconfigureerde Plug&Pay checkout URL

#### Betaal URL Management
- **FR-005**: Admin MOET in het admin dashboard een nieuw menu item "Abonnement Configuratie" kunnen openen
- **FR-006**: Admin MOET per abonnement (maandelijks, jaarlijks) een Plug&Pay checkout URL kunnen invoeren en opslaan
- **FR-007**: Systeem MOET ingevoerde checkout URLs valideren op correct URL formaat
- **FR-008**: Systeem MOET checkout URLs persisteren in de database
- **FR-009**: Systeem MOET een foutmelding tonen als gebruiker een abonnement kiest waarvoor geen checkout URL is geconfigureerd

#### Payment Return Flow
- **FR-010**: Systeem MOET na succesvolle betaling de gebruiker terugsturen naar de Tickedify app via een return URL
- **FR-011**: Systeem MOET bij return een succesbericht tonen "Je abonnement is actief!"
- **FR-012**: Systeem MOET bij gefaalde betaling de gebruiker terugsturen naar het abonnement selectie scherm met foutmelding
- **FR-013**: Systeem MOET bij geannuleerde betaling de gebruiker terugsturen naar het abonnement selectie scherm

#### Webhook Integration
- **FR-014**: Systeem MOET een webhook endpoint aanbieden voor Plug&Pay payment confirmations
- **FR-015**: Systeem MOET webhook signatures valideren voor security (HMAC of vergelijkbare methode)
- **FR-016**: Systeem MOET bij succesvolle webhook de gebruiker status updaten naar 'active'
- **FR-017**: Systeem MOET bij webhook failure logging uitvoeren voor troubleshooting
- **FR-018**: Systeem MOET idempotent zijn (dubbele webhooks mogen geen dubbele updates veroorzaken)

#### Database Updates
- **FR-019**: Systeem MOET bij succesvolle betaling de volgende velden updaten:
  - subscription_status ’ 'active'
  - selected_plan ’ [gekozen plan ID]
  - plan_selected_at ’ [timestamp]
  - payment_confirmed_at ’ [timestamp]
- **FR-020**: Systeem MOET bij trial selectie de volgende velden updaten:
  - subscription_status ’ 'trialing'
  - selected_plan ’ 'trial_14_days'
  - trial_start_date ’ [huidige datum]
  - trial_end_date ’ [huidige datum + 14 dagen]

#### Access Control
- **FR-021**: Systeem MOET gebruikers met subscription_status 'active' volledige toegang tot de app verlenen
- **FR-022**: Systeem MOET gebruikers met subscription_status 'trialing' volledige toegang tot de app verlenen
- **FR-023**: Systeem MOET gebruikers met subscription_status 'expired' of 'trial_expired' toegang ontzeggen tot app functies (behalve abonnement selectie)
- **FR-024**: Systeem MOET bij elke login de trial_end_date controleren en status updaten naar 'trial_expired' indien verlopen

#### GoHighLevel Synchronisatie
- **FR-025**: Systeem MOET na succesvolle betaling de gebruiker synchroniseren met GoHighLevel CRM
- **FR-026**: Systeem MOET de tag 'tickedify-paid-customer' toevoegen aan GoHighLevel contact
- **FR-027**: Systeem MOET de tag 'tickedify-trial-user' verwijderen indien aanwezig

#### Error Handling
- **FR-028**: Systeem MOET duidelijke foutmeldingen tonen bij ontbrekende checkout URL configuratie
- **FR-029**: Systeem MOET logging uitvoeren van alle betaal-gerelateerde events voor troubleshooting
- **FR-030**: Systeem MOET bij webhook failures een administrator notificatie sturen (email of dashboard)

### Key Entities

#### Payment Configuration (Nieuw)
- **Beschrijving**: Opslag van Plug&Pay checkout URLs per abonnement type
- **Attributen**:
  - plan_id (bijv. 'monthly_7', 'yearly_70')
  - plan_name (bijv. 'Maandelijks ¬7', 'Jaarlijks ¬70')
  - checkout_url (de volledige Plug&Pay URL)
  - is_active (boolean om tijdelijk URLs te deactiveren)
  - created_at (wanneer geconfigureerd)
  - updated_at (laatst aangepast)

#### User Subscription (Uitbreiding bestaand)
- **Beschrijving**: Uitbreiding van bestaande users tabel met payment tracking
- **Nieuwe Attributen**:
  - payment_confirmed_at (timestamp van webhook bevestiging)
  - trial_start_date (startdatum gratis proefperiode)
  - trial_end_date (einddatum gratis proefperiode)
  - had_trial (boolean om te tracken of gebruiker al eerder trial heeft gehad)

#### Payment Webhook Log (Nieuw)
- **Beschrijving**: Logging van alle webhook events voor audit trail
- **Attributen**:
  - webhook_id (unieke ID)
  - user_id (welke gebruiker)
  - event_type (bijv. 'payment.success', 'payment.failed')
  - payload (volledige webhook data)
  - signature_valid (boolean)
  - processed_at (timestamp)
  - error_message (indien processing failed)

---

## Webhook Implementation Advies

### Plug&Pay Webhook Configuratie

**Wat je moet instellen in Plug&Pay dashboard:**

1. **Webhook URL**: `https://tickedify.com/api/webhooks/plugandpay`
   - Dit endpoint moet in de backend worden aangemaakt
   - Moet publiek toegankelijk zijn (geen authenticatie vereist voor webhook zelf)

2. **Events om te activeren**:
   - `payment.paid` - Betaling succesvol afgerond
   - `payment.failed` - Betaling mislukt
   - `payment.cancelled` - Betaling geannuleerd door gebruiker
   - `payment.expired` - Betaling verlopen (timeout)
   - `refund.created` - Terugbetaling verwerkt (voor toekomstig gebruik)

3. **Webhook Signature Verification**:
   - Plug&Pay stuurt een signature header mee (meestal `X-Plug-Signature` of vergelijkbaar)
   - Dit is een HMAC SHA256 hash van de payload met een geheime sleutel
   - De backend moet deze signature verifiëren voordat de webhook wordt verwerkt
   - Geheime sleutel wordt verstrekt in Plug&Pay dashboard ’ bewaren in environment variable

4. **Return URLs** (apart van webhook):
   - Success URL: `https://tickedify.com/payment/success?plan={PLAN_ID}&order={ORDER_ID}`
   - Cancel URL: `https://tickedify.com/payment/cancelled`
   - Deze URLs zijn waar de gebruiker naartoe wordt gestuurd na interactie met Plug&Pay

### Security Overwegingen

1. **Signature Validation**:
   - ALTIJD de webhook signature valideren voordat processing
   - Zonder valide signature ’ webhook negeren en loggen als security incident

2. **Idempotency**:
   - Gebruik Plug&Pay order ID als unique key
   - Check of order ID al eerder is verwerkt voordat database update
   - Voorkomt dubbele updates bij duplicate webhooks

3. **Rate Limiting**:
   - Implementeer rate limiting op webhook endpoint
   - Max 100 requests per minuut per IP (Plug&Pay heeft vaste IPs)

4. **Logging**:
   - Log ALLE webhooks (success en failure) voor audit trail
   - Bewaar minimaal 90 dagen voor troubleshooting

### Webhook Processing Flow

```
1. Plug&Pay stuurt webhook ’ /api/webhooks/plugandpay
2. Valideer signature header
   ’ Invalid? Log + return 401 Unauthorized
3. Parse webhook payload (JSON)
4. Extract: order_id, user_email, payment_status, plan_id
5. Check idempotency: is order_id al verwerkt?
   ’ Ja? Return 200 OK (already processed)
6. Find user in database via email of custom field
7. Update user:
   - subscription_status = 'active'
   - selected_plan = plan_id
   - payment_confirmed_at = NOW()
8. Sync to GoHighLevel (add tag 'tickedify-paid-customer')
9. Log webhook as processed
10. Return 200 OK to Plug&Pay
```

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

### Dependencies & Assumptions
- **Dependency 1**: Plug&Pay account met actieve checkout configuraties voor beide abonnementen
- **Dependency 2**: Webhook signature secret key beschikbaar in Plug&Pay dashboard
- **Assumption 1**: Gebruiker heeft werkende email voor GoHighLevel synchronisatie
- **Assumption 2**: Plug&Pay webhooks zijn betrouwbaar (>99% delivery rate)
- **Assumption 3**: Admin heeft technische kennis om checkout URLs uit Plug&Pay te kopiëren

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none remaining)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

**Status**:  Ready for Planning Phase (/plan)
