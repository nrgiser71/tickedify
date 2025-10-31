# Research: Bulk Edit Translation to English

**Feature**: 046-bij-een-bulk
**Date**: 2025-10-31

## Problem Statement
The bulk edit interface contains mixed Dutch and English text. Specifically:
- "Opvolgen" button label is in Dutch
- Day-of-week names (Maandag, Dinsdag, etc.) are in Dutch

This creates inconsistency as the rest of the application is in English.

## Code Locations Identified

### 1. Day-of-Week Array (Dutch)
**File**: `public/app.js`
**Line**: 4757
**Current Code**:
```javascript
const dagenVanDeWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
```

**Used By**:
- `getWeekdagKnoppen()` function (line 4754)
- Called from `toonActiesMenu()` for individual task menus (line 4795)
- Called from `getBulkVerplaatsKnoppen()` for bulk edit buttons (line 12659)

### 2. "Opvolgen" Button in Bulk Edit
**File**: `public/app.js`
**Line**: 12667
**Current Code**:
```javascript
<button onclick="window.bulkVerplaatsNaar('opvolgen')" class="bulk-action-btn">Opvolgen</button>
```

**Context**: Part of `getBulkVerplaatsKnoppen()` method that generates bulk action buttons for the actions list.

## Translation Decisions

### 1. Day-of-Week Translations
**Decision**: Use standard English day names
**Rationale**:
- Standard across all English applications
- Matches existing English UI conventions
- Clear and unambiguous

**Translations**:
- Zondag → Sunday
- Maandag → Monday
- Dinsdag → Tuesday
- Woensdag → Wednesday
- Donderdag → Thursday
- Vrijdag → Friday
- Zaterdag → Saturday

### 2. "Opvolgen" Translation
**Decision**: Translate to "Follow-up"
**Rationale**:
- "Opvolgen" means "to follow up" or "to track"
- "Follow-up" is the standard English term for tasks requiring future attention
- Matches task management terminology used in similar applications
- The database field name is already 'opvolgen' (no database changes needed)

**Alternative Considered**: "Track", "Monitor", "Watch"
**Why Rejected**: "Follow-up" is more specific to task management context and clearly indicates the purpose of the list (tasks requiring follow-up action).

## No Additional Research Required

**Why**: This is a straightforward text translation task with:
- Clear translation targets identified in code
- Standard English equivalents available
- No technical dependencies or API changes
- No database schema modifications needed
- No new functionality being added

## Implementation Scope

**Changes Required**:
1. Update `dagenVanDeWeek` array in `public/app.js` (line 4757)
2. Update "Opvolgen" button text in `public/app.js` (line 12667)

**No Changes Required**:
- Database (lijst field values remain 'opvolgen')
- API endpoints (backend unchanged)
- CSS styling (classes remain the same)
- JavaScript functionality (onclick handlers unchanged)

## Testing Approach

**Verification Method**: Visual inspection on dev.tickedify.com after staging deployment

**Test Cases**:
1. Select multiple tasks in actions list
2. Open bulk edit interface
3. Verify day names display in English (Monday, Tuesday, etc.)
4. Verify "Follow-up" button displays instead of "Opvolgen"
5. Click translated buttons to verify functionality preserved

## Alternatives Considered

### Alternative 1: Internationalization (i18n)
**Description**: Implement full i18n framework for future multi-language support
**Why Rejected**:
- Application is English-only (no requirement for multiple languages)
- Significant overhead for 2 text changes
- Violates YAGNI (You Aren't Gonna Need It) principle
- Constitution Principle: Complexity must be justified

### Alternative 2: Configuration-based Labels
**Description**: Move all labels to configuration object for easier future changes
**Why Rejected**:
- Over-engineering for simple translation task
- No requirement for dynamic label changes
- Adds unnecessary complexity

## Summary

Simple, straightforward translation task with clear code locations identified. No technical complexity or dependencies. Standard English translations available. Implementation can proceed directly to Phase 1 (quickstart) without additional research.
