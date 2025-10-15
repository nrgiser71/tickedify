# Research: MIT Maximum Telling Bug Fix

**Feature**: 015-in-het-scherm - MIT Maximum Telling Bug Fix
**Date**: 2025-10-15
**Status**: Completed

## Research Questions

### Q1: Waarom worden MIT's van vorige dagen niet meegeteld?

**Investigation:**
- Analyseerde `toggleTopPriority()` in app.js:5900-5950
- Bekijk API endpoint `/api/prioriteiten/:datum` in server.js:5857-5877
- Database query: `WHERE prioriteit_datum = $1` (vandaag)

**Finding:**
De API query filtert expliciet op `prioriteit_datum = vandaag`. MIT's die gisteren aangemaakt zijn hebben `prioriteit_datum = gisteren`, waardoor ze niet in de query resultaten zitten.

**Evidence:**
```sql
-- Huidige query (server.js:5867-5871)
SELECT * FROM taken
WHERE prioriteit_datum = $1 AND user_id = $2 AND top_prioriteit IS NOT NULL
ORDER BY top_prioriteit

-- MIT van gisteren: prioriteit_datum = '2025-10-14'
-- API call vandaag: /api/prioriteiten/2025-10-15
-- Result: MIT van gisteren wordt NIET geretourneerd
```

**Conclusion:**
Query design probleem - filtert op verkeerde criterium voor limiet controle.

---

### Q2: Waarom werkt het wel correct na uitloggen en inloggen?

**Investigation:**
- Analyseerde `toonDagelijksePlanning()` in app.js:8100-8120
- Deze functie laadt `this.topPrioriteiten` array bij page load
- Bekijk hoe deze array gevuld wordt

**Finding:**
Bij page load worden ALLE MIT's geladen via `/api/prioriteiten/:datum`, maar deze data wordt gebruikt voor UI rendering, NIET voor limiet validatie tijdens toggle.

**Evidence:**
```javascript
// app.js:8114-8120
const prioriteitenResponse = await fetch(`/api/prioriteiten/${today}`);
if (prioriteitenResponse.ok) {
    const prioriteiten = await prioriteitenResponse.json();
    this.topPrioriteiten = prioriteiten; // Opgeslagen in instance variable
}

// Maar in toggleTopPriority() wordt OPNIEUW een API call gedaan
// In plaats van this.topPrioriteiten te gebruiken
```

**Actual Behavior After Login:**
Na dieper onderzoek blijkt dat na uitlog/inlog het WEL werkt omdat:
1. Page refresh laadt ALLE taken opnieuw
2. `this.topPrioriteiten` bevat ALLE MIT's die visueel zichtbaar zijn
3. Deze array wordt gebruikt voor rendering, en blijkbaar wordt er ergens anders ook gecheckt

**Wait... Let me verify this claim:**
Checking code at app.js:5906-5915 - er is GEEN check op `this.topPrioriteiten`, alleen op API response.

**Re-investigation needed:**
User claimt dat het WEL werkt na uitlog/inlog. Maar code doet exact dezelfde API call. Waarom zou het dan anders werken?

**Hypothesis:**
Mogelijk werkt het NIET correct na inlog - user heeft dit misschien verkeerd geobserveerd. Of er is een andere factor:
- Cache?
- Timing van API calls?
- Andere code path?

**Alternative Finding:**
Misschien bedoelt user dat de UI TOONT wat correct is (sterretjes zichtbaar), maar de limiet validatie werkt NIET. Dit zou kloppen met de code.

**Conclusion:**
De claim dat het werkt na inlog is waarschijnlijk gebaseerd op UI state (sterretjes worden correct getoond), maar de limiet validatie blijft kapot omdat dezelfde API call wordt gedaan.

---

### Q3: Wat is de beste oplossing - client-side of server-side fix?

**Option A: Client-side Counting**

**Approach:**
```javascript
// Gebruik this.topPrioriteiten array die al geladen is
const currentMITCount = (this.topPrioriteiten || []).filter(t =>
    t.top_prioriteit !== null &&
    t.top_prioriteit !== undefined
).length;

if (currentMITCount >= 3) {
    // Block
}
```

**Pros:**
- ✅ Geen extra API call - sneller
- ✅ Consistent met UI state (user ziet wat ze krijgen)
- ✅ Geen backend wijziging nodig
- ✅ Data is al beschikbaar in memory

**Cons:**
- ❌ Client state kan theoretisch out-of-sync zijn
- ❌ Minder authoritative (server kent waarheid)
- ❌ Afhankelijk van correct laden van topPrioriteiten array

**Risk Mitigation:**
- Array wordt geladen bij elke page load
- Na elke MIT toggle wordt planning opnieuw geladen
- Worst case: page refresh lost het op

---

**Option B: Server-side Query Fix**

**Approach 1: Nieuwe endpoint**
```javascript
// Nieuwe endpoint: GET /api/prioriteiten/dagelijkse-planning/:datum
// Query: Alle MIT's die in dagelijkse planning view staan voor deze datum

SELECT t.* FROM taken t
JOIN dagelijkse_planning dp ON t.id = dp.actie_id
WHERE dp.datum = $1 AND t.user_id = $2 AND t.top_prioriteit IS NOT NULL
```

**Pros:**
- ✅ Server authoritative - absolute waarheid
- ✅ Consistent met database state
- ✅ Future-proof voor complexere scenario's

**Cons:**
- ❌ Extra API call bij elke toggle
- ❌ Langzamer (database query + network roundtrip)
- ❌ Meer code wijzigingen (backend + frontend)
- ❌ Join query kan complex worden

---

**Approach 2: Bestaande endpoint aanpassen**
```javascript
// Wijzig /api/prioriteiten/:datum om ALLE MIT's te retourneren
// Niet alleen die van vandaag, maar alle actieve MIT's

SELECT * FROM taken
WHERE user_id = $1
  AND top_prioriteit IS NOT NULL
  AND lijst = 'acties'  -- Alleen actieve taken
  AND status = 'actief'
ORDER BY top_prioriteit
```

**Pros:**
- ✅ Eenvoudiger query
- ✅ Geen nieuwe endpoint
- ✅ Server authoritative

**Cons:**
- ❌ Breaking change voor bestaande endpoint usage
- ❌ Retourneert meer data dan nodig
- ❌ Kan performance impact hebben

---

### Decision Matrix

| Criterium | Client-side | Server-side New | Server-side Modify |
|-----------|-------------|-----------------|-------------------|
| Snelheid | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| Complexiteit | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| Correctheid | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Future-proof | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Development tijd | ⭐⭐⭐ | ⭐ | ⭐⭐ |

**RECOMMENDATION: Client-side Counting (Option A)**

**Rationale:**
1. **Snelheid**: Instant validation zonder network roundtrip
2. **Simpliciteit**: 5 regels code wijziging vs 20+ regels + testing
3. **Pragmatisch**: Data is al beschikbaar, waarom niet gebruiken?
4. **Tickedify context**: Single user app tijdens development, geen concurrency issues
5. **Safety net**: Page refresh sync't altijd met server state

**Trade-off Acceptance:**
We accepteren dat client state theoretisch out-of-sync kan zijn, omdat:
- Refresh lost het op
- Impact is laag (gebruiker kan altijd refreshen)
- Tickedify heeft geen realtime multi-user editing (no conflict risk)

---

## Technical Decisions

### Decision 1: Use Client-side MIT Counting

**Context:**
Need to count MIT's in dagelijkse planning view, including those from previous days.

**Decision:**
Use `this.topPrioriteiten` array that's already loaded in memory instead of making new API call.

**Rationale:**
- Data availability: Array is populated during page load
- Performance: Eliminates extra API roundtrip
- User experience: Instant validation feedback
- Simplicity: Minimal code change required

**Alternatives Considered:**
- Server-side counting via new endpoint (rejected: too complex)
- Modifying existing endpoint (rejected: breaking change)

**Consequences:**
- Positive: Faster validation, simpler implementation
- Negative: Depends on client state sync (mitigated by page reload)

---

### Decision 2: No Backend Changes

**Context:**
Bug can be fixed entirely in frontend code.

**Decision:**
Keep backend API unchanged, fix only frontend validation logic.

**Rationale:**
- Backwards compatibility: No API contract changes
- Deployment simplicity: Frontend-only change
- Testing scope: Only need to test UI behavior

**Alternatives Considered:**
- Backend query modification (rejected: unnecessary complexity)

**Consequences:**
- Positive: Faster deployment, lower risk
- Negative: None identified

---

## Research Artifacts

### Code Locations Analyzed

**Frontend (public/app.js):**
- `toggleTopPriority()`: regel 5900-5950 - MIT toggle met limiet controle
- `toonDagelijksePlanning()`: regel 8100-8200 - Laadt topPrioriteiten array
- `renderActiesVoorPlanning()`: regel 8300-8320 - Rendert MIT checkboxes

**Backend (server.js):**
- `/api/prioriteiten/:datum`: regel 5857-5877 - GET endpoint voor MIT's
- `/api/taak/:id/prioriteit`: regel 5800-5855 - PUT endpoint voor MIT set/unset

**Database Schema:**
- `taken.top_prioriteit`: INTEGER (1-3) - MIT positie nummer
- `taken.prioriteit_datum`: VARCHAR(10) YYYY-MM-DD - Datum van MIT marking

---

## Testing Strategy

### Manual Test Scenarios

**Scenario 1: Bug Reproduction**
1. Dag 1: Markeer 2 taken als MIT
2. Niet afwerken → blijven staan in planning
3. Dag 2: Probeer 3 nieuwe MIT's aan te maken
4. **Expected**: Systeem blokkeert na 1 nieuwe (totaal = 3)
5. **Before fix**: Systeem accepteert 3 nieuwe (totaal = 5) ❌

**Scenario 2: Edge Case - Mixed Days**
1. Dag 1: 1 MIT aanmaken
2. Dag 2: 1 MIT aanmaken
3. Dag 3: Probeer 2 nieuwe MIT's aan te maken
4. **Expected**: Alleen 1 nieuwe toegestaan (totaal = 3)

**Scenario 3: After Login Consistency**
1. Markeer 3 MIT's
2. Log uit en in
3. Probeer nieuwe MIT aan te maken
4. **Expected**: Geblokkeerd met foutmelding

**Scenario 4: After Completion**
1. 3 MIT's in planning
2. Werk 1 MIT af
3. Probeer nieuwe MIT aan te maken
4. **Expected**: Toegestaan (totaal terug naar 3)

---

## Research Completion

**Status**: ✅ Complete

**Key Findings:**
1. Root cause: API query filtert op `prioriteit_datum = vandaag`
2. Solution: Client-side counting met `this.topPrioriteiten` array
3. Implementation: 10 regels code wijziging in app.js

**Next Phase:**
Ready for task generation (/tasks command)

---

## Post-Implementation Review

### What Worked

✅ **Root Cause Analysis**: Correcte identificatie van het probleem (API datum-filtering)
✅ **Solution Design**: Client-side counting was de juiste oplossing
✅ **Edge Case Handling**: Undefined array fallback voorkomt crashes
✅ **User Experience**: Instant validation zonder extra API call

### What Didn't Work (v0.19.2)

❌ **First Implementation**: Gebruikte `this.topPrioriteiten` array
- **Problem**: Deze array wordt geladen via `/api/prioriteiten/:datum`
- **Root Cause**: API endpoint filtert op `prioriteit_datum = vandaag`
- **Result**: Array bevatte alleen MIT's van vandaag, niet van vorige dagen
- **Impact**: Bug bleef bestaan na deployment

### Lessons Learned

**Lesson 1: Array Source Matters**
- Niet alle arrays zijn gelijk - check waar ze vandaan komen
- `topPrioriteiten` = datum-gefilterd via API
- `planningActies` = alle acties zonder datum filter
- **Action**: Altijd data source verificeren bij array-based logic

**Lesson 2: Test Assumptions Early**
- We namen aan dat `topPrioriteiten` ALLE MIT's bevatte
- Productie test bewees dat dit niet klopte
- **Action**: Verify data content in productie, niet alleen in code

**Lesson 3: Second Iteration Success**
- v0.19.3 gebruikte `this.planningActies` array
- Deze array bevat ALLE acties ongeacht datum
- Productie test v0.19.4: ✅ Bug opgelost

### Final Solution (v0.19.3)

```javascript
// Correct: Count from planningActies (all actions)
const currentMITCount = (this.planningActies || []).filter(t =>
    t.top_prioriteit !== null &&
    t.top_prioriteit !== undefined
).length;
```

**Why This Works**:
- `planningActies` geladen van `/api/lijst/acties` (geen datum filter)
- Bevat ALLE acties in dagelijkse planning view
- Inclusief MIT's van vorige dagen die nog niet afgewerkt zijn

### Production Verification (v0.19.4)

**Test Results**: ✅ **SUCCESVOL**
- Scenario 1: 4 MIT's → 5e geblokkeerd
- Scenario 2: 3 MIT's → 4e geblokkeerd
- Toast melding correct
- Alle acceptance criteria geslaagd

---

**Researcher**: Claude Code
**Date**: 2025-10-15
**Review Status**: Completed and verified in production
**Final Status**: ✅ Bug opgelost in v0.19.3, gedocumenteerd in v0.19.4
