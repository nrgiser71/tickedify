# Tickedify Development Notes

## Taal Instructie voor Claude
**BELANGRIJK**: Spreek altijd Nederlands in dit project. Alle communicatie met de gebruiker dient in het Nederlands te gebeuren.

## IMPORTANT
1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them.
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made.
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.
8. Do not be lazy. Never be lazy. If there is a bug find the root cause and fix it. No temporary fixes. You are a senior developer. Never be lazy.
9. Make all fixes and code changes as simple as humanly possible. They should only impact necessary code relevant to the task and nothing else. It should impact as little code as possible. Your goal is to not introduce any bugs. It’s all about simplicity.

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

## 🚀 PRODUCTIE DEPLOYMENT WORKFLOW

**BELANGRIJK**: Tickedify heeft LIVE GEBRUIKERS sinds oktober 2025.

### PRODUCTIE DEPLOYMENT REGELS
- ✅ **Feature development** - Ontwikkel op feature branches
- ✅ **Staging testing eerst** - Test ALTIJD op dev.tickedify.com voordat productie deployment
- ✅ **Merge naar main** - Na succesvolle staging tests en gebruiker approval
- ✅ **Vercel auto-deployment** - Push naar main triggert automatisch tickedify.com deployment
- ⚠️ **Voorzichtigheid vereist** - Productie bugs schaden gebruiker vertrouwen

### DEPLOYMENT WORKFLOW
```
feature branch → staging test (dev.tickedify.com) → gebruiker approval → merge naar main → productie
```

### WAAROM VOORZICHTIG BLIJVEN?
- Echte gebruikers vertrouwen op stabiele productie
- Elke productie bug schaadt gebruiker vertrouwen en productiviteit
- Staging testing voorkomt productie issues
- Main branch beschermt live gebruiker workflows

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
- **tickedify.com** → `main` branch (Production - Live gebruikers)

**WAAROM STAGING FIRST:**
- Veilig testen zonder productie impact
- Alle nieuwe code moet eerst via staging voor validatie
- dev.tickedify.com heeft Vercel Authentication (toegang via MCP tools of browser)
- Main branch blijft stabiel voor live gebruikers

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

## 🚨 KRITIEKE DEPLOYMENT REGELS - PRODUCTIE ACTIEF

**⚠️ BELANGRIJK: PRODUCTIE HEEFT LIVE GEBRUIKERS - WEES VOORZICHTIG**

**PRODUCTIE DEPLOYMENT PROTOCOL:**
- ✅ **Feature development** - Ontwikkel op feature branches
- ✅ **Staging testing verplicht** - Test ALTIJD eerst op dev.tickedify.com
- ✅ **Gebruiker approval vereist** - Vraag goedkeuring voordat je naar productie pushed
- ✅ **Merge naar main toegestaan** - Na succesvolle staging tests en approval
- ⚠️ **Productie deployment** - Push naar main triggert automatisch tickedify.com deployment

**AANBEVOLEN WORKFLOW:**
- ✅ **Feature branches aanmaken** - Ontwikkel vrijelijk op feature branches
- ✅ **ALTIJD staging deployment testen** - dev.tickedify.com eerst
- ✅ **Pull Requests aanmaken** - Voor code review en documentatie
- ✅ **Changelog updates** - Bij elke productie deployment
- ✅ **Gebruiker approval** - Bevestig dat feature production-ready is

**BRANCH WORKFLOW:**
```
feature branch → staging test (dev.tickedify.com) → gebruiker approval → merge naar main → productie
```

**EMERGENCY HOTFIX PROTOCOL:**
1. Meld kritieke bug: "🚨 Kritieke bug gevonden: [beschrijving]"
2. Branch: `git checkout -b hotfix/bug-naam`
3. Fix implementeren op hotfix branch
4. Test op staging: Deploy naar dev.tickedify.com
5. Documenteer hotfix in PR
6. **Na staging verification**: Merge naar main met gebruiker approval
7. Monitor productie na deployment

**VEILIGHEIDSCHECK BIJ ELKE GIT ACTIE:**
```bash
1. git branch  # Controleer huidige branch
2. Als main → Wees extra voorzichtig - Dit is productie!
3. Als feature branch → OK, ontwikkel en test op staging
4. Voor productie push → Vraag gebruiker approval
```

**WAAROM DIT KRITIEK IS:**
- Tickedify heeft sinds oktober 2025 **live gebruikers**
- Productie bugs schaden gebruiker vertrouwen en productiviteit
- Staging testing voorkomt de meeste productie issues
- Main branch = LIVE systeem met echte productiviteit workflows
- Deze regels beschermen de gebruikers en hun vertrouwen

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

**PRODUCTIE APPROVAL VEREIST:**
- ⚠️ **Wijzigingen naar main branch** - Vraag gebruiker approval na staging tests
- ⚠️ **Productie deployments** - Bevestig met gebruiker voordat je pushed naar main
- ⚠️ **Live database wijzigingen** - Zorgvuldige planning en backup vereist
- ⚠️ **Externe service wijzigingen** (DNS, Mailgun, GitHub settings) - Gebruiker approval verplicht
- ⚠️ **Grote architecturale beslissingen** - Bespreek eerst met gebruiker

**CHANGELOG ONDERHOUD VERPLICHT:**
- ✅ **Bij elke code wijziging**: Automatisch changelog entry toevoegen
- ✅ **Versie tracking**: Changelog altijd up-to-date houden met nieuwste versie
- ✅ **Feature beschrijving**: Duidelijk beschrijven wat er geïmplementeerd/gefixed is
- ✅ **Gebruiker feedback**: Changelog als communicatie tool naar gebruiker

**CHANGELOG FORMAT REGELS (vanaf v0.21.78):**
- 🌐 **ALLEEN ENGELS**: Alle changelog entries MOETEN in het Engels zijn
- 📅 **PER DAG GROEPEREN**: Groepeer alle wijzigingen van één dag in één versie entry
- 📋 **CATEGORISEREN**: Verdeel entries in ✨ Features, 🔧 Fixes, 🎯 Improvements
- 🔢 **HOOGSTE VERSIE**: Gebruik het hoogste versie nummer van die dag
- 🚫 **GEEN COMMITS**: Niet per commit een entry, maar per dag samenvatten
- 🔒 **GEEN SECURITY DETAILS**: Vermijd API endpoints, database schema, file paths, SQL queries

**WERK ZO ZELFSTANDIG MOGELIJK BINNEN STAGING:**
Claude moet zo zelfstandig mogelijk werken op feature branches en staging environment. Productie deployments vereisen gebruiker approval na succesvolle staging tests. Nieuwe features worden ontwikkeld en getest op staging, en na goedkeuring naar productie gepusht.

**Deze staging autonomie geldt permanent voor veilige development cycles. Productie deployments gebeuren alleen na expliciete gebruiker goedkeuring.**

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

