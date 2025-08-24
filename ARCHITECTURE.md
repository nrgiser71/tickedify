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

-- subtaken (Hierarchische taak structuur)
id SERIAL PRIMARY KEY
parent_taak_id VARCHAR(50) NOT NULL REFERENCES taken(id) ON DELETE CASCADE
titel VARCHAR(500) NOT NULL
voltooid BOOLEAN DEFAULT FALSE
volgorde INTEGER DEFAULT 0
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- users
id SERIAL PRIMARY KEY
username VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
email VARCHAR(255) UNIQUE
email_import_code VARCHAR(20) UNIQUE

-- feedback (Beta feedback systeem)
id VARCHAR(50) PRIMARY KEY
user_id VARCHAR(50) REFERENCES users(id)
type VARCHAR(20) CHECK (type IN ('bug', 'feature'))
titel VARCHAR(255) NOT NULL
beschrijving TEXT NOT NULL
stappen TEXT
status VARCHAR(20) DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'bekeken', 'in_behandeling', 'opgelost'))
prioriteit VARCHAR(20) DEFAULT 'normaal'
context JSONB -- browser, scherm, pagina info
aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
bijgewerkt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
- `initPlanningResizer()` - regel ~5,944 - Touch/mouse resize functionaliteit

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

**Feedback Systeem (regels 11,200-11,400)**
- `FeedbackManager` class - regel ~11,247 - Feedback modal beheer
- `openFeedbackModal()` - regel ~11,270 - Open bug/feature modal
- `submitFeedback()` - regel ~11,327 - Verzend feedback naar server
- `collectContextInfo()` - regel ~11,296 - Verzamel browser/scherm info

**Context Menu & Highlighting System (regels 3,700-3,800)**
- `addContextMenuToTaskItems()` - regel ~3,687 - Voegt right-click listeners toe aan alle taak items
- `handleTaskContextMenu()` - regel ~3,707 - Verwerkt right-click events en prepareert taak highlighting
- `highlightTaskForContextMenu()` - regel ~3,742 - Creëert scherpe clone van taak boven blur overlay
- `removeContextMenuHighlight()` - regel ~3,785 - Cleanup van highlighted clones en reset opacity
- `toonActiesMenu()` - regel ~3,543 - Extended met sourceElement support voor consistente UX

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
- **Context Menu Highlighting**: regels 1,428-1,452 - `.context-menu-highlighted` met glow animatie
- **Acties Menu Overlay**: regels 1,290-1,305 - Blur overlay styling voor menu achtergrond

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

**Feedback Endpoints (regels 1,950-2,150)**
- `POST /api/feedback` - regel ~1,950 - Nieuwe feedback indienen
- `GET /api/feedback` - regel ~2,050 - Gebruiker's eigen feedback ophalen
- `PUT /api/feedback/:id/status` - regel ~2,150 - Status update (admin only)

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

### Subtaken (Hierarchische Structuur)
- `GET /api/subtaken/:parentId` - Haal alle subtaken van parent taak op
- `POST /api/subtaken` - Nieuwe subtaak aanmaken
- `PUT /api/subtaken/:id` - Update subtaak (titel, voltooid, volgorde)
- `DELETE /api/subtaken/:id` - Verwijder subtaak
- `POST /api/subtaken/:parentId/reorder` - Herorden subtaken binnen parent

### Planning
- `GET /api/dagelijkse-planning/:datum` - Planning voor datum
- `POST /api/dagelijkse-planning` - Voeg toe aan planning
- `PUT /api/planning/:id/tijd` - Update tijd
- `DELETE /api/planning/:id` - Verwijder uit planning

### Import
- `POST /api/email/import` - Email webhook (mg.tickedify.com subdomein)
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

### Subtaken Systeem (Hierarchische Taken)
- **SubtakenManager Class**: Volledige CRUD management in app.js:~1000
- **Planning Popup UI**: Subtaken sectie in `planTaak()` en `bewerkActie()` functies
- **Dagelijkse Planning**: `renderPlanningSubtaken()` in app.js:7625
- **Local Storage**: Intelligent systeem voor inbox taken in SubtakenManager
- **Cache Management**: `subtakenCache` Map voor performance
- **Database Functions**: Complete CRUD in database.js:~500
- **API Endpoints**: 5 endpoints voor subtaken management in server.js:~1800

### Bulk Acties
- **Toggle**: `toggleBulkMode()` in app.js:6600
- **Execute**: `executeBulkAction()` in app.js:7000
- **UI**: `renderBulkToolbar()` in app.js:7300

### Email Import (Mailgun Subdomein Architectuur)
- **Domain Setup**: mg.tickedify.com subdomein voor Mailgun routing
- **Webhook**: `/api/email/import` in server.js:4600 (unchanged endpoint)
- **Email Format**: import+code@mg.tickedify.com (was @tickedify.com)
- **Route Filter**: match_recipient("^import\\+(.*)@mg.tickedify.com$")
- **Parsing**: Email body parsing in server.js:4700
- **UI**: Import email in header shows @mg.tickedify.com, app.js:9500
- **DNS**: MX/TXT/CNAME records op mg.tickedify.com subdomein
- **Benefit**: Hoofddomein tickedify.com vrij voor normale email (hello@, support@)

### Floating Drop Panel (Uitgesteld Drag & Drop)
- **Show/Hide**: `showFloatingDropPanel()`, `hideFloatingDropPanel()` in app.js:8878-8903
- **Setup**: `setupFloatingDropZones()` in app.js:8905-8936
- **Drop Handler**: `handleFloatingDropZoneDrop()` in app.js:8938-8983
- **HTML**: Floating panel HTML in index.html:683-699
- **CSS**: Panel styling met blur effects in style.css:6439-6542
- **Positioning**: top: 80px rechts, smooth slide-in animaties

### Beta Feedback Systeem (v0.11.93) ✅
- **Frontend Manager**: `FeedbackManager` class in app.js:11247-11400
- **Sidebar Buttons**: Bug Melden & Feature Request in index.html sidebar
- **Modal Forms**: Feedback modals in index.html:697-724 (perfect gecentreerd, beide buttons zichtbaar)
- **CSS Styling**: Feedback modal styling in style.css:7358-7478 (gekopieerd van confirmModal)
- **API Endpoints**: 
  - `POST /api/feedback` - Nieuwe feedback
  - `GET /api/feedback` - Gebruiker feedback
  - Admin endpoints in server.js:5348-5462
- **Admin Dashboard**: 
  - Feedback stats card in admin.html:388-395
  - Feedback tabel in admin.html:465-473
  - Detail modal in admin.html:477-525
  - Management functies in admin.js:248-306, 468-562
- **Database**: `feedback` tabel met JSONB context veld
- **UI/UX Status**: Production-ready - Modal centrering en button layout volledig gefixed

### Scroll Indicators (Uitgesteld Lijsten)
- **Setup**: `setupIntelligentScrollIndicators()` in app.js:~9000-9200
- **Detection**: ResizeObserver en scroll event handlers
- **Positioning**: position:fixed met getBoundingClientRect()
- **Styling**: CSS gradients met ▲▼ arrow symbols
- **Smart Display**: Alleen zichtbaar wanneer scrollen mogelijk is

### Highlighted Context Menu System
**Complete implementation voor visueel aantrekkelijke context menus met task highlighting**

**Core Functionaliteit:**
- **Feature Flag**: `this.ENABLE_HIGHLIGHTED_CONTEXT_MENU = true` in constructor
- **Right-Click Setup**: `addContextMenuToTaskItems()` in app.js:3687 - Voegt contextmenu event listeners toe
- **Event Handler**: `handleTaskContextMenu()` in app.js:3707 - Verwerkt right-click events
- **Menu Function**: `toonActiesMenu(taakId, menuType, huidigeLijst, position, sourceElement)` - Extended signature
- **Highlighting Logic**: `highlightTaskForContextMenu(taakItem, menuOverlay)` in app.js:3742
- **Cleanup**: `removeContextMenuHighlight()` in app.js:3785 - Volledige cleanup van DOM en styles

**Highlighting Mechanisme:**
- **DOM Cloning**: `taakItem.cloneNode(true)` voor exacte kopie van originele taak
- **Positioning Strategy**: `getBoundingClientRect()` voor pixel-perfect clone positionering
- **Opacity Control**: Originele taak wordt 0.1 opacity, clone blijft 1.0 (volledig zichtbaar)
- **DOM Architecture**: Clone wordt toegevoegd aan menu overlay container (kritiek voor z-index)
- **CSS Classes**: `.context-menu-highlighted` met glow animation en enhanced styling

**Z-Index Hiërarchie:**
- Menu overlay backdrop: z-index 2000 (blur effect)
- Highlighted clone: z-index 1 (boven blur, onder menu)
- Menu content: z-index 2 (bovenop alles)
- **Waarom Dit Werkt**: Clone in overlay container voorkomt stacking context conflicts

**Consistent UX Implementation:**
- **Right-Click**: Direct taak highlighting via `handleTaskContextMenu()`
- **Button Clicks**: Source detection via `sourceElement.closest('.taak-item')`
- **Button Integration**: Alle HTML onclick calls uitgebreid: `onclick="app.toonActiesMenu(..., this)"`
- **Unified Experience**: Identieke highlighting voor beide interaction methods

**Menu Structuur (4 Logische Groepen):**
1. **Plan op**: Vandaag, Morgen (alleen voor acties lijst)
2. **Verplaats naar uitgesteld**: Wekelijks, Maandelijks, 3-maandelijks, etc.
3. **Verplaats naar Opvolgen**: Enkele optie met eigen groep
4. **Acties**: Verwijder taak (rood gemarkeerd)

**Cleanup & Memory Management:**
- Automatische cleanup bij menu sluiten (overlay click, ESC, menu actions)
- DOM element removal van highlighted clones
- Opacity reset van originele taken
- Pointer events cleanup

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

### Expandable Planning Items (Dag-Kalender)
- **HTML Generation**: `renderPlanningItem()` in app.js:7412+ - Genereerd expandable HTML voor geplande taken
- **Toggle Function**: `togglePlanningItemExpand()` in app.js:8442+ - Expand/collapse functionaliteit
- **Click Handler**: Inline onclick in planning item header met event.stopPropagation()
- **CSS Classes**: `.expandable`, `.expanded`, `.planning-item-details` in style.css:3300-3330
- **Animation**: slideDown animatie en chevron rotatie (▶ → ▼)
- **Content**: Project, context, datum, duur, clickable URLs in opmerkingen
- **Integration**: Werkt naast drag & drop zonder conflicten (v0.11.99 fix)

### Tablet Resize Functionaliteit (Dagelijkse Planning)
- **Main Function**: `initPlanningResizer()` in app.js:5944-6056 - Complete touch/mouse resize setup
- **HTML Structure**: `.planning-splitter` + `.splitter-handle` in dagelijkse planning layout
- **Event Handlers**: Touch (touchstart/touchmove/touchend) + Mouse (mousedown/mousemove/mouseup)
- **Touch Improvements**: Verbeterde coordinate extractie `e.touches[0].clientX` voor tablets
- **CSS Styling**: `.planning-splitter` basic styling (8px width desktop) in style.css:2792-2828
- **Tablet CSS**: Touch-friendly media query styling in style.css:2830-2884
  - **Width**: 20px breed op tablets voor betere touch targets
  - **Grip Pattern**: 3-dots radial-gradient indicator met CSS pseudo-elements
  - **Media Query**: `@media (min-width: 769px) and (max-width: 1400px) and (pointer: coarse)`
  - **Hover States**: macOS blue theming voor active/hover feedback
- **LocalStorage**: Planning sidebar width persistence met validatie (20%-80%)
- **Haptic Feedback**: iOS vibrate support bij touch start (navigator.vibrate)
- **Flex Order Fix**: Correcte volgorde sidebar(1) → splitter(2) → calendar(3) op tablets

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

### Context Menu & Highlighting Helpers
- `addContextMenuToTaskItems()` - app.js:3687 - Attach right-click listeners
- `handleTaskContextMenu()` - app.js:3707 - Process context menu events
- `highlightTaskForContextMenu()` - app.js:3742 - DOM cloning en positioning
- `removeContextMenuHighlight()` - app.js:3785 - Cleanup highlighted elements
- **Feature Toggle**: `this.ENABLE_HIGHLIGHTED_CONTEXT_MENU` boolean flag

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

### Highlighted Context Menu Issues
**KRITIEK ARCHITECTUUR PROBLEEM**: DOM Stacking Context Conflicts
- **Symptoom**: Menu bedekt highlighted taak of taak wordt wazig tijdens menu display
- **Root Cause**: Clone en menu in verschillende DOM containers creëren stacking context conflicts
- **Foutieve Approach**: Clone toevoegen aan `document.body` terwijl menu in eigen overlay zit
- **Correcte Oplossing**: Clone toevoegen aan `menuOverlay` container voor unified DOM hierarchy
- **Code Fix**: `highlightTaskForContextMenu(taakItem, menuOverlay)` - menuOverlay parameter is kritiek
- **DOM Structure**: menu overlay → highlighted clone (z-1) → menu content (z-2)

**Z-INDEX CIRCULAR CONFLICTS**: Menu vs Clone Layering
- **Probleem**: Verhogen clone z-index maakt menu onklikbaar, verlagen maakt clone wazig
- **Diagnose**: User feedback "in cirkels lopen" - elke fix brak andere aspect
- **Oplossing**: Fixed z-index hierarchy binnen single container i.p.v. cross-container stacking
- **Lesson Learned**: DOM hierarchy belangrijker dan z-index values voor stacking

**BUTTON CLICK INTEGRATION**: Source Element Detection
- **Probleem**: Highlighted effect werkte alleen voor right-click, niet voor 3-puntjes buttons
- **User Request**: "Kunnen we dit ook toepassen als ze op de knop met de 3 puntjes klikken?"
- **Oplossing**: Extended `toonActiesMenu()` signature met `sourceElement` parameter
- **Implementation**: `sourceElement.closest('.taak-item')` vindt parent taak element
- **HTML Changes**: Alle button onclick calls: `onclick="app.toonActiesMenu(..., this)"`

**CLEANUP & MEMORY MANAGEMENT**: DOM Leak Prevention  
- **Probleem**: Highlighted clones blijven hangen na menu interactions
- **Risk**: Memory leaks en visual artifacts bij herhaald gebruik
- **Oplossing**: Comprehensive cleanup in `removeContextMenuHighlight()`
- **Triggers**: Menu overlay click, ESC key, alle menu actions, navigation events
- **Implementation**: DOM removal + opacity reset + pointer events cleanup

**CSS STYLING CONFLICTS**: Menu Item Color Overrides
- **Probleem**: Delete button niet rood ondanks correct CSS classes
- **Root Cause**: CSS specificity - general `.menu-item:hover` overschrijft color classes
- **Missing Variables**: `--macos-red-hover` en `--macos-purple-hover` niet gedefinieerd
- **Oplossing**: `!important` declarations + complete hover color variable set
- **Code**: `.menu-delete:hover { background: var(--macos-red-hover) !important; }`

**DEVELOPMENT WORKFLOW**: Safe Feature Implementation
- **User Concern**: "ik wil dat je heel eenvoudig kan terugspringen naar de huidige versie"
- **Solution**: Git feature branches voor safe experimentation
- **Process**: `feature/highlighted-context-menu` branch → test → merge to main
- **Rollback Strategy**: Easy revert capability voor complexe visual features

---

**LAATSTE UPDATE**: Augustus 24, 2025 - Tablet Resize Functionaliteit Voltooid
**BELANGRIJKSTE UPDATES**:
- Augustus 24: Tablet Resize Functionaliteit - Complete touch-friendly resize implementatie voor dagelijkse planning (v0.12.21-0.12.22)
- Augustus 2: Uitklapbare Taken Fix - Hersteld expandable functionaliteit in dag-kalender planning
- Juli 24: Highlighted Context Menu - Complete implementation met DOM cloning en consistent UX
- Juli 18: Focus Mode - Volledige CSS overrides voor perfect fullscreen gedrag
- Juli 13: Scroll Indicators - Intelligente scroll feedback voor uitgesteld lijsten
- Juli 13: Floating Drop Panel - Moderne drag & drop interface 
**BELANGRIJK**: Update dit document bij ELKE wijziging aan de codebase structuur!