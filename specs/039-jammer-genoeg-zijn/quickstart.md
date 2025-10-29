# Quickstart Testing Guide: Complete English UI Translation

**Feature**: 039-jammer-genoeg-zijn
**Purpose**: Manual visual verification that ALL remaining Dutch text has been translated to English
**Environment**: dev.tickedify.com (staging)

## Pre-requisites

**Login Credentials**:
- URL: https://dev.tickedify.com/app
- Email: jan@buskens.be
- Password: qyqhut-muDvop-fadki9

**Browser**: Any modern browser (Chrome, Firefox, Safari, Edge)

**Expected Baseline**: v0.20.9 translations should already work:
- ✅ Sidebar navigation (Inbox, Actions, Projects, etc.)
- ✅ Modals and popups
- ✅ Toast messages
- ✅ Main page titles

---

## Test 1: Actions Screen Translation (3 areas)

### Steps:
1. Click "Actions" in sidebar
2. Observe the screen

### Verify:
- [ ] **Filter Bar**: ALL filter labels and options display in English
  - Should see: "Filter by...", "All", "Priority", "Context", etc.
  - Should NOT see: "Filteren op...", "Alle", "Prioriteit", etc.

- [ ] **Bulk Edit Button**: Button shows "Bulk Edit"
  - Should see: "Bulk Edit" button above task list
  - Should NOT see: "Bulk bewerken"

- [ ] **Bulk Mode Buttons**: When bulk mode is active
  - Steps: Click "Bulk Edit", select some tasks
  - Should see: Move-to buttons show "Weekly", "Monthly", "Quarterly", etc.
  - Should NOT see: "Wekelijks", "Maandelijks", "3-maandelijks", etc.

---

## Test 2: Projects Screen Translation (3 areas)

### Steps:
1. Click "Projects" in sidebar
2. Observe the screen

### Verify:
- [ ] **Add Project Button**: Button shows "+ New Project"
  - Should see: "+ New Project" button at top
  - Should NOT see: "+ nieuwe project"

- [ ] **Project Statistics**: Each project shows stats in English
  - Should see: "X open" and "X completed"
  - Should NOT see: "X open" and "X afgewerkt" (note: "open" is same, but "afgewerkt" must be "completed")

- [ ] **Expanded Project View**: When expanding a project
  - Steps: Click on a project to expand it
  - Should see: "OPEN ACTIONS" header
  - Should NOT see: "OPEN ACTIES"

---

## Test 3: Postponed Screen Translation (2 areas)

### Steps:
1. Click "Postponed" in sidebar
2. Observe the screen

### Verify:
- [ ] **Page Title**: Title shows "Postponed"
  - Should see: "Postponed" at top of page
  - Should NOT see: "Uitgesteld"

- [ ] **List Names**: All 5 postponed lists show English names
  - Should see: "Weekly", "Monthly", "Quarterly", "Semi-annually", "Yearly"
  - Should NOT see: "Wekelijks", "Maandelijks", "3-maandelijks", "6-maandelijks", "Jaarlijks"

---

## Test 4: Daily Planning Screen Translation (COMPLETE SCREEN)

### Steps:
1. Click "Daily Planning" in sidebar
2. Observe ALL elements on the screen

### Verify:
- [ ] **Page Title**: Shows "Daily Planning"
- [ ] **Filter Bar**: ALL filter options in English
- [ ] **Date Display**: Date labels in English (e.g., "Today", not "Vandaag")
- [ ] **Action Buttons**: ALL buttons show English text
- [ ] **Task List Headers**: No "Acties" visible anywhere (should be "Actions")
- [ ] **Calendar Navigation**: Month/day names in English if visible

**CRITICAL**: This screen must be 100% English - scan every corner

---

## Test 5: Context Management Screen Translation (3 areas)

### Steps:
1. Click "Context Management" in sidebar (or navigate via menu)
2. Observe the screen

### Verify:
- [ ] **Page Title**: Shows "Context Management"
  - Should see: "Context Management"
  - Should NOT see: "Contexten beheer"

- [ ] **Add Button**: Button shows "+ New Context"
  - Should see: "+ New Context"
  - Should NOT see: "+ Nieuwe Context"

- [ ] **Column Header**: Created date column shows "Created"
  - Should see: "Created" column header
  - Should NOT see: "Aangemaakt"

---

## Test 6: Search Screen Translation (COMPLETE SCREEN)

### Steps:
1. Click search icon or access search feature
2. Observe ALL elements on the search screen

### Verify:
- [ ] **Search Placeholder**: Input placeholder in English
- [ ] **Search Button**: Button text in English
- [ ] **Results Headers**: ALL column headers in English
- [ ] **Empty State Message**: If no results, message in English
- [ ] **Filter Options**: Any search filters in English
- [ ] **Action Buttons**: ALL action buttons in English

**CRITICAL**: User specifically said "Maar echt alles" (really everything) - this must be 100% English

---

## Regression Tests (v0.20.9 translations must still work)

Quick check that previous translations haven't broken:

- [ ] Sidebar navigation: Inbox, Actions, Projects, Follow-up, Completed, Daily Planning, Postponed, Context Management
- [ ] Task detail popup: All labels, buttons, checkbox text
- [ ] Toast messages: Task completion, errors, success messages
- [ ] Loading indicators: "Loading...", "Finishing..."
- [ ] Modal dialogs: Edit Project, Delete Task, etc.

---

## Expected Results

**SUCCESS CRITERIA**:
- ✅ ALL 6 test scenarios pass (all checkboxes checked)
- ✅ NO Dutch text visible anywhere in the application
- ✅ ALL regression tests pass (v0.20.9 translations intact)

**FAILURE CRITERIA**:
- ❌ ANY Dutch text found on ANY screen
- ❌ ANY v0.20.9 translation broken

---

## Bug Reporting Template

If Dutch text is found during testing:

```
Screen: [e.g., "Actions"]
Location: [e.g., "Filter bar, second dropdown"]
Dutch Text Found: [e.g., "Alle projecten"]
Expected English: [e.g., "All projects"]
Screenshot: [attach if possible]
```

---

## Notes

- This test suite covers ALL 11 areas identified in spec.md
- Each test is designed for quick visual verification (< 30 seconds per screen)
- Total testing time: ~5-10 minutes for complete suite
- No automated tests required - UI translation is best verified visually by human
- If ANY Dutch text is found, implementation is incomplete
