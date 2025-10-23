# Tickedify - Smart Task Management

Tickedify is een krachtige task management applicatie gebaseerd op de "Baas Over Je Tijd" productiviteitsmethodologie.

## 🚀 Versie 0.18.0 - Volledig Betaalsysteem

### Belangrijkste Features

- **📋 Taken Beheer**: Volledige task management met projecten, contexten en deadlines
- **🔄 Herhalende Taken**: Uitgebreide recurring task ondersteuning
- **📧 Email Import**: Direct taken aanmaken vanuit email
- **📱 Responsive Design**: Werkt perfect op desktop, tablet en mobiel
- **💳 Betaalsysteem**: Complete Plug&Pay integratie voor abonnementen
- **🔐 Auto-Login**: Naadloze terugkeer na betaling zonder opnieuw inloggen

### Nieuwe in v0.18.0 - Feature 011 COMPLEET

#### Volledig Abonnement-Betalingsproces
- **Beta → Trial/Betaald Flow**: Professionele conversie workflow
- **Email Bevestiging**: Waarschuwing voor correct emailadres vóór betaling
- **Plug&Pay Integratie**: Veilige betalingen met webhook processing
- **Beta Expired Pagina**: Vriendelijke pagina met keuze tussen trial en betaald
- **Drie Abonnement Opties**:
  - 🆓 14 dagen gratis trial (1x per gebruiker)
  - 💰 €7/maand - Maandelijks abonnement
  - 💎 €70/jaar - Jaarlijks abonnement (2 maanden gratis)

#### Technical Features (v0.17.39 - v0.18.0)
- **Webhook Processing**: Automatische payment confirmation met idempotency
- **Auto-Login Tokens**: 10-minute expiry, single-use tokens na betaling
- **Admin Configuratie**: Beheer Plug&Pay checkout URLs per abonnement
- **Email Passthrough**: Correcte email weergave op bevestigingspagina (v0.17.42)
- **Beta Expired UX**: Dedicate pagina ipv toast melding (v0.17.43)
- **Security**: API key validatie, audit logging, HTTPS-only URLs
- **GoHighLevel Sync**: Automatische CRM tag updates voor betaalde klanten

## 🏗️ Technische Stack

- **Frontend**: Vanilla JavaScript (geen frameworks)
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL (via Neon)
- **Hosting**: Vercel
- **Storage**: Backblaze B2 voor bijlagen

## 🔧 Development

```bash
# Installeer dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 📊 Database Schema

### Users Table
- `selected_plan`: VARCHAR(20) - Gekozen abonnement (trial_14_days, monthly_7, yearly_70)
- `plan_selected_at`: TIMESTAMP - Wanneer abonnement gekozen
- `selection_source`: VARCHAR(20) - Bron van selectie (beta, registration, upgrade)
- `subscription_status`: VARCHAR(20) - Status (beta, trialing, trial_expired, active, expired)
- `payment_confirmed_at`: TIMESTAMP - Wanneer betaling bevestigd via webhook
- `trial_start_date`: DATE - Start van 14-dagen trial
- `trial_end_date`: DATE - Einde van trial periode
- `had_trial`: BOOLEAN - Of gebruiker al eerder trial heeft gebruikt
- `plugandpay_order_id`: VARCHAR(255) UNIQUE - Plug&Pay order ID (idempotency)
- `amount_paid_cents`: INTEGER - Betaald bedrag in centen
- `login_token`: VARCHAR(255) - Auto-login token na betaling (10-min expiry)
- `login_token_expires`: TIMESTAMP - Token vervaldatum
- `login_token_used`: BOOLEAN - Token al gebruikt (single-use)

### Payment Configurations Table (NEW v0.17.39)
- `plan_id`: VARCHAR(50) UNIQUE - Plan identifier (monthly_7, yearly_70)
- `plan_name`: VARCHAR(100) - Weergavenaam
- `checkout_url`: TEXT - Plug&Pay checkout URL
- `is_active`: BOOLEAN - Of plan beschikbaar is voor selectie

### Payment Webhook Logs Table (NEW v0.17.39)
- `user_id`: INTEGER - Foreign key naar users
- `event_type`: VARCHAR(100) - Webhook event type
- `order_id`: VARCHAR(255) - Plug&Pay order ID
- `email`: VARCHAR(255) - Email uit webhook
- `amount_cents`: INTEGER - Bedrag in centen
- `payload`: JSONB - Volledige webhook payload
- `signature_valid`: BOOLEAN - Of API key valide was
- `processed_at`: TIMESTAMP - Verwerkingstijd
- `error_message`: TEXT - Eventuele foutmelding
- `ip_address`: VARCHAR(45) - IP address van webhook

## 🚀 Deployment

Automatische deployment via Vercel bij push naar main branch.

Live URLs:
- **App**: https://tickedify.com/app
- **Admin**: https://tickedify.com/admin.html
- **Subscription**: https://tickedify.com/subscription.html
- **Beta Expired**: https://tickedify.com/beta-expired
- **Email Confirm**: https://tickedify.com/subscription-confirm

## 📈 Monitoring & Admin

### Admin Dashboard (`/admin.html`)
- Beta gebruiker overzicht
- Subscription statistics
- User account management
- System health monitoring

### Payment Configuration (`/admin-subscription-config.html`)
- Plug&Pay checkout URL beheer per abonnement
- Activeer/deactiveer subscription opties
- URL validatie (HTTPS required)
- Real-time configuratie updates

### Webhook Logs (`payment_webhook_logs` table)
- Volledige audit trail van alle payment webhooks
- Success/failure tracking met error messages
- Idempotency verification
- 90-day retention voor troubleshooting

## 🔐 Security Features

- **Webhook Validation**: API key verification op alle Plug&Pay webhooks
- **Idempotency**: Duplicate payment prevention via order_id tracking
- **Auto-Login Tokens**: 10-minute expiry, single-use voor veilige post-payment return
- **Email Verification**: Bevestigingspagina voorkomt verkeerde emailadressen
- **HTTPS Only**: Admin validatie vereist HTTPS checkout URLs
- **Audit Logging**: Comprehensive webhook logging met IP tracking

## 🎯 Feature 011 Status

✅ **PRODUCTION READY** - Volledige beta-naar-betaald conversie flow geïmplementeerd

**Geïmplementeerde User Flows**:
1. Beta verloopt → Beta-expired pagina → Trial/Betaald keuze
2. Trial selectie → Onmiddellijke activatie zonder betaling
3. Betaald selectie → Email bevestiging → Plug&Pay checkout → Webhook processing → Auto-login
4. Payment cancelled → Terugkeer naar subscription selectie
5. Trial expiry → Automatische detectie bij login → Upgrade prompt

**Documentatie**: Zie `specs/011-in-de-app/` voor volledige feature spec en implementatie details

---

**Versie**: 0.18.0
**Feature**: 011-in-de-app
**Laatste Update**: 12 oktober 2025
**Status**: Ready for Beta Launch (September 2025)
