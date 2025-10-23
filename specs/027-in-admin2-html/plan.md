# Implementation Plan: Message Preview Button

**Branch**: `027-in-admin2-html` | **Date**: 2025-10-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/027-in-admin2-html/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✓ Spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✓ Project Type: Web application (Vanilla JS frontend + Node.js backend)
   ✓ Structure Decision: Existing monolithic structure with public/ folder
3. Fill the Constitution Check section
   → Constitution template found - using Tickedify-specific patterns
4. Evaluate Constitution Check section
   ✓ No violations - frontend-only feature using existing patterns
   ✓ Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   → Resolving 2 NEEDS CLARIFICATION items from spec
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → Generate UI component contracts for preview functionality
7. Re-evaluate Constitution Check section
   → Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Toevoegen van preview functionaliteit voor berichten in het admin panel (admin2.html). Admin gebruikers kunnen een preview zien van hoe berichten eruit zien voor eindgebruikers, zowel vanuit de berichtenlijst als vanuit het detail scherm. De preview toont het bericht in dezelfde stijl en formatting als de message-modal.js rendering, inclusief type badges, markdown parsing, en button styling.

## Technical Context

**Language/Version**: JavaScript ES6+ (Vanilla JS), Node.js 18+
**Primary Dependencies**:
  - Frontend: Vanilla JavaScript (geen frameworks), Font Awesome icons
  - Backend: Express.js, PostgreSQL (Neon)
  - Message rendering: public/js/message-modal.js (existing)
  - Admin interface: public/admin2.html (existing)
**Storage**: PostgreSQL database (messages table) - read-only voor preview
**Testing**: Manual testing on staging (dev.tickedify.com), geen automated tests
**Target Platform**: Web browsers (Chrome, Safari, Firefox), responsive design
**Project Type**: Web application - monolithic structure (public/ folder frontend + server.js backend)
**Performance Goals**: Instant preview rendering (<100ms), geen API calls voor preview
**Constraints**:
  - BÈTA FREEZE actief - alleen staging deployment
  - Moet werken met bestaande message-modal.js styling
  - Preview moet identiek zijn aan eindgebruiker weergave
**Scale/Scope**: Single admin interface, ~10-50 berichten verwacht

**Architecture Details**:
- **Existing message rendering**: `public/js/message-modal.js` (lijn 42-142)
  - `showMessage(message)` functie rendert berichten met type-specific styling
  - `parseMarkdownLinks(text)` functie (lijn 158-231) voor markdown → HTML
  - `getMessageIcon(type)` (lijn 145-155) voor Font Awesome icons
  - Type classes: `message-information`, `message-educational`, `message-warning`, etc.

- **Admin message list**: `public/admin2.html` (lijn 2265-2336)
  - `renderMessagesList(messages)` toont berichtenlijst in tabel
  - `getTypeBadge(type)` (lijn 2339-2355) genereert type badges
  - Bestaande buttons: Edit (✏️), Duplicate (📋), Delete (🗑️)

- **Admin message detail**: `openEditMessageModal(messageId)` (lijn 2045+)
  - Modal voor bewerken van berichten
  - Form fields voor title, message, type, targeting, triggers, etc.

**Technical Decisions Made**:
1. **Preview Display Method**: Modal popup (consistent met bestaande modals in admin2.html)
2. **Message Formatting**: Berichten ondersteunen markdown via `parseMarkdownLinks()` functie
3. **Rendering Strategy**: Hergebruik bestaande `showMessage()` logica uit message-modal.js
4. **No API Required**: Preview is client-side rendering van bestaande data

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Tickedify-Specific Checks**:
- ✅ **Vanilla JavaScript**: No frameworks, consistent with existing codebase
- ✅ **Reuse existing patterns**: Leverages message-modal.js rendering logic
- ✅ **No database changes**: Preview is read-only, no schema modifications
- ✅ **Staging first**: Development on staging branch, testing on dev.tickedify.com
- ✅ **Version tracking**: package.json version bump required
- ✅ **Changelog update**: Entry in public/changelog.html required

**Status**: PASS - No constitutional violations, follows existing Tickedify patterns

## Project Structure

### Documentation (this feature)
```
specs/027-in-admin2-html/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command) - UI components only
├── quickstart.md        # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
public/
├── admin2.html          # Admin interface - add preview buttons and modal
├── js/
│   └── message-modal.js # Existing message rendering - reuse for preview
└── style.css            # Shared styles - may need preview-specific overrides

server.js                # Backend - no API changes needed (preview is client-side)
```

**Structure Decision**: Existing monolithic web app structure - all frontend in public/ folder

## Phase 0: Outline & Research

**Unknowns from spec (NEEDS CLARIFICATION items)**:

1. **FR-007: Preview Display Method**
   - **Decision**: Modal popup overlay
   - **Rationale**:
     - Consistent met bestaande admin2.html modals (message create/edit)
     - Allows full preview van message formatting zonder context switch
     - Can reuse existing message-modal styling from main app
   - **Alternatives considered**:
     - Inline expansion: Zou tabel layout breken, te beperkte ruimte
     - Separate pane: Adds complexity, inconsistent met bestaande UI patterns
     - New tab: Breekt workflow, vereist extra window management

2. **FR-011: Message Formatting Support**
   - **Decision**: Markdown support via existing `parseMarkdownLinks()` functie
   - **Rationale**:
     - message-modal.js implementeert al markdown parsing (lijn 158-231)
     - Ondersteunt: links, bold, italic, code, lists, headers, highlights
     - XSS protection ingebouwd via HTML escaping
   - **Alternatives considered**:
     - Plain text only: Te beperkt, bestaande berichten gebruiken al markdown
     - Full HTML: Security risk, overkill voor use case
     - External library: Adds dependency, existing parser is voldoende

**Best Practices Research**:

1. **Preview Modal Implementation**
   - Reuse existing `.message-modal` class structure
   - Clone message-modal HTML structure in admin2.html
   - Use same CSS classes for consistent styling
   - Add `preview-mode` class to distinguish from live messages

2. **Data Flow**:
   - **List view**: Click preview → extract message data from row → render in modal
   - **Detail view**: Click preview → extract form field values → render in modal
   - No API calls required - all data available client-side

3. **Styling Consistency**:
   - Import same Font Awesome icons
   - Use same type-specific classes (message-information, message-warning, etc.)
   - Apply same markdown rendering rules
   - Match button and badge styling

**Output**: research.md (see file)

## Phase 1: Design & Contracts

### UI Components (data-model.md)

**Component: Preview Modal**
- **Purpose**: Display message preview in end-user format
- **Structure**: Clone of message-modal from index.html
- **State**: Message data (title, body, type, button config)
- **Lifecycle**: Show on button click → Render message → Close on dismiss

**Component: Preview Button (List View)**
- **Location**: Message table row actions (admin2.html lijn 2316-2332)
- **Trigger**: Click → Extract message data from row → Open preview modal
- **Icon**: 👁️ (eye emoji, consistent met Tickedify style)

**Component: Preview Button (Detail View)**
- **Location**: Message edit modal footer/header
- **Trigger**: Click → Extract form values → Open preview modal
- **Label**: "Preview" button next to Submit button

### Contracts (UI Interaction Contracts)

**Contract 1: List View Preview**
```javascript
// Input: Message object from table row
{
  id: number,
  title: string,
  message: string,
  message_type: 'information' | 'educational' | 'feature' | 'tip' | 'warning' | 'important',
  button_label?: string,
  button_action?: 'navigate' | 'external',
  button_target?: string,
  dismissible: boolean,
  snoozable: boolean
}

// Action: renderPreview(messageData)
// Output: Preview modal displayed with exact end-user rendering
```

**Contract 2: Detail View Preview**
```javascript
// Input: Form field values from edit modal
{
  title: formField('#msg-title').value,
  message: formField('#msg-message').value,
  message_type: formField('#msg-type').value,
  button_label: formField('#msg-button-label').value,
  button_action: formField('#msg-button-action').value,
  button_target: formField('#msg-button-target').value,
  dismissible: formField('#msg-dismissible').checked,
  snoozable: formField('#msg-snoozable').checked
}

// Action: renderPreview(formData)
// Output: Preview modal with unsaved changes reflected
```

**Contract 3: Preview Modal Rendering**
```javascript
// Reuse existing message-modal.js functions:
// - showMessage(message) - core rendering logic
// - parseMarkdownLinks(text) - markdown → HTML
// - getMessageIcon(type) - type → icon class

// Override behaviors for preview mode:
// - Disable dismiss tracking (no API call)
// - Disable snooze tracking (no API call)
// - Disable button action execution (just close modal)
// - Show "PREVIEW MODE" indicator
```

### Quickstart Test Scenario (quickstart.md)

**Test 1: List View Preview**
1. Navigate naar admin2.html → Berichten scherm
2. Klik 👁️ preview button op een bericht in de lijst
3. Verify: Preview modal opent met correcte styling en content
4. Verify: Type badge matches bericht type
5. Verify: Markdown rendering works (bold, links, etc.)
6. Klik "Sluiten" → modal sluit

**Test 2: Detail View Preview**
1. Open edit modal voor bestaand bericht
2. Wijzig title naar "TEST PREVIEW"
3. Klik "Preview" button (zonder opslaan)
4. Verify: Preview toont nieuwe title "TEST PREVIEW"
5. Verify: Unsaved changes zijn zichtbaar in preview
6. Sluit preview → wijzigingen zijn niet opgeslagen

**Test 3: Empty Content Edge Case**
1. Create new message met lege body
2. Klik preview
3. Verify: Preview toont gracefully (geen errors)
4. Verify: "No content" message of empty state

**Output**: data-model.md, quickstart.md (see files)

### CLAUDE.md Update (Not executed - constitution template only)

*Note: Constitution was a template. Tickedify uses CLAUDE.md for project instructions.*
*CLAUDE.md is manually maintained - no automatic update during /plan phase.*

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **UI Component Tasks**:
   - Add preview modal HTML to admin2.html
   - Add preview button to message list table
   - Add preview button to edit modal

2. **JavaScript Function Tasks**:
   - Extract message data from table row
   - Extract form data from edit modal
   - Render preview using showMessage() logic
   - Handle preview modal open/close

3. **Styling Tasks**:
   - Import message-modal CSS to admin2.html
   - Add preview-mode specific overrides
   - Ensure responsive design

4. **Testing Tasks**:
   - Test list view preview
   - Test detail view preview
   - Test edge cases (empty content, long text, special chars)

**Ordering Strategy**:
1. Phase 0: HTML structure (modal markup)
2. Phase 1: List view preview button + function
3. Phase 2: Detail view preview button + function
4. Phase 3: Styling and edge cases
5. Phase 4: Testing on staging

**Estimated Output**: 12-15 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md on staging branch)
**Phase 5**: Validation (manual testing on dev.tickedify.com)

**Deployment Notes**:
- ⚠️ **BÈTA FREEZE ACTIVE** - NO production deployment
- ✅ Staging deployment allowed (dev.tickedify.com)
- ✅ Version bump in package.json required
- ✅ Changelog entry in public/changelog.html required
- ❌ NO git push to main branch until freeze lift

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No complexity violations - feature follows existing Tickedify patterns.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - 2 NEEDS CLARIFICATION resolved
- [x] Phase 1: Design complete (/plan command) - UI components, contracts, quickstart
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [x] Phase 3: Tasks generated (/tasks command) - 13 tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

**Artifacts Generated**:
- ✅ research.md - Technical decisions and alternatives evaluated
- ✅ data-model.md - UI component structures and JavaScript functions
- ✅ quickstart.md - 11 comprehensive test scenarios
- ✅ plan.md - Complete implementation plan
- ✅ tasks.md - 13 implementation tasks with dependencies

---
*Based on Tickedify CLAUDE.md development guidelines*
