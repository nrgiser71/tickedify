# Data Model: Email Bijlagen Verwerking

**Feature**: 049-email-bijlagen-verwerking
**Date**: 2025-01-31
**Status**: Complete

## Overview

This feature extends the existing `bijlagen` table to support attachments from email imports. No database schema changes required - the existing structure fully supports email-sourced attachments.

## Entities

### Attachment Metadata (Existing `bijlagen` Table)

**Purpose**: Store metadata for files attached to tasks, whether uploaded via UI or imported via email.

**Schema** (unchanged, from database.js line ~261):
```sql
CREATE TABLE IF NOT EXISTS bijlagen (
  id VARCHAR(50) PRIMARY KEY,
  taak_id VARCHAR(50) NOT NULL REFERENCES taken(id) ON DELETE CASCADE,
  bestandsnaam VARCHAR(255) NOT NULL,
  bestandsgrootte INTEGER NOT NULL,
  mimetype VARCHAR(100) NOT NULL,
  storage_type VARCHAR(20) NOT NULL DEFAULT 'backblaze'
    CHECK (storage_type = 'backblaze'),
  storage_path VARCHAR(500) NOT NULL,
  geupload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(50) REFERENCES users(id)
)
```

**Field Usage for Email Attachments**:

| Field | Source | Example |
|-------|--------|---------|
| `id` | Generated | `bijlage_1738339200000_abc123` |
| `taak_id` | Created task ID | `task_1738339100000_xyz789` |
| `bestandsnaam` | `file.originalname` | `contract.pdf` |
| `bestandsgrootte` | `file.size` | `245760` (bytes) |
| `mimetype` | `file.mimetype` | `application/pdf` |
| `storage_type` | Constant | `'backblaze'` |
| `storage_path` | B2 object key | `user123/bijlage_...` |
| `geupload` | Auto-generated | `2025-01-31 10:00:00` |
| `user_id` | Email import user | `user_123abc` |

**Relationships**:
- **Many-to-One** with `taken`: Multiple bijlagen per task
- **Cascade Delete**: Removing task removes all its bijlagen
- **User Ownership**: Bijlagen tied to user for quota tracking

### Email Import Extended Data (Runtime Only)

**Purpose**: Pass attachment configuration from parser to email import endpoint.

**Structure** (not persisted to database):
```javascript
{
  // Existing parseEmailToTask return fields
  tekst: string,
  opmerkingen: string,
  lijst: string,
  projectId: number | null,
  contextId: number | null,
  verschijndatum: string | null,
  duur: number | null,
  prioriteit: string | null,

  // NEW: Attachment configuration
  attachmentConfig: {
    processAttachments: boolean,
    targetFilename: string
  } | null
}
```

**Example Values**:
```javascript
// Email with @t a:contract;
attachmentConfig: {
  processAttachments: true,
  targetFilename: 'contract'
}

// Email with @t p: Project; (no a: code)
attachmentConfig: null
```

## State Transitions

### Attachment Processing Flow

```
┌─────────────────┐
│ Email Received  │
│ via Mailgun     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse @t Syntax │
│ (parseEmailToTask)
└────────┬────────┘
         │
         ▼
  ╔═════════════════╗
  ║ Attachment Code ║
  ║  Detected?      ║
  ╚═══════╤═════════╝
          │
      ┌───┴───┐
      │       │
    No│       │Yes
      │       │
      ▼       ▼
┌──────────┐ ┌──────────────────┐
│ Create   │ │ Search req.files │
│ Task     │ │ for match        │
│ Only     │ └────────┬─────────┘
└──────────┘          │
                      ▼
              ╔══════════════╗
              ║ Match Found? ║
              ╚══════╤═══════╝
                     │
                 ┌───┴───┐
                 │       │
               No│       │Yes
                 │       │
                 ▼       ▼
         ┌────────────┐ ┌──────────────┐
         │ Create     │ │ Validate     │
         │ Task Only  │ │ File         │
         │ (Log no    │ │ (Size, Type, │
         │  match)    │ │  Quota)      │
         └────────────┘ └──────┬───────┘
                               │
                           ┌───┴───┐
                           │       │
                         OK│       │Fail
                           │       │
                           ▼       ▼
                   ┌──────────┐ ┌──────────┐
                   │ Upload   │ │ Create   │
                   │ to B2    │ │ Task Only│
                   │          │ │ (Log     │
                   └────┬─────┘ │  error)  │
                        │       └──────────┘
                        ▼
                   ┌──────────┐
                   │ Insert   │
                   │ bijlagen │
                   │ Record   │
                   └────┬─────┘
                        │
                        ▼
                ┌───────────────┐
                │ Task +        │
                │ Attachment    │
                │ Created       │
                └───────────────┘
```

### State Invariants

1. **Task Always Created**: Regardless of attachment processing outcome (FR-006)
2. **Atomic Bijlage Insert**: Either complete record or none (database transaction)
3. **B2 Consistency**: File in B2 if and only if bijlagen record exists
4. **User Quota**: Always checked before upload, never exceeded

## Validation Rules

### File Size (FR-011, FR-014)
```javascript
MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB (Vercel limit)

if (file.size > MAX_FILE_SIZE) {
  // Log error, create task without attachment
  // Error: "File too large: {filename} ({size} bytes, max 4.5MB)"
}
```

### MIME Type (FR-012)
```javascript
ALLOWED_MIMETYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  // Archives
  'application/zip', 'application/x-rar-compressed',
  // Other
  'text/plain', 'text/csv', 'application/json'
];

if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
  // Log error, create task without attachment
  // Error: "File type not allowed: {mimetype}"
}
```

### User Quota (FR-013)
```javascript
FREE_TIER_LIMIT = 100 * 1024 * 1024; // 100MB total per user

const userUsage = await getUserStorageUsage(userId);
if (userUsage + file.size > FREE_TIER_LIMIT) {
  // Log error, create task without attachment
  // Error: "Storage quota exceeded: {current}MB / 100MB"
}
```

### Filename Matching (FR-003, FR-004)
```javascript
// Case-insensitive
const term = targetFilename.toLowerCase();
const filename = file.originalname.toLowerCase();

// UTF-8 support
// Handles special characters: é, ü, ñ, etc.

// Spaces preserved
// "my document.pdf" matches "document" or "my document"
```

## Matching Priority Algorithm (FR-007, FR-008, FR-009)

### Priority Levels
1. **Exact Match**: Filename exactly equals search term
2. **Starts-With Match**: Filename starts with search term
3. **Contains Match**: Search term appears anywhere in filename
4. **First in Array**: When multiple files have same priority

### Implementation
```javascript
function findMatchingAttachment(files, searchTerm) {
  const term = searchTerm.toLowerCase().trim();

  // Sort by priority
  const sortedFiles = files.sort((a, b) => {
    const aName = a.originalname.toLowerCase();
    const bName = b.originalname.toLowerCase();

    // Exact match wins
    if (aName === term && bName !== term) return -1;
    if (bName === term && aName !== term) return 1;

    // Starts-with wins over contains
    if (aName.startsWith(term) && !bName.startsWith(term)) return -1;
    if (bName.startsWith(term) && !aName.startsWith(term)) return 1;

    // Contains match (both or neither)
    // Keep original array order
    return 0;
  });

  // Find first file containing term
  return sortedFiles.find(f =>
    f.originalname.toLowerCase().includes(term)
  ) || null;
}
```

### Examples

**Scenario 1: Exact Match Priority**
```javascript
files = ['subcontract.pdf', 'contract.pdf', 'contract-v1.pdf'];
searchTerm = 'contract';
result = 'contract.pdf'; // Exact match wins
```

**Scenario 2: Starts-With Priority**
```javascript
files = ['subcontract.pdf', 'contract-final.pdf'];
searchTerm = 'contract';
result = 'contract-final.pdf'; // Starts-with wins over contains
```

**Scenario 3: Type-Based Filtering**
```javascript
files = ['image.png', 'document.pdf', 'spreadsheet.xlsx'];
searchTerm = 'pdf';
result = 'document.pdf'; // First file containing "pdf"
```

**Scenario 4: No Match**
```javascript
files = ['image.png', 'document.docx'];
searchTerm = 'invoice';
result = null; // No match found
// Log: "Available files: image.png, document.docx"
```

## Error Handling States

### Error Categories

1. **No Match** (FR-015)
   - Attachment code present, but no file matches search term
   - State: Task created, no bijlage
   - Log: Available filenames for debugging

2. **Validation Failed** (FR-016)
   - File too large OR MIME type not allowed OR quota exceeded
   - State: Task created, no bijlage
   - Log: Specific validation failure reason

3. **Storage Failed** (FR-017)
   - B2 upload error OR database insert error
   - State: Task created, no bijlage (B2 cleanup attempted)
   - Log: Error message and stack trace

4. **No Attachment Code** (FR-001)
   - Email has files, but no `a:` code in @t syntax
   - State: Task created, no bijlage (opt-in protection)
   - Log: "Email has N attachment(s) but no 'a;' code - skipping"

### Logging Requirements (FR-019 to FR-022)

**Success**:
```javascript
console.log('✅ Matched attachment: "contract" → contract.pdf');
console.log('📎 Uploading to B2: contract.pdf (245 KB)');
console.log('✅ Attachment saved: bijlage_123abc');
```

**No Match**:
```javascript
console.log('❌ No match for: "invoice"');
console.log('   Available files: contract.pdf, signature.png');
```

**Multiple Matches**:
```javascript
console.log('✅ Matched attachment: "contract" → contract.pdf');
console.log('ℹ️  Other matches skipped: contract-v1.pdf, subcontract.pdf');
```

**Validation Error**:
```javascript
console.log('⚠️ File too large: document.pdf (10 MB, max 4.5 MB)');
console.log('   Task created without attachment');
```

**Storage Error**:
```javascript
console.error('❌ Failed to upload attachment:', error.message);
console.error('   Stack:', error.stack);
console.log('   Task created without attachment');
```

## Data Flow Summary

```
Mailgun → req.files (Multer)
          ↓
       parseEmailToTask() → attachmentConfig
          ↓
       Create Task (always succeeds)
          ↓
       IF attachmentConfig → Process Attachment
          ├─ Match file
          ├─ Validate file
          ├─ Upload to B2
          └─ Insert bijlagen record
          ↓
       Return Response (task + optional attachment info)
```

## Database Queries

### Insert Bijlage (After Successful Upload)
```sql
INSERT INTO bijlagen (
  id,
  taak_id,
  bestandsnaam,
  bestandsgrootte,
  mimetype,
  storage_type,
  storage_path,
  user_id
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *
```

### Check User Storage Usage (Before Upload)
```sql
SELECT
  COALESCE(SUM(bestandsgrootte), 0) as used_bytes
FROM bijlagen
WHERE user_id = $1
```

### Get Bijlagen for Task (Existing Query)
```sql
SELECT * FROM bijlagen
WHERE taak_id = $1
ORDER BY geupload DESC
```

## Conclusion

**Data model complete**. No schema changes required. Existing `bijlagen` table fully supports email attachment metadata. Runtime attachment configuration passed through parser return value. State machine ensures task always created regardless of attachment outcome.

**Next**: Contract definitions (API request/response formats)
