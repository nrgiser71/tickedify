# Tasks: Email Import Syntax Uitbreiding

**Input**: Design documents from `/specs/048-email-import-syntax/`
**Prerequisites**: plan.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅), quickstart.md (✅)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Loaded: Node.js 20.x backend, Express.js, PostgreSQL, Vanilla JS frontend
2. Load optional design documents:
   → ✅ data-model.md: EmailInstruction runtime model, no DB changes
   → ✅ contracts/: email-import-api.yml with extended behavior
   → ✅ research.md: 8 technical decisions documented
   → ✅ quickstart.md: 10 test scenarios covering 41 FR
3. Generate tasks by category:
   → Setup: Helpfile structure, review existing code
   → Tests: 10 API test scenarios (parallel)
   → Core: Parser implementation (8 components)
   → Integration: Entity resolution, task creation
   → Polish: Documentation, code comments
4. Apply task rules:
   → Different files = [P] for parallel
   → Same file (server.js) = sequential
   → Tests before implementation (TDD approach)
5. Number tasks sequentially (T001, T002...)
   → 31 total tasks generated
6. Generate dependency graph
   → Setup → Backend Core → Frontend → Testing → Polish
7. Create parallel execution examples
   → Testing phase can run 10 scenarios in parallel
8. Validate task completeness:
   → ✅ Contract has test coverage
   → ✅ Entity models documented (runtime only)
   → ✅ All endpoints covered (modify existing)
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Backend**: `server.js` (Express.js, existing file)
- **Frontend**: `public/` directory (HTML, JS, Markdown files)
- **Specs**: `/specs/048-email-import-syntax/` (documentation)

Paths assume Tickedify web application structure at repository root.

## Phase 3.1: Setup

- [x] T001 Create helpfile structure in public/email-import-help.md
- [x] T002 Review existing parseEmailToTask function in server.js (~line 1304)
- [x] T003 Review existing findOrCreateProject and findOrCreateContext functions in server.js

## Phase 3.2: Backend Implementation (Core Parsing Logic)

**CRITICAL**: These tasks modify server.js parseEmailToTask function. Execute sequentially due to same file.

- [x] T004 Implement --end-- marker truncation in server.js parseEmailToTask
  - Add `truncateAtEndMarker()` helper function
  - Apply BEFORE @t detection (always, even without @t)
  - Use case-insensitive regex `/--end--/i`
  - Test: Body "text\n--END--\nsignature" → "text"
  - Location: server.js ~line 1304

- [x] T00- [ ] T005 Implement @t trigger detection in server.js parseEmailToTask
  - Check first non-empty line for `/^@t\s+(.+)$/` pattern
  - If no match: use existing parsing logic (backwards compatible)
  - If match: extract instruction content and proceed to segment parsing
  - Return early if @t without parameters
  - Location: server.js ~line 1304

- [x] T00- [ ] T006 Implement instruction segment splitting in server.js
  - Split instruction on `;` delimiter
  - Trim each segment
  - Filter out empty segments
  - Pass segments array to parser functions
  - Location: server.js parseEmailToTask function

- [x] T00- [ ] T007 Implement defer code parser in server.js
  - Function: `parseDeferCode(segment)`
  - Regex: `/^(df|dw|dm|d3m|d6m|dy)$/i`
  - Return defer mapping: df→followup, dw→weekly, dm→monthly, d3m→quarterly, d6m→biannual, dy→yearly
  - If defer detected: return immediately with hasDefer=true flag
  - Location: server.js new helper function

- [x] T00- [ ] T008 Implement priority code parser in server.js
  - Function: `parsePriorityCode(segment)`
  - Regex: `/^p(\d+)$/i`
  - Normalization: p0/p1→High, p2→Medium, p3/p4+→Low
  - Return normalized priority string or null
  - Location: server.js new helper function

- [x] T00- [ ] T009 Implement key-value parser for p:, c:, d:, t: codes in server.js
  - Function: `parseKeyValue(segment, key)`
  - Regex: `/^([pcdت])\s*:\s*(.+)$/i`
  - Validation:
    - p: any non-empty string (project)
    - c: any non-empty string (context)
    - d: must match `/^\d{4}-\d{2}-\d{2}$/` (ISO date)
    - t: must match `/^\d+$/` (positive integer minutes)
  - Return parsed value or null if invalid
  - Location: server.js new helper function

- [x] T01- [ ] T010 Implement duplicate detection logic in server.js
  - Use Set to track seen codes: project, context, due, duration, priority
  - First occurrence wins, subsequent duplicates ignored silently
  - Apply during segment parsing loop
  - Location: server.js parseEmailToTask function

- [x] T01- [ ] T011 Implement @t instruction line removal from notes in server.js
  - After parsing @t, remove first line from body before storing as opmerkingen
  - Preserve remaining body content after @t line
  - Apply after --end-- truncation
  - Location: server.js parseEmailToTask function

- [x] T01- [ ] T012 Integrate defer absolute priority logic in server.js
  - Check hasDefer flag before processing other codes
  - If hasDefer=true: set lijst to defer mapping, set all other fields to null
  - If hasDefer=false: process all codes normally
  - Location: server.js parseEmailToTask function

- [x] T01- [ ] T013 Update task creation INSERT query in server.js
  - Ensure prioriteit kolom uses normalized priority values
  - Ensure lijst kolom uses defer mapping or 'inbox' default
  - Verify all existing fields still populated correctly
  - Location: server.js POST /api/email/import endpoint (~line 1174)

- [x] T01- [ ] T014 Add error handling for parsing failures in server.js
  - Wrap @t parsing in try-catch
  - On parsing error: fall back to standard parsing (backwards compatible)
  - Log parsing errors for debugging (without failing email import)
  - Location: server.js parseEmailToTask function

- [x] T01- [ ] T015 Add debug logging for @t instruction parsing in server.js
  - Log detected @t instruction content
  - Log parsed segments
  - Log detected defer codes, priority, project, context, etc.
  - Log parsing decisions (which codes applied, which ignored)
  - Location: server.js parseEmailToTask function

## Phase 3.3: Frontend Implementation

**These tasks are independent and can run in parallel [P]**

- [x] T016 [P] Create comprehensive helpfile in public/email-import-help.md
  - Structure: Quick Start, Syntax Reference, Examples, FAQ, Troubleshooting
  - Document all codes: p:, c:, d:, t:, p0-p9, df/dw/dm/d3m/d6m/dy
  - Include 10+ examples covering all use cases
  - Document --end-- marker behavior
  - Document defer absolute priority rule
  - Document backwards compatibility (emails zonder @t)
  - Markdown format, ~200 lines
  - Location: public/email-import-help.md (NEW FILE)

- [ ] T017 [P] Add help icon HTML in public/admin.html next to import email copy button
  - Find import email section in admin.html
  - Add ❓ button with onclick handler
  - Position next to existing copy button
  - Add title attribute: "View email syntax help"
  - Ensure responsive styling for mobile
  - Location: public/admin.html

- [ ] T018 [P] Add help icon click handler in public/admin.js
  - Function: `openEmailHelp()`
  - Opens /email-import-help.md in new tab
  - Use window.open() with '_blank' target
  - Location: public/admin.js

- [ ] T019 [P] Style help icon to match existing UI in public/admin.html or admin.js
  - Match button styling with copy button
  - Ensure proper spacing between buttons
  - Test hover and active states
  - Verify mobile responsive behavior
  - Location: public/admin.html (inline styles or CSS)

## Phase 3.4: Testing & Validation

**CRITICAL: These tests can run in PARALLEL [P] - they test independent scenarios**

- [ ] T020 [P] Test Scenario 1: Basic @t parsing with all codes
  - curl POST to /api/email/import with: @t p: Klant X; c: Werk; d: 2025-11-03; p1; t: 30;
  - Verify project "Klant X" created/found
  - Verify context "Werk" created/found
  - Verify due date, priority High, duration 30
  - Verify task notes exclude @t line
  - Reference: quickstart.md Scenario 1

- [ ] T021 [P] Test Scenario 2: Backwards compatibility without @t
  - curl POST with [Project] @context #tag in subject
  - curl POST with "Project:", "Context:", "Duur:" in body
  - Verify exact same behavior as before feature
  - Verify no @t parsing triggered
  - Reference: quickstart.md Scenario 2

- [ ] T022 [P] Test Scenario 3: Defer absolute priority logic
  - curl POST with: @t dm; p: Project X; c: Werk; d: 2025-11-03;
  - Verify lijst = monthly
  - Verify project, context, due date ALL null (ignored by defer)
  - Verify hasDefer flag worked
  - Reference: quickstart.md Scenario 3

- [ ] T023 [P] Test Scenario 4: Priority normalisatie
  - Test p0 → High
  - Test p2 → Medium
  - Test p4 → Low
  - Verify database prioriteit kolom values
  - Reference: quickstart.md Scenario 4

- [ ] T024 [P] Test Scenario 5: Entity auto-creation
  - curl POST with: @t p: Nieuw Project 123; c: Nieuwe Context 456;
  - Verify new project created in projecten table
  - Verify new context created in contexten table
  - Verify task linked to both via foreign keys
  - Reference: quickstart.md Scenario 5

- [ ] T025 [P] Test Scenario 6: --end-- marker truncation
  - Test WITH @t: body with --END-- marker
  - Test WITHOUT @t: body with --end-- marker (lowercase)
  - Test case-insensitive: --End--, --END--, --end--
  - Verify notes truncated at marker
  - Verify marker itself not in notes
  - Reference: quickstart.md Scenario 6

- [ ] T026 [P] Test Scenario 7: Error tolerance with invalid codes
  - Test invalid date format: d: 03/11/2025 (ignored)
  - Test invalid duration: t: abc (ignored)
  - Test unknown code: xyz: value (ignored)
  - Verify task still created with valid codes
  - Verify no error emails sent
  - Reference: quickstart.md Scenario 7

- [ ] T027 [P] Test Scenario 8: Duplicate code handling
  - curl POST with: @t p: Project A; p: Project B; c: Context C; c: Context D;
  - Verify first project A used, B ignored
  - Verify first context C used, D ignored
  - Test multiple priority codes: p1; p2; p3;
  - Verify first priority wins
  - Reference: quickstart.md Scenario 8

- [ ] T028 [P] Test Scenario 9: UI help icon functionality
  - Navigate to dev.tickedify.com/admin.html in browser
  - Login with test credentials
  - Verify ❓ icon visible next to copy button
  - Click icon and verify /email-import-help.md opens in new tab
  - Verify helpfile renders correctly
  - Reference: quickstart.md Scenario 9

- [ ] T029 [P] Test Scenario 10: All defer codes mapping
  - Test df → followup lijst
  - Test dw → weekly lijst
  - Test dm → monthly lijst
  - Test d3m → quarterly lijst
  - Test d6m → biannual lijst
  - Test dy → yearly lijst
  - Verify database lijst kolom values
  - Reference: quickstart.md Scenario 10

## Phase 3.5: Documentation & Polish

- [ ] T030 [P] Update CLAUDE.md with email import @t syntax feature details
  - Document parseEmailToTask function location (server.js ~line 1304)
  - Document @t syntax format and all codes
  - Document defer absolute priority rule
  - Document --end-- marker behavior
  - Document helpfile location (public/email-import-help.md)
  - Note: Already partially updated by update-agent-context.sh script
  - Location: CLAUDE.md

- [ ] T031 [P] Add inline code comments for @t parser in server.js
  - Comment @t detection logic
  - Comment segment parsing loop
  - Comment defer absolute priority check
  - Comment validation logic for each code type
  - Comment --end-- truncation
  - Document backwards compatibility approach
  - Location: server.js parseEmailToTask function

## Dependencies

```
Setup (T001-T003)
    ↓
Backend Core (T004-T015) - SEQUENTIAL (same file)
    ├─ T004 (--end--) → T005 (@t detect) → T006 (segment split)
    ├─ T007 (defer) ← T008 (priority) ← T009 (key-value) [helpers can be parallel]
    ├─ T010 (duplicates) ← T011 (@t removal) ← T012 (defer logic)
    └─ T013 (INSERT) ← T014 (errors) ← T015 (logging)
    ↓
Frontend (T016-T019) - PARALLEL [P]
    ├─ T016 (helpfile)
    ├─ T017 (HTML) → T019 (styling)
    └─ T018 (JS handler)
    ↓
Testing (T020-T029) - ALL PARALLEL [P]
    ├─ T020 (basic) | T021 (backwards) | T022 (defer)
    ├─ T023 (priority) | T024 (entities) | T025 (--end--)
    ├─ T026 (errors) | T027 (duplicates) | T028 (UI)
    └─ T029 (defer codes)
    ↓
Polish (T030-T031) - PARALLEL [P]
    ├─ T030 (CLAUDE.md)
    └─ T031 (comments)
```

## Parallel Execution Examples

### Example 1: Frontend Tasks (T016-T019)
```bash
# Launch all frontend tasks together - they touch different files
Task(subagent_type: "tickedify-feature-builder",
     description: "Create helpfile",
     prompt: "Create comprehensive email import help file at public/email-import-help.md with syntax reference, examples, FAQ")

Task(subagent_type: "tickedify-feature-builder",
     description: "Add help icon HTML",
     prompt: "Add ❓ help icon button in public/admin.html next to import email copy button")

Task(subagent_type: "tickedify-feature-builder",
     description: "Add help handler",
     prompt: "Add openEmailHelp() click handler in public/admin.js that opens /email-import-help.md in new tab")

Task(subagent_type: "tickedify-feature-builder",
     description: "Style help icon",
     prompt: "Style help icon in public/admin.html to match existing copy button, ensure mobile responsive")
```

### Example 2: Testing Phase (T020-T029)
```bash
# Launch all test scenarios in parallel - independent API tests
Task(subagent_type: "tickedify-testing",
     description: "Test basic @t parsing",
     prompt: "Execute Scenario 1 from quickstart.md: curl POST with all codes, verify task created correctly")

Task(subagent_type: "tickedify-testing",
     description: "Test backwards compatibility",
     prompt: "Execute Scenario 2 from quickstart.md: test emails without @t still work exactly as before")

Task(subagent_type: "tickedify-testing",
     description: "Test defer priority",
     prompt: "Execute Scenario 3 from quickstart.md: verify defer code ignores all other codes")

# ... continue for all 10 scenarios
```

### Example 3: Documentation (T030-T031)
```bash
# Launch documentation tasks in parallel
Task(subagent_type: "tickedify-feature-builder",
     description: "Update CLAUDE.md",
     prompt: "Update CLAUDE.md with @t syntax documentation, parser location, defer rules, helpfile location")

Task(subagent_type: "tickedify-feature-builder",
     description: "Add code comments",
     prompt: "Add comprehensive inline comments to parseEmailToTask function in server.js explaining @t parsing logic")
```

## Notes

- **Backend tasks (T004-T015) MUST be sequential** - all modify server.js parseEmailToTask function
- **Frontend tasks (T016-T019) can be parallel [P]** - different files
- **Testing tasks (T020-T029) ALL parallel [P]** - independent scenarios
- **Documentation (T030-T031) can be parallel [P]** - different files
- Verify tests pass after each backend task completion
- Commit after completing each phase (Setup → Backend → Frontend → Testing → Polish)
- Use dev.tickedify.com for staging testing before any production deployment
- **IMPORTANT**: Follow bèta freeze - NO deployment to main/production during development

## Task Generation Rules Applied

1. ✅ **From Contracts**: email-import-api.yml → Testing scenarios (T020-T029)
2. ✅ **From Data Model**: EmailInstruction runtime model → Parser implementation (T007-T009)
3. ✅ **From User Stories**: 10 acceptance scenarios → 10 test tasks (T020-T029)
4. ✅ **Ordering**: Setup → Backend → Frontend → Testing → Documentation
5. ✅ **Dependencies**: Backend sequential (same file), Frontend/Testing/Docs parallel

## Validation Checklist

- [x] All contracts have corresponding tests (email-import-api.yml → T020-T029)
- [x] All entities have model tasks (EmailInstruction → T007-T009 parsers)
- [x] All tests come before or alongside implementation (Testing phase T020-T029)
- [x] Parallel tasks truly independent (Frontend, Testing, Docs all [P])
- [x] Each task specifies exact file path (server.js, public/*, CLAUDE.md)
- [x] No task modifies same file as another [P] task (verified)

---

**Tasks Generation Complete** ✅
**Total Tasks**: 31
**Parallel Tasks**: 14 (Frontend: 4, Testing: 10, Documentation: 2)
**Sequential Tasks**: 17 (Setup: 3, Backend: 12, Integration: 2)
**Ready for execution** ✅
