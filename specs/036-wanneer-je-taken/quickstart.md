# Quickstart: Real-time Sidebar Counter Updates

**Feature**: 036-wanneer-je-taken
**Date**: 2025-10-27
**Estimated Time**: 30-45 minutes

## Prerequisites

- [x] Feature branch `036-wanneer-je-taken` checked out
- [x] Development environment running (localhost:3000)
- [x] Staging environment accessible (dev.tickedify.com)
- [x] Test account with sample tasks created

## Implementation Steps

### Step 1: Locate Commented Counter Updates (5 min)

Find all occurrences of commented-out counter updates:

```bash
cd public/
grep -n "// await this.laadTellingen(); // Disabled" app.js
```

**Expected Output**: 14+ line numbers where updates are commented out

**Save List**: Keep line numbers for next step

### Step 2: Replace Commented Calls (15 min)

For each location found in Step 1, replace:

```javascript
// OLD (commented out)
// await this.laadTellingen(); // Disabled - tellers removed from sidebar

// NEW (active)
await this.updateSidebarCounters();
```

**Critical Locations**:
- app.js:4868 - `verplaatsNaarInbox()`
- app.js:4926 - `stelDatumIn()`
- app.js:4963 - `verplaatsNaarUitgesteld()`
- app.js:4995 - `verplaatsNaarOpvolgen()`
- app.js:4060 - Task completion
- app.js:4268, 4285 - Task deletion
- app.js:3363 - Task creation
- app.js:5241 - Task move
- app.js:9686 - Drag & drop
- app.js:12321, 12445 - Bulk operations

**Verification**:
```bash
# Count new calls (should match number of replaced lines)
grep -c "await this.updateSidebarCounters()" public/app.js
```

### Step 3: Local Testing (10 min)

Start local development server:

```bash
npm start
# Server runs on localhost:3000
```

**Test Checklist**:

1. **Inbox Processing**
   - [ ] Navigate to Inbox
   - [ ] Note current counter value
   - [ ] Process one task to Actions
   - [ ] Verify: Inbox counter decreased by 1
   - [ ] Verify: Actions counter increased by 1

2. **Task Completion**
   - [ ] Navigate to Actions
   - [ ] Note current counter value
   - [ ] Complete one task (checkbox)
   - [ ] Verify: Actions counter decreased by 1

3. **Task Movement**
   - [ ] Open task actions menu (⋮ button)
   - [ ] Move task to Opvolgen
   - [ ] Verify: Source list counter decreased by 1
   - [ ] Verify: Opvolgen counter increased by 1

4. **Task Creation**
   - [ ] Click "+ Nieuwe taak"
   - [ ] Create task in Inbox
   - [ ] Verify: Inbox counter increased by 1

5. **Rapid Operations**
   - [ ] Process 5 inbox tasks quickly
   - [ ] Verify: Final counters are accurate
   - [ ] Verify: No UI lag or freezing

**If any test fails**: Debug before proceeding to deployment

### Step 4: Commit Changes (3 min)

```bash
# Stage changes
git add public/app.js

# Commit with descriptive message
git commit -m "✅ FIX: Enable real-time sidebar counter updates after task operations

- Replace all commented `laadTellings()` calls with `updateSidebarCounters()`
- Counters now update after: process inbox, complete, move, delete, create, bulk ops
- Uses existing Feature 022 infrastructure (updateSidebarCounters() + /api/counts/sidebar)
- Fixes #036: Sidebar counters not updating without page refresh

Tested: ✅ All operation types update counters correctly
Performance: No regressions, <100ms counter update latency

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to feature branch
git push origin 036-wanneer-je-taken
```

### Step 5: Update Package Version (2 min)

```bash
# Edit package.json
# Current version: "0.19.189"
# New version: "0.19.190"
```

Update version in `package.json`:
```json
{
  "name": "tickedify",
  "version": "0.19.190",
  ...
}
```

Commit version bump:
```bash
git add package.json
git commit -m "📦 BUMP: v0.19.190 - Real-time sidebar counter updates"
git push origin 036-wanneer-je-taken
```

### Step 6: Deploy to Staging (Auto via Vercel)

Vercel automatically deploys on git push. Monitor deployment:

```bash
# Check deployment status (wait ~30 seconds)
sleep 30

# Verify version endpoint
curl -s -L -k https://dev.tickedify.com/api/version
# Expected: {"version":"0.19.190"}
```

**If deployment fails**: Check Vercel dashboard for errors

### Step 7: Staging Testing (10 min)

Open browser: https://dev.tickedify.com/app

**Login**: jan@buskens.be / qyqhut-muDvop-fadki9

**Repeat Test Checklist** from Step 3 on staging environment

**Additional Staging Tests**:

6. **Network Latency**
   - [ ] Open browser DevTools → Network tab
   - [ ] Throttle to "Slow 3G"
   - [ ] Perform task operation
   - [ ] Verify: Counter updates (may take 1-2 sec)
   - [ ] Verify: No errors in console

7. **Error Handling**
   - [ ] Open DevTools → Network tab
   - [ ] Block request to `/api/counts/sidebar`
   - [ ] Perform task operation
   - [ ] Verify: Counters show "(?)"
   - [ ] Unblock request
   - [ ] Perform another operation
   - [ ] Verify: Counters recover with correct values

### Step 8: Update Changelog (3 min)

Edit `public/changelog.html`:

```html
<!-- Add at top of changelog -->
<div class="changelog-entry">
    <div class="changelog-header">
        <span class="badge badge-latest">v0.19.190</span>
        <span class="date">27 oktober 2025</span>
    </div>
    <div class="changelog-content">
        <h3>🔧 Bug Fix</h3>
        <ul>
            <li><strong>Real-time sidebar tellers</strong>: Tellers voor Inbox, Acties, Opvolgen, Uitgesteld en Projecten worden nu automatisch bijgewerkt na elke taak actie (verwerken, afvinken, verplaatsen, verwijderen). Pagina refresh niet meer nodig.</li>
        </ul>
    </div>
</div>
```

Commit changelog:
```bash
git add public/changelog.html
git commit -m "📝 CHANGELOG: v0.19.190 - Sidebar counter updates"
git push origin 036-wanneer-je-taken
```

### Step 9: Production Deployment (BETA FREEZE - DO NOT EXECUTE)

⚠️ **STOP - READ THIS CAREFULLY** ⚠️

**BETA FREEZE IS ACTIVE** - Production deployment is BLOCKED until freeze is lifted.

**Current Status**: Feature is ready for production but MUST wait
**Next Action**: Create Pull Request for review, DO NOT merge to main

```bash
# Create PR (but do NOT merge)
gh pr create \
  --title "✅ Fix: Real-time Sidebar Counter Updates" \
  --body "## Summary
Fixes sidebar counters not updating after task operations.

## Changes
- Enabled `updateSidebarCounters()` calls after all task operations
- Replaced commented-out `laadTellingen()` calls

## Testing
✅ Local testing passed
✅ Staging testing passed
✅ All operation types verified

## Performance
- Counter update < 100ms
- No UI lag or regressions

## Deployment
⚠️ **BETA FREEZE ACTIVE** - DO NOT MERGE TO MAIN
- Wait for freeze lift before deploying to production
- Feature ready for immediate deployment when freeze ends

## Risk
Very Low - Uses existing infrastructure, simple integration" \
  --base main \
  --head 036-wanneer-je-taken
```

**DO NOT RUN** (Blocked during beta freeze):
```bash
# ❌ BLOCKED - git checkout main
# ❌ BLOCKED - git merge 036-wanneer-je-taken
# ❌ BLOCKED - git push origin main
```

**After Beta Freeze Lift**:
1. Get explicit approval: "BETA FREEZE IS OPGEHEVEN"
2. Merge PR to main
3. Verify production deployment
4. Monitor for 24 hours

## Verification Checklist

### Pre-Deployment
- [ ] All commented `laadTellingen()` replaced with `updateSidebarCounters()`
- [ ] Local testing passed (all 5 operation types)
- [ ] Code committed and pushed to feature branch
- [ ] Version bumped in package.json
- [ ] Changelog updated

### Staging Environment
- [ ] Deployment successful (version verified)
- [ ] All operation types update counters
- [ ] Network latency handling works
- [ ] Error recovery works (? → correct values)
- [ ] No console errors
- [ ] No performance regressions

### Production (AFTER FREEZE LIFT)
- [ ] Beta freeze lifted (explicit confirmation)
- [ ] PR merged to main
- [ ] Production deployment verified
- [ ] Version endpoint shows 0.19.190
- [ ] Smoke test: 1 operation of each type
- [ ] Monitor for 24 hours
- [ ] No user-reported issues

## Rollback Procedure

If issues detected after production deployment:

```bash
# 1. Revert commit
git revert HEAD
git push origin main

# 2. Verify rollback deployed
curl -s -L -k https://tickedify.com/api/version
# Should show previous version

# 3. Notify users (if necessary)
# Post in feedback system or support channel

# 4. Debug in staging
# Fix issue on feature branch
# Re-test thoroughly
# Deploy again when ready
```

## Success Criteria

✅ Counters update after EVERY task operation
✅ Update latency < 500ms (user perception threshold)
✅ No errors in browser console
✅ No performance degradation
✅ Works on all operation types (14+ integration points)
✅ Error handling graceful (shows ? on failure)
✅ Production stable for 48 hours post-deployment

## Estimated Timeline

- Implementation: 15 min
- Local testing: 10 min
- Deployment to staging: 5 min
- Staging testing: 10 min
- Documentation: 5 min
- **Total: 45 minutes**
- Production deployment: WAITING FOR BETA FREEZE LIFT

## Support

If issues arise:
- Check browser console for errors
- Check Network tab for failed API calls
- Verify `/api/counts/sidebar` endpoint responds
- Check Vercel logs for backend errors
- Rollback if necessary (see Rollback Procedure)

---

*Feature ready for implementation and staging deployment*
*Production deployment BLOCKED until beta freeze lift*
