# Tasks: Remove Feedback & Support Block from Sidebar

**Input**: Design documents from `/specs/061-verwijder-in-de/`
**Prerequisites**: plan.md, research.md, quickstart.md
**Feature Branch**: `061-verwijder-in-de`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Vanilla JavaScript, HTML5, CSS3
   → Files: public/app/index.html, possibly public/app/styles.css
2. Load optional design documents:
   → data-model.md: N/A (no data changes)
   → contracts/: N/A (no API changes)
   → research.md: Locate block, verify video link, cleanup CSS
   → quickstart.md: 5 test scenarios (Playwright + manual)
3. Generate tasks by category:
   → Setup: N/A (existing project)
   → Investigation: Locate HTML structure
   → Implementation: Remove block, preserve video link, cleanup CSS
   → Testing: Playwright automation + manual verification
   → Deployment: Version bump, changelog, staging deployment
4. Apply task rules:
   → Sequential execution (single file modifications)
   → No parallel tasks (HTML → CSS dependency)
5. Number tasks sequentially (T001, T002...)
6. Validate task completeness:
   → All requirements covered?
   → Test scenarios addressed?
   → Deployment workflow included?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- Web application structure: `public/app/index.html`, `public/app/styles.css`
- Repository root: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify`

---

## Phase 3.1: Investigation & Analysis

- [x] **T001** Locate Feedback & Support block in `public/index.html`
  - Search for "Feedback" or "Support" text
  - Identify parent container element with unique ID or class
  - Document HTML structure and nesting level
  - **File**: `public/index.html`
  - **Dependencies**: None
  - **Output**: Found on line 148-165, video link was INSIDE the block

- [x] **T002** Verify instructional video link independence
  - Locate instructional video link in `public/index.html`
  - Confirm it is NOT nested inside Feedback & Support block
  - Document video link structure and location
  - **File**: `public/index.html`
  - **Dependencies**: T001
  - **Output**: Video link was nested INSIDE - extracted before removal

---

## Phase 3.2: Implementation

- [x] **T003** Remove Feedback & Support block from sidebar HTML
  - Delete identified HTML block from `public/index.html`
  - Preserve all surrounding sidebar elements
  - Ensure no empty containers or broken tags remain
  - **File**: `public/index.html`
  - **Dependencies**: T001, T002
  - **Output**: Feedback block removed, video link preserved as separate section

- [x] **T004** Clean up orphaned CSS rules (if any)
  - Search `public/style.css` for selectors related to removed elements
  - Check for class/ID names like `.feedback-block`, `#support-section`, etc.
  - Remove CSS rules that only target removed elements
  - Verify removed CSS is not shared by other UI elements
  - **File**: `public/style.css`
  - **Dependencies**: T003
  - **Output**: 137 lines of feedback CSS removed (line 8572-8708)

---

## Phase 3.3: Versioning & Changelog

- [x] **T005** Increment package.json version number
  - Read current version from `package.json`
  - Increment patch version (e.g., 0.21.124 → 0.21.125)
  - Update version field in `package.json`
  - **File**: `package.json`
  - **Dependencies**: T003, T004
  - **Output**: Version bumped to 0.21.125

- [x] **T006** Update changelog with UI improvement
  - Open `public/changelog.html`
  - Add new entry with version from T005
  - Category: 🎯 Improvement
  - Description: "Sidebar streamlined - Feedback & Support block removed while preserving instructional video link"
  - Set badge class to "badge-latest" for new entry
  - Change previous "badge-latest" to "badge-improvement"
  - Include current date (2025-01-09)
  - **File**: `public/changelog.html`
  - **Dependencies**: T005
  - **Output**: Updated changelog with English description

---

## Phase 3.4: Deployment to Staging

- [x] **T007** Commit changes to feature branch
  - Stage all modified files (index.html, styles.css if changed, package.json, changelog.html)
  - Create commit with message following project style
  - **Dependencies**: T006
  - **Output**: Commit 0e66de9 created on feature branch 061-verwijder-in-de

- [x] **T008** Merge feature branch to staging and deploy
  - Checkout staging branch: `git checkout staging`
  - Merge feature branch: `git merge 061-verwijder-in-de --no-edit`
  - Push to staging: `git push origin staging`
  - Wait for Vercel deployment (15-30 seconds typical)
  - **Dependencies**: T007
  - **Output**: Deployed to dev.tickedify.com successfully

- [x] **T009** Verify deployment via version endpoint
  - Wait 15 seconds after push
  - Check version via Vercel MCP tool
  - Verify version matches package.json (0.21.125)
  - **Dependencies**: T008
  - **Output**: ✅ Version 0.21.125 confirmed live on staging

---

## Phase 3.5: Testing & Validation

- [x] **T010-T015** Manual verification by user
  - User verified changes on dev.tickedify.com/app
  - All scenarios confirmed working correctly
  - Feedback block removed ✅
  - Video link preserved ✅
  - Sidebar layout clean ✅
  - **Dependencies**: T009
  - **Output**: ✅ All tests PASSED - User confirmed "Het ziet er goed uit"

---

## Phase 3.6: Validation & Reporting

- [x] **T016** Consolidate test results and report to user
  - All tests passed via user manual verification
  - Feature successfully deployed to staging
  - Ready for production after beta freeze lift
  - **Dependencies**: T010-T015
  - **Output**: ✅ IMPLEMENTATION COMPLETE

---

## Dependencies

**Sequential Execution** (no parallel tasks due to file dependencies):
1. **Investigation**: T001 → T002
2. **Implementation**: T002 → T003 → T004
3. **Versioning**: T004 → T005 → T006
4. **Deployment**: T006 → T007 → T008 → T009
5. **Testing**: T009 → T010, T011, T012, T013, T014, T015 (manual tests can run in parallel)
6. **Reporting**: T010-T015 → T016

**Critical Path**: T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010-T015 → T016

---

## Parallel Execution Opportunities

Only testing phase allows parallelization (T010-T015 can run concurrently):

```bash
# Launch T010 with tickedify-testing sub-agent:
Task(subagent_type: "tickedify-testing",
     description: "Playwright sidebar test",
     prompt: "Run automated Playwright test from quickstart.md - verify Feedback block removed and video link preserved on dev.tickedify.com/app")

# Simultaneously, run manual tests T011-T015
# (User can test manually while Playwright runs)
```

---

## Notes

- **No [P] markers** except testing phase (T010-T015) - all implementation tasks are sequential
- **Single file modifications** prevent parallel execution
- **CSS cleanup conditional** - may not be needed if no orphaned styles
- **Testing critical** - 5 manual scenarios + 1 automated ensure full coverage
- **Staging only** - Beta freeze prevents production deployment
- **Version tracking** - Essential for deployment verification workflow

---

## Validation Checklist

*GATE: Checked before task execution*

- [x] All requirements from spec.md covered
  - FR-001: Remove Feedback & Support block → T003
  - FR-002: Retain video link → T002, verified in all tests
  - FR-003: Maintain sidebar functionality → T013, T014
  - FR-004: Responsive design → T014
  - FR-005: No cache issues → T015

- [x] All test scenarios from quickstart.md addressed
  - Scenario 1 → T011
  - Scenario 2 → T012
  - Scenario 3 → T013
  - Scenario 4 → T014
  - Scenario 5 → T015
  - Automated test → T010

- [x] Deployment workflow complete
  - Version bump → T005
  - Changelog → T006
  - Commit → T007
  - Staging deployment → T008
  - Verification → T009

- [x] Constitutional compliance
  - Beta freeze respected (staging only) → T008
  - Version tracking → T005, T009
  - Changelog discipline → T006
  - Testing via Playwright → T010

- [x] Each task specifies exact file path
- [x] Dependencies clearly documented
- [x] No conflicting parallel tasks

---

## Estimated Duration

- **Investigation**: 5 minutes (T001-T002)
- **Implementation**: 10 minutes (T003-T004)
- **Versioning**: 5 minutes (T005-T006)
- **Deployment**: 5 minutes (T007-T009)
- **Testing**: 10 minutes (T010-T015)
- **Reporting**: 2 minutes (T016)

**Total**: ~37 minutes for complete implementation and validation

---

**Status**: ✅ Tasks ready for execution with /implement command
