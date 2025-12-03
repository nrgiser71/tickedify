# Quickstart: Backup Strategie

**Feature**: 071-de-backup-strategie
**Date**: 2025-12-03

---

## Prerequisites

1. Backblaze B2 credentials configured (already present)
2. Admin access to Tickedify
3. Vercel Pro plan for cron jobs

---

## Validation Steps

### Step 1: Verify Database Schema

**Action**: Check that new tables exist

```bash
curl -s -L -k "https://dev.tickedify.com/api/debug/database-tables" | jq
```

**Expected**: Response includes `backup_metadata` and `transaction_log` tables

---

### Step 2: Create Manual Backup

**Action**: Trigger a manual backup via admin API

```bash
# First login as admin
curl -s -L -k -X POST "https://dev.tickedify.com/api/admin/auth" \
  -H "Content-Type: application/json" \
  -d '{"password": "YOUR_ADMIN_PASSWORD"}' \
  -c cookies.txt

# Create backup
curl -s -L -k -X POST "https://dev.tickedify.com/api/admin/backups/create" \
  -b cookies.txt | jq
```

**Expected**:
```json
{
  "id": "uuid",
  "backup_id": "backup-2025-12-03-123456",
  "status": "completed",
  "size_bytes": 12345,
  "record_counts": {
    "users": 5,
    "taken": 100,
    ...
  }
}
```

---

### Step 3: List Backups

**Action**: Verify backup appears in list

```bash
curl -s -L -k "https://dev.tickedify.com/api/admin/backups" \
  -b cookies.txt | jq
```

**Expected**: Array with at least 1 backup entry

---

### Step 4: Download Backup

**Action**: Download the backup file

```bash
curl -s -L -k "https://dev.tickedify.com/api/admin/backups/BACKUP_ID" \
  -b cookies.txt \
  -o backup.json.gz

# Verify it's valid gzip
gunzip -t backup.json.gz && echo "Valid gzip file"
```

**Expected**: File downloads, gzip validation passes

---

### Step 5: Verify Transaction Logging

**Action**: Create a task and verify it's logged

```bash
# Create a task (as normal user)
curl -s -L -k -X POST "https://dev.tickedify.com/api/taak" \
  -H "Content-Type: application/json" \
  -d '{"titel": "Test task for backup logging"}' \
  -b user_cookies.txt

# Check transaction log (as admin)
curl -s -L -k "https://dev.tickedify.com/api/admin/transaction-log?limit=5" \
  -b cookies.txt | jq
```

**Expected**: Recent entry with `operation: "INSERT"`, `table_name: "taken"`

---

### Step 6: Test Undo Operation

**Action**: Undo the task creation

```bash
# Get the transaction log entry ID from Step 5
ENTRY_ID=123

curl -s -L -k -X POST "https://dev.tickedify.com/api/admin/transaction-log/$ENTRY_ID/undo" \
  -b cookies.txt | jq
```

**Expected**: `{ "success": true, "message": "Operation undone" }`

---

### Step 7: Verify Cron Endpoint

**Action**: Test the cron backup endpoint

```bash
curl -s -L -k "https://dev.tickedify.com/api/cron/backup" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" | jq
```

**Expected**:
```json
{
  "success": true,
  "backupId": "backup-...",
  "cleanedUp": 0
}
```

---

### Step 8: Test Restore (Staging Only!)

**Action**: Restore from backup on staging

```bash
# WARNING: Only run on staging!
curl -s -L -k -X POST "https://dev.tickedify.com/api/admin/backups/BACKUP_ID/restore" \
  -H "Content-Type: application/json" \
  -d '{"replayTransactions": true}' \
  -b cookies.txt | jq
```

**Expected**:
```json
{
  "success": true,
  "message": "Restore completed",
  "tablesRestored": 8,
  "transactionsReplayed": 5
}
```

---

### Step 9: Admin UI Verification

**Action**: Verify backup controls in admin dashboard

1. Navigate to `https://dev.tickedify.com/admin2.html`
2. Login with admin credentials
3. Click "Backups" in sidebar
4. Verify:
   - Backup list is visible
   - "Create Backup" button works
   - Download buttons work
   - Transaction log section visible

**Expected**: All UI elements functional

---

### Step 10: Verify Cleanup

**Action**: Check that old backups are cleaned up

```bash
# Wait 24+ hours or manually trigger cleanup
curl -s -L -k "https://dev.tickedify.com/api/admin/backups?status=completed" \
  -b cookies.txt | jq '.backups | length'
```

**Expected**: Only backups < 24 hours old remain

---

## Success Criteria Summary

| Test | Requirement | Pass Criteria |
|------|-------------|---------------|
| Schema | FR-001 | Tables exist |
| Create Backup | FR-001, FR-012 | Returns completed backup |
| List Backups | FR-009 | Shows all backups |
| Download | FR-010 | Valid gzip file |
| Transaction Log | FR-005, FR-006 | Entries with old/new data |
| Undo | FR-014 | Successfully reverses operation |
| Cron | FR-001 | Backup created on schedule |
| Restore | FR-011, FR-015-18 | Data restored correctly |
| Admin UI | FR-009-014 | All controls functional |
| Cleanup | FR-004 | Old backups removed |

---

## Troubleshooting

### Backup fails with timeout
- Check database size: should be < 1GB
- Check Vercel function logs
- Consider increasing timeout in vercel.json

### Transaction log not recording
- Verify middleware is applied to endpoints
- Check that table is in TRACKED_TABLES list
- Check server logs for errors

### Restore fails
- Verify backup exists and is complete
- Check maintenance mode is working
- Review foreign key constraints order

### B2 upload fails
- Verify B2 credentials in environment
- Check B2 bucket permissions
- Review storage-manager.js error logs
