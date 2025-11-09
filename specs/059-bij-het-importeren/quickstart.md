# Quickstart: Email Import Attachment Syntax Flexibility

**Date**: 2025-11-08
**Feature**: 059-bij-het-importeren
**Environment**: dev.tickedify.com (staging)

## Prerequisites

- Staging deployment active on dev.tickedify.com
- Test email access for sending emails to Mailgun
- Import code for test user: Check `/api/get-import-code` endpoint
- Vercel MCP tools for staging access (dev.tickedify.com requires authentication)

## Test Scenarios

### Scenario 1: Single Attachment with `a;` Syntax

**Objective**: Verify that `a;` processes the only attachment when one file is present.

**Steps**:
1. Send email to `import+{code}@mg.tickedify.com`
2. Subject: `Test single attachment`
3. Body:
   ```
   @t a;

   This email has one PDF attachment that should be processed automatically.
   ```
4. Attach: `invoice.pdf`

**Expected Result**:
- ✅ Task created with title "Test single attachment"
- ✅ Attachment `invoice.pdf` linked to task
- ✅ Task notes: "This email has one PDF attachment that should be processed automatically."

**Verification**:
```bash
# Get tasks from inbox
curl -s -L -k "https://dev.tickedify.com/api/lijst/acties" \
  -H "Cookie: auth_token={your_token}" | jq '.[] | select(.tekst | contains("Test single"))'

# Check attachment was linked
# Look for attachmentConfig or attachment_id in response
```

---

### Scenario 2: Multiple Attachments with `a;` Syntax

**Objective**: Verify that `a;` processes only the first attachment when multiple files are present.

**Steps**:
1. Send email to `import+{code}@mg.tickedify.com`
2. Subject: `Test multiple attachments`
3. Body:
   ```
   @t a;

   This email has three attachments, but only the first should be processed.
   ```
4. Attach (in order):
   - `first.pdf`
   - `second.pdf`
   - `third.pdf`

**Expected Result**:
- ✅ Task created with title "Test multiple attachments"
- ✅ Only `first.pdf` linked to task
- ✅ `second.pdf` and `third.pdf` NOT linked

**Verification**:
```bash
# Check task has exactly one attachment
curl -s -L -k "https://dev.tickedify.com/api/lijst/acties" \
  -H "Cookie: auth_token={your_token}" | jq '.[] | select(.tekst | contains("Test multiple"))'

# Verify attachment filename contains "first"
```

---

### Scenario 3: No Attachments with `a;` Syntax

**Objective**: Verify that `a;` is silently ignored when no attachments are present.

**Steps**:
1. Send email to `import+{code}@mg.tickedify.com`
2. Subject: `Test no attachments`
3. Body:
   ```
   @t a;

   This email has no attachments - the a; code should be ignored silently.
   ```
4. Attach: Nothing

**Expected Result**:
- ✅ Task created with title "Test no attachments"
- ✅ NO attachment linked (silently ignored)
- ✅ No error message or warning
- ✅ Task notes contain body text

**Verification**:
```bash
# Check task exists without attachment
curl -s -L -k "https://dev.tickedify.com/api/lijst/acties" \
  -H "Cookie: auth_token={your_token}" | jq '.[] | select(.tekst | contains("Test no attachments"))'

# Verify no attachment field or null attachment
```

---

### Scenario 4: Colon Without Filename (`a:` or `a: `)

**Objective**: Verify that `a:` and `a: ` are treated identically to `a;`.

**Steps**:
1. Send email to `import+{code}@mg.tickedify.com`
2. Subject: `Test colon without filename`
3. Body:
   ```
   @t a: ;

   Colon with space but no filename - should work like a;
   ```
4. Attach: `document.pdf`

**Expected Result**:
- ✅ Task created with title "Test colon without filename"
- ✅ Attachment `document.pdf` linked to task
- ✅ Behaves identically to Scenario 1

**Verification**:
```bash
# Same verification as Scenario 1
curl -s -L -k "https://dev.tickedify.com/api/lijst/acties" \
  -H "Cookie: auth_token={your_token}" | jq '.[] | select(.tekst | contains("Test colon"))'
```

---

### Scenario 5: Backwards Compatibility with Filename

**Objective**: Verify that existing `a: filename` syntax continues to work unchanged.

**Steps**:
1. Send email to `import+{code}@mg.tickedify.com`
2. Subject: `Test backwards compatibility`
3. Body:
   ```
   @t a: invoice;

   This should find and process the file containing "invoice" in the name.
   ```
4. Attach (in order):
   - `notes.txt`
   - `invoice-2025-11.pdf`
   - `report.pdf`

**Expected Result**:
- ✅ Task created with title "Test backwards compatibility"
- ✅ Only `invoice-2025-11.pdf` linked to task
- ✅ `notes.txt` and `report.pdf` NOT linked
- ✅ Existing matching logic (contains "invoice") works

**Verification**:
```bash
# Check correct attachment was matched
curl -s -L -k "https://dev.tickedify.com/api/lijst/acties" \
  -H "Cookie: auth_token={your_token}" | jq '.[] | select(.tekst | contains("Test backwards"))'

# Verify attachment filename contains "invoice"
```

---

### Scenario 6: Case Insensitivity (`A;` vs `a;`)

**Objective**: Verify that attachment code is case-insensitive.

**Steps**:
1. Send email to `import+{code}@mg.tickedify.com`
2. Subject: `Test case insensitivity`
3. Body:
   ```
   @t A;

   Capital A should work identically to lowercase a
   ```
4. Attach: `test.pdf`

**Expected Result**:
- ✅ Task created with title "Test case insensitivity"
- ✅ Attachment `test.pdf` linked to task
- ✅ Capital `A;` recognized correctly

**Verification**:
```bash
# Same verification as Scenario 1
curl -s -L -k "https://dev.tickedify.com/api/lijst/acties" \
  -H "Cookie: auth_token={your_token}" | jq '.[] | select(.tekst | contains("Test case"))'
```

---

### Scenario 7: Combined with Other @t Codes

**Objective**: Verify `a;` works correctly when combined with other @t instruction codes.

**Steps**:
1. Send email to `import+{code}@mg.tickedify.com`
2. Subject: `Test combined codes`
3. Body:
   ```
   @t p: Testing Project; c: Work; d: 2025-11-15; t: 30; p1; a;

   This combines multiple @t codes with the new attachment syntax.
   ```
4. Attach: `combined-test.pdf`

**Expected Result**:
- ✅ Task created with title "Test combined codes"
- ✅ Project: "Testing Project"
- ✅ Context: "Work"
- ✅ Due date: 2025-11-15
- ✅ Duration: 30 minutes
- ✅ Priority: high (p1)
- ✅ Attachment `combined-test.pdf` linked

**Verification**:
```bash
# Check all properties were parsed
curl -s -L -k "https://dev.tickedify.com/api/lijst/acties" \
  -H "Cookie: auth_token={your_token}" | jq '.[] | select(.tekst | contains("Test combined"))'

# Verify all fields populated correctly
```

---

## Regression Tests

### Regression 1: Existing `a: filename` Unaffected

**Objective**: Confirm no regression in existing attachment syntax.

**Steps**:
1. Run Scenario 5 (backwards compatibility)
2. Test partial matching: `a: inv` should match `invoice.pdf`
3. Test exact matching: `a: notes.txt` should match exactly

**Expected**: All existing matching behaviors work identically.

---

### Regression 2: Other @t Codes Unaffected

**Objective**: Confirm attachment syntax changes don't affect other codes.

**Steps**:
1. Send email with `@t p: Project; c: Context; d: 2025-12-01;` (NO attachment code)
2. Verify task created with correct properties and no attachment

**Expected**: Non-attachment @t codes work identically to before.

---

## Error Cases

### Error 1: Invalid Import Code

**Steps**:
1. Send email to `import+invalid@mg.tickedify.com`

**Expected**: Email rejected or error response (existing behavior unchanged).

---

### Error 2: Malformed @t Syntax

**Steps**:
1. Send email with body: `@t a;; p: Test;` (double semicolon)

**Expected**: Silently ignored (consistent with existing error tolerance).

---

## Cleanup

After testing, delete test tasks:

```bash
# List all test tasks
curl -s -L -k "https://dev.tickedify.com/api/lijst/acties" \
  -H "Cookie: auth_token={your_token}" | jq '.[] | select(.tekst | contains("Test"))'

# Delete each test task by ID
curl -X DELETE -s -L -k "https://dev.tickedify.com/api/taak/{task_id}" \
  -H "Cookie: auth_token={your_token}"
```

---

## Success Criteria

All 7 scenarios pass:
- ✅ Scenario 1: Single attachment processed
- ✅ Scenario 2: First of multiple processed
- ✅ Scenario 3: No attachment silently ignored
- ✅ Scenario 4: Colon-only treated as no filename
- ✅ Scenario 5: Backwards compatibility maintained
- ✅ Scenario 6: Case insensitivity works
- ✅ Scenario 7: Combined codes work together

All 2 regression tests pass:
- ✅ Regression 1: Existing syntax unaffected
- ✅ Regression 2: Other codes unaffected

All 2 error cases handled:
- ✅ Error 1: Invalid import code rejected
- ✅ Error 2: Malformed syntax tolerated

---

## Notes

- Use Vercel MCP tools to access dev.tickedify.com (requires authentication)
- Test emails may take 5-10 seconds to process via Mailgun webhook
- Check `/api/version` to confirm staging deployment before testing
- All test data on dev.tickedify.com (staging database)
