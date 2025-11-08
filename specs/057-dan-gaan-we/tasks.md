# Tasks: Subscription Management in Settings

**Feature**: 057-dan-gaan-we
**Input**: Design documents from `/specs/057-dan-gaan-we/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/subscription-api.yml, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Node.js 16+, Express.js, PostgreSQL, Vanilla JS
   → Structure: Monolith (server.js + public/app.js)
2. Load design documents ✅
   → data-model.md: 4 tables (users extensions + 3 new tables)
   → contracts/: subscription-api.yml (7 endpoints + webhook)
   → research.md: 6 technical decisions (Plug&Pay REST API, minimal storage)
   → quickstart.md: 12 test scenarios
3. Generate tasks by category ✅
4. Apply task rules ✅
   → Monolith = most tasks sequential (same server.js file)
   → Database tasks = parallel (separate migration files)
   → API tests = parallel (independent test scenarios)
5. Number tasks sequentially (T001-T042) ✅
6. Validate completeness ✅
```

## Path Conventions (Tickedify Monolith)
- **Backend API**: `/server.js` (~15,000 lines, all endpoints in one file)
- **Frontend**: `/public/app.js` (~8,000 lines, all UI logic in one file)
- **Styles**: `/public/style.css` (~1,800 lines)
- **Database**: `/migrations/YYYYMMDD_description.sql`
- **Tests**: API tests via curl, UI tests via Playwright

## Phase 3.1: Setup & Database Schema
- [ ] T001 Create database migration file `migrations/20251105_add_subscription_management.sql`
- [ ] T002 Add subscription columns to users table in migration (8 columns: plugpay_subscription_id, subscription_status, subscription_plan, subscription_renewal_date, subscription_price, subscription_cycle, trial_end_date, subscription_updated_at)
- [ ] T003 Create subscription_plans table in migration with seed data (3 plans: basic, pro, enterprise with tier_level, pricing, features JSONB)
- [ ] T004 Create webhook_events table in migration (for idempotency tracking with event_id unique constraint)
- [ ] T005 Create subscription_change_requests table in migration (for scheduled downgrades with user_id FK to users)
- [ ] T006 Add database indexes in migration (9 indexes for performance: users.subscription_status, users.plugpay_subscription_id, subscription_plans.tier_level, webhook_events.event_id, subscription_change_requests.user_id, etc.)
- [ ] T007 Add rollback script in migration file (DROP tables and ALTER TABLE to remove columns)
- [ ] T008 Execute migration on staging database via `psql $DATABASE_URL -f migrations/20251105_add_subscription_management.sql`

## Phase 3.2: Backend API - Helper Functions
**Note**: These helper functions are prerequisites for endpoint implementation. All added to `server.js`.

- [ ] T009 Add Plug&Pay API helper function `callPlugPayAPI(endpoint, method, data)` in server.js using fetch() with PLUGPAY_API_KEY from env, proper error handling, and response parsing
- [ ] T010 Add webhook signature validation function `validatePlugPayWebhook(signature, payload, secret)` in server.js using crypto.createHmac('sha256') and comparing signatures
- [ ] T011 Add webhook idempotency check function `isWebhookProcessed(eventId)` in server.js querying webhook_events table for duplicate event_id
- [ ] T012 Add subscription sync function `updateUserSubscriptionFromWebhook(userId, subscriptionData)` in server.js updating users table with Plug&Pay data (status, plan, renewal_date, price, cycle)
- [ ] T013 Add plan tier comparison function `getPlanTierLevel(planId)` in server.js querying subscription_plans table to get tier_level for upgrade/downgrade logic
- [ ] T014 Add trial calculation function `calculateTrialDaysRemaining(trialEndDate)` in server.js returning days between now and trial_end_date

## Phase 3.3: Backend API - Read Endpoints
**Note**: All endpoints added to `server.js`. Sequential execution (same file).

- [ ] T015 Implement GET /api/subscription endpoint in server.js - fetch user subscription from database (JOIN users + subscription_plans), return subscription object with status, plan details, renewal date, trial info, handle trial/active/canceled/expired states
- [ ] T016 Implement GET /api/subscription/plans endpoint in server.js - query subscription_plans table for active plans (is_active=true), order by tier_level ascending, include current user's tier_level for UI highlighting

## Phase 3.4: Backend API - Checkout Endpoint
- [ ] T017 Implement POST /api/subscription/checkout endpoint in server.js - validate plan_id and cycle, check user doesn't have active subscription (409 conflict), call Plug&Pay API to create checkout session with user email and plan details, return checkout_url and session_id

## Phase 3.5: Backend API - Plan Change Endpoints (Sequential - Same File)
**Note**: All modify server.js, must run sequentially.

- [ ] T018 Implement POST /api/subscription/upgrade endpoint in server.js - validate plan_id is higher tier than current (use getPlanTierLevel), call Plug&Pay API POST /subscriptions/{id}/change-plan with prorate=true and effective_date=immediate, update users table (subscription_plan, subscription_price), return success with prorated_charge from Plug&Pay response
- [ ] T019 Implement POST /api/subscription/downgrade endpoint in server.js - validate plan_id is lower tier than current, call Plug&Pay API POST /subscriptions/{id}/schedule-change with effective_date=next_renewal, insert subscription_change_requests record (current_plan, new_plan, effective_date, status=pending), return message "Your plan will change to {plan} on {date}"
- [ ] T020 Implement POST /api/subscription/cancel endpoint in server.js - validate user has active subscription (400 if not), call Plug&Pay API POST /subscriptions/{id}/cancel with at_period_end=true, update users.subscription_status='canceled', return message "Subscription canceled. You retain access until {renewal_date}"
- [ ] T021 Implement POST /api/subscription/reactivate endpoint in server.js - validate user has canceled subscription (400 if not or expired), check subscription_renewal_date > NOW (grace period), call Plug&Pay API POST /subscriptions/{id}/reactivate, update users.subscription_status='active', return success with subscription object

## Phase 3.6: Backend API - Webhook Endpoint
- [ ] T022 Implement POST /api/webhooks/plugpay endpoint in server.js - validate x-plugpay-signature header using validatePlugPayWebhook(), check idempotency with isWebhookProcessed(), extract event_type and data from payload, handle subscription.created/updated/canceled/expired events, update users table via updateUserSubscriptionFromWebhook(), insert webhook_events record with event_id/event_type/payload, return 200 {status: "processed"} or {status: "already_processed"}, return 401 for invalid signature, return 500 for processing errors (triggers Plug&Pay retry)

## Phase 3.7: Frontend UI - Settings Screen Subscription Block
**Note**: All UI changes to `public/app.js`. Sequential execution (same file).

- [ ] T023 Update showSettings() function in public/app.js - replace placeholder box with subscription block structure (div.subscription-block containing subscription-header, subscription-info, subscription-actions sections)
- [ ] T024 Add fetchUserSubscription() function in public/app.js - GET /api/subscription, parse response, return subscription object, handle errors with toast notification
- [ ] T025 Add renderSubscriptionBlock(subscription) function in public/app.js - detect subscription.status (trial/active/canceled/expired), render appropriate UI for each state (trial shows countdown, active shows plan+renewal, canceled shows "Cancels on" + reactivate button, expired shows upgrade CTA)
- [ ] T026 Add renderTrialStatus(subscription) helper in public/app.js - display "Free Trial - X days remaining" with trial_end_date, show "Upgrade Now" button, return HTML string
- [ ] T027 Add renderActiveSubscription(subscription) helper in public/app.js - display "{plan_name} - €{price}/{cycle}" with renewal_date "Renews on {date}", show Upgrade/Downgrade/Cancel buttons based on tier_level, return HTML string
- [ ] T028 Add renderCanceledSubscription(subscription) helper in public/app.js - display "{plan_name} - Cancels on {date}", show "Reactivate Subscription" button, return HTML string

## Phase 3.8: Frontend UI - Plan Comparison Modal
**Note**: All UI changes to `public/app.js`. Sequential execution (same file).

- [ ] T029 Add showPlanComparisonModal(currentTier, action) function in public/app.js - fetch plans via GET /api/subscription/plans, render modal with plan cards (name, price_monthly, price_yearly, features array), highlight current plan, filter plans based on action ('upgrade'=higher tiers, 'downgrade'=lower tiers), add click handlers to plan cards
- [ ] T030 Add renderPlanCard(plan, isCurrent) helper in public/app.js - return HTML for plan card with plan_name, pricing (monthly/yearly toggle), features list as bullets, "Select" button (disabled if current), visual highlight for current plan
- [ ] T031 Add showUpgradeConfirmation(plan) function in public/app.js - show modal with "Upgrade to {plan_name} - €{price}/{cycle}?", explain immediate effect with proration, show estimated charge (fetch from Plug&Pay if possible), "Confirm" button calls handleUpgrade(plan_id), "Cancel" closes modal
- [ ] T032 Add showDowngradeConfirmation(plan, renewalDate) function in public/app.js - show modal with "Downgrade to {plan_name} - €{price}/{cycle}?", explain change takes effect on {renewalDate}, "Confirm" button calls handleDowngrade(plan_id), "Cancel" closes modal

## Phase 3.9: Frontend UI - Subscription Action Handlers
**Note**: All UI changes to `public/app.js`. Sequential execution (same file).

- [ ] T033 Add handleUpgradeNow() function in public/app.js - POST /api/subscription/checkout with selected plan (from trial users), redirect to checkout_url on success, show error toast on failure
- [ ] T034 Add handleUpgrade(planId) function in public/app.js - POST /api/subscription/upgrade with plan_id, show success toast with prorated charge, reload subscription block on success, show error toast on failure (payment failed, invalid tier, etc.)
- [ ] T035 Add handleDowngrade(planId) function in public/app.js - POST /api/subscription/downgrade with plan_id, show success toast "Your plan will change to {plan} on {date}", reload subscription block to show scheduled change message, show error toast on failure
- [ ] T036 Add showCancelConfirmation() function in public/app.js - show modal "Cancel subscription? You will retain access until {renewal_date}", "Confirm" button calls handleCancel(), "Keep Subscription" closes modal
- [ ] T037 Add handleCancel() function in public/app.js - POST /api/subscription/cancel, show success toast "Subscription canceled. Access until {date}", reload subscription block to show canceled state with reactivate button, show error toast on failure
- [ ] T038 Add handleReactivate() function in public/app.js - POST /api/subscription/reactivate, show success toast "Subscription reactivated. Renews on {date}", reload subscription block to show active state, show error toast on failure (expired, not canceled)

## Phase 3.10: Frontend UI - Styling
**Note**: All styling changes to `public/style.css`. Can be done in parallel with testing after T023-T038 complete.

- [ ] T039 [P] Add subscription block CSS in public/style.css - styles for .subscription-block, .subscription-header, .subscription-info (plan name, price, renewal date), .subscription-actions (button layout), match Tickedify design system (clean white background, macOS colors, SF Pro font, --macos-blue for buttons)
- [ ] T040 [P] Add plan comparison modal CSS in public/style.css - styles for .modal-subscription-plans, .plan-card (grid layout for 3 plans), .plan-card.current-plan (highlighted), .plan-feature (bullet list), .plan-price (monthly/yearly display), modal overlay and animations
- [ ] T041 [P] Add subscription status indicators CSS in public/style.css - styles for trial countdown (.subscription-trial-countdown), cancellation message (.subscription-cancels-on), scheduled change notice (.subscription-scheduled-change), use appropriate colors (trial=blue, canceled=orange, expired=red)

## Phase 3.11: Testing & Validation
**Note**: API tests via curl, UI tests via Playwright. All tests can run in parallel after implementation complete.

- [ ] T042 [P] Run Quickstart Scenario 1: View trial user subscription (curl GET /api/subscription, verify trial status with days_remaining, Playwright check Settings UI shows "Free Trial - X days remaining")
- [ ] T043 [P] Run Quickstart Scenario 2: Fetch available plans (curl GET /api/subscription/plans, verify 3 plans returned ordered by tier_level, verify pricing and features present)
- [ ] T044 [P] Run Quickstart Scenario 3: Create checkout session (curl POST /api/subscription/checkout with plan_id=pro cycle=monthly, verify checkout_url returned, manually complete payment on Plug&Pay, simulate webhook, verify user subscription updated to active)
- [ ] T045 [P] Run Quickstart Scenario 4: Upgrade plan Basic→Pro (mock active Basic subscription in DB, curl POST /api/subscription/upgrade with plan_id=pro, verify plan_id changed to pro, verify prorated_charge returned, Playwright check Settings shows "Pro Plan - €9.99/month")
- [ ] T046 [P] Run Quickstart Scenario 5: Downgrade plan Pro→Basic (mock active Pro subscription, curl POST /api/subscription/downgrade with plan_id=basic, verify subscription_change_requests record created, verify current plan still shows pro, verify message "Your plan will change to Basic on {renewal_date}")
- [ ] T047 [P] Run Quickstart Scenario 6: Cancel subscription (mock active Pro subscription, curl POST /api/subscription/cancel, verify subscription_status changed to canceled, verify renewal_date unchanged, Playwright check Settings shows "Cancels on {date}" with Reactivate button)
- [ ] T048 [P] Run Quickstart Scenario 7: Reactivate subscription (after Scenario 6, curl POST /api/subscription/reactivate, verify subscription_status changed back to active, Playwright check Settings shows "Renews on {date}" with Cancel button, Reactivate button hidden)
- [ ] T049 [P] Run Quickstart Scenario 8: Webhook idempotency (send webhook twice with same event_id, verify first returns {"status":"processed"}, second returns {"status":"already_processed"}, verify webhook_events has single record)
- [ ] T050 [P] Run Quickstart Scenario 9: Invalid plan upgrade error (mock active Pro subscription, curl POST /api/subscription/upgrade with plan_id=basic, verify 400 error "Selected plan is not an upgrade", verify no DB changes)
- [ ] T051 [P] Run Quickstart Scenario 10: Webhook signature validation (send webhook with invalid signature, verify 401 Unauthorized, verify no webhook_events record created, verify no DB changes)
- [ ] T052 [P] Run Quickstart Scenario 11: UI modal plan comparison (Playwright: navigate to Settings, click "Upgrade Plan", verify modal appears with 3 plan cards, verify current plan highlighted, verify pricing displayed, verify features listed, click plan card, verify confirmation dialog, cancel)
- [ ] T053 [P] Run Quickstart Scenario 12: Trial expiry handling (mock expired trial with trial_end_date in past, curl GET /api/subscription, verify status=expired, Playwright check Settings shows "Trial Expired" with upgrade CTA)

## Phase 3.12: Deployment & Version Management
- [ ] T054 Update package.json version from 0.21.82 to 0.21.83
- [ ] T055 Update public/changelog.html with v0.21.83 entry - add ⚡ feature emoji, title "Subscription Management", description "Added subscription management in Settings screen with Plug&Pay integration. View current plan, upgrade/downgrade, cancel, and reactivate subscriptions.", set badge-latest
- [ ] T056 Commit changes with message "✨ FEATURE: Subscription Management in Settings - v0.21.83\n\nImplemented complete subscription management with Plug&Pay integration:\n- Database schema for subscriptions (4 tables)\n- API endpoints for upgrade/downgrade/cancel/reactivate\n- Webhook endpoint for Plug&Pay events\n- Settings UI with plan comparison modal\n- Trial countdown and grace period handling\n\n🤖 Generated with Claude Code\nCo-Authored-By: Claude <noreply@anthropic.com>"
- [ ] T057 Merge feature branch 057-dan-gaan-we to staging branch with `git checkout staging && git merge 057-dan-gaan-we --no-edit`
- [ ] T058 Push to staging branch with `git push origin staging` (triggers automatic Vercel deployment to dev.tickedify.com)
- [ ] T059 Verify deployment by checking https://dev.tickedify.com/api/version (wait 15 seconds, check version=0.21.83, repeat every 15 seconds up to 2 minutes if needed)
- [ ] T060 Execute database migration on staging database via Vercel environment or direct psql connection to Neon staging database

## Dependencies

### Critical Path
```
T001-T008 (Database) → T009-T014 (Helpers) → T015-T022 (API Endpoints) → T023-T038 (UI) → T042-T053 (Testing)
                                                                              ↓
                                                                           T039-T041 (CSS) [P]
```

### Detailed Dependencies
- **Database (T001-T008)**: Must complete before any backend work
  - T008 blocks T015-T022 (API needs tables)
- **Helpers (T009-T014)**: Must complete before endpoints
  - T009 blocks T017-T022 (endpoints need callPlugPayAPI)
  - T010-T011 block T022 (webhook needs validation)
  - T012 blocks T022 (webhook needs sync function)
  - T013 blocks T018-T019 (upgrade/downgrade need tier comparison)
- **API Endpoints (T015-T022)**: Must complete before UI
  - T015-T016 block T023 (UI fetches subscription data)
  - T017-T021 block T033-T038 (UI action handlers call API)
- **UI Structure (T023-T028)**: Must complete before modals
  - T023-T028 block T029-T032 (modals render within Settings)
- **UI Modals (T029-T032)**: Must complete before action handlers
  - T029-T032 block T033-T038 (handlers trigger modals)
- **Implementation (T001-T038)**: Must complete before testing
  - All implementation blocks T042-T053 (tests validate implementation)
- **CSS (T039-T041)**: Can run in parallel with testing after T023-T038
- **Testing (T042-T053)**: All can run in parallel (independent scenarios)
- **Deployment (T054-T060)**: Must run sequentially after all tests pass

## Parallel Execution Examples

### Phase 1: Database Migrations (Individual Files - Can Split)
```bash
# If using separate migration files, these could run in parallel:
# (But in Tickedify's case, it's one migration file, so sequential)
Task(description="Create database migration", prompt="Create migrations/20251105_add_subscription_management.sql with all schema changes from data-model.md")
```

### Phase 2: Helper Functions (Same File - Sequential)
```bash
# All modify server.js - MUST run sequentially:
Task(description="Add Plug&Pay API helper", prompt="Add callPlugPayAPI() function in server.js...")
# Wait for T009 to complete before T010
Task(description="Add webhook validation", prompt="Add validatePlugPayWebhook() function in server.js...")
```

### Phase 3: Testing (Independent Scenarios - Parallel)
```bash
# Launch all quickstart scenarios in parallel after implementation:
Task(description="Test trial user subscription", prompt="Run Quickstart Scenario 1...")
Task(description="Test fetch plans", prompt="Run Quickstart Scenario 2...")
Task(description="Test checkout session", prompt="Run Quickstart Scenario 3...")
Task(description="Test upgrade plan", prompt="Run Quickstart Scenario 4...")
Task(description="Test downgrade plan", prompt="Run Quickstart Scenario 5...")
Task(description="Test cancel subscription", prompt="Run Quickstart Scenario 6...")
Task(description="Test reactivate subscription", prompt="Run Quickstart Scenario 7...")
Task(description="Test webhook idempotency", prompt="Run Quickstart Scenario 8...")
Task(description="Test invalid upgrade", prompt="Run Quickstart Scenario 9...")
Task(description="Test webhook signature", prompt="Run Quickstart Scenario 10...")
Task(description="Test UI modal", prompt="Run Quickstart Scenario 11...")
Task(description="Test trial expiry", prompt="Run Quickstart Scenario 12...")
```

### Phase 4: CSS Styling (Separate File - Parallel with Testing)
```bash
# Can run in parallel with testing after UI structure complete:
Task(description="Add subscription CSS", prompt="Add subscription block styling in public/style.css...")
Task(description="Add modal CSS", prompt="Add plan comparison modal CSS in public/style.css...")
Task(description="Add status indicators CSS", prompt="Add subscription status indicators CSS in public/style.css...")
```

## Notes

### Monolith Architecture Constraints
- **server.js**: All API endpoints in single file → sequential execution (T015-T022)
- **public/app.js**: All UI logic in single file → sequential execution (T023-T038)
- **public/style.css**: Styling changes can be parallel (T039-T041) if done as separate commits
- **migrations/**: Single migration file → sequential execution (T001-T007)

### Tickedify-Specific Patterns
- Use existing `requireLogin` middleware for auth (already in server.js)
- Use existing `pool.query()` pattern for database access (PostgreSQL via pg library)
- Use existing toast notification system: `showToast(type, message)` in app.js
- Follow existing error handling: try/catch with console.error + user-facing toast
- Match existing Settings screen structure from Feature 056

### Plug&Pay Integration Requirements
- Environment variables: PLUGPAY_API_KEY, PLUGPAY_WEBHOOK_SECRET
- Test mode vs production mode (use test API keys for staging)
- Webhook URL must be publicly accessible: https://dev.tickedify.com/api/webhooks/plugpay
- Test credit cards for checkout testing (Plug&Pay documentation)

### Testing Notes
- **API Tests**: Use curl with `-s -L -k` flags (prevents macOS security prompts)
- **Session Management**: Login first to get session cookie: `curl -c cookies.txt -X POST .../login -d '{"email":"jan@buskens.be","password":"qyqhut-muDvop-fadki9"}'`
- **Playwright Tests**: Use existing Playwright setup, navigate to dev.tickedify.com/app (not root)
- **Database Setup**: Mock subscription states via direct psql commands for testing

### Constitutional Compliance
- ✅ Beta freeze: Deploy to staging only (dev.tickedify.com)
- ✅ Staging-first: All testing on staging before considering production
- ✅ Test-first: API tests (T042-T051) before UI tests (T052-T053)
- ✅ Version discipline: T054-T055 update package.json and changelog
- ✅ Deployment verification: T059 checks /api/version endpoint

## Validation Checklist
*GATE: Checked before marking feature complete*

- [x] All contracts have corresponding tests (T042-T051 cover subscription-api.yml endpoints)
- [x] All entities have model tasks (T002-T005 create subscription tables)
- [x] All tests come before implementation (Phase 3.11 after Phase 3.1-3.10)
- [x] Parallel tasks truly independent (T042-T053 are independent test scenarios, T039-T041 separate CSS file)
- [x] Each task specifies exact file path (server.js, public/app.js, public/style.css, migrations/)
- [x] No task modifies same file as another [P] task (only T039-T041 and T042-T053 marked [P], all modify different concerns)

---

**Total Tasks**: 60
**Estimated Time**: 10-12 hours for tickedify-feature-builder agent
**Ready for**: `/implement` command or manual execution
