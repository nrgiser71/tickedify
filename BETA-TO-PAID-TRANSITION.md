# Beta naar Betaalde Gebruikers Overgang Plan

## Situatie Analyse
- Tickedify heeft momenteel een waitlist systeem (geen open registraties)
- Er bestaat wel een `/api/auth/register` endpoint (regel 1478 in server.js)
- Database heeft een `users` tabel met basis velden (rol, actief, etc.)
- Geen bestaande velden voor beta status of betalingsinformatie

## Voorgestelde Aanpak

### 1. Database Uitbreiding
Voeg nieuwe kolommen toe aan de `users` tabel:
- `is_beta_user BOOLEAN DEFAULT FALSE` - markeer beta gebruikers
- `beta_toegang_datum TIMESTAMP` - wanneer ze beta toegang kregen
- `subscription_status VARCHAR(20)` - 'trial', 'active', 'cancelled', 'expired'
- `subscription_start_date TIMESTAMP` - begin abonnement
- `subscription_end_date TIMESTAMP` - einde trial/abonnement
- `stripe_customer_id VARCHAR(255)` - voor Stripe integratie
- `trial_days_remaining INTEGER` - dagen over in trial

### 2. Beta User Registratie Flow
- Maak een speciale registratie pagina: `/beta-register.html`
- Gebruik een unieke beta access code die je aan testers geeft
- Bij registratie: automatisch `is_beta_user = TRUE` en `subscription_status = 'trial'`
- Geef ze bijvoorbeeld 30-60 dagen gratis trial periode

### 3. Overgang naar Betaald
Wanneer je live gaat:
- Beta users behouden hun account en data
- Ze krijgen een email met speciale "beta user deal" (korting?)
- Na trial periode: redirect naar payment page als `subscription_status != 'active'`
- Implementeer middleware die checkt of gebruiker mag inloggen

### 4. Technische Implementatie
- **Registratie pagina** voor beta users met code verificatie
- **Database migratie** script voor nieuwe kolommen
- **Subscription check middleware** voor toegangscontrole
- **Payment integratie** (Stripe/Paddle) voor na de trial
- **Email notificaties** voor trial verloop waarschuwingen

### 5. Voordelen van deze aanpak
- Beta testers behouden al hun data
- Geen nieuwe registratie nodig
- Flexibele trial periode per gebruiker
- Makkelijk om speciale beta user kortingen te geven
- Graduale overgang mogelijk (sommigen betalen eerder)

## Implementatie Volgorde
1. Database schema uitbreiden
2. Beta registratie pagina maken
3. Auth middleware aanpassen voor subscription checks
4. Payment systeem voorbereiden (kan later volledig geïmplementeerd worden)
5. Email systeem voor trial notificaties

## Alternatieve Overwegingen

### Feature Flags Aanpak
In plaats van trial periodes, kun je ook werken met feature flags:
- Beta users krijgen toegang tot alle features
- Na beta periode: bepaalde features worden beperkt voor free users
- Premium features alleen voor betalende gebruikers

### Grandfathering Optie
- Beta users krijgen "lifetime deal" als dank voor vroege feedback
- Of permanente korting (bijv. 50% voor altijd)
- Dit motiveert beta testers om te blijven

## Code Voorbeelden

### Database Migratie
```sql
ALTER TABLE users 
ADD COLUMN is_beta_user BOOLEAN DEFAULT FALSE,
ADD COLUMN beta_toegang_datum TIMESTAMP,
ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'trial',
ADD COLUMN subscription_start_date TIMESTAMP,
ADD COLUMN subscription_end_date TIMESTAMP,
ADD COLUMN stripe_customer_id VARCHAR(255),
ADD COLUMN trial_days_remaining INTEGER;
```

### Middleware Check
```javascript
function requireActiveSubscription(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // Check subscription status
    const user = await getUserById(req.session.userId);
    
    if (user.subscription_status === 'active' || 
        (user.subscription_status === 'trial' && user.trial_days_remaining > 0)) {
        return next();
    }
    
    // Redirect to payment page
    return res.redirect('/subscribe?return_to=' + req.originalUrl);
}
```

## Notities
- Deze aanpak zorgt ervoor dat beta testers een soepele overgang hebben naar betalende klanten zonder dataverlies of nieuwe registratie
- Belangrijkste voordeel: gebruikers hoeven niet opnieuw te beginnen
- Flexibiliteit om verschillende deals aan te bieden aan beta users vs nieuwe gebruikers