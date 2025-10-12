# Quickstart Testing Guide: Premium Plus Subscription Tier

**Feature**: 013-gisteren-hebben-we
**Version**: 0.18.2
**Environment**: Staging (dev.tickedify.com) then Production (tickedify.com)

## Prerequisites

- ✅ Staging environment deployed with Premium Plus code
- ✅ Test user account: jan@buskens.be / qyqhut-muDvop-fadki9
- ✅ Admin access to subscription configuration
- ✅ Plug&Pay checkout URLs configured for monthly_8 and yearly_80 (or test mode URLs)

## Test Scenario 1: View Premium Plus Plans on Subscription Page

**Objective**: Verify 5 subscription plans render correctly with Premium Plus tiers visible.

### Steps:

1. **Navigate to subscription page**
   ```
   URL: https://dev.tickedify.com/subscription.html?source=beta
   ```

2. **Verify plan count**
   - Count visible plan cards
   - **Expected**: 5 cards displayed in grid

3. **Verify Premium Plus Monthly plan**
   - **Plan Name**: "Premium Plus Maandelijks"
   - **Price**: €8/maand
   - **Features** include:
     - ✅ "Alle functies"
     - ✅ "Onbeperkte taken"
     - ✅ "Email import"
     - ✅ "Premium support"
     - ✅ "Ongelimiteerde bijlages"
     - ✅ "Geen limiet op bestandsgrootte"
   - **Badge/Highlight**: Should stand out visually from Standard plans

4. **Verify Premium Plus Yearly plan**
   - **Plan Name**: "Premium Plus Jaarlijks"
   - **Price**: €80/jaar
   - **Features** include all Monthly features PLUS:
     - ✅ "2 maanden gratis" (€96 value for €80)
   - **Savings badge**: "Bespaar €16 per jaar" visible

5. **Compare with Standard plans**
   - **Standard Monthly**: €7/maand (no unlimited bijlages)
   - **Standard Yearly**: €70/jaar (no unlimited bijlages)
   - **Trial**: €0 (14 dagen gratis)

### Acceptance Criteria:

- [ ] All 5 plans render without errors
- [ ] Premium Plus plans show "Ongelimiteerde bijlages" feature
- [ ] Pricing is correct (€8/€80 vs €7/€70)
- [ ] Visual differentiation between Standard and Premium Plus
- [ ] Savings badge displays on yearly plans

### Expected Result:

**Screenshot areas to verify**:
- Plan grid layout with 5 cards
- Feature lists showing storage differences
- Price comparison clarity

---

## Test Scenario 2: Standard User Storage Limit Warning

**Objective**: Verify upgrade prompt appears at 80% storage usage with Premium Plus mention.

### Steps:

1. **Login as Standard tier user**
   ```
   Email: jan@buskens.be
   Password: qyqhut-muDvop-fadki9
   Plan: monthly_7 (Standard Monthly)
   ```

2. **Upload files to approach limit**
   - Navigate to any task planning popup
   - Upload attachments totaling ~85MB (85% of 100MB limit)
   - **How**: Upload multiple 5MB PDFs to different tasks

3. **Verify storage usage indicator**
   - **Location**: Planning popup → Bijlagen section header
   - **Expected display**: "85 MB / 100 MB" (or similar)
   - **Color**: Should show warning state (yellow/orange)

4. **Verify upgrade prompt appears**
   - **Location**: Below bijlagen upload zone
   - **Trigger**: Automatically at >80% usage
   - **Content** should include:
     - 🌟 Icon or visual indicator
     - "Upgrade naar Premium"
     - **IMPORTANT**: Mention of both Standard AND Premium Plus options
     - Price references (€7/€70 Standard, €8/€80 Premium Plus)
     - Benefits: "Onbeperkte bijlagen, grotere bestanden, meer opslag"
   - **CTA Button**: Links to subscription page

5. **Test prompt interaction**
   - Click upgrade button
   - **Expected**: Redirect to `/subscription.html?source=upgrade`
   - Verify Premium Plus plans are visible and selectable

### Acceptance Criteria:

- [ ] Storage indicator shows at ~80MB/100MB
- [ ] Upgrade prompt appears automatically at 80%+ usage
- [ ] Prompt text mentions BOTH Standard and Premium Plus
- [ ] Clicking upgrade button navigates to subscription page
- [ ] Source parameter is 'upgrade' in URL

### Expected Result:

**Upgrade prompt text example**:
```
⭐ Upgrade naar Premium
- Standard (€7/maand): 100MB opslag
- Premium Plus (€8/maand): Ongelimiteerde bijlagen
Klik hier voor meer informatie
```

---

## Test Scenario 3: Premium Plus User Uploads Large File

**Objective**: Verify Premium Plus users can upload files >5MB without errors.

### Steps:

1. **Login as Premium Plus user**
   ```
   Email: jan@buskens.be (after upgrading plan_id to monthly_8 via database)
   Password: qyqhut-muDvop-fadki9

   OR create test user:
   - Register new account
   - Manually update `users` table: SET plan_id = 'monthly_8'
   ```

2. **Prepare large test file**
   - Create or download a 10MB PDF file
   - Ensure file type is supported (PDF, DOCX, etc.)

3. **Navigate to task with bijlagen**
   - Open any task planning popup
   - Scroll to "Bijlagen" section

4. **Verify storage limit display**
   - **Expected**: "X MB / Onbeperkt" or no limit shown
   - **Upload limits text**: "Premium Plus: onbeperkte bijlagen en grootte"

5. **Upload 10MB file**
   - Drag & drop or select 10MB file
   - Click upload / wait for automatic upload

6. **Verify upload succeeds**
   - **Expected**: Success toast message
   - **Expected**: File appears in bijlagen list with 10MB size
   - **Expected**: No "Maximum 5MB" error
   - **Expected**: Storage usage updates (e.g., "10 MB / Onbeperkt")

7. **Upload additional large files**
   - Upload 2-3 more files >5MB to same task
   - **Expected**: No "1 bijlage per taak" limit error
   - **Expected**: All files upload successfully

8. **Verify storage stats**
   - Navigate to storage statistics (if visible in UI)
   - **Expected**: `is_premium: true`
   - **Expected**: `limits.total_formatted: "Onbeperkt"`
   - **Expected**: `limits.max_file_formatted: "Onbeperkt"`

### Acceptance Criteria:

- [ ] 10MB file uploads without size error
- [ ] Multiple attachments per task allowed
- [ ] Storage usage shows "Onbeperkt" (unlimited)
- [ ] No upgrade prompts appear for Premium Plus users
- [ ] UI reflects premium status (e.g., "Premium Plus" badge)

### Expected Result:

**Success flow**:
1. File upload progress bar
2. Success message: "Bijlage 'large-file.pdf' succesvol geüpload"
3. File appears in bijlagen list with download/preview buttons
4. Storage remains unlimited

---

## Test Scenario 4: Admin Configures Premium Plus Payment URLs

**Objective**: Verify admin can set Plug&Pay checkout URLs for new Premium Plus plans.

### Steps:

1. **Login as admin**
   ```
   URL: https://dev.tickedify.com/admin-login.html
   Email: jan@buskens.be
   Password: [admin password]
   ```

2. **Navigate to subscription config**
   ```
   URL: https://dev.tickedify.com/admin-subscription-config.html
   ```

3. **Verify 5 configuration cards render**
   - **Expected cards**:
     1. trial_14_days (14 dagen gratis)
     2. monthly_7 (Maandelijks)
     3. yearly_70 (Jaarlijks)
     4. **monthly_8 (Premium Plus Maandelijks)** ← NEW
     5. **yearly_80 (Premium Plus Jaarlijks)** ← NEW

4. **Check Premium Plus cards initial state**
   - **Checkout URL field**: Empty or NULL
   - **Is Active checkbox**: Unchecked (inactive)
   - **Status badge**: Red "Inactief"

5. **Configure monthly_8 plan**
   - Enter Plug&Pay checkout URL:
     ```
     https://checkout.plugandpay.nl/order/tickedify-premium-plus-monthly
     ```
   - Check "Plan is actief" checkbox
   - Click "Opslaan" button
   - **Expected**: Success alert "Configuratie voor monthly_8 succesvol opgeslagen!"
   - **Expected**: Status badge changes to green "Actief"

6. **Configure yearly_80 plan**
   - Enter Plug&Pay checkout URL:
     ```
     https://checkout.plugandpay.nl/order/tickedify-premium-plus-yearly
     ```
   - Check "Plan is actief" checkbox
   - Click "Opslaan" button
   - **Expected**: Success alert "Configuratie voor yearly_80 succesvol opgeslagen!"

7. **Verify persistence**
   - Refresh the page (F5)
   - **Expected**: Both Premium Plus cards still show:
     - Configured checkout URLs
     - "Actief" status badges
     - Updated timestamps

8. **Test URL validation**
   - Try saving invalid URL (e.g., "not-a-url")
   - **Expected**: Validation error "Checkout URL moet beginnen met https://"

9. **Test activation validation**
   - Clear checkout URL for monthly_8
   - Try marking as active without URL
   - **Expected**: Error "Een actief plan vereist een checkout URL"

### Acceptance Criteria:

- [ ] monthly_8 and yearly_80 config cards auto-generate
- [ ] Checkout URLs can be saved and retrieved
- [ ] is_active toggle persists correctly
- [ ] Validation prevents invalid URLs
- [ ] Validation prevents active plan without checkout URL
- [ ] Updated timestamps reflect save operations

### Expected Result:

**Admin UI screenshot areas**:
- 5 configuration cards in grid layout
- Premium Plus cards with "Premium Plus" in plan name
- Success alerts after save operations
- Green "Actief" badges after activation

---

## Test Scenario 5: End-to-End User Journey

**Objective**: Complete user flow from beta expiry to Premium Plus activation.

### Steps:

1. **Simulate beta expiry**
   ```sql
   -- Update test user trial_expires_at to past date
   UPDATE users
   SET trial_expires_at = '2025-10-01'
   WHERE email = 'test@example.com';
   ```

2. **Access app after expiry**
   - Navigate to `/app` while logged in
   - **Expected**: Redirect to beta expired page

3. **View subscription options**
   - Click "Kies abonnement" button
   - **Expected**: Redirect to `/subscription.html?source=beta`
   - **Expected**: 5 plans visible

4. **Select Premium Plus Monthly**
   - Click on "Premium Plus Maandelijks" card
   - **Expected**: Plan card highlights as selected
   - **Expected**: "Bevestig selectie" button enables

5. **Initiate checkout**
   - Click "Bevestig selectie" button
   - **Expected**: POST to `/api/subscription/select` with `plan_id: monthly_8`
   - **Expected**: Redirect to Plug&Pay checkout URL

6. **Simulate payment success**
   ```
   Plug&Pay webhook → /api/webhooks/plugandpay
   Payload: { plan_id: 'monthly_8', user_id: 123, status: 'paid' }
   ```

7. **Verify activation**
   - Login to app
   - Check user.plan_id in database
   - **Expected**: `plan_id = 'monthly_8'`
   - **Expected**: App access restored

8. **Test unlimited storage**
   - Follow Test Scenario 3 steps
   - **Expected**: Large file uploads succeed

### Acceptance Criteria:

- [ ] Beta expired page displays correctly
- [ ] Subscription page shows Premium Plus options
- [ ] Plan selection and checkout flow works
- [ ] Payment webhook updates user plan_id
- [ ] Premium Plus features activate immediately
- [ ] User can upload unlimited files post-activation

### Expected Result:

**Complete flow timing**: ~5-10 minutes including payment simulation

---

## Regression Testing Checklist

**Verify existing features still work**:

- [ ] Trial users (trial_14_days) still have 100MB/5MB/1-per-task limits
- [ ] Standard users (monthly_7, yearly_70) still have same limits
- [ ] Existing subscription page still works for standard plans
- [ ] Admin config for trial/standard plans unchanged
- [ ] Storage validation for free users still enforces limits
- [ ] No breaking changes to existing users

---

## Database Verification Queries

**Check Premium Plus plan configurations**:

```sql
-- Verify payment_configurations table has new plans
SELECT plan_id, plan_name, is_active, checkout_url
FROM payment_configurations
WHERE plan_id IN ('monthly_8', 'yearly_80');

-- Expected rows:
-- monthly_8 | Premium Plus Maandelijks | false/true | URL or NULL
-- yearly_80 | Premium Plus Jaarlijks   | false/true | URL or NULL
```

**Check user subscription tiers**:

```sql
-- Find Premium Plus users
SELECT email, plan_id, trial_expires_at
FROM users
WHERE plan_id IN ('monthly_8', 'yearly_80');
```

**Check storage usage for Premium Plus users**:

```sql
-- Aggregate storage usage
SELECT u.email, u.plan_id,
       COUNT(b.id) as attachment_count,
       SUM(b.bestandsgrootte) as total_bytes
FROM users u
LEFT JOIN taken t ON t.user_id = u.id
LEFT JOIN bijlagen b ON b.taak_id = t.id
WHERE u.plan_id IN ('monthly_8', 'yearly_80')
GROUP BY u.email, u.plan_id;

-- Expected: Should allow >100MB total, >1 per task, >5MB per file
```

---

## Performance Benchmarks

**API Response Times**:

- `GET /api/subscription/plans` → <200ms
- `POST /api/subscription/select` → <300ms
- `GET /api/admin/payment-configurations` → <250ms
- `POST /api/taak/:id/bijlagen` (10MB file) → <5000ms
- `GET /api/bijlagen/storage-stats` → <150ms

**Frontend Rendering**:

- Subscription page initial render → <2s
- Admin config page initial render → <1.5s
- Plan card click interaction → <100ms

---

## Rollback Plan

**If critical issues found**:

1. **Immediate**: Deactivate Premium Plus plans via admin UI
   ```
   - Set monthly_8 is_active = FALSE
   - Set yearly_80 is_active = FALSE
   ```

2. **Database rollback** (if needed):
   ```sql
   -- Remove Premium Plus payment configs
   DELETE FROM payment_configurations
   WHERE plan_id IN ('monthly_8', 'yearly_80');

   -- Downgrade affected users (if any)
   UPDATE users
   SET plan_id = 'monthly_7'
   WHERE plan_id = 'monthly_8';

   UPDATE users
   SET plan_id = 'yearly_70'
   WHERE plan_id = 'yearly_80';
   ```

3. **Code rollback**: Revert to previous commit
   ```bash
   git revert HEAD
   git push origin main
   ```

4. **Deploy previous version** via Vercel

---

## Success Metrics

**Launch criteria**:

- ✅ All 5 test scenarios pass on staging
- ✅ No regression issues found
- ✅ Performance benchmarks met
- ✅ Admin can configure Premium Plus URLs
- ✅ Zero errors in browser console during testing
- ✅ Zero 500 errors in server logs during testing

**Post-launch monitoring** (first 7 days):

- [ ] Track Premium Plus sign-up rate
- [ ] Monitor average attachment size for Premium Plus users
- [ ] Check for any error rate increase in upload endpoints
- [ ] Verify no Standard users exceed their limits unexpectedly
- [ ] Confirm upgrade prompt conversion rate (clicks → sign-ups)

---

**Testing Status**: ⏳ Ready for staging deployment

**Next Steps**: Deploy to dev.tickedify.com and execute test scenarios 1-5 sequentially.
