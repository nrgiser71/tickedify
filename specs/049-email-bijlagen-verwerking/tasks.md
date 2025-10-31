# Tasks: Email Bijlagen Verwerking via @t Syntax

**Feature**: 049-email-bijlagen-verwerking
**Branch**: `049-email-bijlagen-verwerking`
**Date**: 2025-01-31
**Total Tasks**: 30

## Overview

Implementation van email attachment processing via @t `a:searchterm;` syntax extension. Opt-in approach met smart filename matching (exact > starts-with > contains) en integratie met bestaande bijlagen systeem.

**Key Components**:
- Parser extension: `parseAttachmentCode()` helper function
- Matching logic: `findMatchingAttachment()` met priority system
- Storage integration: StorageManager methods voor B2 upload
- Endpoint extension: `/api/email/import` attachment processing

**Development Approach**: TDD (tests before implementation), staging-first deployment

---

## Task Categories

- **Foundation** (T001-T003): Setup, review, environment
- **Parser Extension** (T004-T007): @t syntax parsing [P]
- **Matching Logic** (T008-T012): Filename matching met priority [P]
- **Storage Integration** (T013-T016): B2 upload en bijlagen DB
- **Error Handling** (T017-T021): Resilient task creation [P]
- **Logging** (T022-T024): Transparency en debugging [P]
- **Validation** (T025-T028): Quickstart scenarios [P]
- **Documentation** (T029-T030): ARCHITECTURE, changelog, help

---

## T001: Foundation - Review Existing Email Import System

**Type**: foundation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (lines 1056-1244, 1392-1600+)
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/specs/049-email-bijlagen-verwerking/research.md`

**Dependencies**: None
**Parallel**: No

### Requirements
- Understand `/api/email/import` endpoint structure (line 1057)
- Understand `parseEmailToTask()` function (line 1392)
- Identify helper function patterns (parseDeferCode, parsePriorityCode, parseKeyValue)
- Verify Multer `upload.any()` middleware provides `req.files`

### Acceptance Criteria
- [x] Documented integration point for `parseAttachmentCode()` helper
- [x] Documented `req.files` structure from Mailgun webhooks
- [x] Documented existing helper function patterns to follow
- [x] Identified where to add attachment processing logic (after task creation)

### Implementation Notes
- Read research.md Section 1 for email import system details
- Existing parsers follow pattern: regex match → validate → return object or null
- Attachment processing MUST happen after task creation (FR-006)

---

## T002: Foundation - Review Bijlagen System

**Type**: foundation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/database.js` (line ~261)
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (line ~3730)
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/storage-manager.js`

**Dependencies**: None
**Parallel**: Yes [P]

### Requirements
- Understand `bijlagen` table schema (no schema changes needed)
- Understand existing bijlage upload endpoint `/api/taak/:id/bijlagen`
- Understand StorageManager methods: `uploadFile()`, `validateFile()`, `checkQuota()`
- Verify STORAGE_CONFIG constants (MAX_FILE_SIZE_FREE, FREE_TIER_LIMIT)

### Acceptance Criteria
- [ ] Documented bijlagen table columns and foreign keys
- [ ] Documented StorageManager.uploadFile() signature and return value
- [ ] Documented validation and quota check workflow
- [ ] Confirmed no database schema changes needed

### Implementation Notes
- Read research.md Section 2 & 3 for bijlagen and storage details
- Reuse existing validation logic from `/api/taak/:id/bijlagen` endpoint
- B2 storage path format: `user123/bijlage_timestamp_random`

---

## T003: Foundation - Setup Test Environment

**Type**: foundation
**Files**:
- Test credentials configuration
- Staging environment access

**Dependencies**: None
**Parallel**: Yes [P]

### Requirements
- Verify access to dev.tickedify.com staging environment
- Verify test credentials work (jan@buskens.be)
- Verify import code available for test user
- Create test attachment files (contract.pdf, signature.png, etc.)

### Acceptance Criteria
- [ ] Can login to dev.tickedify.com/app with test credentials
- [ ] Import code retrieved from settings
- [ ] Test files created (5 different PDFs for matching tests)
- [ ] `/api/version` endpoint accessible via curl with `-s -L -k` flags

### Implementation Notes
- See quickstart.md Prerequisites section for details
- Test files needed: contract.pdf, contract-v1.pdf, subcontract.pdf, invoice.pdf, large.pdf (5MB)
- Staging uses Vercel Authentication (accessible via MCP tools)

---

## T004: Parser Extension - Contract Test for `parseAttachmentCode()`

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/email-import-attachment.test.js` (new file)

**Dependencies**: T001
**Parallel**: Yes [P]

### Requirements
- FR-002: System MUST support attachment code format `a:searchterm;`
- Test must fail initially (TDD approach)

### Acceptance Criteria
- [ ] Test file created with describe block
- [ ] Test case: Parse valid `a:contract;` → returns `{ processAttachments: true, targetFilename: 'contract' }`
- [ ] Test case: Parse `a:pdf;` → returns `{ processAttachments: true, targetFilename: 'pdf' }`
- [ ] Test case: Parse invalid `a:;` (empty value) → returns null
- [ ] Test case: Parse without `a:` code → returns null
- [ ] Test currently fails (function not implemented yet)

### Implementation Notes
- Follow pattern from existing parser tests
- Use Jest or similar test framework
- Test input: segment string from @t syntax split

---

## T005: Parser Extension - Implement `parseAttachmentCode()` Helper

**Type**: implementation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (add function ~line 1390, alongside other parsers)

**Dependencies**: T004 (test must exist first)
**Parallel**: No (same file as other tasks)

### Requirements
- FR-002: System MUST support attachment code format `a:searchterm;`
- Follow existing helper function patterns (parseDeferCode, parsePriorityCode)

### Acceptance Criteria
- [x] Function added: `parseAttachmentCode(segment)`
- [x] Regex matches `a:` prefix
- [x] Extracts search term after colon
- [x] Trims whitespace from search term
- [x] Returns `{ processAttachments: true, targetFilename: string }` for valid input
- [x] Returns null for invalid input (empty term, no match)
- [x] T004 contract test passes

### Implementation Notes
```javascript
// Add alongside other helper functions (~line 1390)
function parseAttachmentCode(segment) {
    const attMatch = segment.match(/^a:(.+)$/i);
    if (!attMatch) return null;

    const filename = attMatch[1].trim();
    if (!filename) return null;

    return {
        processAttachments: true,
        targetFilename: filename
    };
}
```

---

## T006: Parser Extension - Integrate into `parseEmailToTask()`

**Type**: implementation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (line ~1392, parseEmailToTask function)

**Dependencies**: T005
**Parallel**: No (same file)

### Requirements
- Parse `a:` code from @t syntax line
- Add attachmentConfig to taskData return object
- Maintain backwards compatibility (emails without @t)

### Acceptance Criteria
- [x] @t line split by semicolons (existing pattern)
- [x] Each segment checked with `parseAttachmentCode()`
- [x] First match stored in `taskData.attachmentConfig`
- [x] Duplicate `a:` codes: first wins, rest ignored
- [x] No `a:` code: attachmentConfig remains null
- [x] Return value includes: `attachmentConfig: { processAttachments, targetFilename } | null`

### Implementation Notes
- Add parsing loop alongside existing defer/priority/keyvalue parsing
- Example location: ~line 1500-1550 in parseEmailToTask
- Follow pattern: `const attResult = parseAttachmentCode(segment.trim());`

---

## T007: Parser Extension - Integration Test

**Type**: integration-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/integration/email-parser-attachment.test.js` (new file)

**Dependencies**: T006
**Parallel**: Yes [P]

### Requirements
- End-to-end @t syntax parsing with `a:` code
- Verify attachmentConfig in parseEmailToTask return value

### Acceptance Criteria
- [ ] Test: `@t p: Project; a:contract;` → attachmentConfig.targetFilename = 'contract'
- [ ] Test: `@t a:pdf; c: Context;` → attachmentConfig present (order doesn't matter)
- [ ] Test: `@t p: Project;` (no a:) → attachmentConfig = null
- [ ] Test: `@t a:doc1; a:doc2;` (duplicates) → targetFilename = 'doc1' (first wins)
- [ ] Test: Email without @t → attachmentConfig = null (backwards compatible)

### Implementation Notes
- Call parseEmailToTask with test email data
- Assert on returned taskData.attachmentConfig value
- Use realistic email body examples

---

## T008: Matching Logic - Contract Test for Exact Match Priority

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/attachment-matching.test.js` (new file)

**Dependencies**: T001
**Parallel**: Yes [P]

### Requirements
- FR-007: System MUST prioritize exact filename match over partial match

### Acceptance Criteria
- [ ] Test: files=['subcontract.pdf', 'contract.pdf'], term='contract' → 'contract.pdf'
- [ ] Test: files=['CONTRACT.PDF', 'contract-v1.pdf'], term='contract' → 'CONTRACT.PDF' (case-insensitive exact)
- [ ] Test: files=['document.pdf'], term='document' → 'document.pdf' (exact match)
- [ ] Test currently fails (function not implemented)

### Implementation Notes
- Test function signature: `findMatchingAttachment(files, searchTerm)`
- Files parameter: array of objects with `originalname` property
- Expected return: file object or null

---

## T009: Matching Logic - Contract Test for Starts-With Priority

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/attachment-matching.test.js`

**Dependencies**: T008
**Parallel**: Yes [P]

### Requirements
- FR-008: System MUST prioritize filename starting with search term over contains match

### Acceptance Criteria
- [ ] Test: files=['subcontract.pdf', 'contract-final.pdf'], term='contract' → 'contract-final.pdf'
- [ ] Test: files=['mycontract.pdf', 'contract.pdf'], term='contract' → 'contract.pdf' (exact beats starts-with)
- [ ] Test currently fails (function not implemented)

---

## T010: Matching Logic - Contract Test for Contains Matching

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/attachment-matching.test.js`

**Dependencies**: T008
**Parallel**: Yes [P]

### Requirements
- FR-003: System MUST perform case-insensitive partial matching using CONTAINS logic
- FR-004: System MUST match based on search term appearing anywhere in filename

### Acceptance Criteria
- [ ] Test: files=['my_contract_final.pdf'], term='contract' → match (contains)
- [ ] Test: files=['INVOICE.PDF'], term='invoice' → match (case-insensitive)
- [ ] Test: files=['document.pdf'], term='invoice' → null (no match)
- [ ] Test: files=['contract.pdf', 'invoice.pdf'], term='pdf' → 'contract.pdf' (first match)

---

## T011: Matching Logic - Implement `findMatchingAttachment()`

**Type**: implementation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (add function ~line 1390)

**Dependencies**: T008, T009, T010 (tests must exist first)
**Parallel**: No (same file)

### Requirements
- FR-007, FR-008, FR-009: Priority matching (exact > starts-with > contains)
- FR-003: Case-insensitive matching
- FR-010: Support extension-only search (e.g., `pdf` matches `document.pdf`)

### Acceptance Criteria
- [x] Function added: `findMatchingAttachment(files, searchTerm)`
- [x] Case-insensitive comparison (toLowerCase)
- [x] Sort files by priority: exact → starts-with → contains
- [x] Return first file containing term, or null if no match
- [x] Whitespace trimmed from search term
- [x] All contract tests (T008-T010) pass

### Implementation Notes
- See data-model.md "Matching Priority Algorithm" section for implementation
- Use Array.sort() with custom comparator for priority
- Use Array.find() with includes() for contains check

---

## T012: Matching Logic - Integration Test

**Type**: integration-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/integration/attachment-matching-scenarios.test.js` (new file)

**Dependencies**: T011
**Parallel**: Yes [P]

### Requirements
- End-to-end matching scenarios from quickstart.md

### Acceptance Criteria
- [ ] Scenario: Multiple matches with mixed priority → correct file selected
- [ ] Scenario: Type-based filtering (`a:pdf;`) → first PDF selected
- [ ] Scenario: Uppercase/lowercase mixed → case-insensitive match works
- [ ] Scenario: No match → returns null, no errors thrown
- [ ] All edge cases from data-model.md Examples section covered

---

## T013: Storage Integration - Contract Test for B2 Upload

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/storage-upload.test.js` (new file)

**Dependencies**: T002
**Parallel**: Yes [P]

### Requirements
- FR-025: System MUST use existing storage system for attachment persistence
- Verify StorageManager.uploadFile() integration

### Acceptance Criteria
- [ ] Test: Valid file (buffer, filename, mimetype, userId) → uploadFile succeeds
- [ ] Test: Returns B2 object key in `fileName` field
- [ ] Test: File retrievable from B2 after upload
- [ ] Test currently fails (integration not implemented)

### Implementation Notes
- Mock or use test B2 bucket
- Verify returned structure: `{ fileName: 'user123/bijlage_...', ... }`

---

## T014: Storage Integration - Contract Test for Bijlage DB Insert

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/bijlage-insert.test.js` (new file)

**Dependencies**: T002
**Parallel**: Yes [P]

### Requirements
- FR-023: System MUST link saved attachment to created task via task ID
- FR-024: System MUST store attachment metadata

### Acceptance Criteria
- [ ] Test: Insert bijlage record with all required fields
- [ ] Test: Foreign key constraint enforced (taak_id must exist)
- [ ] Test: CASCADE delete works (delete task → bijlage deleted)
- [ ] Test: Generated ID format: `bijlage_timestamp_random`
- [ ] Test currently fails (endpoint not implemented)

### Implementation Notes
- Use test database or transaction rollback
- Verify all columns from data-model.md schema

---

## T015: Storage Integration - Implement Attachment Processing in `/api/email/import`

**Type**: implementation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (line ~1200, after task creation)

**Dependencies**: T011, T013, T014
**Parallel**: No (same file)

### Requirements
- FR-001: Only process when attachmentConfig present (opt-in)
- FR-005: Process maximum 1 attachment per email
- FR-006: Create task even when attachment processing fails

### Acceptance Criteria
- [x] Check `taskData.attachmentConfig` after parsing
- [x] IF processAttachments: call `findMatchingAttachment(req.files, targetFilename)`
- [x] IF match found: validate file (size, type, quota)
- [x] IF validation passes: upload to B2 via StorageManager
- [x] IF upload succeeds: insert bijlage record with task_id
- [x] Task creation NEVER blocked by attachment failures
- [x] Return response includes attachment info (or null)

### Implementation Notes
```javascript
// After task creation (line ~1200)
let attachmentResult = null;

if (taskData.attachmentConfig?.processAttachments && req.files?.length > 0) {
  try {
    const matchedFile = findMatchingAttachment(
      req.files,
      taskData.attachmentConfig.targetFilename
    );

    if (matchedFile) {
      // Validate, upload, insert bijlage
      // Set attachmentResult
    }
  } catch (error) {
    console.error('❌ Attachment processing error:', error);
    // Continue - task already created
  }
}

// Return response with attachment info
res.json({ success: true, task: createdTask, attachment: attachmentResult });
```

---

## T016: Storage Integration - Integration Test

**Type**: integration-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/integration/email-import-with-attachment.test.js` (new file)

**Dependencies**: T015
**Parallel**: Yes [P]

### Requirements
- End-to-end email import with attachment processing
- Verify all steps: parse → match → upload → insert

### Acceptance Criteria
- [ ] Test: Email with `a:contract;` + files → bijlage record created
- [ ] Test: Verify task_id foreign key correct
- [ ] Test: Verify B2 file exists (via download endpoint)
- [ ] Test: Verify attachment metadata accurate (size, mimetype, filename)
- [ ] Test: Response includes attachment info

---

## T017: Error Handling - Contract Test for File Not Found

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/error-handling.test.js` (new file)

**Dependencies**: T015
**Parallel**: Yes [P]

### Requirements
- FR-015: System MUST continue task creation when attachment matching fails

### Acceptance Criteria
- [ ] Test: `a:invoice;` but no matching file → task created, no bijlage
- [ ] Test: Response includes task, attachment = null
- [ ] Test: No error thrown, HTTP 200 returned
- [ ] Test currently fails (error handling not complete)

---

## T018: Error Handling - Contract Test for File Size Exceeded

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/error-handling.test.js`

**Dependencies**: T015
**Parallel**: Yes [P]

### Requirements
- FR-014: System MUST reject attachments exceeding maximum file size limit
- FR-016: System MUST continue task creation when attachment validation fails

### Acceptance Criteria
- [ ] Test: File > 4.5MB → task created, no bijlage, error logged
- [ ] Test: Response includes task, attachment = null
- [ ] Test: Log shows: "File too large: {filename} ({size} bytes, max 4.5MB)"

---

## T019: Error Handling - Contract Test for Quota Exceeded

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/error-handling.test.js`

**Dependencies**: T015
**Parallel**: Yes [P]

### Requirements
- FR-013: System MUST check user storage quota before saving attachment
- FR-016: System MUST continue task creation when validation fails

### Acceptance Criteria
- [ ] Test: User at 100MB limit + new file → task created, no bijlage
- [ ] Test: Response includes task, attachment = null
- [ ] Test: Log shows: "Storage quota exceeded: {current}MB / 100MB"

---

## T020: Error Handling - Contract Test for Storage Failure

**Type**: contract-test
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/tests/contract/error-handling.test.js`

**Dependencies**: T015
**Parallel**: Yes [P]

### Requirements
- FR-017: System MUST continue task creation when attachment storage fails

### Acceptance Criteria
- [ ] Test: B2 upload error → task created, no bijlage, error logged
- [ ] Test: DB insert error → task created, no bijlage, B2 cleanup attempted
- [ ] Test: Response includes task, attachment = null

---

## T021: Error Handling - Implement Complete Error Handling

**Type**: implementation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (attachment processing block)

**Dependencies**: T017, T018, T019, T020
**Parallel**: No (same file)

### Requirements
- FR-015, FR-016, FR-017, FR-018: Error handling for all failure scenarios
- FR-006: Task creation NEVER blocked

### Acceptance Criteria
- [x] Try-catch wrapper around entire attachment processing
- [x] File not found: Log available filenames, continue
- [x] File too large: Log size, skip upload, continue
- [x] Quota exceeded: Check before upload, log error, continue
- [x] B2 upload failure: Log error, continue
- [x] DB insert failure: Log error, attempt B2 cleanup, continue
- [x] Task creation always succeeds (HTTP 200)
- [x] All error contract tests (T017-T020) pass

### Implementation Notes
- Wrap attachment processing in try-catch
- Individual validation checks before upload
- Detailed error logging for each failure type
- Never throw errors that would block task creation

---

## T022: Logging - Implement Match Success Logging

**Type**: implementation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (attachment processing)

**Dependencies**: T015
**Parallel**: Yes [P]

### Requirements
- FR-019: System MUST log which attachment was matched and saved

### Acceptance Criteria
- [x] Log when match found: `✅ Matched attachment: "{term}" → {filename}`
- [x] Log upload start: `📎 Uploading to B2: {filename} ({size} KB)`
- [x] Log upload success: `✅ Attachment saved: {bijlage_id}`
- [x] Emoji prefixes for clarity (✅ success, 📎 info)

---

## T023: Logging - Implement Match Failure Logging

**Type**: implementation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (attachment processing)

**Dependencies**: T015
**Parallel**: Yes [P]

### Requirements
- FR-020: System MUST log available attachment filenames when search term doesn't match
- FR-021: System MUST log other matching attachments that were skipped

### Acceptance Criteria
- [x] Log when no match: `❌ No match for: "{term}"`
- [x] Log available files: `   Available files: file1.pdf, file2.png`
- [x] Log when multiple matches: `ℹ️  Other matches skipped: file2.pdf, file3.pdf`

---

## T024: Logging - Implement Error Logging

**Type**: implementation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js` (error handling)

**Dependencies**: T021
**Parallel**: Yes [P]

### Requirements
- FR-022: System MUST provide clear error messages for attachment failures

### Acceptance Criteria
- [x] Log validation errors: `⚠️ File too large: {filename} ({size} MB, max 4.5 MB)`
- [x] Log quota errors: `⚠️ Storage quota exceeded: {current}MB / 100MB`
- [x] Log upload errors: `❌ Failed to upload attachment: {error.message}`
- [x] Log with stack traces for debugging: `   Stack: {error.stack}`

---

## T025: Validation - Quickstart Scenario 1 (Successful Match)

**Type**: validation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/specs/049-email-bijlagen-verwerking/quickstart.md` (Scenario 1)

**Dependencies**: T015, T022
**Parallel**: Yes [P]

### Requirements
- Execute Scenario 1 from quickstart.md on staging
- Verify attachment successfully processed

### Acceptance Criteria
- [ ] Curl command succeeds (HTTP 200)
- [ ] Response shows attachment.processed = true
- [ ] Bijlage record exists in database
- [ ] File downloadable from B2
- [ ] Server logs show successful match and upload

### Implementation Notes
- Run on dev.tickedify.com staging environment
- Use test import code from settings
- Verify with curl commands from quickstart.md

---

## T026: Validation - Quickstart Scenario 2 (Opt-In Protection)

**Type**: validation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/specs/049-email-bijlagen-verwerking/quickstart.md` (Scenario 2)

**Dependencies**: T015
**Parallel**: Yes [P]

### Requirements
- Execute Scenario 2 from quickstart.md
- Verify NO attachment processing without `a:` code (FR-001)

### Acceptance Criteria
- [ ] Curl command succeeds (HTTP 200)
- [ ] Task created successfully
- [ ] Response shows attachment = null
- [ ] NO bijlage record in database
- [ ] Server logs show: "Email has N attachment(s) but no 'a;' code - skipping"

---

## T027: Validation - Quickstart Scenarios 3-5 (Matching Logic)

**Type**: validation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/specs/049-email-bijlagen-verwerking/quickstart.md` (Scenarios 3, 4, 5)

**Dependencies**: T015, T011, T023
**Parallel**: Yes [P]

### Requirements
- Execute Scenarios 3 (partial match priority), 4 (file not found), 5 (type filtering)
- Verify matching logic and error handling

### Acceptance Criteria
- [ ] Scenario 3: Exact match prioritized over partial
- [ ] Scenario 4: Task created without attachment, available files logged
- [ ] Scenario 5: Type-based filtering (`a:pdf;`) matches first PDF
- [ ] All server logs show correct priority decisions

---

## T028: Validation - Quickstart Scenarios 6-8 (Edge Cases)

**Type**: validation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/specs/049-email-bijlagen-verwerking/quickstart.md` (Scenarios 6, 7, 8)

**Dependencies**: T021, T024
**Parallel**: Yes [P]

### Requirements
- Execute Scenarios 6 (file size limit), 7 (case-insensitive), 8 (backwards compat)
- Verify error handling and edge cases

### Acceptance Criteria
- [ ] Scenario 6: File > 4.5MB rejected, task created, error logged
- [ ] Scenario 7: Case-insensitive matching works (CONTRACT.PDF matches "contract")
- [ ] Scenario 8: Emails without @t syntax work (backwards compatible)
- [ ] All edge cases pass validation checklist

---

## T029: Documentation - Update ARCHITECTURE.md and Help Files

**Type**: documentation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/ARCHITECTURE.md`
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/email-import-help.md`

**Dependencies**: T015
**Parallel**: Yes [P]

### Requirements
- Document new parser functions and attachment processing
- Update email import help with `a:` syntax examples

### Acceptance Criteria
- [ ] ARCHITECTURE.md updated:
  - Add `parseAttachmentCode()` location (~line 1390)
  - Add `findMatchingAttachment()` location
  - Add attachment processing in email import endpoint (~line 1200)
- [ ] email-import-help.md updated:
  - Add `a:searchterm;` syntax section
  - Add examples: `a:contract;`, `a:pdf;`, `a:invoice;`
  - Add notes about opt-in behavior and matching priority
  - Add troubleshooting section

### Implementation Notes
- Follow existing ARCHITECTURE.md format with line number references
- Use clear examples in help documentation
- Mention 4.5MB size limit and file type restrictions

---

## T030: Documentation - Update Changelog and Version

**Type**: documentation
**Files**:
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/package.json`
- `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/changelog.html`

**Dependencies**: T028 (all validation complete)
**Parallel**: No (deployment critical)

### Requirements
- IV. Versioning & Changelog Discipline (Constitution)
- Bump version to 0.21.13
- Add changelog entry

### Acceptance Criteria
- [ ] package.json version: "0.21.12" → "0.21.13"
- [ ] changelog.html entry added:
  - Version: 0.21.13
  - Date: 2025-01-31
  - Badge: "badge-latest"
  - Category: ⚡ Features
  - Description: Email bijlagen verwerking via @t a:searchterm; syntax
  - Details: Opt-in attachment processing, smart matching (exact > starts-with > contains), max 1 attachment per email
- [ ] Previous version badge changed to "badge-feature"

### Implementation Notes
- This task MUST be completed before any commit/deployment
- Version bump and changelog in same commit as feature code
- Follow constitution requirement for version discipline

---

## Parallel Execution Guide

### Phase 1: Foundation (Sequential)
```bash
# Run in order
T001 → T002 → T003
```

### Phase 2: Parser + Matching Tests (Parallel)
```bash
# All can run in parallel
Task(subagent_type: "general-purpose", prompt: "Complete T004")
Task(subagent_type: "general-purpose", prompt: "Complete T008")
Task(subagent_type: "general-purpose", prompt: "Complete T009")
Task(subagent_type: "general-purpose", prompt: "Complete T010")
```

### Phase 3: Parser + Matching Implementation (Sequential, same file)
```bash
# Run in order (same file: server.js)
T005 → T006 → T007 → T011 → T012
```

### Phase 4: Storage Tests (Parallel)
```bash
# All can run in parallel
Task(subagent_type: "general-purpose", prompt: "Complete T013")
Task(subagent_type: "general-purpose", prompt: "Complete T014")
```

### Phase 5: Storage Implementation (Sequential, same file)
```bash
# Run in order (same file: server.js)
T015 → T016
```

### Phase 6: Error Handling Tests (Parallel)
```bash
# All can run in parallel
Task(subagent_type: "general-purpose", prompt: "Complete T017")
Task(subagent_type: "general-purpose", prompt: "Complete T018")
Task(subagent_type: "general-purpose", prompt: "Complete T019")
Task(subagent_type: "general-purpose", prompt: "Complete T020")
```

### Phase 7: Error Handling + Logging (Sequential, same file)
```bash
# Run in order (same file: server.js)
T021 → T022 → T023 → T024
```

### Phase 8: Validation (Parallel, use tickedify-testing agent)
```bash
# All can run in parallel on staging
Task(subagent_type: "tickedify-testing", prompt: "Complete T025")
Task(subagent_type: "tickedify-testing", prompt: "Complete T026")
Task(subagent_type: "tickedify-testing", prompt: "Complete T027")
Task(subagent_type: "tickedify-testing", prompt: "Complete T028")
```

### Phase 9: Documentation (Parallel → Sequential)
```bash
# T029 can run in parallel
Task(subagent_type: "general-purpose", prompt: "Complete T029")

# T030 MUST be last (version bump before commit)
T030 (manual execution, critical for deployment)
```

---

## Summary

**Total Tasks**: 30
**Estimated Time**: 4-5 hours

**Task Distribution**:
- Foundation: 3 tasks
- Parser Extension: 4 tasks
- Matching Logic: 5 tasks
- Storage Integration: 4 tasks
- Error Handling: 5 tasks
- Logging: 3 tasks
- Validation: 4 tasks
- Documentation: 2 tasks

**Parallel Opportunities**: 15 tasks marked [P] can run concurrently
**Sequential Requirements**: 15 tasks must run in order (same file edits)

**Ready for Execution**: All tasks are immediately executable with clear acceptance criteria and implementation notes.
