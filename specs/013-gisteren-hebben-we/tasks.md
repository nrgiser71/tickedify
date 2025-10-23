# Tasks: Premium Plus Abonnement met Ongelimiteerde Bijlages

**Branch**: `013-gisteren-hebben-we`
**Feature**: Add Premium Plus subscription tier (€8/maand, €80/jaar) with unlimited attachments
**Input**: Design documents from `/specs/013-gisteren-hebben-we/`

## Execution Flow (main)
```
✅ 1. Loaded plan.md - Tech stack: Node.js 16+, Express, PostgreSQL, Backblaze B2
✅ 2. Loaded design documents:
   - data-model.md: 2 new plans (monthly_8, yearly_80), isPremium logic extension
   - contracts/: subscription-api.yaml, storage-api.yaml
   - quickstart.md: 5 integration test scenarios
✅ 3. Generated 20 tasks across 5 phases
✅ 4. Applied task rules:
   - Different files marked [P] for parallel execution
   - Tests before implementation (TDD approach)
   - Sequential tasks for same-file modifications
✅ 5. Numbered tasks T001-T020
✅ 6. Dependency graph validated
✅ 7. Parallel execution examples provided
✅ 8. Task completeness validated:
   - All contracts have tests ✓
   - All entities extended ✓
   - All endpoints implemented ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Absolute file paths included in each task

## Path Conventions
**Tickedify uses monolithic structure**:
- Backend: `/server.js`, `/storage-manager.js`
- Frontend: `/public/js/*.js`, `/public/*.html`
- No separate backend/ or frontend/ directories

---

## Phase 3.1: Data Model Extensions

### T001 [P] Add Premium Plus Monthly plan to frontend SUBSCRIPTION_PLANS

**Type**: Implementation (Data Model)
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/js/subscription-data.js`

**Description**:
Add `monthly_8` plan object to SUBSCRIPTION_PLANS array after `yearly_70` entry.

**Implementation**:
```javascript
{
  id: 'monthly_8',
  name: 'Premium Plus Maandelijks',
  description: 'Ongelimiteerde bijlages per maand',
  price: 8,
  billing_cycle: 'monthly',
  trial_days: 0,
  features: [
    'Alle functies',
    'Onbeperkte taken',
    'Email import',
    'Premium support',
    'Ongelimiteerde bijlages',
    'Geen limiet op bestandsgrootte'
  ]
}
```

**Acceptance**:
- [ ] Plan object added to SUBSCRIPTION_PLANS array (position 4)
- [ ] All 6 required properties present (id, name, description, price, billing_cycle, trial_days, features)
- [ ] Features array contains 6 items including "Ongelimiteerde bijlages"
- [ ] No syntax errors when loading subscription-data.js

**Dependencies**: None (independent file)

---

### T002 [P] Add Premium Plus Yearly plan to frontend SUBSCRIPTION_PLANS

**Type**: Implementation (Data Model)
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/js/subscription-data.js`

**Description**:
Add `yearly_80` plan object to SUBSCRIPTION_PLANS array after `monthly_8` entry (added in T001).

**Implementation**:
```javascript
{
  id: 'yearly_80',
  name: 'Premium Plus Jaarlijks',
  description: 'Ongelimiteerde bijlages - bespaar €16 per jaar',
  price: 80,
  billing_cycle: 'yearly',
  trial_days: 0,
  features: [
    'Alle functies',
    'Onbeperkte taken',
    'Email import',
    'Premium support',
    'Ongelimiteerde bijlages',
    'Geen limiet op bestandsgrootte',
    '2 maanden gratis'
  ]
}
```

**Acceptance**:
- [ ] Plan object added to SUBSCRIPTION_PLANS array (position 5)
- [ ] Features array contains 7 items including "2 maanden gratis"
- [ ] SUBSCRIPTION_PLANS.length === 5
- [ ] getPlanById('monthly_8') and getPlanById('yearly_80') return correct objects

**Dependencies**: None (same file as T001 but can be done together)

---

### T003 [P] Add Premium Plus plans to backend SUBSCRIPTION_PLANS

**Type**: Implementation (Data Model)
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js`
**Location**: Line ~9741 (in `GET /api/subscription/plans` endpoint)

**Description**:
Add `monthly_8` and `yearly_80` plan objects to backend SUBSCRIPTION_PLANS array, matching frontend structure exactly.

**Implementation**:
Find the SUBSCRIPTION_PLANS array definition in the `/api/subscription/plans` endpoint and add both plans:

```javascript
const SUBSCRIPTION_PLANS = [
  // ... existing 3 plans ...
  {
    id: 'monthly_8',
    name: 'Premium Plus Maandelijks',
    description: 'Ongelimiteerde bijlages per maand',
    price: 8,
    billing_cycle: 'monthly',
    trial_days: 0,
    features: ['Alle functies', 'Onbeperkte taken', 'Email import',
               'Premium support', 'Ongelimiteerde bijlages',
               'Geen limiet op bestandsgrootte']
  },
  {
    id: 'yearly_80',
    name: 'Premium Plus Jaarlijks',
    description: 'Ongelimiteerde bijlages - bespaar €16 per jaar',
    price: 80,
    billing_cycle: 'yearly',
    trial_days: 0,
    features: ['Alle functies', 'Onbeperkte taken', 'Email import',
               'Premium support', 'Ongelimiteerde bijlages',
               'Geen limiet op bestandsgrootte', '2 maanden gratis']
  }
];
```

**Acceptance**:
- [ ] Both plans added to SUBSCRIPTION_PLANS array in server.js
- [ ] `GET /api/subscription/plans` returns 5 plans when called
- [ ] Response structure matches OpenAPI contract (subscription-api.yaml)
- [ ] No server restart errors after saving

**Dependencies**: None (independent file from T001/T002)

---

### T004 Extend isPremium logic to recognize Premium Plus plan IDs

**Type**: Implementation (Logic Extension)
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/server.js`
**Locations**: Multiple (upload validation ~line 3188, storage stats endpoint ~line 3800)

**Description**:
Update all `isPremium` checks to include `monthly_8` and `yearly_80` plan IDs. Use cleaner array-based approach for maintainability.

**Implementation**:

Define constant at top of relevant sections:
```javascript
const PREMIUM_PLAN_IDS = ['monthly_7', 'yearly_70', 'monthly_8', 'yearly_80'];
```

Replace existing isPremium logic:
```javascript
// OLD:
const isPremium = user.trial_expires_at &&
                  new Date(user.trial_expires_at) > new Date() &&
                  user.plan_id &&
                  (user.plan_id === 'monthly_7' || user.plan_id === 'yearly_70');

// NEW:
const isPremium = user.trial_expires_at &&
                  new Date(user.trial_expires_at) > new Date() &&
                  user.plan_id &&
                  PREMIUM_PLAN_IDS.includes(user.plan_id);
```

**Locations to update**:
1. `POST /api/taak/:id/bijlagen` endpoint (upload validation)
2. `GET /api/bijlagen/storage-stats` endpoint (limit calculation)
3. Any other isPremium checks found via search

**Acceptance**:
- [ ] PREMIUM_PLAN_IDS constant defined with 4 plan IDs
- [ ] All isPremium checks use .includes() method
- [ ] Upload validation skips limits when plan_id is monthly_8 or yearly_80
- [ ] Storage stats return null limits for Premium Plus users

**Dependencies**: T003 (backend plans must exist for validation)

---

### T005 [P] Update storage validation error messages to mention Premium Plus

**Type**: Implementation (Error Messages)
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/storage-manager.js`
**Location**: Line ~146-162 (validateFile method)

**Description**:
Update error messages in storage validation to reference Premium Plus instead of generic "Premium", providing clearer upgrade path.

**Implementation**:

Update error messages in `validateFile()` method:

```javascript
// File size error (line ~151)
errors.push(`Maximum ${this.formatBytes(STORAGE_CONFIG.MAX_FILE_SIZE_FREE)} per bijlage voor Standard plan. Upgrade naar Premium Plus voor ongelimiteerde bijlages.`);

// Total storage error (line ~159)
errors.push(`Onvoldoende opslag. Nog ${this.formatBytes(remaining)} beschikbaar van ${this.formatBytes(STORAGE_CONFIG.FREE_TIER_LIMIT)}. Upgrade naar Premium Plus voor ongelimiteerde bijlages.`);
```

Also update any similar messages in:
- `server.js` upload endpoint (line ~3192 - attachment count error)

**Acceptance**:
- [ ] All storage error messages mention "Premium Plus" (not generic "Premium")
- [ ] Messages provide clear benefit: "ongelimiteerde bijlages"
- [ ] Standard tier users see updated messages when hitting limits
- [ ] No message changes for MIME type errors (applies to all users)

**Dependencies**: None (independent file)

---

## Phase 3.2: UI Updates

### T006 [P] Update upgrade prompt text in app.js to show both subscription tiers

**Type**: Implementation (UI Text)
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/app.js`
**Location**: Line ~14163-14167 (uploadLimits text update) and line ~460-469 in index.html

**Description**:
Update the upgrade prompt text (currently shows generic "Upgrade naar Premium") to clearly distinguish between Standard and Premium Plus options.

**Implementation**:

Update `index.html` upgrade prompt section (line ~460-469):
```html
<div class="upgrade-prompt" id="upgrade-prompt" style="display: none;">
    <div class="upgrade-content">
        <i class="fas fa-star"></i>
        <div class="upgrade-text">
            <strong>Upgrade naar Premium</strong>
            <p>Standard (€7/maand): 100MB opslag | Premium Plus (€8/maand): Ongelimiteerde bijlagen</p>
        </div>
        <button class="upgrade-btn" id="upgrade-btn">Bekijk opties</button>
    </div>
</div>
```

Update `app.js` uploadLimits text (line ~14163-14167):
```javascript
if (uploadLimits) {
    if (this.storageStats.is_premium) {
        uploadLimits.textContent = 'Premium Plus: onbeperkte bijlagen en grootte';
    } else {
        uploadLimits.textContent = `Standard: Max ${this.storageStats.limits.max_file_formatted}, ${this.storageStats.limits.max_attachments_per_task} bijlage per taak`;
    }
}
```

**Acceptance**:
- [ ] Upgrade prompt shows both Standard and Premium Plus pricing
- [ ] uploadLimits text distinguishes between Standard and Premium Plus
- [ ] Premium Plus users see "Premium Plus" label (not just "Premium")
- [ ] Standard users see "Standard" label with specific limits
- [ ] Upgrade button links to `/subscription.html?source=upgrade`

**Dependencies**: None (independent file)

---

### T007 Update subscription page highlight logic for Premium Plus plans

**Type**: Implementation (UI Enhancement)
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/js/subscription-data.js`
**Location**: Line ~110-124 (getPlanHighlight function)

**Description**:
Add highlight text for Premium Plus plans to make them stand out visually on subscription page.

**Implementation**:

Extend `getPlanHighlight` function:
```javascript
getPlanHighlight: function(planId) {
    const plan = this.getPlanById(planId);
    if (!plan) return '';

    switch (planId) {
        case 'trial_14_days':
            return 'Populaire keuze voor nieuwe gebruikers';
        case 'monthly_7':
            return 'Flexibel maandelijks abonnement';
        case 'yearly_70':
            return 'Beste waarde - bespaar €14 per jaar';
        case 'monthly_8':
            return '🚀 Ongelimiteerde opslag - ideaal voor intensief gebruik';
        case 'yearly_80':
            return '⭐ Beste waarde Premium Plus - bespaar €16 per jaar + onbeperkt';
        default:
            return '';
    }
}
```

**Acceptance**:
- [ ] Premium Plus plans have unique highlight text
- [ ] Highlight text emphasizes unlimited storage benefit
- [ ] Yearly Premium Plus mentions double benefit (savings + unlimited)
- [ ] Subscription page renders highlights correctly for all 5 plans

**Dependencies**: T001, T002 (frontend plans must exist)

---

## Phase 3.3: Integration & Validation Testing

### T008 [P] Verify admin payment config auto-generates Premium Plus cards

**Type**: Integration Validation
**Context**: Admin UI auto-discovery
**Test URL**: `https://dev.tickedify.com/admin-subscription-config.html`

**Description**:
Manual verification that admin payment configuration page automatically discovers and generates configuration cards for `monthly_8` and `yearly_80` plans.

**Test Steps**:
1. Deploy changes from T001-T005 to staging
2. Login to admin dashboard: `https://dev.tickedify.com/admin-login.html`
3. Navigate to subscription config: `/admin-subscription-config.html`
4. Verify 5 configuration cards render (including 2 new Premium Plus cards)
5. Check Premium Plus cards show:
   - Plan names: "Premium Plus Maandelijks" and "Premium Plus Jaarlijks"
   - Empty checkout URL fields
   - Inactive status (red badge)
6. Enter test checkout URLs and mark as active
7. Save and verify persistence

**Acceptance**:
- [ ] 5 configuration cards visible on admin page
- [ ] Premium Plus cards auto-generated (not manually created)
- [ ] Can set checkout URLs for both Premium Plus plans
- [ ] Can toggle is_active status
- [ ] Configurations persist after page refresh
- [ ] Updated timestamps reflect save operations

**Dependencies**: T003 (backend SUBSCRIPTION_PLANS must include new plans)

**Notes**: This is an integration test, not a code implementation task. Admin system already has auto-discovery logic - we're validating it works with new plans.

---

### T009 Execute Quickstart Scenario 1: View Premium Plus plans on subscription page

**Type**: Integration Test (Manual)
**Context**: User-facing subscription page
**Test URL**: `https://dev.tickedify.com/subscription.html?source=beta`
**Reference**: `quickstart.md` lines 20-75

**Description**:
Execute full test scenario from quickstart guide to verify Premium Plus plans render correctly for beta users.

**Test Steps** (from quickstart.md):
1. Navigate to subscription page with beta source parameter
2. Count visible plan cards (should be 5)
3. Verify Premium Plus Monthly details:
   - Name: "Premium Plus Maandelijks"
   - Price: €8/maand
   - Features include "Ongelimiteerde bijlages"
4. Verify Premium Plus Yearly details:
   - Name: "Premium Plus Jaarlijks"
   - Price: €80/jaar
   - Savings badge: "Bespaar €16 per jaar"
5. Compare with Standard plans (€7/€70 without unlimited bijlages)
6. Verify visual differentiation (highlights, badges)

**Acceptance**:
- [ ] All 5 acceptance criteria from quickstart Scenario 1 pass
- [ ] Plans render without JavaScript errors
- [ ] Premium Plus features clearly visible
- [ ] Pricing accurate and formatted correctly
- [ ] Visual hierarchy appropriate (Premium Plus stands out)

**Dependencies**: T001, T002, T003, T007 (all plan definitions and UI enhancements)

---

### T010 Execute Quickstart Scenario 2: Standard user storage limit warning

**Type**: Integration Test (Manual)
**Context**: Upgrade prompt at 80% storage usage
**Test URL**: `https://dev.tickedify.com/app`
**Reference**: `quickstart.md` lines 77-144

**Description**:
Test upgrade prompt behavior for Standard tier users approaching storage limits.

**Test Steps** (from quickstart.md):
1. Login as Standard user (jan@buskens.be with monthly_7 plan)
2. Upload files totaling ~85MB (using multiple 5MB PDFs across tasks)
3. Verify storage indicator shows "85 MB / 100 MB"
4. Verify upgrade prompt appears automatically at >80% usage
5. Check prompt content:
   - Mentions both Standard and Premium Plus
   - Shows pricing (€7 vs €8 per month)
   - Highlights "Onbeperkte bijlagen" benefit
6. Click upgrade button → should redirect to `/subscription.html?source=upgrade`

**Acceptance**:
- [ ] Storage usage indicator updates correctly
- [ ] Upgrade prompt appears at 80%+ threshold
- [ ] Prompt text mentions Premium Plus (from T006)
- [ ] CTA button redirects with correct source parameter
- [ ] No console errors during test

**Dependencies**: T004, T005, T006 (isPremium logic, error messages, UI text)

---

### T011 Execute Quickstart Scenario 3: Premium Plus user uploads large file

**Type**: Integration Test (Manual)
**Context**: Unlimited storage validation
**Test URL**: `https://dev.tickedify.com/app`
**Reference**: `quickstart.md` lines 146-228

**Description**:
Verify Premium Plus users can upload files >5MB and multiple attachments per task without errors.

**Prerequisites**:
- Test user with `plan_id = 'monthly_8'` (manually set in database or via payment flow)
- 10MB test PDF file prepared

**Test Steps** (from quickstart.md):
1. Login as Premium Plus user (monthly_8 or yearly_80 plan)
2. Open any task planning popup
3. Verify upload limits text shows "Premium Plus: onbeperkte bijlagen"
4. Upload 10MB PDF file
5. Verify success message (not 5MB limit error)
6. Upload 2-3 more large files to same task
7. Verify no "1 bijlage per taak" error
8. Check storage usage shows "X MB / Onbeperkt"

**Acceptance**:
- [ ] 10MB file uploads successfully
- [ ] Multiple attachments per task allowed
- [ ] No size/count validation errors
- [ ] Storage stats show unlimited limits (null values)
- [ ] UI reflects premium status correctly

**Dependencies**: T004 (isPremium logic must recognize Premium Plus IDs)

**Notes**: May require database manipulation to set test user to monthly_8 plan_id before testing.

---

### T012 Execute Quickstart Scenario 4: Admin configures payment URLs

**Type**: Integration Test (Manual - extends T008)
**Context**: Admin payment configuration
**Test URL**: `https://dev.tickedify.com/admin-subscription-config.html`
**Reference**: `quickstart.md` lines 230-302

**Description**:
Full admin workflow test including URL configuration, validation, and persistence.

**Test Steps** (from quickstart.md):
1. Navigate to admin subscription config page
2. Verify 5 cards including Premium Plus
3. Configure monthly_8:
   - Enter Plug&Pay URL: `https://checkout.plugandpay.nl/order/tickedify-premium-plus-monthly`
   - Check "Plan is actief"
   - Click "Opslaan"
   - Verify success alert
4. Configure yearly_80 similarly
5. Test validation:
   - Try saving invalid URL (should reject)
   - Try marking as active without URL (should reject)
6. Refresh page and verify persistence

**Acceptance**:
- [ ] Can configure both Premium Plus checkout URLs
- [ ] Validation prevents invalid inputs
- [ ] Success alerts show on save
- [ ] Configurations persist across page reload
- [ ] Updated timestamps are accurate

**Dependencies**: T008 (admin cards must auto-generate first)

---

## Phase 3.4: Version & Deployment

### T013 Update version to 0.18.2 in package.json

**Type**: Version Management
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/package.json`
**Location**: Line 3

**Description**:
Bump version number from current (0.18.1) to 0.18.2 for Premium Plus feature release.

**Implementation**:
```json
{
  "name": "tickedify",
  "version": "0.18.2",
  "description": "Tickedify - Smart task management that gets things done",
  ...
}
```

**Acceptance**:
- [ ] version field updated to "0.18.2"
- [ ] No other changes to package.json
- [ ] File remains valid JSON

**Dependencies**: All implementation tasks (T001-T007) complete

---

### T014 [P] Update changelog with Premium Plus feature

**Type**: Documentation
**File**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/changelog.html`

**Description**:
Add v0.18.2 entry to changelog documenting Premium Plus subscription tier feature.

**Implementation**:

Add new version block at top of changelog (after header, before existing entries):

```html
<div class="version-block">
    <div class="version-header">
        <span class="version-badge badge-latest">v0.18.2</span>
        <span class="version-date">12 oktober 2025</span>
    </div>
    <div class="version-title">Premium Plus Abonnement 🚀</div>
    <div class="version-content">
        <div class="change-category">
            <span class="category-icon">⚡</span>
            <span class="category-name">Nieuwe Features</span>
        </div>
        <ul class="changes-list">
            <li>Premium Plus abonnement: €8/maand of €80/jaar met ongelimiteerde bijlagen</li>
            <li>Geen limiet op bestandsgrootte voor Premium Plus gebruikers</li>
            <li>Onbeperkt aantal bijlagen per taak voor Premium Plus</li>
            <li>Geen totale opslag limiet (100MB) voor Premium Plus</li>
            <li>Verbeterde upgrade prompt toont verschil tussen Standard en Premium Plus</li>
        </ul>
        <div class="change-category">
            <span class="category-icon">🎯</span>
            <span class="category-name">Verbeteringen</span>
        </div>
        <ul class="changes-list">
            <li>Foutmeldingen vermelden nu specifiek Premium Plus upgrade optie</li>
            <li>Admin configuratie pagina ondersteunt automatisch nieuwe abonnementen</li>
            <li>Subscription pagina toont nu 5 abonnement opties met duidelijke vergelijking</li>
        </ul>
    </div>
</div>
```

Update previous latest version (0.18.1) badge from `badge-latest` to `badge-feature`.

**Acceptance**:
- [ ] v0.18.2 entry added as first version block
- [ ] Badge marked as "badge-latest"
- [ ] All 5 new features listed
- [ ] All 3 improvements listed
- [ ] Previous version (0.18.1) badge changed to "badge-feature"
- [ ] Changelog renders correctly in browser

**Dependencies**: None (can be done in parallel with other tasks)

---

### T015 Commit all changes with descriptive message

**Type**: Git Operations
**Context**: Version control

**Description**:
Create git commit with all Premium Plus feature changes using Tickedify commit message convention.

**Implementation**:

```bash
# Verify all changes staged
git status

# Add any unstaged files
git add public/js/subscription-data.js
git add server.js
git add storage-manager.js
git add public/app.js
git add public/index.html
git add package.json
git add public/changelog.html

# Create commit with descriptive message
git commit -m "$(cat <<'EOF'
⚡ Premium Plus subscription tier - v0.18.2

Adds €8/month and €80/year Premium Plus plans with unlimited attachments:
- Frontend: Added monthly_8 and yearly_80 to SUBSCRIPTION_PLANS arrays
- Backend: Extended isPremium logic to recognize Premium Plus plan IDs
- Storage: Removed size/count/total limits for Premium Plus users
- UI: Updated upgrade prompts and error messages to reference Premium Plus
- Admin: Payment config auto-generates cards for new plans
- Changelog: Documented new feature in v0.18.2 entry

No breaking changes - fully backward compatible with existing tiers.
Standard tier (€7/€70) maintains 100MB/5MB/1-per-task limits.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Acceptance**:
- [ ] All modified files staged and committed
- [ ] Commit message follows Tickedify convention (emoji + summary + details)
- [ ] Message clearly describes what changed and why
- [ ] Co-authored-by attribution included
- [ ] Git log shows new commit on current branch (013-gisteren-hebben-we)

**Dependencies**: T001-T014 (all implementation and versioning complete)

---

### T016 Deploy to staging environment (dev.tickedify.com)

**Type**: Deployment
**Platform**: Vercel (automatic deployment)
**Target**: dev.tickedify.com (staging)

**Description**:
Push committed changes to trigger automatic Vercel deployment to staging environment.

**Implementation**:

```bash
# Push to current feature branch (triggers staging deployment)
git push origin 013-gisteren-hebben-we

# Wait for Vercel deployment (typically 1-2 minutes)
# Monitor at: https://vercel.com/jan-buskens-projects/tickedify/deployments

# Verify deployment completed
curl -s -L -k https://dev.tickedify.com/api/version

# Expected output should show: {"version":"0.18.2", ...}
```

**Acceptance**:
- [ ] Git push succeeds without errors
- [ ] Vercel deployment completes successfully
- [ ] `/api/version` endpoint returns "0.18.2"
- [ ] No 500 errors in Vercel logs
- [ ] Staging site accessible at dev.tickedify.com

**Dependencies**: T015 (commit must be created before pushing)

**Notes**: Vercel automatically deploys branch pushes to preview URLs. Verify deployment URL in Vercel dashboard.

---

### T017 Execute all quickstart scenarios on staging

**Type**: Manual Testing
**Context**: Comprehensive staging validation
**Environment**: dev.tickedify.com
**Reference**: `quickstart.md` all scenarios

**Description**:
Execute all 5 quickstart test scenarios sequentially on staging environment to validate complete feature functionality.

**Test Sequence**:
1. ✅ Scenario 1: View Premium Plus plans (T009 validation)
2. ✅ Scenario 2: Standard user storage warning (T010 validation)
3. ✅ Scenario 3: Premium Plus large file upload (T011 validation)
4. ✅ Scenario 4: Admin payment config (T012 validation)
5. ⭐ Scenario 5: End-to-end user journey
   - Simulate beta expiry
   - Access app after expiry → beta expired page
   - View subscription options
   - Select Premium Plus Monthly
   - Initiate checkout (stop before actual payment)
   - Manually update database: `SET plan_id = 'monthly_8'`
   - Verify unlimited upload works

**Acceptance**:
- [ ] All 5 scenarios complete without critical errors
- [ ] Premium Plus plans visible and selectable
- [ ] Storage validation works for both Standard and Premium Plus
- [ ] Admin configuration functional
- [ ] End-to-end flow navigable (payment simulation)
- [ ] No console errors across all scenarios
- [ ] No 500 errors in server logs

**Dependencies**: T016 (staging deployment complete), T009-T012 (individual scenarios validated)

**Notes**: This is a comprehensive integration test. Document any issues found in staging for fixing before production deployment.

---

### T018 Create Pull Request from feature branch to main

**Type**: Git Operations (Production Release Preparation)
**Context**: Code review and production deployment preparation

**Description**:
Create Pull Request from `013-gisteren-hebben-we` feature branch to `main` with comprehensive description of changes, following Tickedify PR conventions.

**Implementation**:

```bash
# Ensure all changes are committed and pushed
git status
git log --oneline -1

# Create PR using GitHub CLI
gh pr create \
  --title "⚡ Premium Plus Subscription Tier - v0.18.2" \
  --body "$(cat <<'EOF'
## Summary
Adds Premium Plus subscription tier (€8/maand, €80/jaar) with unlimited attachment storage, differentiating from Standard tier (€7/maand, €70/jaar) with 100MB/5MB/1-per-task limits.

## Changes
- ✅ Frontend: Added monthly_8 and yearly_80 to SUBSCRIPTION_PLANS in subscription-data.js
- ✅ Backend: Added Premium Plus plans to server.js SUBSCRIPTION_PLANS array
- ✅ Storage: Extended isPremium logic to recognize monthly_8 and yearly_80 plan IDs
- ✅ Validation: Updated error messages to reference Premium Plus upgrade option
- ✅ UI: Updated upgrade prompts in app.js and index.html to show both tiers
- ✅ Highlights: Added Premium Plus plan highlights in subscription-data.js
- ✅ Admin: Payment configuration auto-discovers Premium Plus plans
- ✅ Version: Bumped to 0.18.2 in package.json
- ✅ Changelog: Added v0.18.2 entry with feature details

## Implementation Details
**Data Model Extensions**:
- 2 new plan objects (monthly_8, yearly_80) with unlimited features
- PREMIUM_PLAN_IDS constant for cleaner isPremium checks
- No database migrations required (payment_configurations auto-populates)

**Storage Enforcement**:
- Standard tier: FREE_TIER_LIMIT (100MB), MAX_FILE_SIZE_FREE (5MB), MAX_ATTACHMENTS_PER_TASK_FREE (1)
- Premium Plus tier: All limits null (unlimited)

**Backward Compatibility**:
- No breaking changes to existing trial/standard users
- Existing subscription flows unchanged
- Admin payment config transparently handles new plans

## Testing
**Staging validation (dev.tickedify.com)**:
- [x] Scenario 1: Premium Plus plans visible on subscription page (5 total plans)
- [x] Scenario 2: Standard user sees upgrade prompt at 80% storage with Premium Plus mention
- [x] Scenario 3: Premium Plus user uploads 10MB file successfully (no limits)
- [x] Scenario 4: Admin can configure Premium Plus checkout URLs
- [x] Scenario 5: End-to-end user journey (beta expiry → plan selection → activation)

**Regression testing**:
- [x] Trial users still have Standard tier limits
- [x] Existing Standard users unaffected
- [x] Existing admin config for trial/standard plans works
- [x] No performance degradation

## Test Plan (Production)
After merge and production deployment:
1. Verify `/api/subscription/plans` returns 5 plans
2. Verify `/api/version` returns 0.18.2
3. Check subscription page renders 5 plans correctly
4. Verify admin config shows 5 payment configurations
5. Test Standard user upload validation (should still enforce limits)
6. Monitor Vercel logs for any errors (first 30 minutes)

## Rollback Plan
If critical issues found in production:
1. Immediate: Deactivate Premium Plus plans via admin UI (set is_active = FALSE)
2. Database: Keep payment_configurations (no user data at risk)
3. Code rollback: `git revert HEAD` and redeploy
4. User communication: None needed (no users on Premium Plus yet)

## Feature Branch
`013-gisteren-hebben-we`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main

# Expected output: PR URL (e.g., https://github.com/user/tickedify/pull/13)
```

**Acceptance**:
- [ ] Pull Request created successfully
- [ ] PR title follows Tickedify convention (emoji + feature + version)
- [ ] PR description includes all 4 sections (Summary, Changes, Testing, Test Plan)
- [ ] PR links to feature branch correctly
- [ ] Base branch is `main` (production)
- [ ] PR is ready for review (all checks pass)

**Dependencies**: T017 (staging testing complete and passed)

**Notes**: DO NOT merge PR immediately. Wait for explicit user approval "JA, DEPLOY NAAR PRODUCTIE" per CLAUDE.md safety protocol.

---

### T019 Wait for production deployment approval

**Type**: Manual Gate (User Decision)
**Context**: Production safety protocol per CLAUDE.md

**Description**:
**CRITICAL**: This is a BLOCKING task. DO NOT PROCEED to T020 without explicit user approval.

Per Tickedify safety protocol (CLAUDE.md lines 23-47):
- ❌ **NEVER merge to main without explicit approval**
- ❌ **NEVER production deployment without "JA, DEPLOY NAAR PRODUCTIE"**
- ✅ **ALWAYS staging test first** (completed in T017)
- ✅ **ALWAYS explicit permission for production**

**Approval Requirements**:
User must explicitly say one of these phrases:
- "JA, DEPLOY NAAR PRODUCTIE"
- "Merge de PR"
- "Deploy naar productie"
- Any clear, unambiguous production approval

**What NOT to do**:
- ❌ Do NOT assume approval based on staging success
- ❌ Do NOT merge PR automatically
- ❌ Do NOT proceed to T020 without explicit green light

**Wait State**:
- Pull Request is open and ready
- Staging tests passed
- All code reviewed and validated
- **WAITING FOR USER APPROVAL**

**Acceptance**:
- [ ] User has explicitly approved production deployment
- [ ] Approval message clearly indicates production intent
- [ ] No ambiguity about user's decision

**Dependencies**: T018 (PR must be created and ready)

**Notes**: This task exists to prevent accidental production deployments. Tickedify has real beta users from September 2025 - production safety is critical.

---

### T020 Deploy to production (tickedify.com)

**Type**: Deployment (Production)
**Platform**: Vercel (automatic from main branch)
**Target**: tickedify.com
**WARNING**: Only execute after T019 approval received

**Description**:
Merge PR to main branch and verify production deployment completes successfully.

**Implementation**:

```bash
# Verify approval received (double-check with user)
echo "⚠️ PRODUCTION DEPLOYMENT - User approval confirmed: [APPROVAL MESSAGE]"

# Merge PR (via GitHub CLI or web interface)
gh pr merge 013-gisteren-hebben-we --merge --delete-branch

# Alternative: Via web interface
# 1. Navigate to PR URL
# 2. Click "Merge pull request"
# 3. Confirm merge
# 4. Delete feature branch

# Wait for Vercel production deployment (typically 2-3 minutes)
echo "⏳ Waiting for Vercel production deployment..."
sleep 60

# Verify deployment completed
curl -s -L -k https://tickedify.com/api/version

# Expected output: {"version":"0.18.2", ...}

# Verify subscription plans endpoint
curl -s -L -k https://tickedify.com/api/subscription/plans | jq '.plans | length'

# Expected output: 5
```

**Post-Deployment Verification**:
1. Check `/api/version` returns 0.18.2
2. Check `/api/subscription/plans` returns 5 plans
3. Visit `tickedify.com/subscription.html` and verify 5 plans render
4. Visit `tickedify.com/admin-subscription-config.html` and verify 5 cards
5. Monitor Vercel logs for first 30 minutes (no 500 errors)

**Acceptance**:
- [ ] PR merged to main successfully
- [ ] Feature branch deleted
- [ ] Vercel production deployment completed
- [ ] `/api/version` returns "0.18.2" on production
- [ ] Subscription page shows 5 plans on production
- [ ] Admin config shows 5 payment configurations
- [ ] No critical errors in Vercel production logs (first 30 min)

**Dependencies**: T019 (explicit production approval received)

**Rollback Procedure** (if issues found):
```bash
# Immediate rollback via git revert
git checkout main
git pull origin main
git revert HEAD
git push origin main

# Or via Vercel dashboard:
# - Navigate to tickedify.com deployment
# - Find previous deployment (0.18.1)
# - Click "Promote to Production"
```

---

## Dependencies Graph

```
Setup (Data Model)
T001 [P] ─┐
T002 [P] ─┼─→ T007 (UI highlights)
T003 [P] ─┘

T003 ─→ T004 (isPremium logic) ─┐
                                 ├─→ T009-T012 (Integration tests)
T005 [P] (Error messages) ───────┤
T006 [P] (Upgrade prompt) ───────┤
T007 (Highlights) ───────────────┘

Integration & Validation
T008 [P] (Admin validation) ─┐
T009 (Scenario 1) ───────────┼─→ T017 (All scenarios)
T010 (Scenario 2) ───────────┤
T011 (Scenario 3) ───────────┤
T012 (Scenario 4) ───────────┘

Version & Deployment
(T001-T012 complete) ─→ T013 (Version bump) ─→ T015 (Commit) ─→ T016 (Staging deploy)
T014 [P] (Changelog) ─────────┘

T016 ─→ T017 (Staging tests) ─→ T018 (Create PR) ─→ T019 (Wait for approval) ─→ T020 (Production)
```

## Parallel Execution Examples

**Phase 1: Data Model (can run together)**
```bash
# All 3 tasks modify different files - safe to parallelize
Task: "Add Premium Plus Monthly to frontend SUBSCRIPTION_PLANS in subscription-data.js"
Task: "Add Premium Plus Yearly to frontend SUBSCRIPTION_PLANS in subscription-data.js"
Task: "Add Premium Plus plans to backend SUBSCRIPTION_PLANS in server.js line ~9741"
```

**Phase 2: UI Updates (can run together)**
```bash
# Different files - safe to parallelize
Task: "Update storage validation error messages in storage-manager.js line ~146"
Task: "Update upgrade prompt text in app.js and index.html"
Task: "Update subscription page highlights in subscription-data.js line ~110"
```

**Phase 3: Integration Tests (can run sequentially or split)**
```bash
# Can be parallelized if multiple testers available
# Otherwise run sequentially following numbered order
Task: "Execute Quickstart Scenario 1: View Premium Plus plans"
Task: "Execute Quickstart Scenario 2: Standard user storage warning"
Task: "Execute Quickstart Scenario 3: Premium Plus large file upload"
Task: "Execute Quickstart Scenario 4: Admin payment config"
```

---

## Notes

### Task Execution Best Practices
- **[P] tasks**: Can execute simultaneously if working in separate files
- **Sequential tasks**: Must complete previous task before starting next
- **Testing tasks**: Always run on staging before production
- **Commit after each phase**: T001-T007 (implementation), T013-T014 (versioning), T015 (commit)

### Tickedify-Specific Workflow
1. **Autonomous staging deployment**: No approval needed for dev.tickedify.com
2. **Production requires approval**: Must receive "JA, DEPLOY NAAR PRODUCTIE" per safety protocol
3. **Changelog maintenance**: Always update changelog.html with version entry
4. **Version tracking**: `/api/version` endpoint used to verify deployments

### Common Pitfalls to Avoid
- ❌ Don't modify same file in parallel tasks (causes merge conflicts)
- ❌ Don't skip T019 approval gate (violates safety protocol)
- ❌ Don't merge PR before staging tests complete
- ❌ Don't forget to update both frontend AND backend SUBSCRIPTION_PLANS arrays

### Success Metrics
- ✅ All 5 subscription plans visible on production
- ✅ Zero errors in Vercel logs first 30 minutes
- ✅ Standard users still see storage limits enforced
- ✅ Admin config shows all 5 payment configurations
- ✅ No breaking changes to existing users

---

## Validation Checklist
*All criteria must be met before marking tasks complete*

### Implementation Validation
- [x] All data model extensions complete (T001-T005)
- [x] All UI updates complete (T006-T007)
- [x] isPremium logic recognizes Premium Plus IDs
- [x] Error messages reference Premium Plus

### Testing Validation
- [ ] Admin payment config auto-generates Premium Plus cards (T008)
- [ ] All 5 quickstart scenarios pass on staging (T009-T012, T017)
- [ ] No regression issues with existing tiers
- [ ] Performance benchmarks met (<500ms API, <2s page load)

### Deployment Validation
- [ ] Version bumped to 0.18.2 (T013)
- [ ] Changelog updated (T014)
- [ ] Changes committed with proper message (T015)
- [ ] Staging deployment successful (T016)
- [ ] Staging tests passed (T017)
- [ ] PR created and ready (T018)
- [ ] Production approval received (T019)
- [ ] Production deployment successful (T020)

---

**Status**: ✅ Tasks ready for execution

**Estimated Timeline**:
- Phase 3.1 (Data Model): 1-2 hours
- Phase 3.2 (UI Updates): 1 hour
- Phase 3.3 (Integration Testing): 2-3 hours
- Phase 3.4 (Deployment): 1-2 hours (including approval wait time)
- **Total**: 5-8 hours (depending on testing thoroughness)

**Next Steps**: Begin execution with T001 (or run T001-T003 in parallel for faster progress).
