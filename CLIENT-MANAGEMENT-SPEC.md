# Client Management Feature Specificatie

## 📋 Overzicht
Uitgebreide specificatie voor client management systeem in Tickedify, specifiek ontworpen voor VA (Virtual Assistant) workflows waarbij taken gesegregeerd moeten worden tussen eigen werk en klant-specifiek werk.

**Status:** Geplande feature voor toekomstige versie  
**Datum specificatie:** 12 augustus 2025  
**Discussie basis:** Gesprek over Livalos VA workflow optimalisatie

## 🎯 Probleem Definitie

### Huidige Situatie
Jan werkt als VA voor meerdere klanten (hoofdzakelijk Livalos) en heeft twee verschillende workflows:

**1. Eigen Werk (Personal/Business):**
- Volgt normale GTD-style flow: Inbox → Acties → Dagelijkse Planning
- Gestructureerde planning per dag/tijd
- Include: persoonlijke taken, eigen business, administratie

**2. Klant Werk:**
- Tijdblok planning: "9:00-11:00 Livalos werk"
- Ad-hoc taak selectie binnen tijdblok
- Dedicated overzicht van alle openstaande klant taken
- Geen interference met eigen productiviteit workflow

### Probleem
Huidige Tickedify mengt beide workflows, waardoor:
- Klant taken vervuilen acties lijst en dagelijkse planning
- Geen dedicated klant overzicht beschikbaar
- Context switching tussen klanten inefficiënt

## 💡 Oplossing: Two-Type Task System

### Core Concept
**Taak Type Segregatie:**
- `type: 'non-klant'` = eigen werk (personal + business)
- `type: 'klant'` = klant-specifiek werk
- Volledige workflow segregatie tussen beide types

### User Workflow
**Inbox Processing:**
1. Nieuwe taak komt binnen (email, handmatig, etc.)
2. Keuze: "Non-klant taak" OF "Klant taak"
3. Non-klant → normale acties lijst workflow
4. Klant → selecteer klant → naar klant workspace

**Klant Werk Workflow:**
1. Plan tijdblok "9:00-11:00 Livalos" in dagelijkse planning
2. Tijdens werk: klik "👥 Klanten" in sidebar
3. Selecteer "Livalos" uit dropdown
4. Zie alle openstaande Livalos taken
5. Kies ad-hoc wat te doen
6. Markeer af zoals normaal

## 🗃️ Database Schema Wijzigingen

### Nieuwe Kolommen in `taken` tabel
```sql
-- Nieuwe kolommen
type VARCHAR(20) DEFAULT 'non-klant', -- 'klant' of 'non-klant'
client_naam VARCHAR(100),             -- alleen voor klant taken

-- Index voor performance
CREATE INDEX idx_taken_type ON taken(type);
CREATE INDEX idx_taken_client ON taken(client_naam) WHERE type = 'klant';
```

### Migration Strategy
```sql
-- Backward compatibility: alle bestaande taken krijgen non-klant type
UPDATE taken SET type = 'non-klant' WHERE type IS NULL;
```

### Data Integrity
- `client_naam` verplicht voor `type = 'klant'`
- `client_naam` NULL voor `type = 'non-klant'`
- Validation op API niveau

## 🎨 UI/UX Specificatie

### Sidebar Wijzigingen
**Huidige sidebar:**
```
📧 Inbox
🎯 Acties
⏰ Opvolgen  
📅 Dagelijkse Planning
```

**Nieuwe sidebar:**
```
📧 Inbox (mixed types)
🎯 Acties (ALLEEN non-klant)
👥 Klanten (nieuw item)
⏰ Opvolgen (ALLEEN non-klant)
📅 Dagelijkse Planning (ALLEEN non-klant)
```

### Klanten Dashboard UI

#### Landing Page (/klanten)
```
┌─────────────────────────────────────┐
│ 👥 Klanten Dashboard                │
│                                     │
│ Selecteer klant:                    │
│ ┌─ Dropdown ──────────────────────┐ │
│ │ Livalos (12 openstaand)     ▼ │ │
│ │ Klant X (5 openstaand)        │ │
│ │ Klant Y (3 openstaand)        │ │
│ │ + Nieuwe klant...              │ │
│ └───────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### Klant Specifiek Overzicht (/klanten?client=livalos)
```
┌─────────────────────────────────────┐
│ 🏢 Livalos - 12 openstaande taken   │
│ [← Terug naar overzicht]            │
│                                     │
│ 📊 Status Overzicht:                │
│ • Acties: 8 taken                   │
│ • Opvolgen: 3 taken                 │
│ • Uitgesteld: 1 taken               │
│                                     │
│ ┌─ Project: Support ──────────────┐ │
│ │ □ Email backlog verwerken        │ │
│ │ □ Ticket #123 oplossen           │ │
│ │ □ Klant support chat             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Project: Website ──────────────┐ │
│ │ □ Homepage teksten updaten       │ │
│ │ □ Contact formulier testen       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ Nieuwe taak voor Livalos]        │
└─────────────────────────────────────┘
```

### Inbox Processing UI Wijzigingen

#### Huidige Inbox Item
```
┌─────────────────────────────────────┐
│ □ Email van klant over website bug  │
│ [Bewerk] [Plan] [↗️]                │
└─────────────────────────────────────┘
```

#### Nieuwe Inbox Processing
```
┌─────────────────────────────────────┐
│ □ Email van klant over website bug  │
│                                     │
│ Type taak:                          │
│ ○ Non-klant taak                    │
│ ● Klant taak → [Dropdown: Livalos ▼]│
│                                     │
│ [Bewerk] [Plan] [↗️]                │
└─────────────────────────────────────┘
```

## 🔌 API Endpoints Specificatie

### Nieuwe Endpoints

#### Klanten Management
```javascript
// Haal alle klanten op (unieke client_naam values)
GET /api/klanten
Response: ["Livalos", "Klant X", "Klant Y"]

// Haal alle taken voor specifieke klant
GET /api/klanten/:clientNaam/taken
Response: [{ id, naam, project, status, ... }]

// Klant statistieken
GET /api/klanten/:clientNaam/stats  
Response: { 
  totaal: 12, 
  acties: 8, 
  opvolgen: 3, 
  uitgesteld: 1 
}
```

#### Taak CRUD Wijzigingen
```javascript
// Bestaande endpoints uitbreiden met type/client filtering

// Taken lijst (gefilterd op type)
GET /api/lijst/acties?type=non-klant
GET /api/lijst/acties?type=klant&client=Livalos

// Taak aanmaken met type
POST /api/taak
Body: {
  naam: "Website bug fixen",
  type: "klant", 
  client_naam: "Livalos",
  project_id: 123
}

// Taak type wijzigen
PUT /api/taak/:id/type
Body: { 
  type: "klant", 
  client_naam: "Livalos" 
}
```

### Bestaande Endpoints Wijzigingen

#### Filtering Logic
Alle bestaande lijst endpoints krijgen automatische filtering:
- `/api/lijst/acties` → toont alleen non-klant taken
- `/api/lijst/opvolgen` → toont alleen non-klant taken  
- `/api/dagelijkse-planning/:datum` → toont alleen non-klant taken

#### Backward Compatibility
- Bestaande API calls werken ongewijzigd
- Default filtering op `type = 'non-klant'`
- Expliciete parameter `?includeKlant=true` voor mixed results

## 🔧 Technische Implementatie Details

### Frontend Wijzigingen

#### App.js Modifications
```javascript
// Nieuwe functionaliteiten toevoegen:

class Taakbeheer {
  // Klanten dashboard
  laadKlantenDashboard() { ... }
  laadKlantTaken(clientNaam) { ... }
  renderKlantenDropdown() { ... }
  
  // Type management  
  zetTaakType(taakId, type, clientNaam = null) { ... }
  filterTakenOpType(taken, type) { ... }
  
  // Inbox processing
  toonTypeSelectie(taakId) { ... }
  verwerkInboxItem(taakId, type, clientNaam) { ... }
}
```

#### Nieuwe JavaScript Modules
```javascript
// klanten-manager.js
class KlantenManager {
  constructor(app) { ... }
  
  // Dashboard functionaliteit
  renderDashboard() { ... }
  renderKlantOverzicht(clientNaam) { ... }
  
  // Klant selectie
  handleKlantSelectie(clientNaam) { ... }
  laadKlantStatistieken(clientNaam) { ... }
}
```

### Backend Wijzigingen

#### Database.js Functions
```javascript
// Nieuwe functies
async getKlanten() {
  // Haal unieke client_naam values op
}

async getKlantTaken(clientNaam, status = null) {
  // Haal taken voor specifieke klant
}

async getKlantStatistieken(clientNaam) {
  // Tel taken per status voor klant
}

async updateTaakType(taakId, type, clientNaam) {
  // Wijzig type/klant van bestaande taak
}

// Bestaande functies uitbreiden
async getTaken(lijst, filterType = 'non-klant') {
  // Voeg type filtering toe aan bestaande query
}
```

#### Server.js Routes
```javascript
// Nieuwe routes
app.get('/api/klanten', getKlanten);
app.get('/api/klanten/:naam/taken', getKlantTaken);
app.get('/api/klanten/:naam/stats', getKlantStats);
app.put('/api/taak/:id/type', updateTaakType);

// Bestaande routes wijzigen voor type filtering
// app.get('/api/lijst/:naam') uitbreiden met type parameter
```

### CSS Styling

#### Nieuwe Componenten
```css
/* Klanten dashboard */
.klanten-dashboard { ... }
.klant-selector { ... }
.klant-overzicht { ... }
.klant-statistieken { ... }

/* Type selectie in inbox */
.taak-type-selectie { ... }
.type-radio-group { ... }
.klant-dropdown { ... }

/* Sidebar klanten item */
.sidebar-klanten { ... }
.klanten-badge { ... } /* Voor aantal openstaande taken */
```

## 📱 User Stories & Workflows

### User Story 1: VA Daily Workflow
**Als** VA werknemer  
**Wil ik** mijn eigen taken gescheiden houden van klant werk  
**Zodat** mijn persoonlijke productiviteit workflow niet vervuild wordt

**Acceptance Criteria:**
- Acties lijst toont alleen eigen werk
- Dagelijkse planning toont alleen eigen werk  
- Klant taken niet zichtbaar in normale workflow

### User Story 2: Client Context Switch
**Als** VA werknemer  
**Wil ik** snel kunnen switchen naar klant-specifieke taken  
**Zodat** ik efficiënt kan werken binnen tijdblokken

**Workflow:**
1. Plan "9:00-11:00 Livalos werk"
2. Om 9:00: klik "Klanten" → "Livalos"
3. Zie alle openstaande Livalos taken
4. Kies ad-hoc wat te doen
5. Werk 2 uur aan Livalos taken

### User Story 3: Inbox Processing
**Als** VA werknemer  
**Wil ik** bij inbox verwerking kiezen tussen eigen en klant werk  
**Zodat** taken automatisch in juiste workflow terechtkomen

**Workflow:**
1. Email binnenkomst: "Website probleem van Livalos"
2. Inbox processing: kies "Klant taak" → "Livalos"
3. Taak verschijnt in Livalos workspace
4. Taak verschijnt NIET in eigen acties lijst

### User Story 4: Multi-Client Management
**Als** VA met meerdere klanten  
**Wil ik** overzicht van alle klanten en hun openstaande taken  
**Zodat** ik kan prioriteren tussen klanten

**Features:**
- Klanten dashboard met overzicht alle klanten
- Per klant aantal openstaande taken
- Quick access naar klant-specifieke workspaces

## 🚀 Implementation Roadmap

### Fase 1: Database & Backend (2-3 dagen)
1. **Database migration**
   - Voeg type en client_naam kolommen toe
   - Migreer bestaande taken naar non-klant
   - Voeg indexes toe

2. **Backend API**
   - Nieuwe klanten endpoints
   - Wijzig bestaande endpoints voor type filtering
   - Update database functions

3. **Testing**
   - Unit tests voor nieuwe API endpoints
   - Integration tests voor type filtering

### Fase 2: Core UI (3-4 dagen)
1. **Sidebar update**
   - Voeg "Klanten" menu item toe
   - Filter bestaande lijsten op non-klant

2. **Klanten dashboard**
   - Landing page met klant selector
   - Klant-specifiek overzicht
   - Basis functionaliteit

3. **Type management**
   - Inbox processing UI
   - Type wijziging functionaliteit

### Fase 3: Polish & Features (2-3 dagen)
1. **Enhanced UI**
   - Klant statistieken
   - Verbeterde navigation
   - Loading states

2. **Keyboard shortcuts**
   - Quick klant switching
   - Type selection shortcuts

3. **Performance optimizations**
   - Caching van klant data
   - Lazy loading

### Fase 4: Testing & Documentation (1-2 dagen)
1. **End-to-end testing**
   - Complete workflow tests
   - Edge case testing

2. **Documentation updates**
   - ARCHITECTURE.md updates
   - User guide voor nieuwe features

**Totale geschatte tijd: 8-12 dagen development**

## 🔍 Bijkomende Overwegingen

### Performance
- **Database indexing** op type en client_naam kolommen
- **Frontend caching** van klant informatie
- **Lazy loading** van klant taken
- **Pagination** voor klanten met veel taken

### Extensibiliteit
- **Team workspaces** - later uitbreidbaar naar teams
- **Project workspaces** - alternatief voor project-based filtering
- **Custom workspace types** - gebruiker gedefinieerde types
- **Workspace templates** - standaard setups voor nieuwe klanten

### Business Value
- **Freelancer market** - grote doelgroep buiten VA's
- **Consultant workflows** - meerdere klanten tegelijk
- **Agency workflows** - team members per klant
- **Service provider workflows** - verschillende opdrachtgevers

### Migration Strategy
- **Phased rollout** - feature flag voor early adopters
- **Backward compatibility** - geen breaking changes
- **Data migration** - veilige overgang bestaande data
- **User education** - tutorials voor nieuwe workflow

## ✅ Definition of Done

### Technical Requirements
- [ ] Database schema migration succesvol
- [ ] Alle nieuwe API endpoints geïmplementeerd
- [ ] Type filtering in alle bestaande endpoints
- [ ] Frontend UI volledig functioneel
- [ ] Backward compatibility gegarandeerd

### User Experience Requirements
- [ ] Intuïtieve workflow voor type selectie
- [ ] Snelle klant switching (< 2 clicks)
- [ ] Geen performance degradatie
- [ ] Responsive design op alle schermen
- [ ] Keyboard shortcuts werkend

### Quality Requirements
- [ ] Unit tests voor alle nieuwe functies
- [ ] Integration tests voor complete workflows
- [ ] Performance tests voor grote klant datasets
- [ ] Security review van nieuwe endpoints
- [ ] Documentation volledig bijgewerkt

---

**Document versie:** 1.0  
**Laatste update:** 12 augustus 2025  
**Verantwoordelijke:** Claude Code  
**Review status:** In afwachting van implementatie planning