# Tickedify Development Notes

## Taal Instructie voor Claude
**BELANGRIJK**: Spreek altijd Nederlands in dit project. Alle communicatie met de gebruiker dient in het Nederlands te gebeuren.

## BELANGRIJKE URL VOOR TESTING: tickedify.com/app ⚠️

**KRITIEK**: Voor alle testing en development moet je naar **tickedify.com/app** navigeren, NIET naar:
- ❌ tickedify.com (landing page)
- ❌ tickedify.com/admin.html (admin dashboard)
- ✅ **tickedify.com/app** (hoofdapplicatie)

## LOGIN CREDENTIALS VOOR TESTING 🔑

**Email:** jan@buskens.be
**Wachtwoord:** qyqhut-muDvop-fadki9

**BELANGRIJK**: Gebruik ALTIJD deze credentials voor testing, NIET jan@tickedify.com

## 🤖 VERPLICHTE SUB AGENT GEBRUIK - 3 GESPECIALISEERDE AGENTS

**KRITIEK BELANGRIJK**: Gebruik ALTIJD de juiste gespecialiseerde Tickedify sub agent om token verbruik drastisch te verlagen.

### 🧪 **tickedify-testing** - Voor Testing & QA
**Gebruik voor:**
- ✅ **Alle testing workflows** - Drag & drop testing, filter testing, UI testing
- ✅ **End-to-end testing** - Complete feature workflows testen
- ✅ **Browser automation** - Complexe Playwright operaties
- ✅ **Regressie testing** - Bestaande functionaliteit verifiëren
- ✅ **Performance testing** - Load testing en response monitoring

**Voorbeeld:**
```javascript
Task(subagent_type: "tickedify-testing",
     description: "Filter testing",
     prompt: "Test de filter functionaliteit in dagelijkse planning - pas filter toe op project 'Verbouwing', sleep taak naar kalender, controleer of filter actief blijft")
```

### 🐛 **tickedify-bug-hunter** - Voor Bug Fixes & Debugging
**Gebruik voor:**
- ✅ **Bug debugging** - Systematisch troubleshooting van issues
- ✅ **Console errors** - JavaScript errors en API failures analyseren
- ✅ **UI problemen** - Modals, drag & drop, responsive issues
- ✅ **Database issues** - Query failures, constraint violations
- ✅ **Cross-browser bugs** - Compatibility problemen oplossen

**Voorbeeld:**
```javascript
Task(subagent_type: "tickedify-bug-hunter",
     description: "Modal z-index bug",
     prompt: "Debug waarom de planning popup achter de loading indicator verdwijnt - bekijk z-index conflicts en CSS styling")
```

### ✨ **tickedify-feature-builder** - Voor Nieuwe Features
**Gebruik voor:**
- ✅ **Nieuwe functionaliteit** - Features implementeren volgens Tickedify patterns
- ✅ **Database uitbreiding** - Schema wijzigingen en migraties
- ✅ **API development** - Nieuwe endpoints volgens REST conventions
- ✅ **UI componenten** - Modals, popups, drag & drop interfaces
- ✅ **Feature integratie** - Naadloos integreren in bestaande workflow

**Voorbeeld:**
```javascript
Task(subagent_type: "tickedify-feature-builder",
     description: "Time tracking feature",
     prompt: "Implementeer een timer functionaliteit voor taken - database schema, API endpoints, UI components en integratie met dagelijkse planning")
```

**VOORDELEN VAN SUB AGENTS:**
- 🎯 **Token efficiency**: Hoofdgesprek blijft compact en overzichtelijk
- 🧠 **Gespecialiseerde expertise**: Elke agent kent specifieke patterns
- 🚀 **Parallel processing**: Agents kunnen parallel werken
- 📋 **Gestructureerde output**: Agents leveren gerichte resultaten
- 🔄 **Herbruikbaarheid**: Workflows en patterns worden herbruikt

## 🚨 KRITIEKE DEPLOYMENT REGELS - BÈTA BESCHERMING

**ABSOLUTE VERBODEN ACTIES - GEEN UITZONDERINGEN:**
- ❌ **NOOIT `git push origin main`** - Main branch is PRODUCTIE met BÈTA GEBRUIKERS
- ❌ **NOOIT direct commits naar main branch** - Altijd via Pull Requests
- ❌ **NOOIT merge naar main** zonder expliciete gebruiker approval "JA, DEPLOY NAAR PRODUCTIE"
- ❌ **NOOIT productie deployment** zonder staging test eerst

**VERPLICHTE WORKFLOW - ELKE ONTWIKKELING:**
- ✅ **ALTIJD `git branch` controleren** voordat je commits
- ✅ **ALTIJD werken op develop branch** voor alle features en bugfixes
- ✅ **ALTIJD staging deployment testen** voordat je productie voorstelt
- ✅ **ALTIJD expliciete toestemming vragen** voor productie deployment

**BRANCH WORKFLOW:**
```
develop branch → staging test (dev.tickedify.com) → PR naar main → productie (tickedify.com)
```

**EMERGENCY HOTFIX PROTOCOL:**
1. Meld kritieke bug: "🚨 Kritieke bug gevonden: [beschrijving]"
2. Branch: `git checkout -b hotfix/bug-naam`
3. Fix implementeren op hotfix branch
4. Test op staging: Deploy naar dev.tickedify.com
5. Vraag expliciet: "Hotfix getest op staging - klaar voor PRODUCTIE?"
6. WACHT op expliciete bevestiging "JA, DEPLOY NAAR PRODUCTIE"
7. Dan pas Pull Request naar main

**VEILIGHEIDSCHECK BIJ ELKE GIT ACTIE:**
```bash
1. git branch  # Controleer huidige branch
2. Als main → STOP! Switch naar develop
3. Als develop → OK, ga door
4. Bij twijfel → vraag user bevestiging
```

**WAAROM DIT KRITIEK IS:**
- Tickedify heeft vanaf september 2025 **echte bèta gebruikers**
- Productie bugs = verlies van gebruiker vertrouwen
- Main branch = LIVE systeem met echte productiviteit workflows
- Deze regels beschermen de bèta launch en gebruiker experience

## Claude Development & Testing Autonomie

**KRITIEK BELANGRIJK**: Jan is momenteel de ENIGE gebruiker van Tickedify. Het systeem is NIET live voor publiek gebruik.

**SYSTEEM ARCHITECTUUR**: Tickedify is technisch gezien een **multi-user systeem** met database schema en code ondersteuning voor meerdere gebruikers, maar wordt momenteel alleen door Jan gebruikt voor development en testing doeleinden.

**AUTONOMIE TOEGESTAAN BINNEN STAGING ENVIRONMENT:**
- ✅ **Code aanpassingen**: Vrijelijk alle bestanden bewerken op develop branch
- ✅ **Staging testing**: Volledige autonomie op dev.tickedify.com staging environment
- ✅ **API testing**: Alle endpoints testen op staging zonder beperking
- ✅ **Data experimenten**: Taken aanmaken/bewerken/verplaatsen op staging database
- ✅ **Feature implementaties**: Complete development workflow tot staging test
- ✅ **Git commits**: Vrij committen en pushen naar develop/staging branches
- ✅ **Changelog updates**: Automatisch changelog bijwerken bij elke wijziging

**STAGING AUTONOMIE - GEEN TOESTEMMING NODIG:**
- PUT/POST/DELETE requests op dev.tickedify.com staging
- Staging database schema wijzigingen en data manipulatie
- Feature testing en verificatie op staging environment
- Version bumps en git commits naar develop/staging branches
- Staging deployment en testing cycles
- Changelog updates voor development features

**PRODUCTIE APPROVAL VEREIST:**
- ❌ **Alle wijzigingen naar main branch** - Altijd PR met approval
- ❌ **Productie deployments** - Expliciete "JA, DEPLOY NAAR PRODUCTIE" vereist
- ❌ **Live database wijzigingen** - Eerst staging test, dan approval
- ❌ **Externe service wijzigingen** (DNS, Mailgun, GitHub settings)
- ❌ **Grote architecturale beslissingen** die productie beïnvloeden

**CHANGELOG ONDERHOUD VERPLICHT:**
- ✅ **Bij elke code wijziging**: Automatisch changelog entry toevoegen
- ✅ **Versie tracking**: Changelog altijd up-to-date houden met nieuwste versie
- ✅ **Feature beschrijving**: Duidelijk beschrijven wat er geïmplementeerd/gefixed is
- ✅ **Gebruiker feedback**: Changelog als communicatie tool naar gebruiker

**WERK ZO ZELFSTANDIG MOGELIJK BINNEN STAGING:**
Claude moet zo zelfstandig mogelijk werken op develop branch en staging environment. Voor productie deployments altijd expliciete approval vragen. De bèta launch vereist absolute zekerheid over productie stabiliteit.

**Deze staging autonomie geldt permanent voor veilige development cycles.**

## ARCHITECTUUR DOCUMENTATIE VERPLICHT GEBRUIK 📋

**KRITIEK BELANGRIJK**: Er is nu een ARCHITECTURE.md bestand dat de volledige codebase structuur documenteert.

**VERPLICHTE WORKFLOW:**
- ✅ **ALTIJD eerst ARCHITECTURE.md lezen** voordat je aan code begint te werken
- ✅ **Gebruik de documentatie** om snel functies, locaties en structuur te vinden
- ✅ **Update ARCHITECTURE.md** bij ELKE wijziging aan de codebase structuur
- ✅ **Voeg nieuwe functies toe** met exacte regelnummers en beschrijvingen
- ✅ **Houd secties actueel** wanneer code wordt verplaatst of gerefactored

**WAT STAAT IN ARCHITECTURE.md:**
- Database schema met alle tabellen en kolommen
- File structuur met regelnummer referenties voor alle belangrijke functies
- API endpoints overzicht met locaties in server.js
- Feature locaties (herhalende taken, prioriteiten, bulk acties, etc.)
- UI componenten en hun implementatie details
- Development workflow instructies

**HOE TE GEBRUIKEN:**
1. Bij nieuwe taak → eerst ARCHITECTURE.md raadplegen voor bestaande patterns
2. Zoek functie locatie → gebruik regelnummer referenties
3. Na implementatie → update ARCHITECTURE.md met nieuwe informatie
4. Bij refactoring → update alle betrokken secties

**WAAROM DIT BELANGRIJK IS:**
- Bespaart 20-30% tijd bij het navigeren door 10,000+ regels code
- Voorkomt dubbele implementaties of gemiste dependencies
- Houdt codebase onderhoudbaar ondanks grootte
- Maakt onboarding van nieuwe features sneller

## Productivity Method

**Important:** Tickedify is NOT a GTD (Getting Things Done) app. It implements the **"Baas Over Je Tijd"** (Master of Your Time) productivity method - a unique system developed specifically for effective time and task management.

## IMPORTANT DEVELOPMENT NOTES FOR CLAUDE

**MANDATORY DEPLOYMENT WORKFLOW:**
- ALWAYS update version number in package.json before any commit
- ALWAYS commit and push changes to git after implementing features
- ALWAYS wait for deployment confirmation via /api/version endpoint
- ALWAYS run regression tests after deployment confirmation
- ALWAYS report test results to user (success/failure)
- ALWAYS update changelog with every code change
- User tests live on production (tickedify.com via Vercel deployment)
- Use descriptive commit messages following existing project style
- Work autonomously - don't ask for permission to wait for deployments

**CHANGELOG MAINTENANCE:**
- Update public/changelog.html with every feature/fix
- Include version number, date, and clear descriptions
- Use appropriate emoji categories (⚡ features, 🔧 fixes, 🎯 improvements)
- Set newest version as "badge-latest", others as "badge-feature"/"badge-fix"
- Changelog serves as primary communication of progress to user

**DEPLOYMENT VERIFICATION TIMING:**
- Start checking after 15 seconds (Vercel is usually deployed by then)
- If version not updated: wait another 15 seconds and check again
- Repeat every 15 seconds until version matches or 2 minutes total elapsed
- After 2 minutes: report deployment timeout - likely an issue
- Never use long sleep commands (like 120 seconds) - too inefficient

**CURL COMMAND REQUIREMENTS:**
- ALWAYS use `curl -s -L -k` flags for ALL API testing
- `-s` = silent mode (no progress bars)
- `-L` = follow redirects automatically
- `-k` = skip certificate verification
- This prevents macOS security prompts that interrupt deployment workflow
- Example: `curl -s -L -k https://tickedify.com/api/version`
- NEVER use plain `curl` without these flags

**COMMAND SUBSTITUTION PREVENTION:**
- AVOID `$(date +%Y-%m-%d)` directly in curl URLs - triggers security prompts
- USE pre-computed variables instead:
  ```bash
  TODAY=$(date +%Y-%m-%d)
  curl -s -L -k "https://tickedify.com/api/dagelijkse-planning/$TODAY"
  ```
- OR use separate variable assignment:
  ```bash
  DATUM="2025-06-18"  # Hard-coded for testing
  curl -s -L -k "https://tickedify.com/api/dagelijkse-planning/$DATUM"
  ```
- This prevents Terminal security prompts for command substitution

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

## Technical Stack

- Frontend: Vanilla JavaScript
- Backend: Express.js + Node.js
- Database: PostgreSQL (Neon)
- Hosting: Vercel
- Domain: tickedify.com (DNS via Vimexx)

## Important Decisions Made

- Use separate subdomain for email-to-task (mg.tickedify.com)
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

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
