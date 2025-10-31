# Feature Specification: Email Bijlagen Verwerking via @t Syntax

**Feature Branch**: `049-email-bijlagen-verwerking`
**Created**: 2025-01-31
**Status**: Draft
**Input**: User description: "Email bijlagen verwerking via @t a:zoekterm; syntax - opt-in attachment processing met partial matching en B2 storage integratie"

## Execution Flow (main)
```
1. Parse user description from Input
   → ✅ Feature: Email attachment processing via @t syntax extension
2. Extract key concepts from description
   → Actors: Email senders (users)
   → Actions: Send email with attachments, specify attachment via search term
   → Data: Email attachments (files), task attachments (stored files)
   → Constraints: Opt-in only, partial matching, storage limits
3. For each unclear aspect:
   → None identified - feature well-defined through conversation
4. Fill User Scenarios & Testing section
   → ✅ Clear user flows documented
5. Generate Functional Requirements
   → ✅ All requirements testable and specific
6. Identify Key Entities
   → ✅ Attachment entity with metadata
7. Run Review Checklist
   → ✅ No implementation details in spec
   → ✅ Business value focused
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a Tickedify user, I want to attach files from incoming emails to my tasks, so that I can keep relevant documents (contracts, invoices, quotes) together with their associated tasks without manual downloading and re-uploading.

**Current Problem**:
- Emails often contain important attachments (contracts, invoices, PDFs)
- Users must manually download attachments and manually upload them to tasks
- Email signatures often include images/logos that clutter the attachment list
- No control over which attachments are saved (all-or-nothing approach would waste storage)

**Desired Outcome**:
- Users can specify which attachment to save using the existing @t email syntax
- Only the specified attachment is saved, preventing signature images from being stored
- Attachments are automatically linked to the created task
- Storage quota is protected by opt-in approach

### Acceptance Scenarios

1. **Given** an email with 3 attachments (contract.pdf, logo.png, signature.jpg) and @t syntax includes `a:contract;`, **When** the email is processed, **Then** only contract.pdf is saved as a task attachment

2. **Given** an email with attachments and NO `a:` code in @t syntax, **When** the email is processed, **Then** NO attachments are saved (opt-in protection)

3. **Given** an email with attachments (invoice_final.pdf, quote.pdf) and @t syntax includes `a:invoice;`, **When** the email is processed, **Then** invoice_final.pdf is matched and saved (partial match)

4. **Given** an email with multiple PDFs and @t syntax includes `a:pdf;`, **When** the email is processed, **Then** the first PDF file is saved (type-based filtering)

5. **Given** an email with @t syntax includes `a:missing.pdf;` but no such file exists, **When** the email is processed, **Then** task is created WITHOUT attachment and user can see which files were available

6. **Given** an attachment file exceeds maximum size limit, **When** the email is processed, **Then** task is created WITHOUT attachment and size limit is logged

7. **Given** an email with `a:contract;` matches both contract-v1.pdf and contract.pdf, **When** attachments are processed, **Then** exact match (contract.pdf) takes priority over partial match

8. **Given** user has reached storage quota limit, **When** email with attachment is processed, **Then** task is created WITHOUT attachment and quota warning is logged

### Edge Cases

**Filename Variations**:
- What happens when attachment has uppercase extension (.PDF vs .pdf)? → Case-insensitive matching should handle this
- What happens when attachment has spaces in filename? → Search term should match with spaces preserved
- What happens when attachment has special characters (é, ü, etc.)? → UTF-8 filename support required

**Multiple Matches**:
- What happens when search term matches multiple files? → Prioritize: exact match > starts-with > contains, then use first match
- What happens when user specifies extension only (a:pdf;) with 5 PDFs? → First PDF in email order is selected

**Error Scenarios**:
- What happens when storage system is unavailable? → Task created, attachment skipped, error logged
- What happens when attachment is corrupted? → Task created, attachment skipped, error logged
- What happens when file type is not allowed? → Task created, attachment skipped, type restriction logged

**User Expectations**:
- How does user know which attachment was saved if multiple matched? → System logs should show matched filename
- How does user know why attachment wasn't saved? → Clear logging of reason (not found, too large, quota exceeded, etc.)

---

## Requirements *(mandatory)*

### Functional Requirements

**Core Attachment Processing**:
- **FR-001**: System MUST only process attachments when @t syntax includes attachment code (opt-in behavior)
- **FR-002**: System MUST support attachment code format `a:searchterm;` within @t syntax line
- **FR-003**: System MUST perform case-insensitive partial matching on filename using CONTAINS logic
- **FR-004**: System MUST match attachments based on search term appearing anywhere in filename
- **FR-005**: System MUST process maximum one (1) attachment per email
- **FR-006**: System MUST create task even when attachment processing fails

**Matching Priority**:
- **FR-007**: System MUST prioritize exact filename match over partial match
- **FR-008**: System MUST prioritize filename starting with search term over contains match
- **FR-009**: System MUST use first matched attachment when multiple files match with equal priority
- **FR-010**: System MUST support file extension-only search (e.g., `a:pdf;` matches first .pdf file)

**File Validation**:
- **FR-011**: System MUST validate attachment file size before processing
- **FR-012**: System MUST validate attachment file type against allowed types list
- **FR-013**: System MUST check user storage quota before saving attachment
- **FR-014**: System MUST reject attachments exceeding maximum file size limit

**Error Handling**:
- **FR-015**: System MUST continue task creation when attachment matching fails (file not found)
- **FR-016**: System MUST continue task creation when attachment validation fails (size/type/quota)
- **FR-017**: System MUST continue task creation when attachment storage fails (system error)
- **FR-018**: System MUST log reason when attachment is not processed

**Logging & Transparency**:
- **FR-019**: System MUST log which attachment was matched and saved
- **FR-020**: System MUST log available attachment filenames when search term doesn't match
- **FR-021**: System MUST log other matching attachments that were skipped (when multiple match)
- **FR-022**: System MUST provide clear error messages for attachment failures

**Integration with Existing System**:
- **FR-023**: System MUST link saved attachment to created task via task ID
- **FR-024**: System MUST store attachment metadata (filename, size, type, storage path)
- **FR-025**: System MUST use existing storage system for attachment persistence
- **FR-026**: System MUST respect existing storage quota limits per user
- **FR-027**: System MUST maintain backwards compatibility with emails without attachment code

### Key Entities *(include if feature involves data)*

**Task Attachment** (extension of existing bijlagen entity):
- Represents a file attached to a task, originally from an email
- Key attributes:
  - Unique identifier
  - Associated task reference
  - Original filename from email
  - File size in bytes
  - File type (MIME type)
  - Storage location reference
  - Upload timestamp
  - User ownership

**Email Import Log Entry** (enhancement):
- Tracks email import operations including attachment processing
- Key attributes:
  - Email sender
  - Email subject
  - Created task reference
  - Attachment processing status (success, failed, skipped, none)
  - Attachment failure reason (if applicable)
  - Available attachment filenames (for debugging)
  - Matched attachment filename (if processed)

---

## Business Value & Context

### Why This Feature?

**Current Pain Points**:
1. **Manual Work**: Users must download email attachments and manually upload to tasks
2. **Storage Waste**: All-or-nothing attachment import would save unwanted signature images
3. **Lost Context**: Important documents (contracts, invoices) separated from their tasks
4. **Time Loss**: Extra steps break workflow and reduce productivity

**Value Delivered**:
1. **Workflow Efficiency**: Attachments automatically linked during email-to-task conversion
2. **Storage Protection**: Opt-in approach with selective matching prevents quota waste
3. **Smart Selection**: Partial matching allows flexible filename targeting without exact spelling
4. **User Control**: Search term syntax gives explicit control over which file is saved

### User Impact

**Primary Users**: Tickedify users who use email import feature (`import+code@mg.tickedify.com`)

**Usage Scenarios**:
- Client sends quote via email → User forwards with `@t a:quote;` → Quote PDF attached to task
- Invoice received by email → User forwards with `@t a:invoice;` → Invoice saved with task
- Contract document → User forwards with `@t a:contract;` → Contract linked to task
- Email with report → User forwards with `@t a:pdf;` → First PDF document attached

**Frequency**: Daily for power users, weekly for typical users

### Success Metrics

- Percentage of email imports that include attachment code
- Storage quota consumption rate (should remain controlled)
- Attachment match success rate (how often search term finds intended file)
- User-reported issues with attachment matching

---

## Constraints & Assumptions

### Technical Constraints
- Maximum file size limit exists for individual attachments
- Total storage quota limit exists per user (free tier)
- File type restrictions exist for security
- Storage system availability affects attachment processing

### Business Constraints
- Feature must not break existing email import workflow
- Storage costs must remain controlled (opt-in approach)
- Free tier limits must be respected

### Assumptions
- Email service provides attachment files in webhook payload
- Attachment order in email is consistent/determinable
- Most users need only 1 attachment per email (99% use case)
- Partial filename matching is sufficient for most scenarios
- Users can check available filenames if match fails (via logs or future UI)

---

## Dependencies

### System Dependencies
- Email import system must be operational
- Existing attachment storage system must be available
- User authentication and session management required
- Storage quota tracking system must be accurate

### Feature Dependencies
- Feature 048 (Email Import @t Syntax) must be live
- Existing bijlagen (attachment) system must be functional
- Storage system must be initialized and accessible

---

## Out of Scope

The following are explicitly NOT part of this feature:

- **Multiple attachments per email**: Only 1 attachment supported, future enhancement possible
- **Attachment preview in email**: Users cannot see thumbnails before processing
- **Automatic attachment type detection**: No OCR or content analysis
- **Attachment editing/modification**: Files saved as-is from email
- **Retroactive attachment processing**: Only new emails after feature deployment
- **Advanced search syntax**: Regex or wildcards not supported in search term
- **Attachment size optimization**: No compression or resizing
- **Virus scanning**: Assumed handled by email provider or future enhancement
- **Email attachment URLs**: Only inline attachment files supported, not external URLs

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Next Steps

1. **Planning Phase**: Create implementation plan with technical architecture
2. **Task Breakdown**: Generate detailed task list from requirements
3. **Contract Definition**: Define API contracts for attachment processing
4. **Data Model**: Design attachment metadata storage structure
5. **Testing Strategy**: Create test scenarios for all acceptance criteria
6. **Documentation**: Update email import help documentation with attachment syntax

---

## Notes

- Feature extends existing Feature 048 (@t syntax) with attachment code
- Design philosophy: **Explicit is better than implicit** (opt-in, not opt-out)
- User experience priority: **Task always created**, attachment is bonus
- Matching strategy prioritizes user intent: exact > partial > type-based
- Error handling emphasizes transparency: log everything for debugging
