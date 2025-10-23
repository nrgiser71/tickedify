# Tasks: Admin Login Persistence

**Feature**: Admin Login Persistence
**Branch**: `012-wanneer-ik-aanlog`
**Input**: Design documents from `/specs/012-wanneer-ik-aanlog/`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: JavaScript ES6+, Express.js, express-session
   → Structure: Single project, existing files only
2. Load design documents:
   → contracts/api-session-check.md: GET /api/admin/session
   → data-model.md: Session entity, AdminDashboard class
   → quickstart.md: 5 test scenarios + cURL tests
3. Generate tasks:
   → Server-side: Update cookie.maxAge, verify endpoint
   → Client-side: Add checkExistingSession() method
   → Testing: Manual scenarios + cURL tests
   → Deployment: Version bump, changelog, deploy
4. Order: Server → Client → Testing → Deployment
5. Mark [P] for parallel tasks (different files)
6. Total tasks: 18 (T001-T018)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Project root**: `/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify`
- **Server**: `server.js` (existing file)
- **Client**: `public/admin.js` (existing file)
- **No new files needed** - leverages existing infrastructure

---

## Phase 3.1: Server-Side Configuration

### T001 [P] Update session cookie maxAge to 24 hours
**File**: `server.js` (line ~461)
**Description**: Change `cookie.maxAge` from `7 * 24 * 60 * 60 * 1000` (7 days) to `24 * 60 * 60 * 1000` (24 hours)

**Current code** (server.js:461):
```javascript
maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
```

**New code**:
```javascript
maxAge: 24 * 60 * 60 * 1000, // 24 hours (FR-006 requirement)
```

**Acceptance**:
- Session cookie expires after 24 hours
- New logins use 24-hour maxAge
- Existing sessions continue until natural expiry

---

### T002 [P] Verify GET /api/admin/session endpoint implementation
**File**: `server.js` (line ~7977+)
**Description**: Verify existing `/api/admin/session` endpoint returns correct response format per contract

**Expected endpoint implementation**:
```javascript
app.get('/api/admin/session', (req, res) => {
    if (req.session && req.session.isAdmin) {
        const loginTime = req.session.adminLoginTime;
        const sessionAge = new Date() - new Date(loginTime);

        res.json({
            authenticated: true,
            isAdmin: true,
            loginTime: loginTime,
            sessionAge: sessionAge
        });
    } else {
        res.status(401).json({
            authenticated: false,
            message: 'No active admin session'
        });
    }
});
```

**Contract validation** (from contracts/api-session-check.md):
- **200 OK**: `{ authenticated: true, isAdmin: true, loginTime, sessionAge }`
- **401 Unauthorized**: `{ authenticated: false, message }`

**Acceptance**:
- Endpoint exists at GET /api/admin/session
- Returns 200 with session metadata if valid session
- Returns 401 if no session or expired
- Response format matches API contract

---

### T003 Test session endpoint with cURL (no cookie)
**Depends on**: T002
**Description**: Verify endpoint returns 401 when no session cookie provided

**Test command**:
```bash
curl -s -L -k https://tickedify.com/api/admin/session | jq
```

**Expected response** (401):
```json
{
  "authenticated": false,
  "message": "No active admin session"
}
```

**Acceptance**:
- HTTP status 401
- Response matches contract for unauthenticated request

---

### T004 Test session endpoint with cURL (valid cookie)
**Depends on**: T002, T003
**Description**: Verify endpoint returns 200 with session data when valid cookie provided

**Test commands**:
```bash
# Step 1: Login and save cookie
curl -s -L -k -c cookies.txt -X POST \
  https://tickedify.com/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}'

# Step 2: Check session with cookie
curl -s -L -k -b cookies.txt \
  https://tickedify.com/api/admin/session | jq
```

**Expected response** (200):
```json
{
  "authenticated": true,
  "isAdmin": true,
  "loginTime": "2025-10-12T14:30:00.000Z",
  "sessionAge": 3600000
}
```

**Acceptance**:
- HTTP status 200
- All fields present (authenticated, isAdmin, loginTime, sessionAge)
- sessionAge is reasonable (<24 hours in milliseconds)

---

## Phase 3.2: Client-Side Session Check

### T005 Add checkExistingSession() method to AdminDashboard
**File**: `public/admin.js`
**Depends on**: T002 (endpoint must exist)
**Description**: Add async method to AdminDashboard class that calls GET /api/admin/session

**Implementation location**: After constructor (line ~9), before initializeEventListeners()

**Code to add**:
```javascript
async checkExistingSession() {
    try {
        const response = await fetch('/api/admin/session', {
            credentials: 'include'  // Required for cookies
        });

        if (response.ok) {
            const session = await response.json();
            console.log('✅ Valid session found:', session.loginTime);

            // Session is valid - skip login form
            this.isAuthenticated = true;
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'block';

            await this.loadDashboard();
            this.startAutoRefresh();

            return true;
        } else {
            // No valid session - show login form
            console.log('❌ No valid session - showing login form');
            this.isAuthenticated = false;
            return false;
        }
    } catch (error) {
        console.error('Session check failed:', error);
        // On error, default to showing login form (safe fallback)
        this.isAuthenticated = false;
        return false;
    }
}
```

**Acceptance**:
- Method exists in AdminDashboard class
- Calls GET /api/admin/session with credentials: 'include'
- On 200: Sets isAuthenticated=true, shows dashboard
- On 401: Sets isAuthenticated=false (shows login form)
- On error: Defaults to showing login form

---

### T006 Call checkExistingSession() in constructor
**File**: `public/admin.js`
**Depends on**: T005
**Description**: Call checkExistingSession() in AdminDashboard constructor to check session on page load

**Implementation location**: In constructor (line ~3-9), after initializing properties

**Code to modify**:
```javascript
constructor() {
    this.isAuthenticated = false;
    this.data = {};
    this.refreshInterval = null;

    this.initializeEventListeners();

    // NEW: Check for existing session on page load
    this.checkExistingSession();
}
```

**Acceptance**:
- checkExistingSession() called automatically on page load
- Login form shown only if no valid session
- Dashboard shows immediately if valid session exists

---

## Phase 3.3: Testing

### T007 Manual test: Session persists across page refresh
**Depends on**: T001, T006
**Description**: Verify session persists when admin refreshes page

**Test steps** (from quickstart.md Scenario 1):
1. Open browser in incognito mode
2. Navigate to https://tickedify.com/admin.html
3. Login with admin credentials
4. Verify dashboard loads
5. **Press F5 to refresh page**
6. **Expected**: Dashboard remains visible, no login form

**Acceptance**:
- ✅ No login form after refresh
- ✅ Dashboard loads immediately
- ✅ Admin stats visible

---

### T008 Manual test: Session persists after browser restart
**Depends on**: T001, T006
**Description**: Verify session survives browser close/reopen

**Test steps** (from quickstart.md Scenario 2):
1. Open browser in incognito mode
2. Login to admin dashboard
3. Verify dashboard loads
4. **Close entire browser** (not just tab)
5. Wait 5 seconds
6. **Reopen browser**
7. Navigate to https://tickedify.com/admin.html
8. **Expected**: Dashboard loads WITHOUT login form

**Acceptance**:
- ✅ Dashboard loads immediately after browser restart
- ✅ No login form shown
- ✅ Session cookie persisted

---

### T009 Manual test: Explicit logout destroys session
**Depends on**: T001, T006
**Description**: Verify logout button properly invalidates session

**Test steps** (from quickstart.md Scenario 4):
1. Login to admin dashboard
2. Dashboard loads successfully
3. **Click "🚪 Uitloggen" button**
4. **Expected**: Login form appears
5. Refresh page
6. **Expected**: Login form still shown

**Acceptance**:
- ✅ Login form shown after logout
- ✅ Dashboard hidden
- ✅ Refresh doesn't restore session

---

### T010 Manual test: Invalid session handled gracefully
**Depends on**: T001, T006
**Description**: Verify system handles corrupted/missing session cookies

**Test steps** (from quickstart.md Scenario 5):
1. Login to admin dashboard
2. Open DevTools → Application → Cookies
3. **Delete `tickedify.sid` cookie manually**
4. Refresh page
5. **Expected**: Login form appears (no errors)

**Acceptance**:
- ✅ Login form shown
- ✅ No JavaScript errors in console
- ✅ Graceful fallback to login state

---

### T011 [P] Browser DevTools verification: Cookie attributes
**Depends on**: T001
**Description**: Verify session cookie has correct security attributes

**Test steps** (from quickstart.md):
1. Login to admin dashboard
2. Open DevTools (F12)
3. Navigate to Application → Cookies → tickedify.com
4. Find `tickedify.sid` cookie
5. **Verify attributes**:
   - ✅ HttpOnly: ✓ (checkbox checked)
   - ✅ Secure: ✓ (if HTTPS)
   - ✅ SameSite: Lax
   - ✅ Expires: ~24 hours from now
   - ✅ Path: /
   - ✅ Domain: tickedify.com

**Acceptance**:
- All cookie attributes correct
- Expires time is approximately 24 hours from login

---

### T012 [P] Performance validation: Session check latency
**Depends on**: T002, T006
**Description**: Verify session check completes in <100ms

**Test command**:
```bash
# Login first
curl -s -L -k -c cookies.txt -X POST \
  https://tickedify.com/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}'

# Measure session check latency
time curl -s -L -k -b cookies.txt \
  https://tickedify.com/api/admin/session
```

**Expected**: Response time <100ms (target from plan.md)

**Acceptance**:
- Session check completes in <100ms
- No performance degradation on page load

---

## Phase 3.4: Deployment

### T013 [P] Update version in package.json
**File**: `package.json`
**Description**: Increment version number for admin session persistence feature

**Current version**: Check package.json
**New version**: Increment patch level (e.g., 0.18.0 → 0.18.1)

**Acceptance**:
- Version incremented in package.json
- Follows semantic versioning (patch level for bug fix)

---

### T014 [P] Update CHANGELOG.md
**File**: `public/changelog.html`
**Description**: Add entry for admin session persistence feature

**Entry to add**:
```html
<div class="changelog-entry">
    <span class="version-badge badge-latest">v0.18.1</span>
    <h3>🔧 Fix: Admin Login Persistence</h3>
    <p class="date">12 oktober 2025</p>
    <ul class="changes">
        <li>✅ Admin blijft ingelogd bij page refresh</li>
        <li>✅ Sessie persistent over browser herstart</li>
        <li>✅ Session expiry na 24 uur (was 7 dagen)</li>
        <li>✅ Graceful handling van expired sessions</li>
    </ul>
</div>
```

**Acceptance**:
- Changelog entry added with correct version
- Entry marked as "badge-latest"
- Previous version changed to "badge-fix"

---

### T015 Commit changes to develop branch
**Depends on**: T001, T002, T005, T006, T013, T014
**Description**: Commit all changes with descriptive message

**Git commands**:
```bash
# Verify current branch
git branch

# If not on develop, switch to it
git checkout develop

# Stage changes
git add server.js public/admin.js package.json public/changelog.html

# Commit with descriptive message
git commit -m "$(cat <<'EOF'
🔧 Fix: Admin login persistence - v0.18.1

Implementeert session persistence voor admin pagina zodat admin ingelogd blijft bij page refresh en browser herstart.

Wijzigingen:
- Server-side: Cookie maxAge van 7 dagen → 24 uur
- Server-side: GET /api/admin/session endpoint verificatie
- Client-side: checkExistingSession() method in AdminDashboard
- Client-side: Automatische session check bij page load
- Changelog: v0.18.1 entry toegevoegd

Tested:
- ✅ Session persistent bij page refresh
- ✅ Session persistent bij browser restart
- ✅ Session expiry na 24 uur
- ✅ Logout werkt correct
- ✅ Invalid sessions gracefully handled

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Acceptance**:
- Commit created on develop branch
- All modified files included
- Descriptive commit message with testing summary

---

### T016 Deploy to staging (dev.tickedify.com)
**Depends on**: T015
**Description**: Push changes to develop branch and deploy to staging environment

**Commands**:
```bash
# Push to develop branch
git push origin develop

# Vercel will automatically deploy develop branch to staging
# Wait for deployment (usually ~30 seconds)
```

**Verification**:
```bash
# Wait for deployment
sleep 30

# Check staging version
curl -s -L -k https://dev.tickedify.com/api/version | jq
```

**Expected**: Version matches package.json (0.18.1)

**Acceptance**:
- Changes pushed to develop branch
- Staging deployment successful
- Version endpoint returns new version

---

### T017 Staging test: Complete test suite
**Depends on**: T016
**Description**: Run all manual tests on staging environment (dev.tickedify.com)

**Test checklist**:
1. ✅ T007: Session persists across page refresh
2. ✅ T008: Session persists after browser restart
3. ✅ T009: Logout destroys session
4. ✅ T010: Invalid session handled gracefully
5. ✅ T011: Cookie attributes correct
6. ✅ T012: Performance <100ms

**Acceptance**:
- All 6 test scenarios pass on staging
- No console errors
- No unexpected behavior

---

### T018 User acceptance: Verify fix on production
**Depends on**: T017
**Description**: After staging tests pass, wait for user approval and production deployment

**Process**:
1. Report staging test results to user
2. Ask: "Staging tests passed - klaar voor PRODUCTIE deployment?"
3. **WAIT for explicit "JA, DEPLOY NAAR PRODUCTIE" confirmation**
4. Only after confirmation: Create pull request to main
5. User merges PR and deploys to production
6. Verify on production: https://tickedify.com/admin.html

**Acceptance**:
- Staging tests passed
- User explicitly approved production deployment
- Feature works on production
- No regression issues reported

---

## Dependencies

### Critical Path
```
T001 (cookie maxAge) ─┐
                      ├─→ T002 (verify endpoint) ─→ T003 (cURL test no cookie) ─→ T004 (cURL test with cookie)
                      │
                      └─→ T005 (checkExistingSession) ─→ T006 (call in constructor)
                                                                │
                                                                ├─→ T007-T010 (manual tests)
                                                                │
                                                                └─→ T011-T012 (DevTools + perf)
                                                                    │
T013 (version) ──┐                                                 │
                 ├─→ T015 (commit) ─→ T016 (staging) ─→ T017 (staging tests) ─→ T018 (UAT)
T014 (changelog)─┘
```

### Blocking Dependencies
- **T002 blocks**: T003, T004, T005
- **T005 blocks**: T006
- **T006 blocks**: T007, T008, T009, T010
- **T001 blocks**: T011
- **T013, T014 block**: T015
- **T015 blocks**: T016
- **T016 blocks**: T017
- **T017 blocks**: T018

### Parallel Opportunities
- **[P] T001 + T002**: Different concerns (config vs endpoint)
- **[P] T013 + T014**: Different files (package.json vs changelog.html)
- **[P] T011 + T012**: Independent verification tasks

---

## Parallel Execution Example

### Phase A: Server-Side Setup (Parallel)
```bash
# Can run simultaneously in different terminals/agents:
Task 1: "Update session cookie maxAge to 24 hours in server.js line 461"
Task 2: "Verify GET /api/admin/session endpoint implementation in server.js"
```

### Phase B: Deployment Prep (Parallel)
```bash
# After implementation complete:
Task 13: "Update version in package.json to 0.18.1"
Task 14: "Update CHANGELOG.md with admin session persistence entry"
```

---

## Notes

### Implementation Guidelines
- **Minimal changes**: Only 2 files modified (server.js, admin.js)
- **Backward compatible**: Existing sessions continue working
- **No database changes**: Leverages existing session table
- **Safe defaults**: On error, show login form (fail secure)

### Testing Strategy
- **Manual testing**: 5 scenarios in browser
- **API testing**: cURL commands for endpoint validation
- **DevTools verification**: Cookie attributes and network requests
- **Performance**: Session check <100ms target

### Deployment Strategy
- **Staging first**: Test on dev.tickedify.com
- **User approval**: Explicit confirmation before production
- **Gradual rollover**: New logins use 24h, existing sessions expire naturally
- **Monitoring**: Watch for session-related errors after deployment

---

## Validation Checklist
*GATE: All must pass before marking feature complete*

- [x] All contracts have corresponding tests (T003, T004)
- [x] All data model changes implemented (T001, T005, T006)
- [x] All tests come before production deployment (T007-T012 before T018)
- [x] Parallel tasks truly independent (T001+T002, T013+T014)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

---

**Total Tasks**: 18 (T001-T018)
**Estimated Time**: 4-6 hours (including testing and deployment)
**Risk Level**: LOW (minimal changes, backward compatible)
**Ready for**: Implementation via `/implement` or manual execution
