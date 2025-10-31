# Tickedify Constitution

<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.0.1
Modified Principles: None
Added Sections: None
Removed Sections: None
Templates Requiring Updates:
  ✅ plan-template.md - Updated version reference from v2.1.1 to v1.0.1
  ✅ spec-template.md - No changes required
  ✅ tasks-template.md - No changes required
Follow-up TODOs: None

Rationale for PATCH bump: Corrected incorrect version reference in plan-template.md
footer (was v2.1.1, corrected to v1.0.1). This is a non-semantic fix that doesn't
affect governance rules or principles.
-->

## Core Principles

### I. Beta Freeze - Production Stability (NON-NEGOTIABLE)
Tickedify heeft ECHTE bèta gebruikers sinds oktober 2025. De main branch is **BEVROREN** totdat expliciete "BÈTA FREEZE IS OPGEHEVEN" instructie wordt gegeven.

**Absolute Verboden:**
- GEEN `git push origin main` onder enige omstandigheid
- GEEN merge naar main, ook niet na succesvolle staging tests
- GEEN productie deployments naar tickedify.com
- GEEN live database wijzigingen op productie data

**Rationale**: Bèta gebruikers vertrouwen op stabiele productie. Elke productie bug schaadt gebruiker vertrouwen en productiviteit. Bèta fase = observatie en bug collecting, NIET nieuwe features pushen.

### II. Staging-First Deployment
Alle nieuwe code MOET eerst via staging branch (dev.tickedify.com) worden getest voordat enige productie deployment wordt overwogen.

**Verplicht Workflow:**
- Feature branches mergen naar `staging` branch
- Push naar staging triggert automatisch Vercel deployment op dev.tickedify.com
- Testing gebeurt op dev.tickedify.com (Vercel Authentication vereist)
- Main branch blijft stabiel voor bèta gebruikers

**Rationale**: Veilig testen zonder productie impact. Alle nieuwe code doorloopt staging verificatie voordat productie overwogen wordt.

### III. Gespecialiseerde Sub-Agents
Token efficiency en gespecialiseerde expertise vereisen gebruik van juiste Tickedify sub-agents voor specifieke taken.

**Verplichte Agent Types:**
- **tickedify-testing**: Alle testing workflows, browser automation, regressie testing
- **tickedify-bug-hunter**: Bug debugging, console errors, UI problemen, database issues
- **tickedify-feature-builder**: Nieuwe features, database uitbreidingen, API development

**Rationale**: Token efficiency (hoofdgesprek blijft compact), gespecialiseerde expertise per domein, parallel processing mogelijk, gestructureerde output, herbruikbare workflows.

### IV. Versioning & Changelog Discipline
Elke code wijziging MOET package.json version increment en changelog update bevatten in dezelfde commit.

**Verplicht:**
- Version bump: patch level voor features/fixes (bijv. 1.0.2 → 1.0.3)
- Changelog update met emoji categories (⚡ features, 🔧 fixes, 🎯 improvements)
- Nieuwste versie als "badge-latest", anderen als "badge-feature"/"badge-fix"
- Changelog dient als primaire communicatie naar gebruiker

**Rationale**: Version tracking voorkomt deployment confusion. Changelog communiceert progress transparant naar gebruikers.

### V. Deployment Verification Workflow
Deployment verificatie MOET geautomatiseerd en iteratief gebeuren met duidelijke timing.

**Verplicht Protocol:**
- Start verificatie na 15 seconden (Vercel meestal deployed)
- Check `/api/version` endpoint voor version match
- Herhaal elke 15 seconden tot match of 2 minuten timeout
- NOOIT lange sleep commands (zoals 120 seconden) gebruiken
- Gebruik `curl -s -L -k` flags voor ALLE API testing (voorkomt macOS security prompts)

**Rationale**: Efficiënte verification zonder onnodige wachttijd. Security prompt preventie zorgt voor smooth automated workflow.

### VI. Test-First via API (NON-NEGOTIABLE)
Testing MOET primair via directe API calls gebeuren, niet via UI automation tenzij UI-specifieke functionaliteit.

**Verplicht:**
- Direct API endpoint testing voor business logic validatie
- POST/PUT/GET calls naar backend endpoints voor data verificatie
- Database state via API endpoints of custom debug endpoints checken
- UI testing alleen voor UI-specifieke features (drag & drop, modals, responsive)

**Rationale**: API testing is sneller, betrouwbaarder en beter voor edge cases. Complete workflow testing zonder UI dependencies. Thorough test coverage met minder overhead.

## Development Workflow

### Git Configuration
Git user identity MOET pre-configured zijn om commit prompts te voorkomen:
- Username: "Jan Buskens"
- Email: "jan@tickedify.com"

### Command Substitution Prevention
VERMIJD `$(date)` en andere command substitution in curl URLs - triggers security prompts.
- Gebruik pre-computed variables: `TODAY=$(date +%Y-%m-%d); curl "url/$TODAY"`
- Of gebruik hard-coded dates voor testing

### Testing Credentials
Gebruik ALTIJD test credentials voor dev.tickedify.com:
- Email: jan@buskens.be
- Password: qyqhut-muDvop-fadki9
- Test URL: dev.tickedify.com/app (NIET root of admin.html)

## Technical Stack Constraints

### Frontend
- Vanilla JavaScript (geen frameworks)
- Responsive design (desktop, tablet, mobiel)
- Progressive enhancement principes

### Backend
- Node.js + Express.js
- RESTful API design
- PostgreSQL via Neon (cloud database)

### Deployment
- Vercel voor hosting
- Automatische deployment op branch push
- Environment-based configuration (staging vs production)

### Storage
- Backblaze B2 voor file attachments
- PostgreSQL voor structured data
- No local file storage dependencies

## Security & Privacy

### Authentication
- User session management
- Secure password hashing
- Auto-login tokens (10-minute expiry, single-use)

### Payment Integration
- Plug&Pay webhook validation met API key
- Idempotency via order_id tracking
- HTTPS-only checkout URLs
- Comprehensive webhook audit logging

### Data Protection
- Productie database is heilig (bèta freeze)
- Staging database voor alle development testing
- No production data in development environments

## Governance

### Constitution Authority
Deze constitution supersedes alle andere documentatie en practices. Bij conflicten heeft deze constitution voorrang.

### Amendment Procedure
Amendments vereisen:
1. Documentatie van rationale en impact
2. Approval van project owner
3. Version bump volgens semantic versioning
4. Migration plan voor bestaande workflows
5. Update van alle dependent templates

### Complexity Justification
Alle complexiteit MOET gerechtvaardigd worden:
- Simplicity first (YAGNI principes)
- Complexity alleen voor bewezen requirements
- Documentation van complexity rationale
- Regular review van unnecessary complexity

### Compliance Verification
Alle PRs en reviews MOETEN constitution compliance verifiëren:
- Bèta freeze violations = automatic rejection
- Staging-first workflow = mandatory
- Version bump + changelog = blockers indien missing
- Sub-agent usage voor appropriate tasks

### Runtime Development Guidance
Voor runtime development guidance, zie `CLAUDE.md` voor Claude Code specifieke instructies en workflows.

**Version**: 1.0.1 | **Ratified**: 2025-10-31 | **Last Amended**: 2025-10-31
