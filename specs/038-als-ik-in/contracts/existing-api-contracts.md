# API Contracts: Task Completion Checkbox Fix

**Date**: 2025-10-29
**Branch**: 038-als-ik-in

## Overview

Dit is een bugfix die **geen nieuwe API endpoints** vereist. Alle benodigde endpoints bestaan al en worden correct gebruikt door de grid checkbox implementatie.

## Existing API Contracts (No Changes)

### 1. Task Archive Endpoint

**Used By**: `verplaatsTaakNaarAfgewerkt()` function (grid checkbox - working)

**Endpoint**: Determined by examining existing implementation

**Expected Contract** (based on existing code behavior):
```http
POST /api/taak/afwerken
Content-Type: application/json
Authorization: Bearer {token}

Request Body:
{
  "id": "string",           // Task ID to archive
  "afgewerkt": "string"     // ISO timestamp
}

Response (Success):
{
  "success": true,
  "taak": {
    "id": "string",
    "lijst": "afgewerkt",
    "status": "afgewerkt",
    "afgewerkt": "string"   // ISO timestamp
  }
}

Response (Error):
{
  "error": "string",
  "message": "string"
}
```

**Behavior**:
- Moves task from current list to 'afgewerkt' list
- Sets task status to 'afgewerkt'
- Preserves all other task properties (project, context, notes, duration, etc.)
- Returns updated task object

### 2. Recurring Task Creation Endpoint

**Used By**: `handleRecurringCompletion()` function (for recurring tasks)

**Endpoint**: `/api/taak/recurring` (documented in ARCHITECTURE.md:189)

**Contract**:
```http
POST /api/taak/recurring
Content-Type: application/json
Authorization: Bearer {token}

Request Body:
{
  "original_task_id": "string",        // Completed task ID
  "naam": "string",                    // Task name
  "project_id": "integer|null",        // Project assignment
  "context_id": "integer|null",        // Context assignment
  "duur": "integer|null",              // Duration in minutes
  "opmerkingen": "string|null",        // Notes
  "herhaling_type": "string",          // Recurring pattern
  "herhaling_actief": true,            // Must be true
  "verschijndatum": "string"           // Next occurrence date (YYYY-MM-DD)
}

Response (Success):
{
  "success": true,
  "nieuwe_taak_id": "string",
  "taak": {
    // Full task object with new ID and next date
  }
}

Response (Error):
{
  "error": "string",
  "message": "string"
}
```

**Behavior**:
- Creates new task instance with all properties of original
- Calculates next occurrence date based on recurring pattern
- Preserves recurring settings (`herhaling_type`, `herhaling_actief`)
- Returns new task ID

### 3. Task Update Endpoint (Used for Non-Completion Saves)

**Used By**: `maakActie()` function (when checkbox is NOT checked)

**Endpoint**: `PUT /api/taak/:id` (documented in ARCHITECTURE.md:187)

**Contract**:
```http
PUT /api/taak/:id
Content-Type: application/json
Authorization: Bearer {token}

Request Body:
{
  "tekst": "string",                   // Task name (maps to 'naam')
  "projectId": "integer|null",         // Project ID
  "contextId": "integer|null",         // Context ID
  "verschijndatum": "string|null",     // Show date (YYYY-MM-DD)
  "duur": "integer|null",              // Duration in minutes
  "opmerkingen": "string|null",        // Notes
  "herhalingType": "string|null",      // Recurring pattern
  "herhalingActief": "boolean"         // Recurring active status
}

Response (Success):
{
  "success": true,
  "taak": {
    // Full updated task object
  }
}

Response (Error):
{
  "error": "string",
  "message": "string"
}
```

**Behavior**:
- Updates task properties in place
- Does NOT change lijst or status
- Preserves task ID
- Returns updated task object

## Frontend Contract (JavaScript Function Calls)

### 1. Archive Function Contract

**Function**: `verplaatsTaakNaarAfgewerkt(taak)`

**Location**: `public/app.js` (exact line TBD - used by grid checkbox)

**Contract**:
```javascript
/**
 * Archives a task by moving it to 'afgewerkt' list
 * @param {Object} taak - Task object to archive
 * @param {string} taak.id - Task ID
 * @param {string} taak.naam - Task name
 * @param {boolean} [taak.herhaling_actief] - Is recurring
 * @param {string} [taak.herhaling_type] - Recurring pattern
 * @returns {Promise<boolean>} - Success status
 */
async verplaatsTaakNaarAfgewerkt(taak)
```

**Expected Behavior**:
1. Calls archive API endpoint
2. Shows loading indicator
3. On success: Shows toast notification
4. On error: Shows error toast
5. Returns true/false for success/failure

### 2. Recurring Completion Handler Contract

**Function**: `handleRecurringCompletion(taak)`

**Location**: `public/app.js` (called from `taakAfwerken`)

**Contract**:
```javascript
/**
 * Creates next instance of recurring task after completion
 * @param {Object} taak - Completed task object
 * @param {string} taak.herhaling_type - Recurring pattern
 * @param {boolean} taak.herhaling_actief - Must be true
 * @returns {Promise<void>}
 */
async handleRecurringCompletion(taak)
```

**Expected Behavior**:
1. Calculates next occurrence date using `calculateNextRecurringDate()`
2. Calls `/api/taak/recurring` endpoint
3. Shows toast: "Volgende herhaling aangemaakt" (or similar)
4. Does NOT refresh UI (handled by caller)

## Data Flow Contracts

### Grid Checkbox Data Flow (Working Reference)

```
User Action: Click grid checkbox
  ↓
Frontend: taakAfwerken(id)
  ↓
Frontend: Set taak.afgewerkt = timestamp
  ↓
Frontend: verplaatsTaakNaarAfgewerkt(taak)
  ↓
API: POST /api/taak/afwerken
  ↓
Database: UPDATE taken SET lijst='afgewerkt', status='afgewerkt'
  ↓
API: Response success
  ↓
Frontend: if (herhaling_actief) handleRecurringCompletion()
  ↓
Frontend: laadHuidigeLijst() - Refresh UI
```

### Popup Checkbox Data Flow (After Fix)

```
User Action: Check popup checkbox, click save
  ↓
Frontend: maakActie()
  ↓
Frontend: Read isAfgevinkt = checkbox.checked
  ↓
If isAfgevinkt:
  ↓
  Frontend: Find task in huidigeActies
  ↓
  Frontend: Set taak.afgewerkt = timestamp
  ↓
  Frontend: verplaatsTaakNaarAfgewerkt(taak)
  ↓
  [SAME AS GRID CHECKBOX FLOW]
Else:
  ↓
  API: PUT /api/taak/:id
  ↓
  [NORMAL UPDATE FLOW]
```

## Error Handling Contracts

### Archive Failure

**Scenario**: API returns error during archive

**Expected Behavior**:
```javascript
try {
  await verplaatsTaakNaarAfgewerkt(taak);
} catch (error) {
  // Show error toast
  this.toastManager.show('Fout bij archiveren', 'error');
  // Task remains in UI
  // Checkbox can be unchecked by user to try again
}
```

### Recurring Creation Failure

**Scenario**: Next instance creation fails

**Expected Behavior**:
```javascript
try {
  await handleRecurringCompletion(taak);
} catch (error) {
  // Original task still archived (success)
  // Show warning toast about recurring
  this.toastManager.show('Taak gearchiveerd, maar volgende herhaling niet aangemaakt', 'warning');
}
```

### Network Timeout

**Scenario**: Request takes too long

**Expected Behavior**:
- Existing fetch() timeout handling applies
- User sees loading indicator
- After timeout: Error toast shown
- Task remains in UI, user can retry

## Authentication Contract

**All API endpoints require authentication**:
- JWT token in Authorization header
- Or session cookie (if session-based auth is used)
- 401 response redirects to login page

**Frontend Handling**:
```javascript
// Existing middleware handles auth automatically
// No changes required for bugfix
```

## Response Format Standards

### Success Response
```json
{
  "success": true,
  "data": { /* payload */ }
}
```

### Error Response
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { /* optional additional info */ }
}
```

## Testing Contracts

### Contract Tests (Not Required for Bugfix)

**Reason**: No new API contracts introduced

**Existing Tests**: Should continue to pass
- Grid checkbox tests (if they exist)
- Archive endpoint tests (if they exist)
- Recurring task tests (if they exist)

### Integration Tests Required

**Test 1**: Popup checkbox completion (simple task)
```
Given: Active task in inbox
When: Open popup, check checkbox, click save
Then: Task archived, API called with correct payload
```

**Test 2**: Popup checkbox completion (recurring task)
```
Given: Recurring task in acties
When: Open popup, check checkbox, click save
Then: Original archived, new instance created with next date
```

**Test 3**: Popup checkbox unchecked
```
Given: Active task in acties
When: Open popup, keep checkbox unchecked, edit name, save
Then: Normal update, task remains active
```

## Backward Compatibility

**Impact**: None

**Reason**:
- No API changes
- No database schema changes
- Only frontend behavior change
- Grid checkbox still works identically

## Summary

**New API Endpoints**: None

**Modified API Endpoints**: None

**Existing Endpoints Used**:
1. Archive endpoint - Already working via grid checkbox
2. Recurring creation endpoint - Already working via grid checkbox
3. Task update endpoint - Already working via popup save

**Frontend Contracts**:
1. `verplaatsTaakNaarAfgewerkt(taak)` - Reuse existing
2. `handleRecurringCompletion(taak)` - Reuse existing
3. `maakActie()` - Add checkbox read + conditional logic

**Testing Requirements**:
- Integration tests for popup checkbox flow
- Verify identical behavior to grid checkbox
- No new contract tests needed

---

**Phase 1 (Contracts) Status**: ✅ COMPLETE - All required contracts already exist and are documented
