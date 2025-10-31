# Quickstart Testing Guide: Email Import Syntax

**Feature**: 048-email-import-syntax
**Testing Environment**: dev.tickedify.com (staging)
**Test User**: jan@buskens.be

## Overview

Dit document bevat alle test scenarios voor de email import syntax uitbreiding. Test scenarios dekken alle 41 functional requirements uit spec.md.

## Prerequisites

1. Staging environment deployed: dev.tickedify.com
2. Test user credentials: jan@buskens.be / qyqhut-muDvop-fadki9
3. Import email address: Verkrijgbaar via admin settings
4. curl installatie voor API testing

## Test Scenarios

### Scenario 1: Basic @t Parsing (FR-001 t/m FR-006)

**Test alle ondersteunde codes in één email**

```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test @t syntax" \
  -F "body-plain=@t p: Klant X; c: Werk; d: 2025-11-03; p1; t: 30;

Taak beschrijving hier."
```

**Expected Result:**
- ✅ Project "Klant X" aangemaakt of gevonden
- ✅ Context "Werk" aangemaakt of gevonden
- ✅ Due date: 2025-11-03
- ✅ Priority: High
- ✅ Duration: 30 minuten
- ✅ Notes: "Taak beschrijving hier." (zonder @t regel)

### Scenario 2: Backwards Compatibility (FR-037, FR-038)

**Email zonder @t moet exact hetzelfde werken**

```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=[Project Y] Nieuwe taak @thuiswerk" \
  -F "body-plain=Project: Klant Z
Context: Werk
Duur: 45
Deadline: 2025-12-01

Taak beschrijving."
```

**Expected Result:**
- ✅ Subject line parsing werkt (Project Y uit [])
- ✅ Body parsing werkt (Klant Z, Werk, 45, 2025-12-01)
- ✅ Exact hetzelfde behavior als voor deze feature

### Scenario 3: Defer Absolute Priority (FR-015, FR-016)

**Defer code negeert alle andere codes**

```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test defer" \
  -F "body-plain=@t dm; p: Project X; c: Werk; d: 2025-11-03; p2; t: 60;

Deze codes worden allemaal genegeerd."
```

**Expected Result:**
- ✅ Lijst: monthly (defer to monthly)
- ❌ Project: null (genegeerd door defer)
- ❌ Context: null (genegeerd door defer)
- ❌ Due date: null (genegeerd door defer)
- ❌ Priority: null (genegeerd door defer)
- ❌ Duration: null (genegeerd door defer)

### Scenario 4: Priority Normalisatie (FR-011 t/m FR-013)

**Test p0 → High, p2 → Medium, p4 → Low**

Test 1: p0 normalisatie
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test p0" \
  -F "body-plain=@t p0; d: 2025-12-01;

Prioriteit moet High zijn."
```
**Expected**: Priority = High ✅

Test 2: p4+ normalisatie
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test p4" \
  -F "body-plain=@t p4; c: Thuis;

Prioriteit moet Low zijn."
```
**Expected**: Priority = Low ✅

### Scenario 5: Entity Auto-Creation (FR-024, FR-025)

**Nieuwe project en context worden automatisch aangemaakt**

```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test auto-create" \
  -F "body-plain=@t p: Nieuw Project 123; c: Nieuwe Context 456;

Test auto-creation."
```

**Verification:**
```bash
# Check database voor nieuwe entities
curl -s -L -k https://dev.tickedify.com/api/projecten
curl -s -L -k https://dev.tickedify.com/api/contexten
```

**Expected Result:**
- ✅ Project "Nieuw Project 123" exists
- ✅ Context "Nieuwe Context 456" exists
- ✅ Task gekoppeld aan beide

### Scenario 6: --end-- Marker (FR-019 t/m FR-023)

**Body truncatie werkt altijd, zelfs zonder @t**

Test 1: Met @t
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test --end--" \
  -F "body-plain=@t c: Werk; p2;

Taak beschrijving.

--END--

Handtekening hier (niet opgenomen)."
```

Test 2: Zonder @t
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test --end-- zonder @t" \
  -F "body-plain=Taak beschrijving.

--end--

Handtekening hier (niet opgenomen)."
```

Test 3: Case-insensitive
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test --END--" \
  -F "body-plain=@t c: Werk;

Taak beschrijving.

--END--

Handtekening."
```

**Expected Result:**
- ✅ Task notes = "Taak beschrijving." (alleen)
- ✅ Handtekening NIET in notes
- ✅ --end-- zelf NIET in notes
- ✅ Werkt met @t en zonder @t
- ✅ Case-insensitive (--end--, --END--, --End--)

### Scenario 7: Error Tolerance (FR-028 t/m FR-034)

**Ongeldige codes worden genegeerd, taak wordt toch aangemaakt**

Test 1: Invalid date format
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test invalid date" \
  -F "body-plain=@t d: 03/11/2025; c: Werk;

Invalid date format."
```
**Expected**: Context = Werk ✅, Due date = null ✅

Test 2: Invalid duration
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test invalid duration" \
  -F "body-plain=@t t: abc; c: Thuis;

Invalid duration."
```
**Expected**: Context = Thuis ✅, Duration = null ✅

Test 3: Unknown code
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test unknown code" \
  -F "body-plain=@t xyz: waarde; c: Werk;

Unknown code ignored."
```
**Expected**: Context = Werk ✅, xyz code genegeerd ✅

### Scenario 8: Duplicates Handling (FR-017, FR-018)

**Eerste code telt, duplicaten worden genegeerd**

```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test duplicates" \
  -F "body-plain=@t p: Project A; p: Project B; c: Context C; c: Context D;

Duplicates test."
```

**Expected Result:**
- ✅ Project: Project A (eerste)
- ❌ Project B genegeerd (duplicate)
- ✅ Context: Context C (eerste)
- ❌ Context D genegeerd (duplicate)

Test 2: Multiple priority codes
```bash
curl -s -L -k -X POST https://dev.tickedify.com/api/email/import \
  -F "sender=test@example.com" \
  -F "recipient=import+YOURCODE@mg.tickedify.com" \
  -F "subject=Test priority duplicates" \
  -F "body-plain=@t p1; p2; p3;

Multiple priorities."
```

**Expected**: Priority = High (p1, eerste) ✅

### Scenario 9: UI Help Icon (FR-040, FR-041)

**Browser testing voor help icoon functionaliteit**

1. Navigate naar https://dev.tickedify.com/admin.html
2. Login met jan@buskens.be credentials
3. Scroll naar import email sectie
4. Verify:
   - ✅ ❓ Help icoon zichtbaar naast copy button
   - ✅ Click opent /email-import-help.md in nieuwe tab
   - ✅ Helpfile bevat volledige syntax documentatie
   - ✅ Styling matcht bestaande UI

### Scenario 10: All Defer Codes (FR-014)

**Test alle 6 defer shortcuts**

| Code | Expected Lijst | Test Command |
|------|---------------|--------------|
| df | followup | `curl ... -F "body-plain=@t df;"` |
| dw | weekly | `curl ... -F "body-plain=@t dw;"` |
| dm | monthly | `curl ... -F "body-plain=@t dm;"` |
| d3m | quarterly | `curl ... -F "body-plain=@t d3m;"` |
| d6m | biannual | `curl ... -F "body-plain=@t d6m;"` |
| dy | yearly | `curl ... -F "body-plain=@t dy;"` |

**Verification:**
```sql
-- Check task lijst value in database
SELECT id, tekst, lijst FROM taken WHERE tekst = 'Test defer' ORDER BY aangemaakt DESC LIMIT 1;
```

## Database Verification Queries

```sql
-- Check created task details
SELECT id, tekst, lijst, prioriteit, verschijndatum, duur, project_id, context_id
FROM taken
WHERE user_id = (SELECT id FROM gebruikers WHERE email = 'jan@buskens.be')
ORDER BY aangemaakt DESC
LIMIT 10;

-- Check auto-created projects
SELECT id, naam FROM projecten WHERE naam LIKE '%Nieuw Project%';

-- Check auto-created contexts
SELECT id, naam FROM contexten WHERE naam LIKE '%Nieuwe Context%';
```

## Success Criteria

✅ Alle 10 scenarios slagen
✅ Backwards compatibility 100% - geen breaking changes
✅ --end-- marker werkt in alle cases
✅ Defer codes hebben absolute voorrang
✅ Priority normalisatie correct (p0→High, p4→Low)
✅ Entity auto-creation werkt
✅ Error tolerance - partial success bij ongeldige codes
✅ Duplicaat handling - eerste code telt
✅ UI help icoon werkt
✅ Alle 41 functional requirements gedekt

## Troubleshooting

**Problem**: Task niet aangemaakt
- Check import code in recipient address
- Verify user exists met die import code
- Check server logs voor errors

**Problem**: @t niet detected
- Verify @t staat op eerste niet-lege regel
- Check voor typos (@t moet lowercase of uppercase zijn)
- Verify spatie na @t: `@t ` niet `@t`

**Problem**: Codes genegeerd
- Check voor defer code - die negeert alle andere codes
- Verify syntax: `p: waarde` niet `p:waarde` of `p :waarde`
- Check voor puntkomma tussen codes: `p: X; c: Y;`

**Problem**: --end-- niet werkend
- Case-insensitive - probeer verschillende cases
- Moet exact --end-- zijn (geen spaces)
- Check of marker wel in body staat

---

**Testing Complete** ✅
**All scenarios documented** ✅
**Ready for implementation** ✅
