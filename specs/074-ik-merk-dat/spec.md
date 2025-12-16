# Bug Investigation Specification: New Task Input Appearing on Actions Page

**Feature Branch**: `074-ik-merk-dat`
**Created**: 2025-12-16
**Status**: Draft
**Input**: User description: "Ik merk dat op de Actions pagina, regelmatig de New task textbox en bijhorende knoppen verschijnen bovenaan het scherm. Dat is niet de bedoeling. Onderzoek hoe het komt dat het daar soms verschijnt. Ik wil geen veronderstellingen. Ik wil zekerheid."

---

## Problem Statement

The "New task..." input field with Add and Voice buttons is intermittently appearing at the top of the Actions page. This is unintended behavior - the task input should NOT be visible on the Actions page.

### Visual Evidence
The screenshot shows:
- A "New task..." text input at the top of the Actions page
- "Add" button (blue)
- "Voice" button (blue)
- Filter bar below with TASK, PROJECT, CONTEXT, DATE, PRIORITY filters
- Bulk Edit button on the right

### Expected Behavior
- The Actions page should NOT display the New task input at the top
- The task input should only appear where it is intentionally designed to appear

### Observed Behavior
- Intermittently, the New task input appears on the Actions page
- The word "regelmatig" (regularly) suggests this happens with some frequency but not always

---

## Investigation Requirements

### IR-001: Identify Source of New Task Input HTML
- System MUST identify which code renders the "New task" input element
- Determine if this HTML is:
  - Part of the base page template
  - Dynamically injected by JavaScript
  - Conditionally shown/hidden by CSS

### IR-002: Determine Trigger Conditions
- System MUST identify WHEN the input appears
- Possible triggers to investigate:
  - Specific URL/route conditions
  - JavaScript state conditions
  - CSS visibility rules
  - Page load sequence issues
  - Navigation path (from which page user arrives)

### IR-003: Verify Intended Design
- System MUST confirm where the task input IS supposed to appear
- System MUST confirm it should NOT appear on Actions page

### IR-004: Find Root Cause with Certainty
- User explicitly requests: "Ik wil geen veronderstellingen. Ik wil zekerheid."
- Investigation MUST provide definitive proof of cause, not assumptions
- Code analysis must trace the exact execution path

---

## Investigation Approach

### Step 1: Code Analysis
- Locate the HTML/template for the "New task" input
- Identify all places that reference or render this component
- Map the CSS rules that control visibility

### Step 2: Logic Tracing
- Trace the JavaScript/routing logic that determines what shows on Actions page
- Identify any conditional rendering logic
- Check for race conditions or timing issues

### Step 3: Evidence Collection
- Find the specific code that causes the input to appear
- Document the exact trigger/condition
- Provide definitive proof (code references with line numbers)

---

## Acceptance Criteria

1. **Root cause identified with certainty** - Not speculation but proven cause
2. **Code references provided** - Exact file and line numbers
3. **Reproduction steps documented** - How to trigger the bug (if determinable)
4. **Clear explanation** - Why this happens intermittently

---

## Review & Acceptance Checklist

### Investigation Completeness
- [ ] New task input HTML source identified
- [ ] JavaScript rendering logic traced
- [ ] CSS visibility rules checked
- [ ] Root cause confirmed with code evidence
- [ ] No assumptions - only proven facts

---

## Execution Status

- [x] Problem statement defined
- [ ] Code analysis completed
- [ ] Trigger conditions identified
- [ ] Root cause confirmed
- [ ] Evidence documented

---
