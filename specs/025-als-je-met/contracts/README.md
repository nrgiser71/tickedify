# Contracts: Duplicate Submit Prevention voor Shift+F12 Quick Add

**Feature**: 025-als-je-met
**Date**: 2025-10-23

## Overview

Deze feature vereist **geen nieuwe API contracts**. Het is een frontend-only fix die bestaande APIs gebruikt.

## Existing API Contract (Unchanged)

### POST /api/taak/add-to-inbox

**Purpose**: Add a new task to the inbox
**Location**: `server.js` (existing endpoint)
**Used By**: Both Inbox screen and Quick Add modal

**Request Contract**:
```typescript
interface AddTaskRequest {
  tekst: string;           // Required: Task description
  id?: string;             // Optional: Client-generated ID
  aangemaakt?: string;     // Optional: Creation timestamp
  lijst?: string;          // Optional: List name (defaults to 'inbox')
}
```

**Response Contract** (Success - 200):
```typescript
interface AddTaskResponse {
  success: true;
  taak: {
    id: number;            // Database-assigned task ID
    tekst: string;         // Task description
    lijst: string;         // List name ('inbox')
    aangemaakt: string;    // ISO 8601 timestamp
    user_id: number;       // Owner user ID
  }
}
```

**Response Contract** (Error - 4xx/5xx):
```typescript
interface ErrorResponse {
  error: string;           // Error message
  status?: number;         // HTTP status code
}
```

**Status Codes**:
- `200 OK`: Task created successfully
- `400 Bad Request`: Invalid request body (missing tekst)
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database or server error

## Client-Side Contract: LoadingManager

### LoadingManager.withLoading()

**Purpose**: Wrap async operations with duplicate prevention and loading UI
**Location**: `app.js:495-749`

**Function Signature**:
```typescript
async withLoading(
  operation: () => Promise<void>,
  options: {
    operationId: string;      // Unique identifier for operation
    showGlobal?: boolean;     // Show loading overlay (default: false)
    message?: string;         // Loading message (default: 'Loading...')
  }
): Promise<void>
```

**Behavior Contract**:
1. **Pre-execution**:
   - Check if `operationId` is in `activeOperations` Set
   - If exists: Throw or return early (prevents duplicate)
   - If not exists: Add to `activeOperations` Set
   - If `showGlobal=true`: Display loading overlay

2. **During execution**:
   - Execute provided `operation()` function
   - Keep `operationId` in `activeOperations` Set

3. **Post-execution** (finally block):
   - Remove `operationId` from `activeOperations` Set
   - If `showGlobal=true` and no other operations: Hide loading overlay
   - Ensure cleanup happens even on error

**Usage Example**:
```javascript
await loading.withLoading(async () => {
  // Your async operation here
  await fetch('/api/endpoint', { ... });
}, {
  operationId: 'add-task',
  showGlobal: true,
  message: 'Taak toevoegen...'
});
```

### LoadingManager.isOperationActive()

**Purpose**: Check if an operation is currently running
**Location**: `app.js:746-748`

**Function Signature**:
```typescript
isOperationActive(operationId: string): boolean
```

**Returns**:
- `true`: Operation with this ID is currently active
- `false`: No operation with this ID is active

**Usage Example**:
```javascript
if (!loading.isOperationActive('add-task')) {
  // Safe to start new operation
  this.handleSubmit();
} else {
  // Operation already in progress, ignore
  console.log('Submission already in progress');
}
```

## Client-Side Contract: QuickAddModal

### QuickAddModal.handleSubmit()

**Current Implementation** (Before Fix):
```typescript
async handleSubmit(): Promise<void> {
  // 1. Validate input
  if (!this.input.value.trim()) return;

  // 2. Check authentication
  if (!app.isLoggedIn()) return;

  // 3. Make API call (NO DUPLICATE PREVENTION)
  const response = await fetch('/api/taak/add-to-inbox', { ... });

  // 4. Handle response
  if (response.ok) {
    this.hide();
    await app.laadTellingen();
  }
}
```

**New Implementation** (After Fix):
```typescript
async handleSubmit(): Promise<void> {
  // 1. Validate input
  if (!this.input.value.trim()) return;

  // 2. Check authentication
  if (!app.isLoggedIn()) return;

  // 3. Wrap in loading.withLoading() for duplicate prevention
  await loading.withLoading(async () => {
    const response = await fetch('/api/taak/add-to-inbox', { ... });

    if (response.ok) {
      this.hide();
      await app.laadTellingen();
    }
  }, {
    operationId: 'add-task',
    showGlobal: true,
    message: 'Taak toevoegen...'
  });
}
```

**Contract Changes**:
- **Behavior**: Function now prevents concurrent calls (same as Inbox implementation)
- **API**: Public interface unchanged (still `async handleSubmit()`)
- **Side Effects**: Now shows loading overlay during submission
- **Error Handling**: LoadingManager ensures cleanup even on error

## Event Contract: Keyboard Handler

### Enter Key Handler

**Location**: `app.js:13372-13380` - `QuickAddModal.setupEventListeners()`

**Current Contract**:
```typescript
this.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    this.handleSubmit();  // Called immediately, no blocking
  }
});
```

**Contract Unchanged** (Fix is internal to handleSubmit):
```typescript
this.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    this.handleSubmit();  // Now internally protected by LoadingManager
  }
});
```

**Why No Change Needed**:
- Multiple calls to `handleSubmit()` are fine
- LoadingManager.withLoading() blocks internal to handleSubmit
- Cleaner than checking `isOperationActive()` before each call
- Consistent with Inbox implementation pattern

## Test Contracts

### Contract Test: Duplicate Prevention

**Test**: Verify that multiple rapid submissions create only one task

**Given**:
```javascript
// Modal is open and visible
modal.style.display === 'flex'
// Input has valid text
input.value === 'Test task'
// No operation is active
loading.isOperationActive('add-task') === false
```

**When**:
```javascript
// Simulate 5 rapid Enter key presses
for (let i = 0; i < 5; i++) {
  const event = new KeyboardEvent('keydown', { key: 'Enter' });
  input.dispatchEvent(event);
}
```

**Then**:
```javascript
// Only 1 API request sent
assert(apiCallCount === 1)
// Only 1 task created in database
assert(tasksCreated.length === 1)
// Operation eventually completes
await waitForCondition(() => !loading.isOperationActive('add-task'))
// Modal is closed
assert(modal.style.display === 'none')
```

### Contract Test: Successful Retry After Completion

**Test**: Verify that user can retry after operation completes

**Given**:
```javascript
// First submission completed successfully
previousSubmissionCompleted === true
// Modal is reopened
modal.style.display === 'flex'
input.value === 'Second task'
// No operation is active
loading.isOperationActive('add-task') === false
```

**When**:
```javascript
// User presses Enter
const event = new KeyboardEvent('keydown', { key: 'Enter' });
input.dispatchEvent(event);
```

**Then**:
```javascript
// API request is sent (not blocked)
assert(apiCallCount === 1)
// Second task is created
assert(tasksCreated.length === 2)  // Total: first + second
```

### Contract Test: Retry After Error

**Test**: Verify that user can retry after API error

**Given**:
```javascript
// First submission failed (500 error)
previousSubmissionFailed === true
// Operation completed (even though failed)
loading.isOperationActive('add-task') === false
// Modal is still open
modal.style.display === 'flex'
```

**When**:
```javascript
// User presses Enter to retry
const event = new KeyboardEvent('keydown', { key: 'Enter' });
input.dispatchEvent(event);
```

**Then**:
```javascript
// Retry is allowed (not blocked)
assert(apiCallCount === 1)  // New attempt
// If retry succeeds, task is created
```

## Backward Compatibility

**Breaking Changes**: None

**Compatibility Matrix**:
| Component | Before Fix | After Fix | Compatible? |
|-----------|-----------|-----------|-------------|
| API Endpoint | POST /api/taak/add-to-inbox | Unchanged | ✅ Yes |
| Request Format | { tekst: string } | Unchanged | ✅ Yes |
| Response Format | { success, taak } | Unchanged | ✅ Yes |
| Modal Public API | handleSubmit() | handleSubmit() | ✅ Yes |
| Event Handlers | Enter key | Enter key | ✅ Yes |
| User Workflow | Shift+F12 → Enter | Shift+F12 → Enter | ✅ Yes |
| Loading UX | None | Overlay shown | ⚠️ Enhanced |

**Migration Path**: None needed - transparent fix

## Conclusion

**Contract Summary**:
- ✅ No new API endpoints
- ✅ No breaking changes to existing APIs
- ✅ Internal refactoring only (LoadingManager wrapper)
- ✅ Backward compatible with all existing code
- ✅ Reuses proven LoadingManager contract from Feature 023

**Ready for Testing**: All contracts are stable and proven in production.
