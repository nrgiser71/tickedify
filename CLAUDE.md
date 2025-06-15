# Tickedify Development Notes

## Productivity Method
**Important:** Tickedify is NOT a GTD (Getting Things Done) app. It implements the **"Baas Over Je Tijd"** (Master of Your Time) productivity method - a unique system developed specifically for effective time and task management.

## Current Status
- ✅ App deployed to tickedify.com 
- ✅ PostgreSQL database working
- ✅ All task functionality working
- ✅ robots.txt blocks search engines
- ✅ **Comprehensive recurring tasks functionality implemented**
  - All standard recurrence patterns (daily, weekly, monthly, yearly)
  - Advanced patterns (first/last workday, specific weekdays of month)
  - **Event-based recurrence** (e.g., "10 days before next webinar")
- ✅ **Production issues resolved (Dec 2025)**
  - Fixed database schema synchronization between development and production
  - Implemented robust database initialization with error handling
  - Resolved 500/404 errors when creating recurring tasks
  - Added diagnostic endpoints for production monitoring

## Next Features to Implement
- **Email-to-Inbox functionality**
  - Use subdomain: `inbox.tickedify.com` (NOT tasks.tickedify.com)
  - Mailgun for email processing
  - Automatic user provisioning
  - Each user gets: `user123@inbox.tickedify.com`

## Technical Stack
- Frontend: Vanilla JavaScript
- Backend: Express.js + Node.js
- Database: PostgreSQL (Neon)
- Hosting: Vercel
- Domain: tickedify.com (DNS via Vimexx)

## Important Decisions Made
- Use separate subdomain for email-to-task (inbox.tickedify.com)
- Keep normal email addresses on main domain (jan@tickedify.com, info@tickedify.com)
- Fully automated user provisioning (no manual email setup)

## Herhalingsfunctionaliteit - Technische Details

### Database Schema
```sql
-- Toegevoegde velden aan 'taken' tabel:
herhaling_type VARCHAR(30),        -- Type herhaling (bijv. 'daily', 'weekly-1-1', 'event-3-before-webinar')
herhaling_waarde INTEGER,          -- Waarde voor herhaling (momenteel niet gebruikt, legacy field)
herhaling_actief BOOLEAN DEFAULT FALSE  -- Of de herhaling actief is
```

### Herhalingsformaten
- **Dagelijks**: `'dagelijks'` of `'daily-N'` (elke N dagen)
- **Werkdagen**: `'werkdagen'`
- **Wekelijks**: `'weekly-interval-dagen'` (bijv. `'weekly-1-1,3,5'` = elke week op ma/wo/vr)
- **Maandelijks**: `'monthly-day-dag-interval'` (bijv. `'monthly-day-15-2'` = dag 15 van elke 2 maanden)
- **Maandelijks weekdag**: `'monthly-weekday-positie-dag-interval'` (bijv. `'monthly-weekday-first-1-1'` = eerste maandag van elke maand)
- **Jaarlijks**: `'yearly-dag-maand-interval'` (bijv. `'yearly-6-8-1'` = 6 augustus van elk jaar)
- **Jaarlijks speciaal**: `'yearly-special-type-interval'` (bijv. `'yearly-special-first-workday-1'`)
- **Gebeurtenis-gebaseerd**: `'event-dagen-richting-eventnaam'` (bijv. `'event-10-before-webinar'`)

### User Experience
- **Popup interface** met radio buttons voor intuïtieve selectie
- **Live text generation** toont herhaling in leesbare vorm (bijv. "Elke 2 weken op maandag, woensdag")
- **🔄 Indicator** bij herhalende taken in alle lijstweergaven
- **Event popup** vraagt naar volgende event datum bij gebeurtenis-gebaseerde herhalingen
- **Keyboard support**: Tab navigatie, Enter/Escape shortcuts

### Unieke Features
- **Gebeurtenis-gebaseerde herhaling**: Eerste task management app met deze functionaliteit
- **Werkdag ondersteuning**: Automatische berekening van eerste/laatste werkdag van maand/jaar
- **Complexe weekdag patronen**: "Laatste vrijdag van de maand" etc.
- **Automatische instantie creatie**: Nieuwe taken worden automatisch aangemaakt bij completion

## Development Todo List

### High Priority
- [x] Implement wederkerende taken functionality
- [ ] Research Mailgun setup for inbox.tickedify.com email processing
- [ ] Design user authentication/registration system
- [ ] Plan database schema for multi-user support

### Medium Priority  
- [ ] Design email-to-task parsing logic
- [ ] Research payment integration (Stripe/Paddle)
- [ ] Plan automatic user provisioning workflow

### Low Priority
- [ ] Consider mobile app or PWA version
- [ ] Plan data export/import functionality
- [ ] Design admin dashboard for user management

### Completed ✅
- [x] Deploy app to production (tickedify.com)
- [x] Fix all database migration issues
- [x] Implement task completion functionality
- [x] Block search engine indexing with robots.txt
- [x] **Volledig uitgebreide herhalingsfunctionaliteit geïmplementeerd**
  - [x] Database schema uitgebreid met herhalingsvelden (herhaling_type, herhaling_waarde, herhaling_actief)
  - [x] Popup interface gemaakt voor herhalingsconfiguratie met radio buttons
  - [x] Alle standaard herhalingspatronen: dagelijks, werkdagen, wekelijks, maandelijks, jaarlijks
  - [x] Geavanceerde patronen: eerste/laatste werkdag van maand/jaar, specifieke weekdagen
  - [x] **Gebeurtenis-gebaseerde herhaling** - unieke feature (bijv. "10 dagen voor webinar")
  - [x] Automatische aanmaak van volgende herhalende taken bij completion
  - [x] Herhalingsindicatoren (🔄) toegevoegd aan alle takenlijsten
  - [x] Volledige database integratie met PostgreSQL
  - [x] Popup voor gebeurtenis-datum invoer bij event-gebaseerde herhalingen
  - [x] Uitgebreide date calculation algoritmes voor alle herhalingstypes
  - [x] Keyboard shortcuts en accessibility ondersteuning
- [x] **Productie-issues opgelost (December 2025)**
  - [x] Database schema synchronisatie probleem opgelost
  - [x] Robuuste database initialisatie geïmplementeerd
  - [x] 500/404 errors bij herhalende taken gefixed
  - [x] Graceful error handling voor ontbrekende database kolommen
  - [x] Diagnostische endpoints toegevoegd (/api/ping, /api/status, /api/db-test)
  - [x] Server architecture vereenvoudigd voor betere betrouwbaarheid

## Technische Troubleshooting - December 2025

### Probleem: Productie 500/404 Errors
**Symptomen:** App werkte lokaal perfect, maar productie gaf "Fout bij plannen taak" errors

**Root Cause:** 
- Database schema mismatch tussen development en production
- Productie database miste `herhaling_*` kolommen
- Complex logging en error handling veroorzaakte cascade failures

**Oplossing:**
1. **Database Schema Migration**: Verbeterde `initDatabase()` functie die graceful omgaat met missing columns
2. **Incremental Server Rebuild**: Stap-voor-stap rebuild van server.js vanuit werkende simpele versie
3. **Diagnostic Endpoints**: Toegevoegd `/api/ping`, `/api/status`, `/api/db-test` voor debugging
4. **Robust Error Handling**: Database operations hebben fallback naar basic functionaliteit zonder recurring fields
5. **Simplified Architecture**: Removed complex logging that was causing initialization failures

### Lessons Learned
- ✅ Database migrations in production require bulletproof backwards compatibility
- ✅ Complex error handling can sometimes cause more problems than it solves
- ✅ Incremental debugging with minimal servers is highly effective
- ✅ Diagnostic endpoints are essential for production troubleshooting
- ✅ Always test database schema changes in production-like environment first