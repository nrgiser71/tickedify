# Forensic Logging System voor Tickedify

## Overzicht
Complete audit trail systeem voor debugging van kritieke problemen:
- Herhalende taken die verdwijnen
- Dagelijkse planning die verdwijnt

## Activering
```bash
# Voor debugging - schakel logging IN
export FORENSIC_DEBUG=true

# Voor productie/beta - schakel logging UIT (default)
export FORENSIC_DEBUG=false
```

## Gebruik

### 1. Test User Account voor Claude
```bash
# Claude kan veilig testen op test@example.com account
curl -X POST https://tickedify.com/api/debug/switch-test-user
```

### 2. Forensic Logging Activeren
```bash
# In .env of environment variables
FORENSIC_DEBUG=true
```

### 3. Logs Bekijken
```bash
# Herhalende taken events (laatste 24 uur)
curl "https://tickedify.com/api/debug/forensic/recurring-events"

# Planning events (laatste 24 uur)  
curl "https://tickedify.com/api/debug/forensic/planning-events"

# Specifieke time range (laatste 6 uur)
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=6"
```

## Wat wordt gelogd

### Herhalende Taken
- **CREATE_RECURRING_ATTEMPT** - Nieuwe herhalende taak aanmaken
- **CREATE_RECURRING_SUCCESS** - Succesvol aangemaakt
- **CREATE_RECURRING_FAILED** - Fout bij aanmaken
- **UPDATE_ATTEMPT** - Taak update poging
- Complete task data met herhaling instellingen

### Dagelijkse Planning
- **PLANNING_DELETE** - Planning item verwijderd (CRITICAL)
- **PLANNING_BULK_DELETE** - Meerdere items verwijderd (CRITICAL)
- **PLANNING_CREATE** - Nieuw planning item
- **PLANNING_UPDATE** - Planning item gewijzigd
- **PLANNING_REORDER** - Planning herordend

### User Actions
- **TEST_USER_SWITCH** - Claude switch naar test account
- **HTTP_REQUEST** - Alle API calls met context

## Log Bestanden
- Locatie: `./forensic-logs/`
- Formaat: `forensic-YYYY-MM-DD.jsonl`
- Rotatie: Max 50 bestanden
- Format: JSON Lines (één JSON object per regel)

## Voorbeeld Log Entry
```json
{
  "timestamp": "2025-06-25T15:30:15.123Z",
  "category": "PLANNING",
  "action": "PLANNING_DELETE",
  "data": {
    "planningId": "planning_123",
    "planningContent": {
      "datum": "2025-06-25",
      "uur": "09:00",
      "naam": "Belangrijke taak",
      "actie_id": "task_456",
      "type": "taak"
    },
    "userId": "user_789",
    "endpoint": "/api/dagelijkse-planning/planning_123",
    "userAgent": "Mozilla/5.0...",
    "ip": "127.0.0.1"
  }
}
```

## Recovery Workflow

### Stap 1: Identificeer Probleem
```bash
# Check planning events van vandaag
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=24"
```

### Stap 2: Analyseer Timeline
```bash
# Zoek naar DELETE events
grep "PLANNING_DELETE" forensic-logs/forensic-2025-06-25.jsonl
```

### Stap 3: Herstel Data
- Gebruik logged `planningContent` voor reconstuctie
- Identificeer welke items verdwenen zijn
- Recreate via API met exacte content

## Performance Impact
- **FORENSIC_DEBUG=false**: ZERO impact - Geen logging, geen file I/O
- **FORENSIC_DEBUG=true**: Minimaal - Async logging naar file
- **File Rotatie**: Automatisch - Max 50 bestanden, oude files worden weggegooid

## Beta/Productie Deployment
```bash
# VERPLICHT: Schakel logging UIT voor beta/productie
export FORENSIC_DEBUG=false

# Verificeer dat logging uit staat
curl https://tickedify.com/api/debug/forensic/planning-events
# Should return: {"events": [], "note": "Forensic logging disabled"}
```

## Emergency Recovery Commands
```bash
# Als planning verdwenen is - check laatste bekende state
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=48" | \
  jq '.events[] | select(.action | contains("DELETE"))'

# Herstel specifieke planning item vanuit logs  
# (handmatig via API calls gebaseerd op logged content)
```

Deze forensic logging geeft ons **complete visibility** in wat er gebeurt met kritieke data, zodat we problemen kunnen identificeren en oplossen zonder urenlang debuggen.