# Implementation Plan: Voice Mode Integration in Main Application

**Branch**: `065-voice-mode-integratie` | **Date**: 2025-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/065-voice-mode-integratie/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
   → Spec found and analyzed
2. Fill Technical Context ✅
   → Project Type: web (frontend vanilla JS + backend Node.js/Express)
   → Structure Decision: Option 2 (frontend/backend separation)
3. Fill Constitution Check section ✅
4. Evaluate Constitution Check section ✅
   → No violations - staging-first deployment adhered
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md ✅
   → No NEEDS CLARIFICATION in spec
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ✅
7. Re-evaluate Constitution Check section ✅
   → No new violations after design
   → Update Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Task generation approach described ✅
9. STOP - Ready for /tasks command ✅
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Voice mode integration brengt hands-free inbox task processing naar de hoofdapplicatie met beperkte toegang voor twee geautoriseerde gebruikers (jan@buskens.be en info@baasoverjetijd.be). De bestaande voice-poc.html functionaliteit wordt geïntegreerd in public/index.html met minimale UI changes: een subtiele toggle knop in het inbox scherm en discrete visuele feedback tijdens voice mode.

Technische approach: Hergebruik bestaande AI parsing endpoint (/api/voice/parse-command met GPT-4o-mini + Structured Outputs), integreer Web Speech API (nl-NL) direct in index.html, vervang mock data met echte inbox API calls, implementeer email whitelist check client-side en server-side, en behoud alle voice functionaliteit (8 properties, lijst routering, queries, save/complete actions).

## Technical Context

**Language/Version**: JavaScript ES6+ (vanilla, no framework), Node.js 16+
**Primary Dependencies**:
- Frontend: Web Speech API (native browser), OpenAI TTS via backend endpoint
- Backend: Express.js 4.18.2, OpenAI API 6.8.1 (GPT-4o-mini for NLP, TTS for speech synthesis), pg 8.11.3 (PostgreSQL)
**Storage**: PostgreSQL via Neon (cloud database) - existing taken, projecten, contexten tables
**Testing**: Manual testing via dev.tickedify.com with regression testing for inbox workflow
**Target Platform**: Modern browsers (Chrome, Safari, Firefox with Web Speech API support)
**Project Type**: web - vanilla JavaScript frontend + Node.js/Express backend
**Performance Goals**:
- Voice command processing: < 1s AI parsing response time
- Speech synthesis: streaming audio for immediate playback
- Inbox task loading: < 500ms per task via existing API
**Constraints**:
- Email whitelist hardcoded: only jan@buskens.be and info@baasoverjetijd.be
- No persistent voice mode state (resets on page load)
- Inbox screen only - no voice mode on other screens
- Must not disrupt existing inbox functionality when voice mode inactive
**Scale/Scope**:
- 2 authorized users initially
- Integration affects 1 screen (inbox) in main app
- Reuses existing backend endpoint from POC
- ~500 lines of voice mode JavaScript integrated into app.js

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze - Production Stability ✅
- ✅ **PASS**: All development on feature branch `065-voice-mode-integratie`
- ✅ **PASS**: No git push to main branch planned
- ✅ **PASS**: Deployment via staging branch only (dev.tickedify.com)
- ✅ **PASS**: Testing on dev.tickedify.com before any production consideration

**Rationale**: Feature wordt ontwikkeld en getest op staging, volledig conform bèta freeze protocol.

### Staging-First Deployment ✅
- ✅ **PASS**: Feature branch merges naar staging branch
- ✅ **PASS**: Automatic Vercel deployment to dev.tickedify.com
- ✅ **PASS**: Testing on dev.tickedify.com with test credentials
- ✅ **PASS**: Main branch remains untouched

**Rationale**: Standard staging workflow, geen afwijkingen.

### Gespecialiseerde Sub-Agents ✅
- ✅ **PLAN**: Use tickedify-feature-builder for implementation
- ✅ **PLAN**: Use tickedify-testing for end-to-end voice workflow testing
- ✅ **PLAN**: Use tickedify-bug-hunter if issues arise during integration

**Rationale**: Feature development = tickedify-feature-builder, testing = tickedify-testing.

### Versioning & Changelog Discipline ✅
- ✅ **PLAN**: Increment package.json version with each commit (1.0.50 → 1.0.51+)
- ✅ **PLAN**: Update public/changelog.html with feature progress
- ✅ **PLAN**: Use ✨ FEATURE category for voice mode integration
- ✅ **PLAN**: English changelog entries per constitution

**Rationale**: Standard versioning workflow voor nieuwe feature.

### Deployment Verification Workflow ✅
- ✅ **PLAN**: Check /api/version endpoint after each deployment
- ✅ **PLAN**: Use `curl -s -L -k` flags for API testing
- ✅ **PLAN**: 15-second interval checks (max 2 minutes timeout)
- ✅ **PLAN**: Verify voice mode endpoint availability

**Rationale**: Standard deployment verification, geen afwijkingen.

### Test-First via API ✅
- ✅ **PLAN**: Test AI parsing endpoint directly via POST /api/voice/parse-command
- ✅ **PLAN**: Test inbox API integration via GET /api/lijst/inbox
- ✅ **PLAN**: Test property updates via PUT /api/taak/:id
- ✅ **PLAN**: Browser automation only for voice-specific UI (microphone, speech synthesis)

**Rationale**: Maximize API testing, minimize UI testing per constitution.

**GATE STATUS**: ✅ ALL CHECKS PASS - No violations, no complexity deviations

## Project Structure

### Documentation (this feature)
```
specs/065-voice-mode-integratie/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── voice-parse.contract.md      # AI parsing endpoint contract
│   ├── inbox-api.contract.md        # Inbox tasks retrieval contract
│   └── task-update.contract.md      # Task property update contract
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Tickedify follows a hybrid structure (not standard Option 1/2/3)
# Frontend and backend in same repo with public/ and server.js

public/
├── index.html           # Main app - voice mode integration here
├── app.js               # Main app logic - voice mode code added here
├── voice-poc.html       # Existing POC (reference only, not modified)
└── style.css            # Styles - minimal voice mode UI additions

server.js                # Backend - existing /api/voice/* endpoints (no changes needed)

database.js              # Database connection (no changes needed)

# Note: Tickedify uses a single-file approach for frontend (app.js)
# and backend (server.js) rather than modular structure
```

**Structure Decision**: Tickedify uses a simplified web structure with single-file frontend/backend rather than Option 1/2/3. Voice mode will integrate directly into existing public/index.html and public/app.js files.

## Phase 0: Outline & Research

**Analysis**: Feature spec has NO "NEEDS CLARIFICATION" markers. All requirements are concrete and testable. Voice POC already exists at public/voice-poc.html with proven implementation.

**Key Research Areas**:
1. ✅ **Web Speech API integration patterns** - Already implemented in voice-poc.html
2. ✅ **OpenAI TTS endpoint** - Already exists at POST /api/voice/synthesize (server.js:2315)
3. ✅ **AI parsing endpoint** - Already exists at POST /api/voice/parse-command (server.js:882)
4. ✅ **Email whitelist implementation** - Client-side: check user.email, Server-side: validate req.session.user
5. ✅ **Inbox API integration** - Existing GET /api/lijst/inbox endpoint available

**Findings**:
- All core voice functionality proven in POC (public/voice-poc.html lines 1-1500+)
- Backend endpoints already production-ready with error handling and fallbacks
- No new dependencies needed - reuse existing OpenAI API, Web Speech API
- Email whitelist: simple array check on client + session validation on server
- Integration strategy: Extract voice logic from POC, adapt for real inbox data

**Output**: research.md (see artifact below)

## Phase 1: Design & Contracts

### Data Model
**No new database entities required** - voice mode operates on existing data structures:
- Users table (email field for whitelist check)
- Taken table (all 8 voice-settable properties already exist)
- Projecten table (auto-create/find existing functionality)
- Contexten table (auto-create/find existing functionality)

**Runtime state only** (no persistence):
- Voice mode active/inactive (boolean in app.js)
- Current inbox task being processed (reference to existing task object)
- Conversation history (array of last 10 messages for context)
- Speech recognition instance (Web Speech API object)

### API Contracts

**Existing endpoints to reuse** (no changes needed):
1. `POST /api/voice/parse-command` - AI parsing with GPT-4o-mini (server.js:882)
2. `POST /api/voice/synthesize` - OpenAI TTS with Dutch voice (server.js:2315)
3. `GET /api/lijst/inbox` - Inbox tasks retrieval (server.js existing endpoint)
4. `PUT /api/taak/:id` - Task property updates (server.js existing endpoint)
5. `GET /api/projecten` - Project list (for query functionality)
6. `GET /api/contexten` - Context list (for query functionality)

**New validation layer**:
- Email whitelist check in frontend before showing voice button
- Session email validation in backend (though existing endpoints already check auth)

### Integration Points

**Frontend (public/index.html + app.js)**:
1. Add voice mode toggle button to inbox screen HTML
2. Inject voice mode JavaScript into app.js (adapted from voice-poc.html)
3. Replace mock data references with real inbox task data
4. Add email whitelist check: `if (!['jan@buskens.be', 'info@baasoverjetijd.be'].includes(user.email)) return;`
5. Subtle visual indicator CSS (less prominent than POC animation)

**Backend (server.js)**:
- No changes required - existing endpoints already handle auth and validation
- Email whitelist enforcement happens client-side (button visibility)
- Server-side auth via existing session middleware is sufficient

### Test Scenarios

From spec acceptance scenarios:
1. Email whitelist: Verify button hidden for non-authorized users
2. Voice activation: Toggle button activates/deactivates voice mode
3. Property setting: "project Verbouwing" sets project via voice
4. List routing: "doorsturen naar wekelijkse lijst" routes task
5. Save/complete: "klaar" saves task, "afvinken" completes task
6. Query: "hoeveel taken in Verbouwing?" speaks back count
7. Fallback: AI failure gracefully falls back to regex parsing
8. Non-persistence: Page refresh resets voice mode to inactive

**Output**: See artifacts below (data-model.md, contracts/, quickstart.md)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

The /tasks command will generate tasks in TDD order:

1. **Frontend whitelist implementation** [P]
   - Add email check logic to app.js
   - Show/hide voice button based on user email
   - Test: Verify button visibility for authorized/unauthorized users

2. **Voice mode toggle UI** [P]
   - Add toggle button HTML to inbox screen section
   - Add subtle active state CSS (less prominent than POC)
   - Wire toggle event handlers
   - Test: Manual click test for activate/deactivate

3. **Extract voice logic from POC**
   - Copy speech recognition setup from voice-poc.html
   - Copy speech synthesis integration
   - Copy command processing logic
   - Adapt for integration into app.js structure

4. **Replace mock data with real inbox API**
   - Remove mock inbox array
   - Integrate with existing loadInbox() function
   - Use real task objects from /api/lijst/inbox
   - Maintain task index for navigation

5. **Property setting integration**
   - Connect voice property updates to existing updateTask() function
   - Test all 8 properties (project, context, duration, priority, date, notes, subtaken, lijst)
   - Verify database persistence via API

6. **List routing integration**
   - Connect voice list commands to existing task update API
   - Test routing to all 6 defer lists
   - Verify task removal from inbox after routing

7. **Save/complete actions**
   - Connect "klaar"/"taak opslaan" to existing save workflow
   - Connect "afvinken" to complete task endpoint
   - Test task progression to next inbox item

8. **Query functionality**
   - Integrate with existing project/context data endpoints
   - Test counting tasks by project/context
   - Verify spoken feedback for query results

9. **Error handling & fallbacks**
   - Ensure AI → regex fallback works
   - Handle microphone permission denial
   - Filter short transcripts (<2 chars)
   - Test graceful degradation

10. **Non-persistence enforcement**
    - Ensure voice mode starts inactive on page load
    - No localStorage persistence
    - Test: Refresh page, verify inactive state

11. **Regression testing**
    - Verify normal inbox workflow unaffected when voice inactive
    - Test all existing inbox features still work
    - Verify no console errors in inactive state

**Ordering Strategy**:
- Frontend whitelist first (gates all other work)
- UI elements before logic integration
- POC extraction as foundation
- Real data integration before feature integration
- Feature-by-feature testing (properties, routing, actions, queries)
- Error handling and edge cases last
- Regression testing final validation

**Estimated Output**: ~20-25 numbered, ordered tasks in tasks.md

**Dependency Chain**:
```
Whitelist check → Toggle UI → Voice logic extraction →
Real data integration → Feature integration (properties, routing, save/complete, queries) →
Error handling → Regression testing
```

**Parallel Execution** [P]:
- Whitelist logic and toggle UI can be developed in parallel
- Property, routing, and query integration are independent once data layer is ready

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation via tickedify-feature-builder agent
- Follow tasks.md sequence
- Test each task completion via dev.tickedify.com
- Use tickedify-testing agent for end-to-end voice workflow validation
**Phase 5**: Validation
- Run quickstart.md manual test scenarios
- Verify all 10 acceptance scenarios from spec
- Performance check: AI parsing < 1s, task loading < 500ms
- Regression: Verify inbox workflow unchanged when voice inactive

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**NO VIOLATIONS** - This section is not needed. All constitutional requirements are met without exceptions.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none exist)

**Artifacts Generated**:
- [x] plan.md (this file)
- [x] research.md
- [x] data-model.md
- [x] contracts/voice-parse.contract.md
- [x] contracts/inbox-api.contract.md
- [x] contracts/task-update.contract.md
- [x] quickstart.md
- [x] CLAUDE.md updated

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
