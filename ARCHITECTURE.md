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

-- bijlagen (Feature 049 - Email attachment support)
id VARCHAR(50) PRIMARY KEY
taak_id VARCHAR(50) NOT NULL REFERENCES taken(id) ON DELETE CASCADE
bestandsnaam VARCHAR(255) NOT NULL
bestandsgrootte INTEGER NOT NULL
mimetype VARCHAR(100) NOT NULL
storage_type VARCHAR(20) NOT NULL DEFAULT 'backblaze'
storage_path VARCHAR(500) NOT NULL
geupload TIMESTAMP DEFAULT CURRENT_TIMESTAMP
user_id VARCHAR(50) REFERENCES users(id)

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

-- page_help (Feature 062 - Page Help Icons)
page_id VARCHAR(50) PRIMARY KEY
content TEXT NOT NULL
modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
modified_by VARCHAR(50)
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
- `verwijderTaak(id, categoryKey)` - regel ~3921 - Algemene taak verwijdering
- `verwijderInboxTaak()` - regel ~4036 - Specifieke inbox taak verwijdering met workflow

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

**Top 3 Prioriteiten (Sterretje Checkbox Systeem)**
- `toggleTopPriority()` - regel ~5,708 - Toggle checkbox met max 3 validatie
- `renderActiesVoorPlanning()` - regel ~8,333 - Sterretje checkbox rendering
- Top prioriteiten data laden - regel ~7,949 - Ophalen via `/api/prioriteiten/${today}`

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

**Page Help System (regels 15,193-15,409)** - Feature 062
- `PageHelpManager` class - regel 15,193 - Complete help systeem management
- `setupModal()` - regel 15,204 - Modal DOM setup en event listeners
- `addHelpIcon()` - regel 15,244 - Voeg help icon toe aan page titles
- `getPageHelp()` - regel 15,271 - Fetch help content met dubbele caching (memory + localStorage)
- `invalidateCache()` - regel 15,326 - Cache invalidatie na admin update
- `showHelp()` - regel 15,337 - Toon help modal met markdown rendering
- `loadMarked()` - regel 15,382 - Dynamisch laden van Marked.js library
- `getPageName()` - regel 15,393 - Human-readable page namen mapping
- `window.pageHelpManager` - regel ~16,836 - Global instance voor admin access

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

**Acties Floating Panel & Shift-toets Derde Week (regels 11,000-11,250)**
- `showActiesFloatingPanel()` - regel ~11,024 - Toon acties drag panel met 3 weken
- `hideActiesFloatingPanel()` - regel ~11,172 - Verberg panel met Shift status reset
- `hideActiesFloatingPanelImmediately()` - regel ~11,192 - Onmiddellijk verbergen (drop events)
- `generateActiesWeekDays()` - regel ~11,044 - Genereer 3 weken datums (huidige + volgende + derde)
- `toggleDerdeWeek(show)` - regel ~11,147 - Toggle derde week sectie met CSS transitions
- `updateActiesFloatingPanelDates()` - regel ~11,039 - Update week datums dynamisch
- `setupActiesFloatingDropZones()` - regel ~11,211 - Drop zone handlers + Shift detectie in dragover

**Utility Functions (regels 9,000-10,507)**
- `formatDuration()` - regel ~8,600
- `formatDisplayDate()` - regel ~14687 - Centrale datum formatting DD/MM/YYYY
  - Used by: 19+ UI locaties voor consistente datum weergave
  - Future: User preference extensibility (FR-011)
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
- **Acties Floating Panel & Derde Week**: regels 8,816-8,950 - `.acties-floating-panel` met week grid layout
- **Derde Week Toggle (Shift-toets)**: regels 8,853-8,866 - `#actiesDerdeWeekSection` met smooth max-height transitions

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

**Email Import (regels 1,057-1,330)**
- `/api/email/import` webhook - regel ~1,057 (Multer `upload.any()` middleware)
- Task creation - regels ~1,160-1,200
- Attachment processing (Feature 049) - regels ~1,208-1,293
- Email parsing logic - regels ~1,310-1,700
  - `truncateAtEndMarker()` - regel ~1,313
  - `parseDeferCode()` - regel ~1,326
  - `parsePriorityCode()` - regel ~1,345
  - `parseKeyValue()` - regel ~1,362
  - `parseAttachmentCode()` - regel ~1,394 (Feature 049)
  - `findMatchingAttachment()` - regel ~1,414 (Feature 049)
  - `parseEmailToTask()` - regel ~1,452 (hoofdfunctie)

**Page Help Endpoints (regels 2,771-3,081)** - Feature 062
- DEFAULT_PAGE_HELP object - regels 2,771-2,891 - Default English content for 11 pages
- `GET /api/page-help/:pageId` - regel 2,893 - Fetch help content with default fallback
- `PUT /api/page-help/:pageId` - regel 2,945 - Update/create custom content (admin only)
- `DELETE /api/page-help/:pageId` - regel 2,998 - Delete custom content (admin only)
- `GET /api/page-help` - regel 3,015 - List all pages with custom/default indicator (admin only)

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

### Page Help (Feature 062)
- `GET /api/page-help/:pageId` - Fetch help content for specific page
- `PUT /api/page-help/:pageId` - Update/create custom help content (admin only)
- `DELETE /api/page-help/:pageId` - Delete custom content, revert to default (admin only)
- `GET /api/page-help` - List all page help content with custom/default indicator (admin only)

## 🎯 Belangrijke Features & Locaties

### Herhalende Taken Systeem
- **UI Popup**: `toonHerhalingPopup()` in app.js:4100
- **Pattern Parsing**: `parseRecurringPattern()` in app.js:9000
- **Date Calculation**: `calculateNextRecurringDate()` in app.js:4500
- **Database**: `createRecurringTask()` in database.js:850
- **API**: `/api/taak/recurring` in server.js:3200

### Top 3 Prioriteiten (Sterretje Checkbox Systeem)
- **UI**: Sterretje checkbox bij elke actie in dagelijkse planning (app.js:~8350)
- **Toggle Functie**: `toggleTopPriority()` in app.js:~5708 - max 3 validatie
- **Kalender Weergave**: Sterretjes tonen bij ingeplande prioriteiten (app.js:~8231)
- **Data Laden**: Top prioriteiten ophalen in `toonDagelijksePlanning()` (app.js:~7949)
- **Database**: `top_prioriteit` kolom (1-3) + `prioriteit_datum` in taken tabel
- **API**: `/api/taak/:id/prioriteit` (PUT) en `/api/prioriteiten/:datum` (GET) in server.js:~4800
- **Styling**: `.actie-star` checkbox styling in style.css:~4450

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

### Page Help Icons (Feature 062 - v0.21.128+)
- **PageHelpManager Class**: Complete help system management in app.js:15193-15409
- **Help Icon Component**: `addHelpIcon()` in app.js:15244 - SVG help icons next to page titles
- **Modal UI**: Help modal with markdown rendering via Marked.js
- **Caching System**:
  - In-memory cache + localStorage with 24-hour TTL
  - `getPageHelp()` in app.js:15271 - Fetch with caching
  - `invalidateCache()` in app.js:15326 - Cache invalidation on admin update
- **Admin Interface**:
  - Page Help screen in admin2.html:1625-1745
  - Side-by-side editor/preview with live markdown rendering
  - JavaScript functions in admin2.html:3341-3588
- **API Endpoints**: 4 RESTful endpoints in server.js:2893-3081
- **Database**: `page_help` table with custom content storage
- **Default Content**: English help content for 11 eligible pages (DEFAULT_PAGE_HELP object in server.js:2771-2891)
- **Eligible Pages**: inbox, acties, opvolgen, dagelijkse-planning, uitgesteld-* (5 variants), afgewerkt, email-import
- **Excluded Pages**: CSV Import, Settings (per requirements)

### Subscription & Beta-naar-Productie Flow (v0.19.21+)
- **Beta Expired Page**: `/public/beta-expired.html` - Toon wanneer beta periode afgelopen is
- **Trial Expired Page**: `/public/trial-expired.html` - Toon wanneer 14-dagen trial afgelopen is
- **Subscription Selection**: `/public/subscription.html` - Keuze tussen trial en betaald abonnement
- **Subscription Confirm**: `/public/subscription-confirm.html` - Email verificatie voor betaling
- **JavaScript Files**:
  - `public/js/subscription.js` - Hoofdlogica voor subscription flow
  - `public/js/subscription-data.js` - Plan data en validatie functies
  - `public/js/subscription-api.js` - API calls voor subscription endpoints
  - `public/js/subscription-confirm.js` - Email confirmatie logica
- **Key Functions**:
  - `confirmSelection()` - regel ~379 - Verwerkt trial/betaald selectie, slaat redirectTarget op
  - `closeSuccessModal()` - regel ~565 - Checkt trial redirect en stuurt door naar /app
  - `initializeSubscriptionPage()` - regel ~20 - Laadt plans en user status
- **User Flow**: Beta expired → Subscription page → Trial/Betaald keuze → Success modal → Auto-redirect naar /app
- **Backend Endpoints**:
  - `POST /api/subscription/select` - Trial activatie of betaald plan selectie (server.js:~2690)
  - `GET /api/subscription/status` - Gebruiker subscription status (server.js:~3000)
  - `GET /api/subscription/plans` - Beschikbare abonnementen ophalen
- **Database Schema**: `users` tabel bevat subscription kolommen (trial_start_date, trial_end_date, subscription_status, selected_plan)

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

### Acties Floating Panel & Shift-toets Derde Week (v0.17.0) ✅
- **HTML Structure**: Acties floating panel in index.html:871-925
  - `#actiesFloatingPanel` - Main panel container met `.acties-floating-panel` class
  - `#actiesHuidigeWeek` - Huidige week container (regel 880)
  - `#actiesVolgendeWeek` - Volgende week container (regel 888)
  - `#actiesDerdeWeekSection` - Derde week sectie (regel 894, initieel hidden)
  - `#actiesDerdeWeek` - Derde week container voor dynamische dag zones
- **JavaScript Functions**:
  - `generateActiesWeekDays()` - app.js:11044 - Genereert 3 weken datums (huidige, volgende, derde)
  - `toggleDerdeWeek(show)` - app.js:11147 - Toggle derde week met CSS transitions
  - `showActiesFloatingPanel()` - app.js:11024 - Activeer panel en setup drop zones
  - `hideActiesFloatingPanel()` - app.js:11172 - Deactiveer panel met Shift status reset
  - `hideActiesFloatingPanelImmediately()` - app.js:11192 - Onmiddellijk verbergen (drop events)
  - `setupActiesFloatingDropZones()` - app.js:11211 - Drop zones met Shift detectie in dragover
- **Shift Detectie**:
  - Via `event.shiftKey` in dragover handler (app.js:11221-11227)
  - Real-time toggle tijdens drag over drop zones
  - Property tracking: `this.shiftKeyPressed` (boolean)
- **CSS Styling**:
  - Panel layout in style.css:8816-8950
  - Derde week transitions in style.css:8853-8866 (max-height + opacity)
  - Week grid layout met flexbox column voor 3 weken
- **User Interaction**:
  - Shift-toets indrukken tijdens drag over drop zones → 3e week verschijnt (14-20 dagen vooruit)
  - Shift-toets loslaten → 3e week verdwijnt met smooth transition (<200ms)
  - Werkt naadloos met drop functionaliteit (geen conflict met browser drag & drop)
- **Performance**: Real-time response via dragover events, <50ms UI update
- **Browser Compatibility**: Shift-toets conflicteert niet met native drag & drop (vs Ctrl = copy/move switching)

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
- **Planning**: Planning popup in index.html (regel 328-484)
  - **Checkbox Layout**: `.checkbox-input-wrapper` in style.css:1910-1929 (v0.16.31)
  - **Flexbox Horizontal**: Checkbox links van input field via `display: flex`
  - **Responsive**: Gap 10px spacing, werkt op desktop/tablet/mobile
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

### Inbox Task Deletion System (v0.16.1) ✅
**Complete verwijder functionaliteit voor inbox taken met automatische workflow**

**Core Functionaliteit:**
- **Delete Button**: `setDeleteButtonVisibility()` in app.js:4241 - Context-aware button visibility
- **Main Function**: `verwijderInboxTaak()` in app.js:4036 - Inbox-specific deletion with workflow
- **Event Handler**: Event listener in app.js:1217 voor verwijder knop click
- **HTML Element**: `#verwijderInboxTaakBtn` in index.html:481 (rode "Verwijderen" knop)
- **CSS Styling**: Button styling in style.css:2239-2260 (rode border, hover effects)

**Workflow Mechanisme:**
- **Context Detection**: Knop alleen zichtbaar wanneer `this.huidigeLijst === 'inbox'`
- **Confirmation Dialog**: `confirmModal.show()` voor veiligheidscheck
- **B2 Cleanup**: Automatische bijlagen verwijdering uit cloud storage
- **Next Task Logic**: `openVolgendeInboxTaak()` voor automatische workflow
- **Success Handling**: Toast notifications met B2 cleanup status

**Integration Points:**
- **Planning Popup**: `planTaak()` in app.js:4305 roept `setDeleteButtonVisibility()`
- **Edit Action**: `bewerkActie()` in app.js:6529 roept `setDeleteButtonVisibility()`
- **Button Layout**: Popup-acties tussen "Annuleren" en "Maak actie" knoppen
- **CSS Specificity**: `#planningPopup .popup-acties button.verwijder-btn` voor styling override

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

## 📝 Bulk Eigenschappen Bewerking (Feature 043) - v0.20.22

**OVERZICHT**: Complete bulk edit functionaliteit voor Acties lijst - pas meerdere eigenschappen tegelijk aan voor geselecteerde taken.

### Global Functions (Helper Layer)
**Locatie**: public/app.js regels 356-491

- **populateBulkEditDropdowns()** - regel 357-393
  - Vult project en context dropdowns met gesorteerde data
  - Alfabetische sorting consistent met bestaande patterns
  - Gebruikt taskManager.projecten en taskManager.contexten arrays

- **collectBulkEditUpdates()** - regel 395-429
  - Verzamelt form data naar updates object
  - Optionele velden: project_id, verschijndatum, context, prioriteit, estimated_time_minutes
  - Null handling voor "Geen project" en "Geen context" options

- **showBulkEditPopup()** - regel 431-491
  - Returns Promise<updates|null> voor async workflow
  - Modal display met task count in header
  - Validation: minimum 1 eigenschap vereist (FR-013)
  - Event handlers: Save, Cancel, Backdrop click, Escape key
  - Promise resolves met updates object of null bij cancel

### TaskManager Methods (Core Logic)
**Locatie**: public/app.js regels 12623-12700

- **bulkEditProperties(updates)** - regel 12623
  - Pre-validation: minimum 2 taken vereist (FR-002)
  - Confirmation dialog met task count en properties count
  - Sequential API updates via PUT /api/taak/:id
  - Progress tracking met LoadingManager.showWithProgress()
  - Error handling: partial success tracking
  - Success: toast + toggleBulkModus + preserveActionsFilters + reload
  - Failure: toast.error + geen reload (preserve state)
  - Returns { successCount, errorCount, totalCount, errors }

- **getBulkVerplaatsKnoppen()** - regel 12499 (modified)
  - Toegevoegd: "Eigenschappen Bewerken" button op regel 12517-12521
  - Disabled state wanneer geselecteerdeTaken.size < 2
  - Button roept window.openBulkEditPopup() aan

### Window Functions (Entry Points)
**Locatie**: public/app.js regels 13616-13636

- **window.openBulkEditPopup()** - regel 13616
  - Entry point vanuit bulk actions button
  - Pre-check: minimum 2 taken (defensive)
  - Orchestrates: showBulkEditPopup → bulkEditProperties
  - Async workflow met proper error handling

### HTML Elements
**Locatie**: public/index.html regels 1182-1230

- **#bulkEditModal** - regel 1183 - Modal popup container
- **#bulkEditHeader** - regel 1185 - Dynamic header met task count
- **#bulkEditProject** - regel 1189 - Project dropdown (dynamically populated)
- **#bulkEditDatum** - regel 1198 - Date input
- **#bulkEditContext** - regel 1203 - Context dropdown (dynamically populated)
- **#bulkEditPriority** - regel 1212 - Priority select (laag/normaal/hoog)
- **#bulkEditTime** - regel 1222 - Estimated time input (minutes)
- **Button handlers**: window.bulkEditCancel(), window.bulkEditSave()

### CSS Styling
**Locatie**: public/style.css regels 9597-9658

- **#bulkEditModal .modal-content** - regel 9598 - Modal container (max-width 500px)
- **#bulkEditModal .form-group** - regel 9603 - Form field spacing
- **#bulkEditModal .form-group label** - regel 9607 - Label styling
- **#bulkEditModal .form-group select/input** - regel 9614 - Form controls
- **#bulkEditModal .button-group** - regel 9624 - Button container (flex)
- **#bulkEditModal button** - regel 9631 - Base button styling
- **button.secondary / button.primary** - regel 9640-9656 - Color variants

### API Usage
**Endpoint**: PUT /api/taak/:id (existing endpoint, no backend changes)

**Request Body** (partial updates, alle velden optioneel):
```javascript
{
  project_id: integer | null,
  verschijndatum: "YYYY-MM-DD",
  context: string | null,
  prioriteit: "laag" | "normaal" | "hoog",
  estimated_time_minutes: integer
}
```

### User Workflow
1. User activeert bulk mode in Acties lijst
2. User selecteert 2+ taken via checkboxes
3. User klikt "Eigenschappen Bewerken" button
4. Popup opent met lege velden (geen placeholders - UX-004)
5. User vult gewenste eigenschappen in (min 1 vereist)
6. User klikt "Opslaan" → Confirmation dialog
7. Sequential updates met progress indicator
8. Success: bulk mode exit + lijst reload + toast
9. Partial failure: toast error + geen reload (preserve state)

### Feature Flags & Requirements
- **FR-002**: Minimum 2 taken vereist voor bulk edit
- **FR-007**: Confirmation dialog voor bulk operatie
- **FR-013**: Minimum 1 eigenschap vereist in form
- **FR-014**: Partial failures behouden state (geen reload)
- **UX-004**: Geen placeholders in form (lege velden)
- **UX-007**: Escape key closes popup

### Integration Points
- **Bulk Mode System**: Integreert met bestaande bulk actions (date, move)
- **LoadingManager**: Progress tracking consistent met other bulk operations
- **ToastManager**: Success/error feedback consistent met app patterns
- **Modal System**: Consistent styling met recurring/priority popups
- **API Layer**: Hergebruikt existing PUT /api/taak/:id endpoint

### Testing Scenarios (Quickstart)
1. **Happy Path**: 3 taken, context + priority wijzigen
2. **Multiple Properties**: Alle 5 eigenschappen tegelijk aanpassen
3. **Minimum Selection**: Button disabled bij <2 taken
4. **Empty Form**: Warning "Geen eigenschappen geselecteerd"
5. **Cancel Workflow**: Escape/Cancel/Confirm-cancel preserves state
6. **Keyboard Navigation**: Tab through fields, Enter save, Escape close

---

**LAATSTE UPDATE**: Oktober 30, 2025 - Bulk Eigenschappen Bewerking (v0.20.22)
**BELANGRIJKSTE UPDATES**:
- Oktober 18: Subscription Flow - Naadloze beta-naar-productie transitie met automatische redirect naar /app (v0.19.21-0.19.22)
- Augustus 24: Tablet Resize Functionaliteit - Complete touch-friendly resize implementatie voor dagelijkse planning (v0.12.21-0.12.22)
- Augustus 2: Uitklapbare Taken Fix - Hersteld expandable functionaliteit in dag-kalender planning
- Juli 24: Highlighted Context Menu - Complete implementation met DOM cloning en consistent UX
- Juli 18: Focus Mode - Volledige CSS overrides voor perfect fullscreen gedrag
- Juli 13: Scroll Indicators - Intelligente scroll feedback voor uitgesteld lijsten
- Juli 13: Floating Drop Panel - Moderne drag & drop interface
**BELANGRIJK**: Update dit document bij ELKE wijziging aan de codebase structuur!