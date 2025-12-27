# Quickstart: Search Loading Indicator Testing

**Feature**: 077-als-je-in
**Environment**: Staging (dev.tickedify.com)

## Prerequisites
- Access to dev.tickedify.com (Vercel authentication required)
- Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9

## Test Scenarios

### Scenario 1: Direct Search Icon Click
1. Navigate to `dev.tickedify.com/app`
2. Login with test credentials
3. Click the search icon (magnifying glass) in the sidebar
4. **Expected**: Immediately see a loading indicator in the results area
5. **Expected**: Loading indicator disappears when search form is fully ready
6. **Expected**: Search input is focused and ready for typing

### Scenario 2: Sidebar Search with Pre-filled Term
1. Type "test" in the sidebar search input (if present)
2. Press Enter
3. **Expected**: Search screen opens with loading indicator
4. **Expected**: Loading transitions to search results (or "no results" message)

### Scenario 3: Manual Search Execution
1. Open search screen via sidebar icon
2. Wait for loading indicator to clear
3. Type "project" in the search input
4. Click Search button or press Enter
5. **Expected**: Loading indicator appears in results area
6. **Expected**: Results display after search completes

### Scenario 4: Empty Search Submission
1. Open search screen
2. Click Search with empty input
3. **Expected**: No loading indicator (empty search is rejected immediately)

### Scenario 5: Filter Toggle During Search
1. Open search screen
2. Type a search term
3. Toggle one of the list filters (e.g., "Completed")
4. Press Search
5. **Expected**: Loading indicator shows while filtering results

## Validation Checklist
- [ ] Loading indicator is visible immediately on screen open
- [ ] Loading indicator has clear spinner animation
- [ ] Loading text is user-friendly ("Preparing search..." or similar)
- [ ] Loading clears when interface is ready
- [ ] Search-specific loading ("Searching...") works during actual search
- [ ] No flickering or jarring transitions
- [ ] Mobile responsive (test on smaller viewport)

## Success Criteria
All 5 scenarios pass without errors, and loading states are clearly visible and timed appropriately.
