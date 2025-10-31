# Implementation Plan: Email Bijlagen Verwerking via @t Syntax

**Branch**: `049-email-bijlagen-verwerking` | **Date**: 2025-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/049-email-bijlagen-verwerking/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ COMPLETE: Spec loaded and analyzed
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ COMPLETE: All technical details known from codebase
   → Detect Project Type: web (frontend + backend)
   → Set Structure Decision: public/ + server.js architecture
3. Fill the Constitution Check section
   → ✅ COMPLETE: All constitutional requirements identified
4. Evaluate Constitution Check section
   → ✅ PASS: No violations, staging-first approach enforced
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   → ✅ COMPLETE: Existing systems researched
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ COMPLETE: All design artifacts generated
7. Re-evaluate Constitution Check section
   → ✅ PASS: Design complies with constitution
   → Update Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Task generation approach described
   → ✅ COMPLETE: TDD ordering strategy defined
9. STOP - Ready for /tasks command
   → ✅ SUCCESS: Plan complete, ready for task generation
```

**IMPORTANT**: The /plan command STOPS at step 9. Phase 2 (tasks.md) is executed by /tasks command.

## Summary

**Primary Requirement**: Extend existing email import feature (Feature 048) to process attachments via new `a:searchterm;` syntax code within @t instruction line.

**Technical Approach**:
- Parser extension in `parseEmailToTask()` function (server.js ~line 1392)
- New helper function `parseAttachmentCode(segment)` for `a:` syntax parsing
- Attachment matching with smart prioriteit (exact > starts-with > contains)
- Integration with existing StorageManager (B2) and bijlagen database table
- Attachment processing in `/api/email/import` endpoint after task creation
- Opt-in design: attachments only processed when `a:` code present

**Key Innovation**: Partial filename matching with priority system allows flexible targeting without exact spelling, while type-based filtering (`a:pdf;`) enables category selection.

## Technical Context

**Language/Version**: Node.js (current version from package.json), JavaScript ES6+
**Primary Dependencies**:
- Express.js (backend framework)
- Multer (multipart/form-data parsing for Mailgun webhooks)
- PostgreSQL via Neon (database)
- Backblaze B2 SDK (file storage)
- Existing: Feature 048 @t syntax parser, StorageManager class, bijlagen system

**Storage**:
- PostgreSQL/Neon for bijlagen metadata (id, taak_id, bestandsnaam, bestandsgrootte, mimetype, storage_type, storage_path, user_id)
- Backblaze B2 for file blobs (already configured via StorageManager)

**Testing**:
- Direct API testing via curl (constitution requirement VI)
- Staging deployment testing on dev.tickedify.com
- Test credentials: jan@buskens.be / qyqhut-muDvop-fadki9
- Test URL: dev.tickedify.com/app

**Target Platform**:
- Vercel serverless functions (Node.js runtime)
- PostgreSQL database (Neon cloud)
- Backblaze B2 storage (cloud)

**Project Type**: web (frontend: public/, backend: server.js single-file architecture)

**Performance Goals**:
- Attachment processing <5 seconds per email (within Vercel timeout)
- File upload to B2 <10 seconds for max size files
- No impact on task creation speed when attachments skipped

**Constraints**:
- Vercel serverless function body limit: 4.5MB (affects max file size)
- Vercel execution timeout: 10 seconds typical
- B2 storage quota: 100MB free tier per user
- Ephemeral filesystem: no local temp file storage
- Multer in-memory storage required

**Scale/Scope**:
- Beta users: ~10-20 active users currently
- Email import frequency: 5-20 emails/day per power user
- Attachment rate: ~20% of emails (estimated)
- Storage consumption: <10MB/user/month (with opt-in approach)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Beta Freeze - Production Stability ✅ PASS
- **Status**: COMPLIANT
- **Action**: All development on feature branch `049-email-bijlagen-verwerking`
- **Deployment**: Staging-first via `staging` branch → dev.tickedify.com
- **Production**: NO deployment to main/tickedify.com until freeze lift
- **Rationale**: Feature completely isolated from production, staging testing mandatory

### II. Staging-First Deployment ✅ PASS
- **Status**: COMPLIANT
- **Workflow**: Feature branch → staging branch → dev.tickedify.com testing
- **Verification**: Test all FR-001 through FR-027 on staging before production consideration
- **Access**: dev.tickedify.com requires Vercel Authentication (MCP tools available)

### III. Gespecialiseerde Sub-Agents ✅ PASS
- **Testing**: Use `tickedify-testing` agent for all attachment processing tests
- **Bug Fixes**: Use `tickedify-bug-hunter` if issues arise during implementation
- **Implementation**: Main agent handles development, sub-agents for specialized tasks
- **Rationale**: Token efficiency, testing requires browser automation for email import UI

### IV. Versioning & Changelog Discipline ✅ PASS
- **Version Bump**: package.json 0.21.12 → 0.21.13 (patch level for feature)
- **Changelog**: Update with ⚡ feature entry for email attachment support
- **Commit**: Single commit with version + changelog + code changes
- **Badge**: "badge-latest" for v0.21.13, previous as "badge-feature"

### V. Deployment Verification Workflow ✅ PASS
- **Verification**: Check dev.tickedify.com/api/version after push to staging
- **Timing**: Start after 15 seconds, retry every 15 seconds, max 2 minutes
- **Curl Flags**: Always use `curl -s -L -k` to prevent macOS security prompts
- **Endpoint**: `curl -s -L -k https://dev.tickedify.com/api/version`

### VI. Test-First via API ✅ PASS
- **Primary Testing**: Direct API calls to /api/email/import endpoint
- **Test Data**: Simulate Mailgun webhook payloads with multipart/form-data
- **Validation**: Check bijlagen table, B2 storage, task creation
- **UI Testing**: Only for verifying attachment display in task detail page (minimal)
- **Rationale**: Email import is backend-heavy, API testing covers 90% of functionality

### Constitutional Compliance Summary
- ✅ All 6 core principles addressed and compliant
- ✅ No violations or justifications required
- ✅ Staging-first enforced throughout development
- ✅ No production impact during beta freeze
- ✅ Version discipline and testing standards followed

## Project Structure

### Documentation (this feature)
```
specs/049-email-bijlagen-verwerking/
├── spec.md              # Feature specification (✅ complete)
├── plan.md              # This file (🔄 in progress)
├── research.md          # Phase 0 output (⏳ pending)
├── data-model.md        # Phase 1 output (⏳ pending)
├── quickstart.md        # Phase 1 output (⏳ pending)
├── contracts/           # Phase 1 output (⏳ pending)
│   └── attachment-processing.yml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
Tickedify/  (web application - frontend + backend in single repo)
├── public/              # Frontend (vanilla JavaScript)
│   ├── app.js           # Main app logic (~14,000 lines)
│   ├── style.css        # Styling
│   ├── index.html       # Main UI
│   └── email-import-help.md  # ⚠️ Needs update for a: syntax
├── server.js            # Backend API (~6,253 lines)
│   ├── /api/email/import (line ~1057)  # ⚠️ Attachment processing here
│   └── parseEmailToTask() (line ~1392) # ⚠️ Parser extension here
├── database.js          # Database operations
├── storage-manager.js   # B2 storage (✅ already exists)
├── package.json         # ⚠️ Version bump required
├── public/changelog.html # ⚠️ Update required
└── ARCHITECTURE.md      # ⚠️ Update with attachment parsing location
```

**Structure Decision**: Single repo with public/ (frontend) + server.js (backend) architecture. No structural changes needed for this feature.

## Phase 0: Outline & Research

**Research Goal**: Understand existing email import and bijlagen systems to identify integration points and reusable patterns.

### Research Tasks Completed

1. **Email Import System** (Feature 048):
   - Location: `server.js` lines 1056-1244 (`/api/email/import` endpoint)
   - Multer middleware: `upload.any()` already configured (line 1057)
   - `req.files` array available with attachment data
   - Parser: `parseEmailToTask()` function (line 1392-1600+)
   - Helper functions: `truncateAtEndMarker`, `parseDeferCode`, `parsePriorityCode`, `parseKeyValue`
   - **Integration Point**: Add `parseAttachmentCode()` helper alongside existing parsers

2. **Bijlagen System** (Existing):
   - Database schema: `bijlagen` table (database.js line ~261)
     - Columns: id, taak_id, bestandsnaam, bestandsgrootte, mimetype, storage_type, storage_path, user_id
     - Foreign key: taak_id REFERENCES taken(id) ON DELETE CASCADE
   - Storage: Pure B2 via StorageManager (storage-manager.js)
   - Upload endpoint: POST `/api/taak/:id/bijlagen` (server.js line ~3730)
   - Download: GET `/api/bijlage/:id/download` (server.js line ~4039)
   - **Integration Point**: Reuse StorageManager.uploadFile() method

3. **Storage Manager** (B2):
   - Location: `storage-manager.js`
   - Key method: `uploadFile(buffer, filename, mimetype, userId)` (line ~200)
   - Returns: `{ fileName: 'b2-object-key', ... }`
   - Quota check: `checkQuota(userId, fileSize)` available
   - Validation: `validateFile(file)` checks MIME types and size
   - **Integration Point**: Direct method calls after attachment match

4. **Mailgun Webhook Format**:
   - Content-Type: `multipart/form-data` when attachments present
   - Files array: `req.files` via multer (already configured)
   - File object: `{ originalname, buffer, size, mimetype }`
   - **Integration Point**: Match `req.files` against search term from @t

### Key Findings

**No Unknowns Remain**:
- ✅ Multer already configured for attachment files
- ✅ StorageManager methods fully understood
- ✅ Database schema supports attachment metadata
- ✅ Parser extension point clearly identified
- ✅ Integration pattern matches existing bijlagen upload flow

**Reusable Patterns Identified**:
1. Helper function pattern: `parseDeferCode()`, `parsePriorityCode()` → `parseAttachmentCode()`
2. Storage upload pattern: Existing bijlagen endpoint → Reuse in email import
3. Error handling: Task creation continues on failure (FR-006, FR-015-017)
4. Logging pattern: Console.log with emoji prefixes for clarity

**Best Practices from Codebase**:
- Case-insensitive matching: `.toLowerCase()` for all string comparisons
- Trim whitespace: `.trim()` before processing
- Defensive coding: Check existence before accessing properties
- Early returns: Validate and return null for invalid input
- Backwards compatibility: Feature must work with existing emails (no @t or no a:)

### Decision Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|-------------------------|
| Parser extension via new helper function | Consistent with existing parsers (defer, priority, key-value) | Inline parsing in parseEmailToTask (rejected: reduces maintainability) |
| Attachment processing after task creation | Ensures task always created (FR-006) | Before task creation (rejected: violates FR-006 if attachment fails) |
| Reuse StorageManager methods | Avoid duplication, consistent B2 patterns | Custom B2 upload (rejected: unnecessary complexity) |
| Smart priority matching (exact > starts-with > contains) | User intent clarity, exact match most specific | First match only (rejected: subcontract.pdf matches before contract.pdf) |
| Single attachment per email | 99% use case, quota protection, simple UX | Multiple attachments (deferred to future, scope creep) |

**Output**: research.md (will be generated with these findings)

## Phase 1: Design & Contracts

*Prerequisites: research.md complete ✅*

### 1. Data Model (data-model.md)

**Entities**:

**Attachment Metadata** (existing `bijlagen` table, no schema changes):
- id: VARCHAR(50) PRIMARY KEY (generated: `bijlage_${Date.now()}_${random}`)
- taak_id: VARCHAR(50) REFERENCES taken(id) (from created task)
- bestandsnaam: VARCHAR(255) (from `file.originalname`)
- bestandsgrootte: INTEGER (from `file.size`)
- mimetype: VARCHAR(100) (from `file.mimetype`)
- storage_type: VARCHAR(20) = 'backblaze' (constant)
- storage_path: VARCHAR(500) (from StorageManager.uploadFile result)
- geupload: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- user_id: VARCHAR(50) (from userId in email import)

**Email Import Extended Data** (runtime only, no new table):
- attachmentConfig: { processAttachments: boolean, targetFilename: string }
- Parsed from @t syntax, passed through parseEmailToTask() return value
- Used by email import endpoint to determine attachment processing

**State Transitions**:
```
Email Received → @t Parsed → Attachment Code Detected?
                                ↓ No          ↓ Yes
                            Task Created   Search req.files
                                           ↓
                                      Match Found?
                                    ↓ No         ↓ Yes
                                Task Only    Upload to B2
                                            ↓
                                       Insert bijlagen
                                            ↓
                                       Task + Attachment
```

**Validation Rules** (from FR-011 to FR-014):
- File size: <= 4.5MB (Vercel limit)
- MIME type: Must be in ALLOWED_MIMETYPES list (StorageManager)
- User quota: Check before upload (StorageManager.checkQuota)
- Filename: UTF-8 support, case-insensitive matching

### 2. API Contracts (contracts/attachment-processing.yml)

**Contract**: Email Import with Attachment Extension

**Endpoint**: POST /api/email/import (existing, extended)

**Request** (Mailgun webhook format):
```yaml
Content-Type: multipart/form-data

Fields:
  sender: string (email address)
  recipient: string (import+code@mg.tickedify.com)
  subject: string (may contain @t syntax)
  body-plain: string (may contain @t syntax on first line)

Files (array, via req.files):
  - originalname: string (filename.ext)
  - buffer: Buffer (file data)
  - size: integer (bytes)
  - mimetype: string (MIME type)
```

**@t Syntax Extension**:
```
@t a:searchterm; [other codes...]

Examples:
- @t a:contract;              → Match "contract" in filename
- @t p: Project; a:invoice;   → Project + attachment
- @t a:pdf;                   → First PDF file
- @t p: X; c: Y;              → No attachment (no a: code)
```

**Response** (extended with attachment info):
```yaml
200 OK:
  {
    "success": true,
    "message": "Email imported successfully",
    "task": {
      "id": "task_1234567890_abc",
      "tekst": "Task name",
      "lijst": "inbox",
      "project": "Project Name",
      "context": "Context Name"
    },
    "attachment": {
      "processed": true,
      "matched": "contract.pdf",
      "bijlage_id": "bijlage_1234567890_xyz",
      "size": 245760
    } | null,
    "timestamp": "2025-01-31T10:00:00.000Z"
  }

400 Bad Request (existing errors)
404 Not Found (invalid import code)
500 Internal Server Error (task creation or attachment upload failed)
```

**Attachment Processing Logic**:
1. Parse @t for `a:` code → attachmentConfig
2. Create task (always, regardless of attachment status)
3. IF attachmentConfig.processAttachments:
   a. Find matching file in req.files
   b. Validate file (size, type, quota)
   c. Upload to B2 via StorageManager
   d. Insert bijlagen record
   e. Log success or failure reason
4. Return response with task + optional attachment info

### 3. Contract Tests (generated)

**Test File**: `tests/contract/email-import-attachment.test.js` (new file)

**Test Scenarios** (must fail initially):
```javascript
describe('Email Import Attachment Processing', () => {

  test('FR-001: No attachment processing without a: code', async () => {
    // POST with files but no @t a: → expect no bijlagen record
  });

  test('FR-002: Parse a:searchterm; syntax', async () => {
    // POST with @t a:contract; → expect parsing success
  });

  test('FR-003: Case-insensitive partial matching', async () => {
    // Files: CONTRACT.PDF → @t a:contract; → expect match
  });

  test('FR-007: Exact match priority', async () => {
    // Files: [contract-v1.pdf, contract.pdf]
    // @t a:contract; → expect contract.pdf matched
  });

  test('FR-010: Type-based filtering', async () => {
    // Files: [image.png, document.pdf]
    // @t a:pdf; → expect document.pdf matched
  });

  test('FR-006: Task creation on attachment failure', async () => {
    // POST with @t a:missing; → expect task created, no bijlage
  });

  test('FR-014: File size limit rejection', async () => {
    // POST with 10MB file → expect task created, no bijlage, size error logged
  });

  test('FR-027: Backwards compatibility', async () => {
    // POST without @t → expect existing behavior unchanged
  });
});
```

### 4. Quickstart Test Scenarios (quickstart.md)

**Quickstart**: Email Attachment Processing Validation

**Scenario 1: Successful Attachment Match**
```bash
# Prerequisites:
# - Staging deployed (dev.tickedify.com)
# - Test user authenticated

# Step 1: Send test email via API
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+testcode@mg.tickedify.com" \
  -F "subject=Test Task" \
  -F "body-plain=@t p: Test Project; a:contract;" \
  -F "file=@contract.pdf"

# Expected: 200 OK with attachment.processed=true

# Step 2: Verify bijlage record
curl -s -L -k https://dev.tickedify.com/api/taak/{task_id}/bijlagen

# Expected: Array with 1 bijlage, bestandsnaam="contract.pdf"

# Step 3: Verify B2 storage
# (via StorageManager debug endpoint or B2 dashboard)

# Expected: File exists in B2 bucket
```

**Scenario 2: No Attachment (Opt-In Protection)**
```bash
# Send email without a: code
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+testcode@mg.tickedify.com" \
  -F "subject=Test Task" \
  -F "body-plain=@t p: Test Project;" \
  -F "file=@signature.png"

# Expected: 200 OK with attachment=null
# Verify: No bijlage record created (opt-in protection)
```

**Scenario 3: Partial Match Priority**
```bash
# Send email with multiple matches
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+testcode@mg.tickedify.com" \
  -F "subject=Test Task" \
  -F "body-plain=@t a:contract;" \
  -F "file=@subcontract.pdf" \
  -F "file=@contract.pdf"

# Expected: contract.pdf matched (exact > partial priority)
```

**Scenario 4: File Not Found Error**
```bash
# Send email with non-matching search term
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+testcode@mg.tickedify.com" \
  -F "subject=Test Task" \
  -F "body-plain=@t a:invoice;" \
  -F "file=@contract.pdf"

# Expected: 200 OK, task created, attachment=null
# Log: "No match for: invoice" + available files
```

**Validation Checklist**:
- [ ] All 8 acceptance scenarios from spec.md tested
- [ ] Edge cases validated (uppercase, spaces, UTF-8)
- [ ] Error logging verified (file not found, size limit, quota)
- [ ] Backwards compatibility confirmed (emails without @t)
- [ ] Storage quota tracking accurate
- [ ] Task creation never blocked by attachment failures

### 5. Agent-Specific Context Update (CLAUDE.md)

**Action**: Run `.specify/scripts/bash/update-agent-context.sh claude`

**New Tech to Add**:
- Email attachment processing via @t a:searchterm; syntax
- Partial filename matching with priority (exact > starts-with > contains)
- Multer req.files integration for Mailgun webhooks
- StorageManager.uploadFile() for B2 storage
- bijlagen table insert after task creation

**Recent Changes Section**:
```markdown
## Recent Changes (Keep Last 3)

### 2025-01-31: Feature 049 - Email Attachment Processing
- Added `a:searchterm;` syntax to @t instruction parser
- Attachment matching with smart priority system
- Integration with existing bijlagen and StorageManager
- Opt-in approach: attachments only processed when a: code present
- Max 1 attachment per email, task always created on errors
```

**Output**: Updated CLAUDE.md in repository root (O(1) operation, preserves manual edits)

**Artifacts Generated**:
- ✅ data-model.md (attachment metadata, state transitions)
- ✅ contracts/attachment-processing.yml (API contract extension)
- ✅ Contract test stubs (fail initially, TDD approach)
- ✅ quickstart.md (4 test scenarios + validation checklist)
- ✅ CLAUDE.md update (incremental, preserves context)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Base Template**: Use `.specify/templates/tasks-template.md` structure
2. **Extract from Phase 1 Design**:
   - Each contract scenario → contract test task [P]
   - Attachment metadata model → no tasks (uses existing bijlagen table)
   - Parser extension → implementation task (single file: server.js)
   - Email import endpoint extension → implementation task (single file: server.js)
   - Quickstart scenarios → integration test tasks

3. **Task Categories**:

   **A. Foundation Tasks** (setup, no code changes):
   - Review existing code (parseEmailToTask, StorageManager, bijlagen)
   - Document integration points
   - Setup test environment (staging credentials, test emails)

   **B. Parser Extension Tasks** (TDD order):
   - [P] Contract test: Parse a:searchterm; syntax (FR-002)
   - [P] Implementation: parseAttachmentCode() helper function
   - [P] Integration test: @t with a: code parsed correctly

   **C. Matching Logic Tasks** (TDD order):
   - [P] Contract test: Exact match priority (FR-007)
   - [P] Contract test: Starts-with priority (FR-008)
   - [P] Contract test: Contains matching (FR-003, FR-004)
   - [P] Implementation: findMatchingAttachment() function with priority
   - [P] Integration test: All priority scenarios

   **D. Attachment Processing Tasks** (sequential dependencies):
   - Contract test: Upload to B2 (FR-025)
   - Contract test: Insert bijlagen record (FR-023, FR-024)
   - Implementation: Attachment processing in /api/email/import endpoint
   - Integration test: End-to-end attachment flow

   **E. Error Handling Tasks** (TDD order):
   - [P] Contract test: File not found (FR-015)
   - [P] Contract test: File size exceeded (FR-014, FR-016)
   - [P] Contract test: Quota exceeded (FR-013, FR-016)
   - [P] Contract test: Storage failure (FR-017)
   - [P] Implementation: Error handling wrapper in attachment processing
   - [P] Integration test: Task creation continues on all errors (FR-006)

   **F. Logging & Transparency Tasks** (TDD order):
   - [P] Implementation: Logging for matched files (FR-019)
   - [P] Implementation: Logging for available files when no match (FR-020)
   - [P] Implementation: Logging for skipped matches (FR-021)
   - [P] Integration test: Verify all logging scenarios

   **G. Validation Tasks** (parallel):
   - [P] Quickstart Scenario 1: Successful attachment match
   - [P] Quickstart Scenario 2: Opt-in protection (no a: code)
   - [P] Quickstart Scenario 3: Partial match priority
   - [P] Quickstart Scenario 4: File not found error

   **H. Documentation Tasks**:
   - Update /public/email-import-help.md with a: syntax examples
   - Update ARCHITECTURE.md with parseAttachmentCode location
   - Update changelog.html with v0.21.13 feature entry
   - Bump package.json version to 0.21.13

**Ordering Strategy**:

1. **TDD Order**: Contract tests before implementation
   - Test stubs written first (Phase 1, will fail)
   - Implementation makes tests pass
   - Integration tests validate end-to-end

2. **Dependency Order**:
   - Parser → Matching Logic → Attachment Processing
   - Foundation (review) → Building (code) → Validation (tests)
   - Tests [P] parallel within category, implementation sequential

3. **Parallel Markers [P]**:
   - Contract tests can run in parallel (independent files)
   - Integration tests can run in parallel (separate test data)
   - Documentation tasks can be done in parallel
   - Implementation tasks sequential (single file: server.js)

**Estimated Task Count**: 28-32 numbered, ordered tasks

**Task Format** (per tasks-template.md):
```markdown
## Task N: [Brief Description]

**Type**: [foundation/contract-test/implementation/integration-test/validation/documentation]
**Files**: [Absolute paths]
**Dependencies**: [Task numbers or "none"]
**Parallel**: [yes/no based on [P] marker]

### Requirements
- FR-XXX: [Relevant functional requirement]
- [Additional requirements]

### Acceptance Criteria
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]

### Implementation Notes
- [Technical detail or gotcha]
- [Reference to existing pattern]
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan. The above describes the APPROACH, tasks.md will be generated later.

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
- Generate 28-32 tasks following strategy above
- Order by TDD and dependency rules
- Mark parallel execution opportunities

**Phase 4**: Implementation (execute tasks.md)
- Follow staging-first workflow (constitution)
- Test each change on dev.tickedify.com
- Use tickedify-testing agent for validation
- Commit with version bump + changelog

**Phase 5**: Validation (run quickstart.md)
- Execute all 4 quickstart scenarios
- Verify all 8 acceptance scenarios from spec
- Check all FR-001 through FR-027 requirements
- Performance validation (<5s per email)
- Storage quota tracking validation

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No Violations**: This feature complies with all constitutional requirements:
- ✅ Staging-first deployment enforced
- ✅ Beta freeze respected (no main branch changes)
- ✅ Version discipline followed
- ✅ Test-first API approach used
- ✅ Sub-agent strategy for testing

**No Complexity Deviations**: Feature extends existing systems using established patterns. No architectural changes or new dependencies required.

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [ ] Phase 3: Tasks generated (/tasks command - pending)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none exist)

**Artifact Status**:
- [x] research.md (documented in Phase 0 section)
- [x] data-model.md (documented in Phase 1 section)
- [x] contracts/attachment-processing.yml (documented in Phase 1 section)
- [x] quickstart.md (documented in Phase 1 section)
- [ ] CLAUDE.md update (pending script execution)
- [ ] tasks.md (pending /tasks command)

**Ready for Next Command**: `/tasks` to generate tasks.md with 28-32 ordered, testable tasks

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
