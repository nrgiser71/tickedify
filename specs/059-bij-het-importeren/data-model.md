# Data Model: Email Import Attachment Syntax Flexibility

**Date**: 2025-11-08
**Feature**: 059-bij-het-importeren

## Overview

This feature modifies runtime parsing logic only. No database schema changes are required.

## Runtime Data Structures

### AttachmentConfig Object (Modified)

**Location**: `parseAttachmentCode()` return value
**Type**: Runtime JavaScript object

```javascript
{
    processAttachments: boolean,  // Always true when code detected
    targetFilename: string | null  // NEW: null = "use first attachment"
}
```

**Changes**:
- `targetFilename` can now be `null` (previously always string)
- `null` value signals "no filename specified, use first attachment"

**Validation Rules**:
- `processAttachments` must be `true` when object exists
- `targetFilename` can be `null`, empty string, or non-empty string
- When `targetFilename` is `null` or empty: use first available attachment
- When `targetFilename` is non-empty: use existing matching logic

### EmailData Object (Unchanged)

**Location**: Input to `parseEmailToTask()`
**Type**: Runtime JavaScript object

```javascript
{
    sender: string,           // Email sender address
    subject: string,          // Email subject line
    body: string,             // Email body text
    timestamp: string,        // ISO timestamp
    attachments: Array<File>  // Optional: Array of file objects
}
```

**File Object Structure**:
```javascript
{
    originalname: string,  // Original filename
    mimetype: string,      // MIME type (e.g., "application/pdf")
    size: number,          // File size in bytes
    buffer: Buffer         // File content
}
```

### TaskData Object (Unchanged)

**Location**: `parseEmailToTask()` return value
**Type**: Runtime JavaScript object

```javascript
{
    tekst: string,                  // Task title
    opmerkingen: string,            // Task notes (email body)
    lijst: string,                  // List name (default: 'inbox')
    projectId: number | null,       // Project ID (resolved later)
    projectName: string | null,     // Project name from @t
    contextId: number | null,       // Context ID (resolved later)
    contextName: string | null,     // Context name from @t
    verschijndatum: string | null,  // Due date (ISO format)
    duur: number | null,            // Duration in minutes
    prioriteit: string | null,      // Priority (hoog/gemiddeld/laag)
    originalSender: string,         // Email sender
    importedAt: string,             // Import timestamp
    attachmentConfig: object | null // Attachment processing config
}
```

## State Transitions

### Attachment Processing Flow

```
Email Received
    ↓
Check for @t instruction
    ↓
Parse segments
    ↓
Detect 'a;' or 'a: filename'
    ↓
    ├─→ 'a;' → targetFilename = null
    │       ↓
    │   Check attachments.length
    │       ↓
    │       ├─→ 0 attachments → Skip (silent)
    │       ├─→ 1 attachment → Process first
    │       └─→ 2+ attachments → Process first
    │
    └─→ 'a: filename' → targetFilename = "filename"
            ↓
        Find matching attachment
            ↓
            ├─→ Match found → Process match
            └─→ No match → Skip (silent)
```

## Database Impact

**Schema Changes**: None

**Query Changes**: None

This feature is purely a runtime parsing enhancement with no persistent data model changes.

## Validation Rules

### parseAttachmentCode() Validation

1. **Input Segment** (string)
   - Must match regex `/^a(?:\s*:\s*(.*))?$/i`
   - Case-insensitive ('a' or 'A')

2. **Captured Filename** (string | undefined)
   - When undefined: return `targetFilename: null`
   - When empty string: return `targetFilename: null`
   - When whitespace-only: trim and return `targetFilename: null`
   - When non-empty: return `targetFilename: trimmed_value`

### findMatchingAttachment() Validation

1. **Files Array** (Array<File>)
   - When `null` or `undefined`: return `null`
   - When empty array: return `null`
   - When populated: continue to search term check

2. **Search Term** (string | null)
   - When `null`: return `files[0]` (NEW BEHAVIOR)
   - When empty string: return `files[0]` (NEW BEHAVIOR)
   - When non-empty: apply existing matching logic

## Error Handling

**Philosophy**: Silent error tolerance (consistent with Feature 048 @t syntax)

### Scenarios

1. **`a;` with no attachments**
   - Behavior: Return `null` from `findMatchingAttachment()`
   - Result: Attachment processing skipped silently
   - User Impact: Task created without attachment (expected)

2. **`a;` with multiple attachments**
   - Behavior: Return `files[0]` from `findMatchingAttachment()`
   - Result: First attachment processed
   - User Impact: First attachment linked to task

3. **`a: nonexistent.pdf` with no matching file**
   - Behavior: Existing logic returns `null`
   - Result: Attachment processing skipped silently
   - User Impact: Task created without attachment (existing behavior)

4. **`a:` (colon but no filename)**
   - Behavior: Treated identically to `a;`
   - Result: First attachment processed if available
   - User Impact: Convenience - no need to remove colon

## Compatibility Matrix

| Syntax | Files Present | Behavior | Changed? |
|--------|---------------|----------|----------|
| `a: invoice.pdf` | 1+ with match | Process matched file | ❌ No |
| `a: invoice.pdf` | 1+ no match | Skip silently | ❌ No |
| `a: invoice` | Multiple matches | Process first match | ❌ No |
| `a;` | 0 files | Skip silently | ✅ New |
| `a;` | 1 file | Process first | ✅ New |
| `a;` | 2+ files | Process first | ✅ New |
| `a:` | Any | Treat as `a;` | ✅ New |
| `a: ` | Any | Treat as `a;` | ✅ New |
| `A;` | Any | Case-insensitive | ✅ New |

## Integration Points

### Input
- Mailgun webhook payload with attachments array
- Parsed by `parseEmailToTask()` function

### Output
- Task created in `taken` table via existing insert logic
- Attachment stored in Backblaze B2 via existing upload logic
- Attachment record created in `task_attachments` table (existing schema)

### Dependencies
- No changes to downstream processing
- `processTaskAttachment()` function receives same data structure
- Backblaze B2 upload logic unchanged
