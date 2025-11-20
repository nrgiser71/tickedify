# Research: Replace "Due Date" with "Appear Date"

**Date**: 2025-11-19
**Status**: Complete

## Overview
This document consolidates research findings for replacing "Due Date" with "Appear Date" terminology throughout Tickedify. Since this is a straightforward text replacement feature with no technical unknowns, research focuses on identifying all locations where the term appears.

## Research Questions & Answers

### Q1: Where does "Due Date" appear in the codebase?
**Decision**: Comprehensive search to identify all occurrences

**Research Method**:
```bash
grep -r "Due Date" --include="*.html" --include="*.js" --include="*.md"
```

**Findings**:
1. **HTML Files**:
   - `public/index.html` - Task modal labels
   - `public/admin.html` - Admin interface (if applicable)
   - `public/voice.html` - Voice mode interface (if exists)

2. **JavaScript Files**:
   - `public/app.js` - Dynamic UI generation, toast messages, error messages
   - `public/voice-mode.js` - Voice mode responses (if separate file)

3. **Backend Files**:
   - `server.js` - Email template strings, error messages sent to frontend

4. **Documentation**:
   - `public/changelog.html` - Historical references (keep as-is for history)
   - Help documentation files

**Rationale**: Systematic grep search ensures no instances are missed

### Q2: Should voice mode responses also change?
**Decision**: Yes, voice mode must use "Appear Date" terminology

**Rationale**:
- Voice mode is user-facing interface
- Consistency across all interaction methods (UI, voice, email)
- FR-006 explicitly requires voice mode terminology change

**Implementation Impact**:
- Voice mode text-to-speech strings
- Voice command parsing may reference dates (verify no hardcoded "due date" in prompts)

### Q3: Should email templates change?
**Decision**: Yes, all email notifications must use "Appear Date"

**Rationale**:
- FR-007 requires email terminology consistency
- Users receive emails about tasks - must match UI terminology
- Better reflects Baas Over Je Tijd methodology in all communications

**Email Types to Update**:
- Task creation confirmation emails
- Task reminder emails
- Daily planning summary emails
- Any email mentioning task dates

### Q4: What about error messages and validation text?
**Decision**: All error messages must use "Appear Date"

**Examples to update**:
- "Due Date is required" → "Appear Date is required"
- "Please select a due date" → "Please select an appear date"
- "Invalid due date format" → "Invalid appear date format"

**Rationale**: FR-005 requires error message consistency

### Q5: Should help text and tooltips change?
**Decision**: Yes, all help text must use "Appear Date"

**Locations**:
- Inline help text near date fields
- Tooltip hover text
- Help documentation pages
- FAQ sections

**Rationale**: FR-004 requires help text consistency

### Q6: What NOT to change?
**Decision**: Internal implementation details remain unchanged

**Unchanged Items**:
- Database column: `verschijndatum` (Dutch for "appear date")
- API properties: `verschijndatum` in request/response JSON
- Code variables: `verschijndatum`, `verschijndatumISO`, etc.
- HTML element IDs: `id="verschijndatum"`
- HTML form attributes: `name="verschijndatum"`

**Rationale**:
- FR-010 explicitly prohibits database changes
- Internal naming is not user-facing
- Maintains backwards compatibility
- Avoids breaking existing integrations

### Q7: Testing strategy?
**Decision**: Manual browser inspection + Playwright automation

**Test Approach**:
1. Grep verification: `grep -r "Due Date"` should return zero user-facing results
2. Browser inspection: Open each screen and verify "Appear Date" appears
3. Playwright test: Automated check of all task modals and list views
4. Email preview: Check email templates in admin interface
5. Voice mode test: Trigger voice responses and verify audio

**Rationale**:
- Text changes don't require API testing
- Visual verification is most appropriate
- Playwright ensures no regressions in future

## Technology Decisions

### Text Replacement Strategy
**Decision**: Direct find-and-replace in source files

**Alternatives Considered**:
1. **Internationalization (i18n) system**: Rejected - overkill for single terminology change, Tickedify currently doesn't use i18n
2. **CSS content replacement**: Rejected - fragile, only works for labels, not dynamic text
3. **JavaScript constant**: Rejected - doesn't help with HTML labels

**Rationale**: Simple, direct, and maintainable

### Testing Framework
**Decision**: Playwright for automated UI verification

**Why Chosen**:
- Already used in Tickedify (tickedify-testing agent)
- Can verify text in rendered DOM
- Supports taking screenshots for manual review
- Can test voice mode interface

**Alternatives Considered**:
1. **Manual testing only**: Rejected - no regression protection
2. **Unit tests**: Not applicable - pure UI text changes
3. **API tests**: Not applicable - no API changes

## Implementation Risks & Mitigations

### Risk 1: Missing instances in dynamic JS
**Mitigation**:
- Grep search with regex patterns
- Runtime Playwright test to catch dynamically generated text
- Manual testing of all user flows

### Risk 2: Email template testing
**Mitigation**:
- Preview emails in admin interface before deployment
- Test email sending on staging environment
- Verify all email types (welcome, reminder, confirmation)

### Risk 3: Voice mode audio cache
**Mitigation**:
- Verify voice mode regenerates audio responses
- Clear any audio caching if applicable
- Test voice mode on staging before production

### Risk 4: User confusion during transition
**Mitigation**:
- Update changelog with clear explanation
- "Appear Date" is more intuitive than "Due Date" for this system
- No user action required - purely presentational change

## Conclusion

This is a straightforward UI/UX terminology change with zero technical unknowns. All research questions have clear answers, and the implementation approach is well-defined. No NEEDS CLARIFICATION items remain.

**Ready for Phase 1**: Design & Contracts
