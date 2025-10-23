# Quickstart: Sidebar Taak Tellers Testing

## Doel
Verifieer dat taak tellers correct worden weergegeven en bijgewerkt in de sidebar voor alle 5 categorieën.

## Prerequisites
- Tickedify draait lokaal of op staging (dev.tickedify.com)
- Ingelogd als testgebruiker
- Browser console open voor debugging

## Test Scenario 1: Initial Display (FR-001, FR-009)

### Stappen
1. Open Tickedify in browser
2. Login met test credentials
3. Wacht tot app volledig geladen is
4. Bekijk sidebar menu items

### Verwacht Resultaat
- ✅ Inbox toont "(N)" waar N = aantal inbox taken
- ✅ Acties toont "(N)" waar N = aantal acties taken
- ✅ Projecten toont "(N)" waar N = aantal project taken
- ✅ Opvolgen toont "(N)" waar N = aantal opvolgen taken
- ✅ Uitgesteld toont "(N)" waar N = aantal uitgestelde taken
- ✅ Andere menu items (Dagelijkse Planning, Wachten Op, etc.) hebben GEEN tellers
- ✅ Counters zijn zichtbaar binnen 1 seconde na page load

### Debug Check
```javascript
// In browser console
console.log('Sidebar counts:', {
  inbox: document.querySelector('#menu-inbox .task-count')?.textContent,
  acties: document.querySelector('#menu-acties .task-count')?.textContent,
  projecten: document.querySelector('#menu-projecten .task-count')?.textContent,
  opvolgen: document.querySelector('#menu-opvolgen .task-count')?.textContent,
  uitgesteld: document.querySelector('#menu-uitgesteld .task-count')?.textContent
});
```

## Test Scenario 2: Create Task Counter Update (FR-004, FR-005)

### Stappen
1. Noteer huidige Inbox counter (bijv. "(12)")
2. Klik op "Inbox" in sidebar om naar inbox te gaan
3. Maak nieuwe taak aan met "+" knop
4. Vul taak naam in en klik "Opslaan"
5. Bekijk sidebar counter

### Verwacht Resultaat
- ✅ Inbox counter is verhoogd met 1 (nu "(13)")
- ✅ Update gebeurt binnen 1 seconde na taak aanmaken
- ✅ Andere counters blijven ongewijzigd

### Debug Check
```javascript
// Voor create
const beforeCount = parseInt(document.querySelector('#menu-inbox .task-count').textContent.match(/\d+/)[0]);

// Na create (wacht 1 seconde)
setTimeout(() => {
  const afterCount = parseInt(document.querySelector('#menu-inbox .task-count').textContent.match(/\d+/)[0]);
  console.log('Count increased:', afterCount === beforeCount + 1);
}, 1000);
```

## Test Scenario 3: Move Task Between Lists (FR-007)

### Stappen
1. Noteer Inbox counter (bijv. "(13)") en Acties counter (bijv. "(8)")
2. Ga naar Inbox lijst
3. Sleep een taak naar "Acties" lijst (drag & drop OF gebruik move knop)
4. Bekijk beide counters in sidebar

### Verwacht Resultaat
- ✅ Inbox counter gedaald met 1 (nu "(12)")
- ✅ Acties counter gestegen met 1 (nu "(9)")
- ✅ Update gebeurt binnen 1 seconde na move operatie
- ✅ Andere counters (Projecten, Opvolgen, Uitgesteld) blijven ongewijzigd

## Test Scenario 4: Complete Task (FR-005, FR-010)

### Stappen
1. Noteer Acties counter (bijv. "(9)")
2. Ga naar Acties lijst
3. Markeer een taak als voltooid (checkbox OF complete button)
4. Bekijk Acties counter in sidebar

### Verwacht Resultaat
- ✅ Acties counter gedaald met 1 (nu "(8)")
- ✅ Voltooide taak verdwijnt uit lijst
- ✅ Counter update gebeurt binnen 1 seconde
- ✅ Voltooide taken worden NIET meer meegeteld in counters

### Verificatie
```javascript
// Check dat voltooide taken niet tellen
fetch('/api/counts/sidebar')
  .then(r => r.json())
  .then(counts => {
    console.log('API counts:', counts);
    // Vergelijk met aantal zichtbare taken in elke lijst
  });
```

## Test Scenario 5: Delete Task (FR-004, FR-005)

### Stappen
1. Noteer Projecten counter (bijv. "(15)")
2. Ga naar Projecten lijst
3. Verwijder een project taak (trash icon OF delete button)
4. Bevestig verwijdering
5. Bekijk Projecten counter

### Verwacht Resultaat
- ✅ Projecten counter gedaald met 1 (nu "(14)")
- ✅ Update gebeurt binnen 1 seconde na verwijdering
- ✅ Taak is permanent verwijderd uit database

## Test Scenario 6: Bulk Operations (FR-008)

### Stappen
1. Noteer Inbox counter (bijv. "(12)") en Acties counter (bijv. "(8)")
2. Ga naar Inbox
3. Selecteer 5 taken (checkbox selectie)
4. Gebruik bulk actie "Verplaats naar Acties"
5. Bekijk beide counters

### Verwacht Resultaat
- ✅ Inbox counter gedaald met 5 (nu "(7)")
- ✅ Acties counter gestegen met 5 (nu "(13)")
- ✅ Update gebeurt binnen 1 seconde na bulk operatie
- ✅ Alle 5 taken zijn verplaatst

## Test Scenario 7: Zero Tasks Edge Case

### Stappen
1. Maak een lege categorie (verwijder of verplaats alle taken uit bijv. Opvolgen)
2. Bekijk Opvolgen counter

### Verwacht Resultaat
- ✅ Opvolgen toont "(0)" - NIET leeg of verborgen
- ✅ Zero counter is duidelijk zichtbaar
- ✅ Clicking op "Opvolgen" toont lege lijst met "Geen taken" message

## Test Scenario 8: Rapid Actions (Performance)

### Stappen
1. Maak snel 5 taken achter elkaar aan in Inbox (binnen 2 seconden)
2. Bekijk Inbox counter

### Verwacht Resultaat
- ✅ Counter toont correcte eindwaarde (verhoogd met 5)
- ✅ Geen "flashing" of inconsistente intermediate values
- ✅ Debouncing voorkomt 5 aparte API calls (check Network tab)

### Debug Check
```javascript
// In Network tab: filter op "counts/sidebar"
// Verwacht: 1 API call ongeveer 300ms na laatste actie
```

## Test Scenario 9: API Error Handling

### Stappen (Developer Test)
1. Simuleer API failure:
   ```javascript
   // In console, override fetch
   const originalFetch = window.fetch;
   window.fetch = (url, ...args) => {
     if (url.includes('/api/counts/sidebar')) {
       return Promise.reject(new Error('Simulated API failure'));
     }
     return originalFetch(url, ...args);
   };
   ```
2. Trigger een counter update (create taak)
3. Bekijk counters

### Verwacht Resultaat
- ✅ Counters tonen "(?) " als fallback
- ✅ Console toont error message
- ✅ App blijft functioneel (geen crash)
- ✅ Na 5 seconden retry attempt (check Network tab)

### Cleanup
```javascript
window.fetch = originalFetch; // Restore normal fetch
```

## Test Scenario 10: Cross-Browser Verification

### Browsers
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS/iOS)

### Stappen
Herhaal Scenario 1-3 in elke browser

### Verwacht Resultaat
- ✅ Counters renderen correct in alle browsers
- ✅ Updates werken consistent across browsers
- ✅ Geen styling issues (counter alignment/spacing)

## Success Criteria Checklist

- [ ] Alle 5 counters tonen bij page load (Scenario 1)
- [ ] Create task incrementeert counter (Scenario 2)
- [ ] Move task update beide counters (Scenario 3)
- [ ] Complete task decrementeert counter (Scenario 4)
- [ ] Delete task decrementeert counter (Scenario 5)
- [ ] Bulk operations update correct (Scenario 6)
- [ ] Zero tasks toont "(0)" (Scenario 7)
- [ ] Performance: debouncing werkt (Scenario 8)
- [ ] Error handling: fallback "(?) " (Scenario 9)
- [ ] Cross-browser compatibility (Scenario 10)

## Regression Testing

Na implementatie, verifieer dat bestaande features nog werken:
- [ ] Drag & drop tussen lijsten werkt nog
- [ ] Dagelijkse planning werkt nog
- [ ] Filter functionaliteit werkt nog
- [ ] Zoeken werkt nog
- [ ] Bulk acties werken nog
- [ ] Mobile responsive layout niet broken

## Performance Benchmarks

Target metrics (meet via browser DevTools):
- **Page Load**: Counters zichtbaar < 1 seconde
- **Update Latency**: Counter update < 500ms na actie
- **API Response**: GET /api/counts/sidebar < 200ms
- **Debounce Delay**: 300ms tussen laatste actie en API call

### Measurement
```javascript
// Performance timing
performance.mark('counter-update-start');
// ... trigger update ...
performance.mark('counter-update-end');
performance.measure('counter-update', 'counter-update-start', 'counter-update-end');
console.log(performance.getEntriesByName('counter-update')[0].duration);
```

## Troubleshooting

### Counter toont "(?) "
- Check browser console voor errors
- Verify API endpoint is deployed: `curl https://tickedify.com/api/counts/sidebar`
- Check session authentication (cookie aanwezig?)

### Counter update niet na actie
- Check dat `updateSidebarCounters()` wordt aangeroepen (console.log)
- Verify debounce timer (wacht 300ms)
- Check Network tab voor failed API calls

### Incorrect count
- Verify SQL query in backend (status = 'actief' filter)
- Check dat completed tasks status='afgewerkt' hebben
- Run manual count: `SELECT lijst, COUNT(*) FROM taken WHERE status='actief' GROUP BY lijst`

## Done!
Als alle scenario's slagen, is de feature compleet en productie-ready.
