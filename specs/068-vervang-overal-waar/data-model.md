# Data Model: Replace "Due Date" with "Appear Date"

**Date**: 2025-11-19
**Status**: Complete

## Overview
This feature has **NO data model changes**. This document confirms that existing data structures remain unchanged while only user-facing terminology is updated.

## Existing Data Model (Unchanged)

### Database Schema
```sql
-- taken table (NO CHANGES)
CREATE TABLE taken (
    id VARCHAR(255) PRIMARY KEY,
    tekst TEXT NOT NULL,
    verschijndatum DATE,  -- ← Field name UNCHANGED (Dutch: "appear date")
    context_id INTEGER,
    duur INTEGER,
    -- ... other fields unchanged
);
```

**Confirmation**: The database field `verschijndatum` already means "appear date" in Dutch, so the schema is already semantically correct. Only English UI labels need updating.

### API Data Structure (Unchanged)
```json
{
  "id": "task_xxx",
  "tekst": "Task name",
  "verschijndatum": "2025-11-20",  // ← Property name UNCHANGED
  "contextId": 123,
  "duur": 30
}
```

**Confirmation**: API request/response structures remain identical. Frontend and backend continue using `verschijndatum` property name.

### Frontend State (Unchanged)
```javascript
// app.js internal structures (NO CHANGES)
const task = {
    id: 'task_xxx',
    tekst: 'Task name',
    verschijndatum: '2025-11-20',  // ← Variable name UNCHANGED
    contextId: 123,
    duur: 30
};
```

**Confirmation**: JavaScript objects and variable names remain unchanged. Only displayed text labels change.

## What Changes (UI Layer Only)

### HTML Labels
```html
<!-- BEFORE -->
<label for="verschijndatum">Due Date</label>

<!-- AFTER -->
<label for="verschijndatum">Appear Date</label>
```

**Note**: The `for="verschijndatum"` attribute remains unchanged. Only the label text changes.

### JavaScript Display Text
```javascript
// BEFORE
toast.warning('Due Date is required!');

// AFTER
toast.warning('Appear Date is required!');
```

### Email Templates
```javascript
// BEFORE
const emailBody = `Your task is scheduled for ${task.verschijndatum} (Due Date)`;

// AFTER
const emailBody = `Your task is scheduled for ${task.verschijndatum} (Appear Date)`;
```

### Voice Mode Responses
```javascript
// BEFORE
const voiceResponse = 'Please specify the due date for this task';

// AFTER
const voiceResponse = 'Please specify the appear date for this task';
```

## Data Flow (Unchanged)

```
User Input
    ↓
HTML Form (field id="verschijndatum")
    ↓
JavaScript (property: verschijndatum)
    ↓
API Request ({ verschijndatum: "2025-11-20" })
    ↓
Backend Validation
    ↓
Database (column: verschijndatum)
```

**The entire data flow remains unchanged.** Only the text displayed to users at the HTML Form level changes from "Due Date" to "Appear Date".

## Validation Rules (Unchanged)

### Date Format Validation
- **Rule**: Must be valid ISO date (YYYY-MM-DD)
- **Implementation**: Unchanged (server.js date validation)
- **Error Message**: Changes from "Invalid due date" → "Invalid appear date"

### Required Field Validation
- **Rule**: verschijndatum required for action tasks, optional for postponed tasks
- **Implementation**: Unchanged (app.js conditional validation)
- **Error Message**: Changes from "Due Date is required" → "Appear Date is required"

### Date Range Validation
- **Rule**: Date must not be in past (if applicable)
- **Implementation**: Unchanged
- **Error Message**: Changes from "Due date cannot be in the past" → "Appear date cannot be in the past"

## State Transitions (Unchanged)

Tasks with dates continue to flow through the same states:
1. **Inbox** → Task created with verschijndatum
2. **Actions** → Task appears on daily planning for verschijndatum
3. **Completed** → Task marked done, verschijndatum historical
4. **Postponed** → Task deferred, verschijndatum may be optional

**No state transition logic changes.**

## Constraints & Invariants (Unchanged)

### Database Constraints
- `verschijndatum` column type: DATE (unchanged)
- `verschijndatum` nullable: TRUE (unchanged)
- No foreign keys or indexes affected

### Business Logic Constraints
- Tasks scheduled for future dates don't appear on today's planning (unchanged)
- Recurring tasks generate new instances based on verschijndatum patterns (unchanged)
- Daily planning filters tasks by verschijndatum = today (unchanged)

## Summary

**Data Model Impact**: NONE

This feature is a pure presentation layer change. All data structures, validation logic, state transitions, and business rules remain identical. The term "Due Date" in user-facing text is replaced with "Appear Date" to better reflect the Baas Over Je Tijd methodology, but the underlying `verschijndatum` field name and all technical implementation details are preserved.

**No database migrations, API version changes, or data structure modifications required.**
