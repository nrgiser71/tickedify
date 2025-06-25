# Forensic Logging System voor Tickedify

## 🚨 CRITICAL: Voor Claude - Gebruik DIT systeem bij debugging

**ALTIJD dit systeem gebruiken bij:**
- Herhalende taken die verdwijnen
- Dagelijkse planning die verdwijnt  
- Onverklaarbare data wijzigingen
- Bulk operatie problemen
- Recovery operaties

**NOOIT meer uren debuggen zonder forensic logs!**

## Overzicht
Complete audit trail systeem voor debugging van kritieke problemen die de gebruiker uren kosten:

### ❌ **Problemen die dit systeem oplost:**
1. **Herhalende taken verdwijnen mysterieus** - Gebruiker moet alles opnieuw instellen
2. **Dagelijkse planning wordt leeg** - Geen zichtbare oorzaak, veel werk kwijt
3. **Data corruptie tijdens updates** - Onverwachte state changes
4. **Bulk cleanup gone wrong** - Te veel data verwijderd zonder waarschuwing
5. **Multi-user conflicts** - Data wijzigingen door verkeerde user context

### ✅ **Wat het forensic systeem biedt:**
- **Complete timeline** van alle kritieke operaties
- **Before/after state** van data wijzigingen
- **User context** voor alle API calls (wie deed wat wanneer)
- **Error correlation** met deployment timestamps
- **Recovery data** - exact content om data te herstellen
- **Zero performance impact** when disabled

## Activering

### Voor Debugging (ALTIJD doen bij problemen)
```bash
# Set environment variable
export FORENSIC_DEBUG=true

# OF in .env file
echo "FORENSIC_DEBUG=true" >> .env

# Restart server to pick up changes
# Vercel: automatic deployment pickup
# Local: restart Node.js process
```

### Voor Productie/Beta (VERPLICHT)
```bash
# CRITICAL: Always disable for production
export FORENSIC_DEBUG=false

# Verify disabled
curl https://tickedify.com/api/debug/forensic/planning-events
# Should show: "Forensic logging disabled"
```

## 🔧 Stap-voor-Stap Debugging Workflow voor Claude

### **Stap 1: ALTIJD Switch naar Test User (Verplicht voor Claude)**
```bash
# Switch naar safe test account - NOOIT testen op production user data
curl -X POST https://tickedify.com/api/debug/switch-test-user

# Response bevat test user info:
# user_id: user_1750505017703_oybhyoqhi  
# email: test@example.com
# GEBRUIK DEZE USER_ID voor alle verdere API calls
```

### **Stap 2: Activeer Forensic Logging**
```bash
# Method A: Environment variable (preferred)
export FORENSIC_DEBUG=true

# Method B: Via .env file
echo "FORENSIC_DEBUG=true" >> .env

# Restart required for changes to take effect
# On Vercel: new deployment
# Locally: restart server process
```

### **Stap 3: Verify Logging is Active**
```bash
# Should return events array (even if empty)
curl "https://tickedify.com/api/debug/forensic/planning-events"

# If disabled, returns: {"error": "Forensic logging disabled"}
# If enabled, returns: {"timeRange": "24 hours", "totalEvents": 0, "events": []}
```

### **Stap 4: Trigger Problem Scenarios**
```bash
# Example: Create recurring task on test account
curl -X POST "https://tickedify.com/api/taak/recurring" \
  -H "Content-Type: application/json" \
  -d '{
    "tekst": "Test herhalende taak",
    "userId": "user_1750505017703_oybhyoqhi",
    "herhalingType": "dagelijks",
    "herhalingActief": true
  }'

# Example: Complete task to trigger recurring creation
curl -X PUT "https://tickedify.com/api/taak/TASK_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "afgewerkt": "2025-06-25T15:30:00.000Z",
    "userId": "user_1750505017703_oybhyoqhi"
  }'

# Example: Delete planning item
curl -X DELETE "https://tickedify.com/api/dagelijkse-planning/PLANNING_ID"
```

### **Stap 5: Analyze Forensic Logs**
```bash
# Check ALL events (last 24 hours)
curl "https://tickedify.com/api/debug/forensic/recurring-events" | jq '.'
curl "https://tickedify.com/api/debug/forensic/planning-events" | jq '.'

# Check specific time ranges
curl "https://tickedify.com/api/debug/forensic/recurring-events?hours=1" | jq '.'
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=1" | jq '.'

# Filter by specific actions
curl "https://tickedify.com/api/debug/forensic/planning-events" | \
  jq '.events[] | select(.action | contains("DELETE"))'
```

### **Stap 6: Correlate with User Reports**
```bash
# When user reports issue at specific time, check that timeframe
# Example: Issue reported at 14:30, check 13:30-15:30 window

START_TIME="2025-06-25T13:30:00Z"
END_TIME="2025-06-25T15:30:00Z"

# Check all events in that window
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=2" | \
  jq --arg start "$START_TIME" --arg end "$END_TIME" \
  '.events[] | select(.timestamp >= $start and .timestamp <= $end)'
```

### **Stap 7: Recovery Actions**
```bash
# Use logged content to recreate missing data
# Example: Recreate deleted planning item

# From logs, get original content:
ORIGINAL_CONTENT=$(curl "https://tickedify.com/api/debug/forensic/planning-events" | \
  jq '.events[] | select(.action == "PLANNING_DELETE") | .data.planningContent')

# Recreate using logged data
curl -X POST "https://tickedify.com/api/dagelijkse-planning" \
  -H "Content-Type: application/json" \
  -d "$ORIGINAL_CONTENT"
```

## 📊 Complete Logging Coverage

### 🔄 **Herhalende Taken (KRITIEK voor bug #1)**
| Action | Wanneer | Data Gelogd | Kritiek Level |
|--------|---------|-------------|---------------|
| `CREATE_RECURRING_ATTEMPT` | Nieuwe herhalende taak aanmaken | Volledige task data + herhaling settings | HIGH |
| `CREATE_RECURRING_SUCCESS` | Succesvol aangemaakt | Generated ID + verificatie data | HIGH |
| `CREATE_RECURRING_FAILED` | Fout bij aanmaken | Error message + stack trace | CRITICAL |
| `CREATE_RECURRING_TRANSACTION_START` | Database transactie start | Transaction ID + timestamp | DEBUG |
| `CREATE_RECURRING_ROLLBACK` | Transaction failed | Rollback reason + error context | CRITICAL |
| `UPDATE_ATTEMPT` | Taak update poging | Before/after state + user context | MEDIUM |
| `UPDATE_SUCCESS` | Update succesvol | Final state + affected rows | MEDIUM |

### 📅 **Dagelijkse Planning (KRITIEK voor bug #2)**
| Action | Wanneer | Data Gelogd | Kritiek Level |
|--------|---------|-------------|---------------|
| `PLANNING_DELETE` | Planning item verwijderd | **COMPLETE ITEM CONTENT** + user context | CRITICAL |
| `PLANNING_BULK_DELETE` | Meerdere items verwijderd | **ALL DELETED ITEMS** + operation summary | CRITICAL |
| `PLANNING_CREATE` | Nieuw planning item | Complete item data + position info | MEDIUM |
| `PLANNING_UPDATE` | Planning item gewijzigd | Before/after state | MEDIUM |
| `PLANNING_REORDER` | Planning herordend | Position changes + affected items | LOW |
| `PLANNING_CLEANUP_ORPHANED` | Orphaned cleanup operatie | Deleted orphans + cleanup summary | HIGH |

### 👤 **User Actions & Context**
| Action | Wanneer | Data Gelogd | Kritiek Level |
|--------|---------|-------------|---------------|
| `TEST_USER_SWITCH` | Claude switch naar test account | Test user info + switch context | DEBUG |
| `HTTP_REQUEST` | Alle niet-GET API calls | Method + endpoint + user + timing | LOW |
| `USER_ACTION` | Significante user operaties | User context + IP + User-Agent | MEDIUM |

### 🏗️ **System Events**
| Action | Wanneer | Data Gelogd | Kritiek Level |
|--------|---------|-------------|---------------|
| `SYSTEM_STARTUP` | Server start | Environment info + forensic status | INFO |
| `DATABASE_ERROR` | Database connection issues | Error details + retry attempts | HIGH |
| `DEPLOYMENT_MARKER` | Code deployment | Version + commit hash + timestamp | INFO |

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

## 🎯 Claude Action Items - VERPLICHT bij Data Loss Issues

### **IMMEDIATE RESPONSE bij User Reports:**

#### **Scenario 1: "Herhalende taken zijn weer weg"**
```bash
# 1. Switch to test user first  
curl -X POST https://tickedify.com/api/debug/switch-test-user

# 2. Enable forensic logging
export FORENSIC_DEBUG=true  

# 3. Check recent recurring task events
curl "https://tickedify.com/api/debug/forensic/recurring-events?hours=24" | \
  jq '.events[] | select(.action | contains("RECURRING"))'

# 4. Look for CREATE_RECURRING_FAILED or ROLLBACK events
curl "https://tickedify.com/api/debug/forensic/recurring-events?hours=24" | \
  jq '.events[] | select(.action == "CREATE_RECURRING_FAILED" or .action == "CREATE_RECURRING_ROLLBACK")'

# 5. Correlate with deployment times
curl "https://tickedify.com/api/version" | jq '.deployed_at'
```

#### **Scenario 2: "Dagelijkse planning is verdwenen"**
```bash
# 1. Switch to test user first
curl -X POST https://tickedify.com/api/debug/switch-test-user

# 2. Enable forensic logging  
export FORENSIC_DEBUG=true

# 3. Check ALL planning deletion events
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=48" | \
  jq '.events[] | select(.action | contains("DELETE"))'

# 4. Look for bulk operations that might have cleared planning
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=48" | \
  jq '.events[] | select(.action == "PLANNING_BULK_DELETE" or .action == "PLANNING_CLEANUP_ORPHANED")'

# 5. Get complete deleted content for recovery
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=48" | \
  jq '.events[] | select(.action == "PLANNING_DELETE") | .data.planningContent'
```

### **NEVER Again Spend Hours Debugging Without:**
1. ✅ **Forensic logging enabled** (`FORENSIC_DEBUG=true`)
2. ✅ **Test user isolation** (switch to test@example.com)
3. ✅ **Timeline correlation** (check events around problem time)
4. ✅ **Complete data capture** (log heeft exact content voor recovery)
5. ✅ **User context verification** (correct user_id, not cross-contamination)

### **Emergency Recovery Commands:**
```bash
# Get all deleted planning items from today
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=24" | \
  jq '.events[] | select(.action == "PLANNING_DELETE") | .data.planningContent' > deleted_items.json

# Get all failed recurring task creations
curl "https://tickedify.com/api/debug/forensic/recurring-events?hours=24" | \
  jq '.events[] | select(.action == "CREATE_RECURRING_FAILED") | .data.taskContent' > failed_recurring.json

# Find orphaned cleanup operations (potential cause of data loss)
curl "https://tickedify.com/api/debug/forensic/planning-events?hours=24" | \
  jq '.events[] | select(.action == "PLANNING_CLEANUP_ORPHANED")'
```

### **Success Metrics:**
- **Time to identify root cause**: < 10 minutes (vs hours previously)
- **Data recovery accuracy**: 100% (exact logged content)
- **User downtime**: Minimal (fast diagnosis = fast fix)
- **Prevention**: Proactive detection of patterns

### **⚠️ CRITICAL REMINDERS:**
1. **ALWAYS** enable forensic logging when debugging data loss
2. **ALWAYS** use test user account for Claude testing
3. **NEVER** debug production issues without complete audit trail
4. **ALWAYS** disable forensic logging for production deployment
5. **ALWAYS** correlate events with deployment timestamps

---

Deze forensic logging geeft ons **complete visibility** in wat er gebeurt met kritieke data, zodat we problemen kunnen identificeren en oplossen **binnen 10 minuten in plaats van uren debuggen**.