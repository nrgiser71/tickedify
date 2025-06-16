# Tickedify Development Notes

## Productivity Method
**Important:** Tickedify is NOT a GTD (Getting Things Done) app. It implements the **"Baas Over Je Tijd"** (Master of Your Time) productivity method - a unique system developed specifically for effective time and task management.

## CURRENT PRIORITY: Recurring Task Bug Debugging (June 2025)

**CRITICAL DISCOVERY**: Recurring tasks are NOT being created in the database despite "success" logs

**Debugging Status (Evening June 15, 2025):**

**✅ What we confirmed works:**
- Task completion workflow correctly identifies recurring tasks
- `originalTask` object contains correct recurring properties (`herhalingType: 'dagelijks', herhalingActief: true`)
- `nextDate` parameter correctly calculated as `'2025-06-16'`
- Database connection and pool working correctly
- All logging shows "Insert successful" messages

**❌ REAL PROBLEM DISCOVERED:**
- **New recurring tasks are NOT actually being saved to database**
- Despite logs showing "✅ DEBUG: Insert successful, task ID: [id]", the tasks don't exist in database
- Database query `/api/debug/june16` shows only 1 task for 2025-06-16 (manually created)
- No new recurring tasks appear in `/api/debug/recent` despite multiple completion tests

**Key Evidence:**
- All recent tasks in database have `verschijndatum: 2025-06-15` (original completed tasks)
- NO tasks found with `verschijndatum: 2025-06-16` except the 1 manually created
- Multiple "successful" task completion cycles should have created 10+ tasks for 2025-06-16
- This proves the database INSERT is failing silently

**Database INSERT Issue:**
- The `createRecurringTask` function reports success but doesn't actually insert
- Likely either:
  1. Database transaction rollback happening after "success" log
  2. INSERT statement has syntax/parameter error that's not being caught
  3. Database constraint violation causing silent failure
  4. Connection pool issue causing lost transactions

**Next Steps for Tomorrow:**
1. **Add transaction logging** - wrap INSERT in explicit transaction with rollback detection
2. **Add immediate verification** - query database immediately after INSERT to confirm presence
3. **Check database constraints** - look for foreign key or other constraint violations
4. **Add error logging** - capture any silent database errors that might be occurring
5. **Test with minimal INSERT** - try creating basic task without recurring fields first

**Files Modified During Debug Session:**
- `database.js` - Added extensive debug logging, timezone fix, fallback INSERT fix
- `server.js` - Added debug endpoints `/api/debug/june16` and `/api/debug/acties`
- `public/app.js` - Enhanced debug logging for task creation

**Debug Endpoints Created:**
- `GET /api/debug/june16` - Shows all tasks for 2025-06-16
- `GET /api/debug/acties` - Shows current acties list from database

**PROBLEM SOLVED (June 16, 2025):**

**Root Cause Identified:**
1. **Variable Scoping Bug**: `verschijndatumISO` was declared inside try-block but used in catch fallback block, causing ReferenceError
2. **No Transaction Management**: Database operations weren't wrapped in explicit transactions, causing silent failures
3. **Insufficient Error Detection**: Pool-based queries didn't properly detect constraint violations or rollbacks

**Solution Implemented:**
1. **Fixed Variable Scoping**: Moved `verschijndatumISO` declaration outside try-block 
2. **Added Explicit Transactions**: Used dedicated client with BEGIN/COMMIT/ROLLBACK
3. **Added RETURNING Clause**: INSERT now returns ID to confirm success
4. **Immediate Verification**: Query inserted task within same transaction to verify persistence
5. **Robust Error Handling**: Proper rollback on any failure, client cleanup in finally block
6. **Enhanced Logging**: Detailed transaction state logging for debugging

**Changes Made to `database.js`:**
- `createRecurringTask()` function completely rewritten with proper transaction management
- Added explicit client connection with transaction lifecycle
- Fixed fallback INSERT for databases without recurring columns
- Added immediate verification within transaction scope

**Changes Made to `public/app.js`:**
- Fixed frontend overwriting bug in task completion functions
- Added conditional `slaLijstOp()` skip when recurring tasks are created
- Enhanced `calculateNextRecurringDate()` to support complex patterns
- Added comprehensive parsing for all documented recurring patterns:
  - `weekly-interval-day` (e.g., `weekly-1-4` = every week on Thursday) ✅ TESTED
  - `daily-interval` (e.g., `daily-3` = every 3 days) ⚠️ NEEDS TESTING
  - `monthly-day-daynum-interval` (e.g., `monthly-day-15-2` = day 15 every 2 months) ⚠️ NEEDS TESTING
  - `yearly-day-month-interval` (e.g., `yearly-25-12-1` = Dec 25 every year) ⚠️ NEEDS TESTING

**NEXT TESTING PHASE:**
All complex recurring patterns have been implemented but need systematic testing:

1. **Daily intervals**: Test `daily-2`, `daily-3`, `daily-7` patterns
2. **Monthly patterns**: Test `monthly-day-15-1`, `monthly-day-31-2` patterns  
3. **Yearly patterns**: Test `yearly-25-12-1`, `yearly-29-2-1` (leap year edge case)
4. **Monthly weekday patterns**: Still need implementation (`monthly-weekday-first-1-1`)
5. **Yearly special patterns**: Still need implementation (`yearly-special-first-workday-1`)
6. **Event-based patterns**: Test `event-10-before-webinar` functionality

**Status**: Weekly recurring tasks now work correctly. Other patterns implemented but require validation.

## IMPORTANT DEVELOPMENT NOTES FOR CLAUDE

**Testing Capabilities Reminder:**
When debugging or testing features in the future, remember that Claude can:

1. **Direct API Testing**: Call endpoints directly instead of relying on UI testing
   - `POST /api/lijst/acties` to create tasks with recurring properties
   - `PUT /api/taak/{id}` to mark tasks completed and trigger recurring logic
   - `GET /api/lijst/acties` to verify results
   - `POST /api/taak/recurring` to test recurring task creation directly

2. **Database Access**: Query database via API endpoints or custom endpoints
   - Create debug endpoints like `/api/debug/query` for ad-hoc queries
   - Use existing debug endpoints (`/api/debug/june16`, `/api/debug/acties`)
   - Check data integrity and state directly

3. **Automated Test Scripts**: Write and deploy test scripts
   - Create test files that can be committed and run via endpoints
   - Build comprehensive test suites for recurring patterns
   - Validate edge cases programmatically

4. **End-to-End Validation**: Complete workflow testing without UI
   - Test entire recurring task lifecycle via API calls
   - Verify date calculations, database persistence, and business logic
   - Much faster than manual UI testing

**This approach saves significant time and provides more thorough testing coverage.**

## Previous Status
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