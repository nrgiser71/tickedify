# Tickedify - Smart Task Management

Tickedify is een krachtige task management applicatie gebaseerd op de "Baas Over Je Tijd" productiviteitsmethodologie.

## 🚀 Versie 0.16.0 - Subscription Management

### Belangrijkste Features

- **📋 Taken Beheer**: Volledige task management met projecten, contexten en deadlines
- **🔄 Herhalende Taken**: Uitgebreide recurring task ondersteuning
- **📧 Email Import**: Direct taken aanmaken vanuit email
- **📱 Responsive Design**: Werkt perfect op desktop, tablet en mobiel
- **🧪 Beta Management**: Volledig beta gebruiker systeem
- **🎯 Subscription System**: Complete abonnement selectie workflow

### Nieuwe in v0.16.0

#### Abonnement Selectie Systeem
- **Beta Expired Flow**: Professionele overgang van beta naar betaald
- **Drie Abonnement Opties**:
  - 🆓 14 dagen gratis trial
  - 💰 €7/maand - Maandelijks abonnement
  - 💎 €70/jaar - Jaarlijks abonnement (2 maanden gratis)
- **Beperkte Login**: Beta gebruikers kunnen nog inloggen voor abonnement selectie
- **Admin Dashboard**: Overzicht van alle gebruiker abonnementen

#### Technical Features
- Complete subscription API endpoints
- Database schema voor subscription tracking
- Session-based authentication met subscription status
- Admin monitoring met kleurgecodeerde badges

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
- `subscription_status`: VARCHAR(20) - Status (active, expired, cancelled)
- `account_type`: VARCHAR(10) - Type account (beta, regular)

## 🚀 Deployment

Automatische deployment via Vercel bij push naar main branch.

Live URLs:
- **App**: https://tickedify.com/app
- **Admin**: https://tickedify.com/admin.html
- **Subscription**: https://tickedify.com/subscription.html

## 📈 Monitoring

Admin dashboard beschikbaar op `/admin.html` met:
- Beta gebruiker overzicht
- Subscription statistics
- User account management
- System health monitoring

---

**Versie**: 0.16.0
**Laatste Update**: 21 september 2025
