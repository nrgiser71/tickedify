# Quickstart: Datumformaat Standaardisatie Validatie

**Feature**: DD/MM/YYYY date format standardization
**Purpose**: Manual acceptance testing voor volledige feature validatie
**Duration**: ~15 minuten
**Prerequisites**: Implementation compleet, deployed naar staging (dev.tickedify.com) of productie (tickedify.com)

## Test Environment Setup

**URL**: https://tickedify.com/app
**Credentials**:
- Email: jan@buskens.be
- Wachtwoord: qyqhut-muDvop-fadki9

**Required Test Data**:
- Minimaal 5 taken in Acties lijst met verschillende verschijndatums
- Minimaal 1 herhalende taak
- Minimaal 2 taken in Dagelijkse Planning
- Minimaal 1 context met aanmaak datum zichtbaar

---

## Test Scenarios

### ✅ Scenario 1: Acties Lijst Datums (FR-001)

**User Story**: Als gebruiker bekijk ik de Acties lijst, dan moet ik alle verschijndatums in DD/MM/YYYY formaat zien.

**Steps**:
1. Open tickedify.com/app
2. Log in met test credentials
3. Navigate naar "Acties" lijst (sidebar)
4. Observe taken met verschijndatum

**Expected Result**:
- ✓ Alle verschijndatums tonen formaat `DD/MM/YYYY`
- ✓ Leading zeros aanwezig (01/01/2025, niet 1/1/2025)
- ✓ Slashes als separator (niet streepjes of punten)
- ✓ Geen variatie in format tussen taken

**Example Visual**:
```
Taak: "Vergadering voorbereiden"
Deadline: 22/10/2025    ← DD/MM/YYYY ✓

Taak: "Email client beantwoorden"
Deadline: 05/11/2025    ← Leading zero ✓
```

**Pass Criteria**: ALL datums in lijst volgen DD/MM/YYYY formaat zonder uitzonderingen

---

### ✅ Scenario 2: Afgewerkte Acties Datum (FR-002)

**User Story**: Als gebruiker bekijk ik afgewerkte acties, dan moet ik de afwerk datum in DD/MM/YYYY zien.

**Steps**:
1. In Acties lijst, scroll naar "Afgewerkt" sectie (onderaan)
2. Expand afgewerkte taken sectie
3. Observe afgewerkdatum naast elke taak

**Expected Result**:
- ✓ Afgewerkdatum format: `DD/MM/YYYY`
- ✓ Consistent met verschijndatum format
- ✓ Oude afgewerkte taken (>1 maand geleden) ook correct format

**Example Visual**:
```
✓ Taak: "Rapport schrijven"
  Afgewerkt: 15/10/2025    ← DD/MM/YYYY ✓
```

**Pass Criteria**: Afgewerkdatums identiek format als verschijndatums

---

### ✅ Scenario 3: Dagelijkse Planning Header (FR-003)

**User Story**: Als gebruiker bekijk ik Dagelijkse Planning, dan moet de kalender header DD/MM/YYYY tonen.

**Steps**:
1. Navigate naar "Dagelijkse Planning" (sidebar)
2. Observe kalender header (bovenkant rechter kolom)
3. Note huidige dag weergave

**Expected Result**:
- ✓ Header toont datum in DD/MM/YYYY formaat
- ✓ NIET Engels formaat zoals "Wednesday, October 22, 2025"
- ✓ Consistent format ongeacht dag van week

**Example Visual**:
```
┌─────────────────────────────────────┐
│  22/10/2025         Total: 120 min  │  ← DD/MM/YYYY ✓
│                     📺 Focus  🗑️ Clear│
└─────────────────────────────────────┘
```

**Pass Criteria**: Header datum is DD/MM/YYYY (NIET en-US format)

---

### ✅ Scenario 4: Herhalende Taak Completion Toast (FR-004)

**User Story**: Als gebruiker markeer ik een herhalende taak als afgewerkt, dan moet de toast notification next occurrence in DD/MM/YYYY tonen.

**Steps**:
1. In Acties lijst, find herhalende taak (🔄 indicator)
2. Click checkbox om taak af te werken
3. Observe toast notification (rechtsboven)
4. Read "Next recurrence scheduled for..." message

**Expected Result**:
- ✓ Toast message bevat DD/MM/YYYY format
- ✓ Message voorbeeld: "Task completed! Next recurrence scheduled for 29/10/2025"
- ✓ NIET Engels format zoals "October 29, 2025"

**Example Visual**:
```
┌──────────────────────────────────────────────────┐
│ ✓ Task completed!                                │
│   Next recurrence scheduled for 29/10/2025       │  ← DD/MM/YYYY ✓
└──────────────────────────────────────────────────┘
```

**Pass Criteria**: Toast datum gebruikt DD/MM/YYYY format

---

### ✅ Scenario 5: Context Menu Datums (FR-005)

**User Story**: Als gebruiker open ik het acties menu (right-click of 3-puntjes), dan moet taak datum info DD/MM/YYYY zijn.

**Steps**:
1. In Acties lijst, right-click op taak MET verschijndatum
   - Of: click 3-puntjes button rechts van taak
2. Observe context menu overlay
3. Read taak details in menu (indien datum getoond)

**Expected Result**:
- ✓ Datum in menu overlay (indien present) is DD/MM/YYYY
- ✓ Highlighted taak toont datum in DD/MM/YYYY
- ✓ Consistent met lijst weergave

**Note**: Indien geen datum in context menu visible, skip dit scenario (menu toont mogelijk alleen acties zonder datum details)

**Pass Criteria**: Als datum visible in menu, dan DD/MM/YYYY format

---

### ✅ Scenario 6: Planning Item Expandable Details (FR-006)

**User Story**: Als gebruiker expand ik een planning item in dag-kalender, dan moet verschijndatum DD/MM/YYYY zijn.

**Steps**:
1. In Dagelijkse Planning, find geplande taak in kalender
2. Click op planning item om details te expanderen (▶ → ▼)
3. Observe expanded details (project, context, deadline, duur)
4. Read deadline/verschijndatum field

**Expected Result**:
- ✓ Deadline field toont DD/MM/YYYY
- ✓ Format consistent met Acties lijst
- ✓ Andere details (project, context) unchanged

**Example Visual**:
```
📅 10:00 - Vergadering voorbereiden (60 min)  ▼

    Project: Klant A
    Context: @kantoor
    Deadline: 22/10/2025    ← DD/MM/YYYY ✓
    Duur: 60 min
```

**Pass Criteria**: Expanded deadline is DD/MM/YYYY

---

### ✅ Scenario 7: Context Management Aanmaak Datum (FR-007)

**User Story**: Als gebruiker bekijk ik Context Management, dan moet aanmaak datum DD/MM/YYYY zijn.

**Steps**:
1. In sidebar, find "Contexten beheren" (of navigate via settings)
2. Open Context Management scherm
3. Observe context lijst met aanmaak datums
4. Read "Created:" datum onder context naam

**Expected Result**:
- ✓ Aanmaak datum format: `DD/MM/YYYY`
- ✓ NIET Engels format zoals "10/22/2025" of "October 22, 2025"
- ✓ Alle contexten consistent format

**Example Visual**:
```
@kantoor
Created: 15/09/2025    ← DD/MM/YYYY ✓

@thuis
Created: 20/09/2025    ← DD/MM/YYYY ✓
```

**Pass Criteria**: Context aanmaak datums zijn DD/MM/YYYY

---

### ✅ Scenario 8: Acties Floating Panel Week Dagen (FR-010 compliance)

**User Story**: Als gebruiker sleep ik taak naar Acties Floating Panel, dan zie ik dag nummers (week dag afkortingen blijven Engels).

**Steps**:
1. In Acties lijst, start drag operation op een taak
2. Observe Acties Floating Panel verschijnt (rechts)
3. Read week overzicht (huidige week, volgende week)
4. Note dag nummers EN week dag afkortingen

**Expected Result**:
- ✓ Week dag afkortingen blijven **Engels** (Mo, Tu, We, etc.) - FR-010
- ✓ Dag nummers tonen correcte dag van maand (1-31)
- ✓ Geen volledige DD/MM/YYYY in floating panel (compact design)
- ✓ Maand context beschikbaar via panel header of hover

**Example Visual**:
```
Huidige Week:
┌────┬────┬────┬────┬────┬────┬────┐
│ Mo │ Tu │ We │ Th │ Fr │ Sa │ Su │  ← Engels ✓
│ 21 │ 22 │ 23 │ 24 │ 25 │ 26 │ 27 │  ← Dag nummers
└────┴────┴────┴────┴────┴────┴────┘
```

**Pass Criteria**:
- Week dag afkortingen zijn **Engels** (compliance met FR-010)
- Dag nummers zijn correct
- Geen verwarring over datum context

---

### ✅ Scenario 9: Consistency Check - No Exceptions (FR-009)

**User Story**: Als gebruiker navigeer ik door ALLE schermen, dan moet GEEN ENKELE datum een ander formaat gebruiken dan DD/MM/YYYY.

**Steps**:
1. Open elk scherm in Tickedify:
   - Inbox
   - Acties (including Afgewerkt sectie)
   - Opvolgen
   - Uitgesteld lijsten (wekelijks, maandelijks, etc.)
   - Dagelijkse Planning
   - Context Management
2. For each scherm, observe ALL datum displays
3. Note ANY deviaties van DD/MM/YYYY

**Expected Result**:
- ✓ **ZERO** uitzonderingen op DD/MM/YYYY format
- ✓ Geen gemixte formats binnen zelfde scherm
- ✓ Geen Engels formats (MM/DD/YYYY, October 22, 2025)
- ✓ Geen korte formats ("6 jan", "22 okt")

**Deviation Examples (SHOULD NOT OCCUR)**:
- ❌ "22-10-2025" (streepjes ipv slashes)
- ❌ "10/22/2025" (MM/DD/YYYY - Amerikaans)
- ❌ "October 22, 2025" (Engels volledig)
- ❌ "22 okt 2025" (Nederlands kort)
- ❌ "6/1/2025" (geen leading zeros)

**Pass Criteria**: **100% DD/MM/YYYY consistency** - GEEN enkele uitzondering

---

## Performance Validation (Optional)

**User Story**: Als gebruiker met 100+ taken, dan merk ik geen performance degradatie.

**Steps**:
1. Create 100+ taken in Acties lijst (bulk create indien mogelijk)
2. Navigate naar Acties lijst
3. Measure subjective page load tijd
4. Scroll door lijst, observe lag

**Expected Result**:
- ✓ Lijst render time < 500ms (subjective, geen merkbare lag)
- ✓ Smooth scrolling (60fps)
- ✓ Geen browser freeze tijdens render

**Pass Criteria**: Geen merkbare performance degradatie vs oude implementatie

---

## Success Criteria Summary

**Feature is PASS als**:
- [x] Scenario 1: Acties lijst datums ✓
- [x] Scenario 2: Afgewerkte acties datums ✓
- [x] Scenario 3: Dagelijkse Planning header ✓
- [x] Scenario 4: Recurring task toast ✓
- [x] Scenario 5: Context menu datums ✓
- [x] Scenario 6: Planning expandable details ✓
- [x] Scenario 7: Context Management datums ✓
- [x] Scenario 8: Floating panel compliance (Engels afkortingen) ✓
- [x] Scenario 9: 100% consistency - ZERO uitzonderingen ✓

**Critical Failures** (MUST fix before release):
- ❌ ANY datum niet in DD/MM/YYYY (behalve FR-010 week afkortingen)
- ❌ Gemixte formats binnen zelfde scherm
- ❌ Performance degradatie > 200ms page load

**Minor Issues** (kan post-release fixen):
- ⚠️ Tooltip datum format mismatch (indien tooltips bestaan)
- ⚠️ Edge case: Invalid date error handling niet user-friendly

---

## Regression Testing

**Check dat deze features NIET broken zijn**:
1. ✓ Herhalende taken creation blijft werken
2. ✓ Dagelijkse Planning drag & drop blijft werken
3. ✓ Date input fields accepteren nog steeds YYYY-MM-DD
4. ✓ Sorting op datum blijft correct (server-side)
5. ✓ Datum filters blijven werken (filter op verschijndatum)

---

**Quickstart Status**: Ready for manual execution na implementation compleet
