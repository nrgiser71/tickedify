# Tasks: Voice Mode Integration in Main Application

**Input**: Design documents from `/specs/065-voice-mode-integratie/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: JavaScript ES6+ (vanilla), Node.js/Express, PostgreSQL
   → Structure: public/index.html, public/app.js, server.js (no changes needed)
   → Integration approach: Extract voice logic from POC, adapt for real data
2. Load optional design documents ✅
   → data-model.md: Runtime state only (voiceModeState object)
   → contracts/: 3 existing endpoints (no changes needed, verification only)
   → research.md: Email whitelist strategy, voice extraction patterns
3. Generate tasks by category ✅
   → Setup: Email whitelist implementation
   → Tests: Endpoint verification (existing APIs)
   → Core: Voice UI, logic extraction, data integration, features
   → Integration: Error handling, fallbacks
   → Polish: Regression testing, quickstart scenarios
4. Apply task rules ✅
   → Different files = [P] for parallel
   → Same file (app.js) = sequential
   → Tests before implementation (TDD approach)
5. Number tasks sequentially (T001-T025) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness ✅
   → All contracts verified
   → All features covered
   → Regression testing included
9. Return: SUCCESS (tasks ready for execution) ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Tickedify uses simplified web structure (not standard Option 1/2/3):
- **Frontend**: `public/index.html`, `public/app.js`, `public/style.css`
- **Backend**: `server.js` (no changes needed for this feature)
- **Reference**: `public/voice-poc.html` (POC to extract logic from)

## Phase 3.1: Setup & Preparation

- [x] **T001** [P] Add email whitelist check function in `public/app.js` - Create `shouldShowVoiceMode()` function that returns true only for 'jan@buskens.be' and 'info@baasoverjetijd.be', returns false otherwise

- [x] **T002** [P] Add voice mode toggle button HTML in `public/index.html` - Add toggle button after task filters in inbox screen section, wrap with `id="voice-mode-container"` for conditional visibility

- [x] **T003** [P] Add subtle voice mode CSS in `public/style.css` - Create `.voice-toggle-btn` and `.voice-toggle-btn.active` classes with subtle pulse animation (less prominent than POC), add `.voice-mode-indicator` for status display

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests verify existing endpoints work correctly for voice mode integration**

- [x] **T004** [P] Contract verification: POST /api/voice/parse-command - Write manual test script that sends Dutch voice commands and verifies structured output matches contract (property setting, list routing, queries, actions)

- [x] **T005** [P] Contract verification: GET /api/lijst/inbox - Write manual test script that fetches inbox tasks and verifies all 8 voice-settable properties are included in response (titel, notities, project, context, duur, prioriteit, verschijndatum, subtaken)

- [x] **T006** [P] Contract verification: PUT /api/taak/:id - Write manual test script that updates task properties and verifies partial updates work correctly (test each of 8 properties individually)

- [x] **T007** [P] Integration test scenario: Email whitelist - Create test that verifies voice button visibility for authorized users (jan@buskens.be, info@baasoverjetijd.be) and hidden for non-authorized users

## Phase 3.3: Core Implementation (ONLY after tests are verified)

### Voice Mode State Management

- [x] **T008** Initialize voice mode state object in `public/app.js` - Add `voiceModeState` object with properties: active (boolean), currentTaskIndex (integer), pendingProperties (object with 8 properties), conversationHistory (array), recognition (SpeechRecognition instance), audioElement (HTMLAudioElement), stats (object)

- [x] **T009** Add voice mode toggle event handlers in `public/app.js` - Wire toggle button click to activate/deactivate voice mode, update UI indicator, initialize/cleanup Web Speech API instances

### Voice Logic Extraction (from voice-poc.html)

- [x] **T010** Extract speech recognition setup from `public/voice-poc.html` (lines 620-680) into `public/app.js` - Copy recognition initialization, event handlers (onresult, onerror, onend), auto-restart logic, adapt for main app context

- [x] **T011** Extract speech synthesis integration from `public/voice-poc.html` (lines 755-820) into `public/app.js` - Copy OpenAI TTS API call function, browser TTS fallback, audio playback with Promise-based sequencing, adapt `speak()` function for main app

- [x] **T012** Extract command processing from `public/voice-poc.html` (lines 850-920) into `public/app.js` - Copy AI parsing API call with conversation history, regex fallback logic, error handling with fallback flag, transcript filtering (>= 2 chars)

### Intent Handlers

- [x] **T013** Extract and adapt property setting handler from `public/voice-poc.html` (lines 940-1000) into `public/app.js` - Copy `handleSetProperty()` function, adapt to update `voiceModeState.pendingProperties` for all 8 properties (project, context, duration, priority, date, notes, subtaken, lijst)

- [x] **T014** Extract and adapt list routing handler from `public/voice-poc.html` (lines 1000-1020) into `public/app.js` - Copy `handleSetList()` function, integrate with existing `updateTask()` API call, implement task removal from inbox array after routing

- [x] **T015** Extract and adapt title editing handler from `public/voice-poc.html` (lines 1020-1040) into `public/app.js` - Copy `handleEditTitle()` function, update task title in currentTasks array and UI display

- [x] **T016** Extract and adapt query handler from `public/voice-poc.html` (lines 1040-1080) into `public/app.js` - Copy `handleQuery()` function, integrate with existing project/context API endpoints, implement counting logic, spoken feedback for query results

### Action Handlers

- [x] **T017** Extract and adapt save action from `public/voice-poc.html` (lines 1150-1200) into `public/app.js` - Copy `saveCurrentAction()` function, merge pendingProperties with current task, resolve project/context names to IDs (find or create), call PUT /api/taak/:id, reset pendingProperties, advance to next task

- [x] **T018** Extract and adapt complete action from `public/voice-poc.html` (lines 1200-1230) into `public/app.js` - Copy `completeCurrentAction()` function, call PUT /api/taak/:id with voltooid=true, remove from inbox array, update stats, advance to next task

- [x] **T019** Extract and adapt navigation functions from `public/voice-poc.html` (lines 1230-1280) into `public/app.js` - Copy `nextAction()`, `readCurrentAction()`, `repeatAction()` functions, integrate with existing inbox task array instead of mock data

### Data Integration

- [x] **T020** Replace mock inbox data with real API integration in `public/app.js` - Remove references to mockInbox array, use existing `currentTasks` array from `loadInbox()` function, maintain task index for voice navigation, ensure voice mode works with live database data

- [x] **T021** Implement project/context lookup and auto-creation in `public/app.js` - Add `findOrCreateProject(name)` and `findOrCreateContext(name)` functions that call GET /api/projecten or GET /api/contexten to find existing, or POST to create new entity, return ID for task update

## Phase 3.4: Integration & Error Handling

- [x] **T022** Implement AI parsing fallback to regex in `public/app.js` - Add `parsePropertiesRegex(transcript)` function with regex patterns for common commands (project, context, duration, priority, klaar, afvinken, doorsturen), ensure graceful degradation when AI API fails

- [x] **T023** Implement microphone permission error handling in `public/app.js` - Add error handler for navigator.mediaDevices.getUserMedia() rejection, display clear error message explaining microphone access required, keep voice button visible but non-functional

- [x] **T024** Implement non-persistence enforcement in `public/app.js` - Ensure voiceModeState.active starts as false on page load, no localStorage or sessionStorage usage, verify voice mode always inactive after page refresh

## Phase 3.5: Polish & Testing

- [ ] **T025** [P] Execute quickstart.md test scenarios on dev.tickedify.com - Run all 10 test scenarios manually (whitelist, activation, property setting, save, routing, complete, query, edit, error handling, non-persistence), document any issues found, verify all acceptance criteria met

- [ ] **T026** [P] Regression testing: Verify normal inbox workflow when voice inactive in `public/app.js` - Test all existing inbox operations (view, edit, drag, delete, complete, create) work identically to before voice integration, verify no console errors, no performance degradation, no JavaScript conflicts

- [ ] **T027** [P] Performance validation on dev.tickedify.com - Use browser DevTools to measure: AI parsing < 1s, task save < 500ms, TTS synthesis < 2s, inbox load < 500ms, document any performance issues, verify targets met

## Dependencies

**Sequential Dependencies** (blocking):
```
T001-T003 (Setup) → T008-T009 (State) → T010-T012 (Voice Core) →
T013-T019 (Handlers) → T020-T021 (Data) → T022-T024 (Error Handling) →
T025-T027 (Testing)
```

**Within Same Phase**:
- T001, T002, T003 can run in parallel (different files) [P]
- T004, T005, T006, T007 can run in parallel (independent tests) [P]
- T008-T024 must run sequentially (all modify app.js)
- T025, T026, T027 can run in parallel (independent validation) [P]

**Key Blockers**:
- Tests (T004-T007) MUST pass before implementation (T008+)
- Voice core (T010-T012) blocks handlers (T013-T019)
- Handlers (T013-T019) block data integration (T020-T021)
- Data integration (T020-T021) blocks error handling (T022-T024)
- All implementation (T008-T024) blocks testing (T025-T027)

## Parallel Execution Examples

### Setup Phase (Run Together)
```bash
# T001-T003 in parallel - different files
Task(subagent_type: "tickedify-feature-builder",
     description: "Email whitelist check",
     prompt: "Add shouldShowVoiceMode() function in public/app.js that returns true only for 'jan@buskens.be' and 'info@baasoverjetijd.be'")

Task(subagent_type: "tickedify-feature-builder",
     description: "Voice toggle UI",
     prompt: "Add voice mode toggle button HTML in public/index.html after task filters in inbox screen")

Task(subagent_type: "tickedify-feature-builder",
     description: "Voice mode CSS",
     prompt: "Add .voice-toggle-btn and .voice-toggle-btn.active CSS in public/style.css with subtle pulse animation")
```

### Test Phase (Run Together)
```bash
# T004-T007 in parallel - independent tests
Task(subagent_type: "tickedify-testing",
     description: "Voice parse API test",
     prompt: "Test POST /api/voice/parse-command with Dutch commands, verify structured output")

Task(subagent_type: "tickedify-testing",
     description: "Inbox API test",
     prompt: "Test GET /api/lijst/inbox, verify all 8 voice properties in response")

Task(subagent_type: "tickedify-testing",
     description: "Task update API test",
     prompt: "Test PUT /api/taak/:id with each property, verify partial updates work")

Task(subagent_type: "tickedify-testing",
     description: "Whitelist test",
     prompt: "Test voice button visibility for authorized and non-authorized users")
```

### Polish Phase (Run Together)
```bash
# T025-T027 in parallel - independent validation
Task(subagent_type: "tickedify-testing",
     description: "Quickstart scenarios",
     prompt: "Execute all 10 test scenarios from quickstart.md on dev.tickedify.com")

Task(subagent_type: "tickedify-testing",
     description: "Regression testing",
     prompt: "Verify normal inbox workflow unchanged when voice mode inactive")

Task(subagent_type: "tickedify-testing",
     description: "Performance validation",
     prompt: "Measure AI parsing, task save, TTS synthesis, inbox load times on dev.tickedify.com")
```

## File Impact Summary

| File | Tasks | Sequential/Parallel | Changes |
|------|-------|---------------------|---------|
| `public/app.js` | T001, T008-T024 | Sequential (same file) | Add voiceModeState object, extract voice logic from POC, integrate with real inbox data, error handling |
| `public/index.html` | T002 | [P] | Add voice toggle button in inbox screen section |
| `public/style.css` | T003 | [P] | Add voice toggle button styles and active state animation |
| `public/voice-poc.html` | Reference only | N/A | Source for logic extraction (no modifications) |
| `server.js` | None | N/A | No changes needed - existing endpoints sufficient |

## Notes

### Implementation Guidelines
- **Reuse POC code**: Extract proven functionality from voice-poc.html, don't rewrite from scratch
- **Preserve existing behavior**: When voice mode inactive, app works identically to before integration
- **Test incrementally**: Test each handler (T013-T018) immediately after implementation before moving to next
- **Use existing APIs**: All backend endpoints already exist, no server.js changes needed
- **Dutch language**: All voice commands, confirmations, and error messages in Nederlands

### Common Pitfalls to Avoid
- ❌ Don't break existing inbox workflow when voice mode inactive
- ❌ Don't persist voice mode state (must reset on page load)
- ❌ Don't show voice button for non-whitelisted users
- ❌ Don't send transcripts < 2 characters to API (causes 400 errors)
- ❌ Don't use English for voice feedback (must be Dutch)
- ❌ Don't skip regex fallback implementation (required for AI failures)

### Testing Strategy
- **T004-T007**: Manual API testing with curl or Postman (verify contracts)
- **T025**: Manual UI testing following quickstart scenarios
- **T026**: Manual regression testing of existing features
- **T027**: Browser DevTools Network tab for performance measurement

### Deployment Strategy
- Deploy to staging branch after each task completion
- Test on dev.tickedify.com with test credentials (jan@buskens.be)
- Increment package.json version with each commit (1.0.50 → 1.0.51+)
- Update public/changelog.html with feature progress (English)
- Use curl -s -L -k for deployment verification
- Verify /api/version endpoint matches package.json after deployment

## Validation Checklist
*GATE: Checked before marking feature complete*

- [ ] All contracts verified (T004-T006)
- [ ] Email whitelist enforced (T001, T007)
- [ ] All 8 properties settable via voice (T013)
- [ ] All 6 defer lists routable (T014)
- [ ] Save and complete actions work (T017-T018)
- [ ] Query functionality operational (T016)
- [ ] Error handling graceful (T022-T024)
- [ ] Non-persistence verified (T024)
- [ ] Quickstart scenarios pass (T025)
- [ ] Regression testing clean (T026)
- [ ] Performance within targets (T027)
- [ ] No console errors during testing
- [ ] Voice feedback clear and in Dutch

## Success Criteria

✅ **Feature Complete** when:
- All tasks (T001-T027) completed and verified
- All validation checklist items checked
- Quickstart scenarios pass without red flags
- Regression testing confirms no impact when voice inactive
- Performance within benchmarks (AI < 1s, save < 500ms, TTS < 2s)
- User feedback positive from authorized users (jan@buskens.be, info@baasoverjetijd.be)

---

**Total Tasks**: 27 (Setup: 3, Tests: 4, Core: 17, Polish: 3)
**Parallel Tasks**: 10 marked [P] (different files or independent operations)
**Sequential Tasks**: 17 (all modify app.js, must be ordered)
**Estimated Effort**: 2-3 days for full implementation and testing
