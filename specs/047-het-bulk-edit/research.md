# Research: Bulk Edit Properties Translation

## Overview
This document contains research findings for translating the bulk edit properties modal from Dutch to English. The modal allows users to edit multiple task properties simultaneously (project, date, context, priority, estimated time).

## Current Implementation Analysis

### File Locations
- **HTML Modal**: `/public/index.html` (lines 1183-1230)
- **JavaScript Functions**: `/public/app.js`
  - `populateBulkEditDropdowns()` (lines 357-393)
  - `collectBulkEditUpdates()` (lines 395-429)
  - `showBulkEditPopup()` (lines 431-534)
  - `openBulkEditPopupAsync()` (lines 13897-13963)

### Dutch Text Elements Found

#### HTML Modal (index.html:1183-1230)
1. **Modal Header** (line 1185):
   - Dutch: `"Eigenschappen bewerken voor X taken"`
   - Context: Dynamic header with task count

2. **Form Labels**:
   - Line 1188: `"Project:"` (Already correct)
   - Line 1197: `"Datum:"` → needs translation
   - Line 1202: `"Context:"` (Already correct)
   - Line 1211: `"Prioriteit:"` → needs translation
   - Line 1221: `"Geschatte tijd (minuten):"` → needs translation

3. **Dropdown Options** (Project):
   - Line 1190: `"-- Geen wijziging --"` → needs translation
   - Line 1191: `"Geen project"` → needs translation

4. **Dropdown Options** (Context):
   - Line 1204: `"-- Geen wijziging --"` → needs translation
   - Line 1205: `"Geen context"` → needs translation

5. **Dropdown Options** (Priority):
   - Line 1213: `"-- Geen wijziging --"` → needs translation
   - Line 1214: `"Laag"` → needs translation
   - Line 1215: `"Normaal"` (option value="gemiddeld") → needs translation
   - Line 1216: `"Hoog"` → needs translation

6. **Input Placeholder**:
   - Line 1222: `placeholder="Optioneel"` → needs translation

7. **Buttons**:
   - Line 1226: `"Annuleren"` → needs translation
   - Line 1227: `"Opslaan"` → needs translation

#### JavaScript (app.js)
1. **populateBulkEditDropdowns()** (lines 362-363, 379-380):
   - `'<option value="">-- Geen wijziging --</option>'` (appears twice)
   - `'<option value="null">Geen project</option>'`
   - `'<option value="null">Geen context</option>'`

2. **showBulkEditPopup()** (line 478):
   - Dynamic header text: `Edit properties for ${taskCount} tasks`
   - Already in English! ✅

3. **Toast Messages** (lines 502, 503):
   - `toast.warning('No properties selected');`
   - Already in English! ✅

### Consistency Analysis

#### Existing English Terminology in Tickedify
Based on codebase analysis:
- **Project**: "Project" (correct)
- **Date**: "Date" (used in UI)
- **Context**: "Context" (correct)
- **Priority**: "Priority" (used in API/code)
  - Low: "Low"
  - Normal/Medium: "Medium" or "Normal"
  - High: "High"
- **Time**: "Time" or "Estimated time"
- **Save**: "Save"
- **Cancel**: "Cancel"
- **Optional**: "Optional"
- **No change**: "-- No change --"
- **None**: "None" (for null values)

### Translation Mapping

| Dutch | English | Context |
|-------|---------|---------|
| Eigenschappen bewerken voor X taken | Edit properties for X tasks | Modal header (already done in JS!) |
| Datum | Date | Form label |
| Prioriteit | Priority | Form label |
| Geschatte tijd (minuten) | Estimated time (minutes) | Form label |
| -- Geen wijziging -- | -- No change -- | Dropdown default option |
| Geen project | No project | Dropdown option |
| Geen context | No context | Dropdown option |
| Laag | Low | Priority option |
| Normaal | Normal | Priority option (display text) |
| Hoog | High | Priority option |
| Optioneel | Optional | Input placeholder |
| Annuleren | Cancel | Button |
| Opslaan | Save | Button |

## Technical Decisions

### Decision 1: Maintain Existing English Logic
**Rationale**: The JavaScript function `showBulkEditPopup()` (line 478) already sets the header in English dynamically. We only need to translate the static HTML and JavaScript string constants.

### Decision 2: Priority Value Consistency
**Rationale**: The priority dropdown has:
- Value attribute: `value="gemiddeld"` (backend expects this)
- Display text: "Normaal" → translate to "Normal"

Keep value attributes unchanged (backend contract), only translate display text.

### Decision 3: Placeholder Translation
**Rationale**: The placeholder "Optioneel" should be translated to "Optional" for consistency with rest of application.

### Decision 4: Translation Scope
**Rationale**: Only translate the bulk edit properties modal elements identified above. Do not modify:
- Backend API contracts (value attributes remain Dutch for DB compatibility)
- Console log messages (internal development use)
- Function names or variable names (code maintainability)

## Implementation Approach

### Phase 1: HTML Translation (index.html)
1. Translate modal header (line 1185)
2. Translate form labels (lines 1188, 1197, 1202, 1211, 1221)
3. Translate dropdown options (lines 1190-1191, 1204-1205, 1213-1216)
4. Translate placeholder (line 1222)
5. Translate buttons (lines 1226-1227)

### Phase 2: JavaScript Translation (app.js)
1. Update `populateBulkEditDropdowns()` function:
   - Line 362: Translate "-- Geen wijziging --"
   - Line 363: Translate "Geen project"
   - Line 379: Translate "-- Geen wijziging --"
   - Line 380: Translate "Geen context"

### Phase 3: Verification
1. Visual inspection of modal in browser
2. Test all dropdown options render correctly
3. Verify buttons display correctly
4. Confirm no layout breaks with translated text
5. Test form submission still works (values unchanged)

## Constraints & Considerations

### Layout Constraints
- **Current column width**: Modal uses `.form-group` with fixed label widths
- **English text length**: Most translations are similar or shorter length
- **Potential issues**: "Geschatte tijd (minuten)" → "Estimated time (minutes)" is same length
- **Solution**: Existing CSS should handle translations without modification

### Browser Compatibility
- No browser-specific considerations (pure text translation)
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)

### Testing Approach
- **Manual testing**: Open bulk edit modal and verify all text is English
- **Automated testing**: Playwright test to verify element text content
- **Edge cases**: Test with long project/context names to ensure layout stability

## Dependencies
- None (pure UI translation, no external libraries)

## Risks & Mitigations

### Risk 1: Missed Translation Elements
**Impact**: Medium - Inconsistent UI language
**Mitigation**: Comprehensive grep search + visual testing
**Status**: All elements identified via thorough code review

### Risk 2: Layout Breaking
**Impact**: Low - Text overflow or wrapping
**Mitigation**: English text is similar length to Dutch
**Status**: Low risk, CSS is flexible

### Risk 3: Backend Value Mismatch
**Impact**: High - Data integrity issues
**Mitigation**: Only translate display text, keep value attributes unchanged
**Status**: Mitigated - clear separation of concerns

## Alternatives Considered

### Alternative 1: i18n Library
**Decision**: REJECTED
**Rationale**: Overkill for small translation task. App is English-only currently. Adding i18n library (i18next, etc.) would increase complexity and bundle size for minimal benefit.

### Alternative 2: Separate Language File
**Decision**: REJECTED
**Rationale**: Inline translations are simpler and more maintainable for small scope. No plans for multi-language support in near future.

### Alternative 3: Backend Translation API
**Decision**: REJECTED
**Rationale**: Pure frontend text changes, no backend involvement needed.

## Success Criteria
1. All Dutch text in bulk edit modal translated to English
2. Modal layout remains intact (no wrapping or overflow)
3. All dropdowns populate correctly with translated options
4. Form submission works unchanged (backend values preserved)
5. Consistent terminology with rest of Tickedify application
6. Manual testing passes on dev.tickedify.com staging
7. Playwright automated tests pass (if implemented)

## Research Complete
All unknowns resolved. Ready for Phase 1: Design & Contracts.
