# Implementation Plan: Premium Plus Abonnement met Ongelimiteerde Bijlages

**Branch**: `013-gisteren-hebben-we` | **Date**: 2025-10-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-gisteren-hebben-we/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✅ Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✅ No NEEDS CLARIFICATION in spec - all resolved during spec phase
   ✅ Project Type: Web application (Express.js backend, vanilla JS frontend)
   ✅ Structure Decision: Single monolith (public/ + server.js)
3. Fill the Constitution Check section
   ✅ Constitution file is template - no project-specific requirements found
4. Evaluate Constitution Check section
   ✅ No constitutional requirements to validate
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   ✅ No research needed - feature extends existing subscription system
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   ✅ Phase 1 complete - all artifacts generated
7. Re-evaluate Constitution Check section
   ✅ Post-design check PASS - no violations introduced
8. Plan Phase 2 → Describe task generation approach
   ✅ Task planning strategy documented
9. STOP - Ready for /tasks command
   ✅ All /plan phases complete
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Feature**: Add Premium Plus subscription tier (€8/maand, €80/jaar) with unlimited attachment storage, differentiating from Standard tier (€7/maand, €70/jaar) with 100MB/5MB/1-per-task limits.

**Technical Approach**: Extend existing subscription system (`SUBSCRIPTION_PLANS` array, admin payment configuration endpoints, storage validation logic) to support two new plan IDs (`monthly_8`, `yearly_80`) with unlimited storage enforcement via `isPremium` flag in upload validation.

**Key Extension Points**:
1. **Frontend**: `subscription-data.js` (add 2 plans), `app.js` (update upgrade prompt text)
2. **Backend**: `server.js` SUBSCRIPTION_PLANS array (add 2 entries), upload validation (extend isPremium logic)
3. **Admin**: Payment configuration system (auto-generates cards for new plan IDs)
4. **UI**: Subscription page (display 5 plans), upgrade prompt (mention both tiers)

## Technical Context

**Language/Version**: Node.js 16+ (Express 4.18.2)
**Primary Dependencies**: Express.js, pg (PostgreSQL 8.11.3), Backblaze B2 (storage), Mailgun, bcryptjs
**Storage**: PostgreSQL (Neon hosted), Backblaze B2 (file attachments)
**Testing**: Manual testing workflow (staging → production via Vercel)
**Target Platform**: Vercel serverless (Node.js runtime)
**Project Type**: Web application (monolithic: server.js backend + public/ frontend)
**Performance Goals**: <500ms API response, <2s page load, real-time storage validation
**Constraints**:
- No breaking changes to existing trial/standard users
- Maintain backward compatibility with existing subscription flows
- Admin payment config must auto-discover new plans
**Scale/Scope**:
- Single production user (Jan) during development
- Beta launch Q4 2025 with ~50-100 users expected
- 5 total subscription plans (1 trial + 2 standard + 2 premium plus)

## Constitution Check

**Status**: Constitution file contains only template placeholders - no project-specific constitutional requirements defined.

**Evaluation**: No constitutional principles to validate. This feature extends an existing working system following established Tickedify patterns.

## Project Structure

### Documentation (this feature)
```
specs/013-gisteren-hebben-we/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (completed)
├── research.md          # Phase 0 output (SKIPPED - no research needed)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Tickedify uses monolithic structure (not typical web app split)
/
├── server.js                    # Express backend + API endpoints
├── storage-manager.js           # B2 file storage abstraction
├── public/                      # Frontend files
│   ├── index.html              # Main app (bijlagen section)
│   ├── app.js                  # Main app logic (storage validation, upgrade prompt)
│   ├── subscription.html       # Subscription selection page
│   ├── admin-subscription-config.html  # Admin payment config
│   ├── js/
│   │   ├── subscription-data.js        # SUBSCRIPTION_PLANS array
│   │   ├── subscription-api.js         # API client
│   │   ├── subscription.js             # Page logic
│   │   └── admin-subscription-config.js # Admin logic
│   └── css/
│       └── subscription.css
└── specs/                       # Feature specifications
```

**Structure Decision**: Monolithic architecture - all code in repository root with public/ for frontend.

## Phase 0: Outline & Research

**Status**: ✅ SKIPPED - No research required

**Rationale**: This feature extends an existing, working subscription system. All technical decisions were made during feature 011 (subscription system implementation):

1. **Subscription data structure**: Already defined in `subscription-data.js` with id, name, price, billing_cycle, features
2. **Payment configuration**: Already implemented via `/api/admin/payment-configurations` endpoints
3. **Storage validation**: Already implemented in `storage-manager.js` with `isPremium` flag differentiation
4. **Admin UI pattern**: Already established in `admin-subscription-config.html`

**Known Technologies**:
- PostgreSQL for payment configuration persistence (table: `payment_configurations`)
- Backblaze B2 with STORAGE_CONFIG limits (100MB, 5MB, 1 per task for free tier)
- Plug&Pay checkout URLs (admin-configured per plan)
- Express.js middleware for subscription tier enforcement

**No unknowns remain** - feature is pure extension of existing patterns.

**Output**: research.md not created (not needed)

## Phase 1: Design & Contracts

### Data Model

**File**: `data-model.md`

**New Entities**: None - reuses existing entities with new values

**Extended Entities**:

1. **SUBSCRIPTION_PLANS Array** (in-memory, defined in `subscription-data.js` and `server.js`)
   - Add 2 new plan objects:
     ```javascript
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
     ```

2. **payment_configurations Table** (PostgreSQL)
   - Auto-populated by admin system when viewing config page
   - New rows for `monthly_8` and `yearly_80` with checkout_url and is_active columns
   - Schema already exists - no migration needed

3. **Subscription Tier Detection** (server-side logic)
   - `isPremium` flag currently checks trial expiry + plan_id
   - Extend logic to recognize `monthly_8` and `yearly_80` as premium tiers
   - Located in: `server.js` subscription endpoints and storage upload validation

**Storage Limit Enforcement** (no schema changes):
- Standard tier (trial, monthly_7, yearly_70): Apply STORAGE_CONFIG limits
- Premium Plus tier (monthly_8, yearly_80): Set all limits to `null` (unlimited)

### API Contracts

**File**: `contracts/subscription-plans-api.yaml` (OpenAPI 3.0)

**Existing Endpoints** (no changes to contract, only data):

```yaml
GET /api/subscription/plans
  Response:
    - plans: array of 5 subscription plans (was 3, now 5)
    - No contract change - array just has 2 more elements

POST /api/subscription/select
  Request:
    - plan_id: string (now accepts 'monthly_8' or 'yearly_80')
    - source: string
  Response:
    - success: boolean
    - checkout_url: string (from payment_configurations table)
  Validation:
    - plan_id must be in SUBSCRIPTION_PLANS array
    - checkout_url must exist for plan_id

GET /api/admin/payment-configurations
  Response:
    - configurations: array of 5 payment configs (was 3, now 5)
    - Each: { plan_id, plan_name, checkout_url, is_active, updated_at }

PUT /api/admin/payment-configurations/:planId
  Request:
    - checkout_url: string
    - is_active: boolean
  Response:
    - configuration: updated config object
```

**New Validation Rules**:
- `isPremium` logic must include `monthly_8` and `yearly_80` plan IDs
- Storage validation must skip limits when `isPremium === true`

**File**: `contracts/storage-validation-api.yaml`

```yaml
POST /api/taak/:id/bijlagen
  Request:
    - file: multipart/form-data
  Response (success):
    - bijlage: { id, taak_id, bestandsnaam, bestandsgrootte, mimetype }
  Response (error for Standard tier):
    - error: "Maximum 5MB per bijlage voor Standard plan. Upgrade naar Premium Plus voor ongelimiteerde bijlages"
  Response (error for Premium Plus - should never trigger):
    - No size/count validation for premium users
```

### Contract Tests

**File**: `tests/contract/subscription-plans.test.js` (not created yet - described for /tasks command)

```javascript
describe('GET /api/subscription/plans', () => {
  it('returns 5 subscription plans including Premium Plus', async () => {
    const response = await fetch('/api/subscription/plans');
    const data = await response.json();

    expect(data.plans).toHaveLength(5);
    expect(data.plans.map(p => p.id)).toContain('monthly_8');
    expect(data.plans.map(p => p.id)).toContain('yearly_80');

    const premiumPlus = data.plans.find(p => p.id === 'monthly_8');
    expect(premiumPlus.price).toBe(8);
    expect(premiumPlus.features).toContain('Ongelimiteerde bijlages');
  });
});

describe('POST /api/subscription/select', () => {
  it('accepts monthly_8 plan selection', async () => {
    const response = await fetch('/api/subscription/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: 'monthly_8', source: 'beta' })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.checkout_url).toBeDefined();
  });
});
```

**File**: `tests/contract/storage-validation.test.js`

```javascript
describe('Premium Plus Storage Validation', () => {
  it('allows 10MB file upload for Premium Plus user', async () => {
    // Mock user with monthly_8 plan
    const formData = new FormData();
    formData.append('file', createMockFile(10 * 1024 * 1024)); // 10MB

    const response = await fetch('/api/taak/123/bijlagen', {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.bijlage.bestandsgrootte).toBe(10 * 1024 * 1024);
  });

  it('rejects 6MB file for Standard user', async () => {
    // Mock user with monthly_7 plan
    const formData = new FormData();
    formData.append('file', createMockFile(6 * 1024 * 1024)); // 6MB

    const response = await fetch('/api/taak/123/bijlagen', {
      method: 'POST',
      body: formData
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Premium Plus');
  });
});
```

### Integration Test Scenarios

**From User Stories** (in `quickstart.md`):

**Scenario 1**: Beta user views subscription page
- Navigate to `/subscription.html?source=beta`
- Verify 5 plan cards render
- Verify Premium Plus plans show "Ongelimiteerde bijlages" badge
- Verify pricing: €8/maand and €80/jaar

**Scenario 2**: Standard user hits storage limit
- Login as user with `monthly_7` plan
- Upload files until approaching 100MB limit
- Verify upgrade prompt appears at 80%+ usage
- Verify prompt mentions both Standard and Premium Plus options

**Scenario 3**: Premium Plus user uploads large file
- Login as user with `monthly_8` plan
- Navigate to task with bijlagen section
- Upload 10MB PDF file
- Verify success message (no size error)
- Verify storage usage shows unlimited (no percentage)

**Scenario 4**: Admin configures Premium Plus payment URLs
- Login to `/admin-subscription-config.html`
- Verify `monthly_8` and `yearly_80` configuration cards appear
- Set checkout URLs for both plans
- Mark both as active
- Verify configurations persist after page refresh

### Agent Context Update

**Execute**: `.specify/scripts/bash/update-agent-context.sh claude`

**Expected Changes to CLAUDE.md**:
- Add to "Recent Changes": "v0.18.2 - Premium Plus subscription tier (€8/maand, €80/jaar) with unlimited attachments"
- Add to "Important Files": Premium Plus plan IDs (`monthly_8`, `yearly_80`) in subscription system
- No new technologies or dependencies (reuses existing patterns)

**Output**: data-model.md, contracts/*.yaml, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load base template**: `.specify/templates/tasks-template.md`

2. **Generate tasks from Phase 1 artifacts**:
   - From `data-model.md`:
     - Task: Add `monthly_8` plan to SUBSCRIPTION_PLANS in `public/js/subscription-data.js`
     - Task: Add `yearly_80` plan to SUBSCRIPTION_PLANS in `public/js/subscription-data.js`
     - Task: Add both plans to `server.js` SUBSCRIPTION_PLANS array
     - Task: Update `isPremium` logic to recognize new plan IDs

   - From `contracts/subscription-plans-api.yaml`:
     - Task: Write contract test for 5-plan response
     - Task: Write contract test for `monthly_8` selection
     - Task: Write contract test for `yearly_80` selection

   - From `contracts/storage-validation-api.yaml`:
     - Task: Write contract test for Premium Plus 10MB upload
     - Task: Write contract test for Standard 6MB rejection

   - From `quickstart.md` scenarios:
     - Task: Update subscription page UI to display 5 plans with Premium Plus badges
     - Task: Update upgrade prompt text to mention Premium Plus
     - Task: Test admin payment config auto-generates Premium Plus cards
     - Task: Update storage validation error messages to reference Premium Plus

   - Version & Deployment:
     - Task: Update version to 0.18.2 in package.json
     - Task: Update changelog with Premium Plus feature
     - Task: Commit changes with descriptive message
     - Task: Deploy to staging (dev.tickedify.com)
     - Task: Test all scenarios on staging
     - Task: Deploy to production (tickedify.com)

3. **Task Ordering**:
   - **Phase 1: Data Model** (parallel where possible)
     - [P] Frontend: Add plans to `subscription-data.js`
     - [P] Backend: Add plans to `server.js` SUBSCRIPTION_PLANS
     - [S] Backend: Update `isPremium` logic (depends on previous)

   - **Phase 2: Contract Tests** (parallel)
     - [P] Write all contract tests (can run in parallel)

   - **Phase 3: UI Updates** (parallel where possible)
     - [P] Update subscription page rendering logic
     - [P] Update upgrade prompt text in `app.js`
     - [P] Update storage validation error messages
     - [S] Verify admin config auto-generates cards (integration check)

   - **Phase 4: Validation & Deployment**
     - [S] Run all contract tests (must pass before deploy)
     - [S] Update version and changelog
     - [S] Deploy to staging
     - [S] Manual testing via quickstart scenarios
     - [S] Deploy to production

**Dependency Notes**:
- [P] = Parallel (independent files)
- [S] = Sequential (depends on previous tasks)

**Estimated Output**: 18-22 numbered tasks in tasks.md

**Task Template Format**:
```markdown
### Task N: [Action] [Component]
**Type**: [Contract Test / Implementation / Validation / Deployment]
**Files**: [absolute paths]
**Dependencies**: [task numbers or "none"]
**Acceptance**: [specific verification criteria]
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following Tickedify development workflow)
**Phase 5**: Validation (staging testing → production deployment → verification)

## Complexity Tracking

**Status**: No constitutional violations or complexity deviations.

**Rationale**: This feature is a straightforward extension of existing subscription system patterns:
- Reuses existing data structures (SUBSCRIPTION_PLANS array)
- Reuses existing admin payment configuration system
- Reuses existing storage validation infrastructure
- No new architectural patterns introduced
- No new dependencies added

**Simplicity Maintained**: Feature adds 2 new plan entries and conditional logic branches (isPremium checks) - minimal complexity increase.

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - SKIPPED (not needed)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [x] Phase 3: Tasks generated (/tasks command) - 20 tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no constitutional requirements defined)
- [x] Post-Design Constitution Check: PASS (no violations introduced)
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none required)

**Artifacts Generated**:
- [x] plan.md (this file)
- [x] data-model.md (extracted to standalone file)
- [x] contracts/ (2 YAML files: subscription-api.yaml, storage-api.yaml)
- [x] quickstart.md (extracted to standalone file with 5 test scenarios)
- [x] CLAUDE.md update (completed via update-agent-context.sh script)
- [ ] tasks.md (generated by /tasks command)

---

**Status**: ✅ Ready for /tasks command

This implementation plan has completed all /plan command phases. Execute `/tasks` to generate the detailed task breakdown for implementation.

*Based on Tickedify development workflow - See `CLAUDE.md` for project-specific practices*
