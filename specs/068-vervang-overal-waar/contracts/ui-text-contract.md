# UI Text Contract: "Appear Date" Terminology

**Date**: 2025-11-19
**Type**: UI Text Specification
**Status**: Specification

## Overview
This contract defines the expected UI text for date-related labels throughout Tickedify. Since this is not an API change, there are no HTTP endpoints or data structures to specify. Instead, this documents the text that must appear to users.

## Scope
All user-facing text referencing task dates must use "Appear Date" terminology instead of "Due Date".

## UI Text Requirements

### Task Modal Labels
**Location**: `public/index.html` - Task creation/editing modal

**Required Text**:
```html
<!-- Date field label -->
<label for="verschijndatum">Appear Date</label>

<!-- Placeholder text (if any) -->
<input type="date" id="verschijndatum" placeholder="Select appear date">

<!-- Helper text (if any) -->
<small>Choose when this task should appear on your daily planning</small>
```

**Test**: Open task modal, verify label reads "Appear Date"

### Error Messages
**Location**: `public/app.js` - Toast notifications and validation messages

**Required Text**:
- `"Appear Date is required!"` (when date field empty for action tasks)
- `"Please select an appear date"` (validation prompt)
- `"Invalid appear date format"` (date parsing error)
- `"Appear date cannot be in the past"` (if past date validation exists)

**Test**: Trigger each error condition, verify message uses "Appear Date"

### Help Text & Tooltips
**Location**: Various UI elements with help icons or hover tooltips

**Required Text**:
- Any tooltip explaining date field should reference "Appear Date"
- Help documentation should use "Appear Date" terminology
- Info icons near date fields should explain "when task appears on planning"

**Test**: Hover over help icons, verify text uses "Appear Date"

### List Views
**Location**: Task list displays (inbox, actions, postponed, daily planning)

**Required Text** (if date is shown in list):
- Column headers or labels showing dates should not say "Due Date"
- Acceptable alternatives: "Date", "Appear Date", or date value only
- No explicit "Due Date" labels visible in any list view

**Test**: View all list types, verify no "Due Date" labels appear

### Voice Mode Responses
**Location**: `public/app.js` or separate voice mode files

**Required Text** (spoken by TTS):
- `"Please specify the appear date for this task"`
- `"The appear date has been set to [date]"`
- `"Would you like to change the appear date?"`
- Any voice prompt mentioning dates should say "appear date"

**Test**: Trigger voice mode, verify spoken text uses "appear date"

### Email Templates
**Location**: `server.js` - Email generation functions

**Required Text**:
- Task confirmation emails: "Appear Date: [date]"
- Task reminder emails: "This task will appear on [date]"
- Daily planning emails: "Tasks appearing today"
- No email should contain "Due Date" terminology

**Test**: Trigger each email type, verify content uses "Appear Date"

## Negative Testing (What Should NOT Appear)

### Prohibited Text
The following text must NOT appear anywhere in user-facing UI:
- "Due Date"
- "Due date"
- "due date"
- "DUE DATE"

**Exception**: Historical changelog entries may reference "Due Date" when describing past versions

### Allowed Variations
These alternative phrasings are acceptable:
- "Appear Date" (preferred)
- "Date" (generic, acceptable in some contexts)
- "Scheduled for [date]" (descriptive alternative)
- "Appears on [date]" (descriptive alternative)

## Testing Checklist

### Manual Browser Testing
- [ ] Open task creation modal → verify "Appear Date" label
- [ ] Open task editing modal → verify "Appear Date" label
- [ ] View inbox list → verify no "Due Date" text
- [ ] View actions list → verify no "Due Date" text
- [ ] View postponed lists → verify no "Due Date" text
- [ ] View daily planning → verify no "Due Date" text
- [ ] Trigger validation error → verify "Appear Date" in error message
- [ ] Hover over help icons → verify "Appear Date" in tooltips

### Voice Mode Testing
- [ ] Activate voice mode → listen for "appear date" pronunciation
- [ ] Set date via voice → verify spoken confirmation uses "appear date"

### Email Testing
- [ ] Create task → verify confirmation email uses "Appear Date"
- [ ] Check daily planning email → verify "appears" terminology

### Automated Testing
- [ ] Run Playwright test to scan all screens for "Due Date" text
- [ ] Grep codebase for user-facing "Due Date" strings
- [ ] Verify test passes (zero user-facing "Due Date" instances found)

## Success Criteria

**Feature is complete when**:
1. No user-facing "Due Date" text remains (verified by grep + Playwright)
2. All labels, errors, help text use "Appear Date"
3. Voice mode audio says "appear date"
4. All email templates use "Appear Date"
5. Manual browser testing confirms terminology consistency
6. Changelog documents the terminology change

**Rollback Criteria**:
- If any instance of "Due Date" found in user-facing text after deployment
- If users report seeing "Due Date" terminology
- If email templates still say "Due Date"

## Non-Goals
This contract does NOT cover:
- Database field names (verschijndatum remains unchanged)
- API property names (verschijndatum remains unchanged)
- Code variable names (internal naming unchanged)
- HTML element IDs or attributes (id="verschijndatum" unchanged)

These are internal implementation details not visible to users.
