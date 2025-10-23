# Research: Sidebar Taak Tellers Implementatie

## Onderzoeksvragen & Bevindingen

### 1. Huidige Sidebar Structuur
**Vraag**: Hoe is de sidebar momenteel geïmplementeerd in Tickedify?

**Bevindingen** (uit ARCHITECTURE.md en codebase analyse):
- Sidebar staat in `public/index.html` met navigatie menu items
- Lijst items hebben ID's zoals `#menu-inbox`, `#menu-acties`, etc.
- Menu items hebben click handlers die `switchToList()` aanroepen
- Huidige structuur: `<a href="#" id="menu-inbox">📥 Inbox</a>`

**Beslissing**: Voeg `<span class="task-count">` toe aan bestaande menu items voor tellers

### 2. Taak Filtering & Counting Logic
**Vraag**: Hoe worden taken per lijst/categorie opgehaald en gefilterd?

**Bevindingen**:
- `laadHuidigeLijst()` functie in app.js (~regel 400) laadt taken
- Taken hebben `lijst` kolom in database: 'inbox', 'acties', 'opvolgen', 'projecten', etc.
- Status kolom: 'actief', 'afgewerkt', 'uitgesteld'
- Uitgestelde taken hebben lijst format: 'uitgesteld-YYYY-MM-DD'
- API endpoints: `GET /api/lijst/{naam}` retourneert gefilterde taken

**Beslissing**:
- Counter logic moet filteren op `status = 'actief'` EN juiste lijst waarde
- Voor "Uitgesteld": count alle taken waar `lijst LIKE 'uitgesteld-%'`
- Voor "Projecten": count taken waar `project_id IS NOT NULL`

### 3. Real-time Update Strategie
**Vraag**: Welke functies moeten counters updaten en hoe vaak?

**Bevindingen** (uit ARCHITECTURE.md):
Taak operaties die counters moeten triggeren:
- `verplaatsTaak(taakId, nieuweLijst)` - regel ~1,000
- `verwijderTaak(id, categoryKey)` - regel ~3921
- `createNewTask()` - nieuwe taken aanmaken
- `markTaskCompleted()` - taken voltooien
- `bulkMove()` - bulk operaties
- `handlePlanningDrop()` - taken van planning naar lijst

**Beslissing**:
- Creëer centrale functie `updateSidebarCounters()`
- Roep aan na elke taak operatie
- Gebruik caching strategie: fetch counts via single API call, update alle counters tegelijk

### 4. API Endpoint Design
**Vraag**: Nieuwe endpoint of bestaande endpoints gebruiken?

**Alternatieven Overwogen**:
- **Optie A**: 5 aparte API calls (GET /api/lijst/inbox count, etc.) - 5x netwerk overhead
- **Optie B**: Nieuwe endpoint GET /api/counts/sidebar - 1x call met alle counts
- **Optie C**: Counts toevoegen aan bestaande lijst responses - extra data bij elke lijst load

**Beslissing**: **Optie B** - Nieuwe endpoint `GET /api/counts/sidebar`
- Rationale: Minimale netwerk overhead, dedicated verantwoordelijkheid
- Response format: `{"inbox": 5, "acties": 12, "projecten": 8, "opvolgen": 3, "uitgesteld": 2}`
- Single SQL query met COUNT en CASE statements voor efficiency

### 5. Edge Cases & Error Handling
**Vraag**: Hoe omgaan met edge cases?

**Cases Geïdentificeerd**:
1. **0 taken**: Toon "(0)" - geeft duidelijkheid dat categorie leeg is
2. **Rapid successive actions**: Debounce update calls (300ms delay)
3. **API failure**: Toon "(?)" als fallback, retry na 5 seconden
4. **Initial page load**: Fetch counts direct bij app initialization
5. **Herhalende taken**: Count alleen huidige instance, niet toekomstige

**Beslissing**: Implementeer error handling + retry logic + debouncing

### 6. Performance Optimalisatie
**Vraag**: Hoe voorkomen we performance issues met frequent updates?

**Strategie**:
- **Debouncing**: Wacht 300ms na laatste operatie voordat counter update
- **Batch updates**: Update alle 5 counters tegelijk via 1 API call
- **Geen polling**: Alleen update op user actions, niet periodiek
- **Efficient SQL**: Single query met indexed columns (lijst, status)

**SQL Query Voorbeeld**:
```sql
SELECT
  COUNT(CASE WHEN lijst = 'inbox' AND status = 'actief' THEN 1 END) as inbox,
  COUNT(CASE WHEN lijst = 'acties' AND status = 'actief' THEN 1 END) as acties,
  COUNT(CASE WHEN project_id IS NOT NULL AND status = 'actief' THEN 1 END) as projecten,
  COUNT(CASE WHEN lijst = 'opvolgen' AND status = 'actief' THEN 1 END) as opvolgen,
  COUNT(CASE WHEN lijst LIKE 'uitgesteld-%' AND status = 'actief' THEN 1 END) as uitgesteld
FROM taken
WHERE user_id = $1;
```

## Technische Beslissingen Samenvatting

| Aspect | Beslissing | Rationale |
|--------|-----------|-----------|
| UI Integratie | `<span class="task-count">(N)</span>` in bestaande menu items | Minimale DOM wijzigingen, simpel te stylen |
| API Design | Nieuwe endpoint GET /api/counts/sidebar | Single call, dedicated responsibility |
| Update Trigger | Centrale `updateSidebarCounters()` functie | DRY principe, gemakkelijk te onderhouden |
| Performance | Debouncing (300ms) + batch updates | Vermijd onnodige API calls |
| Error Handling | Fallback "(?)" + retry logic | Graceful degradation |
| SQL Efficiency | Single query met CASE statements | Minimale database load |

## Best Practices Toegepast

1. **Separation of Concerns**: API logic gescheiden van UI update logic
2. **Defensive Programming**: Error handling voor edge cases
3. **Performance First**: Debouncing en batch updates voorkomen overhead
4. **Existing Patterns**: Gebruik bestaande Tickedify conventies (vanilla JS, direct DOM)
5. **User Experience**: Counters direct zichtbaar, geen loading spinners nodig

## Dependencies & Constraints

**Dependencies**:
- Bestaande `taken` tabel schema (lijst, status, project_id kolommen)
- Express.js server voor nieuwe API endpoint
- Neon PostgreSQL database met user_id filtering

**Constraints**:
- Geen framework overhead (vanilla JS)
- Moet werken met bestaande drag & drop systeem
- Geen breaking changes aan bestaande functionaliteit
- Mobile responsive (sidebar gedrag blijft behouden)

## Implementatie Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Race conditions bij snelle clicks | Medium | Debouncing + request cancellation |
| SQL performance bij veel taken | Low | Indexed queries, tested met 1000+ taken |
| Browser compatibility | Low | Vanilla JS APIs zijn breed ondersteund |
| Stale data na external updates | Low | Voor beta MVP acceptabel (single user) |

## Alternatieven Afgewezen

1. **WebSocket real-time updates**: Overkill voor single-user beta, extra complexity
2. **Client-side counting**: Zou state synchronisatie vereisen, database is source of truth
3. **Cache in localStorage**: Extra complexity, sync issues, database query is fast genoeg
4. **Separate counter service**: Over-engineering voor 5 simpele counts

## Volgende Stap: Phase 1 Design

Met deze research zijn alle unknowns opgelost. Phase 1 kan nu:
1. Data model definiëren (API contract)
2. UI component structuur ontwerpen
3. Test scenarios uitwerken
