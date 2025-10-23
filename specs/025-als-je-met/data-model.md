# Data Model: Duplicate Submit Prevention voor Shift+F12 Quick Add

**Feature**: 025-als-je-met
**Date**: 2025-10-23
**Status**: Complete

## Overview

Deze feature vereist **geen database wijzigingen**. Het is een frontend-only fix die client-side state management gebruikt om duplicate submissions te voorkomen.

## State Management

### LoadingManager State

**Entity**: Operation Tracking State
**Location**: `app.js:500` - `this.activeOperations = new Set()`
**Type**: In-memory JavaScript Set
**Lifecycle**: Per browser session

**Fields**:
- `activeOperations`: Set<string>
  - Contains operation IDs that are currently executing
  - For this feature: contains 'add-task' during submission
  - Automatically cleared when operation completes (success or failure)

**State Transitions**:
```
IDLE (empty Set)
  ↓ startOperation('add-task')
ACTIVE (Set contains 'add-task')
  ↓ endOperation('add-task') - after API response
IDLE (empty Set)
```

**Validation Rules**:
- Operation cannot be added twice (Set uniqueness)
- Operation must be removed in finally block (guaranteed cleanup)
- Multiple different operations can be tracked simultaneously

### QuickAddModal State

**Entity**: Modal Input State
**Location**: `app.js:13356-13498` - QuickAddModal class
**Type**: DOM element state + class properties

**Fields**:
- `this.input.value`: string - Current task text
- `this.modal.style.display`: 'flex' | 'none' - Visibility state
- No additional state needed for duplicate prevention (handled by LoadingManager)

**State Transitions**:
```
HIDDEN
  ↓ show() - Shift+F12 pressed
VISIBLE + IDLE
  ↓ handleSubmit() called (Enter pressed)
VISIBLE + SUBMITTING (blocked by LoadingManager)
  ↓ API success
HIDDEN + IDLE (modal closes)
```

## Data Flow

### Submission Flow (Current - Has Bug)
```
User presses Enter
  ↓
handleSubmit() called
  ↓ (no blocking mechanism)
API request sent immediately
  ↓ (user presses Enter again)
handleSubmit() called AGAIN
  ↓
DUPLICATE API request sent
  ↓
Two tasks created in database ❌
```

### Submission Flow (After Fix)
```
User presses Enter
  ↓
handleSubmit() called
  ↓
loading.withLoading() starts
  ↓
activeOperations.add('add-task')
  ↓
API request sent
  ↓ (user presses Enter again)
handleSubmit() called AGAIN
  ↓
loading.withLoading() checks activeOperations
  ↓
'add-task' already exists → BLOCK ✅
  ↓
First API completes
  ↓
activeOperations.delete('add-task')
  ↓
One task created in database ✅
```

## API Contract (No Changes)

**Existing Endpoint**: `POST /api/taak/add-to-inbox`

**Request**:
```json
{
  "tekst": "Task description"
}
```

**Response** (Success):
```json
{
  "success": true,
  "taak": {
    "id": 123,
    "tekst": "Task description",
    "lijst": "inbox",
    "aangemaakt": "2025-10-23T12:00:00Z"
  }
}
```

**Response** (Error):
```json
{
  "error": "Error message"
}
```

**Note**: API endpoint behavior unchanged. Client-side duplicate prevention prevents multiple requests from being sent in the first place.

## Database Schema (No Changes)

**Table**: `taken` (tasks)

This feature does **NOT** modify the database schema. The fix prevents duplicate INSERT operations by blocking them client-side before they reach the API.

**Existing Schema** (for context):
```sql
CREATE TABLE taken (
    id SERIAL PRIMARY KEY,
    tekst TEXT NOT NULL,
    lijst VARCHAR(50) NOT NULL,
    aangemaakt TIMESTAMP DEFAULT NOW(),
    user_id INTEGER REFERENCES users(id),
    -- ... other fields ...
);
```

**Why No Schema Changes**:
- Problem is client-side race condition, not data model issue
- Database correctly stores all requests it receives
- Fix is about preventing duplicate requests, not handling them server-side

## Memory Impact

**Additional Memory Usage**: Negligible (~100 bytes per active operation)

**Calculation**:
- JavaScript Set with 1 string entry: ~50-100 bytes
- Typically 0-1 active operations at a time
- Maximum realistic: 5-10 operations (if multiple features use pattern)
- Total worst case: ~1KB

**Garbage Collection**: Automatic when Set is empty (no operations active)

## Relationships

```
GlobalShortcutManager
  ↓ (Shift+F12)
QuickAddModal.show()
  ↓ (User presses Enter)
QuickAddModal.handleSubmit()
  ↓ (wraps in loading.withLoading)
LoadingManager.startOperation('add-task')
  ↓
activeOperations.add('add-task')
  ↓
HTTP POST /api/taak/add-to-inbox
  ↓
PostgreSQL INSERT INTO taken
  ↓ (response received)
LoadingManager.endOperation('add-task')
  ↓
activeOperations.delete('add-task')
```

## Concurrency Model

**Thread Safety**: Single-threaded JavaScript (no threading issues)

**Race Conditions**:
- **Before fix**: Multiple rapid calls create race condition at API level
- **After fix**: LoadingManager.activeOperations Set ensures mutual exclusion

**Atomic Operations**:
- `Set.add()` - atomic in single-threaded JS
- `Set.has()` - atomic in single-threaded JS
- `Set.delete()` - atomic in single-threaded JS

## Testing Considerations

### State Verification Points

1. **Before submission**: `loading.isOperationActive('add-task')` should be `false`
2. **During submission**: `loading.isOperationActive('add-task')` should be `true`
3. **After submission**: `loading.isOperationActive('add-task')` should be `false`
4. **Multiple Enter presses**: State should remain `true` until first completes

### Test Data Requirements

**No test data needed** - this is pure state management logic

**Verification Method**:
- Playwright can observe API requests count
- Console logs can track state transitions
- UI loading overlay visibility confirms state

## Conclusion

**Data Model Complexity**: Minimal - reuses existing in-memory state management

**Key Points**:
- No database changes required
- No API changes required
- No new data structures needed
- Leverages existing LoadingManager infrastructure
- State management is simple: boolean flag (operation active/inactive)

**Design Decision**: Use shared 'add-task' operationId for both Inbox and Quick Add to prevent cross-modal duplicates and maintain consistency.
