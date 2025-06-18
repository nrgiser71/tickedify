# Tickedify Development Notes

## Taal Instructie voor Claude
**BELANGRIJK**: Spreek altijd Nederlands in dit project. Alle communicatie met de gebruiker dient in het Nederlands te gebeuren.

## Productivity Method
**Important:** Tickedify is NOT a GTD (Getting Things Done) app. It implements the **"Baas Over Je Tijd"** (Master of Your Time) productivity method - a unique system developed specifically for effective time and task management.

## CURRENT STATUS: All Recurring Task Bugs Resolved (June 2025) ✅

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

**UITGEBREIDE TESTING VOLTOOID (Juni 17, 2025):**

**✅ VOLLEDIG GETEST EN WERKEND:**
1. **Daily intervals**: `daily-2`, `daily-3`, `daily-7` ✅ 
   - Test: 2025-06-17 + daily-2 = 2025-06-19 ✅
   - Test: 2025-06-17 + daily-3 = 2025-06-20 ✅
   - Test: 2025-06-17 + daily-7 = 2025-06-24 ✅

2. **Monthly patterns**: `monthly-day-15-1`, `monthly-day-31-2` ✅
   - Test: 2025-06-17 + monthly-day-15-1 = 2025-07-15 ✅
   - Test: 2025-06-17 + monthly-day-31-2 = 2025-08-31 ✅
   - Edge case: 2025-01-15 + monthly-day-31-1 = 2025-02-28 ✅ (februari fallback)

3. **Yearly patterns**: `yearly-25-12-1`, `yearly-29-2-1` ✅
   - Test: 2025-06-17 + yearly-25-12-1 = 2026-12-25 ✅
   - Leap year: 2025-06-17 + yearly-29-2-1 = 2026-02-28 ✅ (non-leap fallback)
   - Leap year: 2027-06-17 + yearly-29-2-1 = 2028-02-29 ✅ (leap year correct)

4. **Weekly patterns**: `weekly-1-4`, `weekly-2-1` ✅ (eerder getest)
   - Test: 2025-06-17 + weekly-1-4 = 2025-06-19 ✅ (dinsdag → donderdag)
   - Test: 2025-06-17 + weekly-2-1 = 2025-06-30 ✅ (dinsdag → maandag +2 weken)

5. **Monthly weekday patterns**: `monthly-weekday-first-1-1`, `monthly-weekday-last-1-1` ✅
   - Test: 2025-06-17 + monthly-weekday-first-1-1 = 2025-07-07 ✅ (eerste maandag juli)
   - Zowel server-side als frontend geïmplementeerd ✅

6. **Yearly special patterns**: `yearly-special-first-workday-1`, `yearly-special-last-workday-1` ✅
   - Server-side én frontend geïmplementeerd ✅
   - Test endpoints beschikbaar ✅

**🔧 DEBUG ENDPOINTS GEÏMPLEMENTEERD:**
- `/api/debug/test-recurring/:pattern/:baseDate` - Individuele pattern tests
- `/api/debug/raw-test/:pattern/:baseDate` - Raw JSON debugging
- `/api/debug/quick-monthly-test` - Specifieke monthly-weekday test
- `/api/debug/parse-pattern/:pattern` - Pattern parsing validatie

**⚠️ NOG TE TESTEN:**
- **Event-based patterns**: `event-10-before-webinar` - Speciale UI logica vereist
- **End-to-end testing**: Volledige task completion workflow via UI

**Status**: Alle belangrijke complexe herhalingspatronen werkend. Frontend en backend volledig gesynchroniseerd.

## URGENT FIX VOLTOOID (Juni 17, 2025)

**PROBLEEM**: Gebruiker meldde dat taak "elke 2de woensdag van de maand" niet wordt aangemaakt bij afvinken.

**DIAGNOSE**: 
- UI genereerde correct `monthly-weekday-second-3-1` patroon
- Frontend en backend validatie accepteerde alleen `'first'` en `'last'` posities
- `'second'`, `'third'`, `'fourth'` werden afgekeurd door validatie

**OPLOSSING GEÏMPLEMENTEERD**:
✅ Frontend app.js uitgebreid met support voor alle posities
✅ Server-side validatie bijgewerkt in alle endpoints  
✅ Intelligent nth-occurrence algoritme toegevoegd
✅ Verificatie: 2025-06-17 + monthly-weekday-second-3-1 = 2025-07-09 ✅

**TEST ENDPOINTS BESCHIKBAAR**:
- `/api/debug/test-second-wednesday` - Verificatie van werkende implementatie
- `/api/debug/quick-monthly-test` - Alle woensdagen juli 2025
- `/api/debug/test-recurring/monthly-weekday-second-3-1/2025-06-17`

**STATUS**: 2de/3de/4de weekdag patronen volledig functioneel. Gebruiker kan opnieuw testen.

## TWEEDE URGENT FIX IN UITVOERING (Juni 17, 2025)

**NIEUWE PROBLEMEN GEMELD**:
1. ❌ **Foutmelding bij opslaan "eerste werkdag van elke maand"** 
2. ❌ **Laatste werkdag afvinken maakt geen nieuwe taak aan**

**DIAGNOSE & FIXES**:

**Probleem 1: ✅ OPGELOST**
- **Oorzaak**: Server-side ondersteuning ontbrak voor Nederlandse werkdag patronen
- **Oplossing**: Toegevoegd aan server.js:
  - `eerste-werkdag-maand` → Eerste werkdag van volgende maand  
  - `laatste-werkdag-maand` → Laatste werkdag van volgende maand
  - `eerste-werkdag-jaar` → Eerste werkdag van volgend jaar
  - `laatste-werkdag-jaar` → Laatste werkdag van volgend jaar
- **Status**: Server herkent nu alle Nederlandse werkdag patronen ✅

**Probleem 2: ✅ OPGELOST**
- **Oorzaak**: Server herkende `monthly-weekday-first-workday-1` patroon niet
- **Root cause**: UI genereert 'workday' string, server verwachtte alleen numerieke waarden (1-7)
- **Oplossing**: Speciale handling toegevoegd voor `targetDay === 'workday'`
- **Verificatie**: 
  - `monthly-weekday-first-workday-1` → 2025-07-01 ✅
  - `monthly-weekday-last-workday-1` → 2025-07-31 ✅

## WERKDAG BUGS DEFINITIEF OPGELOST (Juni 17, 2025) ✅

**PROBLEEM ANALYSE:**
De werkdag bugs waren eigenlijk een **cascade van 4 verschillende bugs** die elkaar versterkten:

1. **Database Constraint Bug**: 
   - `herhaling_type` kolom was VARCHAR(30) 
   - Patroon `monthly-weekday-first-workday-1` is 34 karakters → constraint violation

2. **Frontend Validatie Bug**: 
   - Code accepteerde alleen numerieke weekdagen (1-7)
   - 'workday' string werd afgekeurd door validatie

3. **API Duplicate Handling Bug**: 
   - Bestaande taken gaven INSERT errors
   - Fout zorgde ervoor dat taken verdwenen uit UI

4. **Error Handling Bug**: 
   - Database errors bereikten frontend niet
   - Gebruiker zag alleen "taak verdwenen" zonder foutmelding

**VOLLEDIGE OPLOSSING GEÏMPLEMENTEERD:**

✅ **Database Schema Fix**: 
- `herhaling_type` kolom uitgebreid naar VARCHAR(50)
- Automatische migratie toegevoegd voor bestaande databases

✅ **Frontend Validatie Fix**: 
- Extended validatie voor 'workday' acceptance
- Workday calculation logic toegevoegd aan date calculations

✅ **API Duplicate Handling Fix**: 
- `/api/debug/add-single-action` endpoint verbeterd
- Automatische duplicate detection en deletion

✅ **Error Handling Fix**: 
- Betere error propagation naar frontend
- Uitgebreide logging voor debugging

**END-TO-END TESTING VOLTOOID:**
- ✅ "eerste werkdag van elke maand" - Task creation succesvol
- ✅ "eerste werkdag van elke maand" - Recurring task creation bij afvinken succesvol
- ✅ "laatste werkdag van elke maand" - Volledige workflow getest en werkend
- ✅ Geen verdwijnende taken meer tijdens planning proces

**WAAROM HET ZO LANG DUURDE:**
- Elk opgelost probleem onthulde het volgende bug
- Vercel deployment delays (2+ min per test) maakten snelle iteratie onmogelijk  
- Database constraint errors waren niet zichtbaar in browser console
- Symptomen leken op verschillende problemen (save → 404 → UI → database)

**STATUS**: Beide werkdag patronen volledig functioneel in productie. Cascade bug probleem definitief opgelost.

## TOAST NOTIFICATION SYSTEEM GEÏMPLEMENTEERD (Juni 17, 2025) ✅

**PROBLEEM OPGELOST**: Browser alerts vervangen door professionele toast notifications

**IMPLEMENTATIE**:
- ✅ **ToastManager class** - Volledig notification systeem
- ✅ **4 notification types**: success (groen), error (rood), warning (geel), info (blauw)
- ✅ **Positionering**: Rechtsboven met auto-stack functionaliteit
- ✅ **Interactions**: Auto-dismiss (4-6 sec), click-to-dismiss, hover effects
- ✅ **Styling**: macOS-consistente design met blur effects en smooth animaties
- ✅ **Mobile responsive**: Top-slide animaties voor kleine schermen
- ✅ **10 alert() vervangingen**: Alle browser popups vervangen

**GEBRUIK IN CODE**:
```javascript
toast.success('Taak afgewerkt! Volgende herhaling gepland voor 18-06-2025');
toast.error('Fout bij opslaan. Probeer opnieuw.');
toast.warning('Alle velden behalve project zijn verplicht!');
toast.info('Algemene informatie'); // Voor toekomstig gebruik
```

**BESTANDEN AANGEPAST**:
- `public/app.js` - ToastManager class toegevoegd, alle alerts vervangen
- `public/style.css` - Toast styling met macOS design system
- `public/index.html` - Toast container toegevoegd

**STATUS**: Toast notification systeem volledig operationeel in productie.

## IMPORTANT DEVELOPMENT NOTES FOR CLAUDE

**MANDATORY DEPLOYMENT WORKFLOW:**
- ALWAYS update version number in package.json before any commit
- ALWAYS commit and push changes to git after implementing features
- ALWAYS wait for deployment confirmation via /api/version endpoint
- ALWAYS run regression tests after deployment confirmation
- ALWAYS report test results to user (success/failure)
- User tests live on production (tickedify.com via Vercel deployment)
- Use descriptive commit messages following existing project style

**CURL COMMAND REQUIREMENTS:**
- ALWAYS use `curl -s -L -k` flags for ALL API testing
- `-s` = silent mode (no progress bars)
- `-L` = follow redirects automatically  
- `-k` = skip certificate verification
- This prevents macOS security prompts that interrupt deployment workflow
- Example: `curl -s -L -k https://tickedify.com/api/version`
- NEVER use plain `curl` without these flags

**GIT CONFIGURATION REQUIREMENTS:**
- Git user identity is pre-configured to prevent commit prompts
- Username: "Jan Buskens" 
- Email: "jan@tickedify.com"
- If git prompts appear, run these commands once:
  - `git config --global user.name "Jan Buskens"`
  - `git config --global user.email "jan@tickedify.com"`
- This ensures smooth automated deployment workflow

**VERSION TRACKING REQUIREMENTS:**
- Every code change MUST increment package.json version
- Format: "1.0.2" → "1.0.3" (patch level for features/fixes)
- Version bump MUST be included in same commit as feature
- Never deploy without version verification workflow

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

## TEST DASHBOARD SYSTEEM - TE IMPLEMENTEREN

**Doel**: Dashboard om kritieke functionaliteit te testen na elke deployment
**Locatie**: `/admin/tests` of `/debug/health-check`
**Gebruiker**: Alleen Jan (single-user systeem)

### Test Data Management Strategie

**Aanpak**: Test in productie database met gegarandeerde cleanup
- **GEEN** aparte test tabellen of test omgevingen 
- **WEL** real-time tracking van alle gemaakte test records
- Automatische cleanup van alle test data na test suite

**TestRunner Class Implementatie**:
```javascript
class TestRunner {
    constructor() {
        this.createdRecords = {
            taken: [],      // Track task IDs 
            acties: [],     // Track action IDs
            projecten: [],  // Track project IDs  
            contexten: []   // Track context IDs
        };
    }

    // Track elke database insert voor cleanup
    async createTestTask(data) {
        const result = await db.insertTask(data);
        this.createdRecords.taken.push(result.id);
        return result;
    }

    // Cleanup in omgekeerde volgorde (foreign key constraints)
    async cleanup() {
        for (const taakId of this.createdRecords.taken) {
            await db.query('DELETE FROM taken WHERE id = $1', [taakId]);
        }
        // Reset tracking
        this.createdRecords = { taken: [], acties: [], projecten: [], contexten: [] };
    }
}
```

### Test Categorieën Te Implementeren

1. **🔄 Herhalende Taken Tests**
   - Dagelijks/wekelijks/maandelijks patroon berekening
   - Werkdag patronen (eerste/laatste werkdag maand/jaar)
   - Complexe weekdag patronen (2de woensdag van maand)
   - Event-based herhalingen
   - End-to-end: aanmaken → afvinken → verificeer nieuwe taak

2. **💾 Database Integriteit Tests**
   - Connectie test
   - Schema integriteit check
   - CRUD operaties voor alle tabellen
   - Transactie rollback test
   - Foreign key constraint verificatie

3. **🔌 API Endpoint Tests**
   - `/api/lijst/acties` GET/POST
   - `/api/taak/{id}` PUT (task completion)
   - `/api/taak/recurring` POST
   - Error handling en response codes
   - Authentication (indien later toegevoegd)

4. **🎯 Business Logic Tests**
   - Task completion workflow
   - List management (inbox → acties → afgewerkt)
   - Project/context operations
   - Herhalings-logica end-to-end
   - Data persistence verificatie

### Dashboard Features

**UI Components**:
- ✅/❌ Status indicator per test met execution tijd
- 🔄 "Run All Tests" button  
- 📊 Test execution history/trends
- 🚨 Detailed failure alerts met stack traces
- 📱 Mobile responsive layout
- 🧹 Manual cleanup button voor noodgevallen

**Test Flow**:
1. Start test suite → maak TestRunner instance
2. Voer tests uit → track alle database changes
3. Toon real-time resultaten in dashboard
4. Einde test suite → automatische cleanup via `finally` block
5. Log resultaten voor trend analysis

**Error Handling**:
- Bij test failure → nog steeds cleanup uitvoeren
- Bij crash → cleanup in finally block
- Emergency cleanup functie beschikbaar

### Claude Autonomie voor Test Dashboard

**BELANGRIJK**: Claude mag **zelfstandig voorstellen** doen voor nieuwe tests wanneer:
- Nieuwe kritieke functionaliteit wordt toegevoegd
- Bugs worden ontdekt die preventie behoeven  
- Performance bottlenecks gedetecteerd worden
- Security gevoelige features geïmplementeerd worden

**Voorbeelden automatische test voorstellen**:
- Bij email-to-inbox functionaliteit → email parsing tests
- Bij user authentication → security tests  
- Bij payment integratie → financial transaction tests
- Bij export functionaliteit → data integrity tests

Claude moet proactief test coverage voorstellen om systeem betrouwbaarheid te waarborgen.

## AUTOMATISCHE REGRESSIE TESTING SYSTEEM - TE IMPLEMENTEREN

**Doel**: Voorkomen dat opgeloste bugs ongemerkt terugkeren door nieuwe features/aanpassingen
**Trigger**: Na elke code wijziging automatisch testen uitvoeren
**Timing**: Geen vaste delays - polling tot deployment confirmed

### Post-Commit Workflow voor Claude

**VERPLICHTE WORKFLOW bij ELKE code wijziging:**

1. **Update Version Number**
   ```javascript
   // In package.json: verhoog versienummer
   "version": "1.0.3" → "1.0.4"
   ```

2. **Git Commit & Push** 
   ```bash
   git add .
   git commit -m "✨ Feature X + version bump for deployment tracking"
   git push
   ```

3. **Wait for Deployment Confirmation**
   ```javascript
   // Poll /api/version endpoint tot nieuwe versie live is
   await waitForVersion("1.0.4");
   ```

4. **Run Automatische Regression Tests**
   ```javascript
   // Trigger volledige test suite
   const results = await fetch('/api/test/run-regression');
   ```

5. **Report Results**
   - ✅ Success: "Deployment 1.0.4 verified - all regression tests passed"
   - ❌ Failure: "🚨 REGRESSION DETECTED in deployment 1.0.4 - [failed tests]"

### API Endpoints Te Implementeren

**1. Version Check Endpoint**
```javascript
// GET /api/version
{
  "version": "1.0.4",
  "commit_hash": "d1afa67",
  "deployed_at": "2025-06-17T20:30:00Z",
  "features": ["toast-notifications", "recurring-tasks", "test-dashboard"],
  "environment": "production"
}
```

**2. Regression Test Suite Endpoint**
```javascript
// GET /api/test/run-regression
{
  "status": "completed",
  "version_tested": "1.0.4",
  "total_tests": 15,
  "passed": 15,
  "failed": 0,
  "duration_ms": 2341,
  "critical_bugs_verified": [
    "workday-patterns-june-2025",
    "recurring-task-creation", 
    "database-constraints",
    "toast-notifications",
    "task-completion-workflow"
  ],
  "cleanup_successful": true,
  "test_data_created": 23,
  "test_data_removed": 23
}
```

**3. Deployment Status Check**
```javascript
// GET /api/deployment/status/{version}
{
  "version": "1.0.4",
  "status": "deployed|pending|failed",
  "deployment_time": "2025-06-17T20:30:00Z",
  "vercel_deployment_id": "abc123"
}
```

### Regression Test Categories

**Kritieke Bug Prevention Tests** (Gebaseerd op opgeloste bugs):

1. **🔄 Herhalende Taken Regression Tests**
   - Werkdag patronen (alle 4 opgeloste variants juni 2025)
   - Database constraint issues (VARCHAR(50) voor herhaling_type)
   - Event-based recurrence edge cases
   - Monthly weekday calculation (2de woensdag etc.)

2. **💾 Database Integrity Regression Tests**
   - Schema wijzigingen niet gebroken
   - Foreign key constraints intact
   - Transaction rollback mechanisme werkt
   - Database connection pool stable

3. **🎯 Critical Workflow Regression Tests**
   - Task completion end-to-end
   - Inbox → acties → afgewerkt flow
   - Project/context operations
   - Toast notification display

4. **🔌 API Stability Regression Tests**
   - Alle endpoints responderen correct
   - Error handling niet gebroken
   - Authentication (indien toegevoegd) werkt
   - Response formats unchanged

### Claude Implementation Requirements

**MANDATORY WORKFLOW**:
```javascript
async function deploymentWorkflow() {
  // 1. Update version in package.json
  updatePackageVersion();
  
  // 2. Commit and push
  await gitCommitAndPush();
  
  // 3. Wait for deployment (max 10 min timeout)
  const deployed = await pollForDeployment(newVersion, maxWaitTime: 600000);
  
  if (!deployed) {
    throw new Error("🚨 Deployment timeout - manual verification required");
  }
  
  // 4. Run regression tests
  const regressionResults = await runRegressionTests();
  
  // 5. Report via toast/console
  if (regressionResults.failed > 0) {
    toast.error(`🚨 REGRESSION DETECTED: ${regressionResults.failed} tests failed`);
    console.error("Regression test failures:", regressionResults);
  } else {
    toast.success(`✅ Deployment ${newVersion} verified - all regression tests passed`);
  }
  
  return regressionResults;
}
```

**CRITICAL RULES for Claude**:
- ❌ **NEVER deploy without version bump**
- ❌ **NEVER skip regression testing**
- ❌ **NEVER assume deployment succeeded without verification**
- ✅ **ALWAYS wait for version confirmation before testing**
- ✅ **ALWAYS report regression test results to user**
- ✅ **ALWAYS cleanup test data even on failures**

### Error Handling & Fallbacks

**Deployment Verification Failures**:
- Timeout na 10 minuten → manual verification required
- Version endpoint niet bereikbaar → wait and retry
- Verkeerde versie live → deployment issue, stop testing

**Regression Test Failures**:
- Critical tests fail → 🚨 urgent notification
- Test data cleanup fails → emergency cleanup procedure
- API unreachable → deployment rollback consideration

**Benefits van dit Systeem**:
- Onmiddellijke feedback op regressions
- Geen verrassingen in productie
- Geautomatiseerde verificatie van alle kritieke bugs
- Betrouwbare deployment pipeline
- Historische tracking van test success rates

## Next Features to Implement
- **Test Dashboard Implementation** (Prioriteit 1)
- **Automatische Regressie Testing** (Prioriteit 2)
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
herhaling_type VARCHAR(50),        -- Type herhaling (bijv. 'monthly-weekday-first-workday-1')
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