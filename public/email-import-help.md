# Tickedify Email Import Syntax Help

## Quick Start

Send an email to your personal import address with an `@t` instruction on the first line:

```
@t p: My Project; c: Work; d: 2025-11-15; p1; t: 30;

This is the task description.
Multiple lines are possible.
```

This creates a task with:
- **Project**: My Project
- **Context**: Work
- **Due date**: November 15, 2025
- **Priority**: High
- **Duration**: 30 minutes

## Syntax Overview

### Basic Format

```
@t code1; code2; code3;
```

- Place `@t` on the **first non-empty line** of the email body
- Separate codes with semicolons `;`
- Order is flexible
- Spaces are automatically removed

### Supported Codes

| Code | Description | Example |
|------|-------------|---------|
| `p:` | Project name | `p: Client X` |
| `c:` | Context name | `c: Work` |
| `d:` | Due date (ISO format) | `d: 2025-12-01` |
| `t:` | Duration in minutes | `t: 45` |
| `p0-p9` | Priority code | `p1` or `p2` or `p3` |
| `a:` | **Attachment** | `a:contract` or `a:pdf` |
| `df` | Defer to Follow-up | `df;` |
| `dw` | Defer to Weekly | `dw;` |
| `dm` | Defer to Monthly | `dm;` |
| `d3m` | Defer to Quarterly | `d3m;` |
| `d6m` | Defer to Bi-annual | `d6m;` |
| `dy` | Defer to Yearly | `dy;` |

## Examples

### Example 1: Complete Task

```
@t p: Website Redesign; c: Work; d: 2025-11-20; p1; t: 120;

Discuss new wireframes with design team.
Review stakeholder feedback.
```

→ Project, context, deadline, priority High, 120 minutes

### Example 2: Defer to Monthly

```
@t dm;

Follow up with client about contract renewal.
```

→ Task to Monthly list (all other codes are ignored with defer!)

### Example 3: Minimal

```
@t c: Home; p2;

Grocery shopping
```

→ Only context and priority Medium

### Example 4: With Attachment (Feature 049)

```
@t p: Contract Review; a:contract;

Review attached contract and provide feedback.
```

**Attachment**: contract.pdf (or contract-final.pdf, client_contract.docx, etc.)
→ Smart matching: `a:contract` finds files with "contract" in the name
→ Priority: Exact match > Starts with > Contains

### Example 5: Type-Based Attachment Filtering

```
@t c: Admin; a:pdf;

Process the attached invoice.
```

→ `a:pdf` matches the **first PDF file** in the email
→ Useful when you know it's a PDF but not the exact name

### Example 6: Email with Files but NO `a:` Code

```
@t p: Project X; c: Work;

Quick question about project.

(Email contains signature.png as attachment)
```

→ **No attachment processed** - signature.png is NOT saved
→ Opt-in protection: only `a:` code activates attachment processing
→ Protects your storage quota against unwanted signature images

### Example 7: Without @t (Backwards Compatible)

```
[Project X] New task @work

This still works as before.
Project: Other Project
Duration: 30
```

→ Old syntax still works!

## Priority Codes

| Code | Priority | Color |
|------|----------|-------|
| `p0` | High | 🔴 |
| `p1` | High | 🔴 |
| `p2` | Medium | 🟡 |
| `p3` | Low | 🟢 |
| `p4+` | Low | 🟢 |

**Example**: `@t p1; d: 2025-11-10;` → High priority task with deadline

## Defer Codes (Absolute Priority!)

**IMPORTANT**: When you use a defer code, ALL other codes are ignored.

```
@t dm; p: Project X; c: Work; d: 2025-12-01;
```

→ Task goes to **Monthly list**
→ Project, context and due date are **IGNORED**

**Why?** Deferred tasks don't need specific details yet - you just want them out of your head until a later moment.

### All Defer Shortcuts

| Code | Defer List | When to Review |
|------|------------|----------------|
| `df` | Follow-up | Next review moment |
| `dw` | Weekly | Every week |
| `dm` | Monthly | Every month |
| `d3m` | Quarterly | Every quarter |
| `d6m` | Bi-annual | Every six months |
| `dy` | Yearly | Every year |

## Body Truncation with --end--

Use `--end--` to cut everything after it (useful for signatures):

```
@t c: Work; p2;

Meeting notes here.

--END--

Best regards,
Jan Buskens
jan@tickedify.com
```

→ Task notes contain ONLY "Meeting notes here."
→ Signature is NOT included

**Note**:
- `--end--` is **case-insensitive**: `--END--`, `--End--`, `--end--` all work
- Works **without @t**: Old emails can also use --end--
- Everything **after** `--end--` is removed

## Validation Rules

### Due Date

✅ **Valid**: `d: 2025-12-01` (ISO format YYYY-MM-DD)
❌ **Invalid**: `d: 01/12/2025`, `d: December 1`, `d: 2025-12`

→ Invalid dates are **ignored** (task is still created)

### Duration

✅ **Valid**: `t: 30`, `t: 120`, `t: 5`
❌ **Invalid**: `t: 30.5`, `t: half hour`, `t: -15`

→ Invalid values are **ignored**

### Project & Context

✅ **Always valid**: Any text is OK
✅ **Spaces preserved**: `p: Client X Project Y` → "Client X Project Y"
✅ **Auto-creation**: New projects/contexts are automatically created

## Duplicates

With duplicate codes, the **first** counts, rest are ignored:

```
@t p: Project A; p: Project B; c: Context 1; c: Context 2;
```

→ Project: **Project A** (first)
→ Context: **Context 1** (first)
→ Project B and Context 2 are **ignored**

## Edge Cases

### @t Without Parameters

```
@t

Task description
```

→ Treated as if there is **no** @t
→ Falls back to standard parsing

### Empty Values

```
@t p: ; c: Work;
```

→ Project is ignored (empty value)
→ Context works fine

### Unknown Codes

```
@t xyz: value; c: Work;
```

→ `xyz:` is **ignored**
→ Context works fine
→ **No error** - task is created

## Frequently Asked Questions

**Q: Can I place @t somewhere other than the first line?**
A: No, @t must be on the first non-empty line.

**Q: Do old emails still work?**
A: Yes! Emails without @t work exactly as before. `[Project]` and `@context` in subject, `Project:` and `Context:` in body still work.

**Q: What if I make a syntax error?**
A: The task is created with the codes that ARE correct. Invalid codes are ignored.

**Q: Do I get a confirmation that it worked?**
A: No, Tickedify doesn't send confirmation emails to avoid cluttering your inbox. Just check your Inbox in Tickedify.

**Q: Can I specify multiple priorities?**
A: You can use multiple codes, but only the first counts. `p1; p2; p3;` → High (p1)

**Q: Do I need a semicolon after the last code?**
A: No, but it's allowed. `@t c: Work;` and `@t c: Work` both work.

**Q: How many attachments can I send per email?**
A: Maximum **1 attachment** per email is processed. This protects your storage quota.

**Q: What file types are supported?**
A: PDF, Word, Excel, images (JPG/PNG/GIF), ZIP, and plain text. Max **4.5MB** per file.

**Q: What happens if I don't use an `a:` code but send attachments?**
A: Nothing! Attachments are ignored (opt-in protection). Only with `a:` code are attachments processed.

## Attachment Processing (Feature 049)

### How It Works

Add `a:searchterm;` to your @t syntax to link an attachment to the task:

```
@t p: Contract Review; a:contract;

Review the attached contract and provide feedback.

(Attached: client_contract_final.pdf)
```

→ The attachment is automatically linked to the task
→ You can download the attachment later from Tickedify

### Smart Matching with Priorities

Tickedify uses **smart filename matching** with 3 priority levels:

1. **Exact Match** (highest priority):
   - `a:contract;` matches `contract.pdf` (exact)
   - `a:invoice;` matches `invoice.docx` (exact without extension)

2. **Starts-With Match**:
   - `a:contract;` matches `contract-final.pdf` (starts with "contract")
   - `a:report;` matches `report_2025_Q1.xlsx` (starts with "report")

3. **Contains Match** (lowest priority):
   - `a:contract;` matches `client_contract_v2.pdf` (contains "contract")
   - `a:invoice;` matches `client_invoice_dec.pdf` (contains "invoice")

**If multiple files match**: Exact match always wins, then starts-with, then contains.

### Type-Based Filtering

Search by file type instead of name:

```
@t a:pdf;        → First PDF file
@t a:docx;       → First Word document
@t a:xlsx;       → First Excel file
@t a:png;        → First PNG image
```

→ Useful when you don't know the exact filename
→ Matches the **first** file of that type

### Opt-In Protection

**Important**: Attachments are ONLY processed with `a:` code!

```
# WITH a: code - attachment is processed
@t p: Project; a:document;
(Attached: document.pdf)  ✅ Is saved

# WITHOUT a: code - attachment is NOT processed
@t p: Project;
(Attached: signature.png)  ❌ Is NOT saved
```

→ Protects against unwanted signature images
→ Prevents unnecessary storage quota usage
→ You always have control

### File Size Limits

- **Max file**: 4.5MB per attachment
- **Storage quota**: 100MB total (free tier)
- **Number of attachments**: Max 1 per email

If file is too large:
→ Task is still created
→ Attachment is NOT saved
→ Notice in server logs

### Attachment Troubleshooting

**Attachment not linked:**
- ✅ Did you use `a:` code in @t syntax?
- ✅ Does the search term match the filename?
- ✅ Is the file smaller than 4.5MB?
- ✅ Check if the file type is supported

**Wrong attachment linked:**
- ✅ Multiple files match? Use more specific search term
- ✅ Exact match has priority - check filenames
- ✅ Use full filename for exact match

**Examples of good search terms:**
```
a:contract;        # Generic, finds many files
a:contract_v3;     # Specific, finds exact version
a:2025-01-invoice; # Very specific with date
```

## Troubleshooting

### Task Not Created

- ✅ Check your import email address (must contain your personal code)
- ✅ Verify you're sending from the correct email address
- ✅ Look in your Tickedify Inbox to see if the task is there

### @t Not Recognized

- ✅ Is @t on the **first non-empty line**?
- ✅ Is there a **space** after @t? (`@t ` not `@t`)
- ✅ Are you using semicolons between codes?

### Codes Ignored

- ✅ Did you use a **defer code**? (those ignore all other codes)
- ✅ Check your syntax: `p: value` (with space after `:`)
- ✅ For due date: use ISO format `YYYY-MM-DD`
- ✅ For duration: use only numbers (minutes)

### Project/Context Not Linked

- ✅ Check spelling (case-sensitive)
- ✅ New projects/contexts are automatically created
- ✅ Check in Tickedify if they exist

## Tips & Tricks

### Standard Template

Create an email template in your email client:

```
@t p: [PROJECT]; c: [CONTEXT]; p2;

[TASK DESCRIPTION]

--END--
```

### Mobile Usage

On mobile: use simple codes to be quick:

```
@t c: Work; p1;

Short task description
```

### Batch Import

Forwarding multiple emails works fine - each email becomes a separate task.

### Signature Protection

Add `--END--` to your email signature to automatically cut everything after it:

```
Meeting notes

--END--
Best regards,
[Signature]
```

---

**Questions?** Email jan@tickedify.com or check the [Tickedify documentation](https://tickedify.com).
