# Implementation Plan: YouTube Onboarding Video Popup

**Branch**: `014-de-eerste-keer` | **Date**: 2025-10-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-de-eerste-keer/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✅ Spec loaded successfully from 014-de-eerste-keer/spec.md
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✅ Project Type: Web Application (frontend + backend detected)
   ✅ Structure Decision: Tickedify existing structure (public/ + server.js)
3. Fill Constitution Check section
   ⚠️ No formal constitution found - using Tickedify CLAUDE.md principles
4. Evaluate Constitution Check section
   ✅ No violations - leveraging existing patterns
5. Execute Phase 0 → research.md
   ✅ Complete - research.md generated with 4 research topics
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   ✅ Complete - All design artifacts generated
7. Re-evaluate Constitution Check
   ✅ PASS - No violations, leverages existing patterns
8. Plan Phase 2 → Describe task generation approach
   ✅ Complete - Task strategy documented
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Implementeer een YouTube onboarding video popup die automatisch verschijnt bij de eerste login van een gebruiker. De video is bedoeld om nieuwe gebruikers te helpen de app snel te begrijpen. De popup is sluitbaar en verschijnt slechts 1x per account (database tracking). Een permanente link in de sidebar maakt het mogelijk de video later te herbekijken. Admins kunnen de YouTube URL configureren via admin.html zonder code wijzigingen.

**Technical Approach**:
- YouTube iframe embed API voor video player met standaard controls en fullscreen ondersteuning
- Database veld `onboarding_video_seen` in users tabel voor tracking
- System settings tabel voor admin configureerbare video URL
- Modal popup systeem consistent met bestaande Tickedify popup patterns
- Sidebar link onderaan volgens bestaande navigatie structuur

## Technical Context
**Language/Version**: JavaScript ES6+ (browser), Node.js 16+ (backend)
**Primary Dependencies**:
- Frontend: Vanilla JavaScript (bestaande app.js patterns)
- Backend: Express.js 4.18.2, PostgreSQL via `pg` 8.11.3
- YouTube iFrame Player API (CDN)

**Storage**: PostgreSQL (Neon) - uitbreiden met:
- `users.onboarding_video_seen` BOOLEAN + TIMESTAMP
- `system_settings` tabel voor admin configuraties

**Testing**:
- Frontend: Handmatige testing op tickedify.com/app
- Backend: API endpoint testing met curl
- Integration: Playwright browser automation tests

**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)

**Project Type**: Web application - Tickedify bestaande structuur
- Frontend: `public/` (app.js, style.css, index.html)
- Backend: `server.js`, `database.js`
- Admin: `public/admin.html`, `public/admin.js`

**Performance Goals**:
- Popup load time <500ms
- YouTube iframe embed <1s initial load
- Database query <50ms voor user settings check

**Constraints**:
- Moet werken met bestaande Tickedify authentication systeem
- Consistent met bestaande modal/popup UI patterns
- YouTube iframe moet GDPR-compliant embeds gebruiken (youtube-nocookie.com)
- Mobile responsive (sidebar link moet werken op alle schermgroottes)

**Scale/Scope**:
- Bèta gebruikers: ~10-50 gebruikers (vanaf september 2025)
- 1 admin configureerbare video URL (systeembreed)
- Sidebar link zichtbaar voor alle gebruikers

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Tickedify Development Principles** (from CLAUDE.md):

✅ **Staging Autonomie**:
- Ontwikkeling op develop branch (✓)
- Staging testing op dev.tickedify.com (✓)
- Production deployment alleen met expliciete approval (✓)

✅ **Version Tracking**:
- Version bump in package.json bij implementatie (✓)
- Changelog update met feature beschrijving (✓)

✅ **Code Patterns**:
- Gebruik bestaande Tickedify patterns (modal popups, API endpoints) (✓)
- Volg ARCHITECTURE.md structuur voor navigatie (✓)
- Update ARCHITECTURE.md bij nieuwe functionaliteit (✓)

✅ **Testing Approach**:
- Deployment verificatie via /api/version endpoint (✓)
- Playwright testing via tickedify-testing agent (✓)
- API testing met curl -s -L -k flags (✓)

**No violations detected** - Feature integreert naadloos in bestaande architectuur.

## Project Structure

### Documentation (this feature)
```
specs/014-de-eerste-keer/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── api-onboarding.yaml
│   └── api-admin-settings.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (Tickedify existing structure)
```
public/
├── app.js               # Add OnboardingVideoManager class
├── style.css            # Add .onboarding-video-popup styles
├── index.html           # Add popup HTML + sidebar link
├── admin.html           # Add video URL configuration section
└── admin.js             # Add settings management functions

server.js                # Add API endpoints:
                         # - GET /api/settings/onboarding-video
                         # - PUT /api/settings/onboarding-video (admin)
                         # - PUT /api/user/onboarding-video-seen

database.js              # Add:
                         # - ALTER users table migration
                         # - CREATE system_settings table
                         # - Settings CRUD functions
```

**Structure Decision**: Tickedify Web Application (bestaande structuur)
- Geen nieuwe directories nodig
- Alle code past in bestaande file structuur
- Volgt established Tickedify patterns

## Phase 0: Outline & Research

**Research Topics** (to be executed):

1. **YouTube iframe Player API best practices**
   - GDPR-compliant embeds (youtube-nocookie.com)
   - iframe parameters voor autoplay=0, controls=1, fs=1 (fullscreen)
   - Security: sandbox attributes en CSP considerations
   - Error handling voor unavailable/deleted videos

2. **Modal popup patterns in Tickedify**
   - Analyze existing modals (planning popup, feedback modal, herhalings popup)
   - CSS structure: .popup-overlay, .popup-content patterns
   - JavaScript: show/hide mechanics, ESC key handling
   - Z-index hierarchy to avoid conflicts

3. **Database migration strategy**
   - ALTER TABLE users pattern in Tickedify
   - CREATE TABLE system_settings approach
   - Rollback strategy for failed migrations
   - Versioning system for database schema changes

4. **Admin settings UI patterns**
   - Existing admin.html structure analysis
   - Settings form styling and validation
   - Save/update UX with loading indicators
   - Success/error toast notifications

**Output**: research.md with consolidated findings and decisions

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

**Artifacts to Generate**:

1. **data-model.md** - Database schema changes:
   ```sql
   -- Users table extension
   ALTER TABLE users ADD COLUMN onboarding_video_seen BOOLEAN DEFAULT FALSE;
   ALTER TABLE users ADD COLUMN onboarding_video_seen_at TIMESTAMP;

   -- System settings table
   CREATE TABLE system_settings (
     key VARCHAR(255) PRIMARY KEY,
     value TEXT,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_by INTEGER REFERENCES users(id)
   );

   -- Initial data
   INSERT INTO system_settings (key, value)
   VALUES ('onboarding_video_url', NULL);
   ```

2. **contracts/api-onboarding.yaml** - OpenAPI spec voor user endpoints:
   - GET /api/settings/onboarding-video
   - PUT /api/user/onboarding-video-seen

3. **contracts/api-admin-settings.yaml** - Admin endpoint:
   - PUT /api/settings/onboarding-video (admin only)
   - GET /api/settings/onboarding-video (admin only)

4. **quickstart.md** - Feature testing scenario:
   - Step 1: Admin configures video URL
   - Step 2: New user first login → popup appears
   - Step 3: User closes popup → marked as seen
   - Step 4: User clicks sidebar link → popup reopens
   - Step 5: Second login → no automatic popup

5. **Update CLAUDE.md** (via update-agent-context.sh):
   - Add onboarding video feature to development notes
   - Reference YouTube embed implementation
   - Document database schema changes

**Contract Test Strategy**:
- API endpoint tests (fail until implemented)
- Database migration test (rollback capability)
- YouTube embed validation test
- Admin authentication test

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 design docs

**Task Categories**:
- Database migration tasks (users table, system_settings table)
- Backend API endpoint tasks (3 endpoints)
- Frontend UI tasks (popup HTML/CSS, sidebar link)
- Admin UI tasks (settings form, save handler)
- Integration tasks (YouTube embed, popup triggers)
- Testing tasks (Playwright scenarios, API tests)

**Ordering Strategy**:
- Database first (schema must exist)
- Backend API second (endpoints for frontend)
- Admin UI third (configuration before user features)
- Frontend UI fourth (popup, sidebar, triggers)
- Testing last (validate complete flow)

**Estimated Output**: 18-22 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following Tickedify patterns)
**Phase 5**: Validation (Playwright tests, staging deployment, production approval)

## Complexity Tracking
*No constitutional violations - no entries needed*

This feature leverages existing Tickedify patterns and requires no architectural deviations.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [x] Phase 4: Implementation complete ✅ (/implement command - all 20 tasks T001-T020)
- [x] Phase 5: Validation passed ✅ (Deployed v0.19.0, tested on production, v0.19.1 sidebar text update)

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented (none needed) ✅

**Artifacts Generated**:
- [x] research.md (4 research topics, all decisions documented)
- [x] data-model.md (database schema, migration strategy, functions)
- [x] contracts/api-onboarding.yaml (user endpoints)
- [x] contracts/api-admin-settings.yaml (admin endpoints)
- [x] quickstart.md (7 test scenarios, API testing, Playwright automation)
- [x] tasks.md (20 implementation tasks, T001-T020)
- [x] CLAUDE.md updated (via update-agent-context.sh)

---

## Completion Summary

**Feature Status**: ✅ **COMPLETED AND DEPLOYED**

**Implementation Date**: October 14, 2025

**Versions Deployed**:
- **v0.19.0**: Complete onboarding video feature implementation
- **v0.19.1**: Sidebar text update ("Welkomstvideo" → "Instructievideo")

**Production Deployment**:
- ✅ Database migration 014 executed successfully on production
- ✅ All 4 API endpoints live and tested
- ✅ Frontend popup and sidebar link functional
- ✅ Admin configuration UI operational
- ✅ User onboarding status reset tested (jan@buskens.be)

**Key Achievements**:
- 20 implementation tasks completed (T001-T020)
- 4 database functions added to database.js
- 4 API endpoints implemented in server.js
- OnboardingVideoManager class created in app.js
- Admin UI for video configuration in admin.html/admin.js
- YouTube-nocookie.com GDPR-compliant embeds
- Z-index layering with proper modal hierarchy
- Full mobile responsive design

**Testing Validation**:
- API endpoints tested with curl
- Manual user flow tested on production
- Database migration idempotency verified
- YouTube URL validation confirmed
- Fallback message functionality verified

**Documentation Updated**:
- [x] package.json version bumped (0.19.0 → 0.19.1)
- [x] public/changelog.html updated with v0.19.0 and v0.19.1
- [x] specs/014-de-eerste-keer/tasks.md marked complete
- [x] specs/014-de-eerste-keer/plan.md completion summary added
- [x] CLAUDE.md automatically updated via update-agent-context.sh

**Branch Management**:
- Feature branch: `014-de-eerste-keer`
- Merged to: `main` (production)
- Commits: 4e7c60e (v0.19.0), 2f3adf7 (v0.19.1)

**Live URLs**:
- Production: https://tickedify.com/app
- Admin Dashboard: https://tickedify.com/admin.html

---
*Based on Tickedify CLAUDE.md principles - See `/CLAUDE.md`*
