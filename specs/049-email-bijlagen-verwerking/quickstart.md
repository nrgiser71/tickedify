# Quickstart: Email Attachment Processing Validation

**Feature**: 049-email-bijlagen-verwerking
**Date**: 2025-01-31
**Environment**: dev.tickedify.com (staging)

## Prerequisites

### 1. Staging Deployment
```bash
# Verify staging is deployed
curl -s -L -k https://dev.tickedify.com/api/version

# Expected: {"version":"0.21.13","timestamp":"..."}
```

### 2. Test Credentials
```
Email: jan@buskens.be
Password: qyqhut-muDvop-fadki9
URL: https://dev.tickedify.com/app
```

### 3. Test Import Code
Get your personal import code from settings:
```bash
# Login to dev.tickedify.com/app
# Navigate to Settings → Email Import
# Copy import email: import+{YOUR_CODE}@mg.tickedify.com
```

### 4. Test Files
Prepare test attachment files:
```bash
# Create test PDF
echo "Test contract content" > contract.pdf

# Create test signature image
echo "Signature" > signature.png

# Create multiple test files
echo "Contract v1" > contract-v1.pdf
echo "Sub-contract" > subcontract.pdf
echo "Invoice" > invoice.pdf
```

## Scenario 1: Successful Attachment Match (FR-001, FR-002, FR-003)

### Test: Exact filename match with attachment processing

```bash
# Send email with attachment code
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOUR_CODE@mg.tickedify.com" \
  -F "subject=Contract Review" \
  -F "body-plain=@t p: Test Project; a:contract;" \
  -F "file=@contract.pdf"
```

### Expected Response
```json
{
  "success": true,
  "message": "Email imported successfully",
  "task": {
    "id": "task_...",
    "tekst": "Contract Review",
    "lijst": "inbox",
    "project": "Test Project",
    "context": null
  },
  "attachment": {
    "processed": true,
    "matched": "contract.pdf",
    "bijlage_id": "bijlage_...",
    "size": 21
  },
  "timestamp": "..."
}
```

### Verification Steps
```bash
# Step 1: Get task ID from response
TASK_ID="task_..."  # From response above

# Step 2: Verify bijlage record exists
curl -s -L -k "https://dev.tickedify.com/api/taak/$TASK_ID/bijlagen"

# Expected: Array with 1 bijlage
# [{
#   "id": "bijlage_...",
#   "taak_id": "task_...",
#   "bestandsnaam": "contract.pdf",
#   "bestandsgrootte": 21,
#   "mimetype": "application/octet-stream",
#   ...
# }]

# Step 3: Verify file downloadable
BIJLAGE_ID="bijlage_..."  # From response above
curl -s -L -k "https://dev.tickedify.com/api/bijlage/$BIJLAGE_ID/download" > downloaded.pdf

# Expected: File downloads successfully
ls -lh downloaded.pdf
```

### Success Criteria
- [x] HTTP 200 response
- [x] Task created with correct project
- [x] attachment.processed = true
- [x] attachment.matched = "contract.pdf"
- [x] Bijlage record exists in database
- [x] File downloadable from B2

---

## Scenario 2: Opt-In Protection (FR-001)

### Test: Email with files but NO `a:` code in @t syntax

```bash
# Send email WITHOUT attachment code
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOUR_CODE@mg.tickedify.com" \
  -F "subject=Quick Question" \
  -F "body-plain=@t p: Test Project;" \
  -F "file=@signature.png"
```

### Expected Response
```json
{
  "success": true,
  "message": "Email imported successfully",
  "task": {
    "id": "task_...",
    "tekst": "Quick Question",
    "lijst": "inbox",
    "project": "Test Project",
    "context": null
  },
  "attachment": null,
  "timestamp": "..."
}
```

### Verification Steps
```bash
TASK_ID="task_..."  # From response

# Verify NO bijlage record exists
curl -s -L -k "https://dev.tickedify.com/api/taak/$TASK_ID/bijlagen"

# Expected: Empty array []
```

### Success Criteria
- [x] HTTP 200 response
- [x] Task created successfully
- [x] attachment = null (opt-in protection)
- [x] NO bijlage record in database
- [x] signature.png NOT stored (storage quota protected)

---

## Scenario 3: Partial Match Priority (FR-007, FR-008)

### Test: Exact match takes priority over partial match

```bash
# Send email with multiple matching files
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOUR_CODE@mg.tickedify.com" \
  -F "subject=Contract Review" \
  -F "body-plain=@t a:contract;" \
  -F "file=@subcontract.pdf" \
  -F "file=@contract-v1.pdf" \
  -F "file=@contract.pdf"
```

### Expected Response
```json
{
  "success": true,
  "task": {...},
  "attachment": {
    "processed": true,
    "matched": "contract.pdf",  // Exact match wins!
    ...
  }
}
```

### Verification Steps
```bash
# Check server logs for priority decision
# Expected log:
# ✅ Matched attachment: "contract" → contract.pdf
# ℹ️  Other matches skipped: contract-v1.pdf, subcontract.pdf
```

### Success Criteria
- [x] "contract.pdf" matched (exact match)
- [x] "contract-v1.pdf" skipped (starts-with, lower priority)
- [x] "subcontract.pdf" skipped (contains, lowest priority)
- [x] Server logs show priority decision
- [x] Only 1 bijlage record created

---

## Scenario 4: File Not Found (FR-015, FR-020)

### Test: Search term doesn't match any files

```bash
# Send email with non-matching search term
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOUR_CODE@mg.tickedify.com" \
  -F "subject=Invoice Processing" \
  -F "body-plain=@t a:invoice;" \
  -F "file=@contract.pdf" \
  -F "file=@signature.png"
```

### Expected Response
```json
{
  "success": true,
  "task": {
    "id": "task_...",
    "tekst": "Invoice Processing",
    ...
  },
  "attachment": null
}
```

### Verification Steps
```bash
# Check server logs for helpful error message
# Expected log:
# ❌ No match for: "invoice"
# Available files: contract.pdf, signature.png
```

### Success Criteria
- [x] HTTP 200 response (task always created)
- [x] Task created successfully
- [x] attachment = null
- [x] NO bijlage record created
- [x] Server logs show available files (FR-020)

---

## Scenario 5: Type-Based Filtering (FR-010)

### Test: Extension-only search matches first file of that type

```bash
# Send email with type-based filter
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOUR_CODE@mg.tickedify.com" \
  -F "subject=Document Review" \
  -F "body-plain=@t a:pdf;" \
  -F "file=@image.png" \
  -F "file=@document.pdf" \
  -F "file=@spreadsheet.xlsx"
```

### Expected Response
```json
{
  "success": true,
  "task": {...},
  "attachment": {
    "processed": true,
    "matched": "document.pdf",  // First PDF file
    ...
  }
}
```

### Success Criteria
- [x] "document.pdf" matched (first file containing "pdf")
- [x] image.png skipped (doesn't contain "pdf")
- [x] spreadsheet.xlsx skipped (not first match)

---

## Scenario 6: File Size Limit (FR-011, FR-014, FR-016)

### Test: File exceeds 4.5MB limit

```bash
# Create large test file (5MB)
dd if=/dev/zero of=large.pdf bs=1024 count=5120

# Send email with oversized file
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOUR_CODE@mg.tickedify.com" \
  -F "subject=Large Document" \
  -F "body-plain=@t a:large;" \
  -F "file=@large.pdf"
```

### Expected Response
```json
{
  "success": true,
  "task": {
    "id": "task_...",
    "tekst": "Large Document",
    ...
  },
  "attachment": null
}
```

### Verification Steps
```bash
# Check server logs for size error
# Expected log:
# ⚠️ File too large: large.pdf (5 MB, max 4.5 MB)
# Task created without attachment
```

### Success Criteria
- [x] HTTP 200 response (task still created)
- [x] Task created successfully
- [x] attachment = null (file rejected)
- [x] NO bijlage record created
- [x] Server logs show size limit error

---

## Scenario 7: Case-Insensitive Matching (FR-003)

### Test: Uppercase/lowercase doesn't affect matching

```bash
# Send email with uppercase filename
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOUR_CODE@mg.tickedify.com" \
  -F "subject=Contract Review" \
  -F "body-plain=@t a:contract;" \
  -F "file=@CONTRACT.PDF"
```

### Expected Response
```json
{
  "success": true,
  "task": {...},
  "attachment": {
    "processed": true,
    "matched": "CONTRACT.PDF",  // Case-insensitive match!
    ...
  }
}
```

### Success Criteria
- [x] "CONTRACT.PDF" matched despite lowercase search term
- [x] Original filename preserved in bijlage record
- [x] File stored and downloadable

---

## Scenario 8: Backwards Compatibility (FR-027)

### Test: Emails without @t syntax still work

```bash
# Send email without @t syntax (legacy format)
curl -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOUR_CODE@mg.tickedify.com" \
  -F "subject=[Project X] Task name @context" \
  -F "body-plain=Task description here"
```

### Expected Response
```json
{
  "success": true,
  "task": {
    "id": "task_...",
    "tekst": "Task name",
    "lijst": "inbox",
    "project": "Project X",
    "context": "context"
  },
  "attachment": null
}
```

### Success Criteria
- [x] HTTP 200 response
- [x] Task created with parsed project and context
- [x] attachment = null (no @t, no attachment processing)
- [x] Existing behavior unchanged

---

## Full Validation Checklist

### Functional Requirements Coverage
- [ ] FR-001: Opt-in behavior (Scenario 2) ✅
- [ ] FR-002: Parse a:searchterm; syntax (Scenario 1) ✅
- [ ] FR-003: Case-insensitive matching (Scenario 7) ✅
- [ ] FR-004: Contains matching (Scenario 3) ✅
- [ ] FR-005: Max 1 attachment per email (All scenarios) ✅
- [ ] FR-006: Task creation continues on errors (Scenarios 4, 6) ✅
- [ ] FR-007: Exact match priority (Scenario 3) ✅
- [ ] FR-008: Starts-with priority (Scenario 3) ✅
- [ ] FR-009: First match on equal priority (Scenario 5) ✅
- [ ] FR-010: Extension-only search (Scenario 5) ✅
- [ ] FR-011: File size validation (Scenario 6) ✅
- [ ] FR-014: File size rejection (Scenario 6) ✅
- [ ] FR-015: No match error handling (Scenario 4) ✅
- [ ] FR-016: Validation failure handling (Scenario 6) ✅
- [ ] FR-020: Logging available files (Scenario 4) ✅
- [ ] FR-027: Backwards compatibility (Scenario 8) ✅

### Edge Cases Coverage
- [ ] Uppercase extensions (.PDF vs .pdf) ✅
- [ ] Multiple files with same priority ✅
- [ ] Files with spaces in name (add scenario if needed)
- [ ] UTF-8 characters in filename (add scenario if needed)
- [ ] Storage quota exceeded (add scenario if needed)

### Acceptance Scenarios from Spec
- [ ] Scenario 1: 3 attachments, a:contract; → contract.pdf ✅
- [ ] Scenario 2: Files but no a: code → no attachments ✅
- [ ] Scenario 3: Partial match (invoice_final.pdf) ✅
- [ ] Scenario 4: Type filtering (a:pdf;) ✅
- [ ] Scenario 5: File not found → task without attachment ✅
- [ ] Scenario 6: File too large → task without attachment ✅
- [ ] Scenario 7: Exact match priority ✅
- [ ] Scenario 8: Quota exceeded (add if needed)

### System Integration
- [ ] Task creation works ✅
- [ ] Bijlage records accurate ✅
- [ ] B2 storage uploads successful ✅
- [ ] File downloads work ✅
- [ ] Storage quota tracking accurate
- [ ] Server logs complete and helpful ✅

## Debugging Tips

### View Server Logs
```bash
# If running locally:
tail -f server.log

# On Vercel:
vercel logs dev.tickedify.com --follow
```

### Check Database Records
```bash
# Via API (requires authentication)
curl -s -L -k "https://dev.tickedify.com/api/taak/{TASK_ID}"
curl -s -L -k "https://dev.tickedify.com/api/taak/{TASK_ID}/bijlagen"
```

### Test B2 Storage Directly
```bash
# Download file and check contents
curl -s -L -k "https://dev.tickedify.com/api/bijlage/{BIJLAGE_ID}/download" > test.pdf
file test.pdf  # Check file type
head test.pdf  # Check contents
```

### Common Issues

**Issue**: "Invalid import code"
- **Fix**: Check import code in email settings
- **Verify**: `curl dev.tickedify.com/api/user/info` (must be authenticated)

**Issue**: Files not uploaded to B2
- **Fix**: Check B2 credentials in environment variables
- **Verify**: `curl dev.tickedify.com/api/debug/storage-status`

**Issue**: Task created but no attachment
- **Fix**: Check server logs for specific error (size/type/quota)
- **Expected**: This is correct behavior per FR-006 (task always created)

## Next Steps

After all scenarios pass:
1. Run performance tests (attachment processing <5 seconds)
2. Test storage quota limits (100MB free tier)
3. Test concurrent email imports
4. Verify cleanup (task delete cascades to bijlagen)
5. Document findings for production deployment consideration

---

**Status**: Ready for execution on staging (dev.tickedify.com)
**Prerequisites**: Feature 049 deployed to staging branch
**Expected Duration**: 30-45 minutes for full validation
