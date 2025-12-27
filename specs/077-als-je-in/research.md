# Research: Search Loading Indicator

**Feature**: 077-als-je-in
**Date**: 2025-12-27

## Current Implementation Analysis

### Search Interface Location
- **File**: `public/app.js`
- **Function**: `showZoekInterface()` at lines 9383-9467
- **Event binding**: `bindZoekEvents()` at lines 9470-9487
- **Search execution**: `performSearch()` at lines 9490-9569

### Current User Flow
1. User clicks search icon in sidebar
2. `openTool('zoeken')` is called (line 2848)
3. `showZoekInterface()` renders the search form
4. Events are bound via `bindZoekEvents()`
5. **Gap**: No visual feedback during steps 2-4
6. User must interact with the search form to see any activity

### Existing Loading Patterns

**LoadingManager Class** (`app.js:1915-2172`):
| Method | Use Case | Visual |
|--------|----------|--------|
| `loading.show()` | Global blocking operations | Full-screen overlay |
| `loading.setSectionLoading(el)` | Section-specific loading | Inline spinner |
| `loading.showSkeleton(el, count)` | List loading | Skeleton placeholders |

**CSS Classes**:
- `.loading` - Basic loading text styling
- `.loading-inline` - Inline spinner with text
- `.loading-spinner-small` - 16px animated spinner

### Decision: Use Inline Loading with Spinner

**Chosen approach**: Show search results container immediately with inline loading indicator

**Why this approach**:
1. Matches existing UI patterns (consistent UX)
2. Non-blocking (user can still see search form structure)
3. Clear visual feedback (spinner + text)
4. Simple implementation (single HTML/JS change)

**Rejected alternatives**:
| Alternative | Rejection Reason |
|-------------|------------------|
| Global overlay | Too intrusive for small operation |
| Skeleton loaders | Overkill for initial state |
| Button loading state | Doesn't show overall screen readiness |

## Implementation Decision

Add initial loading state to `showZoekInterface()` that displays in the results container area, providing immediate visual feedback when the search screen opens. The loading state will use existing `.loading-inline` CSS class for consistency.

## Files to Modify

1. `public/app.js:9413-9464` - Add loading state to initial HTML
2. Optional: `public/style.css` if additional styling needed

## No NEEDS CLARIFICATION Remaining
All implementation details are clear and decided.
