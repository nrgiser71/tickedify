# Tasks: Complete Remaining English UI Translations

**Feature Branch**: `039-jammer-genoeg-zijn`
**Type**: Bugfix - UI Translation
**Complexity**: Very Low (string replacements only)

**Input**: Design documents from `/specs/039-jammer-genoeg-zijn/`
- ✅ plan.md (implementation strategy)
- ✅ quickstart.md (manual testing guide)
- ❌ research.md (not needed - user provided all info)
- ❌ data-model.md (not needed - UI text only)
- ❌ contracts/ (not needed - no API changes)

## Execution Flow
```
1. Load plan.md → Extract 11 screen areas with Dutch text
2. Load quickstart.md → Extract test scenarios per screen
3. Generate translation tasks:
   → T001-T002: Preparation (read code, create reference)
   → T003-T015: Translation by screen (13 areas)
   → T016-T019: Verification & deployment
4. Apply sequencing:
   → Most tasks sequential (same file: public/app.js)
   → Some parallel possible (different files)
5. Number tasks T001-T019
6. Validate: All 11 screen areas covered
7. Return: SUCCESS (19 tasks ready)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- No [P] = Sequential (same file, must complete in order)
- Include exact file paths and line number hints where possible

---

## Phase 1: Preparation & Code Analysis

### T001: Read and analyze existing translation patterns
**File**: `public/app.js` (examine existing translations from v0.20.9)
**Action**:
- Read commit 9743d39 to see successful translation patterns
- Identify common Dutch→English replacements
- Note use of `replace_all: true` for consistent replacements
- Document screen rendering function names to search

**Output**: Understanding of translation approach and file structure

**Dependencies**: None
**Estimated Time**: 10 minutes

---

### T002: Create Dutch→English translation reference
**File**: Create temporary reference list (in memory or notes)
**Action**:
- Compile exhaustive list of all Dutch→English pairs needed:
  - Filter-related: "Filteren op" → "Filter by", "Alle" → "All"
  - Actions: "Bulk bewerken" → "Bulk Edit", "Wekelijks" → "Weekly", "Maandelijks" → "Monthly", "3-maandelijks" → "Quarterly", "6-maandelijks" → "Semi-annually", "Jaarlijks" → "Yearly"
  - Projects: "+ nieuwe project" → "+ New Project", "open" stays "open", "afgewerkt" → "completed", "OPEN ACTIES" → "OPEN ACTIONS"
  - Postponed: "Uitgesteld" → "Postponed"
  - Daily Planning: Comprehensive screen translations
  - Context: "Contexten beheer" → "Context Management", "+ Nieuwe Context" → "+ New Context", "Aangemaakt" → "Created"
  - Search: All screen elements

**Output**: Complete translation reference for use in all subsequent tasks

**Dependencies**: T001
**Estimated Time**: 5 minutes

---

## Phase 2: Translation Tasks - Actions Screen (3 tasks)

### T003: Translate Actions screen filter bar
**File**: `public/app.js` (search for filter rendering function)
**Action**:
- Locate filter bar rendering code in Actions screen logic
- Find all Dutch filter labels (likely in object/array definitions)
- Replace with English equivalents:
  - Any "Filteren" → "Filter"
  - Any filter option labels to English
- Use `replace_all: true` for consistency

**Output**: Filter bar displays in English

**Dependencies**: T002
**Estimated Time**: 10 minutes

---

### T004: Translate "Bulk bewerken" button
**File**: `public/app.js` (search for bulk edit button rendering)
**Action**:
- Search for `'Bulk bewerken'` string in app.js
- Replace with `'Bulk Edit'`
- May be in button HTML generation or onclick handler

**Output**: Button shows "Bulk Edit"

**Dependencies**: T002
**Estimated Time**: 5 minutes

---

### T005: Translate bulk mode action buttons
**File**: `public/app.js` (search for bulk action buttons)
**Action**:
- Locate bulk mode button generation (already partially done in v0.20.9 around line 12362-12388)
- Check if any remaining Dutch in hardcoded button HTML (not in the mapping objects)
- Search for any inline button generation with Dutch text like:
  - "Wekelijks", "Maandelijks", "3-maandelijks", "6-maandelijks", "Jaarlijks"
- Replace with English equivalents if found

**Output**: All bulk mode buttons display English labels

**Dependencies**: T002
**Estimated Time**: 10 minutes

---

## Phase 3: Translation Tasks - Projects Screen (3 tasks)

### T006: Translate "+ nieuwe project" button
**File**: `public/app.js` or `public/index.html` (search for project button)
**Action**:
- Search for `'+ nieuwe project'` string
- Replace with `'+ New Project'`
- Check both app.js (dynamic rendering) and index.html (static HTML)

**Output**: Button shows "+ New Project"

**Dependencies**: T002
**Estimated Time**: 5 minutes

---

### T007: Translate project statistics labels
**File**: `public/app.js` (search for project stat rendering)
**Action**:
- Locate project statistics rendering code
- Find Dutch labels for task counts:
  - "afgewerkt" → "completed" (note: "open" likely already English)
- Replace with English equivalents

**Output**: Project stats show "X open, Y completed"

**Dependencies**: T002
**Estimated Time**: 10 minutes

---

### T008: Translate "OPEN ACTIES" in expanded project view
**File**: `public/app.js` (search for expanded project rendering)
**Action**:
- Search for `'OPEN ACTIES'` string
- Replace with `'OPEN ACTIONS'`
- Likely in project expansion/collapse logic

**Output**: Expanded projects show "OPEN ACTIONS"

**Dependencies**: T002
**Estimated Time**: 5 minutes

---

## Phase 4: Translation Tasks - Postponed Screen (2 tasks)

### T009: Translate "Uitgesteld" page title
**File**: `public/app.js` (title mapping already partially exists around line 1939-1952)
**Action**:
- Check title mappings object for 'uitgesteld' key
- Verify it shows "Postponed" (may already be correct from v0.20.9)
- If not, update mapping: `'uitgesteld': 'Postponed'`
- Check for any hardcoded "Uitgesteld" in HTML generation

**Output**: Page title shows "Postponed"

**Dependencies**: T002
**Estimated Time**: 5 minutes

---

### T010: Translate postponed list names
**File**: `public/app.js` and/or `public/index.html`
**Action**:
- Locate postponed list rendering (sidebar or main content area)
- Check if list names are hardcoded in HTML or generated in JS
- Translate all 5 list labels:
  - "Wekelijks" → "Weekly"
  - "Maandelijks" → "Monthly"
  - "3-maandelijks" → "Quarterly"
  - "6-maandelijks" → "Semi-annually"
  - "Jaarlijks" → "Yearly"
- Use `replace_all: true` if in app.js

**Output**: All 5 postponed lists show English names

**Dependencies**: T002
**Estimated Time**: 10 minutes

---

## Phase 5: Translation Tasks - Daily Planning Screen (1 comprehensive task)

### T011: Translate entire Daily Planning screen
**File**: `public/app.js` (search for daily planning rendering functions)
**Action**:
- Locate Daily Planning screen rendering code
- Systematically translate ALL Dutch text:
  1. **Page title**: Check if "Dagelijkse Planning" needs translation
  2. **Filter bar**: Translate all filter labels and options
  3. **Date display**: Translate any date-related labels (e.g., "Vandaag" → "Today")
  4. **Action buttons**: Translate all button labels
  5. **Task list headers**: Replace any "Acties" with "Actions"
  6. **Calendar navigation**: Translate month/day names if hardcoded
- This is the most complex screen - be thorough
- Use `replace_all: true` for common strings

**Output**: ENTIRE Daily Planning screen displays in English

**Dependencies**: T002
**Estimated Time**: 20 minutes

**CRITICAL**: User specifically emphasized "Heel het scherm" (entire screen) - verify every element

---

## Phase 6: Translation Tasks - Context Management Screen (3 tasks)

### T012: Translate "Contexten beheer" page title
**File**: `public/app.js` (check title mappings)
**Action**:
- Search for title mapping for 'contextenbeheer' key (already exists around line 1948)
- Verify it maps to "Context Management" (may need update from "Contexten Beheer")
- Also search for any hardcoded "Contexten beheer" string

**Output**: Page title shows "Context Management"

**Dependencies**: T002
**Estimated Time**: 5 minutes

---

### T013: Translate "+ Nieuwe Context" button
**File**: `public/app.js` (search for context add button)
**Action**:
- Search for `'+ Nieuwe Context'` string
- Replace with `'+ New Context'`
- Check both button generation and any modal titles

**Output**: Button shows "+ New Context"

**Dependencies**: T002
**Estimated Time**: 5 minutes

---

### T014: Translate "Aangemaakt" column header
**File**: `public/app.js` (search for context table/list rendering)
**Action**:
- Locate context list/table column headers
- Search for `'Aangemaakt'` string
- Replace with `'Created'`

**Output**: Created date column shows "Created"

**Dependencies**: T002
**Estimated Time**: 5 minutes

---

## Phase 7: Translation Tasks - Search Screen (1 comprehensive task)

### T015: Translate entire Search screen
**File**: `public/app.js` (search for search functionality rendering)
**Action**:
- Locate Search screen/modal rendering code
- Systematically translate ALL Dutch text:
  1. **Search input placeholder**: Translate placeholder text
  2. **Search button**: Translate button label
  3. **Results headers**: Translate all column headers
  4. **Empty state**: Translate "no results" message
  5. **Filter options**: Translate any search filters
  6. **Action buttons**: Translate all action buttons
- This must be 100% English - user said "Maar echt alles" (really everything)
- Check both search input area and results display area

**Output**: ENTIRE Search screen displays in English

**Dependencies**: T002
**Estimated Time**: 20 minutes

**CRITICAL**: User specifically emphasized "Maar echt alles" - no Dutch text can remain

---

## Phase 8: Verification & Deployment

### T016: Execute manual testing from quickstart.md
**File**: `specs/039-jammer-genoeg-zijn/quickstart.md`
**Action**:
- Execute all 6 test scenarios from quickstart.md:
  1. Actions screen (3 areas)
  2. Projects screen (3 areas)
  3. Postponed screen (2 areas)
  4. Daily Planning screen (complete)
  5. Context Management screen (3 areas)
  6. Search screen (complete)
- Execute regression tests (v0.20.9 translations)
- Document any Dutch text still found
- If ANY Dutch found, return to appropriate translation task

**Output**: All tests pass, NO Dutch text visible

**Dependencies**: T003-T015 (all translations complete)
**Estimated Time**: 10 minutes

**GATE**: MUST PASS before proceeding to deployment

---

### T017 [P]: Version bump to v0.20.10
**File**: `package.json`
**Action**:
- Read package.json
- Update version from "0.20.9" to "0.20.10"

**Output**: Version incremented

**Dependencies**: T016 (testing passed)
**Estimated Time**: 2 minutes

---

### T018 [P]: Update changelog with translation details
**File**: `public/changelog.html`
**Action**:
- Read changelog.html
- Add new v0.20.10 entry at top with badge-latest
- Change v0.20.9 badge from badge-latest to badge-fix
- Document all 11 screen areas translated:
  - Actions screen: filter bar, bulk edit button, bulk mode buttons
  - Projects screen: add button, statistics, expanded view
  - Postponed screen: title, list names
  - Daily Planning: complete screen
  - Context Management: title, add button, column header
  - Search: complete screen
- Note this completes the translation work started in v0.20.9

**Output**: Changelog updated with v0.20.10 entry

**Dependencies**: T016 (testing passed)
**Estimated Time**: 5 minutes

---

### T019: Commit and push to feature branch
**File**: N/A (git operations)
**Action**:
- Stage all changes: public/app.js, public/index.html (if modified), package.json, public/changelog.html
- Create descriptive commit message:
  ```
  🌍 TRANSLATION FIX: Complete remaining 11 screen areas - v0.20.10

  **COMPLETED TRANSLATIONS:**
  1. Actions screen: filter bar, bulk edit, bulk buttons
  2. Projects screen: add button, stats, expanded view
  3. Postponed screen: title, all 5 list names
  4. Daily Planning: ENTIRE screen translated
  5. Context Management: title, add button, column
  6. Search: ENTIRE screen translated

  **ALL Dutch text now eliminated from UI**
  - Builds on v0.20.9 foundation
  - 100% English UI achieved
  - Manual testing verified all 11 areas

  Fixes #039 - Complete English UI translation

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- Push to origin 039-jammer-genoeg-zijn
- Vercel will auto-deploy to dev.tickedify.com

**Output**: Changes committed and pushed, staging deployment triggered

**Dependencies**: T017-T018
**Estimated Time**: 3 minutes

---

## Task Summary

**Total Tasks**: 19
**Estimated Total Time**: 2.5-3 hours

### By Phase:
- **Phase 1 (Preparation)**: 2 tasks, 15 min
- **Phase 2 (Actions)**: 3 tasks, 25 min
- **Phase 3 (Projects)**: 3 tasks, 20 min
- **Phase 4 (Postponed)**: 2 tasks, 15 min
- **Phase 5 (Daily Planning)**: 1 task, 20 min
- **Phase 6 (Context Management)**: 3 tasks, 15 min
- **Phase 7 (Search)**: 1 task, 20 min
- **Phase 8 (Verification & Deployment)**: 4 tasks, 20 min

### Parallel Opportunities:
Most tasks are sequential (same file: public/app.js), but these can run in parallel:
- T017 [P] and T018 [P] (different files: package.json, changelog.html)

### Dependencies Graph:
```
T001 (read code)
  ↓
T002 (create reference)
  ↓
T003-T015 (all translations - sequential, same file)
  ↓
T016 (testing - GATE)
  ↓
T017 [P] (version) + T018 [P] (changelog) - can run in parallel
  ↓
T019 (commit & push)
```

### Critical Path:
```
T001-T002 (prep)
  ↓
T003-T015 (translations - must be thorough)
  ↓
T016 (TESTING GATE - must pass 100%)
  ↓
T017-T018 (finalization)
  ↓
T019 (deployment)
```

---

## Validation Checklist

Before marking feature complete:
- [ ] All 11 screen areas translated (T003-T015)
- [ ] quickstart.md tests pass 100% (T016)
- [ ] NO Dutch text visible anywhere in UI
- [ ] v0.20.9 translations still work (regression check)
- [ ] Version bumped to v0.20.10 (T017)
- [ ] Changelog updated (T018)
- [ ] Changes committed and pushed (T019)
- [ ] Staging deployment successful (verify on dev.tickedify.com)

---

## Notes

**Why mostly sequential?**
- All translations in same file (public/app.js) = cannot parallelize
- Risk of merge conflicts if running parallel edits on single file
- Simple string replacements complete quickly anyway

**Testing emphasis**:
- User specifically stressed completeness ("echt alles", "heel het scherm")
- Manual visual testing is PRIMARY verification method
- Must be 100% English - no partial completion acceptable

**BÈTA FREEZE compliance**:
- Deploy ONLY to staging (dev.tickedify.com)
- NO production deployment
- Wait for "BÈTA FREEZE IS OPGEHEVEN" before merging to main

---

## Ready for Execution

These tasks are immediately executable. Each task has:
- ✅ Clear file path
- ✅ Specific action to take
- ✅ Expected output
- ✅ Time estimate
- ✅ Dependency information

**Next Step**: Execute T001 to begin translation work or use `/implement` command for automated execution.
