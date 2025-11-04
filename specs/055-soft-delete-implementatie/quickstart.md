# Quickstart: Soft Delete Feature Testing

**Feature**: 055-soft-delete-implementatie
**Environment**: dev.tickedify.com (staging)
**Auth**: jan@buskens.be / qyqhut-muDvop-fadki9

## Prerequisites

1. **Environment Setup**:
   ```bash
   # Set staging base URL
   export BASE_URL="https://dev.tickedify.com/api"

   # Pre-compute date for variable use
   export TODAY=$(date +%Y-%m-%d)
   ```

2. **Authentication**:
   - Login via UI: https://dev.tickedify.com/app
   - Or get token via API:
   ```bash
   TOKEN=$(curl -s -L -k "$BASE_URL/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}' \
     | jq -r '.token')
   ```

3. **Helper Functions**:
   ```bash
   # API call helper
   api_call() {
     local method=$1
     local endpoint=$2
     local data=$3

     if [ -z "$data" ]; then
       curl -s -L -k -X "$method" "$BASE_URL$endpoint" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json"
     else
       curl -s -L -k -X "$method" "$BASE_URL$endpoint" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d "$data"
     fi
   }
   ```

## Test Scenario 1: Soft Delete een Normale Taak

**Doel**: Verifieer dat een taak soft deleted wordt en uit normale lijsten verdwijnt

**Steps**:
```bash
# 1. Create test taak
TASK_ID=$(api_call POST "/taak" '{
  "tekst": "Test taak voor soft delete",
  "lijst": "acties"
}' | jq -r '.id')

echo "Created task: $TASK_ID"

# 2. Verify taak in acties lijst
api_call GET "/lijst/acties" | jq ".taken[] | select(.id == \"$TASK_ID\")"
# Expected: Taak aanwezig

# 3. Soft delete de taak
api_call PUT "/taak/$TASK_ID/soft-delete" | jq '.'
# Expected: { "success": true, "verwijderd_op": "...", "definitief_verwijderen_op": "..." }

# 4. Verify taak NIET meer in acties lijst
api_call GET "/lijst/acties" | jq ".taken[] | select(.id == \"$TASK_ID\")"
# Expected: Geen output (taak gefilterd)

# 5. Verify taak WEL in prullenbak
api_call GET "/prullenbak" | jq ".taken[] | select(.id == \"$TASK_ID\")"
# Expected: Taak aanwezig met verwijderd_op en dagen_tot_verwijdering
```

**Acceptance Criteria**:
- ✅ Soft delete returnt succes met timestamps
- ✅ Taak verdwijnt uit acties lijst
- ✅ Taak verschijnt in prullenbak met countdown

---

## Test Scenario 2: Restore een Soft Deleted Taak

**Doel**: Verifieer dat restore alle properties behoudt en taak terugzet

**Steps**:
```bash
# 1. Use taak from scenario 1 (already soft deleted)
# Or create new soft deleted taak:
TASK_ID=$(api_call POST "/taak" '{
  "tekst": "Test restore taak",
  "lijst": "acties",
  "prioriteit": "hoog",
  "duur": 60
}' | jq -r '.id')

api_call PUT "/taak/$TASK_ID/soft-delete" > /dev/null

# 2. Verify taak in prullenbak
api_call GET "/prullenbak" | jq ".taken[] | select(.id == \"$TASK_ID\") | {id, tekst, prioriteit, duur}"

# 3. Restore de taak
api_call POST "/taak/$TASK_ID/restore" | jq '.'
# Expected: { "success": true, "taak": { ... alle properties ... } }

# 4. Verify taak terug in acties lijst
api_call GET "/lijst/acties" | jq ".taken[] | select(.id == \"$TASK_ID\") | {id, tekst, prioriteit, duur, verwijderd_op}"
# Expected: Taak aanwezig, verwijderd_op = null, alle properties behouden

# 5. Verify taak NIET meer in prullenbak
api_call GET "/prullenbak" | jq ".taken[] | select(.id == \"$TASK_ID\")"
# Expected: Geen output
```

**Acceptance Criteria**:
- ✅ Restore succesvol
- ✅ Taak terug in originele lijst
- ✅ Alle properties behouden (prioriteit, duur, etc.)
- ✅ verwijderd_op = null

---

## Test Scenario 3: Herhalende Taak Soft Delete

**Doel**: Verifieer dat herhaling gestopt wordt bij soft delete

**Steps**:
```bash
# 1. Create herhalende taak
RECURRING_ID=$(api_call POST "/taak" '{
  "tekst": "Recurring test taak",
  "lijst": "acties",
  "herhaling_type": "weekly-1-1,3,5",
  "herhaling_actief": true
}' | jq -r '.id')

# 2. Verify herhaling actief
api_call GET "/taak/$RECURRING_ID" | jq '{id, herhaling_type, herhaling_actief}'
# Expected: herhaling_actief = true

# 3. Soft delete herhalende taak
api_call PUT "/taak/$RECURRING_ID/soft-delete" | jq '.'
# Expected: { "success": true, "herhaling_gestopt": true }

# 4. Verify herhaling gestopt
api_call GET "/prullenbak" | jq ".taken[] | select(.id == \"$RECURRING_ID\") | {herhaling_type, herhaling_actief}"
# Expected: herhaling_actief = false

# 5. Restore en verify herhaling blijft gestopt
api_call POST "/taak/$RECURRING_ID/restore" > /dev/null
api_call GET "/taak/$RECURRING_ID" | jq '{herhaling_type, herhaling_actief}'
# Expected: herhaling_actief = false (manual restart needed)
```

**Acceptance Criteria**:
- ✅ Soft delete zet herhaling_actief op false
- ✅ Bij restore blijft herhaling_actief false
- ✅ User kan via UI herhaling manual reactiveren

---

## Test Scenario 4: Bulk Soft Delete

**Doel**: Verifieer bulk operatie voor meerdere taken

**Steps**:
```bash
# 1. Create 3 test taken
IDS=()
for i in 1 2 3; do
  ID=$(api_call POST "/taak" "{
    \"tekst\": \"Bulk test taak $i\",
    \"lijst\": \"acties\"
  }" | jq -r '.id')
  IDS+=("$ID")
done

echo "Created tasks: ${IDS[@]}"

# 2. Bulk soft delete
BULK_IDS=$(printf ',"%s"' "${IDS[@]}" | cut -c 2-)
api_call POST "/bulk/soft-delete" "{
  \"ids\": [$BULK_IDS]
}" | jq '.'
# Expected: { "success": true, "deleted_count": 3, "failed": [] }

# 3. Verify alle taken in prullenbak
api_call GET "/prullenbak" | jq "[.taken[] | select(.tekst | contains(\"Bulk test\"))] | length"
# Expected: 3
```

**Acceptance Criteria**:
- ✅ Bulk operatie succesvol voor alle taken
- ✅ deleted_count = aantal tasks
- ✅ failed array leeg

---

## Test Scenario 5: Prullenbak Weergave

**Doel**: Verifieer prullenbak toont juiste data en sorting

**Steps**:
```bash
# 1. Create taken met verschillende delete tijden (simulate met timestamps)
# Note: Voor echte test moet tijd verstrijken, of manual SQL update

# 2. Haal prullenbak op
api_call GET "/prullenbak" | jq '{
  total: .total,
  taken: [.taken[] | {
    tekst,
    verwijderd_op,
    dagen_tot_verwijdering,
    lijst: .lijst
  }]
}'

# 3. Verify sorting (oudste eerst)
api_call GET "/prullenbak" | jq '[.taken[].verwijderd_op] | .[0] < .[-1]'
# Expected: true (eerste is oudste)

# 4. Verify countdown calculation
api_call GET "/prullenbak" | jq '.taken[0] | {
  verwijderd_op,
  definitief_verwijderen_op,
  dagen_tot_verwijdering,
  calculated: ((definitief_verwijderen_op | fromdateiso8601) - (now)) / 86400 | floor
}'
# Expected: dagen_tot_verwijdering matches calculated
```

**Acceptance Criteria**:
- ✅ Prullenbak toont alle soft deleted taken
- ✅ Sorting: oudste eerst
- ✅ dagen_tot_verwijdering correct berekend
- ✅ Originele lijst property behouden

---

## Test Scenario 6: Cleanup Trigger Test

**Doel**: Verifieer dagelijkse cleanup mechanism

**Steps**:
```bash
# Setup: Create oude soft deleted taak (via SQL omdat we tijd kunnen simuleren)
# Note: Voor local testing, gebruik database direct access

# 1. Check huidige laatste_cleanup_op
api_call GET "/user/info" | jq '{laatste_cleanup_op}'

# 2. Create oude soft deleted taak (>30 dagen - via SQL):
# SQL: INSERT INTO taken (id, tekst, user_id, lijst, verwijderd_op, definitief_verwijderen_op)
#      VALUES ('old-task', 'Old soft deleted', '<user-id>', 'acties',
#              NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days');

# 3. Trigger cleanup via any API call (middleware check)
api_call GET "/lijst/inbox" > /dev/null

# 4. Verify oude taak permanent verwijderd
api_call GET "/prullenbak" | jq '.taken[] | select(.id == "old-task")'
# Expected: Geen output (permanent deleted)

# 5. Verify laatste_cleanup_op updated
api_call GET "/user/info" | jq '{laatste_cleanup_op}'
# Expected: Today's date
```

**Acceptance Criteria**:
- ✅ Cleanup triggert bij eerste API call van de dag
- ✅ Taken >30 dagen worden permanent verwijderd
- ✅ laatste_cleanup_op updated naar vandaag
- ✅ Cleanup max 1x per dag

**Note**: Dit scenario vereist time manipulation of SQL access voor realistic testing

---

## Test Scenario 7: Query Filtering Verificatie

**Doel**: Verifieer dat soft deleted taken gefilterd zijn uit ALLE endpoints

**Endpoints to Test**:
```bash
# Create soft deleted taak
TASK_ID=$(api_call POST "/taak" '{
  "tekst": "Filter test taak",
  "lijst": "acties",
  "verschijndatum": "2025-11-10"
}' | jq -r '.id')

api_call PUT "/taak/$TASK_ID/soft-delete" > /dev/null

# Test 1: /api/lijst/:naam
api_call GET "/lijst/acties" | jq ".taken[] | select(.id == \"$TASK_ID\")"
# Expected: Geen output

# Test 2: /api/uitgesteld
api_call GET "/uitgesteld" | jq ".taken[] | select(.id == \"$TASK_ID\")"
# Expected: Geen output

# Test 3: /api/dagelijkse-planning/:datum
api_call GET "/dagelijkse-planning/$TODAY" | jq ".. | select(.id? == \"$TASK_ID\")"
# Expected: Geen output

# Test 4: Direct /api/taak/:id (should return 404 or filtered)
api_call GET "/taak/$TASK_ID" | jq '.'
# Expected: 404 of filtered response

# Test 5: Search endpoints (indien aanwezig)
# ... test alle andere endpoints die taken kunnen tonen
```

**Acceptance Criteria**:
- ✅ Soft deleted taken verschijnen NERGENS behalve prullenbak
- ✅ Alle endpoints gefilterd op verwijderd_op IS NULL

---

## Test Scenario 8: Subtaken & Bijlagen Behavior

**Doel**: Verifieer dat subtaken en bijlagen blijven gekoppeld

**Steps**:
```bash
# 1. Create taak met subtaak
TASK_ID=$(api_call POST "/taak" '{
  "tekst": "Parent taak met subtaken",
  "lijst": "acties"
}' | jq -r '.id')

SUBTASK_ID=$(api_call POST "/subtaak" "{
  \"parent_taak_id\": \"$TASK_ID\",
  \"titel\": \"Test subtaak\"
}" | jq -r '.id')

# 2. Verify subtaak aanwezig
api_call GET "/taak/$TASK_ID/subtaken" | jq '.subtaken[] | select(.id == "'$SUBTASK_ID'")'
# Expected: Subtaak aanwezig

# 3. Soft delete parent taak
api_call PUT "/taak/$TASK_ID/soft-delete" > /dev/null

# 4. Verify subtaak nog steeds gekoppeld (via prullenbak)
api_call GET "/prullenbak" | jq ".taken[] | select(.id == \"$TASK_ID\")"
# Note: Check dat subtaken endpoint nog werkt voor soft deleted taken

# 5. Restore parent
api_call POST "/taak/$TASK_ID/restore" > /dev/null

# 6. Verify subtaak nog steeds aanwezig
api_call GET "/taak/$TASK_ID/subtaken" | jq '.subtaken[] | select(.id == "'$SUBTASK_ID'")'
# Expected: Subtaak nog steeds aanwezig

# 7. Permanent delete (via cleanup simulation)
# Verify CASCADE werkt normaal bij hard delete
```

**Acceptance Criteria**:
- ✅ Soft delete laat subtaken intact (geen CASCADE)
- ✅ Restore herstelt volledige subtaken structuur
- ✅ Permanent delete triggert CASCADE normaal

---

## Test Scenario 9: UI Prullenbak Scherm (Playwright)

**Doel**: Verifieer UI voor prullenbak scherm

**Note**: Dit scenario gebruikt tickedify-testing agent voor browser automation

**Steps**:
1. Login op dev.tickedify.com/app
2. Create test taken en soft delete via UI
3. Click "Prullenbak" menu item
4. Verify lijst toont:
   - Taak tekst
   - "Verwijderd op" datum
   - "Permanent verwijderen over X dagen" countdown
   - Restore knop per taak
5. Click restore knop
6. Verify taak verdwijnt uit prullenbak
7. Verify taak terug in originele lijst

**Acceptance Criteria**:
- ✅ Prullenbak menu item zichtbaar en clickable
- ✅ Lijst rendering correct met metadata
- ✅ Restore knop werkt
- ✅ UI updates correct na restore

**Implementation**: Gebruik `tickedify-testing` sub-agent voor deze test

---

## Test Scenario 10: Edge Cases

### 10a. Restore van Non-Existent Taak
```bash
api_call POST "/taak/non-existent-id/restore" | jq '.'
# Expected: 404 error
```

### 10b. Soft Delete Already Deleted Taak
```bash
TASK_ID=$(api_call POST "/taak" '{"tekst":"Test","lijst":"acties"}' | jq -r '.id')
api_call PUT "/taak/$TASK_ID/soft-delete" > /dev/null
api_call PUT "/taak/$TASK_ID/soft-delete" | jq '.'
# Expected: 404 (taak al soft deleted)
```

### 10c. Restore van Other User's Taak
```bash
# Login as different user
# Try to restore task from first user
# Expected: 403 Forbidden
```

### 10d. Bulk Delete met Invalid IDs
```bash
api_call POST "/bulk/soft-delete" '{
  "ids": ["valid-id", "invalid-id", "another-valid"]
}' | jq '.'
# Expected: { "success": true, "deleted_count": 2, "failed": [{"id":"invalid-id","reason":"..."}] }
```

**Acceptance Criteria**:
- ✅ All edge cases handled gracefully
- ✅ Proper error messages
- ✅ No crashes or data corruption

---

## Performance Benchmarks

### Query Overhead Test
```bash
# Before soft delete (baseline)
time api_call GET "/lijst/acties" > /dev/null

# After soft delete with 100 soft deleted taken
# Expected: <10ms overhead

# Cleanup performance test
time api_call GET "/admin/cleanup-stats" > /dev/null
# Expected: <500ms voor 1000 soft deleted taken
```

---

## Cleanup After Testing

```bash
# Restore all test taken
api_call GET "/prullenbak" | jq -r '.taken[].id' | while read id; do
  api_call POST "/taak/$id/restore" > /dev/null
done

# Hard delete test taken
# (via SQL of wacht 30 dagen voor automatische cleanup)
```

---

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Token expired: login opnieuw
   - Check Authorization header format

2. **404 Taak niet gevonden**
   - Taak al permanent verwijderd
   - Check user_id scope

3. **Taken verschijnen nog in lijsten**
   - Query filtering niet correct geïmplementeerd
   - Check alle endpoints voor `WHERE verwijderd_op IS NULL`

4. **Cleanup werkt niet**
   - Check laatste_cleanup_op datum
   - Verify middleware trigger logic
   - Check 30-dagen calculation

---

## Success Criteria Checklist

- [ ] Scenario 1: Soft delete werkt
- [ ] Scenario 2: Restore behoudt alle properties
- [ ] Scenario 3: Herhaling stopt bij soft delete
- [ ] Scenario 4: Bulk operaties werken
- [ ] Scenario 5: Prullenbak toont juiste data
- [ ] Scenario 6: Cleanup trigger werkt
- [ ] Scenario 7: Query filtering overal correct
- [ ] Scenario 8: Subtaken/bijlagen intact
- [ ] Scenario 9: UI prullenbak scherm werkt
- [ ] Scenario 10: Edge cases handled

**Feature is compleet als alle scenarios PASS ✅**
