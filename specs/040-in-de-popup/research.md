# Research: Alfabetische Sortering van Contexten

**Feature**: 040-in-de-popup
**Date**: 2025-10-30
**Status**: Complete

## Research Questions

### 1. PostgreSQL Alfabetische Sortering voor Nederlandse Tekst

**Question**: Hoe implementeren we case-insensitive alfabetische sortering met Nederlandse locale ondersteuning?

**Decision**: Gebruik `ORDER BY LOWER(naam) ASC` in PostgreSQL query

**Rationale**:
- `LOWER(naam)` converteert alle tekst naar lowercase voor case-insensitive sortering
- PostgreSQL's standaard collation ondersteunt Nederlandse karakters (é, ë, ï, etc.)
- Efficiënt - geen extra functies of indexes nodig voor kleine datasets
- Compatibel met Neon PostgreSQL service (cloud-based)

**Alternatives Considered**:
1. **Client-side sortering** met `localeCompare('nl')`
   - ❌ Extra latency, meer code, minder efficiënt bij grote datasets
   - ✅ Wel nuttig als fallback voor edge cases
2. **PostgreSQL COLLATE** operator (bijv. `ORDER BY naam COLLATE "nl_NL"`)
   - ❌ Vereist database locale configuratie die mogelijk niet beschikbaar is in Neon
   - ❌ Meer complex zonder duidelijk voordeel voor deze use case
3. **Database index op naam kolom**
   - ❌ Overkill voor kleine contexten lijst (typisch <20 items per gebruiker)
   - ❌ Extra overhead bij inserts/updates

**Implementation**:
```sql
-- Current query (database.js:584)
SELECT * FROM contexten WHERE user_id = $1 ORDER BY aangemaakt DESC

-- New query
SELECT * FROM contexten WHERE user_id = $1 ORDER BY LOWER(naam) ASC
```

---

### 2. Edge Cases voor Sortering

**Question**: Hoe handelen we edge cases zoals cijfers, speciale tekens, lege strings?

**Decision**: Vertrouw op PostgreSQL's standaard sortering + client-side validatie

**Rationale**:
- PostgreSQL sorteert cijfers voor letters (0-9, A-Z)
- Speciale tekens worden gesorteerd volgens ASCII waarde
- Lege strings komen eerst (voor niet-lege strings)
- Database validatie voorkomt NULL waarden (naam is required)

**Edge Case Handling**:
| Edge Case | PostgreSQL Gedrag | Actie Vereist |
|-----------|-------------------|---------------|
| "123 Project" vs "Admin" | Cijfers eerst | ✅ Acceptabel |
| "Café" vs "Context" | Accenten correct | ✅ Werkt out-of-box |
| Lege string "" | Eerst in lijst | ✅ Prevented by validation |
| NULL waarde | Error/skip | ✅ Database constraint |
| "admin" vs "Admin" | Beide gelijk (LOWER) | ✅ Case-insensitive werkt |

**Alternatives Considered**:
1. **Custom collation rules** voor speciale tekens
   - ❌ Te complex voor marginale use cases
2. **Client-side post-processing** van sortering
   - ❌ Dupliceert database logica, inconsistent

---

### 3. Client-side Fallback Strategie

**Question**: Moeten we client-side sortering toevoegen als backup?

**Decision**: JA - Toevoegen als defensive programming practice

**Rationale**:
- Database sortering is primary en betrouwbaar
- Client-side fallback voorkomt edge cases bij API caching of stale data
- Minimale overhead (max 20-30 items, instant sortering)
- Consistent met bestaande `updateContextSelects()` pattern

**Implementation**:
```javascript
// In vulContextSelect() (app.js:4356-4367)
vulContextSelect() {
    const select = document.getElementById('contextSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecteer context...</option>';

    // Client-side fallback sortering
    const gesorteerdeContexten = [...this.contexten].sort((a, b) =>
        a.naam.toLowerCase().localeCompare(b.naam.toLowerCase(), 'nl')
    );

    gesorteerdeContexten.forEach(context => {
        const option = document.createElement('option');
        option.value = context.id;
        option.textContent = context.naam;
        select.appendChild(option);
    });
}
```

**Benefits**:
- Werkt ook als database query niet gewijzigd is (backward compatibility)
- Locale-aware sortering met `localeCompare('nl')`
- Geen performance impact (array.sort is O(n log n) voor max 30 items = instant)

---

### 4. Testing Strategie

**Question**: Hoe testen we alfabetische sortering effectief?

**Decision**: Multi-layered testing approach

**Test Scenarios**:

#### 4.1 Database Level Test
```sql
-- Test query direct in database
SELECT naam FROM contexten WHERE user_id = 1 ORDER BY LOWER(naam) ASC;

-- Expected output (alphabetisch):
-- Administratie
-- Hobby
-- Thuis
-- Werk
```

#### 4.2 API Level Test
```bash
# Staging environment
curl -s -L -k https://dev.tickedify.com/api/lijst/contexten | jq '.[].naam'

# Verify output is alphabetically sorted
```

#### 4.3 Browser UI Test (Manual)
1. Open taak-aanpas popup
2. Klik op context dropdown
3. Visual verification: contexten zijn alfabetisch
4. Test edge cases:
   - Context met hoofdletter vs kleine letter
   - Context met accent (bijv. "Café")
   - Context met cijfer (bijv. "2024 Projecten")

#### 4.4 Playwright Automated Test (Optioneel)
```javascript
// Test in tickedify-testing agent
test('Context dropdown is alfabetisch gesorteerd', async ({ page }) => {
    await page.goto('https://dev.tickedify.com/app');
    await page.click('[data-test="nieuwe-taak-btn"]');
    await page.click('#contextSelect');

    const options = await page.$$eval('#contextSelect option', opts =>
        opts.slice(1).map(o => o.textContent)
    );

    const sorted = [...options].sort((a, b) => a.localeCompare(b, 'nl'));
    expect(options).toEqual(sorted);
});
```

**Test Checklist**:
- [ ] Database query returned alfabetisch gesorteerde resultaten
- [ ] API endpoint returned gesorteerde JSON array
- [ ] UI dropdown toont contexten alfabetisch
- [ ] Case-insensitive sortering werkt (admin = Admin)
- [ ] Nederlandse accenten correct gesorteerd
- [ ] Edge case: cijfers komen voor letters
- [ ] Consistency: sortering gelijk in nieuwe taak vs bewerk taak popups

---

## Implementation Confidence

| Aspect | Confidence | Risk |
|--------|-----------|------|
| Database query wijziging | 🟢 HOOG | Laag - eenvoudige SQL aanpassing |
| Client-side fallback | 🟢 HOOG | Laag - standaard JavaScript patterns |
| Nederlandse locale | 🟡 MEDIUM | Medium - afhankelijk van Neon PostgreSQL config |
| Edge cases | 🟢 HOOG | Laag - PostgreSQL handles meeste cases goed |
| Testing | 🟢 HOOG | Laag - visueel te verifiëren in browser |

---

## Next Steps (Phase 1)

1. ✅ Research complete - geen NEEDS CLARIFICATION meer
2. → Create data-model.md (minimal - bestaande contexten tabel)
3. → Create contracts/api.md (GET /api/lijst/contexten response contract)
4. → Create quickstart.md (test scenario's)
5. → Update CLAUDE.md met feature context

**Ready for Phase 1**: ✅ YES
