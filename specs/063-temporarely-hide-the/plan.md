# Implementation Plan: Temporarily Hide Settings & Tutorial Elements

**Branch**: `063-temporarely-hide-the` | **Date**: 2025-06-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/063-temporarely-hide-the/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✅ Spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✅ No NEEDS CLARIFICATION - all technical context known
   ✅ Project Type: web (Vanilla JavaScript frontend + Express.js backend)
3. Fill the Constitution Check section
   ✅ Constitution checks completed
4. Evaluate Constitution Check section
   ✅ No violations - all constitutional principles followed
   ✅ Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   ✅ Research completed (simple UI hiding - no research needed)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   ✅ Phase 1 artifacts generated
7. Re-evaluate Constitution Check section
   ✅ No new violations - design aligns with constitution
   ✅ Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Task generation approach described
   ✅ Ready for /tasks command
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS here. Phase 2 is executed by /tasks command.

## Summary

Temporarily hide three UI elements from all users by commenting out HTML and disabling JavaScript code:
1. Settings menu item (gear icon in navigation)
2. Instruction video link (video icon in navigation)
3. Auto-play tutorial video on first app startup

**Technical Approach**: HTML comment wrapping + JavaScript code block commenting with clear restoration markers. No database changes, no API changes, no refactoring. Pure UI visibility toggle.

## Technical Context

**Language/Version**: JavaScript ES6+ (Vanilla), Node.js 16+, HTML5
**Primary Dependencies**: None (vanilla JavaScript frontend, Express.js backend unchanged)
**Storage**: N/A (no data changes)
**Testing**: Manual UI testing via browser DevTools
**Target Platform**: Web browsers (Chrome, Firefox, Safari)
**Project Type**: web (frontend HTML/JS + backend Express.js)
**Performance Goals**: Zero performance impact (code remains, just hidden)
**Constraints**: Code MUST remain intact for easy restoration
**Scale/Scope**: 3 UI elements in /public/index.html and /public/app.js

**Discovered Implementation Locations**:
1. **Settings menu item**: `/public/index.html` lines 142-145 + `/public/app.js` line 7241 (handler) + line 7996 (screen)
2. **Instruction video link**: `/public/index.html` lines 148-154 + `/public/app.js` lines 572-578 (event listener)
3. **Auto-play video**: `/public/index.html` lines 852-869 (popup) + `/public/app.js` lines 1159-1172 (auto-play logic) + lines 537-656 (OnboardingVideoManager class)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Beta Freeze - Production Stability ✅
- **Compliance**: Feature will be developed on feature branch, merged to staging, tested on dev.tickedify.com
- **No main branch impact**: Changes stay on staging until beta freeze is lifted
- **Status**: PASS

### Staging-First Deployment ✅
- **Compliance**: Feature branch → staging → dev.tickedify.com testing
- **Workflow**: Standard staging-first workflow followed
- **Status**: PASS

### Gespecialiseerde Sub-Agents ✅
- **Compliance**: N/A - simple HTML/JS commenting task, no sub-agent needed
- **Rationale**: This is a straightforward code commenting task (< 30 minutes implementation)
- **Status**: PASS (exemption justified)

### Versioning & Changelog Discipline ✅
- **Compliance**: Will increment patch version (e.g., 1.0.3 → 1.0.4)
- **Changelog**: Will add entry with 🎯 IMPROVEMENT category
- **Status**: PASS

### Deployment Verification Workflow ✅
- **Compliance**: Will use curl -s -L -k for API version checking
- **Timing**: 15-second iterations with 2-minute timeout
- **Status**: PASS

### Test-First via API ✅
- **Compliance**: N/A - this is pure UI visibility testing
- **Testing Approach**: Manual UI verification via browser DevTools
- **Rationale**: No API endpoints involved, only HTML/JS visibility
- **Status**: PASS (exemption justified)

## Project Structure

### Documentation (this feature)
```
specs/063-temporarely-hide-the/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
Tickedify/
├── public/
│   ├── index.html       # HTML comment wrapping for Settings, Video link, Popup
│   └── app.js           # JavaScript commenting for auto-play logic
├── package.json         # Version bump
└── public/changelog.html # Changelog entry
```

**Structure Decision**: Tickedify uses flat public/ directory structure (no src/ separation). This is existing project structure, not changed by this feature.

## Phase 0: Outline & Research

**No research needed** - this is a simple code commenting task with clear implementation approach.

### Technical Decisions Already Known:
1. **Decision**: Use HTML comments to hide Settings menu item and instruction video link
   - **Rationale**: Preserves code exactly as-is, easily reversible by uncommenting
   - **Alternatives considered**: CSS `display: none` (rejected - harder to find and restore)

2. **Decision**: Use JavaScript multi-line comment to disable auto-play logic
   - **Rationale**: Preserves code intact, clearly marked with restoration instructions
   - **Alternatives considered**: Feature flag (rejected - adds unnecessary complexity)

3. **Decision**: Add clear comment markers with "TEMPORARILY HIDDEN - Feature 063"
   - **Rationale**: Makes restoration trivial - search for "Feature 063" and uncomment
   - **Alternatives considered**: No markers (rejected - hard to find later)

**Output**: research.md (minimal - decisions documented above)

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Data Model
**No database entities** - This is pure UI visibility change. No data model needed.

**Output**: data-model.md (documents "N/A - UI-only change")

### 2. API Contracts
**No API changes** - Existing APIs remain unchanged:
- `/api/user/onboarding-status` (still exists, just not called)
- `/api/settings/*` (still exists, just UI hidden)

**Output**: No contracts/ directory needed (no new/changed APIs)

### 3. Test Approach
**Manual UI Testing** via browser DevTools on dev.tickedify.com:
1. Verify Settings menu item not visible: `document.getElementById('settings-link')` returns null or display:none
2. Verify instruction video link not visible: `document.getElementById('openOnboardingVideoLink')` returns null or display:none
3. Verify auto-play disabled: Login as new user, no video popup appears
4. Verify code preservation: Check HTML/JS comments contain restoration instructions
5. Verify restoration works: Create test branch, uncomment code, verify elements reappear

**Output**: quickstart.md with 5 test scenarios

### 4. Agent File Update
Run update script to document this feature in CLAUDE.md:
```bash
cd "/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify"
.specify/scripts/bash/update-agent-context.sh claude
```

**Output**: CLAUDE.md updated with Feature 063 entry

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Read /public/index.html and identify exact line numbers for comment wrapping
2. Read /public/app.js and identify exact line numbers for comment blocks
3. Generate sequential tasks (not parallel - same files edited):
   - Task 1: Wrap Settings menu HTML in comments
   - Task 2: Wrap instruction video link HTML in comments
   - Task 3: Wrap onboarding video popup HTML in comments
   - Task 4: Comment out auto-play logic in app.js
   - Task 5: Add restoration instructions to all comment blocks
   - Task 6: Version bump package.json
   - Task 7: Update changelog.html
   - Task 8: Commit and push to staging
   - Task 9: Verify deployment
   - Task 10: Run quickstart.md test scenarios

**Ordering Strategy**:
- Sequential (not parallel) - all edits in same 2 files
- HTML changes first, then JavaScript, then version/changelog, then deploy
- Testing after deployment verification

**Estimated Output**: 10 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run quickstart.md test scenarios on dev.tickedify.com)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No complexity violations** - This feature follows all constitutional principles:
- ✅ Beta freeze respected (staging only)
- ✅ Staging-first deployment workflow
- ✅ Minimal code modification (comment-only)
- ✅ Easy restoration path (uncomment blocks)
- ✅ No new dependencies or architecture changes

*Table intentionally empty - no violations to justify*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning approach described (/plan command) - ready for /tasks
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md with 10 sequential tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none exist)

---
*Based on Constitution v1.0.1 - See `/.specify/memory/constitution.md`*
