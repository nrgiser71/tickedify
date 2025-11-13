# Quickstart: Voice Mode Integration Testing

## Prerequisites

- ✅ Deployed to dev.tickedify.com (staging environment)
- ✅ Test credentials ready: jan@buskens.be / qyqhut-muDvop-fadki9
- ✅ Chrome or Safari browser (Web Speech API support)
- ✅ Microphone access available
- ✅ At least 2-3 tasks in inbox for testing

## Setup (5 minutes)

### 1. Login to Staging

```
URL: https://dev.tickedify.com/app
Email: jan@buskens.be
Password: qyqhut-muDvop-fadki9
```

### 2. Prepare Test Data

Navigate to inbox screen and verify you have 2-3 tasks. If not, create them:

```
Task 1: "Test spraak project toewijzing"
Task 2: "Test spraak context toewijzing"
Task 3: "Test spraak lijst routering"
```

### 3. Grant Microphone Permission

When prompted by browser:
- ✅ Allow microphone access for dev.tickedify.com
- ✅ Permission persists for future sessions

## Test Scenario 1: Basic Voice Activation (2 minutes)

**Goal**: Verify voice mode button visibility and activation

### Steps

1. Navigate to inbox screen
2. Look for voice mode toggle button (should be visible for jan@buskens.be)
3. Click the toggle button
4. Observe subtle visual indicator (active state)
5. Click toggle button again
6. Observe indicator disappears (inactive state)

### Expected Results

✅ Voice mode button visible in inbox screen
✅ Button has subtle active state indicator when activated
✅ Button deactivates cleanly when clicked again
✅ No console errors during activate/deactivate cycle

### Red Flags

❌ Button not visible (whitelist check failed)
❌ Microphone permission error (handle gracefully with error message)
❌ Console errors during activation
❌ Active state indicator too prominent (should be subtle)

## Test Scenario 2: Property Setting via Voice (5 minutes)

**Goal**: Verify all 8 properties can be set via voice commands

### Steps

1. Activate voice mode
2. Wait for first task to be read aloud
3. Say: **"project Verbouwing"**
4. Wait for confirmation: "Project ingesteld op Verbouwing"
5. Say: **"context Werk"**
6. Wait for confirmation: "Context ingesteld op Werk"
7. Say: **"duur 30"**
8. Wait for confirmation: "Duur ingesteld op 30 minuten"
9. Say: **"prioriteit hoog"**
10. Wait for confirmation: "Prioriteit ingesteld op hoog"
11. Say: **"datum 20 november"**
12. Wait for confirmation: "Datum ingesteld op 20 november"
13. Say: **"notitie eerst even bellen"**
14. Wait for confirmation: "Notitie toegevoegd"
15. Say: **"dit heeft subtaken"**
16. Wait for confirmation: "Subtaken gemarkeerd"

### Expected Results

✅ Each property command receives spoken confirmation
✅ AI parsing responds within 1 second
✅ Confirmation feedback is clear and Dutch
✅ Properties accumulate (not saved yet, waiting for "klaar")

### Red Flags

❌ AI parsing fails → Check fallback to regex occurs
❌ Confirmation delayed > 2 seconds → Check OpenAI API latency
❌ Properties not accumulated (verify pendingProperties object)
❌ Spoken feedback in English (should be Dutch)

## Test Scenario 3: Save Task with Properties (3 minutes)

**Goal**: Verify "klaar" command saves accumulated properties

### Steps

1. Continue from Test Scenario 2 (properties accumulated)
2. Say: **"klaar"** or **"taak opslaan"**
3. Wait for confirmation: "Taak opgeslagen"
4. Observe next inbox task is read aloud automatically
5. Deactivate voice mode
6. Navigate to Actions list
7. Find saved task
8. Verify all properties set correctly:
   - Project: Verbouwing
   - Context: Werk
   - Duration: 30
   - Priority: Hoog
   - Date: 2025-11-20
   - Notes: "eerst even bellen"
   - Subtaken: checked
   - List: acties

### Expected Results

✅ Save command triggers task update API call
✅ Properties persisted to database correctly
✅ Task moved from inbox to acties list
✅ Next inbox task read aloud automatically
✅ Pending properties reset after save

### Red Flags

❌ Properties not saved to database → Check PUT /api/taak/:id call
❌ Task still in inbox after save → Check lijst property update
❌ Next task not read → Check task navigation logic
❌ Properties incomplete → Check property merging logic

## Test Scenario 4: List Routing (3 minutes)

**Goal**: Verify lijst routering to all defer lists

### Steps

1. Activate voice mode
2. Wait for task to be read
3. Say: **"doorsturen naar wekelijkse lijst"**
4. Wait for confirmation: "Taak doorgestuurd naar wekelijkse lijst"
5. Observe next task read automatically
6. Deactivate voice mode
7. Navigate to "Uitgesteld - Wekelijks" list
8. Verify task is present

**Repeat for other lists**:
- "doorsturen naar maandelijkse lijst" → uitgesteld-maandelijks
- "doorsturen naar opvolgen lijst" → opvolgen
- "doorsturen naar driem aandelijkse lijst" → uitgesteld-3maandelijks
- "doorsturen naar zesmaandelijkse lijst" → uitgesteld-6maandelijks
- "doorsturen naar jaarlijkse lijst" → uitgesteld-jaarlijks

### Expected Results

✅ Task routed to correct defer list
✅ Task removed from inbox immediately
✅ Next inbox task read automatically
✅ Routed task visible in target list

### Red Flags

❌ Task remains in inbox after routing → Check lijst update API call
❌ Wrong list selected → Check AI parsing of lijst names
❌ Next task not read → Check task removal logic

## Test Scenario 5: Query Functionality (3 minutes)

**Goal**: Verify context-aware queries work

### Steps

1. Activate voice mode
2. Say: **"hoeveel taken in Verbouwing?"**
3. Wait for response: "Er zijn X taken in project Verbouwing"
4. Say: **"hoeveel taken in Werk?"** (context)
5. Wait for response: "Er zijn X taken in context Werk"
6. Say: **"wat zijn mijn projecten?"**
7. Wait for list of projects read aloud

### Expected Results

✅ Query intent recognized by AI
✅ Correct count spoken back
✅ Multiple queries work without saving current task
✅ Current task remains loaded after query

### Red Flags

❌ Query not recognized → Check AI intent parsing
❌ Wrong count spoken → Check project/context lookup logic
❌ Current task lost after query → Check task state preservation

## Test Scenario 6: Complete Task (2 minutes)

**Goal**: Verify "afvinken" marks task complete

### Steps

1. Activate voice mode
2. Wait for task to be read
3. Say: **"afvinken"** or **"taak voltooid"**
4. Wait for confirmation: "Taak afgevinkt als voltooid"
5. Observe next task read automatically
6. Deactivate voice mode
7. Navigate to completed tasks or check database
8. Verify task marked voltooid=true

### Expected Results

✅ Task marked as complete via API
✅ Task removed from inbox
✅ Next task read automatically
✅ Stats updated (completed count incremented)

### Red Flags

❌ Task not marked complete → Check voltooid API update
❌ Task still in inbox → Check completed task filtering
❌ Next task not read → Check task removal logic

## Test Scenario 7: Edit Task Name (2 minutes)

**Goal**: Verify task title can be changed via voice

### Steps

1. Activate voice mode
2. Wait for task to be read
3. Say: **"de naam moet zijn: Nieuwe taaknaam hier"**
4. Wait for confirmation: "Taaknaam gewijzigd naar: Nieuwe taaknaam hier"
5. Say: **"herhaal"** or **"opnieuw voorlezen"**
6. Verify new name is read aloud

### Expected Results

✅ Task title updated in pendingProperties
✅ New title spoken back in confirmation
✅ Repeat command uses new title

### Red Flags

❌ Title not updated → Check edit_title intent handling
❌ Old title still used → Check title override logic

## Test Scenario 8: Error Handling (5 minutes)

**Goal**: Verify graceful fallback mechanisms

### Substep 8.1: AI Parsing Failure
1. Disconnect internet (airplane mode) OR disable OpenAI API key
2. Activate voice mode
3. Say: **"project Verbouwing"**
4. Observe fallback to regex parsing
5. Verify command still processed correctly

### Substep 8.2: Empty Transcript
1. Activate voice mode
2. Say nothing for 5 seconds (trigger no-speech event)
3. Verify no error shown to user (normal event, console log only)
4. Say a valid command
5. Verify processing continues normally

### Substep 8.3: Unrecognized Command
1. Activate voice mode
2. Say: **"blablabla nonsense command"**
3. Observe fallback attempts regex parsing
4. If regex also fails, observe spoken error: "Commando niet herkend"

### Expected Results

✅ AI failure falls back to regex gracefully
✅ Empty transcripts filtered (< 2 chars)
✅ No-speech events don't show user errors
✅ Unrecognized commands provide helpful feedback
✅ Error recovery allows continuing voice mode

### Red Flags

❌ Voice mode crashes on AI failure → Check fallback implementation
❌ Console spam from no-speech events → Check onerror handler
❌ Unrecognized commands cause hang → Check timeout handling

## Test Scenario 9: Email Whitelist (3 minutes)

**Goal**: Verify non-authorized users cannot access voice mode

### Steps

1. Logout from jan@buskens.be
2. Login with non-whitelisted email (create test account if needed)
3. Navigate to inbox screen
4. Verify voice mode button is hidden
5. Logout and login back as jan@buskens.be
6. Verify voice mode button visible again

### Expected Results

✅ Voice button hidden for non-whitelisted users
✅ No console errors for non-whitelisted users
✅ Voice button visible for jan@buskens.be
✅ Voice button visible for info@baasoverjetijd.be (if tested)

### Red Flags

❌ Button visible for non-whitelisted users → Check whitelist logic
❌ Console errors on inbox load → Check email check implementation

## Test Scenario 10: Non-Persistence (2 minutes)

**Goal**: Verify voice mode resets on page load

### Steps

1. Activate voice mode
2. Set some properties: "project Verbouwing", "duur 30"
3. Refresh the page (⌘R or Ctrl+R)
4. Observe voice mode is inactive after reload
5. Navigate away from inbox and back
6. Verify voice mode still inactive

### Expected Results

✅ Voice mode inactive after page refresh
✅ Pending properties discarded (not persisted)
✅ No localStorage or sessionStorage used
✅ Clean state on each page load

### Red Flags

❌ Voice mode stays active after refresh → Check initialization logic
❌ Properties persisted → Remove any localStorage usage

## Regression Testing (10 minutes)

**Goal**: Verify normal inbox workflow unchanged when voice inactive

### Steps

1. Ensure voice mode is INACTIVE
2. Perform standard inbox operations manually:
   - View inbox tasks
   - Edit task properties via UI
   - Drag task to Actions list
   - Delete a task
   - Complete a task
   - Create new task
3. Verify all operations work identically to before voice integration
4. Check console for any errors
5. Verify no performance degradation

### Expected Results

✅ All inbox operations work normally
✅ No console errors with voice inactive
✅ UI responsiveness unchanged
✅ No JavaScript errors related to voice code

### Red Flags

❌ Inbox operations broken → Check for voice code interfering
❌ Console errors even with voice inactive → Check initialization
❌ Performance degraded → Check for unnecessary voice setup

## Performance Benchmarks

Use browser DevTools Network tab to measure:

| Operation | Target | Typical |
|-----------|--------|---------|
| AI parsing (POST /api/voice/parse-command) | < 1s | 200-800ms |
| Task save (PUT /api/taak/:id) | < 500ms | 100-300ms |
| TTS synthesis (POST /api/voice/synthesize) | < 2s | 500-1500ms |
| Inbox load (GET /api/lijst/inbox) | < 500ms | 100-300ms |

**Red Flags**:
- ❌ AI parsing > 2s consistently → Check OpenAI API or network
- ❌ Task save > 1s → Check database performance
- ❌ TTS > 3s → Check OpenAI TTS API

## Final Checklist

Before marking feature complete:

- [ ] All 10 test scenarios passed
- [ ] No console errors during testing
- [ ] Performance within benchmarks
- [ ] Regression testing clean (no impact when inactive)
- [ ] Email whitelist enforced (tested with non-authorized user)
- [ ] Voice feedback clear and in Dutch
- [ ] Error handling graceful (AI fallback, microphone denial)
- [ ] Non-persistence verified (resets on page load)
- [ ] All 8 properties settable via voice
- [ ] All 6 defer lists routable via voice
- [ ] Save and complete actions work correctly
- [ ] Query functionality operational

## Troubleshooting

### Voice mode button not visible
1. Check user email matches whitelist: jan@buskens.be or info@baasoverjetijd.be
2. Check console for JavaScript errors in whitelist logic
3. Verify currentUser object populated with email

### Microphone not working
1. Check browser permissions: chrome://settings/content/microphone
2. Verify HTTPS (required for Web Speech API)
3. Try different browser (Chrome/Safari recommended)

### AI parsing always fails
1. Check OPENAI_API_KEY environment variable set
2. Verify OpenAI API quota not exceeded
3. Check network connectivity to OpenAI API
4. Fallback to regex should work even if AI fails

### Tasks not saving
1. Check PUT /api/taak/:id API calls in Network tab
2. Verify 200 OK responses
3. Check database connection (staging DATABASE_URL_TEST)
4. Verify property merging logic in voice mode code

### Spoken feedback not working
1. Check POST /api/voice/synthesize calls in Network tab
2. Verify OpenAI TTS API responding
3. Check audio element playback (browser TTS fallback should work)
4. Verify browser audio not muted

## Next Steps

After quickstart testing passed:
1. Run automated tests via /tasks implementation
2. Gather user feedback from jan@buskens.be and info@baasoverjetijd.be
3. Monitor OpenAI API usage and costs
4. Consider expanding whitelist if demand exists
5. Document any issues in GitHub issues

## Success Criteria

✅ **Feature Complete** when:
- All 10 test scenarios pass without red flags
- Regression testing clean (no impact when inactive)
- Performance within benchmarks
- No critical bugs identified
- User feedback positive from authorized users
