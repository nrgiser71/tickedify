# Research: Email Bijlagen Verwerking

**Feature**: 049-email-bijlagen-verwerking
**Date**: 2025-01-31
**Status**: Complete

## Research Goal

Understand existing email import and bijlagen systems to identify integration points and reusable patterns for implementing attachment processing via @t syntax.

## 1. Email Import System (Feature 048)

### Current Implementation
- **Location**: `server.js` lines 1056-1244
- **Endpoint**: POST `/api/email/import`
- **Middleware**: `upload.any()` (Multer) - Already configured for multipart/form-data
- **Parser**: `parseEmailToTask()` function (line 1392-1600+)

### Key Components
```javascript
// Email import endpoint with Multer middleware
app.post('/api/email/import', upload.any(), async (req, res) => {
  // req.files available via Multer
  // req.body contains email fields (sender, subject, body-plain)

  const taskData = parseEmailToTask({
    sender, subject, body, timestamp
  });

  // Create task in database
  // Return success response
});
```

### Parser Helper Functions (Existing Patterns)
1. **truncateAtEndMarker(body)** (line ~1313)
   - Removes email signatures via `--end--` marker
   - Case-insensitive regex matching
   - Pattern: Input validation + early return

2. **parseDeferCode(segment)** (line ~1326)
   - Parses defer codes: df/dw/dm/d3m/d6m/dy
   - Returns lijst name or null
   - Pattern: Regex match + mapping object

3. **parsePriorityCode(segment)** (line ~1345)
   - Parses p0-p9 priority codes
   - Normalizes to Dutch lowercase values
   - Pattern: Regex match + conditional logic

4. **parseKeyValue(segment)** (line ~1361)
   - Parses p:, c:, d:, t: codes
   - Validates values per key type
   - Pattern: Regex match + validation + return object

### Integration Point
**Add `parseAttachmentCode(segment)` helper** alongside existing parsers, following established patterns:
- Regex matching for `a:` prefix
- Extract search term after colon
- Validate non-empty value
- Return `{ processAttachments: true, targetFilename: string }` or null

## 2. Bijlagen System (Existing)

### Database Schema
**Table**: `bijlagen` (database.js line ~261)

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

**Key Observations**:
- ✅ Schema supports all required metadata
- ✅ Foreign key CASCADE delete ensures cleanup
- ✅ No schema changes needed for feature
- ✅ Storage type locked to 'backblaze' (pure B2)

### Existing Upload Endpoint
**Location**: `server.js` line ~3730

```javascript
app.post('/api/taak/:id/bijlagen',
  requireAuth,
  uploadAttachment.single('file'),
  async (req, res) => {
    // Upload flow:
    // 1. Validate file (StorageManager.validateFile)
    // 2. Check quota (StorageManager.checkQuota)
    // 3. Upload to B2 (StorageManager.uploadFile)
    // 4. Insert bijlagen record
    // 5. Return bijlage metadata
});
```

### Integration Point
**Reuse storage workflow** from existing bijlage endpoint:
- Same validation logic (file size, MIME type)
- Same quota check (per-user limits)
- Same B2 upload pattern (StorageManager methods)
- Same database insert structure

## 3. Storage Manager (B2)

### Key Methods
**File**: `storage-manager.js`

```javascript
class StorageManager {
  async uploadFile(buffer, filename, mimetype, userId) {
    // Returns: { fileName: 'b2-object-key', fileUrl: '...' }
  }

  async checkQuota(userId, fileSize) {
    // Returns: true if within quota, false if exceeded
  }

  validateFile(file) {
    // Checks MIME type against ALLOWED_MIMETYPES
    // Checks file size against limits
    // Throws error if invalid
  }
}
```

### Configuration
```javascript
const STORAGE_CONFIG = {
  FREE_TIER_LIMIT: 100 * 1024 * 1024, // 100MB total
  MAX_FILE_SIZE_FREE: 4.5 * 1024 * 1024, // 4.5MB per file
  MAX_ATTACHMENTS_PER_TASK_FREE: 1,
  ALLOWED_MIMETYPES: [/* PDF, Word, Excel, images, etc */]
};
```

### Integration Point
**Direct method calls** after attachment match:
1. Call `validateFile(file)` to check MIME type and size
2. Call `checkQuota(userId, fileSize)` before upload
3. Call `uploadFile(buffer, filename, mimetype, userId)` for B2 upload
4. Use returned `fileName` as storage_path in bijlagen table

## 4. Mailgun Webhook Format

### Attachment Delivery
**Content-Type**: `multipart/form-data` (when attachments present)

**Files Array**: `req.files` via Multer
```javascript
req.files = [
  {
    fieldname: 'attachment-1',
    originalname: 'contract.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: <Buffer ...>,
    size: 245760  // bytes
  },
  // ... more files
]
```

### Integration Point
**Match req.files against search term** from @t syntax:
- Iterate through `req.files` array
- Compare `file.originalname.toLowerCase()` with search term
- Apply priority logic (exact > starts-with > contains)
- Return matched file object or null

## Key Findings

### No Unknowns Remain
- ✅ **Multer already configured**: `upload.any()` middleware provides req.files
- ✅ **StorageManager fully understood**: Methods, validation, quota checking
- ✅ **Database schema supports**: All metadata fields exist
- ✅ **Parser extension point clear**: Alongside existing helper functions
- ✅ **Integration pattern established**: Matches existing bijlagen upload

### Reusable Patterns Identified

1. **Helper Function Pattern**
   - `parseDeferCode()`, `parsePriorityCode()` → Apply to `parseAttachmentCode()`
   - Regex match + validation + return object or null
   - Early return for invalid input

2. **Storage Upload Pattern**
   - Existing bijlagen endpoint workflow
   - Validate → Check quota → Upload B2 → Insert DB
   - Error handling: Continue on failure, log reason

3. **Error Handling Pattern**
   - Task creation never blocked (FR-006)
   - Try-catch wrapping with detailed logging
   - Console.log with emoji prefixes (📎, ✅, ❌, ⚠️)

4. **Backwards Compatibility**
   - Feature must work with existing emails (no @t or no a:)
   - Existing tests must continue passing
   - No breaking changes to API responses

### Best Practices from Codebase

**String Matching**:
```javascript
// Case-insensitive
const term = searchTerm.toLowerCase();
const filename = file.originalname.toLowerCase();

// Trim whitespace
const cleaned = value.trim();

// Defensive coding
if (!value || value.length === 0) return null;
```

**Logging Style**:
```javascript
console.log('📎 Processing attachment:', filename);
console.log('✅ Attachment saved:', bijlageId);
console.log('❌ Failed to upload:', error.message);
console.log('⚠️ No match for:', searchTerm);
```

**Error Handling**:
```javascript
try {
  // Attempt operation
  const result = await riskyOperation();
  console.log('✅ Success:', result);
} catch (error) {
  console.error('❌ Error:', error);
  // Continue with task creation (don't throw)
}
```

## Decision Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|-------------------------|
| **Parser extension via helper function** | Consistent with existing parsers (defer, priority, key-value). Maintainable, testable, follows established pattern. | Inline parsing in parseEmailToTask (rejected: reduces maintainability, breaks pattern consistency) |
| **Attachment processing after task creation** | Ensures task always created (FR-006). Attachment is bonus, not blocker. User never loses task even if attachment fails. | Before task creation (rejected: violates FR-006 if attachment processing fails) |
| **Reuse StorageManager methods** | Avoid code duplication. Consistent B2 patterns across codebase. Leverages existing validation and quota logic. | Custom B2 upload implementation (rejected: unnecessary complexity, violates DRY) |
| **Smart priority matching** | Exact match most specific, reflects user intent. Prevents "subcontract.pdf" matching before "contract.pdf". | First match only (rejected: unpredictable results with partial terms) |
| **Single attachment per email** | 99% use case. Quota protection. Simple UX. Prevents abuse. | Multiple attachments (deferred to future: scope creep, complex quota management) |
| **Opt-in approach (a: code required)** | Prevents unwanted signature images. User control. Storage quota protection. | Opt-out or all-attachments (rejected: storage waste, poor UX) |

## Technical Constraints Identified

### Vercel Serverless Limits
- **Body size**: 4.5MB maximum (affects max file size per attachment)
- **Execution timeout**: 10 seconds typical (attachment processing must complete fast)
- **Ephemeral filesystem**: No local temp file storage (must use in-memory or direct B2 upload)

### Storage Constraints
- **B2 quota**: 100MB free tier per user (opt-in approach protects this)
- **File size**: Max 4.5MB per file (Vercel limit)
- **MIME types**: Only allowed types (security)

### Performance Goals
- **Attachment processing**: <5 seconds per email (within Vercel timeout)
- **B2 upload**: <10 seconds for max size files
- **No impact on task creation**: When attachments skipped (opt-in protection)

## Recommendations

### Implementation Order
1. **Phase 1**: Parser extension (parseAttachmentCode helper)
2. **Phase 2**: Matching logic (findMatchingAttachment with priority)
3. **Phase 3**: Storage integration (B2 upload + bijlagen insert)
4. **Phase 4**: Error handling (task creation continues on failures)
5. **Phase 5**: Logging and transparency (detailed console logs)

### Testing Strategy
1. **Unit tests**: Parser functions in isolation
2. **Integration tests**: End-to-end email import with attachments
3. **API tests**: Direct curl commands to /api/email/import (constitution requirement)
4. **Staging tests**: Real Mailgun webhooks on dev.tickedify.com

### Risk Mitigation
- **Storage quota**: Opt-in approach prevents abuse
- **File size limit**: Hard 4.5MB cap with validation
- **Processing timeout**: Fail fast if B2 upload exceeds limit
- **Task creation**: Always succeeds regardless of attachment status

## Conclusion

✅ **All research complete**. No unknowns remain. Integration points clearly identified. Existing patterns established. Ready for design phase (data model, contracts, tasks).

**Next Step**: Phase 1 - Design artifacts (data-model.md, contracts/, quickstart.md)
