# Tickedify Architectuur Documentatie

## 📋 Overzicht
Dit document beschrijft de volledige architectuur van Tickedify om navigatie en ontwikkeling te versnellen.

**BELANGRIJK**: Dit document moet bij ELKE code wijziging worden bijgewerkt!

## 📊 Database Schema

### Hoofdtabellen
```sql
-- taken
id SERIAL PRIMARY KEY
naam TEXT NOT NULL
lijst VARCHAR(50) -- 'inbox', 'acties', 'opvolgen', 'afgewerkt', 'uitgesteld-*'
status VARCHAR(20) -- 'actief', 'afgewerkt', 'uitgesteld' 
datum VARCHAR(10) -- YYYY-MM-DD formaat
verschijndatum VARCHAR(10)
project_id INTEGER REFERENCES projecten(id)
context_id INTEGER REFERENCES contexten(id)
duur INTEGER -- minuten
opmerkingen TEXT
top_prioriteit INTEGER -- 1, 2, 3 voor top prioriteiten
prioriteit_datum VARCHAR(10)
herhaling_type VARCHAR(50) -- recurring pattern
herhaling_waarde INTEGER -- legacy field
herhaling_actief BOOLEAN DEFAULT FALSE

-- projecten
id SERIAL PRIMARY KEY
naam VARCHAR(255) NOT NULL

-- contexten  
id SERIAL PRIMARY KEY
naam VARCHAR(255) NOT NULL

-- users
id SERIAL PRIMARY KEY
username VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
email VARCHAR(255) UNIQUE
email_import_code VARCHAR(20) UNIQUE
```

## 🗂️ File Structuur & Belangrijke Locaties

### Frontend (public/)

#### app.js (10,507 regels) - Hoofdbestand
**Core Classes & Instantiatie (regels 1-300)**
- `class Taakbeheer` - Hoofdklasse voor alle functionaliteit
- `window.app = new Taakbeheer()` - Global instance (regel ~10,500)

**Lijst Management (regels 300-1,500)**
- `laadHuidigeLijst()` - regel ~400 - Laadt taken voor huidige lijst
- `renderTakenLijst(taken)` - regel ~600 - Rendert taken in UI
- `verplaatsTaak(taakId, nieuweLijst)` - regel ~1,000

**Drag & Drop Systeem (regels 1,500-2,500)**
- `initializeDragAndDrop()` - regel ~1,600
- `handleDragStart()`, `handleDragOver()`, `handleDrop()` - regels ~1,700-2,200
- `handleDropAtPosition()` - regel ~2,300 - Voor specifieke posities

**Dagelijkse Planning (regels 2,500-4,000)**
- `renderDagelijksePlanning()` - regel ~2,600 - Hoofdfunctie planning
- `handlePlanningDrop()` - regel ~3,200
- `verwijderUitPlanning()` - regel ~3,500
- `herorderPlanning()` - regel ~3,800

**Herhalende Taken (regels 4,000-5,500)**
- `toonHerhalingPopup()` - regel ~4,100 - UI voor recurring setup
- `calculateNextRecurringDate()` - regel ~4,500 - Datum berekeningen
- `createRecurringTask()` - regel ~5,000 - API call voor nieuwe recurring

**Top 3 Prioriteiten (regels 5,500-6,500)**
- `laadTopPrioriteiten()` - regel ~5,600
- `renderTopPrioriteiten()` - regel ~5,800
- `handlePriorityDrop()` - regel ~6,200

**Bulk Acties (regels 6,500-7,500)**
- `toggleBulkMode()` - regel ~6,600
- `executeBulkAction()` - regel ~7,000
- `renderBulkToolbar()` - regel ~7,300

**UI Components (regels 7,500-8,500)**
- `ToastManager` class - regel ~7,600 - Toast notifications
- `LoadingManager` class - regel ~8,000 - Loading indicators
- `showCSSDebugger()` - regel ~8,400 - CSS debug tool

**Uitgesteld Drag & Drop + Floating Panel (regels 8,500-9,000)**
- `setupUitgesteldDropZones()` - regel ~8,748 - Drop zones voor uitgesteld sectie headers
- `handleUitgesteldDrop()` - regel ~8,815 - Drop handler voor uitgesteld lijst moves
- `showFloatingDropPanel()` - regel ~8,878 - Toon floating panel bij drag start
- `hideFloatingDropPanel()` - regel ~8,892 - Verberg panel na drag end
- `setupFloatingDropZones()` - regel ~8,905 - Event handlers voor floating drop zones
- `handleFloatingDropZoneDrop()` - regel ~8,938 - Drop verwerking naar inbox/opvolgen

**Utility Functions (regels 9,000-10,507)**
- `formatDuration()` - regel ~8,600
- `parseRecurringPattern()` - regel ~9,000
- Email import functies - regels ~9,500-10,000
- Keyboard shortcuts - regels ~10,000-10,500

#### style.css (6,542 regels)
- Basic layout: regels 1-500
- Sidebar styling: regels 500-1,000
- Taken lijst styling: regels 1,000-2,000
- Dagelijkse planning: regels 2,000-3,000
- Drag & drop visual feedback: regels 3,000-3,500
- Toast notifications: regels 3,500-4,000
- Loading indicators: regels 4,000-4,500
- Responsive design: regels 4,500-5,000
- Utilities & animations: regels 5,000-6,400
- **Focus Mode**: regels 6,634-6,787 - Dagkalender fullscreen CSS overrides
- **Floating Drop Panel**: regels 6,439-6,542 - Panel styling met blur effects en animaties

### Backend

#### server.js (6,253 regels)
**Setup & Middleware (regels 1-200)**
- Express configuratie
- CORS, body-parser, static files
- Authentication middleware

**User Management (regels 200-800)**
- `/api/auth/register` - regel ~250
- `/api/auth/login` - regel ~350
- `/api/user/info` - regel ~500

**Lijst Endpoints (regels 800-2,000)**
- `GET /api/lijst/:naam` - regel ~900
- `POST /api/lijst/:naam` - regel ~1,200
- `GET /api/uitgesteld` - regel ~1,500

**Taak CRUD (regels 2,000-3,500)**
- `POST /api/taak` - regel ~2,100
- `PUT /api/taak/:id` - regel ~2,400
- `DELETE /api/taak/:id` - regel ~2,800
- `POST /api/taak/recurring` - regel ~3,200

**Planning Endpoints (regels 3,500-4,500)**
- `GET /api/dagelijkse-planning/:datum` - regel ~3,600
- `POST /api/dagelijkse-planning` - regel ~3,900
- `DELETE /api/planning/:id` - regel ~4,200

**Email Import (regels 4,500-5,000)**
- `/api/email/import` webhook - regel ~4,600
- Email parsing logic - regels ~4,700-4,900

**Debug/Admin Endpoints (regels 5,000-6,253)**
- `/api/debug/*` endpoints - regels ~5,100-5,800
- `/api/admin/*` endpoints - regels ~5,800-6,253

#### database.js (1,356 regels)
**Initialisatie (regels 1-200)**
- `initDatabase()` - regel ~50 - Schema setup
- Connection pool setup - regels ~100-150

**CRUD Operaties (regels 200-800)**
- `getTaken(lijst)` - regel ~250
- `createTaak(data)` - regel ~400
- `updateTaak(id, data)` - regel ~550
- `deleteTaak(id)` - regel ~700

**Herhalende Taken (regels 800-1,000)**
- `createRecurringTask()` - regel ~850
- `getRecurringTasks()` - regel ~950

**User Management (regels 1,000-1,356)**
- `createUser()` - regel ~1,050
- `getUserByUsername()` - regel ~1,150
- `generateUniqueImportCode()` - regel ~1,250

## 🔌 API Endpoints Overzicht

### Authenticatie
- `POST /api/auth/register` - Nieuwe gebruiker
- `POST /api/auth/login` - Inloggen
- `POST /api/auth/logout` - Uitloggen

### Lijsten
- `GET /api/lijst/:naam` - Haal taken op van lijst
- `POST /api/lijst/:naam` - Vervang hele lijst
- `GET /api/uitgesteld` - Alle uitgesteld lijsten

### Taken
- `POST /api/taak` - Nieuwe taak
- `PUT /api/taak/:id` - Update taak
- `DELETE /api/taak/:id` - Verwijder taak
- `POST /api/taak/recurring` - Maak herhalende taak
- `PUT /api/taak/:id/prioriteit` - Set top prioriteit

### Planning
- `GET /api/dagelijkse-planning/:datum` - Planning voor datum
- `POST /api/dagelijkse-planning` - Voeg toe aan planning
- `PUT /api/planning/:id/tijd` - Update tijd
- `DELETE /api/planning/:id` - Verwijder uit planning

### Import
- `POST /api/email/import` - Email webhook
- `POST /api/email/import-real` - CSV import endpoint

## 🎯 Belangrijke Features & Locaties

### Herhalende Taken Systeem
- **UI Popup**: `toonHerhalingPopup()` in app.js:4100
- **Pattern Parsing**: `parseRecurringPattern()` in app.js:9000
- **Date Calculation**: `calculateNextRecurringDate()` in app.js:4500
- **Database**: `createRecurringTask()` in database.js:850
- **API**: `/api/taak/recurring` in server.js:3200

### Top 3 Prioriteiten
- **UI Rendering**: `renderTopPrioriteiten()` in app.js:5800
- **Drag & Drop**: `handlePriorityDrop()` in app.js:6200
- **Database**: `top_prioriteit` kolom in taken tabel
- **API**: `/api/taak/:id/prioriteit` in server.js:2700

### Bulk Acties
- **Toggle**: `toggleBulkMode()` in app.js:6600
- **Execute**: `executeBulkAction()` in app.js:7000
- **UI**: `renderBulkToolbar()` in app.js:7300

### Email Import
- **Webhook**: `/api/email/import` in server.js:4600
- **Parsing**: Email body parsing in server.js:4700
- **UI**: Import email in header, app.js:9500

### Floating Drop Panel (Uitgesteld Drag & Drop)
- **Show/Hide**: `showFloatingDropPanel()`, `hideFloatingDropPanel()` in app.js:8878-8903
- **Setup**: `setupFloatingDropZones()` in app.js:8905-8936
- **Drop Handler**: `handleFloatingDropZoneDrop()` in app.js:8938-8983
- **HTML**: Floating panel HTML in index.html:683-699
- **CSS**: Panel styling met blur effects in style.css:6439-6542
- **Positioning**: top: 80px rechts, smooth slide-in animaties

### Scroll Indicators (Uitgesteld Lijsten)
- **Setup**: `setupIntelligentScrollIndicators()` in app.js:~9000-9200
- **Detection**: ResizeObserver en scroll event handlers
- **Positioning**: position:fixed met getBoundingClientRect()
- **Styling**: CSS gradients met ▲▼ arrow symbols
- **Smart Display**: Alleen zichtbaar wanneer scrollen mogelijk is

## 🚀 Development Workflow

### Bij nieuwe feature:
1. Check deze ARCHITECTURE.md voor bestaande patterns
2. Zoek relevante sectie in de juiste file
3. Implementeer volgens bestaande conventies
4. **UPDATE DIT DOCUMENT** met nieuwe locaties

### Bij bugfix:
1. Gebruik dit document om snel de bug locatie te vinden
2. Check gerelateerde functies in dezelfde sectie
3. Test impact op connected features
4. **UPDATE DIT DOCUMENT** als structuur wijzigt

## 📱 UI Componenten

### Toast Notifications
- **Class**: `ToastManager` in app.js:7600
- **Usage**: `toast.success()`, `toast.error()`, etc.
- **Styling**: style.css:3500-4000

### Loading Indicators
- **Class**: `LoadingManager` in app.js:8000
- **Global**: `loading.showGlobal()`
- **Button**: `loading.withLoading()`
- **Styling**: style.css:4000-4500

### Modals & Popups
- **Herhalingen**: `toonHerhalingPopup()` in app.js:4100
- **Planning**: Planning popup in index.html
- **Event datum**: Event popup voor recurring taken

### Focus Mode (Dagelijkse Planning)
- **Toggle**: `toggleDagkalenderFocus()` in app.js:~4500
- **Enter/Exit**: `enterFocusMode()`, `exitFocusMode()` in app.js:~4600-4700
- **Restore**: `restoreFocusMode()` in app.js:~4800 - localStorage persistence
- **Keyboard**: F11 toggle, ESC exit shortcuts
- **CSS**: `.dag-kalender-fullscreen` styling in style.css:6634-6787
- **Properties**: Position:fixed, z-index:9999, agressieve layout overrides

## 🔧 Utility Locaties

### Date Helpers
- `formatDuration()` - app.js:8600
- `calculateNextRecurringDate()` - app.js:4500
- Date parsing utilities - app.js:8700-8900

### Drag & Drop Helpers
- `createDragImage()` - app.js:1800
- `getDragData()` - app.js:1900
- Visual feedback - style.css:3000-3500
- **Floating Panel**: app.js:8878-8983 + style.css:6439-6542

### Scroll & Visibility Helpers
- `setupIntelligentScrollIndicators()` - app.js:~9000-9200
- Position:fixed scroll indicators voor uitgesteld lijsten
- ResizeObserver voor content detection

### API Helpers
- Fetch wrappers - app.js:500-600
- Error handling - throughout app.js
- Loading integration - via LoadingManager

## 🚨 Troubleshooting & Known Issues

### Focus Mode Troubleshooting
**Probleem**: Focus mode bedekt niet volledig het scherm
- **Oplossing**: Check z-index:9999 en background-color fallback in style.css:6634-6687
- **CSS**: `.dag-kalender-fullscreen` positioning moet position:fixed zijn

**Probleem**: Taken niet correct gepositioneerd per uur
- **Oplossing**: Forceer position:relative voor alle child elements
- **CSS**: `.dag-kalender-fullscreen .kalender-uur` overrides in style.css:6679-6686

**Probleem**: Uur blokken groeien niet mee met inhoud
- **Oplossing**: Gebruik height:auto + max-height:none + flex-shrink:0
- **CSS**: Agressieve overrides in style.css:6688-6703

### Recurring Tasks Issues
**Probleem**: Herhalende taken verdwijnen bij PUT requests
- **Oplossing**: Check database.js updateTask() query parameter mapping
- **Debug**: Gebruik forensic logging of recovery tools

### Drag & Drop Issues
**Probleem**: Wereldbol cursor tijdens slepen
- **Oplossung**: Custom drag image in createDragImage() app.js:1800
- **Visual**: Transparante taak + 📋 emoji cursor

---

**LAATSTE UPDATE**: Juli 18, 2025 - Focus Mode fixes gedocumenteerd
**BELANGRIJKSTE UPDATES**:
- Juli 18: Focus Mode - Volledige CSS overrides voor perfect fullscreen gedrag
- Juli 13: Scroll Indicators - Intelligente scroll feedback voor uitgesteld lijsten
- Juli 13: Floating Drop Panel - Moderne drag & drop interface 
**BELANGRIJK**: Update dit document bij ELKE wijziging aan de codebase structuur!