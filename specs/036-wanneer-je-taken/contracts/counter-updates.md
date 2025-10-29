# Contract: Counter Update Integration

**Feature**: 036-wanneer-je-taken
**Date**: 2025-10-27

## Contract Overview

This document defines the contract for integrating `updateSidebarCounters()` into all task operation functions.

## Function Contract

### `updateSidebarCounters()`

**Signature**:
```javascript
async updateSidebarCounters(): Promise<void>
```

**Location**: `public/app.js:3163`

**Behavior**:
- Fetches current counts from `GET /api/counts/sidebar`
- Updates DOM elements for all 5 list counters
- Handles errors gracefully (displays "?" on failure)
- Returns immediately if DOM elements not found
- No side effects beyond DOM updates

**Preconditions**:
- User must be authenticated
- Sidebar DOM must be loaded

**Postconditions**:
- All counter elements updated with fresh values
- OR counter elements show "?" if API failed

**Error Handling**:
- Network errors: Caught, logged, fallback UI shown
- API errors (4xx/5xx): Caught, logged, fallback UI shown
- DOM not found: Silent fail (no error thrown)

## Integration Points

### Required Integration Pattern

**All task operations MUST follow this pattern**:

```javascript
async taskOperation() {
    await loading.withLoading(async () => {
        // 1. Send API request
        const response = await fetch('/api/taak/...', {...});

        if (response.ok) {
            // 2. Update local UI
            await this.laadHuidigeLijst();

            // 3. Update sidebar counters ⭐ NEW
            await this.updateSidebarCounters();

            // 4. Show success feedback
            toast.success('Operation successful');
        } else {
            // 5. Show error (no counter update)
            toast.error('Operation failed');
        }
    }, {
        operationId: 'operation-name',
        showGlobal: true,
        message: 'Processing...'
    });
}
```

**Critical Rules**:
1. ✅ Call AFTER operation succeeds (`if (response.ok)`)
2. ✅ Call AFTER local UI update (`laadHuidigeLijst()`)
3. ✅ Use `await` (counters update asynchronously)
4. ❌ Do NOT call if operation fails
5. ❌ Do NOT call before operation completes

### Functions Requiring Integration

**Inbox Processing**:
- ❌ Currently missing counter updates
- ✅ After fix: Updates after each inbox item processed

**Task Completion**:
- `completeTask()` - app.js:~4060
- ❌ Currently missing
- ✅ After fix: Updates when task marked complete

**Task Movement**:
- `verplaatsNaarInbox()` - app.js:4835
- `verplaatsNaarUitgesteld()` - app.js:4947
- `verplaatsNaarOpvolgen()` - app.js:4979
- `stelDatumIn()` - app.js:4880
- ❌ Currently missing (commented out)
- ✅ After fix: Updates after successful move

**Task Deletion**:
- `verwijderTaak()` - app.js:~4268, 4285
- ❌ Currently missing
- ✅ After fix: Updates after task deleted

**Task Creation**:
- Task create handler - app.js:~3363
- ❌ Currently missing
- ✅ After fix: Updates after new task created

**Drag & Drop**:
- Drop handlers - app.js:~9686
- ❌ Currently missing
- ✅ After fix: Updates after drag completes

**Bulk Operations**:
- Bulk action handlers - app.js:~12321, 12445
- ❌ Currently missing
- ✅ After fix: Updates after bulk operation completes

## API Contract (Existing, No Changes)

### Endpoint: GET /api/counts/sidebar

**Request**:
```http
GET /api/counts/sidebar HTTP/1.1
Host: tickedify.com
Cookie: connect.sid=...
```

**Success Response (200)**:
```json
{
    "inbox": 5,
    "acties": 12,
    "projecten": 3,
    "opvolgen": 2,
    "uitgesteld": 8
}
```

**Error Responses**:
- `401 Unauthorized`: User not authenticated
- `503 Service Unavailable`: Database connection failed
- `500 Internal Server Error`: Query failed

**Performance Contract**:
- Response time: < 100ms (p95)
- Timeout: 5 seconds
- Retry: None (frontend handles gracefully)

## DOM Contract (Existing)

### Counter Elements

**Selector Pattern**:
```javascript
document.querySelector('[data-lijst="LIST_NAME"] .task-count')
```

**Required Attributes**:
- Parent element: `data-lijst="inbox|acties|projecten|opvolgen|uitgesteld"`
- Counter element: class `task-count`

**Update Pattern**:
```javascript
counterElement.textContent = ` (${count})`;
```

**Note**: Space before opening parenthesis is intentional (matches existing style)

## Testing Contract

### Manual Test Cases

Each integration point MUST be tested:

1. **Test**: Perform operation (move/complete/delete/create task)
2. **Verify**: Counter updates within 500ms
3. **Verify**: Counter value matches database state
4. **Verify**: UI does not freeze or lag

### Error Test Cases

1. **Test**: Disconnect network, perform operation
2. **Verify**: Operation fails OR succeeds
3. **Verify**: If operation succeeds, counter shows (?) initially
4. **Verify**: Counter recovers on next successful operation

### Regression Test Cases

1. **Test**: Perform 10 rapid operations
2. **Verify**: All operations complete
3. **Verify**: Final counter value is accurate
4. **Verify**: No duplicate API calls (debounce works if enabled)

## Acceptance Criteria

✅ All 14+ integration points implemented
✅ Counters update after every successful task operation
✅ Counters do NOT update after failed operations
✅ No performance degradation (operations still complete in < 1 second)
✅ Error handling works (shows "?" on API failure)
✅ Manual testing passes for all operation types
✅ Production deployment successful
✅ No user-reported bugs after 48 hours

## Breaking Changes

**None** - This is purely additive functionality

**Backward Compatibility**:
- ✅ Existing code continues to work
- ✅ No API changes
- ✅ No database changes
- ✅ No configuration changes

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Comment out all `updateSidebarCounters()` calls
2. **Redeploy**: Push commented version to production
3. **User Impact**: Counters won't update (original behavior)
4. **Fix**: Debug and fix issue in staging
5. **Redeploy**: Push fixed version

**Rollback Risk**: Very low - removing function calls is safe

---

*Contract ready for implementation*
