# Tickedify Development Notes

## Taal Instructie voor Claude
**BELANGRIJK**: Spreek altijd Nederlands in dit project. Alle communicatie met de gebruiker dient in het Nederlands te gebeuren.

## 🌐 UI Language Policy
**CRITICAL**: All user-facing UI text, buttons, messages, and tooltips MUST be in **English**.

This includes:
- ✅ Toast notifications (success/error/info messages)
- ✅ Button labels and link text
- ✅ Screen titles and headings
- ✅ Error messages and validation feedback
- ✅ Info texts and help messages
- ✅ Empty states and placeholder text
- ✅ Confirmation dialogs and modals
- ✅ Form labels and instructions

**Exception**:
- Internal code comments remain in Dutch for development clarity
- This CLAUDE.md file itself remains in Dutch
- Git commit messages remain in Dutch
- Developer-facing documentation remains in Dutch

**Rationale**: Tickedify is designed for international users and English is the standard UI language for the application.

## 🚨 BÈTA FREEZE - PRODUCTIE DEPLOYMENT ABSOLUTE BLOKKADE 🚨

**KRITIEK - LEES DIT EERST**: Tickedify is IN BÈTA met ECHTE GEBRUIKERS sinds oktober 2025.

### ABSOLUTE VERBODEN - GEEN ENKELE UITZONDERING
- 🔒 **PRODUCTIE IS BEVROREN** - Main branch mag NIET worden gewijzigd
- 🔒 **GEEN git push origin main** - ONDER GEEN ENKELE OMSTANDIGHEID
- 🔒 **GEEN merge naar main** - Ook niet na staging tests
- 🔒 **GEEN productie deployments** - tickedify.com blijft ongewijzigd
- 🔒 **GEEN live database wijzigingen** - Productie data is heilig

### WAT WEL MAG TIJDENS BÈTA FREEZE
- ✅ Feature branches aanmaken en ontwikkelen
- ✅ Staging deployments (dev.tickedify.com) testen
- ✅ Pull Requests aanmaken (maar NOOIT mergen naar main)
- ✅ Code reviews en documentatie
- ✅ Changelog updates (voor toekomstige release)

### WANNEER WORDT FREEZE OPGEHEVEN?
- ALLEEN na expliciete gebruiker instructie: "BÈTA FREEZE IS OPGEHEVEN"
- Tot die tijd: ALLE productie activiteit is GEBLOKKEERD
- Bij twijfel: VRAAG ALTIJD bevestiging voordat je iets doet met main branch

### WAAROM DEZE STRIKTE FREEZE?
- Echte bèta gebruikers vertrouwen op stabiele productie
- Elke productie bug schaadt gebruiker vertrouwen en productiviteit
- Bèta fase = observatie en bug collecting, NIET nieuwe features pushen
- Main branch beschermt live gebruiker workflows

**Deze regel overschrijft ALLE andere deployment instructies in dit document.**

---

## 🚀 DEFAULT DEPLOYMENT TARGET: STAGING BRANCH

**KRITIEK - STANDAARD DEPLOYMENT WORKFLOW:**
- ✅ **ALTIJD deployen naar `staging` branch** - Dit is de default vanaf nu
- ✅ **dev.tickedify.com** is gekoppeld aan staging branch via Vercel
- ✅ **Elke push naar staging** triggert automatisch deployment op dev.tickedify.com
- ✅ **Feature branches** eerst mergen naar staging voordat je test

**DEPLOYMENT WORKFLOW:**
```bash
# Vanaf feature branch:
git checkout staging
git merge feature-branch-naam --no-edit
git push origin staging

# Vercel deployed automatisch naar dev.tickedify.com binnen 30-60 seconden
```

**VERCEL DOMAIN CONFIGURATIE:**
- **dev.tickedify.com** → `staging` branch (Pre-Production environment)
- **tickedify.com** → `main` branch (Production - BEVROREN tijdens bèta)

**WAAROM STAGING FIRST:**
- Veilig testen zonder productie impact
- Bèta freeze vereist dat ALLE nieuwe code eerst via staging gaat
- dev.tickedify.com heeft Vercel Authentication (toegang via MCP tools of browser)
- Main branch blijft stabiel voor bèta gebruikers

---

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

## 🚨 KRITIEKE DEPLOYMENT REGELS - BÈTA FREEZE ACTIEF

**⚠️ BELANGRIJK: PRODUCTIE IS MOMENTEEL BEVROREN - ZIE BÈTA FREEZE SECTIE BOVENAAN**

**ABSOLUTE VERBODEN ACTIES - GEEN UITZONDERINGEN:**
- 🔒 **BÈTA FREEZE ACTIEF** - Main branch is VOLLEDIG GEBLOKKEERD
- ❌ **NOOIT `git push origin main`** - Main branch is PRODUCTIE met BÈTA GEBRUIKERS
- ❌ **NOOIT direct commits naar main branch** - Zelfs niet via Pull Requests tijdens freeze
- ❌ **NOOIT merge naar main** - GEBLOKKEERD tijdens bèta freeze periode
- ❌ **NOOIT productie deployment** - tickedify.com blijft ongewijzigd tot freeze lift

**TOEGESTANE WORKFLOW TIJDENS BÈTA FREEZE:**
- ✅ **Feature branches aanmaken** - Ontwikkel vrijelijk op feature branches
- ✅ **ALTIJD staging deployment testen** - dev.tickedify.com is de max
- ✅ **Pull Requests aanmaken** - Voor code review, maar NIET mergen
- ✅ **Changelog updates** - Voorbereiden voor toekomstige release
- ❌ **GEEN productie deployment** - Wacht op "BÈTA FREEZE IS OPGEHEVEN" bericht

**BRANCH WORKFLOW (AANGEPAST VOOR BÈTA FREEZE):**
```
feature branch → staging test (dev.tickedify.com) → PR aanmaken → WACHT OP FREEZE LIFT
                                                                      ↓
                                              (na freeze lift) → merge naar main → productie
```

**EMERGENCY HOTFIX PROTOCOL (AANGEPAST):**
1. Meld kritieke bug: "🚨 Kritieke bug gevonden: [beschrijving]"
2. Branch: `git checkout -b hotfix/bug-naam`
3. Fix implementeren op hotfix branch
4. Test op staging: Deploy naar dev.tickedify.com
5. Documenteer hotfix in PR
6. **WACHT OP BÈTA FREEZE LIFT** - Zelfs critical fixes wachten tijdens bèta freeze
7. Na freeze lift: Merge naar main met expliciete approval

**VEILIGHEIDSCHECK BIJ ELKE GIT ACTIE:**
```bash
1. git branch  # Controleer huidige branch
2. Als main → STOP! BÈTA FREEZE ACTIEF - Switch naar feature branch
3. Als feature branch → OK, ontwikkel en test op staging
4. Bij twijfel → CHECK BÈTA FREEZE STATUS bovenaan CLAUDE.md
```

**WAAROM DIT KRITIEK IS:**
- Tickedify heeft sinds oktober 2025 **echte bèta gebruikers**
- Bèta freeze beschermt gebruiker workflows tijdens observatie periode
- Productie bugs = verlies van gebruiker vertrouwen en data
- Main branch = LIVE systeem met echte productiviteit workflows
- Deze regels beschermen de bèta gebruikers en hun vertrouwen

## Claude Development & Testing Autonomie

**SYSTEEM ARCHITECTUUR**: Tickedify is technisch gezien een **multi-user systeem** met database schema en code ondersteuning voor meerdere gebruikers.

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

**PRODUCTIE APPROVAL VEREIST (MOMENTEEL GEBLOKKEERD DOOR BÈTA FREEZE):**
- 🔒 **BÈTA FREEZE ACTIEF** - Alle productie activiteit is geblokkeerd
- ❌ **Alle wijzigingen naar main branch** - GEBLOKKEERD tot freeze lift
- ❌ **Productie deployments** - GEBLOKKEERD tot "BÈTA FREEZE IS OPGEHEVEN"
- ❌ **Live database wijzigingen** - GEBLOKKEERD tijdens bèta freeze
- ❌ **Externe service wijzigingen** (DNS, Mailgun, GitHub settings) - GEBLOKKEERD
- ❌ **Grote architecturale beslissingen** die productie beïnvloeden - Wacht op freeze lift

**CHANGELOG ONDERHOUD VERPLICHT:**
- ✅ **Bij elke code wijziging**: Automatisch changelog entry toevoegen
- ✅ **Versie tracking**: Changelog altijd up-to-date houden met nieuwste versie
- ✅ **Feature beschrijving**: Duidelijk beschrijven wat er geïmplementeerd/gefixed is
- ✅ **Gebruiker feedback**: Changelog als communicatie tool naar gebruiker

**WERK ZO ZELFSTANDIG MOGELIJK BINNEN STAGING:**
Claude moet zo zelfstandig mogelijk werken op feature branches en staging environment. Productie deployments zijn GEBLOKKEERD tijdens de bèta freeze periode. De bèta fase vereist absolute productie stabiliteit - nieuwe features worden ontwikkeld en getest op staging, maar NIET naar productie gepusht tot de freeze wordt opgeheven.

**Deze staging autonomie geldt permanent voor veilige development cycles. Productie blijft bevroren tot expliciete freeze lift.**

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
- ALWAYS commit and push changes to `staging` branch (NOT main - bèta freeze actief!)
- ALWAYS merge feature branch to staging before pushing
- ALWAYS wait for deployment confirmation via dev.tickedify.com/api/version endpoint
- ALWAYS run regression tests after deployment confirmation on dev.tickedify.com
- ALWAYS report test results to user (success/failure)
- ALWAYS update changelog with every code change
- User tests on staging environment (dev.tickedify.com via Vercel deployment)
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
- Example staging: `curl -s -L -k https://dev.tickedify.com/api/version`
- Example production: `curl -s -L -k https://tickedify.com/api/version`
- NEVER use plain `curl` without these flags
- NOTE: dev.tickedify.com vereist Vercel Authentication - gebruik Vercel MCP tools voor toegang

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

## Email Import @t Syntax Feature (Feature 048) - v0.21.6+

**Feature Status**: ✅ **LIVE IN PRODUCTIE** (volledig getest en goedgekeurd door gebruiker)

### Overview

Email-to-task import ondersteunt nu een gestructureerde **@t instruction syntax** voor direct instellen van task properties via email. Dit is een uitbreiding op de bestaande email import functionaliteit en is 100% backwards compatible.

### Syntax Format

```
@t p: Project Naam; c: Context Naam; d: 2025-11-03; p1; t: 30; df/dw/dm;

Task beschrijving hier.
Meerdere regels mogelijk.

--END--
Handtekening (wordt niet opgenomen in task notes)
```

### Supported Codes

| Code | Beschrijving | Voorbeeld | Validatie |
|------|--------------|-----------|-----------|
| `p:` | Project naam | `p: Klant X` | Elke tekst, auto-creates if not exists |
| `c:` | Context naam | `c: Werk` | Elke tekst, auto-creates if not exists |
| `d:` | Due date | `d: 2025-11-03` | ISO format YYYY-MM-DD alleen |
| `t:` | Duration (minuten) | `t: 30` | Positive integer alleen |
| `p0-p9` | Priority code | `p1` of `p2` | p0/p1→hoog, p2→gemiddeld, p3+→laag |
| `df` | Defer to Follow-up | `df;` | Maps to `opvolgen` lijst |
| `dw` | Defer to Weekly | `dw;` | Maps to `uitgesteld-wekelijks` lijst |
| `dm` | Defer to Monthly | `dm;` | Maps to `uitgesteld-maandelijks` lijst |
| `d3m` | Defer to Quarterly | `d3m;` | Maps to `uitgesteld-3maandelijks` lijst |
| `d6m` | Defer to Bi-annual | `d6m;` | Maps to `uitgesteld-6maandelijks` lijst |
| `dy` | Defer to Yearly | `dy;` | Maps to `uitgesteld-jaarlijks` lijst |

### Special Features

**1. Defer Absolute Priority**
- Wanneer een defer code (df/dw/dm/d3m/d6m/dy) wordt gedetecteerd, worden **ALLE andere codes genegeerd**
- Dit is by design: deferred taken hebben nog geen specifieke details nodig
- Voorbeeld: `@t dm; p: Project X; c: Werk;` → Alleen `lijst: uitgesteld-maandelijks`, project en context worden genegeerd

**2. --end-- Marker**
- Truncates email body at `--end--` marker (case-insensitive: --END--, --End--, --end--)
- Werkt **met én zonder @t syntax** (altijd toegepast)
- Ideaal voor het verwijderen van email handtekeningen

**3. Error Tolerance**
- Ongeldige codes worden **silently ignored**
- Task wordt toch aangemaakt met de codes die wél geldig zijn
- Geen error emails naar gebruiker
- Voorbeeld: `d: 03/11/2025` wordt genegeerd (invalid format), maar `c: Werk` werkt wel

**4. Duplicate Handling**
- Bij dubbele codes: **eerste telt**, rest wordt genegeerd
- Voorbeeld: `p: Project A; p: Project B;` → Project A wordt gebruikt

**5. Backwards Compatibility**
- Emails **zonder @t** werken exact hetzelfde als voorheen
- Bestaande syntax blijft 100% supported:
  - Subject: `[Project] Task @context #tag`
  - Body: `Project: X\nContext: Y\nDuur: 30`

### Technical Implementation

**Location**: `server.js` - `parseEmailToTask()` function (~line 1392)

**Parser Helper Functions**:
- `truncateAtEndMarker(body)` - Truncates at --end-- marker (line ~1313)
- `parseDeferCode(segment)` - Parses defer codes df/dw/dm/etc (line ~1326)
- `parsePriorityCode(segment)` - Normalizes p0-p9 to hoog/gemiddeld/laag (line ~1345)
- `parseKeyValue(segment)` - Parses p:, c:, d:, t: codes with validation (line ~1361)

**Database Mapping**:
- Project → `projecten` table (auto-creates via `findOrCreateProject()`)
- Context → `contexten` table (auto-creates via `findOrCreateContext()`)
- Due date → `taken.verschijndatum` column
- Duration → `taken.duur` column (integer minutes)
- Priority → `taken.prioriteit` column (lowercase Dutch: hoog/gemiddeld/laag)
- Defer lijst → `taken.lijst` column (Dutch prefixed names)

**Validation Rules**:
- Date: Must match `/^\d{4}-\d{2}-\d{2}$/` (ISO format only)
- Duration: Must match `/^\d+$/` (positive integer only)
- Priority: Must match `/^p(\d+)$/i` (p followed by digits)
- Defer: Must match `/^(df|dw|dm|d3m|d6m|dy)$/i` (exact match, case-insensitive)

### Bug Fix History

**v0.21.9** - Windows Line Endings Fix
- **Problem**: Mailgun sends emails with `\r\n` line endings, causing @t regex to fail
- **Fix**: Added `trim()` to firstLine before regex test to remove `\r` characters
- **Impact**: Critical - @t detection completely broken without this fix

**v0.21.10** - Defer List Names Fix
- **Problem**: Parser used English names (`weekly`, `monthly`) but UI expects Dutch (`uitgesteld-wekelijks`, `uitgesteld-maandelijks`)
- **Fix**: Updated `parseDeferCode()` mapping to use correct Dutch lijst names
- **Impact**: High - Deferred tasks invisible in UI

**v0.21.11** - Priority Database Constraint Fix
- **Problem**: Parser returned English capitalized values (`High`, `Medium`, `Low`) but database CHECK constraint expects lowercase Dutch (`hoog`, `gemiddeld`, `laag`)
- **Fix**: Updated `parsePriorityCode()` to return lowercase Dutch values
- **Impact**: Critical - Database constraint violation prevented task creation

**v0.21.12** - Debug Logging Cleanup
- Removed all debug `console.log()` statements after successful testing
- Kept error logging for future troubleshooting

### User Documentation

**Helpfile Location**: `/email-import-help` route (served from `public/email-import-help.md`)
- 310 lines comprehensive guide
- Syntax reference, 10+ voorbeelden, FAQ, troubleshooting
- Accessible via web browser (no authentication required)

### Testing Status

✅ **All 10 test scenarios completed and approved by user** (Production testing v0.21.6 - v0.21.12)
- Basic @t parsing with all codes
- Backwards compatibility without @t
- Defer absolute priority logic
- Priority normalisatie (p0-p9)
- Entity auto-creation (projects/contexts)
- --end-- marker truncation
- Error tolerance with invalid codes
- Duplicate code handling
- All defer codes mapping (df/dw/dm/d3m/d6m/dy)

**User Feedback**: "Alles getest en alles goedgekeurd" ✅

### Development Notes

- Feature spec: `/specs/048-email-import-syntax/`
- Tasks document: `tasks.md` (31 tasks, all completed)
- API contract: `contracts/email-import-api.yml`
- Data model: `data-model.md` (runtime only, no DB changes)
- Quickstart guide: `quickstart.md` (10 test scenarios)

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
