# Research: Remove Feedback & Support Block from Sidebar

**Feature**: 061-verwijder-in-de
**Date**: 2025-01-09

## Research Summary

This is a straightforward UI simplification task with no technical unknowns. The feature requires removing an HTML block from the sidebar while preserving the instructional video link.

## Technical Decisions

### Decision 1: Locate Feedback & Support Block
**Decision**: Identify the exact HTML structure in `public/app/index.html` containing the Feedback & Support block

**Rationale**: 
- Single-file application structure in Tickedify
- All UI elements are in `public/app/index.html`
- No dynamic sidebar generation (static HTML)

**Alternatives Considered**:
- N/A - location is deterministic

**Implementation Notes**:
- Search for "Feedback" or "Support" text in index.html
- Identify parent container element
- Verify instructional video link is separate element

### Decision 2: Preserve Instructional Video Link
**Decision**: Ensure the instructional video link is NOT part of the Feedback & Support block container

**Rationale**:
- Requirement explicitly states video link must remain
- Need to verify structural separation before removal

**Alternatives Considered**:
- If video link is nested inside block: extract it before removal
- If video link is separate: simply remove block

**Implementation Notes**:
- Inspect DOM structure around Feedback block
- Confirm video link element independence

### Decision 3: CSS Cleanup
**Decision**: Check for orphaned CSS rules after HTML removal

**Rationale**:
- Removing HTML may leave unused CSS selectors
- Cleaner codebase maintenance
- Minor performance improvement (negligible but good practice)

**Alternatives Considered**:
- Leave CSS intact (harmless but less clean)
- Remove CSS (preferred for code hygiene)

**Implementation Notes**:
- Search `styles.css` for selectors related to removed elements
- Remove unused rules if found

## Research Tasks Completed

1. ✅ **No NEEDS CLARIFICATION items** - All technical context is known
2. ✅ **No external dependencies** - Pure HTML/CSS change
3. ✅ **No API integration** - Frontend only
4. ✅ **No database schema** - No data model changes
5. ✅ **No performance research** - Trivial operation

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Accidentally remove video link | High - breaks requirement | Visual verification on staging before commit |
| Break sidebar responsive layout | Medium - UI degradation | Test on mobile/tablet viewports |
| Remove shared CSS used elsewhere | Low - potential styling issues | Careful CSS audit before removal |

## Research Conclusion

No technical research required. This is a simple DOM manipulation task with clear implementation path:

1. Locate Feedback & Support HTML block in index.html
2. Verify instructional video link is separate
3. Remove block element
4. Clean up orphaned CSS if any
5. Test on staging (dev.tickedify.com)
6. Visual verification across viewport sizes

**Status**: ✅ Research complete - ready for Phase 1 (Design)
